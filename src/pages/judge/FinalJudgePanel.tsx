import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRaceCheckpoints, useEventTimingConfig, useValidateResult } from '@/hooks/useRaceDayConfig';
import { Loader2, Flag, CheckCircle2, AlertOctagon, Radio, Edit3, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function FinalJudgePanel() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null);
  const [editedTimeMin, setEditedTimeMin] = useState('');
  const [editedTimeSec, setEditedTimeSec] = useState('');

  // Eventos com baterias ativas
  const { data: activeEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ['active_events_finaljudge'],
    queryFn: async () => {
      const { data: heats, error } = await supabase
        .from('heats' as any)
        .select('event_id, events!inner(id, title)')
        .eq('status', 'running');
      if (error) throw error;

      const eventsMap = new Map<string, any>();
      (heats || []).forEach((h: any) => {
        if (h.events && !eventsMap.has(h.events.id)) {
          eventsMap.set(h.events.id, h.events);
        }
      });
      return Array.from(eventsMap.values());
    },
    refetchInterval: 5000,
  });

  // Baterias ativas
  const { data: activeHeats } = useQuery({
    queryKey: ['running_heats_fj', selectedEventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('heats' as any)
        .select('*')
        .eq('event_id', selectedEventId)
        .eq('status', 'running')
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedEventId,
    refetchInterval: 5000,
  });

  const activeHeatIds = activeHeats?.map((h: any) => h.id) || [];
  const firstHeat = activeHeats?.[0] as any;

  // Config de timing
  const { data: timingConfigData } = useEventTimingConfig(selectedEventId || '');
  const timingConfig = timingConfigData as any;

  // Checkpoints
  const { data: checkpointsData } = useRaceCheckpoints(selectedEventId || '');
  const checkpoints = checkpointsData as any[];

  // Radar completo: lanes + splits + penalties + results
  const { data: radar, isLoading: radarLoading } = useQuery({
    queryKey: ['fj_radar', activeHeatIds],
    queryFn: async () => {
      if (activeHeatIds.length === 0) return [];

      const { data: lanes, error: lanesErr } = await (supabase
        .from('heat_lane_assignments') as any)
        .select('*, registrations(id, bib_number, athlete_name, team_name)')
        .in('heat_id', activeHeatIds)
        .order('lane_number', { ascending: true });
      if (lanesErr) throw lanesErr;

      // Busca splits, penalties e results para todos os heats ativos
      const [splitsRes, pensRes, resultsRes] = await Promise.all([
        supabase.from('race_splits' as any).select('*').in('heat_id', activeHeatIds),
        supabase.from('race_penalties' as any).select('*').eq('event_id', selectedEventId),
        supabase.from('race_results' as any).select('*').in('heat_id', activeHeatIds),
      ]);

      const splits = splitsRes.data || [];
      const penalties = pensRes.data || [];
      const results = resultsRes.data || [];

      return (lanes || []).filter((l: any) => l.registration_id).map((lane: any) => {
        const rid = lane.registration_id;
        const bib = lane.registrations?.bib_number;
        const mySplits = splits.filter((s: any) => s.registration_id === rid);
        const myPens = penalties.filter((p: any) => String(p.bib_number) === String(bib));
        const myResult = results.find((r: any) => String(r.bib_number) === String(bib));

        return { ...lane, splits: mySplits, penalties: myPens, result: myResult };
      });
    },
    enabled: activeHeatIds.length > 0,
    refetchInterval: 3000,
  });

  const validateResult = useValidateResult();
  const qc = useQueryClient();

  // Auto-select
  if (activeEvents?.length === 1 && !selectedEventId) {
    setSelectedEventId(activeEvents[0].id);
  }

  const formatMs = (ms: number) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${m}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
  };

  const handleValidate = (lane: any, overrideMs?: number) => {
    if (!firstHeat?.start_time) {
      toast.error('Bateria sem horário de largada.');
      return;
    }

    const startTime = new Date(firstHeat.start_time).getTime();
    const sortedSplits = [...(lane.splits || [])].sort(
      (a: any, b: any) => new Date(b.split_timestamp).getTime() - new Date(a.split_timestamp).getTime()
    );
    const latest = sortedSplits[0];

    if (!latest && !overrideMs) {
      toast.error('Nenhuma passagem registrada para este atleta.');
      return;
    }

    let rawTimeMs = overrideMs || (new Date(latest.split_timestamp).getTime() - startTime);
    const penSeconds = (lane.penalties?.length || 0) * 30;
    const penMs = penSeconds * 1000;
    const finalTime = rawTimeMs + penMs;

    validateResult.mutate({
      event_id: selectedEventId!,
      heat_id: lane.heat_id,
      registration_id: lane.registration_id,
      bib_number: lane.registrations?.bib_number,
      raw_time_ms: rawTimeMs,
      total_penalties_seconds: penSeconds,
      final_adjusted_time_ms: finalTime,
      total_passes_recorded: lane.splits?.length || 0,
    }, {
      onSuccess: () => {
        toast.success(`Resultado validado para ${lane.registrations?.athlete_name || lane.registrations?.team_name}!`);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
        setEditingAthleteId(null);
      },
      onError: (err: any) => toast.error('Erro: ' + err.message),
    });
  };

  const handleEditAndValidate = (lane: any) => {
    const min = parseInt(editedTimeMin) || 0;
    const sec = parseInt(editedTimeSec) || 0;
    const totalMs = (min * 60 + sec) * 1000;
    
    if (totalMs <= 0) {
      toast.error('Tempo inválido.');
      return;
    }

    handleValidate(lane, totalMs);
  };

  const handleUpdateResult = async (resultId: string, newFinalMs: number) => {
    const { error } = await supabase
      .from('race_results' as any)
      .update({ 
        final_adjusted_time_ms: newFinalMs,
        raw_time_ms: newFinalMs,
        updated_at: new Date().toISOString()
      })
      .eq('id', resultId);
    
    if (error) {
      toast.error('Erro ao atualizar: ' + error.message);
    } else {
      toast.success('Tempo atualizado!');
      qc.invalidateQueries({ queryKey: ['fj_radar'] });
      setEditingAthleteId(null);
    }
  };

  const targetPasses = timingConfig?.target_passes_volume || 1;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="text-center py-2">
        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-2 border border-blue-500/20">
          <Flag className="w-6 h-6 text-blue-500" />
        </div>
        <h1 className="text-xl font-black text-white uppercase tracking-tight">Final Judge</h1>
        <p className="text-zinc-500 text-xs">Validação de Chegada</p>
      </div>

      {loadingEvents ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      ) : !activeEvents || activeEvents.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl">
          <Radio className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-500 font-medium">Nenhuma bateria ativa</p>
          <p className="text-zinc-600 text-xs mt-1">Aguarde o Admin largar uma bateria</p>
        </div>
      ) : (
        <>
          {activeEvents.length > 1 && (
            <select
              value={selectedEventId || ''}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full h-12 bg-[#111] border border-zinc-800 rounded-xl px-4 text-white font-bold"
            >
              <option value="">Selecione o evento</option>
              {activeEvents.map((ev: any) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          )}

          {/* Info bar */}
          <div className="flex items-center justify-between bg-[#111] border border-zinc-800 rounded-xl p-3">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Checkpoints necessários</span>
            <span className="text-sm font-black text-blue-400">{targetPasses}</span>
          </div>

          {/* Athlete Radar */}
          {radarLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : !radar || radar.length === 0 ? (
            <p className="text-center py-8 text-zinc-600 text-sm">Nenhum atleta na bateria</p>
          ) : (
            <div className="space-y-3">
              {radar.map((lane: any) => {
                const bib = lane.registrations?.bib_number || '--';
                const name = lane.registrations?.athlete_name || lane.registrations?.team_name || 'Atleta';
                const passCount = lane.splits?.length || 0;
                const totalPens = lane.penalties?.length || 0;
                const isDone = passCount >= targetPasses;
                const isEditing = editingAthleteId === lane.id;

                // Verificar se cruzou a linha de chegada
                const finishLineCp = checkpoints?.find((cp: any) => cp.is_finish_line);
                const crossedFinish = finishLineCp && lane.splits?.some((s: any) => s.checkpoint_id === finishLineCp.id);

                // Calcular tempo projetado
                let projectedMs: number | null = null;
                if (lane.splits?.length > 0 && firstHeat?.start_time) {
                  const sorted = [...lane.splits].sort(
                    (a: any, b: any) => new Date(b.split_timestamp).getTime() - new Date(a.split_timestamp).getTime()
                  );
                  const rawMs = new Date(sorted[0].split_timestamp).getTime() - new Date(firstHeat.start_time).getTime();
                  projectedMs = rawMs + (totalPens * 30000);
                }

                // Verificar checkpoints únicos
                const uniqueCheckpoints = new Set(lane.splits?.map((s: any) => s.checkpoint_id) || []);
                const totalCheckpointsInEvent = checkpoints?.length || 0;

                const DNF = crossedFinish && !isDone;

                return (
                  <div key={lane.id} className={`bg-[#0a0a0a] border rounded-2xl overflow-hidden transition-all ${
                    lane.result ? 'border-emerald-500/30' : DNF ? 'border-red-500/30' : isDone ? 'border-blue-500/30' : 'border-zinc-800'
                  }`}>
                    {/* Athlete header */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          lane.result ? 'bg-emerald-500/10' : 'bg-zinc-800'
                        }`}>
                          <span className={`text-lg font-black ${lane.result ? 'text-emerald-400' : 'text-white'}`}>{bib}</span>
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-white uppercase">{name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs font-bold ${isDone ? 'text-emerald-400' : 'text-yellow-500'}`}>
                              {passCount}/{targetPasses} passagens
                            </span>
                            {totalPens > 0 && (
                              <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">
                                +{totalPens * 30}s
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status badge */}
                      {lane.result ? (
                        <div className="text-right">
                          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 font-black text-sm">
                            <CheckCircle2 className="w-4 h-4" />
                            {formatMs(lane.result.final_adjusted_time_ms)}
                          </span>
                        </div>
                      ) : DNF ? (
                        <span className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 font-black text-xs uppercase">
                          <AlertOctagon className="w-4 h-4" /> DNF
                        </span>
                      ) : projectedMs ? (
                        <span className="text-zinc-400 font-mono text-sm font-bold">{formatMs(projectedMs)}</span>
                      ) : (
                        <span className="text-zinc-600 text-xs font-bold uppercase flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-zinc-600 animate-pulse" /> Correndo
                        </span>
                      )}
                    </div>

                    {/* Checkpoint detail */}
                    <div className="px-4 pb-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {checkpoints?.map((cp: any) => {
                          const passed = lane.splits?.some((s: any) => s.checkpoint_id === cp.id);
                          return (
                            <span
                              key={cp.id}
                              className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                passed
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-zinc-800/50 text-zinc-600 border border-zinc-800'
                              }`}
                            >
                              {cp.name} {passed ? '✓' : '✗'}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action area — only for ready athletes */}
                    {!lane.result && isDone && (
                      <div className="border-t border-zinc-800 p-4 bg-[#050505] space-y-3">
                        {isEditing ? (
                          <div className="space-y-3">
                            <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Editar Tempo Final</label>
                            <div className="flex gap-2 items-center">
                              <input
                                type="number"
                                value={editedTimeMin}
                                onChange={(e) => setEditedTimeMin(e.target.value)}
                                placeholder="Min"
                                className="flex-1 h-12 bg-[#111] border border-zinc-800 rounded-xl px-3 text-white text-center font-bold text-lg focus:outline-none focus:border-blue-500"
                              />
                              <span className="text-zinc-500 font-bold text-lg">:</span>
                              <input
                                type="number"
                                value={editedTimeSec}
                                onChange={(e) => setEditedTimeSec(e.target.value)}
                                placeholder="Seg"
                                className="flex-1 h-12 bg-[#111] border border-zinc-800 rounded-xl px-3 text-white text-center font-bold text-lg focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingAthleteId(null)}
                                className="flex-1 h-11 bg-[#1a1a1a] text-zinc-400 rounded-xl font-bold text-xs uppercase"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleEditAndValidate(lane)}
                                className="flex-1 h-11 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5"
                              >
                                <Save className="w-4 h-4" /> Salvar e Validar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingAthleteId(lane.id);
                                if (projectedMs) {
                                  setEditedTimeMin(String(Math.floor(projectedMs / 60000)));
                                  setEditedTimeSec(String(Math.floor((projectedMs % 60000) / 1000)));
                                }
                              }}
                              className="flex-1 h-12 bg-[#1a1a1a] hover:bg-[#262626] text-zinc-300 border border-zinc-800 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" /> Editar Tempo
                            </button>
                            <button
                              onClick={() => handleValidate(lane)}
                              disabled={validateResult.isPending}
                              className="flex-1 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase flex items-center justify-center gap-1.5 transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                            >
                              {validateResult.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Validar</>}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Edit validated result */}
                    {lane.result && (
                      <div className="border-t border-zinc-800 p-3 bg-[#050505]">
                        {editingAthleteId === lane.id ? (
                          <div className="space-y-2">
                            <div className="flex gap-2 items-center">
                              <input
                                type="number"
                                value={editedTimeMin}
                                onChange={(e) => setEditedTimeMin(e.target.value)}
                                placeholder="Min"
                                className="flex-1 h-10 bg-[#111] border border-zinc-800 rounded-lg px-3 text-white text-center font-bold focus:outline-none focus:border-blue-500"
                              />
                              <span className="text-zinc-500 font-bold">:</span>
                              <input
                                type="number"
                                value={editedTimeSec}
                                onChange={(e) => setEditedTimeSec(e.target.value)}
                                placeholder="Seg"
                                className="flex-1 h-10 bg-[#111] border border-zinc-800 rounded-lg px-3 text-white text-center font-bold focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setEditingAthleteId(null)} className="flex-1 h-9 bg-[#1a1a1a] text-zinc-400 rounded-lg font-bold text-xs uppercase">
                                Cancelar
                              </button>
                              <button
                                onClick={() => {
                                  const min = parseInt(editedTimeMin) || 0;
                                  const sec = parseInt(editedTimeSec) || 0;
                                  const totalMs = (min * 60 + sec) * 1000;
                                  if (totalMs > 0) handleUpdateResult(lane.result.id, totalMs);
                                }}
                                className="flex-1 h-9 bg-blue-600 text-white rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-1"
                              >
                                <Save className="w-3.5 h-3.5" /> Atualizar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingAthleteId(lane.id);
                              const ms = lane.result.final_adjusted_time_ms;
                              setEditedTimeMin(String(Math.floor(ms / 60000)));
                              setEditedTimeSec(String(Math.floor((ms % 60000) / 1000)));
                            }}
                            className="w-full flex items-center justify-center gap-1.5 text-zinc-500 hover:text-blue-400 text-xs font-bold uppercase py-1 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Editar Tempo Validado
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
