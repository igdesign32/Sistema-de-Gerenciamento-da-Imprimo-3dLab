import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

type OrderInput = {
  customerId?: string | null;
  items?: Array<{ partId?: string; quantity?: number; unitPrice?: number }>;
};

type StoredPart = { id: string; name: string; quantity: number; unit_cost: number };

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const result = await env.DB.prepare(`SELECT o.id, COALESCE(c.name, 'Venda sem cliente') AS customer, COALESCE(GROUP_CONCAT(oi.item_name, ', '), 'Sem itens') AS items, SUM(oi.quantity) AS quantity, o.total_price AS total, o.total_cost AS cost, o.estimated_profit AS profit, CASE o.status WHEN 'ready' THEN 'Pronto' WHEN 'delivered' THEN 'Entregue' WHEN 'cancelled' THEN 'Cancelado' ELSE 'Em andamento' END AS status, strftime('%d/%m/%Y', o.created_at, 'unixepoch') AS createdAt FROM orders o LEFT JOIN customers c ON c.id = o.customer_id LEFT JOIN order_items oi ON oi.order_id = o.id GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100`).all();
  return Response.json(result.results);
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as OrderInput;
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

  const orderId = `PED-${Date.now()}`;
  const totalPrice = items.reduce((total, item) => total + Number(item.quantity) * Number(item.unitPrice), 0);
  const totalCost = items.reduce((total, item, index) => total + Number(item.quantity) * Number(storedParts[index]?.unit_cost ?? 0), 0);
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
  statements.push(env.DB.prepare(`INSERT INTO transactions (id, order_id, type, category, description, amount, due_at, created_by, created_at, updated_at) VALUES (?, ?, 'income', 'Venda de peças finalizadas', ?, ?, unixepoch(), ?, unixepoch(), unixepoch())`).bind(crypto.randomUUID(), orderId, `Pedido ${orderId}`, totalPrice, user.userId));
  statements.push(env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'order', ?, 'created', ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, orderId, JSON.stringify({ customerId, items, totalPrice, totalCost, estimatedProfit })));
  await env.DB.batch(statements);

  return Response.json({ id: orderId, totalPrice, totalCost, estimatedProfit }, { status: 201 });
}
