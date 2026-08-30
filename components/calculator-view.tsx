'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Boxes, Calculator, FileText, Save, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

export type CalculatorQuote = { id: string; client: string; item: string; date: string; total: string; status: string; quantity: number; unitPrice: number };

type SavedConfig = {
  id?: string; productName: string; quantity: number; colors: string; description: string; observations: string; extras: string;
  materialName: string; materialCostKg: number; materialGrams: number; supplyCost: number; productionHours: number;
  energyKwh: number; energyRate: number; machineRate: number; maintenance: number; riskPercent: number; packaging: number;
  shipping: number; otherCosts: number; feesPercent: number; marginPercent: number; unitCost: number; unitPrice: number;
};

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const numeric = (value: string) => Math.max(0, Number(value) || 0);

export function CalculatorView({ onQuoteSaved }: { onQuoteSaved: (quote: CalculatorQuote) => void }) {
  const [productName, setProductName] = useState(''); const [quantity, setQuantity] = useState(1); const [colors, setColors] = useState('');
  const [description, setDescription] = useState(''); const [observations, setObservations] = useState(''); const [extras, setExtras] = useState('');
  const [materialName, setMaterialName] = useState('PLA'); const [materialCostKg, setMaterialCostKg] = useState(95); const [materialGrams, setMaterialGrams] = useState(180); const [supplyCost, setSupplyCost] = useState(0);
  const [productionHours, setProductionHours] = useState(9.5); const [energyKwh, setEnergyKwh] = useState(9.5); const [energyRate, setEnergyRate] = useState(.86);
  const [machineRate, setMachineRate] = useState(3.4); const [maintenance, setMaintenance] = useState(0); const [riskPercent, setRiskPercent] = useState(5);
  const [packaging, setPackaging] = useState(8); const [shipping, setShipping] = useState(0); const [otherCosts, setOtherCosts] = useState(0); const [feesPercent, setFeesPercent] = useState(8); const [marginPercent, setMarginPercent] = useState(35);
  const [saved, setSaved] = useState<SavedConfig[]>([]); const [selected, setSelected] = useState(''); const [notice, setNotice] = useState(''); const [saving, setSaving] = useState<'product' | 'quote' | null>(null);

  useEffect(() => { void fetch('/api/calculator').then(response => response.ok ? response.json() : []).then((items: SavedConfig[]) => setSaved(items)).catch(() => undefined); }, []);

  const calculation = useMemo(() => {
    const material = materialGrams / 1000 * materialCostKg;
    const energy = energyKwh * energyRate;
    const machine = productionHours * machineRate;
    const base = material + supplyCost + energy + machine + maintenance + packaging + shipping + otherCosts;
    const risk = base * riskPercent / 100;
    const unitCost = base + risk;
    const fees = unitCost * feesPercent / 100;
    const unitPrice = marginPercent >= 100 ? 0 : (unitCost + fees) / (1 - marginPercent / 100);
    const totalCost = unitCost * quantity;
    const totalSale = unitPrice * quantity;
    const profit = totalSale - totalCost;
    const markup = unitCost > 0 ? (unitPrice / unitCost - 1) * 100 : 0;
    return { material, energy, machine, risk, fees, unitCost, unitPrice, totalCost, totalSale, profit, markup };
  }, [materialGrams, materialCostKg, energyKwh, energyRate, productionHours, machineRate, supplyCost, maintenance, packaging, shipping, otherCosts, riskPercent, feesPercent, marginPercent, quantity]);

  const config = (): SavedConfig => ({ productName, quantity, colors, description, observations, extras, materialName, materialCostKg, materialGrams, supplyCost, productionHours, energyKwh, energyRate, machineRate, maintenance, riskPercent, packaging, shipping, otherCosts, feesPercent, marginPercent, unitCost: calculation.unitCost, unitPrice: calculation.unitPrice });
  const loadConfig = (id: string) => {
    setSelected(id); const item = saved.find(entry => entry.id === id); if (!item) return;
    setProductName(item.productName); setQuantity(item.quantity); setColors(item.colors); setDescription(item.description); setObservations(item.observations); setExtras(item.extras); setMaterialName(item.materialName); setMaterialCostKg(item.materialCostKg); setMaterialGrams(item.materialGrams); setSupplyCost(item.supplyCost); setProductionHours(item.productionHours); setEnergyKwh(item.energyKwh); setEnergyRate(item.energyRate); setMachineRate(item.machineRate); setMaintenance(item.maintenance); setRiskPercent(item.riskPercent); setPackaging(item.packaging); setShipping(item.shipping); setOtherCosts(item.otherCosts); setFeesPercent(item.feesPercent); setMarginPercent(item.marginPercent);
    setNotice(`${item.productName} carregado para um novo cálculo.`);
  };
  const saveProduct = async () => {
    if (!productName.trim()) return setNotice('Informe o nome do produto antes de salvar.'); setSaving('product');
    try { const response = await fetch('/api/calculator', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(config()) }); const item = await response.json() as SavedConfig & { error?: string }; if (!response.ok) throw new Error(item.error || 'Não foi possível salvar'); setSaved(current => [item, ...current]); setSelected(item.id || ''); setNotice('Produto salvo em Produtos Salvos e disponível para reutilização.'); } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível salvar o produto.'); } finally { setSaving(null); }
  };
  const saveQuote = async () => {
    if (!productName.trim()) return setNotice('Informe o nome do produto antes de salvar.'); setSaving('quote');
    const id = `ORC-${String(Date.now()).slice(-6)}`; const payload = { id, client: 'Cliente não informado', item: productName, grams: materialGrams, hours: productionHours, energyRate, machineRate, packaging, fees: feesPercent, margin: marginPercent, quantity, unitPrice: calculation.unitPrice, materialCost: calculation.material, energyCost: calculation.energy, machineCost: calculation.machine, total: calculation.totalSale, details: config() };
    try { const response = await fetch('/api/quotes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error || 'Não foi possível salvar'); const quote = { id, client: 'Cliente não informado', item: productName, date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date()), total: money(calculation.totalSale), status: 'Rascunho', quantity, unitPrice: calculation.unitPrice }; onQuoteSaved(quote); setNotice('Orçamento salvo com todos os valores do cálculo.'); } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível salvar o orçamento.'); } finally { setSaving(null); }
  };
  const distribution = [{ label: 'Material', value: calculation.material, color: 'bg-blue-500' }, { label: 'Insumos', value: supplyCost, color: 'bg-violet-500' }, { label: 'Energia', value: calculation.energy, color: 'bg-amber-500' }, { label: 'Máquina', value: calculation.machine, color: 'bg-orange-500' }, { label: 'Demais custos', value: maintenance + packaging + shipping + otherCosts + calculation.risk, color: 'bg-slate-500' }];

  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-bold">Calculadora de precificação</h2><p className="text-sm text-slate-500">Calcule custos, margem, lucro e salve produtos para reutilizar.</p></div><div className="min-w-64"><label className="text-xs font-medium text-slate-600">Carregar produto salvo<select value={selected} onChange={event => loadConfig(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0068ff]/30"><option value="">Selecione um produto...</option>{saved.map(item => <option key={item.id} value={item.id}>{item.productName}</option>)}</select></label></div></div>
    {notice && <output className="block rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">{notice}</output>}

    <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <div className="space-y-5">
        <Section title="Identificação do produto" icon={Boxes}><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome do produto / projeto *"><Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Ex.: Luminária personalizada"/></Field><Field label="Quantidade"><NumberInput value={quantity} onChange={value => setQuantity(Math.max(1, value))} min={1}/></Field><Field label="Cor(es)"><Input value={colors} onChange={e => setColors(e.target.value)} placeholder="Ex.: Azul e laranja"/></Field><Field label="Opcionais / extras"><Input value={extras} onChange={e => setExtras(e.target.value)} placeholder="Ex.: Base, pintura ou embalagem especial"/></Field><Field label="Descrição / detalhes"><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes do produto..."/></Field><Field label="Observações"><Textarea value={observations} onChange={e => setObservations(e.target.value)} placeholder="Prazo, acabamento, tolerâncias..."/></Field></div></Section>
        <Section title="Material e produção" icon={Calculator}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Material utilizado"><Input value={materialName} onChange={e => setMaterialName(e.target.value)} placeholder="PLA, PETG, resina..."/></Field><Field label="Custo do material (R$/kg)"><NumberInput value={materialCostKg} onChange={setMaterialCostKg}/></Field><Field label="Peso utilizado por unidade (g)"><NumberInput value={materialGrams} onChange={setMaterialGrams}/></Field><Field label="Insumos adicionais (R$)"><NumberInput value={supplyCost} onChange={setSupplyCost}/></Field><Field label="Tempo de produção por unidade (h)"><NumberInput value={productionHours} onChange={setProductionHours}/></Field><Field label="Consumo de energia por unidade (kWh)"><NumberInput value={energyKwh} onChange={setEnergyKwh}/></Field><Field label="Custo da energia (R$/kWh)"><NumberInput value={energyRate} onChange={setEnergyRate}/></Field><Field label="Máquina / depreciação (R$/h)"><NumberInput value={machineRate} onChange={setMachineRate}/></Field><Field label="Desgaste / manutenção (R$)"><NumberInput value={maintenance} onChange={setMaintenance}/></Field></div></Section>
        <Section title="Custos adicionais e preço" icon={TrendingUp}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Risco / perda (%)"><NumberInput value={riskPercent} onChange={setRiskPercent}/></Field><Field label="Embalagem (R$)"><NumberInput value={packaging} onChange={setPackaging}/></Field><Field label="Frete (R$)"><NumberInput value={shipping} onChange={setShipping}/></Field><Field label="Outros custos (R$)"><NumberInput value={otherCosts} onChange={setOtherCosts}/></Field><Field label="Taxas / impostos (%)"><NumberInput value={feesPercent} onChange={setFeesPercent}/></Field><Field label="Margem desejada (%)"><NumberInput value={marginPercent} onChange={value => setMarginPercent(Math.min(99, value))}/></Field></div></Section>
      </div>

      <div className="space-y-5">
        <Card className="border-0 bg-[var(--brand-blue)] text-white shadow-sm ring-0"><CardHeader><CardTitle className="text-white">Resultado da precificação</CardTitle></CardHeader><CardContent className="space-y-4"><Metric label="Custo unitário de produção" value={money(calculation.unitCost)}/><Metric label={`Custo total (${quantity} un.)`} value={money(calculation.totalCost)}/><div className="rounded-xl bg-white/10 p-4"><p className="text-xs text-white/70">Preço de venda sugerido</p><p className="mt-1 text-3xl font-bold text-[#ff8358]">{money(calculation.totalSale)}</p><p className="mt-1 text-[11px] text-white/70">{money(calculation.unitPrice)} por unidade</p></div><div className="grid grid-cols-2 gap-3"><Metric label="Markup" value={`${calculation.markup.toFixed(1)}%`}/><Metric label="Margem" value={`${marginPercent.toFixed(1)}%`}/><Metric label="Lucro estimado" value={money(calculation.profit)}/><Metric label="Quantidade" value={String(quantity)}/></div></CardContent></Card>
        <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="size-4 text-[#0068ff]"/> Distribuição dos custos</CardTitle></CardHeader><CardContent className="space-y-3">{distribution.map(item => { const percent = calculation.unitCost > 0 ? item.value / calculation.unitCost * 100 : 0; return <div key={item.label}><div className="mb-1 flex justify-between text-xs"><span>{item.label}</span><b>{money(item.value)} · {percent.toFixed(0)}%</b></div><Progress value={percent} className={item.color}/></div>; })}</CardContent></Card>
        <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader><CardTitle>Análise detalhada</CardTitle></CardHeader><CardContent className="space-y-2 text-xs">{[['Material utilizado', calculation.material], ['Insumos adicionais', supplyCost], ['Energia', calculation.energy], ['Máquina / depreciação', calculation.machine], ['Desgaste / manutenção', maintenance], ['Risco / perda', calculation.risk], ['Embalagem', packaging], ['Frete', shipping], ['Outros custos', otherCosts], ['Taxas / impostos', calculation.fees]].map(([label, value]) => <div key={String(label)} className="flex justify-between border-b py-2 last:border-0"><span className="text-slate-500">{label}</span><b>{money(Number(value))}</b></div>)}</CardContent></Card>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2"><Button onClick={() => void saveProduct()} disabled={saving !== null} variant="outline" className="h-12 border-[#0068ff] text-[#0068ff] hover:bg-blue-50"><Save/> {saving === 'product' ? 'Salvando...' : 'Salvar em Produtos Salvos'}</Button><Button onClick={() => void saveQuote()} disabled={saving !== null} className="h-12 bg-[#ff6b35] text-white hover:bg-[#e85c2b]"><FileText/> {saving === 'quote' ? 'Salvando...' : 'Salvar Orçamento'}</Button></div>
  </div>;
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) { return <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader><CardTitle className="flex items-center gap-2"><Icon className="size-4 text-[#ff6b35]"/>{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-xs font-medium text-slate-600">{label}<div className="mt-1">{children}</div></label>; }
function NumberInput({ value, onChange, min = 0 }: { value: number; onChange: (value: number) => void; min?: number }) { return <Input type="number" min={min} step=".01" value={value} onChange={event => onChange(numeric(event.target.value))}/>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-[11px] text-white/70">{label}</p><p className="text-lg font-bold text-white">{value}</p></div>; }
