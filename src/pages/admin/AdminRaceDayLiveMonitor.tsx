import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Timer, AlertOctagon, CheckCircle2, Zap, Loader2, Flag } from 'lucide-react';
import { useEventTimingConfig, useHeatAthletesWithSplits, useApplyPenalty, useSimulateSplit, useRaceCheckpoints, useValidateResult, useCompleteHeat } from '@/hooks/useRaceDayConfig';
import { toast } from 'sonner';

export default function AdminRaceDayLiveMonitor() {
  const { id: eventId, heatId } = useParams<{ id: string; heatId: string }>();
  const navigate = useNavigate();

  // Buscar Configuração de Tempo
  const { data: timingConfigData } = useEventTimingConfig(eventId!);
  const timingConfig = timingConfigData as any;

  // Buscar dados da Bateria
  const { data: heatData } = useQuery({
    queryKey: ['heats', heatId],
    queryFn: async () => {
      const { data, error } = await supabase.from('heats' as any).select('*').eq('id', heatId).single();
      if (error) throw error;
      return data;
    },
  });
  const heat = heatData as any;

  // Radar de Dados (Atletas, Splits e Penalidades)
  const { data: radar, error: radarError, isLoading: radarLoading } = useHeatAthletesWithSplits(heatId!);
  const { data: checkpointsData } = useRaceCheckpoints(eventId!);
  const checkpoints = checkpointsData as any[];
  const applyPenalty = useApplyPenalty();
  const simulateSplit = useSimulateSplit();
  const validateResult = useValidateResult();
  const completeHeat = useCompleteHeat();

  const validLanes = radar?.filter((l: any) => l.registration_id) || [];
  const allValidated = validLanes.length > 0 && validLanes.every((l: any) => l.result);

  // Auto-complete Bateria quando todos os atletas válidos finalizarem
  useEffect(() => {
    if (allValidated && heat?.status === 'running' && !completeHeat.isPending) {
      completeHeat.mutate(heatId!, {
        onSuccess: () => {
          toast.success('Todos os resultados salvos! Bateria concluída.');
          navigate(`/admin/raceday/${eventId}`);
        }
      });
    }
  }, [allValidated, heat?.status, completeHeat, heatId, eventId, navigate]);

  // Relógio Dinâmico
  const [elapsed, setElapsed] = useState<string>('00:00:00');
  
  useEffect(() => {
    if (!heat?.start_time) return;
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(heat.start_time).getTime();
      const diff = now - start;
      if (diff < 0) return;

      const hrs = Math.floor(diff / 3600000).toString().padStart(2, '0');
      const mins = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
      const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
      
      setElapsed(`${hrs}:${mins}:${secs}`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [heat?.start_time]);

  // Numpad State
  const [bibInput, setBibInput] = useState('');

  const handleNumpad = (num: string) => {
    if (bibInput.length >= 4) return;
    setBibInput(p => p + num);
  };

  const handleApplyPenalty = () => {
    if (!bibInput) return;
    const target = radar?.find((r: any) => String(r.registrations?.bib_number) === String(bibInput));
    if (!target) {
      toast.error('Nenhum atleta encontrado com este BIB na bateria atual!');
      return;
    }
    applyPenalty.mutate({
      event_id: eventId!,
      heat_id: heatId!,
      registration_id: target.registration_id,
      bib_number: target.registrations?.bib_number
    }, {
      onSuccess: () => {
        toast.success(`+30s aplicados para ${target.registrations?.athlete_name || target.registrations?.team_name}!`);
        setBibInput('');
      },
      onError: (err: any) => toast.error('Erro ao aplicar: ' + err.message)
    });
  };

  const handleSimulatePass = (registration_id: string, bib_number: string) => {
    if (!checkpoints || checkpoints.length === 0) {
      toast.error('Crie pelo menos 1 Tapete na aba anterior para simular!');
      return;
    }
    // Pega o primeiro tapete pra simular
    const cp = checkpoints[0];
    simulateSplit.mutate({ event_id: eventId!, heat_id: heatId!, registration_id, bib_number, checkpoint_id: cp.id }, {
      onSuccess: () => toast.success('BIP! Passagem no tapete registrada.'),
      onError: (err: any) => toast.error('Erro no BIP: ' + err.message)
    });
  };

  const handleValidate = (lane: any) => {
    if (!heat?.start_time) {
      toast.error('Bateria não possui data de início oficial.');
      return;
    }
    const startTime = new Date(heat.start_time).getTime();
    
    // Pegar o timestamp da última passagem (split)
    const latestSplit = lane.splits?.sort((a: any, b: any) => 
      new Date(b.split_timestamp).getTime() - new Date(a.split_timestamp).getTime()
    )[0];

    if (!latestSplit) {
      toast.error('Nenhuma passagem registrada para este atleta.');
      return;
    }

    const finishTime = new Date(latestSplit.split_timestamp).getTime();
    const rawTimeMs = finishTime - startTime;

    const penSeconds = (lane.penalties?.length || 0) * 30;
    const penMs = penSeconds * 1000;
    const finalTime = rawTimeMs + penMs;

    validateResult.mutate({
      event_id: eventId!,
      heat_id: heatId!,
      registration_id: lane.registration_id,
      bib_number: lane.registrations?.bib_number,
      raw_time_ms: rawTimeMs,
      total_penalties_seconds: penSeconds,
      final_adjusted_time_ms: finalTime,
      total_passes_recorded: lane.splits?.length || 0
    }, {
      onSuccess: () => toast.success(`Atleta ${lane.registrations?.athlete_name || 'Validado'} com sucesso! Resultado Salvo.`),
      onError: (err: any) => toast.error('Erro na validação: ' + err.message)
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      
      {/* HEADER AO VIVO */}
      <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/admin/raceday/${eventId}`)}
            className="w-10 h-10 bg-[#1a1a1a] hover:bg-[#262626] rounded-xl flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Tática Ao Vivo</h1>
            <p className="text-sm font-bold text-[#EDAC02]">{heat?.title || 'Carregando Bateria...'}</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
           <div className="flex items-center gap-2 px-6 py-2 bg-red-600/10 border border-red-600/30 rounded-xl">
              <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
              <span className="font-bold text-red-500 uppercase tracking-widest text-sm">Live Monitor</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUNA ESQUERDA: CRONÔMETRO E NUMPAD (3/12) */}
        <div className="lg:col-span-4 space-y-6">
           
           {/* RELÓGIO MESTRE */}
           <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-3xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                 <Timer className="w-24 h-24 text-white" />
              </div>
              <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2 relative z-10">Tempo Decorrido</p>
              <h1 className="text-6xl font-black text-white tabular-nums tracking-tighter relative z-10">{elapsed}</h1>
           </div>

           {/* NUMPAD DE PENALIDADES GERAL */}
           <div className="bg-[#0a0a0a] border border-red-900/30 rounded-3xl p-6">
              <h3 className="text-red-500 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                 <AlertOctagon className="w-4 h-4" /> Injetar Penalidade
              </h3>
              
              <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-4 mb-6 text-center h-16 flex items-center justify-center">
                 <span className="text-3xl font-black text-white tracking-widest">{bibInput || '_ _ _'}</span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                 {[1,2,3,4,5,6,7,8,9].map(num => (
                   <button key={num} onClick={() => handleNumpad(num.toString())} className="h-14 bg-[#1a1a1a] hover:bg-[#262626] rounded-xl font-black text-2xl text-white transition-colors">
                     {num}
                   </button>
                 ))}
                 <button onClick={() => setBibInput('')} className="h-14 bg-[#1a1a1a] hover:bg-[#262626] rounded-xl font-bold text-sm text-zinc-500 uppercase transition-colors">
                   C
                 </button>
                 <button onClick={() => handleNumpad('0')} className="h-14 bg-[#1a1a1a] hover:bg-[#262626] rounded-xl font-black text-2xl text-white transition-colors">
                   0
                 </button>
                 <button onClick={() => setBibInput(p => p.slice(0,-1))} className="h-14 bg-[#1a1a1a] hover:bg-[#262626] rounded-xl font-bold text-sm text-zinc-500 uppercase transition-colors">
                   DEL
                 </button>
              </div>

              <button onClick={handleApplyPenalty} disabled={applyPenalty.isPending} className="w-full h-14 bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-widest rounded-xl transition-colors shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                 + 30 Segundos
              </button>
           </div>
        </div>

        {/* COLUNA DIREITA: RADAR DE ATLETAS (9/12) */}
        <div className="lg:col-span-8 bg-[#0a0a0a] border border-[#1a1a1a] rounded-3xl overflow-hidden flex flex-col">
           <div className="p-6 border-b border-[#1a1a1a] flex justify-between items-center bg-[#050505]">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                   📡 Radar de Intersecção 
                </h2>
                <p className="text-zinc-500 text-sm mt-1">Alvo da Etapa: <strong className="text-white">{timingConfig?.target_passes_volume || '--'}</strong> Leituras de Tapete</p>
              </div>
           </div>
           
           <div className="flex-1 bg-[#0a0a0a] p-4 h-[600px] overflow-auto">
              
              <div className="space-y-3">
                 {radarLoading && (
                   <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 text-[#EDAC02] animate-spin" /></div>
                 )}
                 {radarError && (
                   <div className="p-12 text-center text-red-500 font-bold">Erro ao carregar Atletas: {(radarError as any)?.message || String(radarError)}</div>
                 )}
                 {!radarError && !radarLoading && radar?.filter((l: any) => l.registration_id).length === 0 && (
                   <div className="p-12 text-center text-zinc-500">Nenhum atleta alocado nas raias desta bateria.</div>
                 )}
                 {radar?.filter((l: any) => l.registration_id).map((lane: any) => {
                    const bib = lane.registrations?.bib_number || '--';
                    const name = lane.registrations?.athlete_name || lane.registrations?.team_name || 'Desconhecido';
                    const passCount = lane.splits?.length || 0;
                    const totalPens = lane.penalties?.length || 0;
                    const isDone = passCount >= (timingConfig?.target_passes_volume || 999);
                    
                    let finalTimeProjMs: number | null = null;
                    let crossedFinishLine = false;

                    if (lane.splits?.length > 0 && heat?.start_time) {
                      const finishLineCp = checkpoints?.find((cp: any) => cp.is_finish_line);
                      const sortedSplits = [...lane.splits].sort((a: any, b: any) => new Date(b.split_timestamp).getTime() - new Date(a.split_timestamp).getTime());
                      const latest = sortedSplits[0];
                      
                      if (finishLineCp && lane.splits.some((s: any) => s.checkpoint_id === finishLineCp.id)) {
                        crossedFinishLine = true;
                      }

                      const rawMs = new Date(latest.split_timestamp).getTime() - new Date(heat.start_time).getTime();
                      finalTimeProjMs = rawMs + (totalPens * 30000);
                    }

                    const formatMs = (ms: number) => {
                      const m = Math.floor(ms / 60000);
                      const s = Math.floor((ms % 60000) / 1000);
                      return `${m}m ${s.toString().padStart(2, '0')}s`;
                    };

                    const DNF_DANGER = crossedFinishLine && !isDone;

                    return (
                       <div key={lane.id} className="bg-[#111] border border-[#1a1a1a] p-4 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-4">
                             <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center">
                                <span className="text-xl font-black text-white">{bib}</span>
                             </div>
                             <div>
                                <h4 className="text-lg font-bold text-white uppercase">{name}</h4>
                               <div className="flex gap-2 mt-1">
                                 {totalPens > 0 && <span className="text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded font-bold">+ {totalPens * 30}s PUNIÇÃO</span>}
                                 <span className="text-zinc-500 text-sm">Raia {lane.lane_number}</span>
                               </div>
                            </div>
                         </div>
                         
                         <div className="flex items-center gap-8">
                            <div className="text-center">
                               <p className="text-xs font-bold text-zinc-500 uppercase">Leituras Registradas</p>
                               <p className={`text-2xl font-black ${isDone ? 'text-green-500' : 'text-[#EDAC02]'}`}>
                                 {passCount} 
                                 <span className="text-zinc-600 text-lg"> / {timingConfig?.target_passes_volume || '--'}</span>
                               </p>
                            </div>
                            
                            <div className="w-[1px] h-12 bg-[#262626]" />
                            
                            <div className="w-80 flex items-center justify-end gap-3">
                               {!isDone && (
                                  <button onClick={() => handleSimulatePass(lane.registration_id, bib)} disabled={simulateSplit.isPending || lane.result} className="flex items-center gap-2 px-3 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-600/30 rounded-lg font-black text-xs uppercase transition-colors" title="Simular passagem física">
                                     <Zap className="w-4 h-4" /> Bipar
                                  </button>
                               )}

                               {lane.result ? (
                                  <span className="flex items-center gap-2 px-4 py-2 bg-emerald-600 border border-emerald-500 rounded-lg font-black text-xs uppercase text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                                     <CheckCircle2 className="w-4 h-4" /> {formatMs(lane.result.final_adjusted_time_ms)}
                                  </span>
                               ) : isDone ? (
                                  <div className="flex items-center gap-2">
                                     <span className="px-3 py-2 bg-[#1a1a1a] rounded-lg font-black text-white text-xs">{finalTimeProjMs ? formatMs(finalTimeProjMs) : '--'}</span>
                                     <button onClick={() => handleValidate(lane)} disabled={validateResult.isPending} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-black text-xs uppercase transition-colors hover:bg-green-500 shadow-[0_0_15px_rgba(22,163,74,0.3)]">
                                        <CheckCircle2 className="w-4 h-4" /> Validar
                                     </button>
                                  </div>
                               ) : DNF_DANGER ? (
                                  <span className="flex items-center gap-1 px-3 py-2 bg-red-600/20 border border-red-600/50 rounded-lg text-red-500 font-black text-xs uppercase shadow-[0_0_10px_rgba(220,38,38,0.3)]">
                                    <AlertOctagon className="w-4 h-4" /> DNF - Faltou Bip
                                  </span>
                               ) : (
                                  <span className="text-zinc-600 font-black text-xs uppercase tracking-widest flex items-center gap-2 px-2">
                                    <div className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse" /> Correndo
                                  </span>
                               )}
                            </div>
                         </div>
                      </div>
                    );
                 })}
              </div>

           </div>
        </div>

      </div>

    </div>
  );
}
