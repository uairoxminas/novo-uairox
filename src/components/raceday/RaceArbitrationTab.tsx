import React, { useState } from 'react';
import { useRaceArbitration, useArbitrationActions, type ArbAthlete } from '@/hooks/useRaceArbitration';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, Plus, Trash2, Flag, Ban, Clock, ChevronDown, ChevronUp, Pencil } from 'lucide-react';

interface Props { eventId: string; checkpoints: { id: string; is_finish_line?: boolean }[]; }

const fmt = (ms: number | null) => {
  if (ms == null) return '—';
  const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${String(s).padStart(2, '0')}s`;
};

const STATE: Record<string, { txt: string; cls: string }> = {
  racing:     { txt: 'EM PROVA',                cls: 'bg-zinc-700/30 text-zinc-400 border-zinc-600/40' },
  complete:   { txt: 'COMPLETO',                cls: 'bg-green-600/15 text-green-400 border-green-600/40' },
  incomplete: { txt: 'INCOMPLETO · SUGERE DSQ', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40' },
  validated:  { txt: 'VALIDADO',                cls: 'bg-green-600/25 text-green-300 border-green-500/50' },
  dnf:        { txt: 'DNF',                     cls: 'bg-red-600/15 text-red-400 border-red-600/40' },
  dsq:        { txt: 'DESCLASSIFICADO',         cls: 'bg-red-600/15 text-red-400 border-red-600/40' },
};

export default function RaceArbitrationTab({ eventId, checkpoints }: Props) {
  const { data, isLoading } = useRaceArbitration(eventId);
  const { addSplit, removeSplit, setResult } = useArbitrationActions(eventId);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editId, setEditId]     = useState<string | null>(null);
  const [editMin, setEditMin]   = useState('');
  const [editSec, setEditSec]   = useState('');

  const athletes = data?.athletes ?? [];
  const finishCp = checkpoints.find(c => c.is_finish_line) ?? checkpoints[0];

  const onAddSplit = (a: ArbAthlete) => {
    if (!finishCp) { toast.error('Crie um tapete/ponto de controle antes.'); return; }
    addSplit.mutate({ registration_id: a.registration_id, heat_id: a.heat_id, bib: a.bib, checkpoint_id: finishCp.id },
      { onSuccess: () => toast.success(`Passagem adicionada para #${a.bib}`), onError: (e: any) => toast.error(e.message) });
  };
  const onValidate = (a: ArbAthlete) => {
    if (a.finalMs == null) { toast.error('Sem tempo — adicione passagens ou edite o tempo.'); return; }
    setResult.mutate({ registration_id: a.registration_id, heat_id: a.heat_id, bib: a.bib, status: 'validated', final_ms: a.finalMs },
      { onSuccess: () => toast.success(`#${a.bib} validado`), onError: (e: any) => toast.error(e.message) });
  };
  const onDNF = (a: ArbAthlete) => {
    if (!confirm(`Marcar #${a.bib} ${a.name ?? ''} como DNF (desistência)?`)) return;
    setResult.mutate({ registration_id: a.registration_id, heat_id: a.heat_id, bib: a.bib, status: 'dnf', final_ms: null },
      { onSuccess: () => toast.success(`#${a.bib} marcado DNF`), onError: (e: any) => toast.error(e.message) });
  };
  const onDSQ = (a: ArbAthlete) => {
    const reason = prompt(`Motivo da desclassificação de #${a.bib} ${a.name ?? ''}:`, a.state === 'incomplete' ? 'Não completou as passagens' : '');
    if (reason === null) return;
    setResult.mutate({ registration_id: a.registration_id, heat_id: a.heat_id, bib: a.bib, status: 'disqualified', final_ms: a.finalMs, dq_reason: reason || null },
      { onSuccess: () => toast.success(`#${a.bib} desclassificado`), onError: (e: any) => toast.error(e.message) });
  };
  const startEdit = (a: ArbAthlete) => {
    setEditId(a.registration_id);
    const ms = a.finalMs ?? 0;
    setEditMin(String(Math.floor(ms / 60000))); setEditSec(String(Math.floor((ms % 60000) / 1000)));
  };
  const saveEdit = (a: ArbAthlete) => {
    const ms = ((parseInt(editMin) || 0) * 60 + (parseInt(editSec) || 0)) * 1000;
    if (ms <= 0) { toast.error('Tempo inválido.'); return; }
    setResult.mutate({ registration_id: a.registration_id, heat_id: a.heat_id, bib: a.bib, status: a.result?.status === 'validated' ? 'validated' : 'validated', final_ms: ms },
      { onSuccess: () => { toast.success('Tempo atualizado'); setEditId(null); }, onError: (e: any) => toast.error(e.message) });
  };

  if (isLoading) return <div className="p-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#EDAC02]" /></div>;
  if (!athletes.length) return <div className="p-12 text-center text-zinc-500">Nenhum atleta nas baterias. Crie as baterias e aloque os atletas.</div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">Corrija passagens, finalize desistências (DNF), desclassifique (DSQ) e valide o tempo de cada atleta.</p>
      {athletes.map(a => {
        const st = STATE[a.state];
        const isEditing = editId === a.registration_id;
        return (
          <div key={a.registration_id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden">
            <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-[200px]">
                <div className="w-11 h-11 rounded-xl bg-[#1a1a1a] border border-[#262626] flex items-center justify-center shrink-0">
                  <span className="text-sm font-black text-white">{a.bib ?? '?'}</span>
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{a.name ?? '—'}</p>
                  <p className="text-xs text-zinc-600">{a.category_name}</p>
                </div>
              </div>

              <button onClick={() => setExpanded(expanded === a.registration_id ? null : a.registration_id)}
                className={`text-sm font-black px-3 py-1.5 rounded-lg ${a.passCount >= a.target ? 'text-green-400' : 'text-yellow-400'}`}>
                {a.passCount}/{a.target} passagens {expanded === a.registration_id ? <ChevronUp className="w-3.5 h-3.5 inline" /> : <ChevronDown className="w-3.5 h-3.5 inline" />}
              </button>

              <div className="text-center min-w-[90px]">
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input value={editMin} onChange={e => setEditMin(e.target.value)} className="w-12 bg-[#1a1a1a] border border-[#262626] rounded px-1 py-1 text-white text-center text-sm" placeholder="m" />
                    <span className="text-zinc-600">:</span>
                    <input value={editSec} onChange={e => setEditSec(e.target.value)} className="w-12 bg-[#1a1a1a] border border-[#262626] rounded px-1 py-1 text-white text-center text-sm" placeholder="s" />
                    <button onClick={() => saveEdit(a)} className="text-green-400 text-xs font-bold px-2">OK</button>
                    <button onClick={() => setEditId(null)} className="text-zinc-500 text-xs px-1">✕</button>
                  </div>
                ) : (
                  <button onClick={() => startEdit(a)} className="text-lg font-black text-white hover:text-[#EDAC02] flex items-center gap-1">
                    {fmt(a.finalMs)} <Pencil className="w-3 h-3 text-zinc-600" />
                  </button>
                )}
                {a.penaltiesSec > 0 && <p className="text-[10px] text-red-500 font-bold">+{a.penaltiesSec}s pen.</p>}
              </div>

              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded border ${st.cls}`}>{st.txt}</span>

              <div className="flex items-center gap-1.5">
                <button onClick={() => onAddSplit(a)} title="Adicionar passagem" className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] text-blue-400"><Plus className="w-4 h-4" /></button>
                {a.state !== 'validated' && (
                  <button onClick={() => onValidate(a)} title="Validar tempo" className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600/15 hover:bg-green-600/25 text-green-400 border border-green-600/40 text-xs font-black uppercase">
                    <CheckCircle2 className="w-4 h-4" /> Validar
                  </button>
                )}
                <button onClick={() => onDNF(a)} title="Desistência (DNF)" className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-red-900/30 text-zinc-400 hover:text-red-400"><Flag className="w-4 h-4" /></button>
                <button onClick={() => onDSQ(a)} title="Desclassificar (DSQ)" className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-red-900/30 text-zinc-400 hover:text-red-400"><Ban className="w-4 h-4" /></button>
              </div>
            </div>

            {a.result?.dq_reason && <div className="px-4 pb-2 text-xs text-red-400">Motivo: {a.result.dq_reason}</div>}

            {expanded === a.registration_id && (
              <div className="border-t border-[#1a1a1a] bg-[#050505] p-3">
                {a.splits.length === 0 ? (
                  <p className="text-xs text-zinc-600 text-center py-2">Nenhuma passagem registrada.</p>
                ) : (
                  <ul className="space-y-1">
                    {a.splits.map((s, i) => (
                      <li key={s.id} className="flex items-center justify-between px-3 py-1.5 bg-[#0a0a0a] rounded-lg">
                        <span className="text-xs text-zinc-400"><Clock className="w-3 h-3 inline mr-1.5 text-zinc-600" />Passagem {i + 1} · {new Date(s.ts).toLocaleTimeString('pt-BR')}</span>
                        <button onClick={() => removeSplit.mutate(s.id, { onSuccess: () => toast.success('Passagem removida') })} title="Remover passagem (fantasma)" className="text-zinc-600 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
