import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const result = await env.DB.prepare('SELECT id, customer_name AS client, item_name AS item, total_price AS total, status, created_at AS createdAt FROM quotes ORDER BY created_at DESC LIMIT 100').all();
  return Response.json(result.results);
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as Record<string, string | number>;
  const required = ['id', 'client', 'item', 'grams', 'hours', 'total'];
  if (required.some(key => body[key] === undefined || body[key] === '')) return Response.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
  const materialCost = Number(body.grams) * 0.095;
  const energyCost = Number(body.hours) * Number(body.energyRate);
  const machineCost = Number(body.hours) * Number(body.machineRate);
  const base = materialCost + energyCost + machineCost + Number(body.packaging);
  const feesCost = base * Number(body.fees) / 100;
  await env.DB.prepare(`INSERT INTO quotes (id, customer_name, item_name, status, material_type, material_grams, material_cost, print_hours, energy_rate, energy_cost, machine_hourly_rate, machine_cost, packaging_cost, finishing_cost, fees_percent, fees_cost, margin_percent, total_price, created_by, created_at, updated_at) VALUES (?, ?, ?, 'draft', 'PLA', ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`)
    .bind(String(body.id), String(body.client), String(body.item), Number(body.grams), materialCost, Number(body.hours), Number(body.energyRate), energyCost, Number(body.machineRate), machineCost, Number(body.packaging), Number(body.fees), feesCost, Number(body.margin), Number(body.total), user.userId).run();
  await env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'quote', ?, 'created', ?, unixepoch())`)
    .bind(crypto.randomUUID(), user.userId, String(body.id), JSON.stringify(body)).run();
  return Response.json({ ok: true, id: body.id }, { status: 201 });
}
