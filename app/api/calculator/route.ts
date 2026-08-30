import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

type CalculatorConfig = {
  id?: string;
  productName?: string;
  quantity?: number;
  colors?: string;
  description?: string;
  observations?: string;
  extras?: string;
  unitCost?: number;
  unitPrice?: number;
  [key: string]: unknown;
};

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const result = await env.DB.prepare(`SELECT value FROM app_settings WHERE key LIKE 'calculator_product:%' ORDER BY updated_at DESC`).all<{ value: string }>();
  return Response.json(result.results.flatMap(row => {
    try { return [JSON.parse(row.value) as CalculatorConfig]; } catch { return []; }
  }));
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const config = await request.json() as CalculatorConfig;
  if (!config.productName?.trim() || Number(config.unitPrice) <= 0) return Response.json({ error: 'Nome e preço de venda são obrigatórios' }, { status: 400 });

  const id = crypto.randomUUID();
  const next = await env.DB.prepare(`SELECT COALESCE(MAX(CAST(sku AS INTEGER)), 0) + 1 AS value FROM inventory_items WHERE category = 'part'`).first<{ value: number }>();
  const sku = String(next?.value ?? 1).padStart(3, '0');
  const saved = { ...config, id, sku, productName: config.productName.trim() };
  const detail = [config.description, config.extras, config.observations].filter(Boolean).join(' • ') || 'Produto salvo pela Calculadora';

  await env.DB.batch([
    env.DB.prepare(`INSERT INTO inventory_items (id, sku, name, description, category, color, unit, quantity, min_quantity, unit_cost, sale_price, active, created_at, updated_at) VALUES (?, ?, ?, ?, 'part', ?, 'un', ?, 0, ?, ?, 1, unixepoch(), unixepoch())`).bind(id, sku, saved.productName, detail, config.colors?.trim() || 'Sem cor', Math.max(0, Number(config.quantity) || 1), Math.max(0, Number(config.unitCost) || 0), Math.max(0, Number(config.unitPrice) || 0)),
    env.DB.prepare(`INSERT OR REPLACE INTO app_settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, unixepoch())`).bind(`calculator_product:${id}`, JSON.stringify(saved), user.userId),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'calculator_product', ?, 'created', ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, id, JSON.stringify(saved)),
  ]);
  return Response.json(saved, { status: 201 });
}
