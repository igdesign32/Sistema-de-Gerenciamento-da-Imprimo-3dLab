import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { businessDateUnix } from '@/lib/business-date';

type TransactionMetadata = { product?: string; inventoryItemId?: string; quantity?: number; account?: string; notes?: string; expenseKind?: 'Fixa' | 'Variável' };
type TransactionInput = TransactionMetadata & { id?: string; type?: 'income' | 'expense'; category?: string; unitValue?: number; paymentMethod?: string; status?: string; dueDate?: string };
type TransactionRow = { id: string; orderId: string; type: string; category: string; description: string; amount: number; paymentMethod: string; status: string; dueDate: string };

const selectTransactions = `SELECT id, COALESCE(order_id, '—') AS orderId, CASE type WHEN 'income' THEN 'Receita' ELSE 'Despesa' END AS type, category, description, amount, COALESCE(payment_method, 'A definir') AS paymentMethod, CASE WHEN paid_at IS NULL THEN 'Em aberto' ELSE 'Pago' END AS status, strftime('%Y-%m-%d', due_at, 'unixepoch') AS dueDate FROM transactions`;

function decode(row: TransactionRow) {
  let metadata: TransactionMetadata = {};
  try { metadata = JSON.parse(row.description) as TransactionMetadata; } catch { metadata = { product: row.description }; }
  const quantity = Math.max(.01, Number(metadata.quantity) || 1);
  return { ...row, product: metadata.product || row.description, quantity, unitValue: row.amount / quantity, account: metadata.account || 'Conta Corrente', notes: metadata.notes || '', expenseKind: metadata.expenseKind || (row.type === 'Despesa' ? 'Variável' : undefined) };
}

function validate(body: TransactionInput) {
  const quantity = Math.max(.01, Number(body.quantity) || 0);
  const unitValue = Math.max(0, Number(body.unitValue) || 0);
  if (!body.product?.trim() || !body.category?.trim() || !body.dueDate || quantity <= 0 || unitValue <= 0) return null;
  const dueAt = Math.floor(new Date(`${body.dueDate}T12:00:00Z`).getTime() / 1000);
  if (!Number.isFinite(dueAt)) return null;
  const metadata: TransactionMetadata = { product: body.product.trim(), inventoryItemId: body.inventoryItemId || undefined, quantity, account: body.account?.trim() || 'Conta Corrente', notes: body.notes?.trim() || '', expenseKind: body.type === 'expense' ? body.expenseKind === 'Fixa' ? 'Fixa' : 'Variável' : undefined };
  return { amount: quantity * unitValue, dueAt, metadata };
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const localToday = businessDateUnix();
  await env.DB.prepare(`UPDATE transactions SET due_at = ?, updated_at = unixepoch() WHERE (id LIKE 'order-income:%' OR id LIKE 'order-balance:%' OR id LIKE 'order-expense:%' OR id LIKE 'quote-income:%' OR id LIKE 'quote-expense:%' OR id LIKE 'consignment-income:%' OR id LIKE 'consignment-expense:%') AND due_at > ? AND due_at < ? AND created_at >= unixepoch() - 21600`).bind(localToday, localToday, localToday + 86400).run();
  const result = await env.DB.prepare(`${selectTransactions} ORDER BY due_at DESC, created_at DESC`).all<TransactionRow>();
  return Response.json(result.results.map(decode));
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as TransactionInput;
  const checked = validate(body);
  if (!checked) return Response.json({ error: 'Produto, categoria, data, quantidade e valor são obrigatórios.' }, { status: 400 });
  const id = crypto.randomUUID();
  const paidAt = body.status === 'Pago' ? checked.dueAt : null;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO transactions (id, order_id, type, category, description, amount, due_at, paid_at, payment_method, created_by, created_at, updated_at) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`).bind(id, body.type === 'expense' ? 'expense' : 'income', body.category!.trim(), JSON.stringify(checked.metadata), checked.amount, checked.dueAt, paidAt, body.paymentMethod?.trim() || 'A definir', user.userId),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'transaction', ?, 'created', ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, id, JSON.stringify(body)),
  ]);
  const saved = await env.DB.prepare(`${selectTransactions} WHERE id = ?`).bind(id).first<TransactionRow>();
  return Response.json(saved ? decode(saved) : { error: 'Receita não encontrada após salvar.' }, { status: saved ? 201 : 500 });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as TransactionInput;
  const checked = validate(body);
  if (!body.id || !checked) return Response.json({ error: 'Dados da receita inválidos.' }, { status: 400 });
  const before = await env.DB.prepare(`${selectTransactions} WHERE id = ?`).bind(body.id).first<TransactionRow>();
  if (!before) return Response.json({ error: 'Receita não encontrada.' }, { status: 404 });
  const paidAt = body.status === 'Pago' ? checked.dueAt : null;
  await env.DB.batch([
    env.DB.prepare(`UPDATE transactions SET type = ?, category = ?, description = ?, amount = ?, due_at = ?, paid_at = ?, payment_method = ?, updated_at = unixepoch() WHERE id = ?`).bind(body.type === 'expense' ? 'expense' : 'income', body.category!.trim(), JSON.stringify(checked.metadata), checked.amount, checked.dueAt, paidAt, body.paymentMethod?.trim() || 'A definir', body.id),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, before_json, after_json, created_at) VALUES (?, ?, 'transaction', ?, 'updated', ?, ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, body.id, JSON.stringify(before), JSON.stringify(body)),
  ]);
  const saved = await env.DB.prepare(`${selectTransactions} WHERE id = ?`).bind(body.id).first<TransactionRow>();
  return Response.json(saved ? decode(saved) : { error: 'Receita não encontrada após atualizar.' }, { status: saved ? 200 : 500 });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'Lançamento não informado.' }, { status: 400 });
  const before = await env.DB.prepare(`${selectTransactions} WHERE id = ?`).bind(id).first<TransactionRow>();
  if (!before) return Response.json({ error: 'Lançamento não encontrado.' }, { status: 404 });
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM transactions WHERE id = ?`).bind(id),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, before_json, created_at) VALUES (?, ?, 'transaction', ?, 'deleted', ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, id, JSON.stringify(before)),
  ]);
  return Response.json({ ok: true });
}
