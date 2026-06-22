import React from 'react';
import { useRaceCheckIn } from '@/hooks/useRaceCheckIn';
import { CheckCircle2, Clock, ScanLine, Loader2 } from 'lucide-react';

interface Props { eventId: string; }

export default function RaceCheckInPanel({ eventId }: Props) {
  const { data, isLoading } = useRaceCheckIn(eventId);
  const athletes = data?.athletes ?? [];
  const total = data?.total ?? 0;
  const verified = data?.verified ?? 0;
  const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
  const allDone = total > 0 && verified === total;

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-[#EDAC02]" /> Conferência de Pulseiras
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Antes de largar: cada atleta encosta a pulseira na antena. Quem for lido fica <span className="text-green-400 font-bold">verde</span>.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-2xl font-black ${allDone ? 'text-green-400' : 'text-[#EDAC02]'}`}>{verified}<span className="text-zinc-600 text-lg">/{total}</span></p>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Conferidos</p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="h-1.5 bg-[#1a1a1a]">
        <div className={`h-full transition-all ${allDone ? 'bg-green-500' : 'bg-[#EDAC02]'}`} style={{ width: `${pct}%` }} />
      </div>

      {isLoading ? (
        <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#EDAC02]" /></div>
      ) : total === 0 ? (
        <div className="p-8 text-center text-sm text-zinc-600">Nenhum atleta nas baterias ainda. Crie as baterias e aloque os atletas.</div>
      ) : (
        <ul className="divide-y divide-[#111] max-h-[320px] overflow-y-auto">
          {athletes.map(a => (
            <li key={a.registration_id} className={`px-5 py-3 flex items-center justify-between ${a.verified ? '' : 'bg-[#0d0d0d]'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${a.verified ? 'bg-green-500/10 border border-green-500/30' : 'bg-[#1a1a1a] border border-[#262626]'}`}>
                  <span className={`text-sm font-black ${a.verified ? 'text-green-400' : 'text-zinc-500'}`}>{a.bib ?? '?'}</span>
                </div>
                <span className={`text-sm font-bold ${a.verified ? 'text-white' : 'text-zinc-400'}`}>{a.name ?? '—'}</span>
              </div>
              {a.verified ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-green-400"><CheckCircle2 className="w-4 h-4" /> Conferido</span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-500"><Clock className="w-4 h-4" /> Pendente</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {total > 0 && !allDone && (
        <div className="p-3 border-t border-[#1a1a1a] bg-[#EDAC02]/5 text-xs text-[#EDAC02] text-center font-bold">
          Faltam {total - verified} pulseira(s) — peça aos atletas pendentes para encostar na antena.
        </div>
      )}
    </div>
  );
}
