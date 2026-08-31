import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { defaultPricingDefaults, type PricingDefaults } from '@/lib/pricing-defaults';

const key = 'pricing_defaults';
const normalized = (value: Partial<PricingDefaults>): PricingDefaults => ({
  energyRate: Math.max(0, Number(value.energyRate) || 0),
  machineRate: Math.max(0, Number(value.machineRate) || 0),
  packaging: Math.max(0, Number(value.packaging) || 0),
  margin: Math.min(99, Math.max(0, Number(value.margin) || 0)),
  fees: Math.max(0, Number(value.fees) || 0),
  risk: Math.max(0, Number(value.risk) || 0),
});

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const row = await env.DB.prepare(`SELECT value FROM app_settings WHERE key = ?`).bind(key).first<{ value: string }>();
  if (!row) return Response.json(defaultPricingDefaults);
  try { return Response.json(normalized(JSON.parse(row.value) as Partial<PricingDefaults>)); }
  catch { return Response.json(defaultPricingDefaults); }
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const settings = normalized(await request.json() as Partial<PricingDefaults>);
  await env.DB.batch([
    env.DB.prepare(`INSERT OR REPLACE INTO app_settings (key, value, updated_by, updated_at) VALUES (?, ?, ?, unixepoch())`).bind(key, JSON.stringify(settings), user.userId),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'app_settings', ?, 'updated', ?, unixepoch())`).bind(crypto.randomUUID(), user.userId, key, JSON.stringify(settings)),
  ]);
  return Response.json(settings);
}
