import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { businessDateUnix } from '@/lib/business-date';

type ConsignmentItemInput = { inventoryItemId?: string; quantity?: number; passedValue?: number };
type ConsignmentInput = { id?: string; establishment?: string; itemDetails?: ConsignmentItemInput[]; deliveryDate?: string; visitDate?: string };
type StoredItem = { inventoryItemId: string; name: string; quantity: number; passedValue: number };

const ensureConsignments = async () => {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS consignments (id text PRIMARY KEY NOT NULL, establishment text NOT NULL, items text NOT NULL, delivery_at integer NOT NULL, visit_at integer, created_at integer NOT NULL, updated_at integer NOT NULL)`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_consignments_delivery ON consignments (delivery_at)`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS consignment_items (id text PRIMARY KEY NOT NULL, consignment_id text NOT NULL, inventory_item_id text NOT NULL, item_name text NOT NULL, quantity real NOT NULL, passed_value real NOT NULL, created_at integer NOT NULL, updated_at integer NOT NULL, FOREIGN KEY (consignment_id) REFERENCES consignments(id), FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id))`),
    env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_consignment_items_consignment ON consignment_items (consignment_id)`),
  ]);
  const columns = await env.DB.prepare(`PRAGMA table_info(consignments)`).all<{ name: string }>();
  if (!columns.results.some(column => column.name === 'visit_at')) await env.DB.prepare(`ALTER TABLE consignments ADD visit_at integer`).run();
};

const dateToUnix = (value: string) => Math.floor(new Date(`${value}T12:00:00Z`).getTime() / 1000);
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(dateToUnix(value));

const listConsignments = async () => {
  const [records, itemRows] = await Promise.all([
    env.DB.prepare(`SELECT id, establishment, items, strftime('%Y-%m-%d', delivery_at, 'unixepoch') AS deliveryDate, COALESCE(strftime('%Y-%m-%d', visit_at, 'unixepoch'), '') AS visitDate, CASE WHEN EXISTS(SELECT 1 FROM transactions WHERE transactions.id = 'consignment-income:' || consignments.id AND transactions.paid_at IS NOT NULL) AND EXISTS(SELECT 1 FROM transactions WHERE transactions.id = 'consignment-expense:' || consignments.id AND transactions.paid_at IS NOT NULL) THEN 1 ELSE 0 END AS paid FROM consignments ORDER BY delivery_at DESC, created_at DESC`).all<{ id: string; establishment: string; items: string; deliveryDate: string; visitDate: string; paid: number }>(),
    env.DB.prepare(`SELECT consignment_id AS consignmentId, inventory_item_id AS inventoryItemId, item_name AS name, quantity, passed_value AS passedValue FROM consignment_items ORDER BY created_at`).all<StoredItem & { consignmentId: string }>(),
  ]);
  return records.results.map(record => {
    const itemDetails = itemRows.results.filter(item => item.consignmentId === record.id).map(({ consignmentId: _consignmentId, ...item }) => item);
    return { ...record, itemDetails };
  });
};

const normalizeItems = (items: ConsignmentItemInput[] = []) => {
  const normalized = new Map<string, { inventoryItemId: string; quantity: number; passedValue: number }>();
  for (const item of items) {
    const inventoryItemId = item.inventoryItemId?.trim() || '';
    const quantity = Math.max(0, Math.floor(Number(item.quantity) || 0));
    const passedValue = Math.max(0, Number(item.passedValue) || 0);
    if (inventoryItemId && quantity > 0) normalized.set(inventoryItemId, { inventoryItemId, quantity, passedValue });
  }
  return [...normalized.values()];
};

async function saveConsignment(request: Request, editing: boolean) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  await ensureConsignments();
  const body = await request.json() as ConsignmentInput;
  const id = editing ? body.id?.trim() || '' : crypto.randomUUID();
  const establishment = body.establishment?.trim() || '';
  const deliveryDate = body.deliveryDate?.trim() || '';
  const visitDate = body.visitDate?.trim() || '';
  const requestedItems = normalizeItems(body.itemDetails);
  if (!id || !establishment || requestedItems.length === 0 || !validDate(deliveryDate) || !validDate(visitDate)) return Response.json({ error: 'Preencha o estabelecimento, os itens e as duas datas.' }, { status: 400 });
  if (dateToUnix(visitDate) < dateToUnix(deliveryDate)) return Response.json({ error: 'A visita para reposição não pode ser anterior à entrega.' }, { status: 400 });

  const before = editing ? await env.DB.prepare(`SELECT * FROM consignments WHERE id = ?`).bind(id).first() : null;
  if (editing && !before) return Response.json({ error: 'Consignado não encontrado.' }, { status: 404 });
  const oldItems = editing ? (await env.DB.prepare(`SELECT inventory_item_id AS inventoryItemId, quantity FROM consignment_items WHERE consignment_id = ?`).bind(id).all<{ inventoryItemId: string; quantity: number }>()).results : [];
  const placeholders = requestedItems.map(() => '?').join(',');
  const availableRows = (await env.DB.prepare(`SELECT id, name, quantity AS stock FROM inventory_items WHERE category = 'part' AND active = 1 AND id IN (${placeholders})`).bind(...requestedItems.map(item => item.inventoryItemId)).all<{ id: string; name: string; stock: number }>()).results;
  if (availableRows.length !== requestedItems.length) return Response.json({ error: 'Um dos produtos selecionados não está mais disponível no estoque.' }, { status: 400 });
  for (const item of requestedItems) {
    const part = availableRows.find(row => row.id === item.inventoryItemId)!;
    const previousQuantity = oldItems.find(old => old.inventoryItemId === item.inventoryItemId)?.quantity ?? 0;
    if (item.quantity > part.stock + previousQuantity) return Response.json({ error: `Estoque insuficiente de ${part.name}. Disponível: ${part.stock + previousQuantity} un.` }, { status: 400 });
  }

  const itemDetails: StoredItem[] = requestedItems.map(item => ({ ...item, name: availableRows.find(row => row.id === item.inventoryItemId)!.name }));
  const summary = itemDetails.map(item => `${item.quantity}x ${item.name}`).join(', ');
  const statements = [];
  for (const oldItem of oldItems) statements.push(env.DB.prepare(`UPDATE inventory_items SET quantity = quantity + ?, updated_at = unixepoch() WHERE id = ?`).bind(oldItem.quantity, oldItem.inventoryItemId));
  if (editing) {
    statements.push(env.DB.prepare(`DELETE FROM consignment_items WHERE consignment_id = ?`).bind(id));
    statements.push(env.DB.prepare(`UPDATE consignments SET establishment = ?, items = ?, delivery_at = ?, visit_at = ?, updated_at = unixepoch() WHERE id = ?`).bind(establishment, summary, dateToUnix(deliveryDate), dateToUnix(visitDate), id));
  } else {
    statements.push(env.DB.prepare(`INSERT INTO consignments (id, establishment, items, delivery_at, visit_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch())`).bind(id, establishment, summary, dateToUnix(deliveryDate), dateToUnix(visitDate)));
  }
  for (const item of itemDetails) {
    statements.push(env.DB.prepare(`UPDATE inventory_items SET quantity = quantity - ?, updated_at = unixepoch() WHERE id = ?`).bind(item.quantity, item.inventoryItemId));
    statements.push(env.DB.prepare(`INSERT INTO consignment_items (id, consignment_id, inventory_item_id, item_name, quantity, passed_value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`).bind(crypto.randomUUID(), id, item.inventoryItemId, item.name, item.quantity, item.passedValue));
  }
  statements.push(env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, before_json, after_json, created_at) VALUES (?, ?, 'consignment', ?, ?, ?, ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, id, editing ? 'updated' : 'created', before ? JSON.stringify(before) : null, JSON.stringify({ id, establishment, itemDetails, deliveryDate, visitDate })));
  await env.DB.batch(statements);
  return Response.json({ id, establishment, items: summary, itemDetails, deliveryDate, visitDate }, { status: editing ? 200 : 201 });
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  await ensureConsignments();
  return Response.json(await listConsignments());
}

export async function POST(request: Request) { return saveConsignment(request, false); }
export async function PUT(request: Request) { return saveConsignment(request, true); }

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  await ensureConsignments();
  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim() || '';
  const inventoryItemId = url.searchParams.get('inventoryItemId')?.trim() || '';
  if (!id || !inventoryItemId) return Response.json({ error: 'Consignado ou produto não informado.' }, { status: 400 });

  const consignment = await env.DB.prepare(`SELECT id, establishment FROM consignments WHERE id = ?`).bind(id).first<{ id: string; establishment: string }>();
  if (!consignment) return Response.json({ error: 'Consignado não encontrado.' }, { status: 404 });
  const items = (await env.DB.prepare(`SELECT ci.inventory_item_id AS inventoryItemId, ci.item_name AS name, ci.quantity, ci.passed_value AS passedValue, inventory.unit_cost AS unitCost FROM consignment_items ci JOIN inventory_items inventory ON inventory.id = ci.inventory_item_id WHERE ci.consignment_id = ? ORDER BY ci.created_at`).bind(id).all<StoredItem & { unitCost: number }>()).results;
  const returnedItem = items.find(item => item.inventoryItemId === inventoryItemId);
  if (!returnedItem) return Response.json({ error: 'Produto não encontrado neste consignado.' }, { status: 404 });

  const remainingItems = items.filter(item => item.inventoryItemId !== inventoryItemId);
  const incomeId = `consignment-income:${id}`;
  const expenseId = `consignment-expense:${id}`;
  const wasPaid = Boolean(await env.DB.prepare(`SELECT id FROM transactions WHERE id = ? AND paid_at IS NOT NULL`).bind(incomeId).first<{ id: string }>());
  const statements = [
    env.DB.prepare(`UPDATE inventory_items SET quantity = quantity + ?, updated_at = unixepoch() WHERE id = ?`).bind(returnedItem.quantity, inventoryItemId),
    env.DB.prepare(`DELETE FROM consignment_items WHERE consignment_id = ? AND inventory_item_id = ?`).bind(id, inventoryItemId),
    env.DB.prepare(`DELETE FROM transactions WHERE id IN (?, ?)`).bind(incomeId, expenseId),
  ];

  if (remainingItems.length === 0) {
    statements.push(env.DB.prepare(`DELETE FROM consignments WHERE id = ?`).bind(id));
  } else {
    const summary = remainingItems.map(item => `${item.quantity}x ${item.name}`).join(', ');
    statements.push(env.DB.prepare(`UPDATE consignments SET items = ?, updated_at = unixepoch() WHERE id = ?`).bind(summary, id));
    if (wasPaid) {
      const total = remainingItems.reduce((sum, item) => sum + Number(item.quantity) * Number(item.passedValue), 0);
      const cost = remainingItems.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitCost), 0);
      const incomeDescription = JSON.stringify({ product: `Consignado — ${consignment.establishment}`, quantity: 1, account: 'Conta Corrente', notes: `Venda do consignado ${id}` });
      const expenseDescription = JSON.stringify({ product: `Custo — Consignado ${consignment.establishment}`, quantity: 1, account: 'Conta Corrente', notes: `Custo atual dos Produtos Salvos no consignado ${id}`, expenseKind: 'Variável' });
      const dueAt = businessDateUnix();
      statements.push(env.DB.prepare(`INSERT INTO transactions (id, order_id, type, category, description, amount, due_at, paid_at, payment_method, created_by, created_at, updated_at) VALUES (?, NULL, 'income', 'Venda consignada', ?, ?, ?, unixepoch(), 'A definir', ?, unixepoch(), unixepoch())`).bind(incomeId, incomeDescription, total, dueAt, user.userId));
      statements.push(env.DB.prepare(`INSERT INTO transactions (id, order_id, type, category, description, amount, due_at, paid_at, payment_method, created_by, created_at, updated_at) VALUES (?, NULL, 'expense', 'Custo de produtos consignados', ?, ?, ?, unixepoch(), 'A definir', ?, unixepoch(), unixepoch())`).bind(expenseId, expenseDescription, cost, dueAt, user.userId));
    }
  }
  statements.push(env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'consignment', ?, 'item_returned_to_inventory', ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, id, JSON.stringify({ inventoryItemId, name: returnedItem.name, quantity: returnedItem.quantity, consignmentDeleted: remainingItems.length === 0 })));
  await env.DB.batch(statements);

  if (remainingItems.length === 0) return Response.json({ ok: true, id, deleted: true, returnedQuantity: returnedItem.quantity });
  const updated = (await listConsignments()).find(record => record.id === id);
  return Response.json({ ok: true, id, deleted: false, returnedQuantity: returnedItem.quantity, consignment: updated });
}
