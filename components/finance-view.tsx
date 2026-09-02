'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, Check, CircleDollarSign, Pencil, Search, ShoppingCart, Trash2, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { businessDate, shiftBusinessDate } from '@/lib/business-date';

type Period = 'today' | '7d' | '30d' | 'month' | 'year' | 'custom';
type FinanceTab = 'income' | 'expense' | 'cashflow' | 'charts';
type FinanceTransaction = {
  id: string; orderId: string; type: 'Receita' | 'Despesa'; category: string; product: string; amount: number;
  quantity: number; unitValue: number; paymentMethod: string; dueDate: string; account: string; notes: string; expenseKind?: 'Fixa' | 'Variável';
};
type InventoryPart = { id: string; sku: string; name: string; price: number };

const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const localDate = () => businessDate();
const fieldClass = 'h-10 w-full rounded-md border border-[#dfe5ee] bg-white px-3 text-sm text-slate-800 outline-none focus:border-[#0068ff] focus:ring-2 focus:ring-[#0068ff]/15';
const editFieldClass = 'h-10 w-full rounded-md border border-blue-300/30 bg-[#032c5e] px-3 text-sm text-white outline-none focus:border-[#ff6b35] focus:ring-2 focus:ring-[#ff6b35]/25';
const categories = ['Vendas diversas', 'Peças acabadas', 'Venda de orçamento', 'Serviço de impressão', 'Projeto personalizado', 'Outros'];
const expenseCategories = ['Material', 'Custo de produção', 'Energia', 'Manutenção', 'Embalagem', 'Frete', 'Serviços', 'Impostos', 'Aluguel', 'Outros'];
const accounts = ['Conta Corrente', 'Dinheiro', 'Carteira Digital', 'Outros'];
const paymentMethods = ['Pix', 'Dinheiro', 'Cartão', 'Transferência', 'Boleto', 'Venda Direta'];
const FINANCE_STATE_KEY = 'imprimo3dlab:finance-state:v1';

export function FinanceView() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [parts, setParts] = useState<InventoryPart[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [period, setPeriod] = useState<Period>('30d');
  const [customStart, setCustomStart] = useState(localDate());
  const [customEnd, setCustomEnd] = useState(localDate());
  const [tab, setTab] = useState<FinanceTab>('income');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [expenseKindFilter, setExpenseKindFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [dueDate, setDueDate] = useState(localDate());
  const [inventoryItemId, setInventoryItemId] = useState('');
  const [product, setProduct] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [quantity, setQuantity] = useState(1);
  const [unitValue, setUnitValue] = useState(0);
  const [account, setAccount] = useState(accounts[0]);
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]);
  const [notes, setNotes] = useState('');
  const [expenseKind, setExpenseKind] = useState<'Fixa' | 'Variável'>('Variável');
  const [draftLoaded, setDraftLoaded] = useState(false);

  const loadData = async () => {
    try {
      const [transactionResponse, inventoryResponse] = await Promise.all([fetch('/api/transactions'), fetch('/api/inventory')]);
      if (!transactionResponse.ok) throw new Error('Não foi possível carregar os lançamentos.');
      setTransactions(await transactionResponse.json() as FinanceTransaction[]);
      if (inventoryResponse.ok) setParts(await inventoryResponse.json() as InventoryPart[]);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Não foi possível carregar o financeiro.'); }
    finally { setLoading(false); }
  };
  // oxlint-disable-next-line react/react-compiler -- Os dados externos precisam ser carregados quando a tela é aberta.
  useEffect(() => { void loadData(); }, []);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FINANCE_STATE_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<{
          period: Period; customStart: string; customEnd: string; tab: FinanceTab; query: string;
          categoryFilter: string; paymentFilter: string; accountFilter: string; expenseKindFilter: string;
          dueDate: string; inventoryItemId: string; product: string; category: string; quantity: number;
          unitValue: number; account: string; paymentMethod: string; notes: string; expenseKind: 'Fixa' | 'Variável';
        }>;
        if (draft.period) setPeriod(draft.period);
        if (draft.customStart) setCustomStart(draft.customStart);
        if (draft.customEnd) setCustomEnd(draft.customEnd);
        if (draft.tab) setTab(draft.tab);
        setQuery(draft.query ?? ''); setCategoryFilter(draft.categoryFilter ?? ''); setPaymentFilter(draft.paymentFilter ?? ''); setAccountFilter(draft.accountFilter ?? ''); setExpenseKindFilter(draft.expenseKindFilter ?? '');
        setDueDate(draft.dueDate ?? localDate()); setInventoryItemId(draft.inventoryItemId ?? ''); setProduct(draft.product ?? ''); setCategory(draft.category ?? categories[0]); setQuantity(draft.quantity ?? 1); setUnitValue(draft.unitValue ?? 0); setAccount(draft.account ?? accounts[0]); setPaymentMethod(draft.paymentMethod ?? paymentMethods[0]); setNotes(draft.notes ?? ''); setExpenseKind(draft.expenseKind ?? 'Variável');
      }
    } catch { /* Mantém os valores iniciais caso o armazenamento local esteja indisponível. */ }
    setDraftLoaded(true);
  }, []);
  useEffect(() => {
    if (!draftLoaded || editingId) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(FINANCE_STATE_KEY, JSON.stringify({ period, customStart, customEnd, tab, query, categoryFilter, paymentFilter, accountFilter, expenseKindFilter, dueDate, inventoryItemId, product, category, quantity, unitValue, account, paymentMethod, notes, expenseKind }));
      } catch { /* A indisponibilidade do rascunho não impede o uso do banco de dados. */ }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draftLoaded, editingId, period, customStart, customEnd, tab, query, categoryFilter, paymentFilter, accountFilter, expenseKindFilter, dueDate, inventoryItemId, product, category, quantity, unitValue, account, paymentMethod, notes, expenseKind]);

  const periodTransactions = useMemo(() => {
    const today = businessDate();
    let start = today;
    let end = today;
    if (period === '7d') start = shiftBusinessDate(today, -6);
    if (period === '30d') start = shiftBusinessDate(today, -29);
    if (period === 'month') start = `${today.slice(0, 7)}-01`;
    if (period === 'year') start = `${today.slice(0, 4)}-01-01`;
    if (period === 'custom') { start = customStart; end = customEnd; }
    return transactions.filter(item => item.dueDate >= start && item.dueDate <= end);
  }, [transactions, period, customStart, customEnd]);

  const income = periodTransactions.filter(item => item.type === 'Receita').reduce((total, item) => total + item.amount, 0);
  const expenses = periodTransactions.filter(item => item.type === 'Despesa').reduce((total, item) => total + item.amount, 0);
  const profit = income - expenses;
  const margin = income > 0 ? profit / income * 100 : 0;
  const revenueRows = periodTransactions.filter(item => item.type === 'Receita').filter(item => {
    const text = `${item.product} ${item.category} ${item.paymentMethod} ${item.account}`.toLocaleLowerCase('pt-BR');
    return text.includes(query.toLocaleLowerCase('pt-BR')) && (!categoryFilter || item.category === categoryFilter) && (!paymentFilter || item.paymentMethod === paymentFilter) && (!accountFilter || item.account === accountFilter);
  });
  const expenseRows = periodTransactions.filter(item => item.type === 'Despesa').filter(item => {
    const text = `${item.product} ${item.category} ${item.account}`.toLocaleLowerCase('pt-BR');
    return text.includes(query.toLocaleLowerCase('pt-BR')) && (!categoryFilter || item.category === categoryFilter) && (!expenseKindFilter || item.expenseKind === expenseKindFilter) && (!accountFilter || item.account === accountFilter);
  });

  const choosePart = (id: string) => {
    setInventoryItemId(id);
    const part = parts.find(item => item.id === id);
    if (part) { setProduct(`${part.sku} — ${part.name}`); setUnitValue(part.price); setCategory('Peças acabadas'); }
  };
  const resetForm = () => { setEditingId(null); setEditOpen(false); setInventoryItemId(''); setProduct(''); setQuantity(1); setUnitValue(0); setNotes(''); setDueDate(localDate()); setExpenseKind('Variável'); };
  const editTransaction = (item: FinanceTransaction) => {
    setEditingId(item.id); setDueDate(item.dueDate); setProduct(item.product); setCategory(item.category); setQuantity(item.quantity); setUnitValue(item.unitValue);
    setAccount(item.account); setPaymentMethod(item.paymentMethod); setNotes(item.notes); setExpenseKind(item.expenseKind ?? 'Variável'); setEditOpen(true);
  };
  const saveTransaction = async (transactionType: 'income' | 'expense') => {
    const isExpense = transactionType === 'expense';
    if (!product.trim() || quantity <= 0 || unitValue <= 0) { setNotice(`Informe ${isExpense ? 'a descrição e o valor da despesa' : 'o produto, a quantidade e o valor da receita'}.`); return; }
    setSaving(true); setNotice('');
    try {
      const response = await fetch('/api/transactions', { method: editingId ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: editingId, type: transactionType, dueDate, inventoryItemId, product, category, quantity, unitValue, account, paymentMethod, status: 'Pago', notes, expenseKind: isExpense ? expenseKind : undefined }) });
      const saved = await response.json() as FinanceTransaction & { error?: string };
      if (!response.ok) throw new Error(saved.error || `Não foi possível salvar a ${isExpense ? 'despesa' : 'receita'}.`);
      setTransactions(current => editingId ? current.map(item => item.id === saved.id ? saved : item) : [saved, ...current]);
      setNotice(editingId ? `${isExpense ? 'Despesa' : 'Receita'} atualizada com sucesso.` : `${isExpense ? 'Despesa' : 'Receita'} lançada com sucesso.`); resetForm();
    } catch (error) { setNotice(error instanceof Error ? error.message : `Não foi possível salvar a ${isExpense ? 'despesa' : 'receita'}.`); }
    finally { setSaving(false); }
  };
  const deleteTransaction = async (item: FinanceTransaction) => {
    const label = item.type === 'Despesa' ? 'despesa' : 'receita';
    if (!window.confirm(`Excluir a ${label} “${item.product}”? Esta ação não pode ser desfeita.`)) return;
    try {
      const response = await fetch(`/api/transactions?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || `Não foi possível excluir a ${label}.`);
      setTransactions(current => current.filter(transaction => transaction.id !== item.id));
      if (editingId === item.id) resetForm();
      setNotice(`${item.type} excluída com sucesso.`);
    } catch (error) { setNotice(error instanceof Error ? error.message : `Não foi possível excluir a ${label}.`); }
  };

  const periodLabel = period === 'today' ? 'Hoje' : period === '7d' ? 'Últimos 7 dias' : period === '30d' ? 'Últimos 30 dias' : period === 'month' ? 'Mês atual' : period === 'year' ? 'Ano atual' : `${customStart.split('-').reverse().join('/')} a ${customEnd.split('-').reverse().join('/')}`;
  const tabs: Array<[FinanceTab, React.ElementType, string]> = [['income', TrendingUp, 'Receitas'], ['expense', TrendingDown, 'Despesas'], ['cashflow', WalletCards, 'Fluxo de Caixa'], ['charts', BarChart3, 'Gráficos']];
  const editingTransaction = transactions.find(item => item.id === editingId);
  const editingExpense = editingTransaction?.type === 'Despesa';

  return <div className="space-y-5">
    <div><h2 className="text-2xl font-bold tracking-tight">Financeiro</h2><p className="text-sm text-slate-500">Acompanhe entradas, saídas e o resultado da empresa.</p></div>
    <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardContent className="space-y-4 p-4">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center"><div className="flex flex-wrap items-center gap-2"><span className="mr-1 flex items-center gap-2 text-xs font-bold uppercase text-slate-500"><CalendarDays className="size-4"/> Período</span>{([['today','Hoje'],['7d','7d'],['30d','30d'],['month','Mês'],['year','Ano'],['custom','Personalizado']] as Array<[Period,string]>).map(([value,label]) => <button key={value} onClick={() => setPeriod(value)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${period === value ? 'bg-[#ff6b35] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>)}</div><span className="text-xs font-medium text-slate-500">{periodLabel}</span></div>
      {period === 'custom' && <div className="grid max-w-md gap-3 sm:grid-cols-2"><div className="text-xs font-medium text-slate-600"><label htmlFor="finance-start">Data inicial</label><Input id="finance-start" type="date" value={customStart} onChange={event => setCustomStart(event.target.value)} className="mt-1"/></div><div className="text-xs font-medium text-slate-600"><label htmlFor="finance-end">Data final</label><Input id="finance-end" type="date" value={customEnd} onChange={event => setCustomEnd(event.target.value)} className="mt-1"/></div></div>}
    </CardContent></Card>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <FinanceMetric icon={TrendingUp} label="Total receitas" value={brl(income)} tone="green"/>
      <FinanceMetric icon={TrendingDown} label="Total despesas" value={brl(expenses)} tone="red"/>
      <FinanceMetric icon={WalletCards} label="Lucro líquido" value={brl(profit)} tone="orange"/>
      <FinanceMetric icon={CircleDollarSign} label="Margem" value={`${margin.toFixed(1)}%`} detail="Lucro ÷ Receitas" tone="blue"/>
    </section>
    <div className="flex flex-wrap gap-2 rounded-xl bg-[var(--brand-blue)] p-2">{tabs.map(([value, Icon, label]) => <button key={value} onClick={() => { setTab(value); resetForm(); setQuery(''); setCategoryFilter(''); setPaymentFilter(''); setAccountFilter(''); setExpenseKindFilter(''); setCategory(value === 'expense' ? expenseCategories[0] : categories[0]); }} className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${tab === value ? 'bg-[#ff6b35] text-white shadow-sm' : 'text-white hover:bg-white/15'}`}><Icon className="size-4"/>{label}</button>)}</div>
    {tab === 'income' ? <div className="grid items-start gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader><CardTitle className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><CircleDollarSign className="size-4"/></span>{editingId ? 'Editar Receita' : 'Nova Receita'}</CardTitle><p className="text-xs text-slate-500">Registre tudo que entra de dinheiro.</p></CardHeader><CardContent className="space-y-4">
        <FinanceField label="Data"><Input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)}/></FinanceField>
        <FinanceField label="Produto do estoque (opcional)"><select value={inventoryItemId} onChange={event => choosePart(event.target.value)} className={fieldClass}><option value="">Nenhum — lançar manualmente</option>{parts.map(item => <option key={item.id} value={item.id}>{item.sku} — {item.name}</option>)}</select></FinanceField>
        <FinanceField label="Produto / origem"><Input value={product} onChange={event => setProduct(event.target.value)} placeholder="Ex.: Vaso articulado, salário, freelance..."/></FinanceField>
        <FinanceField label="Categoria"><select value={category} onChange={event => setCategory(event.target.value)} className={fieldClass}>{categories.map(item => <option key={item}>{item}</option>)}</select></FinanceField>
        <div className="grid grid-cols-2 gap-3"><FinanceField label="Qtd."><Input type="number" min="0.01" step="0.01" value={quantity} onChange={event => setQuantity(Math.max(.01, Number(event.target.value) || 0))}/></FinanceField><FinanceField label="Valor unitário (R$)"><Input type="number" min="0" step="0.01" value={unitValue} onChange={event => setUnitValue(Math.max(0, Number(event.target.value) || 0))}/></FinanceField></div>
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm"><span className="text-xs text-emerald-700">Total da receita</span><p className="font-bold text-emerald-700">{brl(quantity * unitValue)}</p></div>
        <FinanceField label="Conta"><select value={account} onChange={event => setAccount(event.target.value)} className={fieldClass}>{accounts.map(item => <option key={item}>{item}</option>)}</select></FinanceField>
        <FinanceField label="Forma de pagamento"><select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} className={fieldClass}>{paymentMethods.map(item => <option key={item}>{item}</option>)}</select></FinanceField>
        <FinanceField label="Observação (opcional)"><Input value={notes} onChange={event => setNotes(event.target.value)} placeholder="Cliente, detalhes..."/></FinanceField>
        <Button onClick={() => void saveTransaction('income')} disabled={saving} className="w-full bg-[#ff6b35] text-white hover:bg-[#e85c2b]"><TrendingUp/>{saving ? 'Salvando...' : editingId ? 'Atualizar Receita' : 'Lançar Receita'}</Button>
        {editingId && <Button variant="outline" onClick={resetForm} className="w-full">Cancelar edição</Button>}
      </CardContent></Card>
      <Card className="min-w-0 border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader><CardTitle>Receitas lançadas</CardTitle><p className="text-xs text-slate-500">Tudo que entrou de dinheiro no período selecionado.</p></CardHeader><CardContent className="px-0">
        <div className="grid gap-2 border-y bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-4"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><Input aria-label="Buscar receitas por produto" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar produto..." className="pl-9"/></div><FilterSelect value={categoryFilter} onChange={setCategoryFilter} first="Todas categorias" options={categories}/><FilterSelect value={paymentFilter} onChange={setPaymentFilter} first="Todo pagamento" options={paymentMethods}/><FilterSelect value={accountFilter} onChange={setAccountFilter} first="Todas contas" options={accounts}/></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[840px] text-left text-xs"><thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-500"><tr>{['Data','Produto','Categoria','Qtd.','V. unit.','Total','Conta','Pagamento','Ações'].map(item => <th key={item} className="px-3 py-3 font-semibold">{item}</th>)}</tr></thead><tbody>{revenueRows.map(item => <tr key={item.id} className="border-t hover:bg-slate-50"><td className="whitespace-nowrap px-3 py-3 font-medium">{item.dueDate.split('-').reverse().join('/')}</td><td className="max-w-52 px-3 py-3"><p className="font-semibold">{item.product}</p>{item.notes && <p className="mt-1 truncate text-[10px] text-slate-500">{item.notes}</p>}</td><td className="px-3 py-3"><span className="rounded-full border px-2 py-1 text-[10px]">{item.category}</span></td><td className="px-3 py-3">{item.quantity}</td><td className="px-3 py-3">{brl(item.unitValue)}</td><td className="px-3 py-3 font-bold text-emerald-600">{brl(item.amount)}</td><td className="px-3 py-3">{item.account}</td><td className="px-3 py-3">{item.paymentMethod}</td><td className="px-3 py-3"><div className="flex items-center gap-1"><Button variant="ghost" size="icon" aria-label={`Editar ${item.product}`} onClick={() => editTransaction(item)} className="text-[#0068ff]"><Pencil className="size-4"/></Button><Button variant="ghost" size="icon" aria-label={`Excluir ${item.product}`} onClick={() => void deleteTransaction(item)} className="text-red-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4"/></Button></div></td></tr>)}</tbody></table></div>
        {loading && <p className="p-8 text-center text-sm text-slate-400">Carregando receitas...</p>}{!loading && revenueRows.length === 0 && <p className="p-8 text-center text-sm text-slate-400">Nenhuma receita encontrada neste período.</p>}
      </CardContent></Card>
    </div> : tab === 'expense' ? <div className="grid items-start gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader><CardTitle className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-red-50 text-red-600"><ShoppingCart className="size-4"/></span>Nova Despesa</CardTitle><p className="text-xs text-slate-500">Registre despesas fixas e variáveis.</p></CardHeader><CardContent className="space-y-4">
        <FinanceField label="Data"><Input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)}/></FinanceField>
        <FinanceField label="Tipo"><div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1"><button type="button" onClick={() => setExpenseKind('Fixa')} className={`rounded-md px-3 py-2 text-sm font-semibold transition ${expenseKind === 'Fixa' ? 'bg-[#ff6b35] text-white shadow-sm' : 'text-slate-600'}`}>Fixa</button><button type="button" onClick={() => setExpenseKind('Variável')} className={`rounded-md px-3 py-2 text-sm font-semibold transition ${expenseKind === 'Variável' ? 'bg-[#ff6b35] text-white shadow-sm' : 'text-slate-600'}`}>Variável</button></div></FinanceField>
        <FinanceField label="Categoria"><select value={category} onChange={event => setCategory(event.target.value)} className={fieldClass}>{expenseCategories.map(item => <option key={item}>{item}</option>)}</select></FinanceField>
        <FinanceField label="Descrição"><Input value={product} onChange={event => setProduct(event.target.value)} placeholder="Ex.: Filamento PLA 1 kg, conta de luz..."/></FinanceField>
        <FinanceField label="Valor (R$)"><Input type="number" min="0" step="0.01" value={unitValue} onChange={event => { setQuantity(1); setUnitValue(Math.max(0, Number(event.target.value) || 0)); }}/></FinanceField>
        <FinanceField label="Conta"><select value={account} onChange={event => setAccount(event.target.value)} className={fieldClass}>{accounts.map(item => <option key={item}>{item}</option>)}</select></FinanceField>
        <FinanceField label="Observação (opcional)"><Input value={notes} onChange={event => setNotes(event.target.value)} placeholder="Fornecedor, vencimento, detalhes..."/></FinanceField>
        <Button onClick={() => void saveTransaction('expense')} disabled={saving} className="w-full bg-red-600 text-white hover:bg-red-700"><TrendingDown/>{saving ? 'Salvando...' : 'Lançar Despesa'}</Button>
      </CardContent></Card>
      <Card className="min-w-0 border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardHeader><CardTitle>Despesas lançadas</CardTitle><p className="text-xs text-slate-500">Despesas fixas e variáveis do período selecionado, sem limite de lançamentos.</p></CardHeader><CardContent className="px-0">
        <div className="grid gap-2 border-y bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-4"><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/><Input aria-label="Buscar despesas" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar descrição ou categoria..." className="pl-9"/></div><FilterSelect value={categoryFilter} onChange={setCategoryFilter} first="Todas categorias" options={expenseCategories}/><FilterSelect value={expenseKindFilter} onChange={setExpenseKindFilter} first="Fixas e variáveis" options={['Fixa', 'Variável']}/><FilterSelect value={accountFilter} onChange={setAccountFilter} first="Todas contas" options={accounts}/></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-500"><tr>{['Data','Tipo','Descrição','Categoria','Conta','Valor','Ações'].map(item => <th key={item} className="px-3 py-3 font-semibold">{item}</th>)}</tr></thead><tbody>{expenseRows.map(item => <tr key={item.id} className="border-t hover:bg-slate-50"><td className="whitespace-nowrap px-3 py-3 font-medium">{item.dueDate.split('-').reverse().join('/')}</td><td className="px-3 py-3"><span className="rounded-full border border-orange-200 px-2 py-1 text-[10px] font-semibold text-orange-600">{item.expenseKind ?? 'Variável'}</span></td><td className="max-w-64 px-3 py-3"><p className="font-semibold">{item.product}</p>{item.notes && <p className="mt-1 truncate text-[10px] text-slate-500">{item.notes}</p>}</td><td className="px-3 py-3"><span className="rounded-full border px-2 py-1 text-[10px]">{item.category}</span></td><td className="px-3 py-3">{item.account}</td><td className="px-3 py-3 font-bold text-red-600">{brl(item.amount)}</td><td className="px-3 py-3"><div className="flex items-center gap-1"><Button variant="ghost" size="icon" aria-label={`Editar ${item.product}`} onClick={() => editTransaction(item)} className="text-[#0068ff]"><Pencil className="size-4"/></Button><Button variant="ghost" size="icon" aria-label={`Excluir ${item.product}`} onClick={() => void deleteTransaction(item)} className="text-red-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="size-4"/></Button></div></td></tr>)}</tbody></table></div>
        {loading && <p className="p-8 text-center text-sm text-slate-400">Carregando despesas...</p>}{!loading && expenseRows.length === 0 && <p className="p-8 text-center text-sm text-slate-400">Nenhuma despesa encontrada neste período.</p>}
      </CardContent></Card>
    </div> : <Card className="border-0 bg-white shadow-sm ring-1 ring-[#e6eaf0]"><CardContent className="p-10 text-center"><p className="font-semibold">{tabs.find(item => item[0] === tab)?.[2]}</p><p className="mt-2 text-sm text-slate-500">Esta área está preparada e será detalhada na próxima etapa.</p></CardContent></Card>}
    <Dialog open={editOpen} onOpenChange={open => { setEditOpen(open); if (!open) resetForm(); }}><DialogContent className="max-h-[92vh] overflow-y-auto border-[#124787] bg-[#124787] text-white sm:max-w-xl">
      <DialogHeader><DialogTitle className="flex items-center gap-2 text-white"><Pencil className="size-5 text-[#ff6b35]"/> Editar Lançamento Financeiro</DialogTitle><DialogDescription className="text-blue-100">Revise os dados da {editingExpense ? 'despesa' : 'receita'} e salve as alterações.</DialogDescription></DialogHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <EditField label="Data" wide><Input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} className={editFieldClass}/></EditField>
        {editingExpense && <EditField label="Tipo" wide><select value={expenseKind} onChange={event => setExpenseKind(event.target.value as 'Fixa' | 'Variável')} className={editFieldClass}><option>Fixa</option><option>Variável</option></select></EditField>}
        <EditField label={editingExpense ? 'Descrição' : 'Produto / origem'} wide><Input value={product} onChange={event => setProduct(event.target.value)} className={editFieldClass}/></EditField>
        {editingExpense ? <EditField label="Valor (R$)" wide><Input type="number" min="0" step="0.01" value={unitValue} onChange={event => { setQuantity(1); setUnitValue(Math.max(0, Number(event.target.value) || 0)); }} className={editFieldClass}/></EditField> : <><EditField label="Quantidade"><Input type="number" min="0.01" step="0.01" value={quantity} onChange={event => setQuantity(Math.max(.01, Number(event.target.value) || 0))} className={editFieldClass}/></EditField><EditField label="Valor unitário (R$)"><Input type="number" min="0" step="0.01" value={unitValue} onChange={event => setUnitValue(Math.max(0, Number(event.target.value) || 0))} className={editFieldClass}/></EditField></>}
        <EditField label="Observação" wide><Input value={notes} onChange={event => setNotes(event.target.value)} placeholder="Detalhes do lançamento..." className={editFieldClass}/></EditField>
        <EditField label="Categoria"><select value={category} onChange={event => setCategory(event.target.value)} className={editFieldClass}>{(editingExpense ? expenseCategories : categories).map(item => <option key={item}>{item}</option>)}</select></EditField>
        <EditField label="Valor total (R$)"><Input value={brl(quantity * unitValue)} readOnly className={`${editFieldClass} cursor-not-allowed text-slate-300`}/></EditField>
        <EditField label="Conta"><select value={account} onChange={event => setAccount(event.target.value)} className={editFieldClass}>{accounts.map(item => <option key={item}>{item}</option>)}</select></EditField>
        {!editingExpense && <EditField label="Forma de pagamento"><select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} className={editFieldClass}>{paymentMethods.map(item => <option key={item}>{item}</option>)}</select></EditField>}
      </div>
      <DialogFooter className="border-t border-blue-300/30 bg-[#124787] pt-4 sm:justify-between"><Button variant="destructive" className="bg-red-600 text-white hover:bg-red-700 hover:text-white" onClick={() => { if (editingTransaction) void deleteTransaction(editingTransaction); }}><Trash2/> Excluir</Button><div className="flex gap-2"><Button variant="outline" onClick={resetForm} className="border-blue-200/50 bg-transparent text-white hover:bg-white/10 hover:text-white">Cancelar</Button><Button onClick={() => void saveTransaction(editingExpense ? 'expense' : 'income')} disabled={saving} className="bg-[#ff6b35] text-white hover:bg-[#e85c2b]"><Check/> {saving ? 'Salvando...' : 'Salvar Alterações'}</Button></div></DialogFooter>
    </DialogContent></Dialog>
    {notice && <output className={`block rounded-lg px-4 py-3 text-sm ${notice.includes('sucesso') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{notice}</output>}
  </div>;
}

function FinanceMetric({ icon: Icon, label, value, detail, tone }: { icon: React.ElementType; label: string; value: string; detail?: string; tone: 'green' | 'red' | 'orange' | 'blue' }) {
  const colors = { green: 'border-emerald-200 bg-emerald-50/50 text-emerald-600', red: 'border-red-200 bg-red-50/50 text-red-600', orange: 'border-orange-200 bg-orange-50/50 text-orange-600', blue: 'border-blue-200 bg-blue-50/50 text-blue-600' };
  return <Card className={`border shadow-sm ${colors[tone]}`}><CardContent className="flex items-center justify-between p-5"><div><p className="text-[11px] font-bold uppercase tracking-wide">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p>{detail && <p className="mt-1 text-[10px] text-slate-500">{detail}</p>}</div><Icon className="size-8 opacity-60"/></CardContent></Card>;
}
function FinanceField({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-semibold text-slate-600"><span className="mb-1.5 block uppercase tracking-wide">{label}</span>{children}</label>; }
function EditField({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <label className={`block text-xs font-semibold uppercase tracking-wide text-slate-300 ${wide ? 'sm:col-span-2' : ''}`}><span className="mb-1.5 block">{label}</span>{children}</label>; }
function FilterSelect({ value, onChange, first, options }: { value: string; onChange: (value: string) => void; first: string; options: string[] }) { return <select value={value} onChange={event => onChange(event.target.value)} className={fieldClass}><option value="">{first}</option>{options.map(item => <option key={item}>{item}</option>)}</select>; }
