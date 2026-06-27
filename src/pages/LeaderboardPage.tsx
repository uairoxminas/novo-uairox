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
             categories (name, team_size, results_published)
          )
        `)
        .eq('event_id', selectedEventId)
        .in('status', ['validated', 'dnf', 'disqualified']);

      if (error) throw error;
      // Só mostra resultados de categorias já LIBERADAS (botão "Liberar premiação").
      return ((data || []) as any[]).filter((r: any) => r.registrations?.categories?.results_published === true);
    },
    enabled: !!selectedEventId,
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
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
    const teamSize = r.registrations?.categories?.team_size ?? 1;
    const name = teamSize > 1
      ? (r.registrations?.team_name || 'Sem Equipe')
      : (r.registrations?.athlete_name || 'Desconhecido');
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
    <div className="min-h-screen pt-32 pb-20 bg-[#050505] text-white selection:bg-brand-500 selection:text-black">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16 relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
             <div className="inline-block px-4 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-500 text-sm font-bold uppercase tracking-widest skew-x-[-10deg] mb-4">
               <span className="block skew-x-[10deg]">Ao Vivo</span>
             </div>
             <h1 className="text-5xl md:text-7xl font-black uppercase italic leading-none mb-2">
                RANKING <span className="text-brand-500">GLOBAL</span>
             </h1>
             <p className="text-zinc-400 uppercase tracking-widest text-sm font-bold">
                {activeEvent?.title || 'SELECIONE UM EVENTO'}
             </p>
          </motion.div>

          <div className="flex flex-wrap items-center gap-4">
             <div className="relative">
               <select
                  value={selectedEventId || ''}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="px-4 py-3 bg-[#111] border border-dark-border text-white font-bold text-sm uppercase outline-none focus:border-brand-500 appearance-none cursor-pointer pr-10 skew-x-[-5deg]"
               >
                  {events?.map((ev: any) => (
                     <option key={ev.id} value={ev.id} className="bg-[#111]">{ev.title}</option>
                  ))}
               </select>
               <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-brand-500 skew-x-[-5deg]">▼</div>
             </div>
             
             <div className="relative">
               <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-3 bg-[#111] border border-dark-border text-white font-bold text-sm uppercase outline-none focus:border-brand-500 appearance-none cursor-pointer pr-10 skew-x-[-5deg] min-w-[200px]"
               >
                  <option value="all" className="bg-[#111]">Todas Categorias</option>
                  {categories.map((cat) => (
                     <option key={cat} value={cat} className="bg-[#111]">{cat}</option>
                  ))}
               </select>
               <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-brand-500 skew-x-[-5deg]">▼</div>
             </div>

             <button onClick={() => refetch()} className="p-3 bg-brand-500 text-black font-bold uppercase text-sm skew-x-[-5deg] hover:bg-brand-400 transition-colors flex items-center justify-center">
                <RefreshCw size={18} className="skew-x-[5deg]" />
             </button>
          </div>
        </div>

        {loadingResults ? (
          <div className="flex justify-center py-20">
             <div className="w-8 h-8 rounded-full border-4 border-brand-500 border-t-transparent animate-spin" />
          </div>
        ) : (!results || results.length === 0) ? (
          <div className="text-center py-20 border border-dark-border bg-dark-card skew-x-[-5deg]">
             <div className="skew-x-[5deg]">
               <Users2 className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
               <h3 className="font-black text-2xl text-white uppercase italic mb-2">Nenhum resultado processado</h3>
               <p className="text-zinc-400">Aguardando inserção de tempos pelas baterias oficiais.</p>
             </div>
          </div>
        ) : (
          <>
            {/* O PÓDIO VISUAL */}
            <div className="flex justify-center items-end h-[320px] mb-20 gap-2 sm:gap-6 lg:gap-12 px-2">
               {/* 2º LUGAR */}
               <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col items-center flex-1 max-w-[220px]">
                  {second && second.isValid && (
                     <>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#111] border border-zinc-500 flex items-center justify-center skew-x-[-10deg] mb-4">
                           <Medal size={32} className="text-zinc-400 skew-x-[10deg]" />
                        </div>
                        <h3 className="font-black text-white text-center uppercase italic mb-1 leading-tight text-xs sm:text-base">{second.name}</h3>
                        <div className="w-8 h-[2px] bg-brand-500 mb-2 skew-x-[-10deg]" />
                        <p className="text-brand-500 font-mono font-bold mb-4 text-sm">{second.time}</p>
                     </>
                  )}
                  <div className="w-full h-24 bg-[#111] border border-dark-border skew-x-[-5deg] flex items-start justify-center pt-2">
                     <span className="font-black text-4xl text-zinc-600 skew-x-[5deg]">2</span>
                  </div>
               </motion.div>

               {/* 1º LUGAR */}
               <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center flex-1 max-w-[260px] z-10">
                  {first && first.isValid && (
                     <>
                        <div className="w-24 h-24 sm:w-28 sm:h-28 bg-brand-500 flex items-center justify-center skew-x-[-10deg] mb-4 shadow-[0_0_30px_rgba(237,172,2,0.2)]">
                           <Trophy size={48} className="text-black skew-x-[10deg]" />
                        </div>
                        <h3 className="font-black text-white text-center uppercase italic mb-1 leading-tight text-sm sm:text-lg">{first.name}</h3>
                        <div className="w-12 h-[3px] bg-brand-500 mb-2 skew-x-[-10deg]" />
                        <p className="text-brand-500 font-mono font-black mb-4 text-base">{first.time}</p>
                     </>
                  )}
                  <div className="w-full h-36 sm:h-40 bg-brand-500/10 border border-brand-500/30 skew-x-[-5deg] flex items-start justify-center pt-2 relative overflow-hidden">
                     <div className="absolute inset-0 bg-brand-500/5 backdrop-blur-sm" />
                     <span className="font-black text-5xl sm:text-6xl text-brand-500 skew-x-[5deg] relative z-10">1</span>
                  </div>
               </motion.div>

               {/* 3º LUGAR */}
               <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex flex-col items-center flex-1 max-w-[220px]">
                  {third && third.isValid && (
                     <>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#111] border border-orange-800 flex items-center justify-center skew-x-[-10deg] mb-4">
                           <Medal size={32} className="text-orange-700 skew-x-[10deg]" />
                        </div>
                        <h3 className="font-black text-white text-center uppercase italic mb-1 leading-tight text-xs sm:text-base">{third.name}</h3>
                        <div className="w-8 h-[2px] bg-brand-500 mb-2 skew-x-[-10deg]" />
                        <p className="text-brand-500 font-mono font-bold mb-4 text-sm">{third.time}</p>
                     </>
                  )}
                  <div className="w-full h-16 sm:h-20 bg-[#111] border border-dark-border skew-x-[-5deg] flex items-start justify-center pt-2">
                     <span className="font-black text-4xl text-zinc-700 skew-x-[5deg]">3</span>
                  </div>
               </motion.div>
            </div>

            {/* TABELA DE TODOS */}
            <div className="bg-dark-card border border-dark-border overflow-hidden relative skew-x-[-2deg]">
               <div className="skew-x-[2deg] overflow-x-auto">
                 <table className="w-full text-left whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-dark-border text-brand-500 text-[11px] sm:text-xs font-black uppercase tracking-widest bg-black/40">
                         <th className="py-4 px-6 w-20 text-center">Pos</th>
                         <th className="py-4 px-6 w-20 text-center">Nº</th>
                         <th className="py-4 px-6">Atleta / Equipe</th>
                         <th className="py-4 px-6">Categoria</th>
                         <th className="py-4 px-6 text-center">Penalidades</th>
                         <th className="py-4 px-6 text-right">Tempo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border">
                      {filteredResults.map((r: any, idx: number) => {
                         const teamSize = r.registrations?.categories?.team_size ?? 1;
                         const isTeamCategory = teamSize > 1;
                         const displayName = isTeamCategory
                           ? (r.registrations?.team_name || 'Sem Equipe')
                           : (r.registrations?.athlete_name || 'Desconhecido');
                         const displaySub = isTeamCategory
                           ? null
                           : (r.registrations?.team_name || null);
                         const category = r.registrations?.categories?.name || 'Sem Categoria';
                         const isPodium = r.status === 'validated' && idx < 3;
                         const isDNF = r.status !== 'validated';
                         
                         return (
                           <motion.tr 
                             key={r.id} 
                             initial={{ opacity: 0 }} 
                             animate={{ opacity: 1 }} 
                             className="hover:bg-[#1a1a1a] transition-colors"
                           >
                              {/* POSIÇÃO */}
                              <td className="py-4 px-6 text-center">
                                 {isDNF ? (
                                   <span className="text-zinc-600 font-black">-</span>
                                 ) : isPodium ? (
                                   <div className={`w-8 h-8 mx-auto flex items-center justify-center font-black text-[13px] skew-x-[-10deg] ${
                                     idx === 0 ? 'bg-brand-500 text-black' :
                                     idx === 1 ? 'bg-zinc-300 text-black' :
                                     'bg-[#8b4a2e] text-white'
                                   }`}>
                                      <span className="skew-x-[10deg]">{idx + 1}</span>
                                   </div>
                                 ) : (
                                   <span className="font-bold text-zinc-400 text-sm">{idx + 1}</span>
                                 )}
                              </td>
                              
                              {/* BIB / N° */}
                              <td className="py-4 px-6 text-center text-zinc-400 text-sm font-mono">
                                 {r.bib_number}
                              </td>

                              {/* ATLETA / EQUIPE — dinâmico por team_size da categoria */}
                              <td className="py-4 px-6">
                                <div className={`font-black italic uppercase text-sm ${isDNF ? 'text-zinc-600 line-through' : 'text-white'}`}>
                                  {displayName}
                                </div>
                                {displaySub && (
                                  <div className="text-zinc-500 text-[11px] font-bold uppercase tracking-wider mt-0.5">
                                    {displaySub}
                                  </div>
                                )}
                              </td>

                              {/* CATEGORIA */}
                              <td className="py-4 px-6 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                                 {category}
                              </td>

                              {/* PENALIDADES */}
                              <td className="py-4 px-6 text-center">
                                 <span className={r.total_penalties_seconds > 0 ? 'text-brand-500 font-mono font-bold text-sm' : 'text-zinc-600'}>
                                   {r.total_penalties_seconds > 0 ? `+${r.total_penalties_seconds}s` : '--'}
                                 </span>
                              </td>

                              {/* TEMPO FINAL */}
                              <td className="py-4 px-6 text-right">
                                <span className={`font-mono text-base font-black tabular-nums ${
                                  isDNF ? 'text-zinc-600 text-xs' :
                                  idx === 0 ? 'text-brand-500' :
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
