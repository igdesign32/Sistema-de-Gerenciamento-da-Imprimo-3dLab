import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { businessDateUnix } from '@/lib/business-date';

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
  const body = await request.json() as { id?: string; amount?: number };
  const id = String(body.id ?? '').trim();
  if (!id) return Response.json({ error: 'Pedido não informado' }, { status: 400 });

  const order = await env.DB.prepare(`SELECT o.id, o.quote_id AS quoteId, COALESCE(c.name, q.customer_name, 'Venda sem cliente') AS customer, COALESCE(NULLIF(o.notes, ''), 'Pedido sem nome') AS packageName, o.total_price AS total, o.total_cost AS cost FROM orders o LEFT JOIN customers c ON c.id = o.customer_id LEFT JOIN quotes q ON q.id = o.quote_id WHERE o.id = ?`).bind(id).first<StoredOrder>();
  if (!order) return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });

  const total = Math.max(0, Number(order.total) || 0);
  const cost = Math.max(0, Number(order.cost) || 0);
  if (total <= 0) return Response.json({ error: 'O pedido precisa ter valor antes de ser marcado como pago.' }, { status: 400 });

  const paid = await env.DB.prepare(`SELECT COALESCE(SUM(amount), 0) AS amount FROM transactions WHERE order_id = ? AND type = 'income' AND paid_at IS NOT NULL`).bind(id).first<{ amount: number }>();
  const paidBefore = Math.max(0, Number(paid?.amount) || 0);
  const pendingBefore = Math.max(0, total - paidBefore);
  if (pendingBefore <= 0.005) return Response.json({ error: 'Este pedido já está integralmente pago.' }, { status: 409 });

  const requestedAmount = body.amount === undefined ? pendingBefore : Number(body.amount);
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) return Response.json({ error: 'Informe um valor de pagamento maior que zero.' }, { status: 400 });
  if (requestedAmount > pendingBefore + 0.005) return Response.json({ error: `O pagamento não pode ultrapassar o saldo de R$ ${pendingBefore.toFixed(2).replace('.', ',')}.` }, { status: 400 });

  const amount = Math.min(requestedAmount, pendingBefore);
  const paidAmount = Math.min(total, paidBefore + amount);
  const pendingAmount = Math.max(0, total - paidAmount);
  const fullyPaid = pendingAmount <= 0.005;
  const incomeId = `order-income:${id}:${crypto.randomUUID()}`;
  const balanceId = `order-balance:${id}`;
  const expenseId = `order-expense:${id}`;
  const incomeDescription = JSON.stringify({ product: order.packageName, quantity: 1, account: 'Conta Corrente', notes: `Pagamento do pedido ${id} · Cliente: ${order.customer}` });
  const balanceDescription = JSON.stringify({ product: `Saldo pendente — ${order.packageName}`, quantity: 1, account: 'Conta Corrente', notes: `Saldo a receber do pedido ${id} · Cliente: ${order.customer}` });
  const expenseDescription = JSON.stringify({ product: `Custo — ${order.packageName}`, quantity: 1, account: 'Conta Corrente', notes: `Custo real do pedido ${id}`, expenseKind: 'Variável' });
  const dueAt = businessDateUnix();

  const statements = [
    env.DB.prepare(`DELETE FROM transactions WHERE id = ?`).bind(balanceId),
    env.DB.prepare(`DELETE FROM transactions WHERE id IN (?, ?)`).bind(`quote-income:${order.quoteId ?? ''}`, `quote-expense:${order.quoteId ?? ''}`),
    env.DB.prepare(`INSERT INTO transactions (id, order_id, type, category, description, amount, due_at, paid_at, payment_method, created_by, created_at, updated_at) VALUES (?, ?, 'income', 'Venda de pedido', ?, ?, ?, unixepoch(), 'A definir', ?, unixepoch(), unixepoch())`).bind(incomeId, id, incomeDescription, amount, dueAt, user.userId),
    env.DB.prepare(`INSERT INTO transactions (id, order_id, type, category, description, amount, due_at, paid_at, payment_method, created_by, created_at, updated_at) VALUES (?, ?, 'expense', 'Custo de produção', ?, ?, ?, unixepoch(), 'A definir', ?, unixepoch(), unixepoch()) ON CONFLICT(id) DO NOTHING`).bind(expenseId, id, expenseDescription, cost, dueAt, user.userId),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'order', ?, ?, ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, id, fullyPaid ? 'paid' : 'partially_paid', JSON.stringify({ total, amount, paidAmount, pendingAmount, cost, incomeId, expenseId })),
  ];
  if (!fullyPaid) statements.push(env.DB.prepare(`INSERT INTO transactions (id, order_id, type, category, description, amount, due_at, paid_at, payment_method, created_by, created_at, updated_at) VALUES (?, ?, 'income', 'Venda de pedido', ?, ?, ?, NULL, 'A definir', ?, unixepoch(), unixepoch())`).bind(balanceId, id, balanceDescription, pendingAmount, dueAt, user.userId));
  await env.DB.batch(statements);

  return Response.json({ ok: true, id, total, amount, paidAmount, pendingAmount, cost, profit: total - cost, paid: fullyPaid });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id) return Response.json({ error: 'Pedido não informado' }, { status: 400 });
  const order = await env.DB.prepare(`SELECT id FROM orders WHERE id = ?`).bind(id).first<{ id: string }>();
  if (!order) return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM transactions WHERE order_id = ?`).bind(id),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'order', ?, 'payment_reversed', '{}', unixepoch())`).bind(crypto.randomUUID(), user.userId, id),
  ]);
  return Response.json({ ok: true, id, paid: false });
}
