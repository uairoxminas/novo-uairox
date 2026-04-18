import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal, RefreshCw, Users2 } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';
import { motion } from 'framer-motion';

export default function LeaderboardPage() {
  const { data: events, isLoading: loadingEvents } = useEvents();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Selecionar primeiro evento automaticamente
  React.useEffect(() => {
    if (events && events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  // Buscar Resultados do Evento Selecionado
  const { data: results, isLoading: loadingResults, refetch } = useQuery({
    queryKey: ['public_race_results', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const { data, error } = await supabase
        .from('race_results' as any)
        .select(`
          id, bib_number, raw_time_ms, total_penalties_seconds, final_adjusted_time_ms, status,
          registrations (
             athlete_name, 
             team_name, 
             categories (name)
          )
        `)
        .eq('event_id', selectedEventId)
        .in('status', ['validated', 'dnf', 'disqualified']);
        
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!selectedEventId
  });

  // Extrair Categorias Únicas
  const categories = React.useMemo(() => {
    if (!results) return [];
    const cats = new Set(results.map((r: any) => r.registrations?.categories?.name || 'Sem Categoria'));
    return Array.from(cats) as string[];
  }, [results]);

  const activeEvent = events?.find((e: any) => e.id === selectedEventId);

  // Filtrar e Ordenar
  const filteredResults = React.useMemo(() => {
    if (!results) return [];
    
    let filtered = results;
    if (selectedCategory !== 'all') {
       filtered = results.filter((r: any) => (r.registrations?.categories?.name || 'Sem Categoria') === selectedCategory);
    }
    
    return filtered.sort((a: any, b: any) => {
      if (a.status === 'validated' && b.status !== 'validated') return -1;
      if (a.status !== 'validated' && b.status === 'validated') return 1;
      return (a.final_adjusted_time_ms || 999999999) - (b.final_adjusted_time_ms || 999999999);
    });
  }, [results, selectedCategory]);

  const formatMs = (ms: number | null) => {
    if (!ms && ms !== 0) return '--:--';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = Math.floor((ms % 60000) / 1000);
    const msPortion = Math.floor((ms % 1000) / 10); // get 2 digits of ms
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${msPortion.toString().padStart(2, '0')}`;
  };

  const getRankData = (index: number) => {
    if (filteredResults.length <= index) return null;
    const r = filteredResults[index];
    const name = r.registrations?.athlete_name || r.registrations?.team_name || 'Desconhecido';
    return {
      name,
      time: r.status === 'validated' ? formatMs(r.final_adjusted_time_ms) : r.status.toUpperCase(),
      isValid: r.status === 'validated'
    };
  };

  const first = getRankData(0);
  const second = getRankData(1);
  const third = getRankData(2);

  if (loadingEvents) {
    return (
      <div className="min-h-screen pt-32 pb-20 flex items-center justify-center">
         <div className="w-8 h-8 rounded-full border-4 border-[#EDAC02] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 bg-[#0a0a0d]">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
             <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl text-white italic tracking-tight uppercase">
                RANKING
             </h1>
             <p className="text-[var(--uairox-zinc-light)] uppercase tracking-widest text-sm mt-2">
                {activeEvent?.title || 'SELECIONE UM EVENTO'} - Resultados em tempo real
             </p>
          </motion.div>

          <div className="flex flex-wrap items-center gap-3">
             <select
                value={selectedEventId || ''}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="px-4 py-2 bg-transparent border border-white/20 rounded-lg text-white font-bold text-sm focus:border-[#EDAC02] focus:outline-none appearance-none cursor-pointer"
             >
                {events?.map((ev: any) => (
                   <option key={ev.id} value={ev.id} className="bg-[#111]">{ev.title}</option>
                ))}
             </select>
             
             <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-transparent border border-white/20 rounded-lg text-white font-bold text-sm focus:border-[#EDAC02] focus:outline-none appearance-none cursor-pointer min-w-[200px]"
             >
                <option value="all" className="bg-[#111]">Todas Categorias</option>
                {categories.map((cat) => (
                   <option key={cat} value={cat} className="bg-[#111]">{cat}</option>
                ))}
             </select>

             <button onClick={() => refetch()} className="p-2 border border-[#EDAC02] rounded-lg text-[#EDAC02] hover:bg-[#EDAC02] hover:text-black transition-colors">
                <RefreshCw size={18} />
             </button>
          </div>
        </div>

        {loadingResults ? (
          <div className="flex justify-center py-20">
             <div className="w-8 h-8 rounded-full border-4 border-[#EDAC02] border-t-transparent animate-spin" />
          </div>
        ) : (!results || results.length === 0) ? (
          <div className="text-center py-20 border border-white/5 rounded-3xl bg-black/20 backdrop-blur-sm">
             <Users2 className="w-16 h-16 text-white/10 mx-auto mb-4" />
             <h3 className="font-heading text-2xl text-white uppercase mb-2">Nenhum resultado processado</h3>
             <p className="text-[var(--uairox-zinc-light)]">Aguardando inserção de tempos pelas baterias oficiais.</p>
          </div>
        ) : (
          <>
            {/* O PÓDIO VISUAL */}
            <div className="flex justify-center items-end h-[320px] mb-12 gap-2 sm:gap-6 lg:gap-12 px-2">
               {/* 2º LUGAR */}
               <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center flex-1 max-w-[220px]">
                  {second && second.isValid && (
                     <>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-[#e2e8f0] to-[#64748b] flex items-center justify-center shadow-[0_0_20px_rgba(148,163,184,0.2)] mb-4">
                           <Medal size={32} className="text-white drop-shadow-md" />
                        </div>
                        <h3 className="font-heading text-white text-center uppercase mb-1 leading-tight text-xs sm:text-base">{second.name}</h3>
                        <div className="w-4 h-[1px] bg-white/20 mb-1" />
                        <p className="text-[#EDAC02] font-mono font-bold mb-4 text-sm">{second.time}</p>
                     </>
                  )}
                  <div className="w-full h-24 bg-gradient-to-b from-[#4a4a4a] to-[#262626] rounded-t-xl flex items-start justify-center pt-2 font-heading text-4xl text-white/50 border-t border-white/10 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
                     2
                  </div>
               </motion.div>

               {/* 1º LUGAR */}
               <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center flex-1 max-w-[260px] z-10">
                  {first && first.isValid && (
                     <>
                        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-b from-[#fde047] to-[#a16207] flex items-center justify-center shadow-[0_0_40px_rgba(237,172,2,0.4)] mb-4 border-2 border-yellow-300">
                           <Trophy size={48} className="text-yellow-900 drop-shadow-md" />
                        </div>
                        <h3 className="font-heading text-white text-center uppercase mb-1 leading-tight text-sm sm:text-lg">{first.name}</h3>
                        <div className="w-4 h-[1px] bg-white/20 mb-1" />
                        <p className="text-[#EDAC02] font-mono font-black mb-4 text-base">{first.time}</p>
                     </>
                  )}
                  <div className="w-full h-36 sm:h-40 bg-gradient-to-b from-[#ab8026] to-[#5a4313] rounded-t-xl flex items-start justify-center pt-2 font-heading text-5xl sm:text-6xl text-black/50 border-t border-yellow-500/30 shadow-[0_-5px_20px_rgba(171,128,38,0.3)]">
                     1
                  </div>
               </motion.div>

               {/* 3º LUGAR */}
               <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex flex-col items-center flex-1 max-w-[220px]">
                  {third && third.isValid && (
                     <>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-b from-[#f97316] to-[#9a3412] flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.2)] mb-4">
                           <Medal size={32} className="text-white drop-shadow-md" />
                        </div>
                        <h3 className="font-heading text-white text-center uppercase mb-1 leading-tight text-xs sm:text-base">{third.name}</h3>
                        <div className="w-4 h-[1px] bg-white/20 mb-1" />
                        <p className="text-[#EDAC02] font-mono font-bold mb-4 text-sm">{third.time}</p>
                     </>
                  )}
                  <div className="w-full h-16 sm:h-20 bg-gradient-to-b from-[#8b4a2e] to-[#462111] rounded-t-xl flex items-start justify-center pt-2 font-heading text-4xl text-black/50 border-t border-orange-500/20 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
                     3
                  </div>
               </motion.div>
            </div>

            {/* TABELA DE TODOS */}
            <div className="bg-[#111113] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
               <div className="overflow-x-auto">
                 <table className="w-full text-left whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-white/10 text-[var(--uairox-zinc-light)] text-[11px] sm:text-xs font-bold uppercase tracking-widest bg-black/40">
                         <th className="py-4 px-6 w-20 text-center">Pos</th>
                         <th className="py-4 px-6 w-20 text-center">Nº</th>
                         <th className="py-4 px-6">Atleta</th>
                         <th className="py-4 px-6">Equipe</th>
                         <th className="py-4 px-6">Categoria</th>
                         <th className="py-4 px-6 text-center">Penalidades</th>
                         <th className="py-4 px-6 text-right">Tempo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredResults.map((r: any, idx: number) => {
                         const name = r.registrations?.athlete_name || 'Desconhecido';
                         const team = r.registrations?.team_name || '--';
                         const category = r.registrations?.categories?.name || 'Sem Categoria';
                         const isPodium = r.status === 'validated' && idx < 3;
                         const isDNF = r.status !== 'validated';
                         
                         return (
                           <motion.tr 
                             key={r.id} 
                             initial={{ opacity: 0 }} 
                             animate={{ opacity: 1 }} 
                             className="hover:bg-white/[0.02] transition-colors"
                           >
                              {/* POSIÇÃO */}
                              <td className="py-4 px-6 text-center">
                                 {isDNF ? (
                                   <span className="text-[var(--uairox-zinc)] font-bold">-</span>
                                 ) : isPodium ? (
                                   <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-black text-[13px] shadow-lg ${
                                     idx === 0 ? 'bg-[#EDAC02] text-black' :
                                     idx === 1 ? 'bg-gradient-to-b from-[#e2e8f0] to-[#94a3b8] text-black' :
                                     'bg-gradient-to-b from-[#f97316] to-[#9a3412] text-white'
                                   }`}>
                                      {idx + 1}
                                   </div>
                                 ) : (
                                   <span className="font-bold text-white text-sm">{idx + 1}</span>
                                 )}
                              </td>
                              
                              {/* BIB / N° */}
                              <td className="py-4 px-6 text-center text-[var(--uairox-zinc-light)] text-sm font-mono">
                                 {r.bib_number}
                              </td>

                              {/* ATLETA */}
                              <td className="py-4 px-6">
                                 <div className={`font-bold uppercase text-sm ${isDNF ? 'text-[var(--uairox-zinc)] line-through' : 'text-white'}`}>
                                    {name}
                                 </div>
                              </td>

                              {/* EQUIPE */}
                              <td className="py-4 px-6 text-[var(--uairox-zinc-light)] text-xs font-bold uppercase tracking-wider">
                                 {team}
                              </td>

                              {/* CATEGORIA */}
                              <td className="py-4 px-6 text-[var(--uairox-zinc)] text-xs font-bold uppercase tracking-wider">
                                 {category}
                              </td>

                              {/* PENALIDADES */}
                              <td className="py-4 px-6 text-center">
                                 <span className={r.total_penalties_seconds > 0 ? 'text-red-500 font-mono text-sm' : 'text-[var(--uairox-zinc)]'}>
                                   {r.total_penalties_seconds > 0 ? `+${r.total_penalties_seconds}s` : '--'}
                                 </span>
                              </td>

                              {/* TEMPO FINAL */}
                              <td className="py-4 px-6 text-right">
                                <span className={`font-mono text-base font-bold tabular-nums ${
                                  isDNF ? 'text-red-500 text-xs' :
                                  idx === 0 ? 'text-[#EDAC02]' :
                                  'text-white'
                                }`}>
                                   {isDNF ? r.status.toUpperCase() : formatMs(r.final_adjusted_time_ms)}
                                </span>
                              </td>
                           </motion.tr>
                         )
                      })}
                    </tbody>
                 </table>
               </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}
