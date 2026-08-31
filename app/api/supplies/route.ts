import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

type SupplyInput = {
  id?: string;
  name?: string;
  type?: string;
  quantity?: number;
  unit?: string;
  unitCost?: number;
  supplier?: string;
  restockQuantity?: number;
};

const supplySelect = `SELECT id, name, COALESCE(material_type, 'Outro') AS type, quantity, unit, unit_cost AS unitCost, COALESCE(brand, '') AS supplier FROM inventory_items WHERE category IN ('other', 'packaging') AND active = 1`;
const categoryFor = (type?: string) => type?.trim().toLocaleLowerCase('pt-BR') === 'embalagem' ? 'packaging' : 'other';

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  let result = await env.DB.prepare(`${supplySelect} ORDER BY name`).all();
  if (result.results.length === 0) {
    await env.DB.prepare(`INSERT OR IGNORE INTO inventory_items (id, sku, name, description, category, material_type, brand, unit, quantity, min_quantity, unit_cost, sale_price, active, created_at, updated_at) VALUES ('supply-001', 'INS-001', 'Argola Italiana', 'Insumo inicial de referência', 'other', 'Outro', 'Shopee', 'un', 87, 0, 0.5, 0, 1, unixepoch(), unixepoch())`).run();
    result = await env.DB.prepare(`${supplySelect} ORDER BY name`).all();
  }
  return Response.json(result.results);
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as SupplyInput;
  if (!body.name?.trim()) return Response.json({ error: 'O nome do insumo é obrigatório' }, { status: 400 });
  const saved = {
    id: crypto.randomUUID(),
    name: body.name.trim(),
    type: body.type?.trim() || 'Outro',
    quantity: Math.max(0, Number(body.quantity) || 0),
    unit: body.unit?.trim() || 'un',
    unitCost: Math.max(0, Number(body.unitCost) || 0),
    supplier: body.supplier?.trim() || '',
  };
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO inventory_items (id, name, description, category, material_type, brand, unit, quantity, min_quantity, unit_cost, sale_price, active, created_at, updated_at) VALUES (?, ?, 'Material extra usado nos produtos', ?, ?, ?, ?, ?, 0, ?, 0, 1, unixepoch(), unixepoch())`).bind(saved.id, saved.name, categoryFor(saved.type), saved.type, saved.supplier, saved.unit, saved.quantity, saved.unitCost),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'inventory_item', ?, 'created', ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, saved.id, JSON.stringify(saved)),
  ]);
  return Response.json(saved, { status: 201 });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as SupplyInput;
  if (!body.id || !body.name?.trim()) return Response.json({ error: 'Dados do insumo inválidos' }, { status: 400 });
  const before = await env.DB.prepare(`${supplySelect} AND id = ?`).bind(body.id).first();
  if (!before) return Response.json({ error: 'Insumo não encontrado' }, { status: 404 });
  const saved = {
    id: body.id,
    name: body.name.trim(),
    type: body.type?.trim() || 'Outro',
    quantity: Math.max(0, Number(body.quantity) || 0),
    unit: body.unit?.trim() || 'un',
    unitCost: Math.max(0, Number(body.unitCost) || 0),
    supplier: body.supplier?.trim() || '',
  };
  const restockQuantity = Math.max(0, Number(body.restockQuantity) || 0);
  const action = restockQuantity > 0 ? 'restocked' : 'updated';
  await env.DB.batch([
    restockQuantity > 0
      ? env.DB.prepare(`UPDATE inventory_items SET name = ?, category = ?, material_type = ?, brand = ?, unit = ?, quantity = quantity + ?, unit_cost = ?, updated_at = unixepoch() WHERE id = ? AND category IN ('other', 'packaging') AND active = 1`).bind(saved.name, categoryFor(saved.type), saved.type, saved.supplier, saved.unit, restockQuantity, saved.unitCost, saved.id)
      : env.DB.prepare(`UPDATE inventory_items SET name = ?, category = ?, material_type = ?, brand = ?, unit = ?, quantity = ?, unit_cost = ?, updated_at = unixepoch() WHERE id = ? AND category IN ('other', 'packaging') AND active = 1`).bind(saved.name, categoryFor(saved.type), saved.type, saved.supplier, saved.unit, saved.quantity, saved.unitCost, saved.id),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, before_json, after_json, created_at) VALUES (?, ?, 'inventory_item', ?, ?, ?, ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, saved.id, action, JSON.stringify(before), JSON.stringify({ ...saved, restockQuantity })),
  ]);
  const result = await env.DB.prepare(`${supplySelect} AND id = ?`).bind(saved.id).first();
  return Response.json(result ?? saved);
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'Insumo não informado' }, { status: 400 });
  await env.DB.batch([
    env.DB.prepare(`UPDATE inventory_items SET active = 0, updated_at = unixepoch() WHERE id = ? AND category IN ('other', 'packaging')`).bind(id),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, created_at) VALUES (?, ?, 'inventory_item', ?, 'deleted', unixepoch())`).bind(crypto.randomUUID(), user.userId, id),
  ]);
  return Response.json({ ok: true });
}
