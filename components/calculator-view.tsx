'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Boxes, Calculator, FileText, Plus, Save, Trash2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

export type CalculatorQuote = { id: string; client: string; item: string; date: string; total: string; status: string; quantity: number; unitPrice: number };

type SavedConfig = {
  id?: string; productName: string; quantity: number; colors: string; description: string; observations: string; extras: string;
  materialName: string; materialCostKg: number; materialGrams: number; supplyCost: number; selectedSupplies?: SelectedSupply[]; productionHours: number; printerPowerWatts?: number;
  energyKwh?: number; energyRate: number; machineRate: number; maintenance: number; riskPercent: number; packaging: number;
  shipping: number; otherCosts: number; feesPercent: number; marginPercent: number; unitCost: number; unitPrice: number;
};
type Supply = { id: string; name: string; type: string; quantity: number; unit: string; unitCost: number };
type SelectedSupply = { id: string; name: string; quantity: number; unit: string; unitCost: number };

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const numeric = (value: string) => Math.max(0, Number(value) || 0);
const CALCULATOR_DRAFT_KEY = 'imprimo3dlab:calculator-draft:v1';
const savedNumber = (value: unknown, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export function CalculatorView({ onQuoteSaved }: { onQuoteSaved: (quote: CalculatorQuote) => void }) {
  const [productName, setProductName] = useState(''); const [quantity, setQuantity] = useState(1); const [colors, setColors] = useState('');
  const [description, setDescription] = useState(''); const [observations, setObservations] = useState(''); const [extras, setExtras] = useState('');
  const [materialName, setMaterialName] = useState('PLA'); const [materialCostKg, setMaterialCostKg] = useState(95); const [materialGrams, setMaterialGrams] = useState(180);
  const [supplies, setSupplies] = useState<Supply[]>([]); const [selectedSupplies, setSelectedSupplies] = useState<SelectedSupply[]>([]); const [supplyChoice, setSupplyChoice] = useState(''); const [supplyQuantity, setSupplyQuantity] = useState(1);
  const [productionHours, setProductionHours] = useState(9); const [productionMinutes, setProductionMinutes] = useState(30); const [printerPowerWatts, setPrinterPowerWatts] = useState(1000); const [energyRate, setEnergyRate] = useState(.86);
  const [machineRate, setMachineRate] = useState(3.4); const [maintenance, setMaintenance] = useState(0.1); const [riskPercent, setRiskPercent] = useState(5);
  const [packaging, setPackaging] = useState(8); const [shipping, setShipping] = useState(0); const [otherCosts, setOtherCosts] = useState(0); const [feesPercent, setFeesPercent] = useState(8); const [marginPercent, setMarginPercent] = useState(35);
  const [saved, setSaved] = useState<SavedConfig[]>([]); const [selected, setSelected] = useState(''); const [notice, setNotice] = useState(''); const [saving, setSaving] = useState<'product' | 'quote' | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewUnitPrice, setReviewUnitPrice] = useState(0);
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => { void Promise.all([fetch('/api/calculator'), fetch('/api/supplies')]).then(async ([configsResponse, suppliesResponse]) => { if (configsResponse.ok) setSaved(await configsResponse.json() as SavedConfig[]); if (suppliesResponse.ok) setSupplies(await suppliesResponse.json() as Supply[]); }).catch(() => undefined); }, []);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CALCULATOR_DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<SavedConfig> & { productionMinutes?: number };
        setProductName(draft.productName ?? ''); setQuantity(savedNumber(draft.quantity, 1)); setColors(draft.colors ?? ''); setDescription(draft.description ?? ''); setObservations(draft.observations ?? ''); setExtras(draft.extras ?? '');
        setMaterialName(draft.materialName ?? 'PLA'); setMaterialCostKg(savedNumber(draft.materialCostKg, 95)); setMaterialGrams(savedNumber(draft.materialGrams, 180)); setSelectedSupplies(draft.selectedSupplies ?? []);
        setProductionHours(savedNumber(draft.productionHours, 9)); setProductionMinutes(savedNumber(draft.productionMinutes, 30)); setPrinterPowerWatts(savedNumber(draft.printerPowerWatts, 1000)); setEnergyRate(savedNumber(draft.energyRate, .86));
        setMachineRate(savedNumber(draft.machineRate, 3.4)); setMaintenance(savedNumber(draft.maintenance, .1)); setRiskPercent(savedNumber(draft.riskPercent, 5)); setPackaging(savedNumber(draft.packaging, 8)); setShipping(savedNumber(draft.shipping, 0)); setOtherCosts(savedNumber(draft.otherCosts, 0)); setFeesPercent(savedNumber(draft.feesPercent, 8)); setMarginPercent(savedNumber(draft.marginPercent, 35));
      }
    } catch { /* Mantém os valores padrão quando o rascunho do navegador não puder ser lido. */ }
    setDraftLoaded(true);
  }, []);
  useEffect(() => {
    if (!draftLoaded) return;
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(CALCULATOR_DRAFT_KEY, JSON.stringify({ productName, quantity, colors, description, observations, extras, materialName, materialCostKg, materialGrams, selectedSupplies, productionHours, productionMinutes, printerPowerWatts, energyRate, machineRate, maintenance, riskPercent, packaging, shipping, otherCosts, feesPercent, marginPercent }));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draftLoaded, productName, quantity, colors, description, observations, extras, materialName, materialCostKg, materialGrams, selectedSupplies, productionHours, productionMinutes, printerPowerWatts, energyRate, machineRate, maintenance, riskPercent, packaging, shipping, otherCosts, feesPercent, marginPercent]);

  const supplyCost = selectedSupplies.reduce((total, item) => total + item.quantity * item.unitCost, 0);
  const productionTimeHours = productionHours + productionMinutes / 60;
  const addSupply = () => { const supply = supplies.find(item => item.id === supplyChoice); if (!supply) return; setSelectedSupplies(current => { const existing = current.find(item => item.id === supply.id); return existing ? current.map(item => item.id === supply.id ? { ...item, quantity: item.quantity + supplyQuantity } : item) : [...current, { id: supply.id, name: supply.name, quantity: supplyQuantity, unit: supply.unit, unitCost: supply.unitCost }]; }); setSupplyChoice(''); setSupplyQuantity(1); };

  const calculation = useMemo(() => {
    const material = materialGrams / 1000 * materialCostKg;
    const energy = productionTimeHours * (printerPowerWatts / 1000) * energyRate;
    const machine = productionTimeHours * machineRate;
    const wear = productionTimeHours * maintenance;
    const base = material + supplyCost + energy + machine + wear + packaging + shipping + otherCosts;
    const risk = base * riskPercent / 100;
    const totalCost = base + risk;
    const fees = totalCost * feesPercent / 100;
    const totalSale = marginPercent >= 100 ? 0 : (totalCost + fees) / (1 - marginPercent / 100);
    const unitCost = quantity > 0 ? totalCost / quantity : 0;
    const unitPrice = quantity > 0 ? totalSale / quantity : 0;
    const profit = totalSale - totalCost;
    const markup = unitCost > 0 ? (unitPrice / unitCost - 1) * 100 : 0;
    return { material, energy, machine, wear, risk, fees, unitCost, unitPrice, totalCost, totalSale, profit, markup };
  }, [materialGrams, materialCostKg, productionTimeHours, printerPowerWatts, energyRate, machineRate, supplyCost, maintenance, packaging, shipping, otherCosts, riskPercent, feesPercent, marginPercent, quantity]);

  const config = (confirmedUnitPrice = calculation.unitPrice): SavedConfig => ({ productName, quantity, colors, description, observations, extras, materialName, materialCostKg, materialGrams, supplyCost, selectedSupplies, productionHours: productionTimeHours, printerPowerWatts, energyRate, machineRate, maintenance, riskPercent, packaging, shipping, otherCosts, feesPercent, marginPercent, unitCost: calculation.unitCost, unitPrice: confirmedUnitPrice });
  const loadConfig = (id: string) => {
    setSelected(id); const item = saved.find(entry => entry.id === id); if (!item) return;
    const loadedTime = item.productionHours || 0; setProductName(item.productName); setQuantity(item.quantity); setColors(item.colors); setDescription(item.description); setObservations(item.observations); setExtras(item.extras); setMaterialName(item.materialName); setMaterialCostKg(item.materialCostKg); setMaterialGrams(item.materialGrams); setSelectedSupplies(item.selectedSupplies ?? []); setProductionHours(Math.floor(loadedTime)); setProductionMinutes(Math.round((loadedTime % 1) * 60)); setPrinterPowerWatts(item.printerPowerWatts ?? 1000); setEnergyRate(item.energyRate); setMachineRate(item.machineRate); setMaintenance(item.maintenance); setRiskPercent(item.riskPercent); setPackaging(item.packaging); setShipping(item.shipping); setOtherCosts(item.otherCosts); setFeesPercent(item.feesPercent); setMarginPercent(item.marginPercent);
    setNotice(`${item.productName} carregado para um novo cálculo.`);
  };
  const saveProduct = async () => {
    if (!productName.trim()) { setNotice('Informe o nome do produto antes de salvar.'); return false; } setSaving('product');
    try { const response = await fetch('/api/calculator', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(config(reviewUnitPrice)) }); const item = await response.json() as SavedConfig & { error?: string }; if (!response.ok) throw new Error(item.error || 'Não foi possível salvar'); setSaved(current => [item, ...current]); setSelected(item.id || ''); setNotice('Produto salvo em Produtos Salvos e disponível para reutilização.'); return true; } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível salvar o produto.'); return false; } finally { setSaving(null); }
  };
  const saveQuote = async () => {
    if (!productName.trim()) return setNotice('Informe o nome do produto antes de salvar.'); setSaving('quote');
    const id = `ORC-${String(Date.now()).slice(-6)}`; const payload = { id, client: 'Cliente não informado', item: productName, grams: materialGrams, hours: productionTimeHours, energyRate, machineRate, packaging, fees: feesPercent, margin: marginPercent, quantity, unitPrice: calculation.unitPrice, materialCost: calculation.material, energyCost: calculation.energy, machineCost: calculation.machine, total: calculation.totalSale, details: config() };
    try { const response = await fetch('/api/quotes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); const result = await response.json() as { error?: string }; if (!response.ok) throw new Error(result.error || 'Não foi possível salvar'); const quote = { id, client: 'Cliente não informado', item: productName, date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date()), total: money(calculation.totalSale), status: 'Rascunho', quantity, unitPrice: calculation.unitPrice }; onQuoteSaved(quote); setNotice('Orçamento salvo com todos os valores do cálculo.'); } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível salvar o orçamento.'); } finally { setSaving(null); }
  };
  const distribution = [{ label: 'Material', value: calculation.material, color: 'bg-blue-500' }, { label: 'Insumos', value: supplyCost, color: 'bg-violet-500' }, { label: 'Energia', value: calculation.energy, color: 'bg-amber-500' }, { label: 'Máquina', value: calculation.machine, color: 'bg-orange-500' }, { label: 'Demais custos', value: calculation.wear + packaging + shipping + otherCosts + calculation.risk, color: 'bg-slate-500' }];

  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-bold">Calculadora de precificação</h2><p className="text-sm text-slate-500">Calcule custos, margem, lucro e salve produtos para reutilizar.</p></div><div className="min-w-64"><label className="text-xs font-medium text-slate-600">Carregar produto salvo<select value={selected} onChange={event => loadConfig(event.target.value)} className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0068ff]/30"><option value="">Selecione um produto...</option>{saved.map(item => <option key={item.id} value={item.id}>{item.productName}</option>)}</select></label></div></div>
    {notice && <output className="block rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">{notice}</output>}

    <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <div className="space-y-5">
        <Section title="Identificação do produto" icon={Boxes}><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome do produto / projeto *"><Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Ex.: Luminária personalizada"/></Field><Field label="Quantidade"><NumberInput value={quantity} onChange={value => setQuantity(Math.max(1, value))} min={1}/></Field><Field label="Cor(es)"><Input value={colors} onChange={e => setColors(e.target.value)} placeholder="Ex.: Azul e laranja"/></Field><Field label="Opcionais / extras"><Input value={extras} onChange={e => setExtras(e.target.value)} placeholder="Ex.: Base, pintura ou embalagem especial"/></Field><Field label="Descrição / detalhes"><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhes do produto..."/></Field><Field label="Observações"><Textarea value={observations} onChange={e => setObservations(e.target.value)} placeholder="Prazo, acabamento, tolerâncias..."/></Field></div></Section>
        <Section title="Material e produção" icon={Calculator}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Material utilizado"><Input value={materialName} onChange={e => setMaterialName(e.target.value)} placeholder="PLA, PETG, resina..."/></Field><Field label="Custo do material (R$/kg)"><NumberInput value={materialCostKg} onChange={setMaterialCostKg}/></Field><Field label="Peso total utilizado (g)"><NumberInput value={materialGrams} onChange={setMaterialGrams}/></Field><div className="sm:col-span-2 lg:col-span-3"><Field label="Insumos adicionais do estoque"><div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]"><select value={supplyChoice} onChange={event => setSupplyChoice(event.target.value)} className="h-9 rounded-md border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#0068ff]/30"><option value="">Selecione um insumo salvo...</option>{supplies.map(item => <option key={item.id} value={item.id}>{item.name} · {money(item.unitCost)}/{item.unit}</option>)}</select><NumberInput value={supplyQuantity} onChange={value => setSupplyQuantity(Math.max(.01, value))} min={.01}/><Button type="button" onClick={addSupply} disabled={!supplyChoice} className="bg-[var(--brand-blue)] text-white hover:bg-[#0056d6]"><Plus/> Adicionar</Button></div></Field>{selectedSupplies.length > 0 && <div className="mt-3 space-y-2">{selectedSupplies.map(item => <div key={item.id} className="flex items-center justify-between rounded-lg border bg-slate-50 px-3 py-2 text-xs"><span><b>{item.name}</b> · {item.quantity} {item.unit} × {money(item.unitCost)}</span><div className="flex items-center gap-2"><b>{money(item.quantity * item.unitCost)}</b><Button type="button" onClick={() => setSelectedSupplies(current => current.filter(selected => selected.id !== item.id))} variant="ghost" size="icon" aria-label={`Remover ${item.name}`} className="size-7 text-slate-400 hover:text-red-600"><Trash2/></Button></div></div>)}<p className="text-right text-xs font-semibold text-slate-600">Total de insumos: {money(supplyCost)}</p></div>}</div><div className="text-xs font-medium text-slate-600"><p>Tempo total de produção</p><div className="mt-1 grid grid-cols-2 gap-2"><div className="relative"><Input aria-label="Horas" type="number" min="0" step="1" value={productionHours} onChange={event => setProductionHours(Math.max(0, Math.floor(Number(event.target.value) || 0)))} className="pr-8 text-sm text-slate-900"/><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase text-slate-400">h</span></div><div className="relative"><Input aria-label="Minutos" type="number" min="0" max="59" step="1" value={productionMinutes} onChange={event => setProductionMinutes(Math.min(59, Math.max(0, Math.floor(Number(event.target.value) || 0))))} className="pr-10 text-sm text-slate-900"/><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase text-slate-400">min</span></div></div></div><Field label="Potência da impressora (W)"><NumberInput value={printerPowerWatts} onChange={setPrinterPowerWatts}/></Field><Field label="Custo da energia (R$/kWh)"><NumberInput value={energyRate} onChange={setEnergyRate}/></Field><Field label="Máquina / depreciação (R$/h)"><NumberInput value={machineRate} onChange={setMachineRate}/></Field><Field label="Desgaste Bico/Mesa (R$/h):"><NumberInput value={maintenance} onChange={setMaintenance}/></Field></div></Section>
        <Section title="Custos adicionais e preço" icon={TrendingUp}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Risco / perda (%)"><NumberInput value={riskPercent} onChange={setRiskPercent}/></Field><Field label="Embalagem (R$)"><NumberInput value={packaging} onChange={setPackaging}/></Field><Field label="Frete (R$)"><NumberInput value={shipping} onChange={setShipping}/></Field><Field label="Outros custos (R$)"><NumberInput value={otherCosts} onChange={setOtherCosts}/></Field><Field label="Taxas / impostos (%)"><NumberInput value={feesPercent} onChange={setFeesPercent}/></Field><Field label="Margem desejada (%)"><NumberInput value={marginPercent} onChange={value => setMarginPercent(Math.min(99, value))}/></Field></div></Section>
      </div>

      <div className="space-y-5">
        <Card className="border-0 bg-[var(--brand-blue)] text-white shadow-sm ring-0"><CardHeader><CardTitle className="text-white">Resultado da precificação</CardTitle></CardHeader><CardContent className="space-y-4"><Metric label={`Custo total (${quantity} un.)`} value={money(calculation.totalCost)}/><div className="rounded-xl bg-[#ff6b35] p-4"><p className="text-xs text-white">Preço de venda sugerido</p><p className="mt-1 text-3xl font-bold text-white">{money(calculation.totalSale)}</p><p className="mt-1 text-[11px] text-white">{money(calculation.unitPrice)} por unidade</p></div><div className="grid grid-cols-2 gap-3"><Metric label="Markup" value={`${calculation.markup.toFixed(1)}%`}/><Metric label="Margem" value={`${marginPercent.toFixed(1)}%`}/><Metric label="Lucro estimado" value={money(calculation.profit)}/><Metric label="Quantidade" value={String(quantity)}/></div></CardContent></Card>
        <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="size-4 text-[#0068ff]"/> Distribuição dos custos</CardTitle></CardHeader><CardContent className="space-y-3">{distribution.map(item => { const percent = calculation.totalCost > 0 ? item.value / calculation.totalCost * 100 : 0; return <div key={item.label}><div className="mb-1 flex justify-between text-xs"><span>{item.label}</span><b>{money(item.value)} · {percent.toFixed(0)}%</b></div><Progress value={percent} className={item.color}/></div>; })}</CardContent></Card>
        <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader><CardTitle>Análise detalhada</CardTitle></CardHeader><CardContent className="space-y-2 text-xs">{[['Material utilizado', calculation.material], ['Insumos adicionais', supplyCost], ['Energia', calculation.energy], ['Máquina / depreciação', calculation.machine], ['Desgaste Bico/Mesa', calculation.wear], ['Risco / perda', calculation.risk], ['Embalagem', packaging], ['Frete', shipping], ['Outros custos', otherCosts], ['Taxas / impostos', calculation.fees]].map(([label, value]) => <div key={String(label)} className="flex justify-between border-b py-2 last:border-0"><span className="text-slate-500">{label}</span><b>{money(Number(value))}</b></div>)}</CardContent></Card>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2"><Button onClick={() => { setReviewUnitPrice(calculation.unitPrice); setReviewOpen(true); }} disabled={saving !== null} variant="outline" className="h-12 border-[#0068ff] text-[#0068ff] hover:bg-blue-50"><Save/> Salvar em Produtos Salvos</Button><Button onClick={() => void saveQuote()} disabled={saving !== null} className="h-12 bg-[#ff6b35] text-white hover:bg-[#e85c2b]"><FileText/> {saving === 'quote' ? 'Salvando...' : 'Salvar Orçamento'}</Button></div>
    <Dialog open={reviewOpen} onOpenChange={setReviewOpen}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Revisar produto salvo</DialogTitle><DialogDescription>Edite as informações principais e confirme o salvamento em Produtos Salvos.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome do produto / projeto *"><Input value={productName} onChange={event => setProductName(event.target.value)}/></Field><Field label="Quantidade"><NumberInput value={quantity} onChange={value => setQuantity(Math.max(1, value))} min={1}/></Field><Field label="Cor(es)"><Input value={colors} onChange={event => setColors(event.target.value)}/></Field><Field label="Opcionais / extras"><Input value={extras} onChange={event => setExtras(event.target.value)}/></Field><Field label="Descrição / detalhes"><Textarea value={description} onChange={event => setDescription(event.target.value)}/></Field><Field label="Observações"><Textarea value={observations} onChange={event => setObservations(event.target.value)}/></Field></div><div className="rounded-xl bg-slate-50 p-4 text-xs"><div className="grid gap-3 sm:grid-cols-2"><SummaryLine label="Material total" value={`${materialName} · ${materialGrams} g`}/><SummaryLine label="Tempo total de produção" value={`${productionHours}h ${productionMinutes}min`}/><SummaryLine label="Insumos selecionados" value={selectedSupplies.length ? selectedSupplies.map(item => `${item.name} (${item.quantity} ${item.unit})`).join(', ') : 'Nenhum'}/><SummaryLine label="Custo unitário" value={money(calculation.unitCost)}/><Field label="Preço por unidade"><NumberInput value={reviewUnitPrice} onChange={setReviewUnitPrice}/></Field><SummaryLine label="Preço total" value={money(reviewUnitPrice * quantity)}/></div></div><DialogFooter><Button variant="outline" onClick={() => setReviewOpen(false)}>Voltar</Button><Button disabled={saving !== null || !productName.trim() || reviewUnitPrice <= 0} onClick={() => void saveProduct().then(ok => { if (ok) setReviewOpen(false); })} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]"><Save/> {saving === 'product' ? 'Salvando...' : 'Confirmar salvamento'}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) { return <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader><CardTitle className="flex items-center gap-2"><Icon className="size-4 text-[#ff6b35]"/>{title}</CardTitle></CardHeader><CardContent>{children}</CardContent></Card>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-xs font-medium text-slate-600">{label}<div className="mt-1">{children}</div></label>; }
function NumberInput({ value, onChange, min = 0 }: { value: number; onChange: (value: number) => void; min?: number }) { return <Input type="number" min={min} step=".01" value={value} onChange={event => onChange(numeric(event.target.value))}/>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-[11px] text-white/70">{label}</p><p className="text-lg font-bold text-white">{value}</p></div>; }
function SummaryLine({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-medium text-slate-700">{value}</p></div>; }
