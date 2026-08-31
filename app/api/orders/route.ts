import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

type OrderInput = {
  customerId?: string | null;
  items?: Array<{ partId?: string; quantity?: number; unitPrice?: number; supplies?: Array<{ supplyId?: string; quantity?: number }> }>;
  quote?: { id?: string; client?: string; item?: string; total?: number; quantity?: number; unitPrice?: number; grams?: number; hours?: number; energyRate?: number; machineRate?: number; packaging?: number; fees?: number; margin?: number };
};

type StoredPart = { id: string; name: string; quantity: number; unit_cost: number };
type StoredQuote = { id: string; customer_name: string; item_name: string; total_price: number; total_cost: number };
type StoredOrderItem = { inventory_item_id: string | null; quantity: number };

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const result = await env.DB.prepare(`SELECT o.id, COALESCE(c.name, q.customer_name, 'Venda sem cliente') AS customer, COALESCE(GROUP_CONCAT(oi.item_name, ', '), q.item_name, 'Sem itens') AS items, COALESCE(SUM(CASE WHEN oi.item_name LIKE 'Insumo: %' THEN 0 ELSE oi.quantity END), 1) AS quantity, o.total_price AS total, o.total_cost AS cost, o.estimated_profit AS profit, CASE o.status WHEN 'waiting_queue' THEN 'Aguardando fila' WHEN 'ready' THEN 'Finalizado' WHEN 'delivered' THEN 'Finalizado' WHEN 'cancelled' THEN 'Cancelado' ELSE 'Em andamento' END AS status, strftime('%d/%m/%Y', o.created_at, 'unixepoch') AS createdAt FROM orders o LEFT JOIN customers c ON c.id = o.customer_id LEFT JOIN quotes q ON q.id = o.quote_id LEFT JOIN order_items oi ON oi.order_id = o.id GROUP BY o.id ORDER BY o.created_at DESC`).all();
  return Response.json(result.results);
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as { id?: string; status?: string };
  const id = String(body.id ?? '').trim();
  const statusMap: Record<string, string> = { 'Aguardando fila': 'waiting_queue', 'Em andamento': 'approved', Finalizado: 'delivered', Cancelado: 'cancelled' };
  const storedStatus = statusMap[String(body.status ?? '')];
  if (!id || !storedStatus) return Response.json({ error: 'Pedido ou status inválido' }, { status: 400 });

  const result = await env.DB.prepare(`UPDATE orders SET status = ?, updated_at = unixepoch() WHERE id = ?`).bind(storedStatus, id).run();
  if (!result.meta.changes) return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
  await env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'order', ?, 'status_updated', ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, id, JSON.stringify({ status: body.status })).run();
  return Response.json({ ok: true, id, status: body.status });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id) return Response.json({ error: 'Pedido não informado' }, { status: 400 });
  const order = await env.DB.prepare(`SELECT id FROM orders WHERE id = ?`).bind(id).first<{ id: string }>();
  if (!order) return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });

  const items = await env.DB.prepare(`SELECT inventory_item_id, quantity FROM order_items WHERE order_id = ?`).bind(id).all<StoredOrderItem>();
  const statements = items.results.filter(item => item.inventory_item_id).map(item => env.DB.prepare(`UPDATE inventory_items SET quantity = quantity + ?, updated_at = unixepoch() WHERE id = ?`).bind(Number(item.quantity), item.inventory_item_id));
  statements.push(
    env.DB.prepare(`DELETE FROM transactions WHERE order_id = ?`).bind(id),
    env.DB.prepare(`DELETE FROM production_jobs WHERE order_id = ?`).bind(id),
    env.DB.prepare(`DELETE FROM order_items WHERE order_id = ?`).bind(id),
    env.DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(id),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'order', ?, 'deleted', '{}', unixepoch())`).bind(crypto.randomUUID(), user.userId, id),
  );
  await env.DB.batch(statements);
  return Response.json({ ok: true, id });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as OrderInput;

  if (body.quote) {
    const quoteId = String(body.quote.id ?? '').trim();
    const quantity = Math.max(1, Number(body.quote.quantity) || 1);
    if (!quoteId) return Response.json({ error: 'Orçamento não informado' }, { status: 400 });

    let quote = await env.DB.prepare(`SELECT id, customer_name, item_name, total_price, material_cost + energy_cost + machine_cost + packaging_cost + finishing_cost + fees_cost AS total_cost FROM quotes WHERE id = ?`).bind(quoteId).first<StoredQuote>();
    if (!quote) {
      const client = String(body.quote.client ?? 'Cliente não informado').trim() || 'Cliente não informado';
      const item = String(body.quote.item ?? '').trim();
      const total = Math.max(0, Number(body.quote.total) || 0);
      if (!item || total <= 0) return Response.json({ error: 'O orçamento precisa ter item e valor antes de ser enviado para Pedidos.' }, { status: 400 });
      const grams = Math.max(0, Number(body.quote.grams) || 0);
      const hours = Math.max(0, Number(body.quote.hours) || 0);
      const energyRate = Math.max(0, Number(body.quote.energyRate) || 0);
      const machineRate = Math.max(0, Number(body.quote.machineRate) || 0);
      const packaging = Math.max(0, Number(body.quote.packaging) || 0);
      const fees = Math.max(0, Number(body.quote.fees) || 0);
      const margin = Math.max(0, Number(body.quote.margin) || 0);
      const materialCost = grams * 0.095;
      const energyCost = hours * energyRate;
      const machineCost = hours * machineRate;
      const feesCost = (materialCost + energyCost + machineCost + packaging) * fees / 100;
      await env.DB.prepare(`INSERT INTO quotes (id, customer_name, item_name, status, material_type, material_grams, material_cost, print_hours, energy_rate, energy_cost, machine_hourly_rate, machine_cost, packaging_cost, finishing_cost, fees_percent, fees_cost, margin_percent, total_price, notes, created_by, created_at, updated_at) VALUES (?, ?, ?, 'draft', 'PLA', ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, '', ?, unixepoch(), unixepoch())`).bind(quoteId, client, item, grams, materialCost, hours, energyRate, energyCost, machineRate, machineCost, packaging, fees, feesCost, margin, total, user.userId).run();
      quote = await env.DB.prepare(`SELECT id, customer_name, item_name, total_price, material_cost + energy_cost + machine_cost + packaging_cost + finishing_cost + fees_cost AS total_cost FROM quotes WHERE id = ?`).bind(quoteId).first<StoredQuote>();
    }
    if (!quote) return Response.json({ error: 'Não foi possível preparar o orçamento para Pedidos.' }, { status: 500 });

    const existing = await env.DB.prepare(`SELECT id FROM orders WHERE quote_id = ?`).bind(quoteId).first<{ id: string }>();
    if (existing) return Response.json({ id: existing.id, alreadyExists: true });

    const orderId = `PED-${Date.now()}`;
    const totalPrice = Number(quote.total_price);
    const totalCost = Number(quote.total_cost);
    const estimatedProfit = totalPrice - totalCost;
    const unitPrice = Number(body.quote.unitPrice) > 0 ? Number(body.quote.unitPrice) : totalPrice / quantity;
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO orders (id, quote_id, status, total_price, total_cost, estimated_profit, notes, created_at, updated_at) VALUES (?, ?, 'waiting_queue', ?, ?, ?, ?, unixepoch(), unixepoch())`).bind(orderId, quoteId, totalPrice, totalCost, estimatedProfit, `Convertido do orçamento ${quoteId}`),
      env.DB.prepare(`INSERT INTO order_items (id, order_id, inventory_item_id, item_name, quantity, unit_cost, unit_price, subtotal, created_at, updated_at) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`).bind(crypto.randomUUID(), orderId, quote.item_name, quantity, totalCost / quantity, unitPrice, totalPrice),
      env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'order', ?, 'created_from_quote', ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, orderId, JSON.stringify({ quoteId, quantity, totalPrice, totalCost, estimatedProfit })),
    ]);
    return Response.json({ id: orderId, quoteId, totalPrice, totalCost, estimatedProfit }, { status: 201 });
  }

  const items = body.items ?? [];
  if (!items.length || items.some(item => !item.partId || Number(item.quantity) <= 0 || Number(item.unitPrice) < 0)) return Response.json({ error: 'O carrinho contém itens inválidos' }, { status: 400 });

  const customerId = body.customerId || null;
  if (customerId) {
    const customer = await env.DB.prepare(`SELECT id FROM customers WHERE id = ? AND active = 1`).bind(customerId).first();
    if (!customer) return Response.json({ error: 'Cliente não encontrado' }, { status: 404 });
  }

  const storedParts = await Promise.all(items.map(item => env.DB.prepare(`SELECT id, name, quantity, unit_cost FROM inventory_items WHERE id = ? AND category = 'part' AND active = 1`).bind(item.partId).first<StoredPart>()));
  for (let index = 0; index < items.length; index += 1) {
    const part = storedParts[index];
    const requested = Number(items[index].quantity);
    if (!part) return Response.json({ error: 'Uma das peças não existe mais no estoque' }, { status: 409 });
    if (part.quantity < requested) return Response.json({ error: `Estoque insuficiente para ${part.name}` }, { status: 409 });
  }

  const requestedSupplies = new Map<string, number>();
  items.forEach(item => (item.supplies ?? []).forEach(supply => {
    const id = String(supply.supplyId ?? '').trim();
    const quantity = Number(supply.quantity);
    if (id && Number.isFinite(quantity) && quantity > 0) requestedSupplies.set(id, (requestedSupplies.get(id) ?? 0) + quantity);
  }));
  const supplyEntries = await Promise.all([...requestedSupplies].map(async ([id, quantity]) => ({
    quantity,
    supply: await env.DB.prepare(`SELECT id, name, quantity, unit_cost FROM inventory_items WHERE id = ? AND category = 'supply' AND active = 1`).bind(id).first<StoredPart>(),
  })));
  for (const entry of supplyEntries) {
    if (!entry.supply) return Response.json({ error: 'Um dos insumos não existe mais no estoque' }, { status: 409 });
    if (entry.supply.quantity < entry.quantity) return Response.json({ error: `Estoque insuficiente para ${entry.supply.name}` }, { status: 409 });
  }

  const orderId = `PED-${Date.now()}`;
  const totalPrice = items.reduce((total, item) => total + Number(item.quantity) * Number(item.unitPrice), 0);
  const partsCost = items.reduce((total, item, index) => total + Number(item.quantity) * Number(storedParts[index]?.unit_cost ?? 0), 0);
  const suppliesCost = supplyEntries.reduce((total, entry) => total + entry.quantity * Number(entry.supply?.unit_cost ?? 0), 0);
  const totalCost = partsCost + suppliesCost;
  const estimatedProfit = totalPrice - totalCost;
  const statements = [
    env.DB.prepare(`INSERT INTO orders (id, customer_id, status, total_price, total_cost, estimated_profit, created_at, updated_at) VALUES (?, ?, 'ready', ?, ?, ?, unixepoch(), unixepoch())`).bind(orderId, customerId, totalPrice, totalCost, estimatedProfit),
  ];

  items.forEach((item, index) => {
    const part = storedParts[index]!;
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    statements.push(env.DB.prepare(`INSERT INTO order_items (id, order_id, inventory_item_id, item_name, quantity, unit_cost, unit_price, subtotal, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`).bind(crypto.randomUUID(), orderId, part.id, part.name, quantity, part.unit_cost, unitPrice, quantity * unitPrice));
    statements.push(env.DB.prepare(`UPDATE inventory_items SET quantity = quantity - ?, updated_at = unixepoch() WHERE id = ? AND quantity >= ?`).bind(quantity, part.id, quantity));
  });
  supplyEntries.forEach(({ supply, quantity }) => {
    if (!supply) return;
    statements.push(env.DB.prepare(`INSERT INTO order_items (id, order_id, inventory_item_id, item_name, quantity, unit_cost, unit_price, subtotal, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, unixepoch(), unixepoch())`).bind(crypto.randomUUID(), orderId, supply.id, `Insumo: ${supply.name}`, quantity, supply.unit_cost));
    statements.push(env.DB.prepare(`UPDATE inventory_items SET quantity = quantity - ?, updated_at = unixepoch() WHERE id = ? AND quantity >= ?`).bind(quantity, supply.id, quantity));
  });
  statements.push(env.DB.prepare(`INSERT INTO transactions (id, order_id, type, category, description, amount, due_at, created_by, created_at, updated_at) VALUES (?, ?, 'income', 'Venda de peças finalizadas', ?, ?, unixepoch(), ?, unixepoch(), unixepoch())`).bind(crypto.randomUUID(), orderId, `Pedido ${orderId}`, totalPrice, user.userId));
  statements.push(env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'order', ?, 'created', ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, orderId, JSON.stringify({ customerId, items, totalPrice, totalCost, estimatedProfit })));
  await env.DB.batch(statements);

  return Response.json({ id: orderId, totalPrice, totalCost, estimatedProfit }, { status: 201 });
}
