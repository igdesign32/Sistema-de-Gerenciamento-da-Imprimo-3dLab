'use client';

import { useMemo, useState } from 'react';
import {
  Boxes, Calculator, ChevronRight, CircleDollarSign, Clock3, Factory,
  FileText, HandCoins, LayoutDashboard, Menu, PackageOpen, Pencil, Plus, Search,
  Settings, ShoppingBag, ShoppingCart, Trash2, TrendingUp, UserCog, Users, WalletCards, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

type View = 'Visão geral' | 'Orçamentos' | 'Pedidos' | 'Produção' | 'Estoque' | 'Clientes' | 'Financeiro' | 'Configurações';
type Quote = { id: string; client: string; item: string; date: string; total: string; status: string };

const nav: [React.ElementType, View][] = [
  [LayoutDashboard, 'Visão geral'], [FileText, 'Orçamentos'], [ShoppingBag, 'Pedidos'],
  [Factory, 'Produção'], [Boxes, 'Estoque'], [Users, 'Clientes'],
  [CircleDollarSign, 'Financeiro'], [Settings, 'Configurações'],
];
const brl = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const seedQuotes: Quote[] = [
  { id: 'ORC-1052', client: 'Ateliê Norte', item: 'Luminária Voronoi', date: '29 ago', total: 'R$ 428,00', status: 'Rascunho' },
  { id: 'ORC-1051', client: 'Lumina Arquitetura', item: 'Maquete residencial', date: '28 ago', total: 'R$ 1.480,00', status: 'Aprovado' },
  { id: 'ORC-1050', client: 'Clínica Orto+', item: 'Modelo anatômico', date: '27 ago', total: 'R$ 720,00', status: 'Enviado' },
];

export function SystemApp({ user, signOutPath }: { user: { name: string; email: string }; signOutPath: string }) {
  const [view, setView] = useState<View>('Visão geral');
  const [menu, setMenu] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quotes, setQuotes] = useState(seedQuotes);
  const [notice, setNotice] = useState('');

  const selectView = (next: View) => { setView(next); setMenu(false); };
  const saveQuote = async (quote: Quote, payload: Record<string, unknown>) => {
    setQuotes(current => [quote, ...current]);
    setQuoteOpen(false);
    setView('Orçamentos');
    setNotice(`${quote.id} salvo com sucesso.`);
    window.setTimeout(() => setNotice(''), 3500);
    try { await fetch('/api/quotes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); } catch { /* UI remains useful offline */ }
  };

  return <div className="min-h-screen bg-[#f4f7fb] text-[#172033]">
    <Sidebar view={view} menu={menu} onClose={() => setMenu(false)} onSelect={selectView} user={user} signOutPath={signOutPath} />
    {menu && <button aria-label="Fechar menu" className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setMenu(false)} />}
    <main className="lg:pl-[238px]">
      <header className="sticky top-0 z-20 flex h-[76px] items-center border-b border-[#e4e9f1] bg-white/95 px-4 backdrop-blur sm:px-7">
        <button className="mr-3 lg:hidden" aria-label="Abrir menu" onClick={() => setMenu(true)}><Menu /></button>
        <div><h1 className="text-lg font-bold tracking-tight sm:text-xl">{view}</h1><p className="hidden text-xs text-slate-500 sm:block">Forma3D • Sexta-feira, 29 de agosto</p></div>
        <div className="ml-auto hidden w-64 items-center gap-2 rounded-lg border border-[#dfe5ee] bg-[#f8fafc] px-3 md:flex"><Search className="size-4 text-slate-400" /><input className="h-9 w-full bg-transparent text-sm outline-none" placeholder="Buscar em todo o sistema..." /></div>
        <Button onClick={() => setQuoteOpen(true)} className="ml-3 h-10 bg-[#ff6b35] px-4 text-white hover:bg-[#e85c2b]"><Plus /><span className="hidden sm:inline">Novo orçamento</span></Button>
      </header>
      <div className="mx-auto max-w-[1500px] p-4 sm:p-7">
        {view === 'Visão geral' ? <Dashboard onNavigate={selectView} onNewQuote={() => setQuoteOpen(true)} userName={user.name} /> : <Module view={view} quotes={quotes} onNewQuote={() => setQuoteOpen(true)} user={user} />}
      </div>
    </main>
    <QuoteDialog open={quoteOpen} onOpenChange={setQuoteOpen} onSave={saveQuote} sequence={1053 + quotes.length - seedQuotes.length} />
    {notice && <output className="fixed bottom-5 right-5 z-[70] rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-xl">{notice}</output>}
  </div>;
}

function Sidebar({ view, menu, onClose, onSelect, user, signOutPath }: { view: View; menu: boolean; onClose: () => void; onSelect: (v: View) => void; user: { name: string; email: string }; signOutPath: string }) {
  return <aside className={`fixed inset-y-0 left-0 z-40 flex w-[238px] flex-col bg-[#101a2d] text-white transition-transform lg:translate-x-0 ${menu ? 'translate-x-0' : '-translate-x-full'}`}>
    <div className="flex h-[76px] items-center gap-3 border-b border-white/8 px-5"><div className="grid size-10 place-items-center rounded-xl bg-[#ff6b35] shadow-[0_8px_24px_rgba(255,107,53,.28)]"><Boxes className="size-5" /></div><div><p className="text-[17px] font-bold">Forma<span className="text-[#ff8c61]">3D</span></p><p className="text-[10px] uppercase tracking-[.17em] text-slate-400">Gestão de impressão</p></div><button className="ml-auto lg:hidden" aria-label="Fechar menu" onClick={onClose}><X className="size-5" /></button></div>
    <nav className="flex-1 space-y-1 px-3 py-5"><p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500">Operação</p>{nav.map(([Icon, label]) => <button key={label} onClick={() => onSelect(label)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${view === label ? 'bg-white/10 font-semibold text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Icon className={`size-[18px] ${view === label ? 'text-[#ff8358]' : ''}`} />{label}{label === 'Produção' && <span className="ml-auto rounded-full bg-[#ff6b35] px-1.5 text-[10px]">3</span>}</button>)}</nav>
    <div className="m-3 rounded-xl border border-white/8 bg-white/5 p-3.5"><div className="flex items-center gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#2d4162] text-xs font-bold">{initials(user.name)}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{user.name}</p><p className="text-[11px] text-slate-400">Administrador</p></div></div><a href={signOutPath} target="_top" className="mt-3 block border-t border-white/10 pt-2 text-center text-[11px] font-medium text-slate-400 transition hover:text-white">Sair do sistema</a></div>
  </aside>;
}

function Dashboard({ onNavigate, onNewQuote, userName }: { onNavigate: (v: View) => void; onNewQuote: () => void; userName: string }) {
  const jobs = [{ name: 'Bambu Lab X1C', detail: 'Maquete • peças 8/14', value: 64 }, { name: 'Creality K1 Max', detail: 'Engrenagem técnica', value: 82 }, { name: 'Elegoo Saturn 3', detail: 'Modelo anatômico', value: 18 }];
  return <>
    <div className="mb-6 flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><p className="text-sm text-slate-500">Olá, {firstName(userName)}.</p><h2 className="text-2xl font-bold tracking-[-.025em]">Sua produção está no ritmo certo.</h2></div><span className="text-xs text-slate-500">● Atualizado agora</span></div>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      [HandCoins, 'Faturamento no mês', 'R$ 18.740', '+12,4%', 'green'], [ShoppingBag, 'Pedidos ativos', '12', '4 entregas nesta semana', 'blue'], [Factory, 'Máquinas em uso', '3 de 5', '60% da capacidade', 'orange'], [TrendingUp, 'Lucro estimado', 'R$ 6.920', '36,9% de margem', 'violet'],
    ].map(([Icon, label, value, detail, color]) => <Card key={String(label)} className="gap-3 border-0 bg-white py-4 shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader className="flex flex-row items-center justify-between px-4"><CardTitle className="text-xs text-slate-500">{label}</CardTitle><div className={`metric-icon metric-${color}`}><Icon className="size-4" /></div></CardHeader><CardContent className="px-4"><p className="text-2xl font-bold">{value}</p><p className="mt-1 text-[11px] text-slate-500">{detail}</p></CardContent></Card>)}</section>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_.75fr]">
      <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader className="flex flex-row items-center justify-between border-b"><div><CardTitle>Pedidos recentes</CardTitle><p className="text-xs text-slate-500">Prazos e andamento da operação</p></div><Button variant="ghost" onClick={() => onNavigate('Pedidos')} className="text-[#e65d2c]">Ver todos</Button></CardHeader><CardContent className="overflow-x-auto px-0"><DataTable headers={['Pedido / cliente', 'Trabalho', 'Prazo', 'Valor', 'Status']} rows={[
        ['#1048 · Lumina Arquitetura', 'Maquete residencial', 'Hoje, 16:00', 'R$ 1.480,00', 'Em produção'], ['#1047 · Studio Objeto', 'Kit 12 expositores', 'Amanhã', 'R$ 864,00', 'Aguardando'], ['#1046 · Rafael Martins', 'Engrenagem técnica', '30 ago', 'R$ 295,00', 'Acabamento'], ['#1045 · Clínica Orto+', 'Modelo anatômico', '02 set', 'R$ 720,00', 'Aprovado'],
      ]} /></CardContent></Card>
      <QuickCalculator onCreate={onNewQuote} />
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

function Module({ view, quotes, onNewQuote, user }: { view: Exclude<View, 'Visão geral'>; quotes: Quote[]; onNewQuote: () => void; user: { name: string; email: string } }) {
  if (view === 'Orçamentos') return <ModuleShell title={`${quotes.length} orçamentos recentes`} detail="Crie, envie e converta propostas em pedidos" action="Novo orçamento" onAction={onNewQuote}><DataTable headers={['Orçamento', 'Cliente', 'Item', 'Criado em', 'Valor', 'Status']} rows={quotes.map(q => [q.id, q.client, q.item, q.date, q.total, q.status])}/></ModuleShell>;
  if (view === 'Produção') return <Production />;
  if (view === 'Estoque') return <FinishedParts />;
  if (view === 'Configurações') return <SettingsView user={user} />;
  const data = moduleData[view];
  return <ModuleShell title={data.title} detail={data.detail} action={data.action}><DataTable headers={data.headers} rows={data.rows}/>{view === 'Financeiro' && <div className="grid gap-4 border-t bg-slate-50 p-4 sm:grid-cols-3"><Summary label="Receitas" value="R$ 18.740,00" color="text-emerald-600"/><Summary label="Despesas" value="R$ 11.820,00" color="text-red-600"/><Summary label="Resultado" value="R$ 6.920,00" color="text-blue-600"/></div>}</ModuleShell>;
}

type FinishedPart = { id: string; name: string; detail: string; stock: number; color: string; cost: number; price: number };

const finishedPartsSeed: FinishedPart[] = [
  { id: '001', name: 'Abelha articulada', detail: 'Modelo decorativo', stock: 12, color: 'Amarelo Velvet', cost: 5.82, price: 15 },
  { id: '002', name: 'Suporte para celular', detail: 'Linha escritório', stock: 8, color: 'Preto', cost: 7.4, price: 22 },
  { id: '003', name: 'Vaso geométrico', detail: 'Coleção decorativa', stock: 4, color: 'Branco', cost: 12.6, price: 35 },
  { id: '004', name: 'Chaveiro personalizado', detail: 'Linha personalizada', stock: 25, color: 'Laranja', cost: 2.15, price: 8 },
];

function FinishedParts() {
  const [parts, setParts] = useState(finishedPartsSeed);
  const [query, setQuery] = useState('');
  const [pieceOpen, setPieceOpen] = useState(false);
  const [editing, setEditing] = useState<FinishedPart | null>(null);
  const [cartItems, setCartItems] = useState(0);
  const filteredParts = parts.filter(part => `${part.id} ${part.name} ${part.detail} ${part.color}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  const stockUnits = parts.reduce((total, part) => total + part.stock, 0);
  const stockValue = parts.reduce((total, part) => total + part.stock * part.price, 0);
  const stockCost = parts.reduce((total, part) => total + part.stock * part.cost, 0);
  const openNew = () => { setEditing(null); setPieceOpen(true); };
  const openEdit = (part: FinishedPart) => { setEditing(part); setPieceOpen(true); };
  const savePart = (part: FinishedPart) => { setParts(current => editing ? current.map(item => item.id === part.id ? part : item) : [part, ...current]); setPieceOpen(false); };
  const sell = (id: string) => { setParts(current => current.map(part => part.id === id && part.stock > 0 ? { ...part, stock: part.stock - 1 } : part)); setCartItems(total => total + 1); };

  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><h2 className="text-2xl font-bold">Peças Finalizadas</h2><p className="text-sm text-slate-500">Controle os produtos impressos e prontos para venda.</p></div>
      <div className="flex gap-2"><Button variant="outline" className="relative"><ShoppingCart/> Carrinho{cartItems > 0 && <Badge className="ml-1 bg-[#15233b] text-white">{cartItems}</Badge>}</Button><Button onClick={openNew} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]"><Plus/> Nova peça</Button></div>
    </div>

    <div className="flex items-center rounded-xl bg-[#53647c] p-1 text-sm text-white shadow-sm">
      <div className="flex items-center gap-2 rounded-lg bg-[#15233b] px-4 py-2.5 font-semibold"><PackageOpen className="size-4 text-[#ff8358]"/> Peças Finalizadas</div>
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
            <td className="px-4 py-4"><b className="text-sm">{part.id} — {part.name}</b><p className="mt-0.5 text-[11px] italic text-slate-400">{part.detail}</p></td>
            <td className="px-4 py-4"><Badge variant="secondary" className="bg-slate-100 text-slate-700">{part.stock} un.</Badge></td>
            <td className="px-4 py-4"><Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">● {part.color}</Badge></td>
            <td className="px-4 py-4 text-xs text-slate-600">{brl(part.cost)}</td>
            <td className="px-4 py-4 text-sm font-bold text-[#e65d2c]">{brl(part.price)}</td>
            <td className="px-4 py-4 text-sm font-bold text-emerald-600">{margin}%</td>
            <td className="px-4 py-4"><div className="flex items-center gap-1"><Button onClick={() => sell(part.id)} disabled={part.stock === 0} variant="ghost" size="sm" className="text-[#e65d2c]"><ShoppingCart/> Vender</Button><Button onClick={() => openEdit(part)} aria-label={`Editar ${part.name}`} variant="ghost" size="icon"><Pencil/></Button><Button onClick={() => setParts(current => current.filter(item => item.id !== part.id))} aria-label={`Excluir ${part.name}`} variant="ghost" size="icon" className="text-slate-400 hover:text-red-600"><Trash2/></Button></div></td>
          </tr>;
        })}{filteredParts.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">Nenhuma peça encontrada.</td></tr>}</tbody>
      </table></div>
    </Card>
    <PieceDialog key={editing?.id ?? 'new'} open={pieceOpen} onOpenChange={setPieceOpen} initial={editing} nextId={String(Math.max(0, ...parts.map(part => Number(part.id) || 0)) + 1).padStart(3, '0')} onSave={savePart}/>
  </div>;
}

function PieceDialog({ open, onOpenChange, initial, nextId, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; initial: FinishedPart | null; nextId: string; onSave: (part: FinishedPart) => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [detail, setDetail] = useState(initial?.detail ?? '');
  const [stock, setStock] = useState(initial?.stock ?? 1);
  const [color, setColor] = useState(initial?.color ?? '');
  const [cost, setCost] = useState(initial?.cost ?? 0);
  const [price, setPrice] = useState(initial?.price ?? 0);
  const submit = () => onSave({ id: initial?.id ?? nextId, name: name.trim(), detail: detail.trim() || 'Peça adicionada manualmente', stock, color: color.trim() || 'Sem cor', cost, price });

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{initial ? 'Editar peça finalizada' : 'Nova peça finalizada'}</DialogTitle><DialogDescription>Cadastre o produto pronto para venda e sua quantidade atual.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Nome da peça *"><Input value={name} onChange={event => setName(event.target.value)} placeholder="Ex.: Vaso geométrico"/></Field><Field label="Modelo / categoria"><Input value={detail} onChange={event => setDetail(event.target.value)} placeholder="Ex.: Coleção decorativa"/></Field><Field label="Quantidade em estoque"><Input type="number" min="0" value={stock} onChange={event => setStock(Math.max(0, Number(event.target.value)))}/></Field><Field label="Cor"><Input value={color} onChange={event => setColor(event.target.value)} placeholder="Ex.: Laranja"/></Field><Field label="Custo unitário (R$)"><Input type="number" min="0" step=".01" value={cost} onChange={event => setCost(Math.max(0, Number(event.target.value)))}/></Field><Field label="Preço de venda (R$)"><Input type="number" min="0" step=".01" value={price} onChange={event => setPrice(Math.max(0, Number(event.target.value)))}/></Field></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit} disabled={!name.trim() || price <= 0} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]">{initial ? 'Salvar alterações' : 'Adicionar peça'}</Button></DialogFooter></DialogContent></Dialog>;
}

function StockMetric({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: string }) {
  return <Card className="gap-2 border-0 bg-white py-4 shadow-sm ring-1 ring-[#e6eaf0]"><CardContent className="flex items-center gap-3 px-4"><div className={`metric-icon metric-${tone}`}><Icon className="size-4"/></div><div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="text-lg font-bold">{value}</p></div></CardContent></Card>;
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
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#15233b] text-xs font-bold text-white">{initials(user.name)}</div>
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
      <Card className="border-0 bg-[#15233b] text-white shadow-sm ring-0"><CardHeader><CardTitle className="text-white">Pronto para evoluir</CardTitle></CardHeader><CardContent className="space-y-2 text-xs text-slate-300">{['PDF de orçamento com identidade visual','Envio por WhatsApp','Upload de STL / 3MF e fotos','Histórico completo de alterações','Integrações com marketplaces'].map(x => <p key={x}>○ {x}</p>)}</CardContent></Card>
    </div>
  </div>;
}

function QuoteDialog({ open, onOpenChange, onSave, sequence }: { open: boolean; onOpenChange: (v: boolean) => void; onSave: (q: Quote, p: Record<string, unknown>) => void; sequence: number }) {
  const [client, setClient] = useState(''); const [item, setItem] = useState(''); const [grams, setGrams] = useState(180); const [hours, setHours] = useState(9.5); const [energyRate, setEnergyRate] = useState(.86); const [machineRate, setMachineRate] = useState(3.4); const [packaging, setPackaging] = useState(8); const [fees, setFees] = useState(8); const [margin, setMargin] = useState(35);
  const calc = useMemo(() => { const material = grams * .095; const energy = hours * energyRate; const machine = hours * machineRate; const base = material + energy + machine + packaging; const feeValue = base * fees / 100; return { material, energy, machine, feeValue, total: (base + feeValue) / (1 - margin / 100) }; }, [grams, hours, energyRate, machineRate, packaging, fees, margin]);
  const submit = () => { if (!client.trim() || !item.trim()) return; const id = `ORC-${sequence}`; onSave({ id, client, item, date: '29 ago', total: brl(calc.total), status: 'Rascunho' }, { id, client, item, grams, hours, energyRate, machineRate, packaging, fees, margin, total: calc.total }); setClient(''); setItem(''); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle className="text-lg">Novo orçamento</DialogTitle><DialogDescription>Informe a peça e ajuste os custos. O preço final é recalculado automaticamente.</DialogDescription></DialogHeader><div className="grid gap-4 sm:grid-cols-2"><Field label="Cliente *"><Input value={client} onChange={e => setClient(e.target.value)} placeholder="Nome do cliente"/></Field><Field label="Peça / trabalho *"><Input value={item} onChange={e => setItem(e.target.value)} placeholder="Ex.: Maquete residencial"/></Field><Field label="Material (gramas)"><Input type="number" value={grams} onChange={e => setGrams(Number(e.target.value))}/></Field><Field label="Tempo de impressão (horas)"><Input type="number" step=".5" value={hours} onChange={e => setHours(Number(e.target.value))}/></Field><Field label="Energia (R$/kWh)"><Input type="number" step=".01" value={energyRate} onChange={e => setEnergyRate(Number(e.target.value))}/></Field><Field label="Depreciação da máquina (R$/h)"><Input type="number" step=".1" value={machineRate} onChange={e => setMachineRate(Number(e.target.value))}/></Field><Field label="Embalagem (R$)"><Input type="number" value={packaging} onChange={e => setPackaging(Number(e.target.value))}/></Field><Field label="Taxas / impostos (%)"><Input type="number" value={fees} onChange={e => setFees(Number(e.target.value))}/></Field><Field label="Margem de lucro (%)"><Input type="number" value={margin} onChange={e => setMargin(Number(e.target.value))}/></Field><Field label="Observações"><Textarea placeholder="Acabamento, cor, tolerâncias..."/></Field></div><div className="grid gap-2 rounded-xl bg-[#15233b] p-4 text-xs text-slate-300 sm:grid-cols-3"><span>Material: <b className="text-white">{brl(calc.material)}</b></span><span>Energia: <b className="text-white">{brl(calc.energy)}</b></span><span>Máquina: <b className="text-white">{brl(calc.machine)}</b></span><span>Embalagem: <b className="text-white">{brl(packaging)}</b></span><span>Taxas: <b className="text-white">{brl(calc.feeValue)}</b></span><span className="text-sm text-white">Preço final: <b className="text-lg text-[#ff8358]">{brl(calc.total)}</b></span></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={submit} disabled={!client.trim() || !item.trim()} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]">Salvar orçamento</Button></DialogFooter></DialogContent></Dialog>;
}

function QuickCalculator({ onCreate }: { onCreate: () => void }) { const [grams, setGrams] = useState(180); const [hours, setHours] = useState(9.5); const [margin, setMargin] = useState(35); const total = ((grams * .095) + (hours * .86) + (hours * 3.4) + 8) * 1.08 / (1 - margin / 100); return <Card className="h-fit border-0 bg-[#15233b] py-0 text-white ring-0"><CardHeader className="border-b border-white/10 bg-[#1b2c49] py-4"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-[#ff6b35]"><Calculator className="size-4"/></div><div><CardTitle className="text-white">Orçamento rápido</CardTitle><p className="text-[11px] text-slate-400">Simule o preço de uma peça</p></div></div></CardHeader><CardContent className="space-y-4 py-4"><div className="grid grid-cols-2 gap-3"><Field label="Material (g)" dark><Input type="number" value={grams} onChange={e => setGrams(Number(e.target.value))} className="border-white/10 bg-white/8 text-white"/></Field><Field label="Tempo (h)" dark><Input type="number" value={hours} onChange={e => setHours(Number(e.target.value))} className="border-white/10 bg-white/8 text-white"/></Field></div><label className="text-[11px] text-slate-300">Margem <b className="float-right text-white">{margin}%</b><input aria-label="Margem" type="range" min="10" max="60" value={margin} onChange={e => setMargin(Number(e.target.value))} className="mt-2 w-full accent-[#ff6b35]"/></label><div className="rounded-xl bg-white/6 p-4"><p className="text-xs text-slate-400">Preço sugerido</p><p className="text-3xl font-bold text-[#ff8358]">{brl(total)}</p></div><Button onClick={onCreate} className="w-full bg-[#ff6b35] text-white hover:bg-[#e85c2b]"><FileText/>Criar orçamento completo</Button></CardContent></Card>; }

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b bg-slate-50 text-[10px] uppercase tracking-[.08em] text-slate-400">{headers.map(h => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={`${row[0]}-${i}`} className="border-b last:border-0 hover:bg-slate-50/60">{row.map((cell, j) => <td key={j} className={`px-4 py-3 text-xs ${j === 0 ? 'font-semibold' : 'text-slate-600'}`}>{j === row.length - 1 ? <Badge variant="secondary" className="bg-blue-50 text-blue-700">{cell}</Badge> : cell}</td>)}</tr>)}</tbody></table></div>; }
function AlertBox({ icon: Icon, title, detail, tone }: { icon: React.ElementType; title: string; detail: string; tone: string }) { return <div className="flex items-center gap-3 rounded-xl border bg-white p-4"><div className={`metric-icon metric-${tone}`}><Icon className="size-4"/></div><div><p className="text-xs font-bold">{title}</p><p className="text-[11px] text-slate-500">{detail}</p></div></div>; }
function Summary({ label, value, color }: { label: string; value: string; color: string }) { return <div><p className="text-xs text-slate-500">{label}</p><p className={`text-xl font-bold ${color}`}>{value}</p></div>; }
function Setting({ label, value }: { label: string; value: string }) { return <Field label={label}><Input defaultValue={value}/></Field>; }
function Field({ label, children, dark = false }: { label: string; children: React.ReactNode; dark?: boolean }) { return <label className={`text-xs font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{label}<div className="mt-1">{children}</div></label>; }
function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'AD'; }
function firstName(name: string) { return name.trim().split(/\s+/)[0] || 'Administrador'; }
