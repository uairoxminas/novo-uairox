import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Trophy, Medal, AlertOctagon, Edit3, Save, X, Upload, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useCategories } from '@/hooks/useEventConfig';

export default function AdminResultsManagerPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTimeMs, setEditTimeMs] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('');

  // Import states
  const [showImport, setShowImport] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importData, setImportData] = useState<any[]>([]);
  const [importMapping, setImportMapping] = useState<Record<string,string>>({});
  const [isImporting, setIsImporting] = useState(false);

  // Manual add states
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualTeam, setManualTeam] = useState('');
  const [manualCat, setManualCat] = useState('');
  const [manualBib, setManualBib] = useState('');
  const [manualTime, setManualTime] = useState('');
  const [manualPenalty, setManualPenalty] = useState('0');
  const [manualStatus, setManualStatus] = useState('validated');
  const [isManualSaving, setIsManualSaving] = useState(false);

  const { data: categories } = useCategories(eventId);

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

  // Excluir Resultado Individual
  const deleteResult = useMutation({
    mutationFn: async (resultId: string) => {
      const { error } = await supabase.from('race_results' as any).delete().eq('id', resultId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['race_results_complete', eventId] });
      toast.success('Resultado excluído!');
    }
  });

  // Limpar todo o Leaderboard
  const clearLeaderboard = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('race_results' as any).delete().eq('event_id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['race_results_complete', eventId] });
      toast.success('Leaderboard excluído com sucesso!');
    }
  });

  const handleClearLeaderboard = () => {
    if (confirm('Tem certeza que deseja EXCLUIR TODOS OS RESULTADOS deste evento? Essa ação não pode ser desfeita e zerará o leaderboard.')) {
      clearLeaderboard.mutate();
    }
  };

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

  const parseTimeToMs = (t: string | number): number => {
    if (t === undefined || t === null || t === '') return 0;
    const str = String(t).trim();

    const p3 = str.match(/^(\d+)[:\.](\d+)[:\.](\d+)$/);
    if (p3) {
      const a = Number(p3[1]);
      const b = Number(p3[2]);
      const c = Number(p3[3]);

      if (a === 0) {
         return (b * 60 + c) * 1000;
      } else if (c === 0) {
         return (a * 60 + b) * 1000;
      } else {
         if (a < 10) {
            return (a * 3600 + b * 60 + c) * 1000;
         } else {
            return (a * 60 + b) * 1000 + c;
         }
      }
    }

    const p2 = str.match(/^(\d+)[:\.](\d+)$/);
    if (p2) {
      if (p2[2].length <= 3) {
        return (Number(p2[1]) * 60 + Number(p2[2])) * 1000;
      }
    }

    const n = Number(str.replace(',', '.'));
    if (isNaN(n)) return 0;

    if (n > 0 && n < 10 && str.includes('.') && str.split('.')[1].length > 4) {
       const totalMs = Math.round(n * 86400000);
       if (n >= 1) return Math.round(totalMs / 60);
       return totalMs;
    }

    return n > 1000 ? n : n * 1000;
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }) as any[][];
      if (data.length > 0) {
        const headers = data[0].map(h => String(h || '').trim());
        setImportHeaders(headers);
        const rows = data.slice(1).filter(r => r.some(c => !!c));
        setImportData(rows.map(r => { const o: any = {}; headers.forEach((h, i) => { o[h] = r[i] || ''; }); return o; }));
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (!importMapping['category']) return toast.error('Mapeie a coluna de Categoria!');
    if (!importMapping['name']) return toast.error('Mapeie a coluna de Nome!');
    setIsImporting(true);
    let count = 0;
    for (const row of importData) {
      const catName = String(row[importMapping['category']] || '').trim().toLowerCase();
      const cat = categories?.find((c: any) => c.name.trim().toLowerCase() === catName);
      if (!cat) continue;
      const name = String(row[importMapping['name']] || 'Sem Nome');
      const team = importMapping['team'] ? String(row[importMapping['team']] || '') : null;
      const bib = importMapping['bib'] ? String(row[importMapping['bib']] || '') : '';
      const timeStr = importMapping['time'] ? String(row[importMapping['time']] || '') : '';
      const penalty = importMapping['penalty'] ? Number(row[importMapping['penalty']] || 0) : 0;
      const rawMs = parseTimeToMs(timeStr);
      const finalMs = rawMs + penalty * 1000;
      const { data: reg } = await supabase.from('registrations').insert({ event_id: eventId, category_id: cat.id, athlete_name: name, team_name: team, status: 'confirmed', payment_method: 'import', total_paid: 0, bib_number: bib || null } as any).select('id').single();
      if (reg) {
        await supabase.from('race_results' as any).insert({ event_id: eventId, registration_id: reg.id, bib_number: bib || '', raw_time_ms: rawMs, total_penalties_seconds: penalty, final_adjusted_time_ms: finalMs, status: rawMs > 0 ? 'validated' : 'dnf' });
        count++;
      }
    }
    setIsImporting(false);
    if (count === 0) return toast.error('Nenhum resultado importado. Verifique os nomes das categorias.');
    toast.success(`${count} resultados importados!`);
    setShowImport(false); setImportStep(1); setImportData([]); setImportHeaders([]); setImportMapping({});
    qc.invalidateQueries({ queryKey: ['race_results_complete', eventId] });
  };

  const handleManualAdd = async () => {
    if (!manualName || !manualCat) return toast.error('Preencha nome e categoria!');
    setIsManualSaving(true);
    const rawMs = parseTimeToMs(manualTime);
    const pen = Number(manualPenalty) || 0;
    const finalMs = rawMs + pen * 1000;
    const { data: reg } = await supabase.from('registrations').insert({ event_id: eventId, category_id: manualCat, athlete_name: manualName, team_name: manualTeam || null, status: 'confirmed', payment_method: 'manual', total_paid: 0, bib_number: manualBib || null } as any).select('id').single();
    if (reg) {
      await supabase.from('race_results' as any).insert({ event_id: eventId, registration_id: reg.id, bib_number: manualBib || '', raw_time_ms: rawMs, total_penalties_seconds: pen, final_adjusted_time_ms: finalMs, status: manualStatus });
      toast.success('Resultado adicionado!');
      setShowManual(false); setManualName(''); setManualTeam(''); setManualBib(''); setManualTime(''); setManualPenalty('0');
      qc.invalidateQueries({ queryKey: ['race_results_complete', eventId] });
    }
    setIsManualSaving(false);
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
         <div className="flex-1">
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Leaderboard Oficial</h1>
            <p className="text-sm font-bold text-zinc-500 mt-1">Classificação Geral e Ajustes Manuais</p>
         </div>
         <button onClick={() => setShowImport(true)} className="px-4 py-2.5 bg-[#111] border border-[#262626] text-zinc-300 text-xs font-bold rounded-xl hover:border-[#EDAC02] hover:text-[#EDAC02] transition-all flex items-center gap-2">
           <Upload className="w-4 h-4" /> Importar Planilha
         </button>
         <button onClick={() => setShowManual(true)} className="px-4 py-2.5 bg-[#EDAC02] text-black text-xs font-black rounded-xl hover:bg-[#d49b02] transition-all flex items-center gap-2">
           <Plus className="w-4 h-4" /> Adicionar Manual
         </button>
         <button onClick={handleClearLeaderboard} disabled={clearLeaderboard.isPending} className="px-4 py-2.5 bg-red-900/20 text-red-500 border border-red-900/50 text-xs font-black rounded-xl hover:bg-red-900/40 hover:border-red-500 transition-all flex items-center gap-2">
           <Trash2 className="w-4 h-4" /> {clearLeaderboard.isPending ? 'Excluindo...' : 'Excluir Leaderboard'}
         </button>
      </div>

      {/* IMPORT MODAL */}
      {showImport && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowImport(false)}>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black text-white uppercase">📥 Importar Resultados</h2>

            {importStep === 1 && (<>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Selecione o Arquivo</label>
                <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImportFile} className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-bold file:bg-[#EDAC02] file:text-black cursor-pointer" />
              </div>
              {importData.length > 0 && (
                <div className="pt-4 border-t border-[#1a1a1a]">
                  <p className="text-sm text-white font-bold mb-3">{importData.length} linhas encontradas</p>
                  <button onClick={() => setImportStep(2)} className="w-full py-3 bg-[#EDAC02] text-black font-black rounded-lg">Mapear Colunas →</button>
                </div>
              )}
            </>)}

            {importStep === 2 && (<>
              <p className="text-xs text-zinc-400">Mapeie as colunas da planilha. Nome da categoria deve ser idêntico ao cadastrado.</p>
              <div className="space-y-3">
                {[
                  { key: 'category', label: 'Categoria *', required: true },
                  { key: 'name', label: 'Nome Atleta *', required: true },
                  { key: 'team', label: 'Nome Equipe' },
                  { key: 'bib', label: 'Nº Peito (BIB)' },
                  { key: 'time', label: 'Tempo (mm:ss ou ms)' },
                  { key: 'penalty', label: 'Penalidade (segundos)' },
                ].map(f => (
                  <div key={f.key} className={`bg-[#111] p-3 rounded-lg border ${f.required ? 'border-[#EDAC02]/40' : 'border-[#262626]'}`}>
                    <label className="block text-[10px] text-zinc-500 mb-1">{f.label}</label>
                    <select value={importMapping[f.key] || ''} onChange={e => setImportMapping(p => ({...p, [f.key]: e.target.value}))} className="w-full bg-[#050505] border border-[#333] rounded px-2 py-1.5 text-white text-xs">
                      <option value="">Ignorar</option>
                      {importHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-3 border-t border-[#1a1a1a]">
                <button onClick={() => setImportStep(1)} className="flex-1 py-2.5 border border-[#262626] rounded-lg text-zinc-400 font-bold">Voltar</button>
                <button onClick={handleConfirmImport} disabled={isImporting} className="flex-1 py-2.5 bg-[#10b981] text-white font-black rounded-lg">{isImporting ? 'Importando...' : 'Confirmar'}</button>
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* MANUAL ADD MODAL */}
      {showManual && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowManual(false)}>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black text-white uppercase">➕ Resultado Manual</h2>
            <div className="space-y-3">
              <div><label className="block text-[10px] text-zinc-500 mb-1">Nome do Atleta *</label><input value={manualName} onChange={e => setManualName(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2.5 text-white text-sm" /></div>
              <div><label className="block text-[10px] text-zinc-500 mb-1">Nome da Equipe</label><input value={manualTeam} onChange={e => setManualTeam(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2.5 text-white text-sm" /></div>
              <div><label className="block text-[10px] text-zinc-500 mb-1">Categoria *</label>
                <select value={manualCat} onChange={e => setManualCat(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2.5 text-white text-sm">
                  <option value="">Selecione...</option>
                  {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] text-zinc-500 mb-1">Nº Peito</label><input value={manualBib} onChange={e => setManualBib(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2.5 text-white text-sm font-mono" /></div>
                <div><label className="block text-[10px] text-zinc-500 mb-1">Tempo (mm:ss)</label><input value={manualTime} onChange={e => setManualTime(e.target.value)} placeholder="05:30" className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2.5 text-white text-sm font-mono" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] text-zinc-500 mb-1">Penalidade (seg)</label><input type="number" value={manualPenalty} onChange={e => setManualPenalty(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2.5 text-white text-sm font-mono" /></div>
                <div><label className="block text-[10px] text-zinc-500 mb-1">Status</label>
                  <select value={manualStatus} onChange={e => setManualStatus(e.target.value)} className="w-full bg-[#050505] border border-[#262626] rounded-lg p-2.5 text-white text-sm">
                    <option value="validated">Validado</option><option value="dnf">DNF</option><option value="disqualified">Desclassificado</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-3 border-t border-[#1a1a1a]">
              <button onClick={() => setShowManual(false)} className="flex-1 py-2.5 border border-[#262626] rounded-lg text-zinc-400 font-bold">Cancelar</button>
              <button onClick={handleManualAdd} disabled={isManualSaving} className="flex-1 py-2.5 bg-[#EDAC02] text-black font-black rounded-lg">{isManualSaving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {Object.keys(groupedByCategory).length === 0 && (
         <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-12 rounded-3xl text-center">
            <Trophy className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhum resultado processado ainda</h3>
            <p className="text-zinc-500">Use os botões acima para importar resultados de eventos passados ou adicionar manualmente.</p>
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
                                     <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                       <button onClick={() => handleEditClick(r)} className="p-2 text-zinc-500 hover:text-white bg-[#1a1a1a] hover:bg-[#262626] rounded transition-colors">
                                         <Edit3 className="w-4 h-4" />
                                       </button>
                                       <button onClick={() => { if(confirm('Excluir este resultado?')) deleteResult.mutate(r.id); }} disabled={deleteResult.isPending} className="p-2 text-red-500/50 hover:text-red-500 bg-[#1a1a1a] hover:bg-red-500/10 rounded transition-colors">
                                         <Trash2 className="w-4 h-4" />
                                       </button>
                                     </div>
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
