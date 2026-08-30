import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const result = await env.DB.prepare(`SELECT id, COALESCE(order_id, '—') AS orderId, CASE type WHEN 'income' THEN 'Receita' ELSE 'Despesa' END AS type, category, description, amount, COALESCE(payment_method, 'A definir') AS paymentMethod, CASE WHEN paid_at IS NULL THEN 'Em aberto' ELSE 'Pago' END AS status, strftime('%d/%m/%Y', due_at, 'unixepoch') AS dueAt FROM transactions ORDER BY created_at DESC LIMIT 100`).all();
  return Response.json(result.results);
}
