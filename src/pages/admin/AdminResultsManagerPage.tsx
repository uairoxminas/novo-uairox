import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Trophy, Medal, AlertOctagon, Edit3, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminResultsManagerPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTimeMs, setEditTimeMs] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('');

  // Busca Tabela Oficial de Resultados combinada com Registrations e Heats
  const { data: results, isLoading, error: queryError } = useQuery({
    queryKey: ['race_results_complete', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('race_results' as any)
        .select(`
          id, heat_id, registration_id, bib_number, raw_time_ms, total_penalties_seconds, final_adjusted_time_ms, total_passes_recorded, status,
          registrations (
             athlete_name, 
             team_name, 
             categories (name)
          )
        `)
        .eq('event_id', eventId);
        
      if (error) throw error;
      return data || [];
    }
  });

  // Salvar Edição Manual
  const saveOverride = useMutation({
    mutationFn: async (vars: { resultId: string, time_ms: number, status: string }) => {
      const { error } = await supabase.from('race_results' as any).update({
        final_adjusted_time_ms: vars.time_ms,
        status: vars.status
      }).eq('id', vars.resultId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['race_results_complete', eventId] });
      setEditingId(null);
      toast.success('Resultado sobrescrito e reclassificado com sucesso!');
    }
  });

  const handleEditClick = (r: any) => {
    setEditingId(r.id);
    setEditTimeMs(r.final_adjusted_time_ms?.toString() || '0');
    setEditStatus(r.status);
  };

  const handleSave = (rId: string) => {
    saveOverride.mutate({
      resultId: rId,
      time_ms: Number(editTimeMs),
      status: editStatus
    });
  };

  const formatMs = (ms: number) => {
    if (!ms && ms !== 0) return '--';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  if (isLoading) {
    return <div className="p-12 text-center text-white">Carregando Resultados...</div>;
  }

  if (queryError) {
    return (
      <div className="p-12 max-w-2xl mx-auto text-center mt-20 bg-red-900/20 border border-red-500 rounded-3xl">
         <AlertOctagon className="w-16 h-16 text-red-500 mx-auto mb-4" />
         <h1 className="text-xl font-bold text-white uppercase">Erro no Banco de Dados</h1>
         <p className="text-red-400 mt-2 font-mono text-sm break-all">{(queryError as any)?.message || String(queryError)}</p>
         <p className="text-zinc-400 mt-6">Dica: Se adicionamos colunas recentes, vá no SQL Editor e rode NOTIFY pgrst;</p>
      </div>
    );
  }

  // Agrupar por categoria
  const groupedByCategory = (results || []).reduce((acc: any, r: any) => {
    // Nested query extraction map
    const cat = r.registrations?.categories?.name || 'Sem Categoria';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(r);
    return acc;
  }, {});

  // Ordenar dentro de cada categoria:
  // 1. Validated (Menor tempo primeiro)
  // 2. DNF/Disqualified (No fundo)
  Object.keys(groupedByCategory).forEach(cat => {
    groupedByCategory[cat].sort((a: any, b: any) => {
      if (a.status === 'validated' && b.status !== 'validated') return -1;
      if (a.status !== 'validated' && b.status === 'validated') return 1;
      // Ambos validados (ou ambos nao, mas ordenamos do menor ms ao maior)
      const tA = a.final_adjusted_time_ms || 999999999;
      const tB = b.final_adjusted_time_ms || 999999999;
      return tA - tB;
    });
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex items-center gap-4 border-b border-[#1a1a1a] pb-6">
         <button onClick={() => navigate('/admin/results')} className="w-10 h-10 bg-[#1a1a1a] hover:bg-[#262626] rounded-xl flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
         </button>
         <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Leaderboard Oficial</h1>
            <p className="text-sm font-bold text-zinc-500 mt-1">Classificação Geral e Ajustes Manuais</p>
         </div>
      </div>

      {Object.keys(groupedByCategory).length === 0 && (
         <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-12 rounded-3xl text-center">
            <Trophy className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhum resultado processado ainda</h3>
            <p className="text-zinc-500">As baterias confirmadas na sua Torre de Controle irão alimentar este ranking automaticamente.</p>
         </div>
      )}

      {Object.keys(groupedByCategory).map((catName) => (
        <div key={catName} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-3xl overflow-hidden">
           <div className="bg-[#EDAC02] px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-black text-black uppercase tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5" /> Categoria: {catName}
              </h2>
           </div>

           <div className="p-6">
              <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="border-b border-[#1a1a1a] text-zinc-500 text-xs uppercase tracking-widest">
                          <th className="pb-4 font-bold px-4">Pos</th>
                          <th className="pb-4 font-bold px-4">Equipe / Atleta</th>
                          <th className="pb-4 font-bold px-4">BIB</th>
                          <th className="pb-4 font-bold px-4">Raw Time</th>
                          <th className="pb-4 font-bold px-4">Punição</th>
                          <th className="pb-4 font-black text-white px-4">Tempo Oficial</th>
                          <th className="pb-4 font-bold px-4">Status</th>
                          <th className="pb-4 font-bold px-4 text-right">Ações</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1a1a1a]">
                       {groupedByCategory[catName].map((r: any, idx: number) => {
                          const isEdit = editingId === r.id;
                          const name = r.registrations?.athlete_name || r.registrations?.team_name || 'Desconhecido';
                          const isPodium = r.status === 'validated' && idx < 3;
                          
                          return (
                            <tr key={r.id} className="hover:bg-[#111] transition-colors group">
                               <td className="py-4 px-4">
                                  {r.status !== 'validated' ? (
                                    <span className="text-zinc-600 font-bold">-</span>
                                  ) : isPodium ? (
                                    <span className={`flex items-center justify-center w-8 h-8 rounded-full font-black text-black ${idx === 0 ? 'bg-yellow-400' : idx === 1 ? 'bg-gray-300' : 'bg-amber-600'}`}>
                                      {idx + 1}
                                    </span>
                                  ) : (
                                    <span className="font-bold text-zinc-500 px-2">{idx + 1}º</span>
                                  )}
                               </td>
                               <td className="py-4 px-4 font-bold text-white uppercase">{name}</td>
                               <td className="py-4 px-4 text-zinc-400 font-bold">{r.bib_number}</td>

                               <td className="py-4 px-4 text-sm text-zinc-500">{formatMs(r.raw_time_ms)}</td>
                               <td className="py-4 px-4 text-sm text-red-500 font-bold">{r.total_penalties_seconds > 0 ? `+${r.total_penalties_seconds}s` : '--'}</td>
                               
                               {/* Edit Time Form */}
                               <td className="py-4 px-4">
                                 {isEdit ? (
                                   <input type="number" value={editTimeMs} onChange={e => setEditTimeMs(e.target.value)} className="w-24 bg-[#050505] border border-zinc-800 rounded px-2 py-1 text-white text-sm font-bold" />
                                 ) : (
                                   <span className={`font-black tracking-wider ${r.status === 'validated' ? 'text-green-500 text-lg' : 'text-zinc-600 line-through text-sm'}`}>
                                     {formatMs(r.final_adjusted_time_ms)}
                                   </span>
                                 )}
                               </td>

                               <td className="py-4 px-4">
                                 {isEdit ? (
                                   <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="bg-[#050505] border border-zinc-800 rounded px-2 py-1 text-white text-xs uppercase">
                                      <option value="validated">Validado (Ranking)</option>
                                      <option value="dnf">DNF (Do Not Finish)</option>
                                      <option value="disqualified">Desclassificado (DQ)</option>
                                      <option value="pending_head_judge">Pendente</option>
                                   </select>
                                 ) : (
                                   r.status === 'validated' ? <span className="bg-green-600/20 text-green-500 px-2 py-1 rounded text-[10px] font-black uppercase">Validado</span> :
                                   r.status === 'dnf' ? <span className="bg-red-600/20 text-red-500 px-2 py-1 rounded text-[10px] font-black uppercase"><AlertOctagon className="w-3 h-3 inline mr-1" />DNF</span> :
                                   r.status === 'disqualified' ? <span className="bg-red-600/20 text-red-500 px-2 py-1 rounded text-[10px] font-black uppercase">Desclassificado</span> :
                                   <span className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded text-[10px] font-black uppercase">Revisar</span>
                                 )}
                               </td>

                               <td className="py-4 px-4 text-right">
                                  {isEdit ? (
                                     <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => setEditingId(null)} className="p-2 text-zinc-500 hover:text-white bg-[#1a1a1a] rounded"><X className="w-4 h-4" /></button>
                                        <button onClick={() => handleSave(r.id)} disabled={saveOverride.isPending} className="p-2 text-white bg-blue-600 hover:bg-blue-500 rounded"><Save className="w-4 h-4" /></button>
                                     </div>
                                  ) : (
                                     <button onClick={() => handleEditClick(r)} className="p-2 text-zinc-500 hover:text-white bg-[#1a1a1a] hover:bg-[#262626] rounded transition-colors opacity-0 group-hover:opacity-100">
                                       <Edit3 className="w-4 h-4" />
                                     </button>
                                  )}
                               </td>
                            </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      ))}
    </div>
  );
}
