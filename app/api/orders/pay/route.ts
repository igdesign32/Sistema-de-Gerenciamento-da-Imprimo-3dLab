import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

type StoredOrder = {
  id: string;
  quoteId: string | null;
  customer: string;
  packageName: string;
  total: number;
  cost: number;
};

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as { id?: string };
  const id = String(body.id ?? '').trim();
  if (!id) return Response.json({ error: 'Pedido não informado' }, { status: 400 });

  const order = await env.DB.prepare(`SELECT o.id, o.quote_id AS quoteId, COALESCE(c.name, q.customer_name, 'Venda sem cliente') AS customer, COALESCE(NULLIF(o.notes, ''), 'Pedido sem nome') AS packageName, o.total_price AS total, o.total_cost AS cost FROM orders o LEFT JOIN customers c ON c.id = o.customer_id LEFT JOIN quotes q ON q.id = o.quote_id WHERE o.id = ?`).bind(id).first<StoredOrder>();
  if (!order) return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });

  const total = Math.max(0, Number(order.total) || 0);
  const cost = Math.max(0, Number(order.cost) || 0);
  if (total <= 0) return Response.json({ error: 'O pedido precisa ter valor antes de ser marcado como pago.' }, { status: 400 });

  const incomeId = `order-income:${id}`;
  const expenseId = `order-expense:${id}`;
  const incomeDescription = JSON.stringify({ product: order.packageName, quantity: 1, account: 'Conta Corrente', notes: `Pedido ${id} · Cliente: ${order.customer}` });
  const expenseDescription = JSON.stringify({ product: `Custo — ${order.packageName}`, quantity: 1, account: 'Conta Corrente', notes: `Custo real do pedido ${id}`, expenseKind: 'Variável' });

  await env.DB.batch([
    env.DB.prepare(`DELETE FROM transactions WHERE order_id = ?`).bind(id),
    env.DB.prepare(`DELETE FROM transactions WHERE id IN (?, ?)`).bind(`quote-income:${order.quoteId ?? ''}`, `quote-expense:${order.quoteId ?? ''}`),
    env.DB.prepare(`INSERT INTO transactions (id, order_id, type, category, description, amount, due_at, paid_at, payment_method, created_by, created_at, updated_at) VALUES (?, ?, 'income', 'Venda de pedido', ?, ?, unixepoch(), unixepoch(), 'A definir', ?, unixepoch(), unixepoch())`).bind(incomeId, id, incomeDescription, total, user.userId),
    env.DB.prepare(`INSERT INTO transactions (id, order_id, type, category, description, amount, due_at, paid_at, payment_method, created_by, created_at, updated_at) VALUES (?, ?, 'expense', 'Custo de produção', ?, ?, unixepoch(), unixepoch(), 'A definir', ?, unixepoch(), unixepoch())`).bind(expenseId, id, expenseDescription, cost, user.userId),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'order', ?, 'paid', ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, id, JSON.stringify({ total, cost, profit: total - cost, incomeId, expenseId })),
  ]);

  return Response.json({ ok: true, id, total, cost, profit: total - cost, paid: true });
}
