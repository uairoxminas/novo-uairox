import React, { useState, useMemo } from 'react';
import { useRaceArbitration, type ArbAthlete } from '@/hooks/useRaceArbitration';
import { Loader2, Trophy, Lock, Unlock, Medal, Ban, Flag } from 'lucide-react';

interface Props { eventId: string; }

const fmt = (ms: number | null) => {
  if (ms == null) return '—';
  const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${String(s).padStart(2, '0')}s`;
};
const MEDAL = ['🥇', '🥈', '🥉'];

export default function RaceAwardsTab({ eventId }: Props) {
  const { data, isLoading } = useRaceArbitration(eventId);
  const [released, setReleased] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; athletes: ArbAthlete[] }>();
    (data?.athletes ?? []).forEach(a => {
      const k = a.category_id ?? 'none';
      if (!map.has(k)) map.set(k, { name: a.category_name, athletes: [] });
      map.get(k)!.athletes.push(a);
    });
    return [...map.entries()].map(([id, g]) => {
      const pending = g.athletes.filter(a => a.state === 'racing' || a.state === 'incomplete' || a.state === 'complete');
      const allFinal = pending.length === 0 && g.athletes.length > 0;
      const ranked = g.athletes.filter(a => a.state === 'validated').sort((x, y) => (x.finalMs ?? 9e15) - (y.finalMs ?? 9e15));
      const out = g.athletes.filter(a => a.state === 'dnf' || a.state === 'dsq');
      return { id, name: g.name, total: g.athletes.length, pendingCount: pending.length, allFinal, ranked, out };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#EDAC02]" /></div>;
  if (!groups.length) return <div className="p-12 text-center text-zinc-500">Sem atletas para premiação.</div>;

  return (
    <div className="space-y-4">
      {groups.map(g => {
        const isReleased = !!released[g.id];
        return (
          <div key={g.id} className={`rounded-2xl border overflow-hidden ${g.allFinal ? 'border-[#EDAC02]/30' : 'border-[#1a1a1a]'}`}>
            <div className="p-5 border-b border-[#1a1a1a] flex items-center justify-between gap-3 flex-wrap bg-[#0a0a0a]">
              <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#EDAC02]" /> {g.name}
                <span className="text-xs font-normal text-zinc-500">{g.total} atleta(s)</span>
              </h3>
              {g.allFinal ? (
                isReleased ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase bg-green-600/20 text-green-400 border border-green-600/40"><Unlock className="w-3.5 h-3.5" /> Premiação liberada</span>
                ) : (
                  <button onClick={() => setReleased(p => ({ ...p, [g.id]: true }))} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-black uppercase bg-[#EDAC02] hover:bg-[#EDAC02]/90 text-black">
                    <Unlock className="w-3.5 h-3.5" /> Liberar premiação
                  </button>
                )
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1a1a1a] text-zinc-500 border border-[#262626]" title="Finalize todos os atletas (validar/DNF/DSQ) para liberar">
                  <Lock className="w-3.5 h-3.5" /> Faltam {g.pendingCount} atleta(s) finalizar
                </span>
              )}
            </div>

            <div className={`divide-y divide-[#111] ${!isReleased && g.allFinal ? 'opacity-100' : ''}`}>
              {g.ranked.length === 0 ? (
                <p className="p-5 text-center text-sm text-zinc-600">Nenhum atleta validado ainda nesta categoria.</p>
              ) : g.ranked.map((a, idx) => (
                <div key={a.registration_id} className={`px-5 py-3 flex items-center justify-between ${idx < 3 && isReleased ? 'bg-[#EDAC02]/5' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-8 text-center text-lg">{idx < 3 ? MEDAL[idx] : <span className="text-sm font-black text-zinc-500">{idx + 1}º</span>}</span>
                    <span className="w-9 text-sm font-black text-white">#{a.bib}</span>
                    <span className={`text-sm font-bold ${idx < 3 ? 'text-white' : 'text-zinc-300'}`}>{a.name}</span>
                  </div>
                  <span className="text-base font-black text-[#EDAC02]">{fmt(a.finalMs)}</span>
                </div>
              ))}
              {g.out.map(a => (
                <div key={a.registration_id} className="px-5 py-2.5 flex items-center justify-between opacity-60">
                  <div className="flex items-center gap-3">
                    <span className="w-8 text-center text-zinc-600">{a.state === 'dnf' ? <Flag className="w-4 h-4 inline" /> : <Ban className="w-4 h-4 inline" />}</span>
                    <span className="w-9 text-sm font-black text-zinc-500">#{a.bib}</span>
                    <span className="text-sm text-zinc-400 line-through">{a.name}</span>
                  </div>
                  <span className="text-xs font-black uppercase text-red-400">{a.state === 'dnf' ? 'DNF' : 'DSQ'}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
