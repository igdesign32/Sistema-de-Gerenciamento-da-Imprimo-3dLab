import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

type CustomerInput = { name?: string; phone?: string; email?: string };

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const result = await env.DB.prepare(`SELECT c.id, c.name, COALESCE(c.phone, '') AS phone, COALESCE(c.email, '') AS email, COUNT(o.id) AS orders, COALESCE(strftime('%d/%m/%Y', MAX(o.created_at), 'unixepoch'), 'Sem pedidos') AS lastOrder, COALESCE(SUM(o.total_price), 0) AS total FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE c.active = 1 GROUP BY c.id ORDER BY c.name`).all();
  return Response.json(result.results);
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as CustomerInput;
  if (!body.name?.trim()) return Response.json({ error: 'O nome do cliente é obrigatório' }, { status: 400 });
  const id = crypto.randomUUID();
  const customer = { id, name: body.name.trim(), phone: body.phone?.trim() || '', email: body.email?.trim() || '' };
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO customers (id, name, phone, email, active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, unixepoch(), unixepoch())`).bind(customer.id, customer.name, customer.phone || null, customer.email || null),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'customer', ?, 'created', ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, id, JSON.stringify(customer)),
  ]);
  return Response.json(customer, { status: 201 });
}
