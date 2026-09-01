import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { businessDateUnix } from '@/lib/business-date';

type StoredConsignment = { id: string; establishment: string; total: number; cost: number; itemCount: number };

const loadConsignment = (id: string) => env.DB.prepare(`
  SELECT c.id,
    c.establishment,
    COALESCE(SUM(ci.quantity * ci.passed_value), 0) AS total,
    COALESCE(SUM(ci.quantity * inventory.unit_cost), 0) AS cost,
    COUNT(ci.id) AS itemCount
  FROM consignments c
  LEFT JOIN consignment_items ci ON ci.consignment_id = c.id
  LEFT JOIN inventory_items inventory ON inventory.id = ci.inventory_item_id
  WHERE c.id = ?
  GROUP BY c.id
`).bind(id).first<StoredConsignment>();

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as { id?: string };
  const id = String(body.id ?? '').trim();
  if (!id) return Response.json({ error: 'Consignado não informado.' }, { status: 400 });

  const consignment = await loadConsignment(id);
  if (!consignment) return Response.json({ error: 'Consignado não encontrado.' }, { status: 404 });
  const total = Math.max(0, Number(consignment.total) || 0);
  const cost = Math.max(0, Number(consignment.cost) || 0);
  if (Number(consignment.itemCount) <= 0 || total <= 0) return Response.json({ error: 'O consignado precisa ter itens e valor repassado antes de ser marcado como pago.' }, { status: 400 });

  const incomeId = `consignment-income:${id}`;
  const expenseId = `consignment-expense:${id}`;
  const incomeDescription = JSON.stringify({ product: `Consignado — ${consignment.establishment}`, quantity: 1, account: 'Conta Corrente', notes: `Venda do consignado ${id}` });
  const expenseDescription = JSON.stringify({ product: `Custo — Consignado ${consignment.establishment}`, quantity: 1, account: 'Conta Corrente', notes: `Custo atual dos Produtos Salvos no consignado ${id}`, expenseKind: 'Variável' });
  const dueAt = businessDateUnix();

  await env.DB.batch([
    env.DB.prepare(`DELETE FROM transactions WHERE id IN (?, ?)`).bind(incomeId, expenseId),
    env.DB.prepare(`INSERT INTO transactions (id, order_id, type, category, description, amount, due_at, paid_at, payment_method, created_by, created_at, updated_at) VALUES (?, NULL, 'income', 'Venda consignada', ?, ?, ?, unixepoch(), 'A definir', ?, unixepoch(), unixepoch())`).bind(incomeId, incomeDescription, total, dueAt, user.userId),
    env.DB.prepare(`INSERT INTO transactions (id, order_id, type, category, description, amount, due_at, paid_at, payment_method, created_by, created_at, updated_at) VALUES (?, NULL, 'expense', 'Custo de produtos consignados', ?, ?, ?, unixepoch(), 'A definir', ?, unixepoch(), unixepoch())`).bind(expenseId, expenseDescription, cost, dueAt, user.userId),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'consignment', ?, 'paid', ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, id, JSON.stringify({ total, cost, profit: total - cost, incomeId, expenseId })),
  ]);

  return Response.json({ ok: true, id, total, cost, profit: total - cost, paid: true });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id) return Response.json({ error: 'Consignado não informado.' }, { status: 400 });
  const consignment = await env.DB.prepare(`SELECT id FROM consignments WHERE id = ?`).bind(id).first<{ id: string }>();
  if (!consignment) return Response.json({ error: 'Consignado não encontrado.' }, { status: 404 });

  await env.DB.batch([
    env.DB.prepare(`DELETE FROM transactions WHERE id IN (?, ?)`).bind(`consignment-income:${id}`, `consignment-expense:${id}`),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'consignment', ?, 'payment_reversed', '{}', unixepoch())`).bind(crypto.randomUUID(), user.userId, id),
  ]);
  return Response.json({ ok: true, id, paid: false });
}
