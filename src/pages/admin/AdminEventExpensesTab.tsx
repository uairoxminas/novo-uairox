import React, { useState } from 'react';
import { toast } from 'sonner';
import { useEventExpenseCategories, useCreateExpenseCategory, useDeleteExpenseCategory, useEventExpenses, useCreateEventExpense, useDeleteEventExpense, useEventStats } from '@/hooks/useEventConfig';

const cardClass = "bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl";
const inputClass = "w-full bg-[#111] border border-[#262626] rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:border-[#EDAC02] focus:ring-1 focus:ring-[#EDAC02] outline-none transition-all";
const btnGold = "bg-[#EDAC02] text-black font-black px-6 py-2.5 rounded-lg hover:bg-[#EDAC02]/90 transition-colors uppercase tracking-wider text-sm";
const btnGhost = "bg-transparent text-white border border-[#262626] px-6 py-2.5 rounded-lg hover:bg-[#1a1a1a] transition-colors font-bold text-sm";

export default function AdminEventExpensesTab({ eventId }: { eventId: string }) {
  const { data: categories = [], isLoading: isLoadingCats } = useEventExpenseCategories(eventId);
  const { data: expenses = [], isLoading: isLoadingExp } = useEventExpenses(eventId);
  const { data: eventStats } = useEventStats(eventId);

  const createCategory = useCreateExpenseCategory();
  const deleteCategory = useDeleteExpenseCategory();
  const createExpense = useCreateEventExpense();
  const deleteExpense = useDeleteEventExpense();

  const [showCatModal, setShowCatModal] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', planned_amount: '' });

  const [showExpModal, setShowExpModal] = useState(false);
  const [newExp, setNewExp] = useState({ category_id: '', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], status: 'paid' });

  const revenue = eventStats?.revenue || 0;
  
  // Calcula o executado por categoria
  const catExecution = categories.map((cat: any) => {
    const executed = expenses.filter((e: any) => e.category_id === cat.id).reduce((sum: number, e: any) => sum + Number(e.amount), 0);
    const progress = cat.planned_amount > 0 ? (executed / Number(cat.planned_amount)) * 100 : 0;
    return { ...cat, executed, progress };
  });

  const totalPlanned = categories.reduce((sum: number, cat: any) => sum + Number(cat.planned_amount), 0);
  const totalExecuted = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  const totalPaid = expenses.filter((e: any) => e.status === 'paid').reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  const netProfit = revenue - totalPaid;

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.name || !newCat.planned_amount) return;
    await createCategory.mutateAsync({
      event_id: eventId,
      name: newCat.name,
      planned_amount: parseFloat(newCat.planned_amount)
    });
    setShowCatModal(false);
    setNewCat({ name: '', planned_amount: '' });
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExp.description || !newExp.amount || !newExp.category_id) return;
    await createExpense.mutateAsync({
      event_id: eventId,
      category_id: newExp.category_id,
      description: newExp.description,
      amount: parseFloat(newExp.amount),
      expense_date: newExp.expense_date,
      status: newExp.status,
    });
    setShowExpModal(false);
    setNewExp({ category_id: '', description: '', amount: '', expense_date: new Date().toISOString().split('T')[0], status: 'paid' });
  };

  if (isLoadingCats || isLoadingExp) return <div className="text-zinc-500 py-10 text-center">Carregando despesas...</div>;

  return (
    <div className="space-y-6 mt-6">
      {/* Resumo Financeiro (DRE) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`${cardClass} p-5 border-l-4 border-l-emerald-500`}>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Receita (Inscrições)</p>
          <p className="text-2xl font-black text-white">R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className={`${cardClass} p-5 border-l-4 border-l-blue-500`}>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Orçamento Previsto</p>
          <p className="text-2xl font-black text-white">R$ {totalPlanned.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className={`${cardClass} p-5 border-l-4 border-l-red-500`}>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Despesas Lançadas</p>
          <p className="text-2xl font-black text-white">R$ {totalExecuted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className={`${cardClass} p-5 border-l-4 ${netProfit >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Lucro Líquido</p>
          <p className={`text-2xl font-black ${netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orçamentos por Categoria */}
        <div className={`${cardClass} p-6`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-white">Orçamento por Área</h3>
            <button onClick={() => setShowCatModal(true)} className="px-3 py-1.5 bg-[#EDAC02]/10 text-[#EDAC02] text-xs font-bold rounded hover:bg-[#EDAC02]/20 transition-colors">
              + Nova Área
            </button>
          </div>
          
          <div className="space-y-4">
            {catExecution.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-4">Nenhuma área de orçamento cadastrada.</p>
            ) : catExecution.map((cat: any) => (
              <div key={cat.id} className="bg-[#111] border border-[#262626] rounded-lg p-4 group relative">
                <button 
                  onClick={() => deleteCategory.mutate({ id: cat.id, event_id: eventId })}
                  className="absolute top-2 right-2 p-1.5 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Excluir Categoria"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-bold text-white">{cat.name}</span>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${cat.executed > Number(cat.planned_amount) ? 'text-red-400' : 'text-zinc-300'}`}>
                      R$ {cat.executed.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs text-zinc-500"> / R$ {Number(cat.planned_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${cat.progress > 100 ? 'bg-red-500' : cat.progress > 80 ? 'bg-orange-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(cat.progress, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lançamentos Reais */}
        <div className={`${cardClass} p-6`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-white">Despesas Lançadas</h3>
            <button 
              onClick={() => {
                if (categories.length === 0) {
                  toast.error("Crie pelo menos uma área de orçamento primeiro!");
                  return;
                }
                setShowExpModal(true);
              }} 
              className="px-3 py-1.5 bg-[#EDAC02] text-black text-xs font-bold rounded hover:bg-[#EDAC02]/90 transition-colors"
            >
              + Lançar Despesa
            </button>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {expenses.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center py-4">Nenhuma despesa lançada.</p>
            ) : expenses.map((exp: any) => (
              <div key={exp.id} className="bg-[#111] border border-[#262626] rounded-lg p-3 flex justify-between items-center group">
                <div>
                  <p className="text-sm font-bold text-white">{exp.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 bg-[#1a1a1a] px-2 py-0.5 rounded">
                      {exp.event_expense_categories?.name || 'Sem Categoria'}
                    </span>
                    <span className="text-[10px] text-zinc-500">{new Date(exp.expense_date).toLocaleDateString('pt-BR')}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${exp.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                      {exp.status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-white">R$ {Number(exp.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  <button 
                    onClick={() => deleteExpense.mutate({ id: exp.id, event_id: eventId })}
                    className="p-1.5 text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL: Nova Categoria/Orçamento */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-[#262626] flex justify-between items-center">
              <h3 className="text-lg font-black text-white">Nova Área de Orçamento</h3>
              <button onClick={() => setShowCatModal(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateCategory} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Nome da Área (Ex: Marketing)</label>
                <input required type="text" className={inputClass} value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Orçamento Previsto (R$)</label>
                <input required type="number" step="0.01" min="0" className={inputClass} value={newCat.planned_amount} onChange={e => setNewCat({ ...newCat, planned_amount: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCatModal(false)} className={btnGhost}>Cancelar</button>
                <button type="submit" disabled={createCategory.isPending} className={btnGold}>{createCategory.isPending ? 'Salvando...' : 'Salvar Orçamento'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nova Despesa */}
      {showExpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-[#262626] flex justify-between items-center">
              <h3 className="text-lg font-black text-white">Lançar Despesa Real</h3>
              <button onClick={() => setShowExpModal(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateExpense} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Área (Categoria)</label>
                <select required className={inputClass} value={newExp.category_id} onChange={e => setNewExp({ ...newExp, category_id: e.target.value })}>
                  <option value="">Selecione...</option>
                  {categories.map((cat: any) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Descrição (Ex: 100 Camisas Atleta)</label>
                <input required type="text" className={inputClass} value={newExp.description} onChange={e => setNewExp({ ...newExp, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Valor (R$)</label>
                  <input required type="number" step="0.01" min="0" className={inputClass} value={newExp.amount} onChange={e => setNewExp({ ...newExp, amount: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Data</label>
                  <input required type="date" className={inputClass} value={newExp.expense_date} onChange={e => setNewExp({ ...newExp, expense_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Status do Pagamento</label>
                <select required className={inputClass} value={newExp.status} onChange={e => setNewExp({ ...newExp, status: e.target.value })}>
                  <option value="paid">✅ Já Pago</option>
                  <option value="pending">⏳ A Pagar (Pendente)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowExpModal(false)} className={btnGhost}>Cancelar</button>
                <button type="submit" disabled={createExpense.isPending} className={btnGold}>{createExpense.isPending ? 'Salvando...' : 'Lançar Despesa'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
