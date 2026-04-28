import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRaceCheckpoints, useSimulateSplit } from '@/hooks/useRaceDayConfig';
import { Loader2, Zap, CheckCircle, Radio } from 'lucide-react';
import { toast } from 'sonner';

export default function JudgePassagesPanel() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string | null>(null);
  const [bibInput, setBibInput] = useState('');

  // Buscar eventos que têm baterias rodando
  const { data: activeEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ['active_events_for_judge'],
    queryFn: async () => {
      const { data: heats, error } = await supabase
        .from('heats' as any)
        .select('event_id, events!inner(id, title, date)')
        .eq('status', 'running');
      if (error) throw error;

      // Deduplica por evento
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

  // Buscar baterias ativas do evento selecionado
  const { data: activeHeats } = useQuery({
    queryKey: ['running_heats', selectedEventId],
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

  // Checkpoints do evento
  const { data: checkpoints } = useRaceCheckpoints(selectedEventId || '');

  // Atletas da(s) bateria(s) ativa(s)
  const activeHeatIds = activeHeats?.map((h: any) => h.id) || [];
  const { data: lanes } = useQuery({
    queryKey: ['judge_lanes', activeHeatIds],
    queryFn: async () => {
      if (activeHeatIds.length === 0) return [];
      const { data, error } = await (supabase
        .from('heat_lane_assignments') as any)
        .select('*, registrations(id, bib_number, athlete_name, team_name)')
        .in('heat_id', activeHeatIds)
        .order('lane_number', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: activeHeatIds.length > 0,
    refetchInterval: 5000,
  });

  const simulateSplit = useSimulateSplit();

  const handleBip = (registration_id: string, bib_number: string, heat_id: string) => {
    if (!selectedCheckpointId) {
      toast.error('Selecione o tapete/checkpoint primeiro!');
      return;
    }
    simulateSplit.mutate({
      event_id: selectedEventId!,
      heat_id,
      registration_id,
      bib_number,
      checkpoint_id: selectedCheckpointId,
    }, {
      onSuccess: () => {
        toast.success(`BIP! Passagem de #${bib_number} registrada ✓`);
        // Vibrar celular
        if (navigator.vibrate) navigator.vibrate(100);
      },
      onError: (err: any) => toast.error('Erro no BIP: ' + err.message),
    });
  };

  const handleBipByBib = () => {
    if (!bibInput.trim()) return;
    const lane = lanes?.find((l: any) => String(l.registrations?.bib_number) === bibInput.trim());
    if (!lane) {
      toast.error(`BIB #${bibInput} não encontrado na bateria ativa!`);
      setBibInput('');
      return;
    }
    handleBip(lane.registration_id, lane.registrations?.bib_number, lane.heat_id);
    setBibInput('');
  };

  const handleNumpad = (num: string) => {
    if (bibInput.length >= 4) return;
    setBibInput(p => p + num);
  };

  // Auto-select first event if only one
  if (activeEvents?.length === 1 && !selectedEventId) {
    setSelectedEventId(activeEvents[0].id);
  }

  // Auto-select first checkpoint
  if (checkpoints && checkpoints.length > 0 && !selectedCheckpointId) {
    setSelectedCheckpointId((checkpoints[0] as any).id);
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="text-center py-2">
        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-2 border border-emerald-500/20">
          <Zap className="w-6 h-6 text-emerald-500" />
        </div>
        <h1 className="text-xl font-black text-white uppercase tracking-tight">Judge</h1>
        <p className="text-zinc-500 text-xs">Marcação de Passagens</p>
      </div>

      {/* Event/Checkpoint Selection */}
      {loadingEvents ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
        </div>
      ) : !activeEvents || activeEvents.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl">
          <Radio className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-500 font-medium">Nenhuma bateria ativa</p>
          <p className="text-zinc-600 text-xs mt-1">Aguarde o Admin largar uma bateria</p>
        </div>
      ) : (
        <>
          {/* Event selector (if multiple) */}
          {activeEvents.length > 1 && (
            <select
              value={selectedEventId || ''}
              onChange={(e) => { setSelectedEventId(e.target.value); setSelectedCheckpointId(null); }}
              className="w-full h-12 bg-[#111] border border-zinc-800 rounded-xl px-4 text-white font-bold"
            >
              <option value="">Selecione o evento</option>
              {activeEvents.map((ev: any) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
          )}

          {/* Checkpoint selector */}
          {checkpoints && checkpoints.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Seu Tapete/Checkpoint</label>
              <div className="grid grid-cols-2 gap-2">
                {checkpoints.map((cp: any) => (
                  <button
                    key={cp.id}
                    onClick={() => setSelectedCheckpointId(cp.id)}
                    className={`p-3 rounded-xl text-sm font-bold border transition-all ${
                      selectedCheckpointId === cp.id
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                        : 'bg-[#111] border-zinc-800 text-zinc-400'
                    }`}
                  >
                    {cp.name}
                    {cp.is_finish_line && <span className="block text-[10px] text-yellow-500 mt-0.5">CHEGADA</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* BIB Numpad */}
          <div className="bg-[#0a0a0a] border border-zinc-800 rounded-2xl p-4 space-y-3">
            <label className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Bipar por BIB
            </label>
            
            <div className="bg-[#050505] border border-zinc-800 rounded-xl p-3 text-center h-14 flex items-center justify-center">
              <span className="text-2xl font-black text-white tracking-widest">{bibInput || '_ _ _'}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[1,2,3,4,5,6,7,8,9].map(num => (
                <button key={num} onClick={() => handleNumpad(num.toString())} className="h-12 bg-[#1a1a1a] hover:bg-[#262626] active:bg-emerald-500/20 rounded-xl font-black text-xl text-white transition-colors">
                  {num}
                </button>
              ))}
              <button onClick={() => setBibInput('')} className="h-12 bg-[#1a1a1a] hover:bg-[#262626] rounded-xl font-bold text-xs text-zinc-500 uppercase transition-colors">C</button>
              <button onClick={() => handleNumpad('0')} className="h-12 bg-[#1a1a1a] hover:bg-[#262626] active:bg-emerald-500/20 rounded-xl font-black text-xl text-white transition-colors">0</button>
              <button onClick={() => setBibInput(p => p.slice(0, -1))} className="h-12 bg-[#1a1a1a] hover:bg-[#262626] rounded-xl font-bold text-xs text-zinc-500 uppercase transition-colors">DEL</button>
            </div>

            <button
              onClick={handleBipByBib}
              disabled={!bibInput || simulateSplit.isPending}
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-black font-black uppercase tracking-wider rounded-xl transition-colors disabled:opacity-30 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"
            >
              {simulateSplit.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Zap className="w-5 h-5" /> BIPAR</>}
            </button>
          </div>

          {/* Quick athlete list */}
          {lanes && lanes.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Atletas na Pista</label>
              <div className="space-y-2 max-h-[300px] overflow-auto">
                {lanes.filter((l: any) => l.registration_id).map((lane: any) => {
                  const bib = lane.registrations?.bib_number || '--';
                  const name = lane.registrations?.athlete_name || lane.registrations?.team_name || 'Atleta';
                  return (
                    <div key={lane.id} className="flex items-center justify-between bg-[#111] border border-zinc-800 p-3 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-black text-white">{bib}</span>
                        </div>
                        <span className="text-sm font-bold text-white truncate max-w-[120px]">{name}</span>
                      </div>
                      <button
                        onClick={() => handleBip(lane.registration_id, bib, lane.heat_id)}
                        disabled={simulateSplit.isPending}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500 text-emerald-400 active:text-black border border-emerald-500/30 rounded-xl font-black text-xs uppercase transition-all"
                      >
                        <Zap className="w-4 h-4" /> BIP
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
