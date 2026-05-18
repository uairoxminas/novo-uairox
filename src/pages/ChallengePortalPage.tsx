import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  useChallengeLeaderboard,
  useChallengeWorkouts,
  useAthleteWorkouts,
} from '@/hooks/useChallenge';

const db = supabase as any;

const GOAL = 30; // treinos para ticket do sorteio

// ── Helpers ──────────────────────────────────────────────────
function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'agora';
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short',
  });
}

// ── Loading skeleton ─────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#1a1a1a] rounded-lg ${className}`} />;
}

// ── Progress ring (SVG) ───────────────────────────────────────
function ProgressRing({ count, goal }: { count: number; goal: number }) {
  const pct  = Math.min(count / goal, 1);
  const r    = 54;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="144" height="144">
        <circle cx="72" cy="72" r={r} fill="none" stroke="#1a1a1a" strokeWidth="10" />
        <motion.circle
          cx="72" cy="72" r={r}
          fill="none"
          stroke="#EDAC02"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="text-center z-10">
        <span className="text-4xl font-black text-white">{count}</span>
        <span className="text-sm text-zinc-500 font-bold">/{goal}</span>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">treinos</p>
      </div>
    </div>
  );
}

// ── Workout card (feed) ───────────────────────────────────────
function WorkoutCard({ w, isMine }: { w: any; isMine: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl overflow-hidden border ${isMine ? 'border-[#EDAC02]/40 bg-[#EDAC02]/5' : 'border-[#1a1a1a] bg-[#0a0a0a]'}`}
    >
      {w.photo_url && (
        <div className="w-full aspect-[4/3] bg-[#050505]">
          <img
            src={w.photo_url}
            alt="treino"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 flex items-center justify-center text-xs font-black text-[#EDAC02]">
              {(w.athlete_name || '?')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">
                {w.athlete_name || 'Atleta'}
                {isMine && <span className="ml-1.5 text-[9px] text-[#EDAC02] font-black uppercase tracking-wider">você</span>}
              </p>
              <p className="text-[10px] text-zinc-500">{formatDate(w.workout_date)} · {formatTimeAgo(w.created_at)}</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-zinc-300 leading-snug">{w.description}</p>
        {/* Reactions display */}
        {w.workout_reactions?.length > 0 && (
          <div className="flex gap-2 pt-1">
            {(['👊','🔥','❤️','💪','⚡'] as const).map(emoji => {
              const count = w.workout_reactions.filter((r: any) => r.emoji === emoji).length;
              if (!count) return null;
              return (
                <span key={emoji} className="text-xs bg-[#1a1a1a] rounded-full px-2 py-0.5 text-zinc-300">
                  {emoji} {count}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function ChallengePortalPage() {
  const { slug, registrationId } = useParams<{ slug: string; registrationId: string }>();

  const [loading, setLoading] = useState(true);
  const [registration, setRegistration] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'ranking'>('feed');

  // Load registration + event
  useEffect(() => {
    if (!registrationId) return;
    (async () => {
      setLoading(true);

      // 1. Busca a inscrição pelo ID
      const { data: reg } = await db
        .from('registrations')
        .select('id, athlete_name, athlete_email, athlete_phone, event_id, status')
        .eq('id', registrationId)
        .maybeSingle();

      if (!reg) { setNotFound(true); setLoading(false); return; }

      // 2. Busca o evento pelo event_id E verifica se o slug bate
      const { data: ev } = await db
        .from('events')
        .select('id, title, date, slug, image_url')
        .eq('id', reg.event_id)
        .maybeSingle();

      if (!ev || (slug && ev.slug !== slug)) { setNotFound(true); setLoading(false); return; }

      setRegistration(reg);
      setEvent(ev);
      setLoading(false);
    })();
  }, [registrationId, slug]);

  const eventId = event?.id;

  const { data: leaderboard = [] }   = useChallengeLeaderboard(eventId);
  const { data: feed = [] }          = useChallengeWorkouts(eventId);
  const { data: myWorkouts = [] }    = useAthleteWorkouts(eventId, registrationId);

  const myCount   = myWorkouts.filter(w => w.status === 'approved').length;
  const myRank    = leaderboard.findIndex(e => e.registration_id === registrationId) + 1;
  const pctToGoal = Math.min(myCount / GOAL, 1);
  const daysLeft  = event?.date
    ? Math.max(0, Math.ceil((new Date(event.date).getTime() - Date.now()) / 86400000))
    : null;

  // ── NOT FOUND ────────────────────────────────────────────
  if (!loading && notFound) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-center">
        <p className="text-5xl mb-4">🔍</p>
        <h1 className="text-xl font-black text-white mb-2">Link não encontrado</h1>
        <p className="text-zinc-500 text-sm">Verifique o link recebido no WhatsApp ou entre em contato com a organização.</p>
      </div>
    );
  }

  // ── LOADING ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] p-4 space-y-4 max-w-lg mx-auto">
        <Skeleton className="h-14 mt-4" />
        <Skeleton className="h-40" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] pb-24">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="bg-[#050505] border-b border-[#1a1a1a] sticky top-0 z-40 px-4 py-3 flex items-center gap-3">
        <img src="/logo-uairox.png" alt="UAIROX" className="h-7 w-auto" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-[#EDAC02] font-black uppercase tracking-widest">Desafio</p>
          <p className="text-sm font-black text-white truncate">{event?.title}</p>
        </div>
        {daysLeft !== null && (
          <div className="text-right shrink-0">
            <p className="text-lg font-black text-[#EDAC02]">{daysLeft}</p>
            <p className="text-[9px] text-zinc-500 uppercase tracking-wider">dias</p>
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-5 pt-5">

        {/* ── Card do atleta ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-5"
        >
          <div className="flex items-center gap-5">
            {/* Progress ring */}
            <ProgressRing count={myCount} goal={GOAL} />

            {/* Info */}
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Atleta</p>
                <p className="text-lg font-black text-white leading-tight">{registration?.athlete_name}</p>
              </div>
              <div className="flex gap-3">
                {myRank > 0 && (
                  <div className="bg-[#EDAC02]/10 border border-[#EDAC02]/20 rounded-lg px-3 py-1.5 text-center">
                    <p className="text-lg font-black text-[#EDAC02]">#{myRank}</p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider">ranking</p>
                  </div>
                )}
                <div className="bg-[#1a1a1a] rounded-lg px-3 py-1.5 text-center">
                  <p className="text-lg font-black text-white">{GOAL - myCount > 0 ? GOAL - myCount : '✓'}</p>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider">{GOAL - myCount > 0 ? 'p/ sorteio' : 'no sorteio!'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-zinc-500 uppercase tracking-wider">Meta do sorteio</span>
              <span className="text-[#EDAC02] font-bold">{myCount}/{GOAL} treinos</span>
            </div>
            <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[#EDAC02]"
                initial={{ width: 0 }}
                animate={{ width: `${pctToGoal * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            {myCount >= GOAL && (
              <p className="text-xs text-[#25D366] font-bold text-center">
                🎉 Parabéns! Você está elegível para o sorteio!
              </p>
            )}
          </div>
        </motion.div>

        {/* ── Tabs ───────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          {(['feed', 'ranking'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab
                  ? 'bg-[#EDAC02] text-black'
                  : 'bg-[#0a0a0a] border border-[#1a1a1a] text-zinc-400'
              }`}
            >
              {tab === 'feed' ? '📸 Feed' : '🏆 Ranking'}
            </button>
          ))}
        </div>

        {/* ── FEED ───────────────────────────────────── */}
        {activeTab === 'feed' && (
          <div className="space-y-4">
            {feed.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <p className="text-5xl">💪</p>
                <p className="text-white font-bold">Nenhum treino registrado ainda</p>
                <p className="text-zinc-500 text-sm">Seja o primeiro! Registre seu treino.</p>
              </div>
            ) : (
              feed.map(w => (
                <WorkoutCard
                  key={w.id}
                  w={w}
                  isMine={w.registration_id === registrationId}
                />
              ))
            )}
          </div>
        )}

        {/* ── RANKING ────────────────────────────────── */}
        {activeTab === 'ranking' && (
          <div className="space-y-2">
            {leaderboard.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <p className="text-5xl">🏆</p>
                <p className="text-white font-bold">Ranking vazio</p>
                <p className="text-zinc-500 text-sm">O ranking aparece após o primeiro treino registrado.</p>
              </div>
            ) : (
              leaderboard.map((entry, idx) => {
                const isMe = entry.registration_id === registrationId;
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                return (
                  <motion.div
                    key={entry.registration_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      isMe
                        ? 'border-[#EDAC02]/40 bg-[#EDAC02]/5'
                        : 'border-[#1a1a1a] bg-[#0a0a0a]'
                    }`}
                  >
                    <div className="w-8 text-center shrink-0">
                      {medal
                        ? <span className="text-xl">{medal}</span>
                        : <span className="text-sm font-black text-zinc-500">#{idx + 1}</span>
                      }
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 flex items-center justify-center text-sm font-black text-[#EDAC02] shrink-0">
                      {(entry.athlete_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isMe ? 'text-[#EDAC02]' : 'text-white'}`}>
                        {entry.athlete_name || 'Atleta'}
                        {isMe && <span className="ml-1 text-[9px]">← você</span>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-white">{entry.workout_count}</p>
                      <p className="text-[9px] text-zinc-500">treinos</p>
                    </div>
                    {/* mini progress */}
                    <div className="w-12 h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden shrink-0">
                      <div
                        className={`h-full rounded-full ${isMe ? 'bg-[#EDAC02]' : 'bg-zinc-600'}`}
                        style={{ width: `${Math.min((entry.workout_count / GOAL) * 100, 100)}%` }}
                      />
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* ── Botão Registrar Treino (fixo no bottom) ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent">
        <button
          disabled
          className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 py-4 bg-[#EDAC02]/30 text-[#EDAC02]/50 font-black text-base rounded-2xl cursor-not-allowed border border-[#EDAC02]/20"
        >
          💪 Registrar Treino
          <span className="text-xs font-normal opacity-60">(disponível em breve)</span>
        </button>
      </div>
    </div>
  );
}
