import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useRaceArbitration, useArbitrationActions, type ArbAthlete } from '@/hooks/useRaceArbitration';
import { useApplyPenalty } from '@/hooks/useRaceDayConfig';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, CheckCircle2, AlertOctagon } from 'lucide-react';

const fmt = (ms: number | null) => {
  if (ms == null) return '—';
  const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${String(s).padStart(2, '0')}s`;
};
const displayName = (a: ArbAthlete) =>
  a.team_size > 1 ? (a.team_name || 'Sem Equipe') : (a.name || 'Atleta');

const STATE: Record<string, { l: string; c: string }> = {
  racing:     { l: 'Em prova',   c: 'bg-blue-600/20 text-blue-300 border-blue-600/40' },
  complete:   { l: 'Completo',   c: 'bg-[#EDAC02]/20 text-[#EDAC02] border-[#EDAC02]/40' },
  incomplete: { l: 'Incompleto', c: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/40' },
  validated:  { l: 'Validado',   c: 'bg-green-600/20 text-green-400 border-green-600/40' },
  dnf:        { l: 'DNF',        c: 'bg-red-600/20 text-red-400 border-red-600/40' },
  dsq:        { l: 'DSQ',        c: 'bg-red-600/20 text-red-400 border-red-600/40' },
};

export default function AdminRaceDayAllHeats() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useRaceArbitration(eventId!);
  const { setResult } = useArbitrationActions(eventId!);
  const applyPenalty = useApplyPenalty();

  const groups = useMemo(() => {
    const m = new Map<string, { title: string; start: string | null; athletes: ArbAthlete[] }>();
    (data?.athletes ?? []).forEach((a) => {
      const k = a.heat_id ?? 'none';
      if (!m.has(k)) m.set(k, { title: a.heat_title ?? 'Bateria', start: a.heat_start, athletes: [] });
      m.get(k)!.athletes.push(a);
    });
    return [...m.values()]
      .map(g => ({ ...g, athletes: [...g.athletes].sort((x, y) => (x.bib ?? 0) - (y.bib ?? 0)) }))
      .sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));
  }, [data]);

  const onPenalty = (a: ArbAthlete) => {
    applyPenalty.mutate(
      { event_id: eventId!, heat_id: a.heat_id!, registration_id: a.registration_id, bib_number: String(a.bib ?? '') },
      { onSuccess: () => { toast.success(`+30s para #${a.bib}`); qc.invalidateQueries({ queryKey: ['arbitration', eventId] }); },
        onError: (e: any) => toast.error(e.message) }
    );
  };
  const onValidate = (a: ArbAthlete) => {
    if (a.finalMs == null) { toast.error('Sem tempo — sem passagens.'); return; }
    setResult.mutate(
      { registration_id: a.registration_id, heat_id: a.heat_id, bib: a.bib, status: 'validated', final_ms: a.finalMs },
      { onSuccess: () => toast.success(`#${a.bib} validado`), onError: (e: any) => toast.error(e.message) }
    );
  };

  if (isLoading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#EDAC02]" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#1a1a1a] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/admin/raceday/${eventId}`)} className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#262626]"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase italic tracking-tight">Todas as Baterias</h1>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Monitor geral</p>
          </div>
        </div>
        <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/20 border border-red-600/50 text-red-400 font-black uppercase text-xs">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Ao vivo
        </span>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-5">
        {groups.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">Nenhuma bateria com atletas.</div>
        ) : groups.map((g, gi) => (
          <div key={gi} className="rounded-2xl border border-[#1a1a1a] overflow-hidden">
            <div className="px-5 py-3 bg-[#0a0a0a] border-b border-[#1a1a1a] flex items-center justify-between">
              <h2 className="text-lg font-black text-white uppercase italic tracking-tight">{g.title}</h2>
              <span className="text-xs text-zinc-500 font-bold uppercase">{g.athletes.length} atleta(s)</span>
            </div>
            <div className="divide-y divide-[#111]">
              {g.athletes.map((a) => {
                const st = STATE[a.state] ?? STATE.incomplete;
                return (
                  <div key={a.registration_id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-12 text-lg font-black text-[#EDAC02]">#{a.bib ?? '?'}</span>
                      <div className="min-w-0">
                        <p className="text-sm md:text-base font-black text-white uppercase truncate">{displayName(a)}</p>
                        <p className="text-[11px] text-zinc-500 font-bold uppercase truncate">{a.category_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-black text-zinc-400">{a.passCount}/{a.target}</span>
                      <span className="text-base font-black text-[#EDAC02] w-20 text-right">{fmt(a.finalMs)}</span>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase border ${st.c}`}>{st.l}</span>
                      <button onClick={() => onPenalty(a)} title="Penalidade +30s"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase bg-[#1a1a1a] hover:bg-[#262626] text-orange-300 border border-orange-600/30">
                        <AlertOctagon className="w-3.5 h-3.5" /> +30s
                      </button>
                      {a.state === 'validated' ? (
                        <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase text-green-400"><CheckCircle2 className="w-3.5 h-3.5" /> OK</span>
                      ) : (
                        <button onClick={() => onValidate(a)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase bg-green-600/15 hover:bg-green-600/25 text-green-400 border border-green-600/40">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Validar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
