'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Boxes, CheckCircle2, ChevronRight, CircleDollarSign, Clock3, Factory,
  FileText, HandCoins, LayoutDashboard, Menu, PackageOpen, Pencil, Plus, Search,
  MessageCircle, Minus, Printer, Settings, ShoppingBag, ShoppingCart, Trash2, TrendingUp, UserCog, UserPlus, Users, WalletCards, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

type View = 'Visão geral' | 'Orçamentos' | 'Pedidos' | 'Produção' | 'Estoque' | 'Clientes' | 'Financeiro' | 'Configurações';
type Quote = { id: string; client: string; item: string; date: string; total: string; status: string; quantity?: number; unitPrice?: number };

const nav: [React.ElementType, View][] = [
  [LayoutDashboard, 'Visão geral'], [FileText, 'Orçamentos'], [ShoppingBag, 'Pedidos'],
  [Factory, 'Produção'], [Boxes, 'Estoque'], [Users, 'Clientes'],
  [CircleDollarSign, 'Financeiro'], [Settings, 'Configurações'],
];
const brl = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const parseBrl = (value: string) => Number(value.replace(/[^0-9,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
const seedQuotes: Quote[] = [
  { id: 'ORC-1052', client: 'Ateliê Norte', item: 'Luminária Voronoi', date: '29 ago', total: 'R$ 428,00', status: 'Rascunho' },
  { id: 'ORC-1051', client: 'Lumina Arquitetura', item: 'Maquete residencial', date: '28 ago', total: 'R$ 1.480,00', status: 'Aprovado' },
  { id: 'ORC-1050', client: 'Clínica Orto+', item: 'Modelo anatômico', date: '27 ago', total: 'R$ 720,00', status: 'Enviado' },
];

export function SystemApp({ user, signOutPath }: { user: { name: string; email: string }; signOutPath: string }) {
  const [view, setView] = useState<View>('Visão geral');
  const [menu, setMenu] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteEditor, setQuoteEditor] = useState<Quote | null>(null);
  const [quotes, setQuotes] = useState(seedQuotes);
  const [notice, setNotice] = useState('');

  const selectView = (next: View) => { setView(next); setMenu(false); };
  const saveQuote = async (quote: Quote, payload: Record<string, unknown>) => {
    setQuotes(current => [quote, ...current]);
    setQuoteOpen(false);
    setView('Orçamentos');
    setQuoteEditor(quote);
    setNotice(`${quote.id} salvo com sucesso.`);
    window.setTimeout(() => setNotice(''), 3500);
    try { await fetch('/api/quotes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); } catch { /* UI remains useful offline */ }
  };
  const deleteQuote = async (quote: Quote) => {
    setQuotes(current => current.filter(item => item.id !== quote.id));
    setNotice(`${quote.id} apagado.`);
    window.setTimeout(() => setNotice(''), 3500);
    try { await fetch(`/api/quotes?id=${encodeURIComponent(quote.id)}`, { method: 'DELETE' }); } catch { /* local list remains updated */ }
  };

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
        {view === 'Visão geral' ? <Dashboard onNavigate={selectView} userName={user.name} /> : <Module view={view} quotes={quotes} onNewQuote={() => setQuoteOpen(true)} onEditQuote={setQuoteEditor} onDeleteQuote={deleteQuote} user={user} />}
      </div>
    </main>
    <QuoteDialog open={quoteOpen} onOpenChange={setQuoteOpen} onSave={saveQuote} sequence={1053 + quotes.length - seedQuotes.length} />
    {quoteEditor && <QuoteEditor quote={quoteEditor} onClose={() => setQuoteEditor(null)}/>}
    {notice && <output className="fixed bottom-5 right-5 z-[70] rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-xl">{notice}</output>}
  </div>;
}

function Sidebar({ view, menu, onClose, onSelect, user, signOutPath }: { view: View; menu: boolean; onClose: () => void; onSelect: (v: View) => void; user: { name: string; email: string }; signOutPath: string }) {
  return <aside className={`fixed inset-y-0 left-0 z-40 flex w-[238px] flex-col bg-[var(--brand-blue)] text-white transition-transform lg:translate-x-0 ${menu ? 'translate-x-0' : '-translate-x-full'}`}>
    <div className="flex h-[76px] items-center gap-2 border-b border-white/20 px-3"><img src="/imprimo3dlab-logo-white.png" alt="" className="h-14 w-16 shrink-0 object-contain"/><div className="min-w-0"><p className="truncate text-[16px] font-bold tracking-tight">Imprimo3DLab</p><p className="text-[10px] uppercase tracking-[.17em] text-white">Gerenciamento</p></div><button className="ml-auto lg:hidden" aria-label="Fechar menu" onClick={onClose}><X className="size-5" /></button></div>
    <nav className="flex-1 space-y-1 px-3 py-5"><p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-white">Operação</p>{nav.map(([Icon, label]) => <button key={label} onClick={() => onSelect(label)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${view === label ? 'bg-white font-semibold text-[var(--brand-blue)]' : 'text-white hover:bg-white/15'}`}><Icon className={`size-[18px] ${view === label ? 'text-[#ff8358]' : ''}`} />{label}{label === 'Produção' && <span className="ml-auto rounded-full bg-[#ff6b35] px-1.5 text-[10px] text-white">3</span>}</button>)}</nav>
    <div className="m-3 rounded-xl border border-white/20 bg-black/10 p-3.5"><div className="flex items-center gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-white/20 text-xs font-bold">{initials(user.name)}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{user.name}</p><p className="text-[11px] text-white">Administrador</p></div></div><a href={signOutPath} target="_top" className="mt-3 block border-t border-white/20 pt-2 text-center text-[11px] font-medium text-white transition hover:bg-white/10">Sair do sistema</a></div>
  </aside>;
}

function Dashboard({ onNavigate, userName }: { onNavigate: (v: View) => void; userName: string }) {
  const jobs = [{ name: 'Bambu Lab X1C', detail: 'Maquete • peças 8/14', value: 64 }, { name: 'Creality K1 Max', detail: 'Engrenagem técnica', value: 82 }, { name: 'Elegoo Saturn 3', detail: 'Modelo anatômico', value: 18 }];
  return <>
    <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><p className="text-sm text-slate-500">Olá, {firstName(userName)}.</p><h2 className="text-2xl font-bold tracking-[-.025em]">Sua produção está no ritmo certo.</h2></div><span className="text-xs text-slate-500">● Atualizado agora</span></div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      [HandCoins, 'Faturamento no mês', 'R$ 18.740', '+12,4%', 'green'], [ShoppingBag, 'Pedidos ativos', '12', '4 entregas nesta semana', 'blue'], [Factory, 'Máquinas em uso', '3 de 5', '60% da capacidade', 'orange'], [TrendingUp, 'Lucro estimado', 'R$ 6.920', '36,9% de margem', 'violet'],
    ].map(([Icon, label, value, detail, color]) => <Card key={String(label)} className="gap-3 border-0 bg-white py-4 shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader className="flex flex-row items-center justify-between px-4"><CardTitle className="text-xs text-slate-500">{label}</CardTitle><div className={`metric-icon metric-${color}`}><Icon className="size-4" /></div></CardHeader><CardContent className="px-4"><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-[11px] text-slate-500">{detail}</p></CardContent></Card>)}</section>
    <div className="mt-5">
      <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader className="flex flex-row items-center justify-between border-b"><div><CardTitle>Pedidos recentes</CardTitle><p className="text-xs text-slate-500">Prazos e andamento da operação</p></div><Button variant="ghost" onClick={() => onNavigate('Pedidos')} className="text-[#e65d2c]">Ver todos</Button></CardHeader><CardContent className="overflow-x-auto px-0"><DataTable headers={['Pedido / cliente', 'Trabalho', 'Prazo', 'Valor', 'Status']} rows={[
        ['#1048 · Lumina Arquitetura', 'Maquete residencial', 'Hoje, 16:00', 'R$ 1.480,00', 'Em produção'], ['#1047 · Studio Objeto', 'Kit 12 expositores', 'Amanhã', 'R$ 864,00', 'Aguardando'], ['#1046 · Rafael Martins', 'Engrenagem técnica', '30 ago', 'R$ 295,00', 'Acabamento'], ['#1045 · Clínica Orto+', 'Modelo anatômico', '02 set', 'R$ 720,00', 'Aprovado'],
      ]} /></CardContent></Card>
    </div>
    <Card className="mt-5 border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Fila de produção</CardTitle><p className="text-xs text-slate-500">3 máquinas trabalhando agora</p></div><Button variant="ghost" onClick={() => onNavigate('Produção')}>Abrir fila <ChevronRight /></Button></CardHeader><CardContent className="grid gap-3 md:grid-cols-3">{jobs.map(job => <div key={job.name} className="rounded-xl border p-4"><div className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-emerald-500"/><b className="text-xs">{job.name}</b></div><p className="mt-3 text-xs text-slate-500">{job.detail}</p><Progress value={job.value} className="mt-2"/><p className="mt-2 text-right text-[10px] text-slate-500">{job.value}% concluído</p></div>)}</CardContent></Card>
    <section className="mt-5 grid gap-4 sm:grid-cols-3"><AlertBox icon={PackageOpen} title="2 itens com estoque baixo" detail="PLA Branco e Resina Cinza" tone="orange"/><AlertBox icon={Clock3} title="18h de produção agendada" detail="Capacidade livre amanhã: 11h" tone="blue"/><AlertBox icon={WalletCards} title="R$ 2.350 a receber" detail="5 lançamentos em aberto" tone="green"/></section>
  </>;
}

const moduleData: Record<Exclude<View, 'Visão geral' | 'Orçamentos' | 'Produção' | 'Configurações'>, { title: string; detail: string; headers: string[]; rows: string[][]; action: string }> = {
  Pedidos: { title: '12 pedidos ativos', detail: 'Do orçamento aprovado até a entrega', headers: ['Pedido', 'Cliente', 'Trabalho', 'Responsável', 'Prazo', 'Status'], rows: [['#1048', 'Lumina Arquitetura', 'Maquete residencial', 'Carlos', 'Hoje, 16:00', 'Em produção'], ['#1047', 'Studio Objeto', 'Kit 12 expositores', 'Marina', 'Amanhã', 'Aguardando'], ['#1046', 'Rafael Martins', 'Engrenagem técnica', 'Carlos', '30 ago', 'Acabamento'], ['#1045', 'Clínica Orto+', 'Modelo anatômico', 'Marina', '02 set', 'Aprovado']], action: 'Novo pedido' },
  Estoque: { title: 'Estoque de materiais', detail: 'Filamentos, resinas, peças e embalagens', headers: ['Material', 'Tipo / cor', 'Marca', 'Disponível', 'Custo médio', 'Situação'], rows: [['PLA Branco Neve', 'PLA · Branco', '3D Fila', '420 g', 'R$ 92/kg', 'Estoque baixo'], ['PETG Preto', 'PETG · Preto', 'Voolt3D', '1,8 kg', 'R$ 108/kg', 'Normal'], ['Resina Cinza', 'Standard · Cinza', 'Anycubic', '310 ml', 'R$ 146/L', 'Estoque baixo'], ['PLA Laranja', 'PLA · Laranja', '3D Fila', '2,4 kg', 'R$ 96/kg', 'Normal']], action: 'Entrada de material' },
  Clientes: { title: '86 clientes cadastrados', detail: 'Relacionamento e histórico comercial', headers: ['Cliente', 'Contato', 'Pedidos', 'Último pedido', 'Faturamento', 'Situação'], rows: [['Lumina Arquitetura', '(11) 99945-2231', '14', '28 ago', 'R$ 8.420,00', 'Ativo'], ['Studio Objeto', '(11) 98872-0198', '8', '27 ago', 'R$ 4.180,00', 'Ativo'], ['Clínica Orto+', '(11) 99128-6330', '5', '25 ago', 'R$ 3.750,00', 'Ativo'], ['Rafael Martins', '(11) 98041-7212', '3', '24 ago', 'R$ 860,00', 'Pessoa física']], action: 'Novo cliente' },
  Financeiro: { title: 'Financeiro de agosto', detail: 'Receitas, custos e resultado operacional', headers: ['Lançamento', 'Categoria', 'Vencimento', 'Forma', 'Valor', 'Situação'], rows: [['Pedido #1048', 'Receita de venda', '29 ago', 'PIX', 'R$ 1.480,00', 'A receber'], ['Fornecedor 3D Fila', 'Material', '30 ago', 'Boleto', '- R$ 820,00', 'Agendado'], ['Pedido #1046', 'Receita de venda', '28 ago', 'Cartão', 'R$ 295,00', 'Recebido'], ['Energia elétrica', 'Custo fixo', '05 set', 'Débito', '- R$ 486,00', 'Agendado']], action: 'Novo lançamento' },
};

function Module({ view, quotes, onNewQuote, onEditQuote, onDeleteQuote, user }: { view: Exclude<View, 'Visão geral'>; quotes: Quote[]; onNewQuote: () => void; onEditQuote: (quote: Quote) => void; onDeleteQuote: (quote: Quote) => void; user: { name: string; email: string } }) {
  if (view === 'Orçamentos') return <QuotesView quotes={quotes} onNewQuote={onNewQuote} onEdit={onEditQuote} onDelete={onDeleteQuote}/>;
  if (view === 'Pedidos') return <OrdersView />;
  if (view === 'Produção') return <Production />;
  if (view === 'Estoque') return <FinishedParts />;
  if (view === 'Clientes') return <CustomersView />;
  if (view === 'Financeiro') return <FinanceView />;
  if (view === 'Configurações') return <SettingsView user={user} />;
  const data = moduleData[view];
  return <ModuleShell title={data.title} detail={data.detail} action={data.action}><DataTable headers={data.headers} rows={data.rows}/>{view === 'Financeiro' && <div className="grid gap-4 border-t bg-slate-50 p-4 sm:grid-cols-3"><Summary label="Receitas" value="R$ 18.740,00" color="text-emerald-600"/><Summary label="Despesas" value="R$ 11.820,00" color="text-red-600"/><Summary label="Resultado" value="R$ 6.920,00" color="text-blue-600"/></div>}</ModuleShell>;
}

function OrdersView() {
  const [orders, setOrders] = useState<Array<{ id: string; customer: string; items: string; quantity: number; total: number; status: string; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void fetch('/api/orders').then(response => response.ok ? response.json() : Promise.reject()).then(result => setOrders(result as typeof orders)).catch(() => setOrders([])).finally(() => setLoading(false)); }, []);
  const rows = orders.map(order => [order.id, order.customer, `${order.items} · ${order.quantity} un.`, order.createdAt, brl(order.total), order.status]);
  return <ModuleShell title={`${orders.length} pedidos salvos`} detail="Pedidos finalizados pelo carrinho de peças" action="Novo pedido"><DataTable headers={['Pedido','Cliente','Itens','Criado em','Valor','Status']} rows={rows}/>{loading && <p className="p-6 text-center text-sm text-slate-400">Carregando pedidos...</p>}{!loading && !orders.length && <p className="p-6 text-center text-sm text-slate-400">Nenhum pedido finalizado.</p>}</ModuleShell>;
}

function CustomersView() {
  const [customers, setCustomers] = useState<Array<Customer & { orders: number; lastOrder: string; total: number }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void fetch('/api/customers').then(response => response.ok ? response.json() : Promise.reject()).then(result => setCustomers(result as typeof customers)).catch(() => setCustomers([])).finally(() => setLoading(false)); }, []);
  const rows = customers.map(customer => [customer.name, customer.phone || customer.email || 'Sem contato', String(customer.orders), customer.lastOrder, brl(customer.total), 'Ativo']);
  return <ModuleShell title={`${customers.length} clientes cadastrados`} detail="Clientes e histórico das vendas registradas" action="Novo cliente"><DataTable headers={['Cliente','Contato','Pedidos','Último pedido','Faturamento','Situação']} rows={rows}/>{loading && <p className="p-6 text-center text-sm text-slate-400">Carregando clientes...</p>}</ModuleShell>;
}

function FinanceView() {
  const [transactions, setTransactions] = useState<Array<{ id: string; orderId: string; type: string; category: string; description: string; amount: number; paymentMethod: string; status: string; dueAt: string }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void fetch('/api/transactions').then(response => response.ok ? response.json() : Promise.reject()).then(result => setTransactions(result as typeof transactions)).catch(() => setTransactions([])).finally(() => setLoading(false)); }, []);
  const income = transactions.filter(item => item.type === 'Receita').reduce((total, item) => total + item.amount, 0);
  const expenses = transactions.filter(item => item.type === 'Despesa').reduce((total, item) => total + item.amount, 0);
  const rows = transactions.map(item => [item.orderId, item.category, item.dueAt, item.paymentMethod, brl(item.amount), item.status]);
  return <ModuleShell title="Financeiro das vendas" detail="Receitas geradas pelos pedidos finalizados" action="Novo lançamento"><DataTable headers={['Pedido','Categoria','Data','Forma','Valor','Situação']} rows={rows}/>{loading && <p className="p-6 text-center text-sm text-slate-400">Carregando lançamentos...</p>}<div className="grid gap-4 border-t bg-slate-50 p-4 sm:grid-cols-3"><Summary label="Receitas" value={brl(income)} color="text-emerald-600"/><Summary label="Despesas" value={brl(expenses)} color="text-red-600"/><Summary label="Resultado" value={brl(income - expenses)} color="text-blue-600"/></div></ModuleShell>;
}

type FinishedPart = { id: string; sku: string; name: string; detail: string; stock: number; color: string; cost: number; price: number };
type CartItem = { partId: string; quantity: number; unitPrice: number };
type Customer = { id: string; name: string; phone: string; email: string };
type Supply = { id: string; name: string; type: string; quantity: number; unit: string; unitCost: number; supplier: string };

function FinishedParts() {
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
  const finalizeSale = async () => {
    setFinalizing(true);
    try {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ customerId: assignedCustomer?.id ?? null, items: cart }) });
      const result = await response.json() as { id?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'Não foi possível finalizar o pedido');
      setCart([]);
      setAssignedCustomer(null);
      setCartOpen(false);
      setDataNotice(`${result.id} salvo. Estoque, pedido e financeiro atualizados.`);
      await loadParts();
    } catch (error) { setDataNotice(error instanceof Error ? error.message : 'Não foi possível finalizar o pedido.'); }
    finally { setFinalizing(false); }
  };
  const openCustomerSelection = () => { setCartOpen(false); setCustomerOpen(true); };
  const openQuoteEditor = () => { setCartOpen(false); setQuoteEditorOpen(true); };
  const assignCustomer = (customer: Customer) => { setAssignedCustomer(customer); setCustomerOpen(false); setCartOpen(true); };
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
    <SalesCartDialog open={cartOpen} onOpenChange={setCartOpen} parts={parts} cart={cart} onCartChange={setCart} onFinalize={finalizeSale} onAddToCustomer={openCustomerSelection} onPrint={openQuoteEditor} assignedCustomer={assignedCustomer} finalizing={finalizing}/>
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
  const saveSupply = async (supply: Supply) => {
    try {
      const response = await fetch('/api/supplies', { method: editing ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(supply) });
      const result = await response.json() as Supply & { error?: string };
      if (!response.ok) throw new Error(result.error || 'Não foi possível salvar o insumo');
      setSupplies(current => (editing ? current.map(item => item.id === result.id ? result : item) : [result, ...current]).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      setDialogOpen(false);
      setNotice('Insumo salvo permanentemente no banco de dados.');
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

function SupplyDialog({ open, onOpenChange, initial, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; initial: Supply | null; onSave: (supply: Supply) => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState(initial?.type ?? 'Outro');
  const [quantity, setQuantity] = useState(initial?.quantity ?? 0);
  const [unit, setUnit] = useState(initial?.unit ?? 'un');
  const [unitCost, setUnitCost] = useState(initial?.unitCost ?? 0);
  const [supplier, setSupplier] = useState(initial?.supplier ?? '');
  const submit = () => onSave({ id: initial?.id ?? '', name: name.trim(), type: type.trim() || 'Outro', quantity, unit: unit.trim() || 'un', unitCost, supplier: supplier.trim() });
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{initial ? 'Editar insumo' : 'Novo insumo'}</DialogTitle><DialogDescription>Cadastre materiais extras usados na montagem e entrega dos produtos.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome do insumo *"><Input value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Argola Italiana"/></Field><Field label="Tipo"><Input value={type} onChange={event => setType(event.target.value)} placeholder="Ex.: Embalagem, chaveiro ou outro"/></Field><Field label="Quantidade em estoque"><Input type="number" min="0" step=".01" value={quantity} onChange={event => setQuantity(Math.max(0, Number(event.target.value)))}/></Field><Field label="Unidade"><Input value={unit} onChange={event => setUnit(event.target.value)} placeholder="un, m, kg, ml..."/></Field><Field label="Custo unitário (R$)"><Input type="number" min="0" step=".01" value={unitCost} onChange={event => setUnitCost(Math.max(0, Number(event.target.value)))}/></Field><Field label="Fornecedor"><Input value={supplier} onChange={event => setSupplier(event.target.value)} placeholder="Ex.: Shopee"/></Field></div><div className="rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800">Valor atual em estoque: <b>{brl(quantity * unitCost)}</b></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit} disabled={!name.trim()} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]">{initial ? 'Salvar alterações' : 'Adicionar insumo'}</Button></DialogFooter></DialogContent></Dialog>;
}

function SalesCartDialog({ open, onOpenChange, parts, cart, onCartChange, onFinalize, onAddToCustomer, onPrint, assignedCustomer, finalizing }: { open: boolean; onOpenChange: (open: boolean) => void; parts: FinishedPart[]; cart: CartItem[]; onCartChange: (items: CartItem[]) => void; onFinalize: () => void; onAddToCustomer: () => void; onPrint: () => void; assignedCustomer: Customer | null; finalizing: boolean }) {
  const rows = cart.flatMap(item => { const part = parts.find(candidate => candidate.id === item.partId); return part ? [{ item, part }] : []; });
  const totalCost = rows.reduce((total, row) => total + row.part.cost * row.item.quantity, 0);
  const totalSale = rows.reduce((total, row) => total + row.item.unitPrice * row.item.quantity, 0);
  const estimatedProfit = totalSale - totalCost;
  const update = (partId: string, values: Partial<CartItem>) => onCartChange(cart.map(item => item.partId === partId ? { ...item, ...values } : item));

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto border-white/20 bg-[#124787] text-white sm:max-w-2xl">
    <DialogHeader><DialogTitle className="flex items-center gap-2 text-xl text-white"><ShoppingCart className="size-5 text-[#ff6b35]"/> Carrinho de Vendas</DialogTitle><DialogDescription className="text-slate-200">Ajuste preços, quantidades e finalize o pedido ou imprima o orçamento.</DialogDescription></DialogHeader>
    {rows.length === 0 ? <div className="rounded-xl border border-dashed border-white/35 px-5 py-12 text-center"><ShoppingCart className="mx-auto size-8 text-white/55"/><p className="mt-3 text-sm font-medium">Seu carrinho está vazio</p><p className="mt-1 text-xs text-white/70">Clique em “Vender” em uma peça para adicioná-la.</p></div> : <div className="space-y-3">{rows.map(({ item, part }) => <div key={part.id} className="rounded-xl border border-white/20 bg-black/10 p-4">
      <div className="flex items-start justify-between gap-3"><div><b className="text-sm">{part.sku} — {part.name}</b><p className="text-[11px] text-slate-400">Estoque disponível: {part.stock} un.</p></div><Button onClick={() => onCartChange(cart.filter(candidate => candidate.partId !== part.id))} aria-label={`Remover ${part.name} do carrinho`} variant="ghost" size="icon" className="text-slate-400 hover:bg-white/10 hover:text-white"><X/></Button></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1.35fr]">
        <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/70">Quantidade</p><div className="flex items-center gap-1"><Button onClick={() => update(part.id, { quantity: Math.max(1, item.quantity - 1) })} variant="outline" size="icon" className="border-white/30 bg-transparent text-white hover:bg-white/10"><Minus/></Button><div className="grid h-9 min-w-16 place-items-center rounded-lg bg-white/20 text-sm font-bold">{item.quantity}</div><Button onClick={() => update(part.id, { quantity: Math.min(part.stock, item.quantity + 1) })} variant="outline" size="icon" className="border-white/30 bg-transparent text-white hover:bg-white/10"><Plus/></Button></div></div>
        <Field label="Preço unitário (R$)" dark><Input type="number" min="0" step=".01" value={item.unitPrice} onChange={event => update(part.id, { unitPrice: Math.max(0, Number(event.target.value)) })} className="border-white/30 bg-white/20 text-white"/></Field>
      </div>
      <div className="mt-4 flex justify-between border-t border-slate-700 pt-3 text-xs text-slate-400"><span>Custo: <b className="text-slate-200">{brl(part.cost * item.quantity)}</b></span><span className="font-semibold text-[#ff8358]">Subtotal: {brl(item.unitPrice * item.quantity)}</span></div>
    </div>)}</div>}
    {rows.length > 0 && <><div className="rounded-xl border border-[#ff6b35]/60 bg-black/10 p-4"><div className="flex justify-between text-sm text-white/80"><span>↗ Custo total</span><b className="text-white">{brl(totalCost)}</b></div><div className="mt-2 flex justify-between text-sm text-white/80"><span>$ Lucro estimado</span><b className="text-emerald-300">{brl(estimatedProfit)}</b></div><div className="mt-4 flex items-center justify-between border-t border-white/20 pt-4"><b>Total da venda</b><b className="text-2xl text-[#ff6b35]">{brl(totalSale)}</b></div></div>
      {assignedCustomer && <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"><UserPlus className="size-4"/> Pedido vinculado a <b>{assignedCustomer.name}</b></div>}
      <div className="grid gap-2 sm:grid-cols-3"><Button onClick={onPrint} variant="outline" className="border-slate-600 bg-transparent text-white hover:bg-white/10"><Printer/> Imprimir orçamento</Button><Button onClick={onAddToCustomer} variant="outline" className="border-[#ff8358]/50 bg-[#ff6b35]/10 text-[#ff9b77] hover:bg-[#ff6b35]/20 hover:text-white"><UserPlus/> {assignedCustomer ? 'Trocar cliente' : 'Adicionar ao cliente'}</Button><Button onClick={onFinalize} disabled={finalizing} className="bg-[#ff6b35] text-white shadow-lg shadow-[#ff6b35]/20 hover:bg-[#e85c2b]"><CheckCircle2/> {finalizing ? 'Salvando...' : 'Finalizar pedido'}</Button></div>
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

function CustomerOrderDialog({ open, onOpenChange, onSelect }: { open: boolean; onOpenChange: (open: boolean) => void; onSelect: (customer: Customer) => void }) {
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
        if (customer) onSelect(customer);
      } else {
        const response = await fetch('/api/customers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, phone, email }) });
        const customer = await response.json() as Customer & { error?: string };
        if (!response.ok) throw new Error(customer.error || 'Não foi possível criar o cliente');
        setCustomers(current => [...current, customer].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
        onSelect(customer);
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

function QuotesView({ quotes, onNewQuote, onEdit, onDelete }: { quotes: Quote[]; onNewQuote: () => void; onEdit: (quote: Quote) => void; onDelete: (quote: Quote) => void }) {
  const shareOnWhatsApp = (quote: Quote) => {
    const message = `Olá! Segue o orçamento ${quote.id} da Imprimo3DLab.\nCliente: ${quote.client}\nItem: ${quote.item}\nValor: ${quote.total}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };
  return <ModuleShell title={`${quotes.length} orçamentos recentes`} detail="Crie, edite e converta propostas em pedidos" action="Novo orçamento" onAction={onNewQuote}>
    <div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left"><thead><tr className="border-b bg-slate-50 text-[10px] uppercase tracking-[.08em] text-slate-400">{['Orçamento','Cliente','Item','Criado em','Valor','Status','','Ações'].map((header, index) => <th key={`${header}-${index}`} className="px-4 py-3 font-semibold">{header}</th>)}</tr></thead><tbody>{quotes.map(quote => <tr key={quote.id} className="border-b last:border-0 hover:bg-slate-50/60"><td className="px-4 py-3 text-xs font-semibold">{quote.id}</td><td className="px-4 py-3 text-xs text-slate-600">{quote.client}</td><td className="px-4 py-3 text-xs text-slate-600">{quote.item}</td><td className="px-4 py-3 text-xs text-slate-600">{quote.date}</td><td className="px-4 py-3 text-xs text-slate-600">{quote.total}</td><td className="px-4 py-3"><Badge variant="secondary" className="bg-blue-50 text-blue-700">{quote.status}</Badge></td><td className="px-1 py-2"><Button onClick={() => shareOnWhatsApp(quote)} variant="ghost" size="icon" aria-label={`Enviar ${quote.id} pelo WhatsApp`} title="Enviar pelo WhatsApp" className="text-[#25D366] hover:bg-emerald-50 hover:text-[#1da851]"><MessageCircle/></Button></td><td className="px-4 py-2"><div className="flex gap-1"><Button onClick={() => onEdit(quote)} variant="ghost" size="icon" aria-label={`Editar ${quote.id}`} className="text-[#0068ff] hover:bg-blue-50"><Pencil/></Button><Button onClick={() => onDelete(quote)} variant="ghost" size="icon" aria-label={`Apagar ${quote.id}`} className="text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2/></Button></div></td></tr>)}</tbody></table></div>
  </ModuleShell>;
}

function ModuleShell({ title, detail, action, onAction, children }: { title: string; detail: string; action: string; onAction?: () => void; children: React.ReactNode }) {
  return <><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-bold">{title}</h2><p className="text-sm text-slate-500">{detail}</p></div><Button onClick={onAction} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]"><Plus/>{action}</Button></div><Card className="border-0 bg-white py-0 shadow-sm ring-1 ring-[#e6eaf0]"><div className="flex flex-wrap items-center gap-3 border-b p-4"><div className="flex w-full max-w-sm items-center gap-2 rounded-lg border bg-slate-50 px-3"><Search className="size-4 text-slate-400"/><input className="h-9 flex-1 bg-transparent text-sm outline-none" placeholder="Filtrar resultados..."/></div><Badge variant="outline">Todos</Badge><Badge variant="outline">Em andamento</Badge><Badge variant="outline">Concluídos</Badge></div>{children}</Card></>;
}

function Production() {
  const [stages, setStages] = useState(['Imprimindo', 'Imprimindo', 'Preparação', 'Fila']);
  const items = [['Bambu Lab X1C', '#1048 · Maquete residencial', 'Carlos', '64%'], ['Creality K1 Max', '#1046 · Engrenagem técnica', 'Marina', '82%'], ['Elegoo Saturn 3', '#1045 · Modelo anatômico', 'Carlos', '18%'], ['Prusa MK4', '#1047 · Kit expositores', 'Marina', '0%']];
  const advance = (i: number) => setStages(s => s.map((v, index) => index === i ? (v === 'Fila' ? 'Preparação' : v === 'Preparação' ? 'Imprimindo' : v === 'Imprimindo' ? 'Acabamento' : 'Concluído') : v));
  return <><div className="mb-5"><h2 className="text-2xl font-bold">Painel de produção</h2><p className="text-sm text-slate-500">Atualize cada trabalho conforme ele avança</p></div><div className="grid gap-4 lg:grid-cols-2">{items.map((item, i) => <Card key={item[0]} className="border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>{item[0]}</CardTitle><p className="text-xs text-slate-500">{item[1]}</p></div><Badge className="bg-blue-50 text-blue-700">{stages[i]}</Badge></CardHeader><CardContent><div className="mb-3 flex justify-between text-xs text-slate-500"><span>Responsável: {item[2]}</span><b>{item[3]}</b></div><Progress value={Number(item[3].replace('%',''))}/><Button onClick={() => advance(i)} variant="outline" className="mt-4 w-full">Avançar etapa <ChevronRight/></Button></CardContent></Card>)}</div></>;
}

function SettingsView({ user }: { user: { name: string; email: string } }) {
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
      <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader><CardTitle>Parâmetros de precificação</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><Setting label="Energia (R$/kWh)" value="0,86"/><Setting label="Máquina (R$/hora)" value="3,40"/><Setting label="Embalagem padrão" value="8,00"/><Setting label="Margem padrão (%)" value="35"/><Setting label="Taxas / impostos (%)" value="8"/><Setting label="Perdas padrão (%)" value="5"/></CardContent></Card>
      <Card className="border-0 bg-[var(--brand-blue)] text-white shadow-sm ring-0"><CardHeader><CardTitle className="text-white">Pronto para evoluir</CardTitle></CardHeader><CardContent className="space-y-2 text-xs text-white/80">{['PDF de orçamento com identidade visual','Envio por WhatsApp','Upload de STL / 3MF e fotos','Histórico completo de alterações','Integrações com marketplaces'].map(x => <p key={x}>○ {x}</p>)}</CardContent></Card>
    </div>
  </div>;
}

function QuoteDialog({ open, onOpenChange, onSave, sequence }: { open: boolean; onOpenChange: (v: boolean) => void; onSave: (q: Quote, p: Record<string, unknown>) => void; sequence: number }) {
  const [client, setClient] = useState(''); const [item, setItem] = useState(''); const [grams, setGrams] = useState(180); const [hours, setHours] = useState(9.5); const [energyRate, setEnergyRate] = useState(.86); const [machineRate, setMachineRate] = useState(3.4); const [packaging, setPackaging] = useState(8); const [fees, setFees] = useState(8); const [margin, setMargin] = useState(35);
  const [quantity, setQuantity] = useState(1); const [customUnitPrice, setCustomUnitPrice] = useState<number | null>(null);
  const calc = useMemo(() => { const material = grams * .095; const energy = hours * energyRate; const machine = hours * machineRate; const base = material + energy + machine + packaging; const feeValue = base * fees / 100; return { material, energy, machine, feeValue, total: (base + feeValue) / (1 - margin / 100) }; }, [grams, hours, energyRate, machineRate, packaging, fees, margin]);
  const unitPrice = customUnitPrice ?? Number(calc.total.toFixed(2));
  const finalTotal = quantity * unitPrice;
  const submit = () => { if (!client.trim() || !item.trim() || quantity <= 0 || unitPrice <= 0) return; const id = `ORC-${sequence}`; onSave({ id, client, item, date: '29 ago', total: brl(finalTotal), status: 'Rascunho', quantity, unitPrice }, { id, client, item, grams, hours, energyRate, machineRate, packaging, fees, margin, quantity, unitPrice, total: finalTotal }); setClient(''); setItem(''); setQuantity(1); setCustomUnitPrice(null); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle className="text-lg">Novo orçamento</DialogTitle><DialogDescription>Informe a peça, a quantidade e o valor unitário. O total é atualizado automaticamente.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Cliente *"><Input value={client} onChange={e => setClient(e.target.value)} placeholder="Nome do cliente"/></Field><Field label="Peça / trabalho *"><Input value={item} onChange={e => setItem(e.target.value)} placeholder="Ex.: Maquete residencial"/></Field><Field label="Quantidade *"><Input type="number" min="1" step="1" value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}/></Field><Field label="Valor unitário (R$) *"><Input type="number" min="0" step=".01" value={unitPrice} onChange={e => setCustomUnitPrice(Math.max(0, Number(e.target.value)))}/></Field><Field label="Material por unidade (gramas)"><Input type="number" value={grams} onChange={e => setGrams(Number(e.target.value))}/></Field><Field label="Tempo por unidade (horas)"><Input type="number" step=".5" value={hours} onChange={e => setHours(Number(e.target.value))}/></Field><Field label="Energia (R$/kWh)"><Input type="number" step=".01" value={energyRate} onChange={e => setEnergyRate(Number(e.target.value))}/></Field><Field label="Depreciação da máquina (R$/h)"><Input type="number" step=".1" value={machineRate} onChange={e => setMachineRate(Number(e.target.value))}/></Field><Field label="Embalagem (R$)"><Input type="number" value={packaging} onChange={e => setPackaging(Number(e.target.value))}/></Field><Field label="Taxas / impostos (%)"><Input type="number" value={fees} onChange={e => setFees(Number(e.target.value))}/></Field><Field label="Margem de lucro (%)"><Input type="number" value={margin} onChange={e => setMargin(Number(e.target.value))}/></Field><Field label="Observações"><Textarea placeholder="Acabamento, cor, tolerâncias..."/></Field></div><div className="grid gap-2 rounded-xl bg-[var(--brand-blue)] p-4 text-xs text-white/80 sm:grid-cols-3"><span>Material/un.: <b className="text-white">{brl(calc.material)}</b></span><span>Energia/un.: <b className="text-white">{brl(calc.energy)}</b></span><span>Máquina/un.: <b className="text-white">{brl(calc.machine)}</b></span><span>Quantidade: <b className="text-white">{quantity}</b></span><span>Valor unitário: <b className="text-white">{brl(unitPrice)}</b></span><span className="text-sm text-white">Total: <b className="text-lg text-[#ff8358]">{brl(finalTotal)}</b></span></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit} disabled={!client.trim() || !item.trim() || quantity <= 0 || unitPrice <= 0} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]">Salvar orçamento</Button></DialogFooter></DialogContent></Dialog>;
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b bg-slate-50 text-[10px] uppercase tracking-[.08em] text-slate-400">{headers.map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={`${row[0]}-${i}`} className="border-b last:border-0 hover:bg-slate-50/60">{row.map((cell, j) => <td key={j} className={`px-4 py-3 text-xs ${j === 0 ? 'font-semibold' : 'text-slate-600'}`}>{j === row.length - 1 ? <Badge variant="secondary" className="bg-blue-50 text-blue-700">{cell}</Badge> : cell}</td>)}</tr>)}</tbody></table></div>; }
function AlertBox({ icon: Icon, title, detail, tone }: { icon: React.ElementType; title: string; detail: string; tone: string }) { return <div className="flex items-center gap-3 rounded-xl border bg-white p-4"><div className={`metric-icon metric-${tone}`}><Icon className="size-4"/></div><div><p className="text-xs font-bold">{title}</p><p className="text-[11px] text-slate-500">{detail}</p></div></div>; }
function Summary({ label, value, color }: { label: string; value: string; color: string }) { return <div><p className="text-xs text-slate-500">{label}</p><p className={`text-xl font-bold ${color}`}>{value}</p></div>; }
function Setting({ label, value }: { label: string; value: string }) { return <Field label={label}><Input defaultValue={value}/></Field>; }
function Field({ label, children, dark = false }: { label: string; children: React.ReactNode; dark?: boolean }) { return <label className={`text-xs font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{label}<div className="mt-1">{children}</div></label>; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'AD'; }
function firstName(name: string) { return name.trim().split(/\s+/)[0] || 'Administrador'; }
