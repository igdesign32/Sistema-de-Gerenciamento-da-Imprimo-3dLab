import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

type PartInput = {
  id?: string;
  name?: string;
  detail?: string;
  stock?: number;
  color?: string;
  cost?: number;
  price?: number;
};

const partSelect = `SELECT id, COALESCE(sku, id) AS sku, name, COALESCE(description, '') AS detail, quantity AS stock, COALESCE(color, 'Sem cor') AS color, unit_cost AS cost, sale_price AS price FROM inventory_items WHERE category = 'part' AND active = 1`;

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const result = await env.DB.prepare(`${partSelect} ORDER BY name`).all();
  return Response.json(result.results);
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as PartInput;
  if (!body.name?.trim() || Number(body.price) <= 0) return Response.json({ error: 'Nome e preço de venda são obrigatórios' }, { status: 400 });
  const id = crypto.randomUUID();
  const next = await env.DB.prepare(`SELECT COALESCE(MAX(CAST(sku AS INTEGER)), 0) + 1 AS value FROM inventory_items WHERE category = 'part'`).first<{ value: number }>();
  const sku = String(next?.value ?? 1).padStart(3, '0');
  const saved = { id, sku, name: body.name.trim(), detail: body.detail?.trim() || 'Peça adicionada manualmente', stock: Math.max(0, Number(body.stock) || 0), color: body.color?.trim() || 'Sem cor', cost: Math.max(0, Number(body.cost) || 0), price: Math.max(0, Number(body.price) || 0) };
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO inventory_items (id, sku, name, description, category, color, unit, quantity, min_quantity, unit_cost, sale_price, active, created_at, updated_at) VALUES (?, ?, ?, ?, 'part', ?, 'un', ?, 0, ?, ?, 1, unixepoch(), unixepoch())`).bind(saved.id, saved.sku, saved.name, saved.detail, saved.color, saved.stock, saved.cost, saved.price),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'inventory_item', ?, 'created', ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, id, JSON.stringify(saved)),
  ]);
  return Response.json(saved, { status: 201 });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as PartInput;
  if (!body.id || !body.name?.trim() || Number(body.price) <= 0) return Response.json({ error: 'Dados da peça inválidos' }, { status: 400 });
  const before = await env.DB.prepare(`${partSelect} AND id = ?`).bind(body.id).first();
  if (!before) return Response.json({ error: 'Peça não encontrada' }, { status: 404 });
  await env.DB.batch([
    env.DB.prepare(`UPDATE inventory_items SET name = ?, description = ?, color = ?, quantity = ?, unit_cost = ?, sale_price = ?, updated_at = unixepoch() WHERE id = ? AND category = 'part' AND active = 1`).bind(body.name.trim(), body.detail?.trim() || '', body.color?.trim() || 'Sem cor', Math.max(0, Number(body.stock) || 0), Math.max(0, Number(body.cost) || 0), Math.max(0, Number(body.price) || 0), body.id),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, before_json, after_json, created_at) VALUES (?, ?, 'inventory_item', ?, 'updated', ?, ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, body.id, JSON.stringify(before), JSON.stringify(body)),
  ]);
  const saved = await env.DB.prepare(`${partSelect} AND id = ?`).bind(body.id).first();
  return Response.json(saved);
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'Peça não informada' }, { status: 400 });
  await env.DB.batch([
    env.DB.prepare(`UPDATE inventory_items SET active = 0, updated_at = unixepoch() WHERE id = ? AND category = 'part'`).bind(id),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, created_at) VALUES (?, ?, 'inventory_item', ?, 'deleted', unixepoch())`).bind(crypto.randomUUID(), user.userId, id),
  ]);
  return Response.json({ ok: true });
}
