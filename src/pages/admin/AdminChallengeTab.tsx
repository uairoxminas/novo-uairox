import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  useAdminWorkouts,
  useChallengeLeaderboard,
  useUpdateWorkoutStatus,
  useChallengeConfig,
  useUpsertChallengeConfig,
  ChallengeWorkout,
} from '@/hooks/useChallenge';

const GOAL = 30;

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

// ── helpers ────────────────────────────────────────────────────
function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}
function fmtTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_BADGE: Record<string, string> = {
  approved: 'bg-green-500/10 border-green-500/30 text-green-400',
  rejected: 'bg-red-500/10 border-red-500/30 text-red-400',
  pending:  'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
};
const STATUS_LABEL: Record<string, string> = {
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  pending:  'Pendente',
};

// ── Rejection modal ────────────────────────────────────────────
function RejectModal({
  workout,
  onConfirm,
  onCancel,
}: {
  workout: ChallengeWorkout;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-6 w-full max-w-md space-y-4"
      >
        <div>
          <p className="text-sm font-black text-red-400 uppercase tracking-widest">Rejeitar Treino</p>
          <p className="text-white font-bold mt-1">{workout.athlete_name}</p>
          <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">{workout.description}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Motivo da rejeição (opcional)</p>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ex: foto não condiz com treino físico..."
            rows={3}
            className="w-full bg-[#050505] border border-[#262626] rounded-xl p-3 text-white placeholder:text-zinc-600 focus:border-red-500 focus:outline-none text-sm resize-none"
            autoFocus
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-[#1a1a1a] text-zinc-400 font-bold text-sm hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/30 transition-colors"
          >
            Rejeitar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Workout row ────────────────────────────────────────────────
function WorkoutRow({
  w,
  eventId,
  onRejectRequest,
}: {
  w: ChallengeWorkout;
  eventId: string;
  onRejectRequest: (w: ChallengeWorkout) => void;
}) {
  const [imgOpen, setImgOpen] = useState(false);
  const updateStatus = useUpdateWorkoutStatus();

  const approve = () => {
    updateStatus.mutate({ id: w.id, status: 'approved', eventId });
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#050505] border border-[#1a1a1a] rounded-xl overflow-hidden"
      >
        <div className="flex gap-0">
          {/* Foto thumbnail */}
          {w.photo_url ? (
            <button
              onClick={() => setImgOpen(true)}
              className="w-24 shrink-0 bg-[#0a0a0a] hover:opacity-80 transition-opacity"
            >
              <img src={w.photo_url} alt="treino" className="w-full h-full object-cover aspect-square" />
            </button>
          ) : (
            <div className="w-24 shrink-0 bg-[#0a0a0a] flex items-center justify-center text-2xl aspect-square">
              💪
            </div>
          )}

          {/* Content */}
          <div className="flex-1 p-3 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{w.athlete_name || '—'}</p>
                <p className="text-[10px] text-zinc-500">
                  {fmtDate(w.workout_date)} · Enviado às {fmtTime(w.created_at)}
                </p>
              </div>
              <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[w.status]}`}>
                {STATUS_LABEL[w.status]}
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-snug line-clamp-2">{w.description}</p>

            {w.rejection_reason && (
              <p className="text-[10px] text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-2 py-1">
                ⚠ {w.rejection_reason}
              </p>
            )}

            {w.status === 'pending' && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={approve}
                  disabled={updateStatus.isPending}
                  className="px-3 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-colors disabled:opacity-40"
                >
                  ✓ Aprovar
                </button>
                <button
                  onClick={() => onRejectRequest(w)}
                  disabled={updateStatus.isPending}
                  className="px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-colors disabled:opacity-40"
                >
                  ✕ Rejeitar
                </button>
              </div>
            )}
            {w.status !== 'pending' && (
              <div className="flex gap-2 pt-0.5">
                {w.status === 'approved' && (
                  <button
                    onClick={() => onRejectRequest(w)}
                    disabled={updateStatus.isPending}
                    className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors"
                  >
                    Rejeitar
                  </button>
                )}
                {w.status === 'rejected' && (
                  <button
                    onClick={approve}
                    disabled={updateStatus.isPending}
                    className="text-[10px] text-zinc-600 hover:text-green-400 transition-colors"
                  >
                    Aprovar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Full-screen image viewer */}
      <AnimatePresence>
        {imgOpen && w.photo_url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setImgOpen(false)}
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={w.photo_url}
              alt="treino"
              className="max-w-full max-h-full rounded-2xl object-contain"
              onClick={e => e.stopPropagation()}
            />
            <button
              onClick={() => setImgOpen(false)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/70 flex items-center justify-center text-white text-lg"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Config form ───────────────────────────────────────────────
function ChallengeConfigForm({ eventId }: { eventId: string }) {
  const { data: cfg, isLoading } = useChallengeConfig(eventId);
  const upsert = useUpsertChallengeConfig();

  const [isActive,    setIsActive]    = useState(false);
  const [goal,        setGoal]        = useState(30);
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!cfg) return;
    setIsActive(cfg.is_active);
    setGoal(cfg.goal);
    setStartDate(cfg.start_date ?? '');
    setEndDate(cfg.end_date ?? '');
    setTitle(cfg.title ?? '');
    setDescription(cfg.description ?? '');
  }, [cfg]);

  const handleSave = () => {
    upsert.mutate({
      event_id: eventId,
      is_active: isActive,
      goal,
      start_date: startDate || null,
      end_date: endDate || null,
      title: title.trim() || null,
      description: description.trim() || null,
    });
  };

  const inputClass = 'bg-[#050505] border border-[#262626] rounded-xl px-3 py-2 text-white text-sm focus:border-[#EDAC02] focus:outline-none transition-colors w-full';
  const labelClass = 'text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1';

  if (isLoading) return null;

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-white">Configuração do Desafio</p>
          <p className="text-xs text-zinc-500 mt-0.5">Defina a meta, datas e ative o desafio para os atletas</p>
        </div>
        <button
          onClick={() => setIsActive(v => !v)}
          className={`relative w-12 h-6 rounded-full transition-colors ${isActive ? 'bg-[#EDAC02]' : 'bg-[#262626]'}`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isActive ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      {!isActive && (
        <p className="text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
          ⚠ Desafio desativado — o portal funciona mas não enviará alertas automáticos até ser ativado.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className={labelClass}>Meta de treinos para o sorteio</p>
          <input
            type="number" min={1} max={365}
            value={goal}
            onChange={e => setGoal(Number(e.target.value))}
            className={inputClass}
          />
          <p className="text-[10px] text-zinc-600 mt-1">Padrão: 30 treinos</p>
        </div>
        <div>
          <p className={labelClass}>Título do Desafio (opcional)</p>
          <input
            type="text" value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Desafio 30 Dias UAIROX"
            className={inputClass}
          />
        </div>
        <div>
          <p className={labelClass}>Data de início</p>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <p className={labelClass}>Data de encerramento</p>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <p className={labelClass}>Descrição / Regulamento resumido (opcional)</p>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Ex: Registre 30 treinos até o dia do evento e garanta sua vaga no sorteio de R$ 500!"
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </div>
      </div>

      <div className="bg-[#050505] border border-[#1a1a1a] rounded-xl p-3">
        <p className={labelClass}>Link do portal do atleta</p>
        <p className="text-xs text-zinc-400 font-mono break-all">
          uairox.com.br/desafio/<span className="text-[#EDAC02]">{'{slug}'}</span>/<span className="text-[#EDAC02]">{'{registration_id}'}</span>
        </p>
        <p className="text-[10px] text-zinc-600 mt-1">Cada atleta recebe seu próprio link personalizado</p>
      </div>

      <button
        onClick={handleSave}
        disabled={upsert.isPending}
        className="w-full py-3 rounded-xl bg-[#EDAC02] text-black font-black text-sm disabled:opacity-50 hover:bg-[#d49b02] transition-colors"
      >
        {upsert.isPending ? 'Salvando...' : 'Salvar Configuração'}
      </button>
    </div>
  );
}

// ── Main tab ───────────────────────────────────────────────────
export default function AdminChallengeTab({ eventId }: { eventId: string }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [rejectTarget, setRejectTarget] = useState<ChallengeWorkout | null>(null);
  const [athleteFilter, setAthleteFilter] = useState<string>('');

  const { data: allWorkouts = [], isLoading: loadingW } = useAdminWorkouts(eventId);
  const { data: leaderboard = [], isLoading: loadingL }  = useChallengeLeaderboard(eventId);
  const { data: cfg } = useChallengeConfig(eventId);
  const updateStatus = useUpdateWorkoutStatus();

  const goal = cfg?.goal ?? GOAL;

  const approved  = allWorkouts.filter(w => w.status === 'approved');
  const pending   = allWorkouts.filter(w => w.status === 'pending');
  const rejected  = allWorkouts.filter(w => w.status === 'rejected');
  const athletes  = new Set(allWorkouts.map(w => w.registration_id)).size;
  const eligible  = leaderboard.filter(e => Number(e.workout_count) >= goal).length;

  const filtered = allWorkouts
    .filter(w => statusFilter === 'all' || w.status === statusFilter)
    .filter(w => !athleteFilter || (w.athlete_name || '').toLowerCase().includes(athleteFilter.toLowerCase()));

  const handleReject = (reason: string) => {
    if (!rejectTarget) return;
    updateStatus.mutate({
      id: rejectTarget.id,
      status: 'rejected',
      rejection_reason: reason || undefined,
      eventId,
    });
    setRejectTarget(null);
  };

  const cardClass = 'bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-4';

  if (loadingW || loadingL) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#EDAC02] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (allWorkouts.length === 0 && leaderboard.length === 0) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-5xl">💪</p>
        <p className="text-white font-bold">Nenhum treino registrado ainda</p>
        <p className="text-zinc-500 text-sm">
          Compartilhe os links{' '}
          <code className="text-[#EDAC02] font-mono text-xs">/desafio/slug/registrationId</code>{' '}
          com os atletas inscritos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Configuração ──────────────────────────────────── */}
      <ChallengeConfigForm eventId={eventId} />

      {/* ── Stats ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Treinos enviados', value: allWorkouts.length,  color: 'text-white' },
          { label: 'Aprovados',        value: approved.length,     color: 'text-green-400' },
          { label: 'Pendentes',        value: pending.length,      color: 'text-yellow-400' },
          { label: 'Atletas ativos',   value: athletes,            color: 'text-[#EDAC02]' },
          { label: `Elegíveis (${goal}+)`, value: eligible,        color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className={cardClass}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ── Leaderboard ──────────────────────────────────── */}
        <div className={`${cardClass} space-y-3`}>
          <p className="text-xs font-black text-[#EDAC02] uppercase tracking-widest">🏆 Ranking</p>
          {leaderboard.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-8">Nenhum dado ainda</p>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {leaderboard.map((entry, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                const pct   = Math.min((Number(entry.workout_count) / GOAL) * 100, 100);
                const done  = Number(entry.workout_count) >= GOAL;
                return (
                  <div
                    key={entry.registration_id}
                    className={`flex items-center gap-2 p-2 rounded-xl ${done ? 'bg-[#EDAC02]/5 border border-[#EDAC02]/20' : 'bg-[#050505]'}`}
                  >
                    <div className="w-7 text-center shrink-0 text-sm">
                      {medal ?? <span className="text-zinc-600 text-xs font-bold">#{idx + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{entry.athlete_name || 'Atleta'}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex-1 h-1 rounded-full bg-[#1a1a1a] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${done ? 'bg-[#EDAC02]' : 'bg-zinc-600'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-[9px] font-bold shrink-0 ${done ? 'text-[#EDAC02]' : 'text-zinc-500'}`}>
                          {entry.workout_count}/{GOAL}
                        </span>
                      </div>
                    </div>
                    {done && <span className="text-[9px] text-[#EDAC02] font-black shrink-0">✓</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Workout list ──────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  statusFilter === f
                    ? f === 'all'      ? 'bg-[#EDAC02] text-black border-[#EDAC02]'
                    : f === 'pending'  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    : f === 'approved' ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    :                   'bg-red-500/20 text-red-400 border-red-500/30'
                    : 'bg-transparent border-[#1a1a1a] text-zinc-500 hover:text-white'
                }`}
              >
                {f === 'all' ? `Todos (${allWorkouts.length})`
                  : f === 'pending'  ? `Pendentes (${pending.length})`
                  : f === 'approved' ? `Aprovados (${approved.length})`
                  : `Rejeitados (${rejected.length})`}
              </button>
            ))}
            <div className="ml-auto">
              <input
                value={athleteFilter}
                onChange={e => setAthleteFilter(e.target.value)}
                placeholder="Filtrar atleta..."
                className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-[#EDAC02] focus:outline-none w-36"
              />
            </div>
          </div>

          {/* Batch approve all pending */}
          {statusFilter === 'pending' && pending.length > 1 && (
            <button
              onClick={() => {
                if (!confirm(`Aprovar todos os ${pending.length} treinos pendentes?`)) return;
                pending.forEach(w =>
                  updateStatus.mutate({ id: w.id, status: 'approved', eventId })
                );
                toast.success(`${pending.length} treinos aprovados!`);
              }}
              className="w-full py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold hover:bg-green-500/20 transition-colors"
            >
              ✓ Aprovar todos os {pending.length} pendentes
            </button>
          )}

          {/* List */}
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-zinc-600 text-sm">
              Nenhum treino nesta categoria
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              <AnimatePresence mode="popLayout">
                {filtered.map(w => (
                  <WorkoutRow
                    key={w.id}
                    w={w}
                    eventId={eventId}
                    onRejectRequest={setRejectTarget}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ── Reject modal ──────────────────────────────────── */}
      <AnimatePresence>
        {rejectTarget && (
          <RejectModal
            workout={rejectTarget}
            onConfirm={handleReject}
            onCancel={() => setRejectTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
