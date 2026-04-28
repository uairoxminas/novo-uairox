import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useApplyPenalty } from '@/hooks/useRaceDayConfig';
import { Loader2, AlertOctagon, Radio, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function HeadJudgePenaltyPanel() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [bibInput, setBibInput] = useState('');

  // Buscar eventos com baterias ativas
  const { data: activeEvents, isLoading: loadingEvents } = useQuery({
    queryKey: ['active_events_headjudge'],
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

  // Baterias ativas do evento
  const { data: activeHeats } = useQuery({
    queryKey: ['running_heats_hj', selectedEventId],
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

  // Atletas das baterias
  const { data: lanes } = useQuery({
    queryKey: ['hj_lanes', activeHeatIds],
    queryFn: async () => {
      if (activeHeatIds.length === 0) return [];
      const { data, error } = await (supabase
        .from('heat_lane_assignments') as any)
        .select('*, registrations(id, bib_number, athlete_name, team_name)')
        .in('heat_id', activeHeatIds);
      if (error) throw error;
      return data || [];
    },
    enabled: activeHeatIds.length > 0,
    refetchInterval: 5000,
  });

  // Penalidades existentes
  const { data: penalties, refetch: refetchPenalties } = useQuery({
    queryKey: ['hj_penalties', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const { data, error } = await supabase
        .from('race_penalties' as any)
        .select('*')
        .eq('event_id', selectedEventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedEventId,
    refetchInterval: 5000,
  });

  const applyPenalty = useApplyPenalty();

  // Auto-select
  if (activeEvents?.length === 1 && !selectedEventId) {
    setSelectedEventId(activeEvents[0].id);
  }

  const handleNumpad = (num: string) => {
    if (bibInput.length >= 4) return;
    setBibInput(p => p + num);
  };

  const handleApplyPenalty = () => {
    if (!bibInput.trim()) return;
    const lane = lanes?.find((l: any) => String(l.registrations?.bib_number) === bibInput.trim());
    if (!lane) {
      toast.error(`BIB #${bibInput} não encontrado na bateria ativa!`);
      setBibInput('');
      return;
    }

    applyPenalty.mutate({
      event_id: selectedEventId!,
      heat_id: lane.heat_id,
      registration_id: lane.registration_id,
      bib_number: lane.registrations?.bib_number,
    }, {
      onSuccess: () => {
        const name = lane.registrations?.athlete_name || lane.registrations?.team_name || 'Atleta';
        toast.success(`+30s aplicados para ${name} (BIB #${bibInput})`);
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        setBibInput('');
        refetchPenalties();
      },
      onError: (err: any) => toast.error('Erro: ' + err.message),
    });
  };

  const handleDeletePenalty = async (penaltyId: string) => {
    if (!confirm('Remover esta penalidade?')) return;
    const { error } = await supabase.from('race_penalties' as any).delete().eq('id', penaltyId);
    if (error) {
      toast.error('Erro ao remover: ' + error.message);
    } else {
      toast.success('Penalidade removida');
      refetchPenalties();
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="text-center py-2">
        <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-2 border border-red-500/20">
          <AlertOctagon className="w-6 h-6 text-red-500" />
        </div>
        <h1 className="text-xl font-black text-white uppercase tracking-tight">Head Judge</h1>
        <p className="text-zinc-500 text-xs">Painel de Penalidades</p>
      </div>

      {loadingEvents ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
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

          {/* NUMPAD DE PENALIDADES */}
          <div className="bg-[#0a0a0a] border border-red-900/30 rounded-2xl p-4 space-y-3">
            <label className="text-[10px] font-bold text-red-500 uppercase tracking-widest flex items-center gap-1.5">
              <AlertOctagon className="w-3 h-3" /> Aplicar Penalidade
            </label>
            
            <div className="bg-[#050505] border border-zinc-800 rounded-xl p-3 text-center h-14 flex items-center justify-center">
              <span className="text-2xl font-black text-white tracking-widest">{bibInput || '_ _ _'}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[1,2,3,4,5,6,7,8,9].map(num => (
                <button key={num} onClick={() => handleNumpad(num.toString())} className="h-12 bg-[#1a1a1a] hover:bg-[#262626] active:bg-red-500/20 rounded-xl font-black text-xl text-white transition-colors">
                  {num}
                </button>
              ))}
              <button onClick={() => setBibInput('')} className="h-12 bg-[#1a1a1a] hover:bg-[#262626] rounded-xl font-bold text-xs text-zinc-500 uppercase transition-colors">C</button>
              <button onClick={() => handleNumpad('0')} className="h-12 bg-[#1a1a1a] hover:bg-[#262626] active:bg-red-500/20 rounded-xl font-black text-xl text-white transition-colors">0</button>
              <button onClick={() => setBibInput(p => p.slice(0, -1))} className="h-12 bg-[#1a1a1a] hover:bg-[#262626] rounded-xl font-bold text-xs text-zinc-500 uppercase transition-colors">DEL</button>
            </div>

            <button
              onClick={handleApplyPenalty}
              disabled={!bibInput || applyPenalty.isPending}
              className="w-full h-14 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black uppercase tracking-wider rounded-xl transition-colors disabled:opacity-30 shadow-[0_0_20px_rgba(220,38,38,0.3)] flex items-center justify-center gap-2"
            >
              {applyPenalty.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><AlertOctagon className="w-5 h-5" /> + 30 SEGUNDOS</>}
            </button>
          </div>

          {/* Lista de Penalidades Aplicadas */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              Penalidades Aplicadas ({penalties?.length || 0})
            </label>
            {penalties && penalties.length > 0 ? (
              <div className="space-y-2 max-h-[250px] overflow-auto">
                {penalties.map((pen: any) => (
                  <div key={pen.id} className="flex items-center justify-between bg-[#111] border border-zinc-800 p-3 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/20">
                        <span className="text-sm font-black text-red-400">#{pen.bib_number}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white">+{pen.penalty_seconds}s</span>
                        <p className="text-[10px] text-zinc-500">
                          {new Date(pen.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePenalty(pen.id)}
                      className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-600 text-xs text-center py-4">Nenhuma penalidade aplicada</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
