'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Boxes, Calculator, CheckCircle2, CircleDollarSign, Clock3,
  FileText, HandCoins, LayoutDashboard, Menu, PackageOpen, Pencil, Plus, Search,
  Handshake, MessageCircle, Minus, Printer, RotateCcw, Settings, ShoppingBag, ShoppingCart, Trash2, TrendingUp, UserCog, UserPlus, Users, WalletCards, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CalculatorView, type CalculatorQuote, type CalculatorQuoteSupply } from '@/components/calculator-view';
import { FinanceView } from '@/components/finance-view';
import { defaultPricingDefaults, type PricingDefaults } from '@/lib/pricing-defaults';

type View = 'Visão geral' | 'Calculadora' | 'Orçamentos' | 'Pedidos' | 'Consignados' | 'Estoque' | 'Clientes' | 'Financeiro' | 'Configurações';
type Quote = { id: string; client: string; item: string; date: string; total: string; status: string; quantity?: number; unitPrice?: number; grams?: number; hours?: number; timeHours?: number; timeMinutes?: number; energyRate?: number; machineRate?: number; packaging?: number; fees?: number; margin?: number; notes?: string; supplies?: CalculatorQuoteSupply[] };

const nav: [React.ElementType, View][] = [
  [LayoutDashboard, 'Visão geral'], [Calculator, 'Calculadora'], [FileText, 'Orçamentos'], [ShoppingBag, 'Pedidos'],
  [Handshake, 'Consignados'], [Boxes, 'Estoque'], [Users, 'Clientes'],
  [CircleDollarSign, 'Financeiro'], [Settings, 'Configurações'],
];
const brl = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const parseBrl = (value: string) => Number(value.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
const seedQuotes: Quote[] = [
  { id: 'ORC-1052', client: 'Ateliê Norte', item: 'Luminária Voronoi', date: '29 ago', total: 'R$ 428,00', status: 'Pendente' },
  { id: 'ORC-1051', client: 'Lumina Arquitetura', item: 'Maquete residencial', date: '28 ago', total: 'R$ 1.480,00', status: 'Aprovado' },
  { id: 'ORC-1050', client: 'Clínica Orto+', item: 'Modelo anatômico', date: '27 ago', total: 'R$ 720,00', status: 'Enviado' },
];

export function SystemApp({ user, signOutPath }: { user: { name: string; email: string }; signOutPath: string }) {
  const [view, setView] = useState<View>('Visão geral');
  const [menu, setMenu] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [quoteEditor, setQuoteEditor] = useState<Quote | null>(null);
  const [quotes, setQuotes] = useState(seedQuotes);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    void fetch('/api/quotes').then(async response => {
      if (!response.ok) throw new Error('Não foi possível carregar os orçamentos.');
      return await response.json() as Array<Omit<Quote, 'total'> & { total: number }>;
    }).then(stored => {
      if (stored.length) setQuotes(stored.map(quote => ({ ...quote, total: brl(Number(quote.total)), quantity: quote.quantity ?? 1, unitPrice: quote.unitPrice ?? Number(quote.total) })));
    }).catch(() => { /* Mantém a prévia local quando o banco não estiver disponível. */ });
  }, []);

  const selectView = (next: View) => { setView(next); setMenu(false); };
  const saveQuote = async (quote: Quote, payload: Record<string, unknown>) => {
    const editing = quotes.some(current => current.id === quote.id);
    setQuotes(current => editing ? current.map(item => item.id === quote.id ? quote : item) : [quote, ...current]);
    setQuoteOpen(false);
    setEditingQuote(null);
    setView('Orçamentos');
    setNotice(`${quote.id} ${editing ? 'atualizado' : 'salvo'} com sucesso.`);
    window.setTimeout(() => setNotice(''), 3500);
    try { await fetch('/api/quotes', { method: editing ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); } catch { /* UI remains useful offline */ }
  };
  const payQuote = async (quote: Quote, payload: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/quotes/pay', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Não foi possível registrar o pagamento.');
      const paidQuote = { ...quote, status: 'Pago' };
      setQuotes(current => current.some(item => item.id === paidQuote.id) ? current.map(item => item.id === paidQuote.id ? paidQuote : item) : [paidQuote, ...current]);
      setQuoteOpen(false);
      setEditingQuote(null);
      setNotice(`${paidQuote.id} pago. Receita e custo registrados no Financeiro.`);
      window.setTimeout(() => setNotice(''), 4500);
      return true;
    } catch (problem) {
      setNotice(problem instanceof Error ? problem.message : 'Não foi possível registrar o pagamento.');
      window.setTimeout(() => setNotice(''), 4500);
      return false;
    }
  };
  const deleteQuote = async (quote: Quote) => {
    setQuotes(current => current.filter(item => item.id !== quote.id));
    setNotice(`${quote.id} apagado.`);
    window.setTimeout(() => setNotice(''), 3500);
    try { await fetch(`/api/quotes?id=${encodeURIComponent(quote.id)}`, { method: 'DELETE' }); } catch { /* local list remains updated */ }
  };
  const convertQuoteToOrder = async (quote: Quote) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ quote: { id: quote.id, client: quote.client, item: quote.item, total: parseBrl(quote.total), quantity: quote.quantity ?? 1, unitPrice: quote.unitPrice ?? parseBrl(quote.total) / Math.max(1, quote.quantity ?? 1), grams: quote.grams, hours: quote.hours, energyRate: quote.energyRate, machineRate: quote.machineRate, packaging: quote.packaging, fees: quote.fees, margin: quote.margin } }),
      });
      const result = await response.json() as { id?: string; error?: string; alreadyExists?: boolean };
      if (!response.ok) throw new Error(result.error || 'Não foi possível enviar o orçamento para Pedidos.');
      setView('Pedidos');
      setNotice(result.alreadyExists ? `${quote.id} já estava em Pedidos.` : `${quote.id} enviado para Pedidos com sucesso.`);
      window.setTimeout(() => setNotice(''), 4000);
    } catch (problem) {
      setNotice(problem instanceof Error ? problem.message : 'Não foi possível enviar o orçamento para Pedidos.');
      window.setTimeout(() => setNotice(''), 4500);
    }
  };
  const saveCalculatorQuote = (quote: CalculatorQuote) => { setQuotes(current => [quote, ...current]); setView('Orçamentos'); setNotice(`${quote.id} salvo em Orçamentos com peso, tempo e insumos.`); window.setTimeout(() => setNotice(''), 3500); };

  return <div className="min-h-screen bg-[#f4f7fb] text-[#172033]">
    <Sidebar view={view} menu={menu} onClose={() => setMenu(false)} onSelect={selectView} user={user} signOutPath={signOutPath} />
    {menu && <button aria-label="Fechar menu" className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setMenu(false)} />}
    <main className="lg:pl-[238px]">
      <header className="sticky top-0 z-20 flex h-14 items-center border-b border-[#e4e9f1] bg-white/95 px-4 backdrop-blur lg:hidden">
        <button aria-label="Abrir menu" onClick={() => setMenu(true)}><Menu /></button>
        <span className="ml-3 text-sm font-bold">Imprimo3DLab</span>
        <Button onClick={() => setQuoteOpen(true)} size="icon" aria-label="Novo orçamento" className="ml-auto bg-[#ff6b35] text-white hover:bg-[#e85c2b]"><Plus /></Button>
      </header>
      <div className="mx-auto max-w-[1500px] p-4 sm:p-7">
        {view === 'Visão geral' ? <Dashboard onNavigate={selectView} userName={user.name} /> : <Module view={view} quotes={quotes} onNewQuote={() => { setEditingQuote(null); setQuoteOpen(true); }} onEditQuote={quote => { setEditingQuote(quote); setQuoteOpen(true); }} onDeleteQuote={deleteQuote} onConvertQuote={convertQuoteToOrder} onCalculatorQuoteSaved={saveCalculatorQuote} onNavigate={selectView} user={user} />}
      </div>
    </main>
    <QuoteDialog open={quoteOpen} onOpenChange={open => { setQuoteOpen(open); if (!open) setEditingQuote(null); }} onSave={saveQuote} onPay={payQuote} onPrint={quote => { setQuoteOpen(false); setEditingQuote(null); setQuoteEditor(quote); }} initialQuote={editingQuote} sequence={1053 + quotes.length - seedQuotes.length} />
    {quoteEditor && <QuoteEditor quote={quoteEditor} onClose={() => setQuoteEditor(null)}/>}
    {notice && <output className="fixed bottom-5 right-5 z-[70] rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-xl">{notice}</output>}
  </div>;
}

function Sidebar({ view, menu, onClose, onSelect, user, signOutPath }: { view: View; menu: boolean; onClose: () => void; onSelect: (v: View) => void; user: { name: string; email: string }; signOutPath: string }) {
  return <aside className={`fixed inset-y-0 left-0 z-40 flex w-[238px] flex-col bg-[var(--brand-blue)] text-white transition-transform lg:translate-x-0 ${menu ? 'translate-x-0' : '-translate-x-full'}`}>
    <div className="relative flex h-[76px] items-center justify-center border-b border-white/20 px-5"><img src="/imprimo3dlab-wordmark-white.png" alt="Imprimo3DLab" className="h-auto max-h-11 w-[190px] object-contain"/><button className="absolute right-2 top-2 rounded-md bg-black/10 p-1 lg:hidden" aria-label="Fechar menu" onClick={onClose}><X className="size-4" /></button></div>
    <nav className="flex-1 space-y-1 px-3 py-5"><p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-white">Operação</p>{nav.map(([Icon, label]) => <button key={label} onClick={() => onSelect(label)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${view === label ? 'bg-white font-semibold text-[var(--brand-blue)]' : 'text-white hover:bg-white/15'}`}><Icon className={`size-[18px] ${view === label ? 'text-[#ff8358]' : ''}`} />{label}</button>)}</nav>
    <div className="m-3 rounded-xl border border-white/20 bg-black/10 p-3.5"><div className="flex items-center gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-white/20 text-xs font-bold">{initials(user.name)}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{user.name}</p><p className="text-[11px] text-white">Administrador</p></div></div><a href={signOutPath} target="_top" className="mt-3 block border-t border-white/20 pt-2 text-center text-[11px] font-medium text-white transition hover:bg-white/10">Sair do sistema</a></div>
  </aside>;
}

function Dashboard({ onNavigate, userName }: { onNavigate: (v: View) => void; userName: string }) {
  const [transactions, setTransactions] = useState<Array<{ type: 'Receita' | 'Despesa'; amount: number; dueDate: string }>>([]);
  useEffect(() => {
    void fetch('/api/transactions').then(async response => {
      if (!response.ok) throw new Error('Não foi possível carregar o resumo financeiro.');
      return await response.json() as Array<{ type: 'Receita' | 'Despesa'; amount: number; dueDate: string }>;
    }).then(setTransactions).catch(() => setTransactions([]));
  }, []);
  const finance = useMemo(() => {
    const now = new Date(); now.setHours(23, 59, 59, 999);
    const lastThirtyDays = new Date(now); lastThirtyDays.setDate(lastThirtyDays.getDate() - 29); lastThirtyDays.setHours(0, 0, 0, 0);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - (weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1)); weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6); weekEnd.setHours(23, 59, 59, 999);
    const inRange = (transaction: { dueDate: string }, start: Date) => { const date = new Date(`${transaction.dueDate}T12:00:00`); return date >= start && date <= now; };
    const recent = transactions.filter(transaction => inRange(transaction, lastThirtyDays));
    const revenue = recent.filter(transaction => transaction.type === 'Receita').reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = recent.filter(transaction => transaction.type === 'Despesa').reduce((sum, transaction) => sum + transaction.amount, 0);
    const annualRevenue = transactions.filter(transaction => transaction.type === 'Receita' && inRange(transaction, yearStart)).reduce((sum, transaction) => sum + transaction.amount, 0);
    const weeklyRevenue = transactions.filter(transaction => { const date = new Date(`${transaction.dueDate}T12:00:00`); return transaction.type === 'Receita' && date >= weekStart && date <= weekEnd; }).reduce((sum, transaction) => sum + transaction.amount, 0);
    const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
    const netProfit = revenue - expenses;
    return { revenue, weeklyRevenue, weekLabel: `${shortDate.format(weekStart)} a ${shortDate.format(weekEnd)}`, annualRevenue, netProfit, margin: revenue > 0 ? netProfit / revenue * 100 : 0 };
  }, [transactions]);
  const metrics: Array<[React.ElementType, string, string, string, string]> = [
    [HandCoins, 'Faturamento total', brl(finance.revenue), 'Últimos 30 dias · Financeiro', 'green'],
    [CircleDollarSign, 'Faturamento semanal', brl(finance.weeklyRevenue), `${finance.weekLabel} · Segunda a domingo`, 'blue'],
    [WalletCards, 'Faturamento total anual', brl(finance.annualRevenue), `Ano de ${new Date().getFullYear()}`, 'orange'],
    [TrendingUp, 'Lucro líquido', brl(finance.netProfit), `${finance.margin.toFixed(1)}% de margem · últimos 30 dias`, 'violet'],
  ];
  return <>
    <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><p className="text-sm text-slate-500">Olá, {firstName(userName)}.</p><h2 className="text-2xl font-bold tracking-[-.025em]">Sua produção está no ritmo certo.</h2></div><span className="text-xs text-slate-500">● Atualizado agora</span></div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([Icon, label, value, detail, color]) => <Card key={label} className="gap-3 border-0 bg-white py-4 shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader className="flex flex-row items-center justify-between px-4"><CardTitle className="text-xs text-slate-500">{label}</CardTitle><div className={`metric-icon metric-${color}`}><Icon className="size-4" /></div></CardHeader><CardContent className="px-4"><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-[11px] text-slate-500">{detail}</p></CardContent></Card>)}</section>
    <div className="mt-5">
      <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader className="flex flex-row items-center justify-between border-b"><div><CardTitle>Pedidos recentes</CardTitle><p className="text-xs text-slate-500">Prazos e andamento da operação</p></div><Button variant="ghost" onClick={() => onNavigate('Pedidos')} className="text-[#e65d2c]">Ver todos</Button></CardHeader><CardContent className="overflow-x-auto px-0"><DataTable headers={['Pedido / cliente', 'Trabalho', 'Prazo', 'Valor', 'Status']} rows={[
        ['#1048 · Lumina Arquitetura', 'Maquete residencial', 'Hoje, 16:00', 'R$ 1.480,00', 'Em produção'], ['#1047 · Studio Objeto', 'Kit 12 expositores', 'Amanhã', 'R$ 864,00', 'Aguardando'], ['#1046 · Rafael Martins', 'Engrenagem técnica', '30 ago', 'R$ 295,00', 'Acabamento'], ['#1045 · Clínica Orto+', 'Modelo anatômico', '02 set', 'R$ 720,00', 'Aprovado'],
      ]} /></CardContent></Card>
    </div>
    <section className="mt-5 grid gap-4 sm:grid-cols-3"><AlertBox icon={PackageOpen} title="2 itens com estoque baixo" detail="PLA Branco e Resina Cinza" tone="orange"/><AlertBox icon={Clock3} title="18h de produção agendada" detail="Capacidade livre amanhã: 11h" tone="blue"/><AlertBox icon={WalletCards} title="R$ 2.350 a receber" detail="5 lançamentos em aberto" tone="green"/></section>
  </>;
}

function Module({ view, quotes, onNewQuote, onEditQuote, onDeleteQuote, onConvertQuote, onCalculatorQuoteSaved, onNavigate, user }: { view: Exclude<View, 'Visão geral'>; quotes: Quote[]; onNewQuote: () => void; onEditQuote: (quote: Quote) => void; onDeleteQuote: (quote: Quote) => void; onConvertQuote: (quote: Quote) => void; onCalculatorQuoteSaved: (quote: CalculatorQuote) => void; onNavigate: (view: View) => void; user: { name: string; email: string } }) {
  if (view === 'Calculadora') return <CalculatorView onQuoteSaved={onCalculatorQuoteSaved}/>;
  if (view === 'Orçamentos') return <QuotesView quotes={quotes} onNewQuote={onNewQuote} onEdit={onEditQuote} onDelete={onDeleteQuote} onConvert={onConvertQuote}/>;
  if (view === 'Pedidos') return <OrdersView />;
  if (view === 'Consignados') return <ConsignmentsView />;
  if (view === 'Estoque') return <FinishedParts onNavigate={onNavigate} />;
  if (view === 'Clientes') return <CustomersView />;
  if (view === 'Financeiro') return <FinanceView />;
  if (view === 'Configurações') return <SettingsView user={user} />;
  return null;
}

type ConsignmentItem = { inventoryItemId: string; name: string; quantity: number; passedValue: number };
type Consignment = { id: string; establishment: string; items: string; itemDetails: ConsignmentItem[]; deliveryDate: string; visitDate: string; paid: number | boolean };
type InventoryPart = { id: string; sku: string; name: string; stock: number; price: number };

const emptyConsignmentForm = () => ({ id: '', establishment: '', itemDetails: [] as ConsignmentItem[], deliveryDate: new Date().toISOString().slice(0, 10), visitDate: '' });

function ConsignmentsView() {
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [inventory, setInventory] = useState<InventoryPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payingId, setPayingId] = useState('');
  const [returningItemId, setReturningItemId] = useState('');
  const [expandedConsignment, setExpandedConsignment] = useState('');
  const [actionError, setActionError] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyConsignmentForm);
  const [itemId, setItemId] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [passedValue, setPassedValue] = useState(0);

  const loadInventory = () => fetch('/api/inventory').then(response => response.ok ? response.json() as Promise<InventoryPart[]> : Promise.reject()).then(setInventory);
  useEffect(() => { void Promise.all([
    fetch('/api/consignments').then(response => response.ok ? response.json() as Promise<Consignment[]> : Promise.reject()).then(setConsignments),
    loadInventory(),
  ]).catch(() => { setConsignments([]); setInventory([]); }).finally(() => setLoading(false)); }, []);

  const availableStock = (partId: string) => (inventory.find(part => part.id === partId)?.stock ?? 0) + (form.id ? consignments.find(consignment => consignment.id === form.id)?.itemDetails.find(item => item.inventoryItemId === partId)?.quantity ?? 0 : 0);
  const chooseItem = (nextId: string) => {
    setItemId(nextId);
    const part = inventory.find(item => item.id === nextId);
    setPassedValue(part?.price ?? 0);
    setItemQuantity(1);
  };
  const addItem = () => {
    const part = inventory.find(item => item.id === itemId);
    if (!part || itemQuantity <= 0 || passedValue < 0) return setError('Selecione um produto e informe quantidade e valor repassado válidos.');
    if (itemQuantity > availableStock(part.id)) return setError(`Há somente ${availableStock(part.id)} un. disponíveis de ${part.name}.`);
    setForm(current => ({ ...current, itemDetails: [...current.itemDetails.filter(item => item.inventoryItemId !== part.id), { inventoryItemId: part.id, name: part.name, quantity: itemQuantity, passedValue }] }));
    setItemId(''); setItemQuantity(1); setPassedValue(0); setError('');
  };
  const openNew = () => { setForm(emptyConsignmentForm()); setItemId(''); setItemQuantity(1); setPassedValue(0); setError(''); setOpen(true); };
  const openEdit = (consignment: Consignment) => { setForm({ id: consignment.id, establishment: consignment.establishment, itemDetails: consignment.itemDetails, deliveryDate: consignment.deliveryDate, visitDate: consignment.visitDate }); setItemId(''); setItemQuantity(1); setPassedValue(0); setError(''); setOpen(true); };

  const saveConsignment = async () => {
    if (!form.establishment.trim() || form.itemDetails.length === 0 || !form.deliveryDate || !form.visitDate) {
      setError('Preencha o estabelecimento, adicione ao menos um item e informe as duas datas.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const wasPaid = Boolean(form.id && consignments.find(item => item.id === form.id)?.paid);
      const response = await fetch('/api/consignments', { method: form.id ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      const result = await response.json() as Consignment & { error?: string };
      if (!response.ok) throw new Error(result.error || 'Não foi possível salvar o consignado.');
      if (wasPaid) {
        const paymentResponse = await fetch('/api/consignments/pay', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: result.id }) });
        const paymentResult = await paymentResponse.json() as { error?: string };
        if (!paymentResponse.ok) throw new Error(paymentResult.error || 'O consignado foi salvo, mas não foi possível atualizar os lançamentos financeiros.');
      }
      const savedResult = { ...result, paid: wasPaid };
      setConsignments(current => form.id ? current.map(item => item.id === savedResult.id ? savedResult : item) : [savedResult, ...current]);
      await loadInventory();
      setForm(emptyConsignmentForm());
      setOpen(false);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Não foi possível salvar o consignado.');
    } finally {
      setSaving(false);
    }
  };

  const togglePayment = async (consignment: Consignment) => {
    const reversing = Boolean(consignment.paid);
    setPayingId(consignment.id);
    setActionError('');
    try {
      const response = await fetch(reversing ? `/api/consignments/pay?id=${encodeURIComponent(consignment.id)}` : '/api/consignments/pay', reversing ? { method: 'DELETE' } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: consignment.id }) });
      const result = await response.json() as { error?: string; paid?: boolean };
      if (!response.ok) throw new Error(result.error || 'Não foi possível atualizar o pagamento.');
      setConsignments(current => current.map(item => item.id === consignment.id ? { ...item, paid: Boolean(result.paid) } : item));
    } catch (problem) {
      setActionError(problem instanceof Error ? problem.message : 'Não foi possível atualizar o pagamento.');
    } finally {
      setPayingId('');
    }
  };

  const returnToInventory = async (item: ConsignmentItem) => {
    if (!form.id) {
      setForm(current => ({ ...current, itemDetails: current.itemDetails.filter(currentItem => currentItem.inventoryItemId !== item.inventoryItemId) }));
      return;
    }
    if (!window.confirm(`Devolver ${item.quantity} un. de ${item.name} ao estoque?`)) return;
    setReturningItemId(item.inventoryItemId);
    setError('');
    try {
      const response = await fetch(`/api/consignments?id=${encodeURIComponent(form.id)}&inventoryItemId=${encodeURIComponent(item.inventoryItemId)}`, { method: 'DELETE' });
      const result = await response.json() as { error?: string; deleted?: boolean; consignment?: Consignment };
      if (!response.ok) throw new Error(result.error || 'Não foi possível devolver o produto ao estoque.');
      if (result.deleted) {
        setConsignments(current => current.filter(consignment => consignment.id !== form.id));
        setOpen(false);
        setForm(emptyConsignmentForm());
      } else if (result.consignment) {
        setConsignments(current => current.map(consignment => consignment.id === result.consignment!.id ? result.consignment! : consignment));
        setForm(current => ({ ...current, itemDetails: result.consignment!.itemDetails }));
      }
      await loadInventory();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Não foi possível devolver o produto ao estoque.');
    } finally {
      setReturningItemId('');
    }
  };

  const formatDate = (value: string) => {
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
  };

  return <>
    <ModuleShell title="Consignados" detail="Acompanhe os produtos disponibilizados em estabelecimentos parceiros" action="Novo consignado" onAction={openNew}>
      {actionError && <p className="border-b bg-red-50 px-4 py-2 text-sm text-red-700">{actionError}</p>}
      {loading ? <div className="p-8 text-center text-sm text-slate-500">Carregando consignados...</div> : consignments.length === 0 ? <div className="grid min-h-56 place-items-center p-8 text-center"><div><div className="mx-auto grid size-12 place-items-center rounded-2xl bg-blue-50 text-[var(--brand-blue)]"><Handshake className="size-6"/></div><p className="mt-4 font-semibold">Nenhum consignado cadastrado</p><p className="mt-1 text-sm text-slate-500">Adicione o primeiro estabelecimento e escolha os itens do estoque.</p></div></div> : <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left"><thead><tr className="border-b bg-slate-50 text-[10px] uppercase tracking-[.08em] text-slate-400">{['Estabelecimento', 'Itens', 'Valor repassado', 'Data da entrega', 'Visita para reposição', 'Ações'].map(header => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}</tr></thead><tbody>{consignments.map(consignment => <Fragment key={consignment.id}><tr className="border-b last:border-0 hover:bg-slate-50/60"><td className="px-4 py-4 text-sm font-semibold">{consignment.establishment}</td><td className="px-4 py-4"><button type="button" onClick={() => setExpandedConsignment(current => current === consignment.id ? '' : consignment.id)} className="text-xs font-medium text-[#0068ff] hover:underline">{expandedConsignment === consignment.id ? 'Ocultar itens' : 'Ver itens'}</button></td><td className="px-4 py-4 text-sm font-semibold text-slate-700">{brl(consignment.itemDetails.reduce((sum, item) => sum + item.quantity * item.passedValue, 0))}</td><td className="px-4 py-4 text-sm text-slate-600">{formatDate(consignment.deliveryDate)}</td><td className="px-4 py-4 text-sm text-slate-600">{formatDate(consignment.visitDate)}</td><td className="px-4 py-3"><div className="flex items-center gap-1"><Button onClick={() => void togglePayment(consignment)} disabled={payingId === consignment.id} variant="ghost" size="icon" aria-label={consignment.paid ? `Desfazer pagamento do consignado de ${consignment.establishment}` : `Marcar consignado de ${consignment.establishment} como pago`} title={consignment.paid ? 'Desfazer pagamento e remover os lançamentos' : 'Marcar como pago'} className={consignment.paid ? 'bg-emerald-100 text-emerald-700 hover:bg-amber-100 hover:text-amber-700' : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'}><CheckCircle2/></Button><Button onClick={() => openEdit(consignment)} variant="ghost" size="icon" aria-label={`Editar consignado de ${consignment.establishment}`} className="text-[#0068ff] hover:bg-blue-50"><Pencil/></Button></div></td></tr>{expandedConsignment === consignment.id && <tr className="border-b bg-blue-50/50"><td colSpan={6} className="px-4 py-3"><div className="overflow-hidden rounded-lg border border-blue-100 bg-white"><div className="grid grid-cols-[1fr_80px_150px_120px] gap-3 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400"><span>Produto</span><span>Qtd.</span><span>Valor repassado/un.</span><span>Subtotal</span></div>{consignment.itemDetails.map(item => <div key={item.inventoryItemId} className="grid grid-cols-[1fr_80px_150px_120px] gap-3 border-t px-3 py-2 text-xs text-slate-700"><span className="font-medium">{item.name}</span><span>{item.quantity}</span><span>{brl(item.passedValue)}</span><span className="font-semibold">{brl(item.quantity * item.passedValue)}</span></div>)}</div></td></tr>}</Fragment>)}</tbody></table></div>}
    </ModuleShell>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Handshake className="size-5 text-[#ff6b35]"/> {form.id ? 'Editar consignado' : 'Novo consignado'}</DialogTitle><DialogDescription>Escolha os produtos do estoque, defina o valor repassado e programe as visitas.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-2">
          <Field label="Nome do estabelecimento *"><Input value={form.establishment} onChange={event => setForm(current => ({ ...current, establishment: event.target.value }))} placeholder="Ex.: Loja Parceira Centro"/></Field>
              <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_90px_140px_auto]">
                <label className="text-xs font-medium text-slate-600">
                  Produto *
                  <select aria-label="Produto do estoque" value={itemId} onChange={event => chooseItem(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"><option value="">Selecionar produto...</option>{inventory.map(part => <option key={part.id} value={part.id} disabled={availableStock(part.id) <= 0}>{part.sku} — {part.name} ({availableStock(part.id)} un.)</option>)}</select>
                </label>
                <Field label="Quantidade"><Input aria-label="Quantidade" type="number" min="1" step="1" value={itemQuantity} onChange={event => setItemQuantity(Math.max(1, Number(event.target.value)))}/></Field>
                <Field label="Valor repassado/un."><Input aria-label="Valor repassado por unidade" type="number" min="0" step=".01" value={passedValue} onChange={event => setPassedValue(Math.max(0, Number(event.target.value)))}/></Field>
                <Button type="button" onClick={addItem} disabled={!itemId} className="bg-[var(--brand-blue)] text-white hover:bg-[#0055d4]"><Plus/> Adicionar</Button>
              </div>
          {form.itemDetails.length > 0 && <div className="space-y-2 rounded-xl border bg-slate-50 p-3">{form.itemDetails.map(item => <div key={item.inventoryItemId} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200"><div><p className="text-sm font-semibold">{item.name}</p><p className="text-xs text-slate-500">{item.quantity} un. · {brl(item.passedValue)} por unidade · Total {brl(item.quantity * item.passedValue)}</p></div><Button type="button" variant="outline" size="sm" disabled={returningItemId === item.inventoryItemId} aria-label={`Devolver ${item.name} ao estoque`} onClick={() => void returnToInventory(item)} className="shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"><RotateCcw/> {returningItemId === item.inventoryItemId ? 'Devolvendo...' : form.id ? 'Devolver ao estoque' : 'Remover'}</Button></div>)}</div>}
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Data da entrega *"><Input type="date" value={form.deliveryDate} onChange={event => setForm(current => ({ ...current, deliveryDate: event.target.value }))}/></Field><Field label="Data da visita para reposição *"><Input type="date" min={form.deliveryDate} value={form.visitDate} onChange={event => setForm(current => ({ ...current, visitDate: event.target.value }))}/></Field></div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={() => void saveConsignment()} disabled={saving} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]">{saving ? 'Salvando...' : form.id ? 'Salvar alterações' : 'Salvar consignado'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

function OrdersView() {
  const [orders, setOrders] = useState<Array<{ id: string; customer: string; packageName: string; items: string; itemDetails: Array<{ name: string; quantity: number; unitCost: number; unitPrice: number; subtotal: number }>; quantity: number; total: number; cost: number; status: string; paid: number | boolean; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState('');
  const [savingId, setSavingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [payingId, setPayingId] = useState('');
  const [error, setError] = useState('');
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  useEffect(() => { void fetch('/api/orders').then(response => response.ok ? response.json() : Promise.reject()).then(result => setOrders(result as typeof orders)).catch(() => setOrders([])).finally(() => setLoading(false)); }, []);
  const orderMonth = (date: string) => { const [, month, year] = date.split('/'); return year && month ? `${year}-${month}` : currentMonth; };
  const monthLabel = (key: string) => { const [year, month] = key.split('-').map(Number); const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1)); return label.charAt(0).toUpperCase() + label.slice(1); };
  const availableMonths = Array.from(new Set([currentMonth, ...orders.map(order => orderMonth(order.createdAt))])).sort((a, b) => b.localeCompare(a));
  const activeStatuses = ['Aguardando fila', 'Em andamento'];
  const visibleOrders = orders.filter(order => orderMonth(order.createdAt) === selectedMonth || (selectedMonth === currentMonth && orderMonth(order.createdAt) < currentMonth && activeStatuses.includes(order.status)));
  const carriedOrders = visibleOrders.filter(order => orderMonth(order.createdAt) !== selectedMonth).length;
  const statusClass = (status: string) => status === 'Finalizado' ? 'bg-emerald-100 text-emerald-800 ring-emerald-200' : status === 'Cancelado' ? 'bg-red-100 text-red-700 ring-red-200' : status === 'Aguardando fila' ? 'bg-blue-100 text-blue-700 ring-blue-200' : 'bg-amber-100 text-amber-800 ring-amber-200';
  const updateStatus = async (orderId: string, status: string) => {
    const previous = orders.find(order => order.id === orderId)?.status ?? 'Aguardando fila';
    setOrders(current => current.map(order => order.id === orderId ? { ...order, status } : order));
    setSavingId(orderId);
    setError('');
    try {
      const response = await fetch('/api/orders', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: orderId, status }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Não foi possível atualizar o status.');
    } catch (problem) {
      setOrders(current => current.map(order => order.id === orderId ? { ...order, status: previous } : order));
      setError(problem instanceof Error ? problem.message : 'Não foi possível atualizar o status.');
    } finally {
      setSavingId('');
    }
  };
  const deleteOrder = async (orderId: string) => {
    if (!window.confirm('Apagar este pedido? Os lançamentos financeiros ligados a ele também serão removidos.')) return;
    setDeletingId(orderId);
    setError('');
    try {
      const response = await fetch(`/api/orders?id=${encodeURIComponent(orderId)}`, { method: 'DELETE' });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Não foi possível apagar o pedido.');
      setOrders(current => current.filter(order => order.id !== orderId));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Não foi possível apagar o pedido.');
    } finally {
      setDeletingId('');
    }
  };
  const togglePayment = async (order: (typeof orders)[number]) => {
    const reversing = Boolean(order.paid);
    const confirmed = window.confirm(reversing ? 'Desfazer o pagamento deste pedido? A receita e a despesa serão removidas do Financeiro.' : `Confirmar o pagamento de ${brl(order.total)}? A receita e o custo de ${brl(order.cost)} serão registrados no Financeiro.`);
    if (!confirmed) return;
    setPayingId(order.id);
    setError('');
    try {
      const response = await fetch(reversing ? `/api/orders/pay?id=${encodeURIComponent(order.id)}` : '/api/orders/pay', reversing ? { method: 'DELETE' } : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: order.id }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || (reversing ? 'Não foi possível desfazer o pagamento.' : 'Não foi possível registrar o pagamento.'));
      setOrders(current => current.map(item => item.id === order.id ? { ...item, paid: !reversing } : item));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : reversing ? 'Não foi possível desfazer o pagamento.' : 'Não foi possível registrar o pagamento.');
    } finally { setPayingId(''); }
  };
  return <ModuleShell compact title={`${visibleOrders.length} pedidos em ${monthLabel(selectedMonth)}`} detail="Pedidos ativos continuam no mês seguinte até serem concluídos" action="Novo pedido">
    <div className="flex flex-col gap-2 border-b px-4 py-2 sm:flex-row sm:items-center sm:justify-between"><div><label htmlFor="orders-month" className="text-xs font-semibold text-slate-600">Visualizar mês</label>{carriedOrders > 0 && <p className="text-[11px] text-blue-600">Inclui {carriedOrders} {carriedOrders === 1 ? 'pedido ativo de mês anterior' : 'pedidos ativos de meses anteriores'}.</p>}</div><select id="orders-month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} className="h-8 rounded-lg border bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-[#0068ff]/30">{availableMonths.map(month => <option key={month} value={month}>{monthLabel(month)}</option>)}</select></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[1040px] text-left"><thead><tr className="border-b bg-slate-50 text-[10px] uppercase tracking-[.08em] text-slate-400">{['Pedido','Cliente','Pacote / itens','Criado em','Valor','Custo','Status','Ações'].map(header => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}</tr></thead><tbody>{visibleOrders.map(order => <Fragment key={order.id}><tr className="border-b hover:bg-slate-50/60"><td className="px-4 py-3 text-xs font-semibold">{order.id}</td><td className="px-4 py-3 text-xs text-slate-600">{order.customer}</td><td className="px-4 py-3"><b className="block text-xs text-slate-800">{order.packageName}</b><button type="button" onClick={() => setExpandedOrder(current => current === order.id ? '' : order.id)} className="mt-1 text-[11px] font-medium text-[#0068ff] hover:underline">{expandedOrder === order.id ? 'Ocultar itens' : `Ver ${order.itemDetails?.length || order.quantity} itens`}</button></td><td className="px-4 py-3 text-xs text-slate-600">{order.createdAt}</td><td className="px-4 py-3 text-xs font-semibold text-slate-700">{brl(order.total)}</td><td className="px-4 py-3 text-xs text-red-600">{brl(order.cost)}</td><td className="px-4 py-2"><select aria-label={`Status do pedido ${order.id}`} value={order.status} disabled={savingId === order.id} onChange={event => void updateStatus(order.id, event.target.value)} className={`h-8 cursor-pointer rounded-full border-0 px-3 text-xs font-semibold outline-none ring-1 transition focus:ring-2 focus:ring-[#0068ff] disabled:cursor-wait disabled:opacity-60 ${statusClass(order.status)}`}><option value="Aguardando fila">Aguardando fila</option><option value="Em andamento">Em andamento</option><option value="Finalizado">Finalizado</option><option value="Cancelado">Cancelado</option></select></td><td className="px-4 py-2"><div className="flex items-center gap-1"><Button onClick={() => void togglePayment(order)} disabled={payingId === order.id || (!order.paid && order.status === 'Cancelado')} variant="ghost" size="icon" aria-label={order.paid ? `Desfazer pagamento do pedido ${order.id}` : `Marcar pedido ${order.id} como pago`} title={order.paid ? 'Desfazer pagamento e remover os lançamentos' : order.status === 'Cancelado' ? 'Pedido cancelado' : 'Marcar como pago'} className={order.paid ? 'bg-emerald-100 text-emerald-700 hover:bg-amber-100 hover:text-amber-700' : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'}><CheckCircle2/></Button><Button onClick={() => void deleteOrder(order.id)} disabled={deletingId === order.id} variant="ghost" size="icon" aria-label={`Apagar pedido ${order.id}`} title="Apagar pedido" className="text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2/></Button></div></td></tr>{expandedOrder === order.id && <tr className="border-b bg-blue-50/50"><td colSpan={8} className="px-4 py-3"><div className="overflow-hidden rounded-lg border border-blue-100 bg-white"><div className="grid grid-cols-[1fr_70px_105px_105px_105px] gap-3 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400"><span>Item do pacote</span><span>Qtd.</span><span>Custo unit.</span><span>Valor unit.</span><span>Subtotal</span></div>{(order.itemDetails ?? []).map((item, index) => <div key={`${item.name}-${index}`} className="grid grid-cols-[1fr_70px_105px_105px_105px] gap-3 border-t px-3 py-2 text-xs text-slate-700"><span className="font-medium">{item.name}</span><span>{item.quantity}</span><span className="text-red-600">{brl(Number(item.unitCost))}</span><span>{brl(Number(item.unitPrice))}</span><span className="font-semibold">{brl(Number(item.subtotal))}</span></div>)}</div></td></tr>}</Fragment>)}</tbody></table></div>
    {loading && <p className="p-6 text-center text-sm text-slate-400">Carregando pedidos...</p>}{!loading && !visibleOrders.length && <p className="p-6 text-center text-sm text-slate-400">Nenhum pedido neste mês.</p>}{error && <p role="alert" className="border-t bg-red-50 px-4 py-3 text-xs font-medium text-red-700">{error}</p>}
  </ModuleShell>;
}

function CustomersView() {
  const [customers, setCustomers] = useState<Array<Customer & { orders: number; lastOrder: string; total: number }>>([]);
  const [orders, setOrders] = useState<Array<{ id: string; customerId: string | null; customer: string; packageName: string; items: string; quantity: number; total: number; status: string; createdAt: string }>>([]);
  const [selectedOrders, setSelectedOrders] = useState<Record<string, string>>({});
  const [editingPackage, setEditingPackage] = useState<(typeof orders)[number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    void Promise.all([fetch('/api/customers'), fetch('/api/orders')]).then(async ([customerResponse, orderResponse]) => {
      if (!customerResponse.ok || !orderResponse.ok) throw new Error('Não foi possível carregar clientes e pedidos');
      setCustomers(await customerResponse.json() as typeof customers);
      setOrders(await orderResponse.json() as typeof orders);
    }).catch(() => { setCustomers([]); setOrders([]); setError('Não foi possível carregar clientes e pedidos.'); }).finally(() => setLoading(false));
  }, []);
  const statusClass = (status: string) => status === 'Finalizado' ? 'bg-emerald-100 text-emerald-800 ring-emerald-200' : status === 'Cancelado' ? 'bg-red-100 text-red-700 ring-red-200' : status === 'Aguardando fila' ? 'bg-blue-100 text-blue-700 ring-blue-200' : 'bg-amber-100 text-amber-800 ring-amber-200';
  const selectedOrderFor = (customerId: string) => {
    const selectedId = selectedOrders[customerId] || orders.find(order => order.customerId === customerId)?.id || '';
    return orders.find(order => order.id === selectedId);
  };
  const linkOrder = async (customer: Customer, orderId: string) => {
    if (!orderId) return;
    const previousOrders = orders;
    setSaving(`${customer.id}:link`);
    setError('');
    setOrders(current => current.map(order => order.id === orderId ? { ...order, customerId: customer.id, customer: customer.name } : order));
    setSelectedOrders(current => {
      const next = { ...current, [customer.id]: orderId };
      Object.keys(next).forEach(id => { if (id !== customer.id && next[id] === orderId) delete next[id]; });
      return next;
    });
    try {
      const response = await fetch('/api/orders', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: orderId, customerId: customer.id }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Não foi possível vincular o pedido.');
    } catch (problem) {
      setOrders(previousOrders);
      setError(problem instanceof Error ? problem.message : 'Não foi possível vincular o pedido.');
    } finally { setSaving(''); }
  };
  const updateOrderStatus = async (orderId: string, status: string) => {
    const previous = orders.find(order => order.id === orderId)?.status ?? 'Aguardando fila';
    setSaving(`${orderId}:status`);
    setError('');
    setOrders(current => current.map(order => order.id === orderId ? { ...order, status } : order));
    try {
      const response = await fetch('/api/orders', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: orderId, status }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Não foi possível atualizar a situação.');
    } catch (problem) {
      setOrders(current => current.map(order => order.id === orderId ? { ...order, status: previous } : order));
      setError(problem instanceof Error ? problem.message : 'Não foi possível atualizar a situação.');
    } finally { setSaving(''); }
  };
  const updatePackage = async (orderId: string, packageName: string, createdAt: string) => {
    const previous = orders.find(order => order.id === orderId);
    if (!previous) return;
    const [, month, day] = createdAt.split('-');
    const displayDate = `${day}/${month}/${createdAt.slice(0, 4)}`;
    setSaving(`${orderId}:package`);
    setError('');
    setOrders(current => current.map(order => order.id === orderId ? { ...order, packageName, createdAt: displayDate } : order));
    try {
      const response = await fetch('/api/orders', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: orderId, packageName, createdAt }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'Não foi possível atualizar o pacote.');
      setEditingPackage(null);
    } catch (problem) {
      setOrders(current => current.map(order => order.id === orderId ? previous : order));
      setError(problem instanceof Error ? problem.message : 'Não foi possível atualizar o pacote.');
    } finally { setSaving(''); }
  };
  return <><ModuleShell title={`${customers.length} clientes cadastrados`} detail="Clientes e pedidos vinculados" action="Novo cliente"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead><tr className="border-b bg-slate-50 text-[10px] uppercase tracking-[.08em] text-slate-400">{['Cliente','Pacote / grupo','Data','Valor (R$)','Situação'].map(header => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}</tr></thead><tbody>{customers.map(customer => {
    const selectedOrder = selectedOrderFor(customer.id);
    return <tr key={customer.id} className="border-b last:border-0 hover:bg-slate-50/60"><td className="px-4 py-3 text-sm font-semibold">{customer.name}</td><td className="px-4 py-2"><div className="flex items-center gap-1"><select aria-label={`Pacote vinculado a ${customer.name}`} value={selectedOrder?.id ?? ''} disabled={saving === `${customer.id}:link`} onChange={event => void linkOrder(customer, event.target.value)} className="h-9 w-full min-w-64 rounded-lg border bg-white px-3 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-[#0068ff]/30"><option value="">Selecionar pacote...</option>{orders.map(order => <option key={order.id} value={order.id}>{order.packageName} — {order.createdAt}</option>)}</select>{selectedOrder && <Button type="button" variant="ghost" size="icon" onClick={() => setEditingPackage(selectedOrder)} aria-label={`Editar nome e data do pacote ${selectedOrder.packageName}`} title="Editar nome e data do pacote" className="shrink-0 text-[#0068ff]"><Pencil/></Button>}</div></td><td className="px-4 py-3 text-xs text-slate-600">{selectedOrder?.createdAt ?? 'Sem pedido'}</td><td className="px-4 py-3 text-xs font-semibold text-slate-700">{selectedOrder ? brl(selectedOrder.total) : brl(0)}</td><td className="px-4 py-2">{selectedOrder ? <select aria-label={`Situação do pedido ${selectedOrder.id}`} value={selectedOrder.status} disabled={saving === `${selectedOrder.id}:status`} onChange={event => void updateOrderStatus(selectedOrder.id, event.target.value)} className={`h-8 cursor-pointer rounded-full border-0 px-3 text-xs font-semibold outline-none ring-1 transition focus:ring-2 focus:ring-[#0068ff] disabled:cursor-wait disabled:opacity-60 ${statusClass(selectedOrder.status)}`}><option value="Aguardando fila">Aguardando fila</option><option value="Em andamento">Em andamento</option><option value="Finalizado">Finalizado</option><option value="Cancelado">Cancelado</option></select> : <span className="text-xs text-slate-400">Sem situação</span>}</td></tr>;
  })}</tbody></table></div>{loading && <p className="p-6 text-center text-sm text-slate-400">Carregando clientes...</p>}{!loading && !customers.length && <p className="p-6 text-center text-sm text-slate-400">Nenhum cliente cadastrado.</p>}{error && <p role="alert" className="border-t bg-red-50 px-4 py-3 text-xs font-medium text-red-700">{error}</p>}</ModuleShell><OrderPackageDialog key={editingPackage?.id ?? 'closed-package'} order={editingPackage} saving={editingPackage ? saving === `${editingPackage.id}:package` : false} onOpenChange={open => { if (!open) setEditingPackage(null); }} onSave={updatePackage}/></>;
}

function OrderPackageDialog({ order, saving, onOpenChange, onSave }: { order: { id: string; packageName: string; createdAt: string } | null; saving: boolean; onOpenChange: (open: boolean) => void; onSave: (orderId: string, packageName: string, createdAt: string) => void | Promise<void> }) {
  const [packageName, setPackageName] = useState(order?.packageName ?? '');
  const [createdAt, setCreatedAt] = useState(() => { const [day, month, year] = (order?.createdAt ?? '').split('/'); return year && month && day ? `${year}-${month}-${day}` : ''; });
  return <Dialog open={Boolean(order)} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Editar pacote do pedido</DialogTitle><DialogDescription>Organize o grupo pelo nome e pela data em que ele foi inserido.</DialogDescription></DialogHeader><div className="space-y-4"><Field label="Nome do pacote *"><Input value={packageName} onChange={event => setPackageName(event.target.value)} placeholder="Ex.: Vendas do dia"/></Field><Field label="Data do pacote *"><Input type="date" value={createdAt} onChange={event => setCreatedAt(event.target.value)}/></Field><div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">Será exibido como <b>{packageName.trim() || 'Nome do pacote'} — {createdAt ? createdAt.split('-').reverse().join('/') : 'data'}</b>.</div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={!order || !packageName.trim() || !createdAt || saving} onClick={() => { if (order) void onSave(order.id, packageName.trim(), createdAt); }} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]">{saving ? 'Salvando...' : 'Salvar pacote'}</Button></DialogFooter></DialogContent></Dialog>;
}

type FinishedPart = { id: string; sku: string; name: string; detail: string; stock: number; color: string; cost: number; price: number };
type CartSupply = { supplyId: string; name: string; quantity: number; unit: string; unitCost: number };
type CartItem = { partId: string; quantity: number; unitPrice: number; supplies?: CartSupply[] };
type Customer = { id: string; name: string; phone: string; email: string };
type Supply = { id: string; name: string; type: string; quantity: number; unit: string; unitCost: number; supplier: string };
type SupplySaveInput = Supply & { restockQuantity?: number };

function FinishedParts({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [inventorySection, setInventorySection] = useState<'parts' | 'supplies'>('parts');
  const [parts, setParts] = useState<FinishedPart[]>([]);
  const [loadingParts, setLoadingParts] = useState(true);
  const [dataNotice, setDataNotice] = useState('');
  const [query, setQuery] = useState('');
  const [pieceOpen, setPieceOpen] = useState(false);
  const [editing, setEditing] = useState<FinishedPart | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [quoteEditorOpen, setQuoteEditorOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [packageName, setPackageName] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [assignedCustomer, setAssignedCustomer] = useState<Customer | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const loadParts = async () => {
    try {
      const response = await fetch('/api/inventory');
      if (!response.ok) throw new Error('Não foi possível carregar o estoque');
      setParts(await response.json() as FinishedPart[]);
      setDataNotice('');
    } catch { setDataNotice('Não foi possível acessar o banco de dados. Tente novamente.'); }
    finally { setLoadingParts(false); }
  };
  useEffect(() => { void loadParts(); }, []);
  const filteredParts = parts.filter(part => `${part.sku} ${part.name} ${part.detail} ${part.color}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  const stockUnits = parts.reduce((total, part) => total + part.stock, 0);
  const stockValue = parts.reduce((total, part) => total + part.stock * part.price, 0);
  const stockCost = parts.reduce((total, part) => total + part.stock * part.cost, 0);
  const openNew = () => { setEditing(null); setPieceOpen(true); };
  const openEdit = (part: FinishedPart) => { setEditing(part); setPieceOpen(true); };
  const savePart = async (part: FinishedPart) => {
    try {
      const response = await fetch('/api/inventory', { method: editing ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(part) });
      const result = await response.json() as FinishedPart & { error?: string };
      if (!response.ok) throw new Error(result.error || 'Não foi possível salvar a peça');
      setParts(current => editing ? current.map(item => item.id === result.id ? result : item) : [result, ...current]);
      setPieceOpen(false);
      setDataNotice('Peça salva permanentemente no banco de dados.');
    } catch (error) { setDataNotice(error instanceof Error ? error.message : 'Não foi possível salvar a peça.'); }
  };
  const deletePart = async (part: FinishedPart) => {
    try {
      const response = await fetch(`/api/inventory?id=${encodeURIComponent(part.id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Não foi possível excluir a peça');
      setParts(current => current.filter(item => item.id !== part.id));
      setCart(current => current.filter(item => item.partId !== part.id));
      setDataNotice('Peça removida do estoque.');
    } catch (error) { setDataNotice(error instanceof Error ? error.message : 'Não foi possível excluir a peça.'); }
  };
  const addToCart = (part: FinishedPart) => {
    setCart(current => {
      const existing = current.find(item => item.partId === part.id);
      if (existing) return current.map(item => item.partId === part.id ? { ...item, quantity: Math.min(part.stock, item.quantity + 1) } : item);
      return [...current, { partId: part.id, quantity: 1, unitPrice: part.price }];
    });
    setCartOpen(true);
  };
  const finalizeSale = async (customerOverride?: Customer, navigateToOrders = false) => {
    setFinalizing(true);
    try {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ customerId: customerOverride?.id ?? assignedCustomer?.id ?? null, packageName, items: cart }) });
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'Não foi possível finalizar o pedido');
      setCart([]);
      setAssignedCustomer(null);
      setPackageName('');
      setCartOpen(false);
      setCustomerOpen(false);
      setDataNotice(`${result.id} salvo. Estoque, pedido e financeiro atualizados.`);
      if (navigateToOrders) onNavigate('Pedidos');
      else await loadParts();
    } catch (error) {
      setDataNotice(error instanceof Error ? error.message : 'Não foi possível finalizar o pedido.');
      throw error;
    }
    finally { setFinalizing(false); }
  };
  const openPackageNaming = () => { setCartOpen(false); setPackageOpen(true); };
  const confirmPackageName = (name: string) => { setPackageName(name); setPackageOpen(false); setCustomerOpen(true); };
  const openQuoteEditor = () => { setCartOpen(false); setQuoteEditorOpen(true); };
  const assignCustomer = async (customer: Customer) => {
    setAssignedCustomer(customer);
    await finalizeSale(customer, true);
  };
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  if (inventorySection === 'supplies') return <SuppliesView onSelectParts={() => setInventorySection('parts')} />;

  return <div className="space-y-5">
    {dataNotice && <output className={`block rounded-xl px-4 py-3 text-sm ${dataNotice.includes('não') || dataNotice.includes('Não') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{dataNotice}</output>}
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><h2 className="text-2xl font-bold">Produtos Salvos</h2><p className="text-sm text-slate-500">Controle os produtos impressos e prontos para venda.</p></div>
      <div className="flex gap-2"><Button onClick={() => setCartOpen(true)} variant="outline" className="relative"><ShoppingCart/> Carrinho{cartCount > 0 && <Badge className="ml-1 bg-[var(--brand-blue)] text-white">{cartCount}</Badge>}</Button><Button onClick={openNew} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]"><Plus/> Nova peça</Button></div>
    </div>

    <div className="flex items-center rounded-xl bg-[var(--brand-blue)] p-1 text-sm text-white shadow-sm">
      <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 font-semibold text-[var(--brand-blue)]"><PackageOpen className="size-4 text-[#ff8358]"/> Produtos Salvos</button>
      <button onClick={() => setInventorySection('supplies')} className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-slate-100 transition hover:bg-white/10"><Boxes className="size-4"/> Insumos</button>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StockMetric icon={Boxes} label="Modelos" value={String(parts.length)} tone="orange" />
      <StockMetric icon={PackageOpen} label="Unidades em estoque" value={String(stockUnits)} tone="blue" />
      <StockMetric icon={CircleDollarSign} label="Valor em estoque" value={brl(stockValue)} tone="green" />
      <StockMetric icon={TrendingUp} label="Custo total" value={brl(stockCost)} tone="violet" />
    </div>

    <div className="flex items-center gap-2 rounded-xl border border-[#dfe5ee] bg-white px-4 shadow-sm"><Search className="size-4 text-slate-400"/><input value={query} onChange={event => setQuery(event.target.value)} className="h-12 w-full bg-transparent text-sm outline-none" placeholder="Buscar por nome ou modelo..." /></div>

    <Card className="overflow-hidden border-0 bg-white py-0 shadow-sm ring-1 ring-[#e6eaf0]">
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left">
        <thead><tr className="border-b bg-[#f8fafc] text-[10px] uppercase tracking-[.08em] text-slate-400">{['Peça / Modelo','Estoque','Cores','Custo','Preço de venda','Margem','Ações'].map(header => <th key={header} className="px-4 py-3 font-semibold">{header}</th>)}</tr></thead>
        <tbody>{filteredParts.map(part => {
          const margin = Math.round((1 - part.cost / part.price) * 100);
          return <tr key={part.id} className="border-b last:border-0 hover:bg-slate-50/70">
            <td className="px-4 py-4"><b className="text-sm">{part.sku} — {part.name}</b><p className="mt-0.5 text-[11px] italic text-slate-400">{part.detail}</p></td>
            <td className="px-4 py-4"><Badge variant="secondary" className="bg-slate-100 text-slate-700">{part.stock} un.</Badge></td>
            <td className="px-4 py-4"><Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">● {part.color}</Badge></td>
            <td className="px-4 py-4 text-xs text-slate-600">{brl(part.cost)}</td>
            <td className="px-4 py-4 text-sm font-bold text-[#e65d2c]">{brl(part.price)}</td>
            <td className="px-4 py-4 text-sm font-bold text-emerald-600">{margin}%</td>
            <td className="px-4 py-4"><div className="flex items-center gap-1"><Button onClick={() => addToCart(part)} disabled={part.stock === 0} variant="ghost" size="sm" className="text-[#e65d2c]"><ShoppingCart/> Vender</Button><Button onClick={() => openEdit(part)} aria-label={`Editar ${part.name}`} variant="ghost" size="icon"><Pencil/></Button><Button onClick={() => void deletePart(part)} aria-label={`Excluir ${part.name}`} variant="ghost" size="icon" className="text-slate-400 hover:text-red-600"><Trash2/></Button></div></td>
          </tr>;
        })}{loadingParts && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">Carregando peças salvas...</td></tr>}{!loadingParts && filteredParts.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">Nenhuma peça encontrada.</td></tr>}</tbody>
      </table></div>
    </Card>
    <PieceDialog key={editing?.id ?? 'new'} open={pieceOpen} onOpenChange={setPieceOpen} initial={editing} onSave={savePart}/>
    <SalesCartDialog open={cartOpen} onOpenChange={setCartOpen} parts={parts} cart={cart} onCartChange={setCart} onFinalize={() => { void finalizeSale().catch(() => undefined); }} onAddToCustomer={openPackageNaming} onPrint={openQuoteEditor} assignedCustomer={assignedCustomer} packageName={packageName} finalizing={finalizing}/>
    <PackageNameDialog open={packageOpen} onOpenChange={open => { setPackageOpen(open); if (!open) setCartOpen(true); }} initialName={packageName} itemCount={cartCount} total={cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)} onConfirm={confirmPackageName}/>
    <CustomerOrderDialog open={customerOpen} onOpenChange={open => { setCustomerOpen(open); if (!open) setCartOpen(true); }} onSelect={assignCustomer}/>
    {quoteEditorOpen && <QuoteEditor parts={parts} cart={cart} customer={assignedCustomer} onClose={() => setQuoteEditorOpen(false)}/>}
  </div>;
}

function SuppliesView({ onSelectParts }: { onSelectParts: () => void }) {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supply | null>(null);
  useEffect(() => {
    void fetch('/api/supplies').then(async response => {
      const result = await response.json() as Supply[] & { error?: string };
      if (!response.ok) throw new Error(result.error || 'Não foi possível carregar os insumos');
      setSupplies(result);
      setNotice('');
    }).catch(error => setNotice(error instanceof Error ? error.message : 'Não foi possível carregar os insumos.')).finally(() => setLoading(false));
  }, []);
  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (supply: Supply) => { setEditing(supply); setDialogOpen(true); };
  const saveSupply = async (supply: SupplySaveInput) => {
    try {
      const response = await fetch('/api/supplies', { method: editing ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(supply) });
      const result = await response.json() as Supply & { error?: string };
      if (!response.ok) throw new Error(result.error || 'Não foi possível salvar o insumo');
      setSupplies(current => (editing ? current.map(item => item.id === result.id ? result : item) : [result, ...current]).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      setDialogOpen(false);
      setNotice(supply.restockQuantity ? `Reposição registrada: +${supply.restockQuantity} ${result.unit} em ${result.name}.` : 'Insumo salvo permanentemente no banco de dados.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível salvar o insumo.'); }
  };
  const deleteSupply = async (supply: Supply) => {
    try {
      const response = await fetch(`/api/supplies?id=${encodeURIComponent(supply.id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Não foi possível excluir o insumo');
      setSupplies(current => current.filter(item => item.id !== supply.id));
      setNotice('Insumo removido do estoque.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível excluir o insumo.'); }
  };
  return <div className="space-y-5">
    {notice && <output className={`block rounded-xl px-4 py-3 text-sm ${notice.includes('não') || notice.includes('Não') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{notice}</output>}
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><h2 className="flex items-center gap-2 text-2xl font-bold"><Boxes className="size-6 text-[#ff6b35]"/> Insumos e Materiais Extras</h2><p className="text-sm text-slate-500">Argolas, chaveiros, tags NFC, embalagens e outros materiais usados nos brindes.</p></div>
      <Button onClick={openNew} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]"><Plus/> Novo insumo</Button>
    </div>
    <div className="flex items-center rounded-xl bg-[var(--brand-blue)] p-1 text-sm text-white shadow-sm">
      <button onClick={onSelectParts} className="flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium text-slate-100 transition hover:bg-white/10"><PackageOpen className="size-4"/> Produtos Salvos</button>
      <button className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 font-semibold text-[var(--brand-blue)]"><Boxes className="size-4 text-[#ff8358]"/> Insumos</button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{supplies.map(supply => <Card key={supply.id} className="gap-4 border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]">
      <CardHeader className="flex flex-row items-start gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-[#ff6b35]"><Boxes className="size-5"/></div><div className="min-w-0 flex-1"><Badge variant="outline" className="mb-2">{supply.type}</Badge><CardTitle className="truncate">{supply.name}</CardTitle></div><div className="flex"><Button onClick={() => openEdit(supply)} variant="ghost" size="icon" aria-label={`Editar ${supply.name}`}><Pencil/></Button><Button onClick={() => void deleteSupply(supply)} variant="ghost" size="icon" className="text-slate-400 hover:text-red-600" aria-label={`Excluir ${supply.name}`}><Trash2/></Button></div></CardHeader>
      <CardContent className="space-y-3 text-sm"><div className="flex justify-between border-t pt-3"><span className="text-slate-500">Em estoque</span><b>{supply.quantity} {supply.unit}</b></div><div className="flex justify-between"><span className="text-slate-500">Custo unitário</span><b>{brl(supply.unitCost)}/{supply.unit}</b></div><div className="flex justify-between"><span className="text-slate-500">Valor total em estoque</span><b className="text-[#e65d2c]">{brl(supply.quantity * supply.unitCost)}</b></div><p className="pt-1 text-xs text-slate-500">Fornecedor: <b className="text-slate-700">{supply.supplier || 'Não informado'}</b></p></CardContent>
    </Card>)}{loading && <p className="col-span-full py-10 text-center text-sm text-slate-400">Carregando insumos salvos...</p>}{!loading && supplies.length === 0 && <div className="col-span-full rounded-xl border border-dashed bg-white px-5 py-12 text-center text-sm text-slate-400">Nenhum insumo cadastrado.</div>}</div>
    <SupplyDialog key={editing?.id ?? 'new-supply'} open={dialogOpen} onOpenChange={setDialogOpen} initial={editing} onSave={saveSupply}/>
  </div>;
}

function SupplyDialog({ open, onOpenChange, initial, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; initial: Supply | null; onSave: (supply: SupplySaveInput) => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState(initial?.type ?? 'Outro');
  const [quantity, setQuantity] = useState(initial?.quantity ?? 0);
  const [unit, setUnit] = useState(initial?.unit ?? 'un');
  const [unitCost, setUnitCost] = useState(initial?.unitCost ?? 0);
  const [supplier, setSupplier] = useState(initial?.supplier ?? '');
  const [restocking, setRestocking] = useState(false);
  const [restockQuantity, setRestockQuantity] = useState(0);
  const submit = () => onSave({ id: initial?.id ?? '', name: name.trim(), type: type.trim() || 'Outro', quantity, unit: unit.trim() || 'un', unitCost, supplier: supplier.trim(), restockQuantity: restocking ? restockQuantity : undefined });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{initial ? 'Editar insumo' : 'Novo insumo'}</DialogTitle><DialogDescription>Cadastre materiais extras usados na montagem e entrega dos produtos.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome do insumo *"><Input value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Argola Italiana"/></Field><Field label="Tipo"><Input value={type} onChange={event => setType(event.target.value)} placeholder="Ex.: Embalagem, chaveiro ou outro"/></Field><Field label="Quantidade em estoque"><Input type="number" min="0" step=".01" value={quantity} onChange={event => setQuantity(Math.max(0, Number(event.target.value)))}/></Field><Field label="Unidade"><Input value={unit} onChange={event => setUnit(event.target.value)} placeholder="un, m, kg, ml..."/></Field><Field label="Custo unitário (R$)"><Input type="number" min="0" step=".01" value={unitCost} onChange={event => setUnitCost(Math.max(0, Number(event.target.value)))}/></Field><Field label="Fornecedor"><Input value={supplier} onChange={event => setSupplier(event.target.value)} placeholder="Ex.: Shopee"/></Field></div>{restocking && initial && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><Field label={`Quantidade para reposição (${unit || 'un'})`}><Input autoFocus type="number" min="0" step=".01" value={restockQuantity} onChange={event => setRestockQuantity(Math.max(0, Number(event.target.value)))}/></Field><div className="mt-2 flex justify-between text-xs text-emerald-800"><span>Estoque atual: <b>{initial.quantity} {unit}</b></span><span>Após salvar: <b>{initial.quantity + restockQuantity} {unit}</b></span></div></div>}<div className="rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800">Valor atual em estoque: <b>{brl((restocking && initial ? initial.quantity + restockQuantity : quantity) * unitCost)}</b></div><DialogFooter>{initial && <Button variant="outline" onClick={() => { setRestocking(current => !current); setRestockQuantity(0); }}>{restocking ? 'Cancelar reposição' : 'Reposição'}</Button>}<Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit} disabled={!name.trim() || (restocking && restockQuantity <= 0)} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]">{restocking ? 'Salvar reposição' : initial ? 'Salvar alterações' : 'Adicionar insumo'}</Button></DialogFooter></DialogContent></Dialog>;
}

function PackageNameDialog({ open, onOpenChange, initialName, itemCount, total, onConfirm }: { open: boolean; onOpenChange: (open: boolean) => void; initialName: string; itemCount: number; total: number; onConfirm: (name: string) => void }) {
  const [name, setName] = useState(initialName);
  useEffect(() => { if (open) setName(initialName); }, [open, initialName]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Nomear pacote da venda</DialogTitle><DialogDescription>Dê um nome ao conjunto de produtos antes de vinculá-lo ao cliente.</DialogDescription></DialogHeader><Field label="Nome do pacote *"><Input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Vendas do dia" onKeyDown={event => { if (event.key === 'Enter' && name.trim()) onConfirm(name.trim()); }}/></Field><div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm"><div><p className="text-xs text-slate-500">Itens no pacote</p><b>{itemCount} {itemCount === 1 ? 'unidade' : 'unidades'}</b></div><div className="text-right"><p className="text-xs text-slate-500">Valor somado</p><b className="text-[#e65d2c]">{brl(total)}</b></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={() => onConfirm(name.trim())} disabled={!name.trim()} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]">Escolher cliente</Button></DialogFooter></DialogContent></Dialog>;
}

function SalesCartDialog({ open, onOpenChange, parts, cart, onCartChange, onFinalize, onAddToCustomer, onPrint, assignedCustomer, packageName, finalizing }: { open: boolean; onOpenChange: (open: boolean) => void; parts: FinishedPart[]; cart: CartItem[]; onCartChange: (items: CartItem[]) => void; onFinalize: () => void; onAddToCustomer: () => void; onPrint: () => void; assignedCustomer: Customer | null; packageName: string; finalizing: boolean }) {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [selectedSupply, setSelectedSupply] = useState<Record<string, string>>({});
  const [supplyQuantity, setSupplyQuantity] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!open) return;
    void fetch('/api/supplies').then(response => response.ok ? response.json() : Promise.reject()).then(result => setSupplies(result as Supply[])).catch(() => setSupplies([]));
  }, [open]);
  const rows = cart.flatMap(item => { const part = parts.find(candidate => candidate.id === item.partId); return part ? [{ item, part }] : []; });
  const supplyCost = (item: CartItem) => (item.supplies ?? []).reduce((total, supply) => total + supply.quantity * supply.unitCost, 0);
  const totalCost = rows.reduce((total, row) => total + row.part.cost * row.item.quantity + supplyCost(row.item), 0);
  const totalSale = rows.reduce((total, row) => total + row.item.unitPrice * row.item.quantity, 0);
  const estimatedProfit = totalSale - totalCost;
  const update = (partId: string, values: Partial<CartItem>) => onCartChange(cart.map(item => item.partId === partId ? { ...item, ...values } : item));
  const addSupply = (item: CartItem) => {
    const supply = supplies.find(candidate => candidate.id === selectedSupply[item.partId]);
    if (!supply) return;
    const existingQuantity = (item.supplies ?? []).find(candidate => candidate.supplyId === supply.id)?.quantity ?? 0;
    const quantity = Math.min(Math.max(1, supplyQuantity[item.partId] ?? 1), Math.max(0, supply.quantity - existingQuantity));
    if (quantity <= 0) return;
    const nextSupplies = (item.supplies ?? []).some(candidate => candidate.supplyId === supply.id)
      ? (item.supplies ?? []).map(candidate => candidate.supplyId === supply.id ? { ...candidate, quantity: candidate.quantity + quantity } : candidate)
      : [...(item.supplies ?? []), { supplyId: supply.id, name: supply.name, quantity, unit: supply.unit, unitCost: supply.unitCost }];
    update(item.partId, { supplies: nextSupplies });
    setSupplyQuantity(current => ({ ...current, [item.partId]: 1 }));
  };
  const removeSupply = (item: CartItem, supplyId: string) => update(item.partId, { supplies: (item.supplies ?? []).filter(supply => supply.supplyId !== supplyId) });

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto border-white/20 bg-[#124787] text-white sm:max-w-2xl">
    <DialogHeader><DialogTitle className="flex items-center gap-2 text-xl text-white"><ShoppingCart className="size-5 text-[#ff6b35]"/> Carrinho de Vendas</DialogTitle><DialogDescription className="text-slate-200">Ajuste preços, quantidades e finalize o pedido ou imprima o orçamento.</DialogDescription></DialogHeader>
    {rows.length === 0 ? <div className="rounded-xl border border-dashed border-white/35 px-5 py-12 text-center"><ShoppingCart className="mx-auto size-8 text-white/55"/><p className="mt-3 text-sm font-medium">Seu carrinho está vazio</p><p className="mt-1 text-xs text-white/70">Clique em “Vender” em uma peça para adicioná-la.</p></div> : <div className="space-y-3">{rows.map(({ item, part }) => <div key={part.id} className="rounded-xl border border-white/20 bg-black/10 p-4">
      <div className="flex items-start justify-between gap-3"><div><b className="text-sm">{part.sku} — {part.name}</b><p className="text-[11px] text-slate-400">Estoque disponível: {part.stock} un.</p></div><Button onClick={() => onCartChange(cart.filter(candidate => candidate.partId !== part.id))} aria-label={`Remover ${part.name} do carrinho`} variant="ghost" size="icon" className="text-slate-400 hover:bg-white/10 hover:text-white"><X/></Button></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[160px_150px_minmax(0,1fr)] sm:items-end">
        <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/70">Quantidade</p><div className="flex items-center gap-1"><Button onClick={() => update(part.id, { quantity: Math.max(1, item.quantity - 1) })} variant="outline" size="icon" className="border-white/30 bg-transparent text-white hover:bg-white/10"><Minus/></Button><div className="grid h-9 min-w-16 place-items-center rounded-lg bg-white/20 text-sm font-bold">{item.quantity}</div><Button onClick={() => update(part.id, { quantity: Math.min(part.stock, item.quantity + 1) })} variant="outline" size="icon" className="border-white/30 bg-transparent text-white hover:bg-white/10"><Plus/></Button></div></div>
        <Field label="Preço unitário (R$)" dark><Input type="number" min="0" step=".01" value={item.unitPrice} onChange={event => update(part.id, { unitPrice: Math.max(0, Number(event.target.value)) })} className="border-white/30 bg-white/20 text-white"/></Field>
        <div className="min-w-0"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/70">Insumo adicional</p><div className="flex min-w-0 gap-1">
          <select aria-label={`Insumo adicional para ${part.name}`} value={selectedSupply[item.partId] ?? ''} onChange={event => setSelectedSupply(current => ({ ...current, [item.partId]: event.target.value }))} className="h-9 min-w-0 flex-1 rounded-md border border-white/25 bg-[#032c5e] px-2 text-xs text-white outline-none focus:border-[#ff8358]">
            <option value="">Selecionar...</option>
            {supplies.filter(supply => supply.quantity > 0).map(supply => <option key={supply.id} value={supply.id}>{supply.name} · {supply.quantity} {supply.unit}</option>)}
          </select>
          <Input aria-label={`Quantidade de insumo para ${part.name}`} type="number" min="1" step="1" value={supplyQuantity[item.partId] ?? 1} onChange={event => setSupplyQuantity(current => ({ ...current, [item.partId]: Math.max(1, Number(event.target.value) || 1) }))} className="w-14 border-white/25 bg-[#032c5e] px-2 text-center text-white"/>
          <Button type="button" aria-label={`Adicionar insumo a ${part.name}`} onClick={() => addSupply(item)} disabled={!selectedSupply[item.partId]} size="icon" className="shrink-0 bg-white/15 text-white hover:bg-white/25"><Plus/></Button>
        </div></div>
      </div>
      {(item.supplies ?? []).length > 0 && <div className="mt-2 space-y-1">{(item.supplies ?? []).map(supply => <div key={supply.supplyId} className="flex items-center justify-between rounded-md bg-[#032c5e]/70 px-2 py-1.5 text-xs"><span>{supply.name} · {supply.quantity} {supply.unit}</span><span className="flex items-center gap-2"><b>{brl(supply.quantity * supply.unitCost)}</b><button type="button" onClick={() => removeSupply(item, supply.supplyId)} aria-label={`Remover insumo ${supply.name}`} className="rounded p-1 text-white/65 hover:bg-white/10 hover:text-red-300"><Trash2 className="size-3.5"/></button></span></div>)}</div>}
      <div className="mt-4 flex justify-between border-t border-slate-700 pt-3 text-xs text-slate-400"><span>Custo: <b className="text-slate-200">{brl(part.cost * item.quantity + supplyCost(item))}</b></span><span className="font-semibold text-[#ff8358]">Subtotal: {brl(item.unitPrice * item.quantity)}</span></div>
    </div>)}</div>}
    {rows.length > 0 && <><div className="rounded-xl border border-[#ff6b35]/60 bg-black/10 p-4"><div className="flex justify-between text-sm text-white/80"><span>↗ Custo total</span><b className="text-white">{brl(totalCost)}</b></div><div className="mt-2 flex justify-between text-sm text-white/80"><span>$ Lucro estimado</span><b className="text-emerald-300">{brl(estimatedProfit)}</b></div><div className="mt-4 flex items-center justify-between border-t border-white/20 pt-4"><b>Total da venda</b><b className="text-2xl text-[#ff6b35]">{brl(totalSale)}</b></div></div>
      {assignedCustomer && <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"><UserPlus className="size-4"/> Pacote <b>{packageName || 'sem nome'}</b> vinculado a <b>{assignedCustomer.name}</b></div>}
      <div className="grid gap-2 sm:grid-cols-3"><Button onClick={onPrint} variant="outline" className="border-slate-600 bg-transparent text-white hover:bg-white/10"><Printer/> Imprimir orçamento</Button><Button onClick={onAddToCustomer} variant="outline" className="border-[#ff8358]/50 bg-[#ff6b35]/10 text-[#ff9b77] hover:bg-[#ff6b35]/20 hover:text-white"><UserPlus/> {assignedCustomer ? 'Editar pacote / cliente' : 'Adicionar ao cliente'}</Button><Button onClick={onFinalize} disabled={finalizing} className="bg-[#ff6b35] text-white shadow-lg shadow-[#ff6b35]/20 hover:bg-[#e85c2b]"><CheckCircle2/> {finalizing ? 'Salvando...' : 'Finalizar pedido'}</Button></div>
      <p className="text-center text-[10px] text-slate-500">“Finalizar pedido” desconta automaticamente as quantidades do estoque.</p></>}
  </DialogContent></Dialog>;
}

function QuoteEditor({ parts = [], cart = [], customer = null, quote, onClose }: { parts?: FinishedPart[]; cart?: CartItem[]; customer?: Customer | null; quote?: Quote; onClose: () => void }) {
  const cartRows = cart.flatMap(item => { const part = parts.find(candidate => candidate.id === item.partId); return part ? [{ key: part.id, name: `${part.sku} — ${part.name}`, quantity: item.quantity, unitPrice: item.unitPrice, lineTotal: item.quantity * item.unitPrice }] : []; });
  const quoteTotal = quote ? parseBrl(quote.total) : 0;
  const rows = quote ? [{ key: quote.id, name: quote.item, quantity: quote.quantity ?? 1, unitPrice: quote.unitPrice ?? quoteTotal, lineTotal: quoteTotal }] : cartRows;
  const total = rows.reduce((sum, row) => sum + row.lineTotal, 0);
  const createdAt = quote?.date || new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());
  const printQuote = () => {
    document.body.classList.add('quote-printing');
    const finish = () => document.body.classList.remove('quote-printing');
    window.addEventListener('afterprint', finish, { once: true });
    window.print();
    window.setTimeout(finish, 1000);
  };

  if (typeof document === 'undefined') return null;
  return createPortal(<div className="quote-print-editor fixed inset-0 z-[100] overflow-y-auto bg-slate-100 p-4 text-slate-900 sm:p-8">
    <div className="mx-auto mb-4 flex max-w-[850px] flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 shadow-sm print:hidden sm:flex-row sm:items-center">
      <div className="flex-1"><b>Modo de Edição:</b> Você pode clicar em qualquer texto do orçamento abaixo para alterá-lo livremente.</div>
      <div className="flex gap-2"><Button onClick={onClose} variant="outline" className="bg-white"><X/> Voltar</Button><Button onClick={printQuote} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]"><Printer/> Imprimir</Button></div>
    </div>

    <article className="quote-sheet mx-auto min-h-[1100px] max-w-[850px] bg-white px-8 py-10 shadow-xl print:min-h-0 print:max-w-none print:shadow-none sm:px-14 sm:py-12">
      <header className="flex flex-col gap-7 border-b-2 border-[#0068ff] pb-7 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start"><img src="/imprimo3dlab-logo-color.png" alt="Imprimo3DLab" className="h-24 w-56 object-contain object-left-top"/></div>
        <div className="min-w-[270px] text-sm">
          <EditableText className="block text-2xl font-bold text-slate-950">Orçamento de Venda</EditableText>
          <EditableText className="mt-1 block text-xs text-slate-500">{createdAt}</EditableText>
          <div className="mt-3 flex gap-1"><span className="font-semibold">Cliente:</span><EditableText className="min-w-40 border-b border-slate-400 px-1">{quote?.client || customer?.name || 'Nome do cliente'}</EditableText></div>
          <div className="mt-1 flex gap-1"><span className="font-semibold">Contato:</span><EditableText className="min-w-40 border-b border-slate-400 px-1">{customer?.phone || customer?.email || 'Telefone ou e-mail'}</EditableText></div>
        </div>
      </header>

      <div className="mt-10 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead><tr className="border-y bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500"><th className="px-3 py-3">Produto</th><th className="px-3 py-3 text-center">Qtd.</th><th className="px-3 py-3 text-right">Preço unit.</th><th className="px-3 py-3 text-right">Total</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.key} className="border-b border-slate-200"><td className="px-3 py-4"><EditableText className="font-medium">{row.name}</EditableText></td><td className="px-3 py-4 text-center"><EditableText>{row.quantity}</EditableText></td><td className="px-3 py-4 text-right"><EditableText>{brl(row.unitPrice)}</EditableText></td><td className="px-3 py-4 text-right font-bold"><EditableText>{brl(row.lineTotal)}</EditableText></td></tr>)}</tbody>
        </table>
      </div>

      <div className="mt-8 flex justify-end"><div className="min-w-[260px] rounded-xl bg-[#0068ff] px-6 py-5 text-right text-white"><EditableText className="block text-xs font-semibold uppercase tracking-wide text-blue-100">Total da venda</EditableText><EditableText className="mt-1 block text-4xl font-extrabold">{brl(total)}</EditableText></div></div>

      <section className="mt-12 grid gap-6 border-t border-slate-200 pt-7 text-xs text-slate-600 sm:grid-cols-2">
        <div><EditableText className="block font-bold text-slate-900">Condições do orçamento</EditableText><EditableText className="mt-2 block leading-5">Orçamento válido por 7 dias. Prazo de produção definido após a aprovação.</EditableText></div>
        <div><EditableText className="block font-bold text-slate-900">Forma de pagamento</EditableText><EditableText className="mt-2 block leading-5">Pagamento conforme combinado com o cliente.</EditableText></div>
      </section>
      <footer className="mt-16 text-center text-xs text-slate-400"><EditableText>Imprimo3DLab — Gerenciamento e Impressão 3D</EditableText></footer>
    </article>
  </div>, document.body);
}

function EditableText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span contentEditable suppressContentEditableWarning className={`rounded-sm outline-none transition hover:bg-blue-50 focus:bg-blue-50 focus:ring-2 focus:ring-[#0068ff]/30 ${className}`}>{children}</span>;
}

function CustomerOrderDialog({ open, onOpenChange, onSelect }: { open: boolean; onOpenChange: (open: boolean) => void; onSelect: (customer: Customer) => void | Promise<void> }) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    void fetch('/api/customers').then(async response => {
      if (!response.ok) throw new Error('Não foi possível carregar os clientes');
      const result = await response.json() as Customer[];
      setCustomers(result);
      setSelected(current => current || result[0]?.id || '');
      setError('');
    }).catch(() => setError('Não foi possível carregar os clientes cadastrados.'));
  }, [open]);
  const submit = async () => {
    setSaving(true);
    try {
      if (mode === 'existing') {
        const customer = customers.find(item => item.id === selected);
        if (customer) await onSelect(customer);
      } else {
        const response = await fetch('/api/customers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, phone, email }) });
        const customer = await response.json() as Customer & { error?: string };
        if (!response.ok) throw new Error(customer.error || 'Não foi possível criar o cliente');
        setCustomers(current => [...current, customer].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
        await onSelect(customer);
      }
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Não foi possível vincular o cliente.'); }
    finally { setSaving(false); }
  };
  const canSubmit = mode === 'existing' ? Boolean(selected) : Boolean(name.trim());

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl">
    <DialogHeader><DialogTitle className="flex items-center gap-2"><UserPlus className="size-5 text-[#ff6b35]"/> Adicionar pedido ao cliente</DialogTitle><DialogDescription>Escolha um cliente cadastrado ou crie um novo para vincular a esta venda.</DialogDescription></DialogHeader>
    <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1"><button onClick={() => setMode('existing')} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${mode === 'existing' ? 'bg-white text-[#172033] shadow-sm' : 'text-slate-500'}`}>Cliente existente</button><button onClick={() => setMode('new')} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${mode === 'new' ? 'bg-white text-[#172033] shadow-sm' : 'text-slate-500'}`}>Criar novo cliente</button></div>
    {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
    {mode === 'existing' ? <div className="max-h-72 space-y-2 overflow-y-auto">{customers.map(customer => <button key={customer.id} onClick={() => setSelected(customer.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selected === customer.id ? 'border-[#ff8358] bg-[#fff5f1] ring-1 ring-[#ff8358]/20' : 'hover:bg-slate-50'}`}><div className="grid size-9 place-items-center rounded-full bg-[var(--brand-blue)] text-xs font-bold text-white">{initials(customer.name)}</div><div><b className="text-sm">{customer.name}</b><p className="text-xs text-slate-500">{customer.phone || customer.email || 'Sem contato cadastrado'}</p></div>{selected === customer.id && <CheckCircle2 className="ml-auto size-5 text-[#ff6b35]"/>}</button>)}{customers.length === 0 && !error && <p className="py-8 text-center text-sm text-slate-400">Nenhum cliente cadastrado.</p>}</div> : <div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Nome do cliente *"><Input value={name} onChange={event => setName(event.target.value)} placeholder="Nome completo ou empresa"/></Field></div><Field label="Telefone / WhatsApp"><Input value={phone} onChange={event => setPhone(event.target.value)} placeholder="(00) 00000-0000"/></Field><Field label="E-mail"><Input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="cliente@email.com"/></Field></div>}
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Voltar ao carrinho</Button><Button disabled={!canSubmit || saving} onClick={() => void submit()} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]"><UserPlus/> {saving ? 'Salvando...' : 'Vincular ao pedido'}</Button></DialogFooter>
  </DialogContent></Dialog>;
}

function PieceDialog({ open, onOpenChange, initial, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; initial: FinishedPart | null; onSave: (part: FinishedPart) => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [detail, setDetail] = useState(initial?.detail ?? '');
  const [stock, setStock] = useState(initial?.stock ?? 1);
  const [color, setColor] = useState(initial?.color ?? '');
  const [cost, setCost] = useState(initial?.cost ?? 0);
  const [price, setPrice] = useState(initial?.price ?? 0);
  const submit = () => onSave({ id: initial?.id ?? '', sku: initial?.sku ?? '', name: name.trim(), detail: detail.trim() || 'Peça adicionada manualmente', stock, color: color.trim() || 'Sem cor', cost, price });

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{initial ? 'Editar peça finalizada' : 'Nova peça finalizada'}</DialogTitle><DialogDescription>Cadastre o produto pronto para venda e sua quantidade atual.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome da peça *"><Input value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Vaso geométrico"/></Field><Field label="Modelo / categoria"><Input value={detail} onChange={event => setDetail(event.target.value)} placeholder="Ex.: Coleção decorativa"/></Field><Field label="Quantidade em estoque"><Input type="number" min="0" value={stock} onChange={event => setStock(Math.max(0, Number(event.target.value)))}/></Field><Field label="Cor"><Input value={color} onChange={event => setColor(event.target.value)} placeholder="Ex.: Laranja"/></Field><Field label="Custo unitário (R$)"><Input type="number" min="0" step=".01" value={cost} onChange={event => setCost(Math.max(0, Number(event.target.value)))}/></Field><Field label="Preço de venda (R$)"><Input type="number" min="0" step=".01" value={price} onChange={event => setPrice(Math.max(0, Number(event.target.value)))}/></Field></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit} disabled={!name.trim() || price <= 0} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]">{initial ? 'Salvar alterações' : 'Adicionar peça'}</Button></DialogFooter></DialogContent></Dialog>;
}

function StockMetric({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: string }) {
  return <Card className="gap-2 border-0 bg-white py-4 shadow-sm ring-1 ring-[#e6eaf0]"><CardContent className="flex items-center gap-3 px-4"><div className={`metric-icon metric-${tone}`}><Icon className="size-4"/></div><div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="text-lg font-bold">{value}</p></div></CardContent></Card>;
}

function QuotesView({ quotes, onNewQuote, onEdit, onDelete, onConvert }: { quotes: Quote[]; onNewQuote: () => void; onEdit: (quote: Quote) => void; onDelete: (quote: Quote) => void; onConvert: (quote: Quote) => void }) {
  const shareOnWhatsApp = (quote: Quote) => {
    const message = `Olá! Segue o orçamento ${quote.id} da Imprimo3DLab.\nCliente: ${quote.client}\nItem: ${quote.item}\nValor: ${quote.total}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };
  return <ModuleShell title={`${quotes.length} orçamentos recentes`} detail="Crie, edite e converta propostas em pedidos" action="Novo orçamento" onAction={onNewQuote}>
    <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead><tr className="border-b bg-slate-50 text-[10px] uppercase tracking-[.08em] text-slate-400">{['Orçamento','Cliente','Item','Criado em','Valor','Status','','Ações'].map((header, index) => <th key={`${header}-${index}`} className="px-4 py-3 font-semibold">{header}</th>)}</tr></thead><tbody>{quotes.map(quote => {
      const paid = quote.status === 'Pago';
      const status = paid ? 'Pago' : quote.status === 'Rascunho' || quote.status === 'Pendente' ? 'Pendente' : quote.status;
      return <tr key={quote.id} className="border-b last:border-0 hover:bg-slate-50/60"><td className="px-4 py-3 text-xs font-semibold">{quote.id}</td><td className="px-4 py-3 text-xs text-slate-600">{quote.client}</td><td className="px-4 py-3 text-xs text-slate-600">{quote.item}</td><td className="px-4 py-3 text-xs text-slate-600">{quote.date}</td><td className="px-4 py-3 text-xs text-slate-600">{quote.total}</td><td className="px-4 py-3"><Badge variant="secondary" className={paid ? 'bg-emerald-100 text-emerald-700' : status === 'Pendente' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-700'}>{status}</Badge></td><td className="px-1 py-2"><Button onClick={() => shareOnWhatsApp(quote)} variant="ghost" size="icon" aria-label={`Enviar ${quote.id} pelo WhatsApp`} title="Enviar pelo WhatsApp" className="text-[#25D366] hover:bg-emerald-50 hover:text-[#1da851]"><MessageCircle/></Button></td><td className="px-4 py-2"><div className="flex gap-1"><Button onClick={() => onConvert(quote)} variant="ghost" size="icon" aria-label={`Enviar ${quote.id} para Pedidos`} title="Enviar para Pedidos" className="text-violet-600 hover:bg-violet-50"><ShoppingBag/></Button><Button onClick={() => onEdit(quote)} variant="ghost" size="icon" aria-label={`Editar ${quote.id}`} className="text-[#0068ff] hover:bg-blue-50"><Pencil/></Button><Button onClick={() => onDelete(quote)} variant="ghost" size="icon" aria-label={`Apagar ${quote.id}`} className="text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2/></Button></div></td></tr>;
    })}</tbody></table></div>
  </ModuleShell>;
}

function ModuleShell({ title, detail, action, onAction, compact = false, children }: { title: string; detail: string; action: string; onAction?: () => void; compact?: boolean; children: React.ReactNode }) {
  return <><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-bold">{title}</h2><p className="text-sm text-slate-500">{detail}</p></div><Button onClick={onAction} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]"><Plus/>{action}</Button></div><Card className={`border-0 bg-white py-0 shadow-sm ring-1 ring-[#e6eaf0] ${compact ? 'gap-0' : ''}`}><div className="flex flex-wrap items-center gap-3 border-b p-4"><div className="flex w-full max-w-sm items-center gap-2 rounded-lg border bg-slate-50 px-3"><Search className="size-4 text-slate-400"/><input className="h-9 flex-1 bg-transparent text-sm outline-none" placeholder="Filtrar resultados..."/></div><Badge variant="outline">Todos</Badge><Badge variant="outline">Em andamento</Badge><Badge variant="outline">Concluídos</Badge></div>{children}</Card></>;
}

function SettingsView({ user }: { user: { name: string; email: string } }) {
  const [pricing, setPricing] = useState<PricingDefaults>(defaultPricingDefaults);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    void fetch('/api/settings')
      .then(response => response.ok ? response.json() as Promise<PricingDefaults> : Promise.reject())
      .then(settings => setPricing(settings))
      .catch(() => setPricing(defaultPricingDefaults));
  }, []);

  const updatePricing = (key: keyof PricingDefaults, value: number) => {
    setPricing(current => ({ ...current, [key]: Math.max(0, value) }));
  };
  const savePricing = async () => {
    setSaving(true);
    setNotice('');
    try {
      const response = await fetch('/api/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(pricing) });
      if (!response.ok) throw new Error('Falha ao salvar');
      setPricing(await response.json() as PricingDefaults);
      setNotice('Parâmetros padrão salvos.');
    } catch {
      setNotice('Não foi possível salvar os parâmetros.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="grid gap-5 xl:grid-cols-[1fr_.8fr]">
    <div className="space-y-5">
      <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]">
        <CardHeader><CardTitle>Administradores autorizados</CardTitle><p className="text-xs text-slate-500">Acesso interno exclusivo dos donos da empresa</p></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--brand-blue)] text-xs font-bold text-white">{initials(user.name)}</div>
            <div className="min-w-0"><b className="block truncate text-sm">{user.name}</b><p className="truncate text-xs text-slate-500">{user.email}</p><p className="mt-1 text-[11px] font-semibold text-emerald-700">Administrador</p></div>
            <Badge className="ml-auto bg-emerald-100 text-emerald-700">Conectado</Badge>
          </div>
          <div className="flex gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
            <UserCog className="mt-0.5 size-5 shrink-0 text-[#ff6b35]" />
            <p>Não existem perfis operacionais separados. Cada dono autorizado pode acessar e administrar todos os módulos do sistema.</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]">
        <CardHeader><CardTitle>Controle de acesso</CardTitle></CardHeader>
        <CardContent><p className="text-xs leading-5 text-slate-500">Novos donos poderão ser convidados futuramente como administradores, sem criar níveis diferentes de permissão e sem precisar reestruturar o sistema.</p></CardContent>
      </Card>
    </div>
    <div className="space-y-5">
      <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader><CardTitle>Parâmetros de precificação</CardTitle><p className="text-xs text-slate-500">Estes valores serão usados automaticamente em novos orçamentos.</p></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><PricingSetting label="Energia (R$/kWh)" value={pricing.energyRate} onChange={value => updatePricing('energyRate', value)}/><PricingSetting label="Máquina (R$/hora)" value={pricing.machineRate} onChange={value => updatePricing('machineRate', value)}/><PricingSetting label="Embalagem padrão" value={pricing.packaging} onChange={value => updatePricing('packaging', value)}/><PricingSetting label="Margem padrão (%)" value={pricing.margin} onChange={value => updatePricing('margin', value)}/><PricingSetting label="Taxas / impostos (%)" value={pricing.fees} onChange={value => updatePricing('fees', value)}/><PricingSetting label="Perdas padrão (%)" value={pricing.risk} onChange={value => updatePricing('risk', value)}/></div><Button onClick={savePricing} disabled={saving} className="w-full bg-[#ff6b35] text-white hover:bg-[#e85c2b]">{saving ? 'Salvando...' : 'Salvar parâmetros'}</Button>{notice && <p className="text-center text-xs text-slate-500">{notice}</p>}</CardContent></Card>
      <Card className="border-0 bg-[var(--brand-blue)] text-white shadow-sm ring-0"><CardHeader><CardTitle className="text-white">Pronto para evoluir</CardTitle></CardHeader><CardContent className="space-y-2 text-xs text-white/80">{['PDF de orçamento com identidade visual','Envio por WhatsApp','Upload de STL / 3MF e fotos','Histórico completo de alterações','Integrações com marketplaces'].map(x => <p key={x}>○ {x}</p>)}</CardContent></Card>
    </div>
  </div>;
}

function QuoteDialog({ open, onOpenChange, onSave, onPay, onPrint, initialQuote, sequence }: { open: boolean; onOpenChange: (v: boolean) => void; onSave: (q: Quote, p: Record<string, unknown>) => void; onPay: (quote: Quote, payload: Record<string, unknown>) => Promise<boolean>; onPrint: (quote: Quote) => void; initialQuote: Quote | null; sequence: number }) {
  const [client, setClient] = useState('');
  const [item, setItem] = useState('');
  const [grams, setGrams] = useState(180);
  const [timeHours, setTimeHours] = useState(9);
  const [timeMinutes, setTimeMinutes] = useState(30);
  const [energyRate, setEnergyRate] = useState(defaultPricingDefaults.energyRate);
  const [machineRate, setMachineRate] = useState(defaultPricingDefaults.machineRate);
  const [packaging, setPackaging] = useState(defaultPricingDefaults.packaging);
  const [fees, setFees] = useState(defaultPricingDefaults.fees);
  const [margin, setMargin] = useState(defaultPricingDefaults.margin);
  const [quantity, setQuantity] = useState(1);
  const [customUnitPrice, setCustomUnitPrice] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [quoteSupplies, setQuoteSupplies] = useState<CalculatorQuoteSupply[]>([]);
  const [paying, setPaying] = useState(false);
  const hours = timeHours + timeMinutes / 60;

  useEffect(() => {
    if (!open) return;
    const hydrate = (settings: PricingDefaults) => {
      const savedHours = initialQuote?.hours ?? 9.5;
      setClient(initialQuote?.client ?? '');
      setItem(initialQuote?.item ?? '');
      setGrams(initialQuote?.grams ?? 180);
      setTimeHours(initialQuote?.timeHours ?? Math.floor(savedHours));
      setTimeMinutes(initialQuote?.timeMinutes ?? Math.round((savedHours % 1) * 60));
      setEnergyRate(initialQuote?.energyRate ?? settings.energyRate);
      setMachineRate(initialQuote?.machineRate ?? settings.machineRate);
      setPackaging(initialQuote?.packaging ?? settings.packaging);
      setFees(initialQuote?.fees ?? settings.fees);
      setMargin(initialQuote?.margin ?? settings.margin);
      setQuantity(initialQuote?.quantity ?? 1);
      setCustomUnitPrice(initialQuote ? initialQuote.unitPrice ?? parseBrl(initialQuote.total) / Math.max(1, initialQuote.quantity ?? 1) : null);
      setNotes(initialQuote?.notes ?? '');
      setQuoteSupplies(initialQuote?.supplies ?? []);
    };
    void fetch('/api/settings')
      .then(response => response.ok ? response.json() as Promise<PricingDefaults> : Promise.reject())
      .then(settings => hydrate(settings))
      .catch(() => hydrate(defaultPricingDefaults));
  }, [initialQuote, open]);

  const calc = useMemo(() => {
    const material = grams * .095;
    const energy = hours * energyRate;
    const machine = hours * machineRate;
    const base = material + energy + machine + packaging;
    const feeValue = base * fees / 100;
    const cost = base + feeValue;
    return { cost, total: cost / (1 - margin / 100) };
  }, [grams, hours, energyRate, machineRate, packaging, fees, margin]);
  const unitPrice = customUnitPrice ?? Number((calc.total / Math.max(1, quantity)).toFixed(2));
  const finalTotal = quantity * unitPrice;
  const valid = Boolean(client.trim() && item.trim() && quantity > 0 && unitPrice > 0);
  const buildQuote = (): Quote => ({
    id: initialQuote?.id ?? `ORC-${sequence}`,
    client: client.trim(), item: item.trim(), date: initialQuote?.date ?? '30 ago', total: brl(finalTotal),
    status: initialQuote?.status ?? 'Pendente', quantity, unitPrice, grams, hours, timeHours, timeMinutes,
    energyRate, machineRate, packaging, fees, margin, notes, supplies: quoteSupplies,
  });
  const payload = (quote: Quote) => ({ ...quote, total: finalTotal, details: { selectedSupplies: quote.supplies ?? [] } });
  const submit = () => { if (!valid) return; const quote = buildQuote(); onSave(quote, payload(quote)); };
  const print = () => { if (!valid) return; onPrint(buildQuote()); };
  const pay = async () => {
    if (!valid || initialQuote?.status === 'Pago') return;
    setPaying(true);
    const quote = { ...buildQuote(), status: 'Pago' };
    await onPay(quote, { ...payload(quote), cost: calc.cost });
    setPaying(false);
  };
  const standardInputClass = 'bg-slate-50 text-slate-600';

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
    <DialogHeader><DialogTitle className="text-lg">{initialQuote ? `Editar orçamento ${initialQuote.id}` : 'Novo orçamento'}</DialogTitle><DialogDescription>Informe a peça, a quantidade e o valor unitário. O total é atualizado automaticamente.</DialogDescription></DialogHeader>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Cliente *"><Input value={client} onChange={event => setClient(event.target.value)} placeholder="Nome do cliente"/></Field>
      <Field label="Peça / trabalho *"><Input value={item} onChange={event => setItem(event.target.value)} placeholder="Ex.: Maquete residencial"/></Field>
      <Field label="Quantidade *"><Input type="number" min="1" step="1" value={quantity} onChange={event => setQuantity(Math.max(1, Number(event.target.value)))}/></Field>
      <Field label="Valor unitário (R$) *"><Input type="number" min="0" step=".01" value={unitPrice} onChange={event => setCustomUnitPrice(Math.max(0, Number(event.target.value)))}/></Field>
      <Field label="Peso total (g)"><Input type="number" min="0" value={grams} onChange={event => { setGrams(Math.max(0, Number(event.target.value))); setCustomUnitPrice(null); }}/></Field>
      <Field label="Tempo total"><div className="grid grid-cols-2 gap-2"><div className="relative"><Input aria-label="Horas totais" type="number" min="0" step="1" value={timeHours} onChange={event => { setTimeHours(Math.max(0, Number(event.target.value))); setCustomUnitPrice(null); }} className="pr-8"/><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase text-slate-400">h</span></div><div className="relative"><Input aria-label="Minutos totais" type="number" min="0" max="59" step="1" value={timeMinutes} onChange={event => { setTimeMinutes(Math.min(59, Math.max(0, Number(event.target.value)))); setCustomUnitPrice(null); }} className="pr-10"/><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase text-slate-400">min</span></div></div></Field>
      <Field label="Energia (R$/kWh)"><Input readOnly value={energyRate} className={standardInputClass}/></Field>
      <Field label="Depreciação da máquina (R$/h)"><Input readOnly value={machineRate} className={standardInputClass}/></Field>
      <Field label="Embalagem (R$)"><Input readOnly value={packaging} className={standardInputClass}/></Field>
      <Field label="Taxas / impostos (%)"><Input readOnly value={fees} className={standardInputClass}/></Field>
      <Field label="Margem de lucro (%)"><Input readOnly value={margin} className={standardInputClass}/></Field>
      <Field label="Observações"><Textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Acabamento, cor, tolerâncias..."/></Field>
      {quoteSupplies.length > 0 && <div className="sm:col-span-2"><Field label="Insumos adicionados na calculadora"><div className="space-y-2 rounded-xl border bg-slate-50 p-3">{quoteSupplies.map(supply => <div key={supply.id} className="flex items-center justify-between gap-3 text-xs"><span><b className="text-slate-700">{supply.name}</b> · {supply.quantity} {supply.unit}</span><span className="font-semibold text-slate-600">{brl(supply.quantity * supply.unitCost)}</span></div>)}</div></Field></div>}
    </div>
    <p className="text-[11px] text-slate-500">Os campos em cinza seguem os padrões salvos em Configurações.</p>
    <div className="grid items-stretch gap-3 sm:grid-cols-3"><div className="flex min-h-24 flex-col justify-center rounded-xl bg-[#032c5e] p-4 shadow-sm"><p className="text-xs font-medium text-white/80">Custo</p><p className="mt-1 text-xl font-bold text-white">{brl(calc.cost)}</p></div><div className="flex min-h-24 flex-col justify-center rounded-xl bg-[#032c5e] p-4 shadow-sm"><p className="text-xs font-medium text-white/80">Lucro real</p><p className={`mt-1 text-xl font-bold ${finalTotal - calc.cost >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{brl(finalTotal - calc.cost)}</p></div><div className="flex min-h-24 flex-col justify-center rounded-xl bg-[#032c5e] p-4 shadow-sm"><label htmlFor="quote-total" className="text-xs font-medium text-white/80">Total editável</label><div className="relative mt-1"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-white">R$</span><Input id="quote-total" aria-label="Valor total do orçamento" type="number" min="0" step=".01" value={Number(finalTotal.toFixed(2))} onChange={event => setCustomUnitPrice(Math.max(0, Number(event.target.value) || 0) / Math.max(1, quantity))} className="h-10 border-white/35 bg-white/10 pl-10 text-lg font-bold text-white placeholder:text-white/50 focus-visible:border-white focus-visible:ring-white/30"/></div></div></div>
    <DialogFooter className="flex-wrap sm:justify-between"><Button onClick={print} disabled={!valid} variant="outline"><Printer/> Imprimir orçamento</Button><div className="flex flex-wrap gap-2"><Button onClick={() => void pay()} disabled={!valid || paying || initialQuote?.status === 'Pago'} className="bg-emerald-600 text-white hover:bg-emerald-700"><CheckCircle2/> {initialQuote?.status === 'Pago' ? 'Pago' : paying ? 'Registrando...' : 'Pago'}</Button><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit} disabled={!valid || paying} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]">{initialQuote ? 'Salvar alterações' : 'Salvar orçamento'}</Button></div></DialogFooter>
  </DialogContent></Dialog>;
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b bg-slate-50 text-[10px] uppercase tracking-[.08em] text-slate-400">{headers.map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={`${row[0]}-${i}`} className="border-b last:border-0 hover:bg-slate-50/60">{row.map((cell, j) => <td key={j} className={`px-4 py-3 text-xs ${j === 0 ? 'font-semibold' : 'text-slate-600'}`}>{j === row.length - 1 ? <Badge variant="secondary" className="bg-blue-50 text-blue-700">{cell}</Badge> : cell}</td>)}</tr>)}</tbody></table></div>; }
function AlertBox({ icon: Icon, title, detail, tone }: { icon: React.ElementType; title: string; detail: string; tone: string }) { return <div className="flex items-center gap-3 rounded-xl border bg-white p-4"><div className={`metric-icon metric-${tone}`}><Icon className="size-4"/></div><div><p className="text-xs font-bold">{title}</p><p className="text-[11px] text-slate-500">{detail}</p></div></div>; }
function PricingSetting({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <Field label={label}><Input type="number" min="0" step=".01" value={value} onChange={event => onChange(Number(event.target.value))}/></Field>; }
function Field({ label, children, dark = false }: { label: string; children: React.ReactNode; dark?: boolean }) { return <label className={`text-xs font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{label}<div className="mt-1">{children}</div></label>; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'AD'; }
function firstName(name: string) { return name.trim().split(/\s+/)[0] || 'Administrador'; }
