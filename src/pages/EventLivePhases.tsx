import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

// Telão público AO VIVO: mostra em que ETAPA (prova cadastrada) cada atleta está,
// conforme as passagens nas antenas. Rota: /evento/:id/ao-vivo
export default function EventLivePhases() {
  const { id } = useParams<{ id: string }>();
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const q = supabase.from('events' as any).select('id, title, target_passes_volume');
      const { data } = isUUID ? await q.eq('id', id).maybeSingle() : await q.eq('slug', id).maybeSingle();
      setResolvedId((data as any)?.id ?? null);
      setEventTitle((data as any)?.title ?? '');
      setVolume((data as any)?.target_passes_volume ?? 1);
    })();
  }, [id]);

  // Provas cadastradas (etapas), em ordem
  const { data: stages } = useQuery({
    queryKey: ['live-stages', resolvedId],
    queryFn: async () => {
      const { data } = await supabase.from('event_stages' as any)
        .select('name, order_index').eq('event_id', resolvedId!).order('order_index');
      return (data ?? []) as any[];
    },
    enabled: !!resolvedId,
  });

  // Passagens ao vivo → atletas com contagem + última passagem
  const { data: athletes } = useQuery({
    queryKey: ['live-phases', resolvedId],
    queryFn: async () => {
      const { data: splits } = await supabase.from('race_splits' as any)
        .select('registration_id, split_timestamp')
        .eq('event_id', resolvedId!)
        .order('split_timestamp', { ascending: true });

      const byReg = new Map<string, { count: number; last: string }>();
      (splits ?? []).forEach((s: any) => {
        const e = byReg.get(s.registration_id) ?? { count: 0, last: s.split_timestamp };
        e.count++; e.last = s.split_timestamp;
        byReg.set(s.registration_id, e);
      });
      const regIds = [...byReg.keys()];
      if (!regIds.length) return [];

      const { data: regs } = await supabase.from('registrations' as any)
        .select('id, bib_number, athlete_name, team_name, categories(name, team_size)')
        .in('id', regIds);
      const regMap = new Map((regs ?? []).map((r: any) => [r.id, r]));

      return regIds.map((rid) => {
        const g = byReg.get(rid)!;
        const r = regMap.get(rid) as any;
        const isTeam = (r?.categories?.team_size ?? 1) > 1;
        const name = isTeam ? (r?.team_name || r?.athlete_name || '?') : (r?.athlete_name || r?.team_name || '?');
        return { rid, bib: r?.bib_number ?? '?', name, category: r?.categories?.name ?? '', count: g.count, last: g.last };
      }).sort((a, b) => new Date(b.last).getTime() - new Date(a.last).getTime());
    },
    enabled: !!resolvedId,
    refetchInterval: 4000,
    refetchIntervalInBackground: true,
  });

  // Fase atual a partir da contagem de passagens
  const phaseFor = (count: number) => {
    if (count >= volume) return { label: 'FINALIZADO', done: true };
    const st = stages?.[count];
    return { label: st?.name || `Prova ${count + 1}`, done: false };
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter">{eventTitle || 'Evento'}</h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Acompanhamento ao vivo</p>
        </div>
        <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600/20 border border-red-600/50 text-red-400 font-black uppercase text-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> Ao vivo
        </span>
      </div>

      {!athletes || athletes.length === 0 ? (
        <div className="flex items-center justify-center h-[60vh] text-center">
          <div>
            <p className="text-5xl mb-4">🏁</p>
            <p className="text-2xl font-black uppercase italic text-zinc-400">Aguardando as primeiras passagens…</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {athletes.map((a) => {
            const phase = phaseFor(a.count);
            const pct = Math.min(100, Math.round((a.count / Math.max(1, volume)) * 100));
            return (
              <div key={a.rid} className={`rounded-2xl border p-5 ${phase.done ? 'border-green-600/40 bg-green-600/5' : 'border-[#EDAC02]/30 bg-[#0a0a0a]'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl md:text-3xl font-black text-[#EDAC02]">#{a.bib}</span>
                    <div className="min-w-0">
                      <p className="text-lg md:text-2xl font-black text-white uppercase truncate">{a.name}</p>
                      {a.category && <p className="text-[11px] text-zinc-500 uppercase font-bold truncate">{a.category}</p>}
                    </div>
                  </div>
                  <span className="text-sm font-black text-zinc-400 whitespace-nowrap">{a.count}/{volume}</span>
                </div>

                <div className={`rounded-xl px-4 py-3 text-center ${phase.done ? 'bg-green-600/15' : 'bg-[#16130b]'}`}>
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Fase atual</p>
                  <p className={`text-xl md:text-3xl font-black uppercase italic tracking-tight ${phase.done ? 'text-green-400' : 'text-white'}`}>
                    {phase.done ? '🏆 Finalizado' : phase.label}
                  </p>
                </div>

                <div className="mt-3 h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
                  <div className={`h-full ${phase.done ? 'bg-green-500' : 'bg-[#EDAC02]'}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
