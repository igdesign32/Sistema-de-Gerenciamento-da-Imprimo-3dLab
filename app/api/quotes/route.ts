import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

type QuoteInput = Record<string, unknown>;
type StoredQuoteRow = Record<string, unknown> & { notes?: string | null };

function encodedNotes(body: QuoteInput) {
  const suppliedDetails = body.details && typeof body.details === 'object' ? body.details as Record<string, unknown> : {};
  return JSON.stringify({
    notes: typeof body.notes === 'string' ? body.notes : '',
    details: {
      ...suppliedDetails,
      quantity: body.quantity,
      unitPrice: body.unitPrice,
      timeHours: body.timeHours,
      timeMinutes: body.timeMinutes,
    },
  });
}

function decodedQuote(row: StoredQuoteRow) {
  if (!row.notes) return { ...row, notes: '', supplies: [] };
  try {
    const stored = JSON.parse(row.notes) as { notes?: string; details?: { selectedSupplies?: unknown[]; quantity?: number; unitPrice?: number; timeHours?: number; timeMinutes?: number } };
    return {
      ...row,
      notes: stored.notes ?? '',
      supplies: stored.details?.selectedSupplies ?? [],
      quantity: stored.details?.quantity,
      unitPrice: stored.details?.unitPrice,
      timeHours: stored.details?.timeHours,
      timeMinutes: stored.details?.timeMinutes,
    };
  } catch {
    return { ...row, notes: row.notes, supplies: [] };
  }
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const result = await env.DB.prepare(`SELECT id, customer_name AS client, item_name AS item, total_price AS total, CASE status WHEN 'paid' THEN 'Pago' WHEN 'draft' THEN 'Pendente' ELSE status END AS status, material_grams AS grams, print_hours AS hours, energy_rate AS energyRate, machine_hourly_rate AS machineRate, packaging_cost AS packaging, fees_percent AS fees, margin_percent AS margin, notes, strftime('%d/%m/%Y', created_at, 'unixepoch') AS date FROM quotes ORDER BY created_at DESC`).all<StoredQuoteRow>();
  return Response.json(result.results.map(decodedQuote));
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as QuoteInput;
  const required = ['id', 'client', 'item', 'grams', 'hours', 'total'];
  if (required.some(key => body[key] === undefined || body[key] === '')) return Response.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
  const materialCost = body.materialCost === undefined ? Number(body.grams) * 0.095 : Number(body.materialCost);
  const energyCost = body.energyCost === undefined ? Number(body.hours) * Number(body.energyRate) : Number(body.energyCost);
  const machineCost = body.machineCost === undefined ? Number(body.hours) * Number(body.machineRate) : Number(body.machineCost);
  const base = materialCost + energyCost + machineCost + Number(body.packaging);
  const feesCost = base * Number(body.fees) / 100;
  await env.DB.prepare(`INSERT INTO quotes (id, customer_name, item_name, status, material_type, material_grams, material_cost, print_hours, energy_rate, energy_cost, machine_hourly_rate, machine_cost, packaging_cost, finishing_cost, fees_percent, fees_cost, margin_percent, total_price, notes, created_by, created_at, updated_at) VALUES (?, ?, ?, 'draft', 'PLA', ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch())`)
    .bind(String(body.id), String(body.client), String(body.item), Number(body.grams), materialCost, Number(body.hours), Number(body.energyRate), energyCost, Number(body.machineRate), machineCost, Number(body.packaging), Number(body.fees), feesCost, Number(body.margin), Number(body.total), encodedNotes(body), user.userId).run();
  await env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'quote', ?, 'created', ?, unixepoch())`)
    .bind(crypto.randomUUID(), user.userId, String(body.id), JSON.stringify(body)).run();
  return Response.json({ ok: true, id: body.id }, { status: 201 });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as QuoteInput;
  const required = ['id', 'client', 'item', 'grams', 'hours', 'total'];
  if (required.some(key => body[key] === undefined || body[key] === '')) return Response.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
  const materialCost = Number(body.grams) * 0.095;
  const energyCost = Number(body.hours) * Number(body.energyRate);
  const machineCost = Number(body.hours) * Number(body.machineRate);
  const base = materialCost + energyCost + machineCost + Number(body.packaging);
  const feesCost = base * Number(body.fees) / 100;
  const result = await env.DB.prepare(`UPDATE quotes SET customer_name = ?, item_name = ?, material_grams = ?, material_cost = ?, print_hours = ?, energy_rate = ?, energy_cost = ?, machine_hourly_rate = ?, machine_cost = ?, packaging_cost = ?, fees_percent = ?, fees_cost = ?, margin_percent = ?, total_price = ?, notes = ?, updated_at = unixepoch() WHERE id = ?`)
    .bind(String(body.client), String(body.item), Number(body.grams), materialCost, Number(body.hours), Number(body.energyRate), energyCost, Number(body.machineRate), machineCost, Number(body.packaging), Number(body.fees), feesCost, Number(body.margin), Number(body.total), encodedNotes(body), String(body.id)).run();
  if (!result.meta.changes) return Response.json({ error: 'Orçamento não encontrado' }, { status: 404 });
  await env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'quote', ?, 'updated', ?, unixepoch())`)
    .bind(crypto.randomUUID(), user.userId, String(body.id), JSON.stringify(body)).run();
  return Response.json({ ok: true, id: body.id });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'Orçamento não informado' }, { status: 400 });
  await env.DB.prepare('DELETE FROM quotes WHERE id = ?').bind(id).run();
  await env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'quote', ?, 'deleted', '{}', unixepoch())`)
    .bind(crypto.randomUUID(), user.userId, id).run();
  return Response.json({ ok: true });
}
