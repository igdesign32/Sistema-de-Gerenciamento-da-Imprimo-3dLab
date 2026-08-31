import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';

type PaidQuoteInput = {
  id?: string;
  client?: string;
  item?: string;
  grams?: number;
  hours?: number;
  energyRate?: number;
  machineRate?: number;
  packaging?: number;
  fees?: number;
  margin?: number;
  total?: number;
  notes?: string;
  quantity?: number;
};

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401 });
  const body = await request.json() as PaidQuoteInput;
  const id = body.id?.trim();
  const client = body.client?.trim();
  const item = body.item?.trim();
  const grams = Math.max(0, Number(body.grams) || 0);
  const hours = Math.max(0, Number(body.hours) || 0);
  const energyRate = Math.max(0, Number(body.energyRate) || 0);
  const machineRate = Math.max(0, Number(body.machineRate) || 0);
  const packaging = Math.max(0, Number(body.packaging) || 0);
  const fees = Math.max(0, Number(body.fees) || 0);
  const margin = Math.max(0, Number(body.margin) || 0);
  const total = Math.max(0, Number(body.total) || 0);
  if (!id || !client || !item || total <= 0) return Response.json({ error: 'Preencha cliente, item e valor total antes de marcar como pago.' }, { status: 400 });

  const materialCost = grams * 0.095;
  const energyCost = hours * energyRate;
  const machineCost = hours * machineRate;
  const baseCost = materialCost + energyCost + machineCost + packaging;
  const feesCost = baseCost * fees / 100;
  const totalCost = baseCost + feesCost;
  const incomeId = `quote-income:${id}`;
  const expenseId = `quote-expense:${id}`;
  const incomeDescription = JSON.stringify({ product: `Orçamento ${id} — ${item}`, quantity: 1, account: 'Conta Corrente', notes: `Cliente: ${client}` });
  const expenseDescription = JSON.stringify({ product: `Custo de produção — ${item}`, quantity: 1, account: 'Conta Corrente', notes: `Gerado automaticamente pelo orçamento ${id}`, expenseKind: 'Variável' });

  await env.DB.batch([
    env.DB.prepare(`INSERT INTO quotes (id, customer_name, item_name, status, material_type, material_grams, material_cost, print_hours, energy_rate, energy_cost, machine_hourly_rate, machine_cost, packaging_cost, finishing_cost, fees_percent, fees_cost, margin_percent, total_price, notes, created_by, created_at, updated_at) VALUES (?, ?, ?, 'paid', 'PLA', ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, unixepoch(), unixepoch()) ON CONFLICT(id) DO UPDATE SET customer_name = excluded.customer_name, item_name = excluded.item_name, status = 'paid', material_grams = excluded.material_grams, material_cost = excluded.material_cost, print_hours = excluded.print_hours, energy_rate = excluded.energy_rate, energy_cost = excluded.energy_cost, machine_hourly_rate = excluded.machine_hourly_rate, machine_cost = excluded.machine_cost, packaging_cost = excluded.packaging_cost, fees_percent = excluded.fees_percent, fees_cost = excluded.fees_cost, margin_percent = excluded.margin_percent, total_price = excluded.total_price, notes = excluded.notes, updated_at = unixepoch()`)
      .bind(id, client, item, grams, materialCost, hours, energyRate, energyCost, machineRate, machineCost, packaging, fees, feesCost, margin, total, body.notes?.trim() || null, user.userId),
    env.DB.prepare(`INSERT INTO transactions (id, order_id, type, category, description, amount, due_at, paid_at, payment_method, created_by, created_at, updated_at) VALUES (?, NULL, 'income', 'Venda de orçamento', ?, ?, unixepoch(), unixepoch(), 'A definir', ?, unixepoch(), unixepoch()) ON CONFLICT(id) DO UPDATE SET description = excluded.description, amount = excluded.amount, due_at = unixepoch(), paid_at = unixepoch(), updated_at = unixepoch()`)
      .bind(incomeId, incomeDescription, total, user.userId),
    env.DB.prepare(`INSERT INTO transactions (id, order_id, type, category, description, amount, due_at, paid_at, payment_method, created_by, created_at, updated_at) VALUES (?, NULL, 'expense', 'Custo de produção', ?, ?, unixepoch(), unixepoch(), 'A definir', ?, unixepoch(), unixepoch()) ON CONFLICT(id) DO UPDATE SET description = excluded.description, amount = excluded.amount, due_at = unixepoch(), paid_at = unixepoch(), updated_at = unixepoch()`)
      .bind(expenseId, expenseDescription, totalCost, user.userId),
    env.DB.prepare(`INSERT INTO audit_logs (id, actor_id, entity_type, entity_id, action, after_json, created_at) VALUES (?, ?, 'quote', ?, 'paid', ?, unixepoch())`)
      .bind(crypto.randomUUID(), user.userId, id, JSON.stringify({ total, totalCost, incomeId, expenseId })),
  ]);

  return Response.json({ ok: true, id, total, cost: totalCost, profit: total - totalCost });
}
