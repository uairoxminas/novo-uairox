import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sendWebhook } from '@/lib/botconversa';
import { toast } from 'sonner';
import {
  useChallengeLeaderboard,
  useChallengeWorkouts,
  useAthleteWorkouts,
  useSubmitWorkout,
  useToggleReaction,
  uploadWorkoutPhoto,
} from '@/hooks/useChallenge';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const db = supabase as any;
const GOAL = 30;
const EMOJIS = ['👊', '🔥', '❤️', '💪', '⚡'] as const;

// ── Helpers ───────────────────────────────────────────────────
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

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// Comprime imagem via canvas — máx 1200px, JPEG 82%
async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else                { width  = Math.round((width  * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        resolve(blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file);
      }, 'image/jpeg', 0.82);
    };
    img.src = url;
  });
}

// ── Skeleton ─────────────────────────────────────────────────
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#1a1a1a] rounded-xl ${className}`} />;
}

// ── Progress ring ─────────────────────────────────────────────
function ProgressRing({ count, goal }: { count: number; goal: number }) {
  const pct  = Math.min(count / goal, 1);
  const r    = 54;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="144" height="144">
        <circle cx="72" cy="72" r={r} fill="none" stroke="#1a1a1a" strokeWidth="10" />
        <motion.circle
          cx="72" cy="72" r={r} fill="none" stroke="#EDAC02" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - circ * pct }}
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

// ── Workout card — com reações interativas ────────────────────
function WorkoutCard({
  w,
  isMine,
  viewerRegId,
  viewerName,
  eventId,
}: {
  w: any;
  isMine: boolean;
  viewerRegId: string;
  viewerName: string;
  eventId: string;
}) {
  const toggleReaction = useToggleReaction();
  const myReaction = w.workout_reactions?.find((r: any) => r.registration_id === viewerRegId) ?? undefined;

  const handleReact = (emoji: string) => {
    if (toggleReaction.isPending) return;
    toggleReaction.mutate({
      workoutId: w.id,
      registrationId: viewerRegId,
      reactorName: viewerName,
      emoji,
      eventId,
      existing: myReaction,
      workoutOwnerRegistrationId: w.registration_id,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl overflow-hidden border ${isMine ? 'border-[#EDAC02]/40 bg-[#EDAC02]/5' : 'border-[#1a1a1a] bg-[#0a0a0a]'}`}
    >
      {w.photo_url && (
        <div className="w-full aspect-[4/3] bg-[#050505]">
          <img src={w.photo_url} alt="treino" className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#EDAC02]/10 border border-[#EDAC02]/30 flex items-center justify-center text-xs font-black text-[#EDAC02] shrink-0">
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
        <p className="text-sm text-zinc-300 leading-snug">{w.description}</p>

        {/* ── Reações ── */}
        <div className="flex gap-1.5 flex-wrap pt-0.5">
          {EMOJIS.map(emoji => {
            const count = w.workout_reactions?.filter((r: any) => r.emoji === emoji).length ?? 0;
            const isActive = myReaction?.emoji === emoji;
            if (count === 0 && !isActive) return (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="text-sm rounded-full px-2 py-0.5 bg-[#111] border border-transparent text-zinc-600 hover:text-zinc-300 hover:border-zinc-700 transition-all active:scale-90"
              >
                {emoji}
              </button>
            );
            return (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={`text-xs rounded-full px-2.5 py-0.5 flex items-center gap-1 transition-all active:scale-90 ${
                  isActive
                    ? 'bg-[#EDAC02]/20 border border-[#EDAC02]/50 text-white'
                    : 'bg-[#1a1a1a] border border-transparent text-zinc-300 hover:border-zinc-600'
                }`}
              >
                <span>{emoji}</span>
                <span className={`text-[10px] font-bold ${isActive ? 'text-[#EDAC02]' : 'text-zinc-500'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ── Workout Modal ─────────────────────────────────────────────
const MILESTONE_MESSAGES: Record<number, (name: string) => string> = {
  10: (name) => `🎉 PARABÉNS, ${name}! Você completou *10 treinos* no Desafio UAIROX! Continue assim, você está arrasando! 💪`,
  20: (name) => `🔥 INCRÍVEL, ${name}! *20 treinos* no Desafio UAIROX! Faltam apenas *10* para garantir sua vaga no sorteio! Bora! ⚡`,
  30: (name) => `🏆 ${name}, você é INCRÍVEL! Completou os *30 treinos* do Desafio UAIROX e *GARANTIU SUA VAGA NO SORTEIO*! Nos vemos no evento! 🎯`,
};

function WorkoutModal({
  onClose,
  registration,
  eventId,
  currentCount,
}: {
  onClose: () => void;
  registration: any;
  eventId: string;
  currentCount: number;
}) {
  const [photoFile, setPhotoFile]       = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [description, setDescription]  = useState('');
  const [workoutDate, setWorkoutDate]   = useState(todayStr());
  const [submitting, setSubmitting]     = useState(false);
  const [success, setSuccess]           = useState(false);
  const [milestone, setMilestone]       = useState<number | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const submitWorkout = useSubmitWorkout();

  const handleFileSelect = async (file: File) => {
    const compressed = await compressImage(file);
    setPhotoFile(compressed);
    setPhotoPreview(URL.createObjectURL(compressed));
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFileSelect(file);
  };

  const handleSubmit = async () => {
    if (!description.trim()) { toast.error('Descreva o treino antes de enviar.'); return; }
    setSubmitting(true);
    try {
      let photo_url: string | undefined;
      if (photoFile) {
        photo_url = await uploadWorkoutPhoto(photoFile, registration.id);
      }
      await submitWorkout.mutateAsync({
        event_id:       eventId,
        registration_id: registration.id,
        athlete_name:   registration.athlete_name,
        athlete_phone:  registration.athlete_phone ?? undefined,
        photo_url,
        description:    description.trim(),
        workout_date:   workoutDate,
      });

      // ── Marco automático ──────────────────────────────────
      const newCount = currentCount + 1;
      let hitMilestone: number | null = null;
      if ([10, 20, 30].includes(newCount)) {
        hitMilestone = newCount;
        setMilestone(newCount);
        // Enviar WhatsApp via BotConversa (fire-and-forget)
        try {
          const phone = (registration.athlete_phone || '').replace(/\D/g, '');
          if (phone.length >= 10) {
            const { data: bcfg } = await (db as any)
              .from('botconversa_config')
              .select('trigger_inscricao_url')
              .eq('event_id', eventId)
              .maybeSingle();
            if (bcfg?.trigger_inscricao_url) {
              await sendWebhook(bcfg.trigger_inscricao_url, {
                telefone: phone,
                message: MILESTONE_MESSAGES[newCount](registration.athlete_name),
              }, { maxAttempts: 2, retryDelay: 500 });
            }
          }
        } catch {
          // Silencioso — falha na mensagem não quebra o fluxo
        }
        // Push notification complementar (fire-and-forget)
        fetch('/api/push-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'milestone',
            registration_id: registration.id,
            milestone: newCount,
            name: registration.athlete_name,
          }),
        }).catch(() => {});
      }

      setSuccess(true);
      setTimeout(onClose, hitMilestone ? 3500 : 1800);
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao registrar treino.');
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="w-full max-w-lg bg-[#0a0a0a] border border-[#1a1a1a] rounded-t-3xl sm:rounded-3xl overflow-hidden max-h-[92vh] flex flex-col"
        >
          {/* ── Success overlay ── */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 z-10 bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 px-6 text-center"
              >
                {milestone ? (
                  <>
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 250, damping: 12, delay: 0.1 }}
                      className="text-7xl"
                    >
                      {milestone === 30 ? '🏆' : milestone === 20 ? '🔥' : '🎉'}
                    </motion.div>
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="text-3xl font-black text-[#EDAC02]"
                    >
                      {milestone} Treinos!
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      className="text-lg font-bold text-white"
                    >
                      {milestone === 30
                        ? 'Você garantiu sua vaga no sorteio! 🎯'
                        : milestone === 20
                        ? `Mais ${GOAL - milestone} para o sorteio! ⚡`
                        : 'Continue assim! Você está arrasando! 💪'}
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-xs text-zinc-500"
                    >
                      📲 Mensagem enviada no seu WhatsApp
                    </motion.p>
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
                      className="w-20 h-20 rounded-full bg-[#25D366]/10 border-2 border-[#25D366] flex items-center justify-center text-4xl"
                    >
                      ✅
                    </motion.div>
                    <p className="text-xl font-black text-white">Treino registrado!</p>
                    <p className="text-zinc-500 text-sm">Continue assim! 💪</p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a] shrink-0">
            <div>
              <p className="text-xs text-[#EDAC02] font-black uppercase tracking-widest">Novo Treino</p>
              <p className="text-sm font-bold text-zinc-400">{registration?.athlete_name}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-5">
            {/* ── Foto ── */}
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Foto do Treino</p>
              {photoPreview ? (
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-[#050505] group">
                  <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center text-white text-sm opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
                  >✕</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => cameraRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-[#262626] hover:border-[#EDAC02] flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-[#EDAC02] transition-all bg-[#050505]"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <span className="text-xs font-bold">Câmera</span>
                  </button>
                  <button
                    onClick={() => galleryRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-[#262626] hover:border-[#EDAC02] flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-[#EDAC02] transition-all bg-[#050505]"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span className="text-xs font-bold">Galeria</span>
                  </button>
                </div>
              )}
              <input ref={cameraRef}  type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInputChange} />
              <input ref={galleryRef} type="file" accept="image/*"                       className="hidden" onChange={handleInputChange} />
              <p className="text-[10px] text-zinc-600 mt-1.5">A foto é opcional. Imagens são comprimidas automaticamente.</p>
            </div>

            {/* ── Descrição ── */}
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">O que você treinou? *</p>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: WOD 15min AMRAP: 10 burpees, 15 wall balls, 200m corrida. Fui na Rx e fechei 6 rounds + 8 burpees 🔥"
                rows={4}
                maxLength={500}
                className="w-full bg-[#050505] border border-[#262626] rounded-xl p-4 text-white placeholder:text-zinc-600 focus:border-[#EDAC02] focus:outline-none transition-colors text-sm resize-none"
                autoFocus
              />
              <p className="text-[10px] text-zinc-600 text-right mt-1">{description.length}/500</p>
            </div>

            {/* ── Data ── */}
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Data do Treino</p>
              <input
                type="date"
                value={workoutDate}
                max={todayStr()}
                onChange={e => setWorkoutDate(e.target.value)}
                className="w-full bg-[#050505] border border-[#262626] rounded-xl p-3 text-white focus:border-[#EDAC02] focus:outline-none transition-colors text-sm"
              />
            </div>
          </div>

          {/* ── Submit ── */}
          <div className="px-5 py-4 border-t border-[#1a1a1a] shrink-0">
            <button
              onClick={handleSubmit}
              disabled={submitting || !description.trim() || success}
              className="w-full py-4 rounded-2xl font-black text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#EDAC02] text-black hover:bg-[#d49b02] active:scale-95"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" />
                  </svg>
                  Enviando...
                </span>
              ) : (
                '💪 Registrar Treino'
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function ChallengePortalPage() {
  const { slug, registrationId } = useParams<{ slug: string; registrationId: string }>();
  const queryClient = useQueryClient();

  const [loading, setLoading]           = useState(true);
  const [registration, setRegistration] = useState<any>(null);
  const [event, setEvent]               = useState<any>(null);
  const [notFound, setNotFound]         = useState(false);
  const [activeTab, setActiveTab]       = useState<'feed' | 'ranking'>('feed');
  const [showModal, setShowModal]       = useState(false);
  const [newCount, setNewCount]         = useState(0);

  useEffect(() => {
    if (!registrationId) return;
    (async () => {
      setLoading(true);
      const { data: reg } = await db
        .from('registrations')
        .select('id, athlete_name, athlete_email, athlete_phone, event_id, status')
        .eq('id', registrationId)
        .maybeSingle();
      if (!reg) { setNotFound(true); setLoading(false); return; }

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

  // ── Supabase Realtime — feed ao vivo ─────────────────────
  useEffect(() => {
    if (!eventId) return;
    let mounted = true;

    const channel = db
      .channel(`challenge-live-${eventId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'challenge_workouts',
        filter: `event_id=eq.${eventId}`,
      }, (payload: any) => {
        if (!mounted) return;
        // Se não é o próprio atleta que postou, notifica
        if (payload.new?.registration_id !== registrationId) {
          setNewCount(n => n + 1);
        }
        queryClient.invalidateQueries({ queryKey: ['challenge-workouts', eventId] });
        queryClient.invalidateQueries({ queryKey: ['challenge-leaderboard', eventId] });
        queryClient.invalidateQueries({ queryKey: ['athlete-workouts', eventId, registrationId] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workout_reactions',
      }, () => {
        if (!mounted) return;
        queryClient.invalidateQueries({ queryKey: ['challenge-workouts', eventId] });
      })
      .subscribe();

    return () => {
      mounted = false;
      db.removeChannel(channel);
    };
  }, [eventId, registrationId, queryClient]);

  const { data: leaderboard = [] } = useChallengeLeaderboard(eventId);
  const { data: feed = [] }        = useChallengeWorkouts(eventId);
  const { data: myWorkouts = [] }  = useAthleteWorkouts(eventId, registrationId);

  const push = usePushNotifications(registrationId);

  const myCount   = myWorkouts.filter(w => w.status === 'approved').length;
  const myRank    = leaderboard.findIndex(e => e.registration_id === registrationId) + 1;
  const pctToGoal = Math.min(myCount / GOAL, 1);
  const daysLeft  = event?.date
    ? Math.max(0, Math.ceil((new Date(event.date).getTime() - Date.now()) / 86400000))
    : null;

  if (!loading && notFound) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-8 text-center">
        <p className="text-5xl mb-4">🔍</p>
        <h1 className="text-xl font-black text-white mb-2">Link não encontrado</h1>
        <p className="text-zinc-500 text-sm">Verifique o link recebido no WhatsApp.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] p-4 space-y-4 max-w-lg mx-auto pt-6">
        <Skeleton className="h-14" />
        <Skeleton className="h-48" />
        <Skeleton className="h-12" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#050505] pb-28">
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
              <ProgressRing count={myCount} goal={GOAL} />
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
                    <p className="text-lg font-black text-white">
                      {GOAL - myCount > 0 ? GOAL - myCount : '✓'}
                    </p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-wider">
                      {GOAL - myCount > 0 ? 'p/ sorteio' : 'elegível!'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
                <p className="text-xs text-[#25D366] font-bold text-center pt-1">
                  🎉 Você está elegível para o sorteio!
                </p>
              )}
            </div>

            {/* ── Botão de notificações ── */}
            {push.isSupported && push.permission !== 'denied' && (
              <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
                {push.isSubscribed ? (
                  <button
                    onClick={push.unsubscribe}
                    disabled={push.loading}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    🔔 Notificações ativadas
                    <span className="text-zinc-700">(toque para desativar)</span>
                  </button>
                ) : (
                  <button
                    onClick={push.subscribe}
                    disabled={push.loading}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-[#1a1a1a] text-xs font-bold text-zinc-400 hover:text-white hover:bg-[#222] transition-all disabled:opacity-40"
                  >
                    {push.loading ? '...' : '🔔 Ativar notificações de reações'}
                  </button>
                )}
              </div>
            )}
          </motion.div>

          {/* ── Tabs ───────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2">
            {(['feed', 'ranking'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'feed') setNewCount(0);
                }}
                className={`py-2.5 rounded-xl text-sm font-bold transition-all relative ${
                  activeTab === tab
                    ? 'bg-[#EDAC02] text-black'
                    : 'bg-[#0a0a0a] border border-[#1a1a1a] text-zinc-400'
                }`}
              >
                {tab === 'feed' ? '📸 Feed' : '🏆 Ranking'}
                {tab === 'feed' && newCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#EDAC02] text-black text-[10px] font-black flex items-center justify-center">
                    {newCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Novo treino pill (Realtime) ─────────────── */}
          <AnimatePresence>
            {activeTab === 'feed' && newCount > 0 && (
              <motion.button
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                onClick={() => { setNewCount(0); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="w-full py-2.5 rounded-xl bg-[#EDAC02]/10 border border-[#EDAC02]/30 text-[#EDAC02] text-xs font-bold flex items-center justify-center gap-2"
              >
                ↑ {newCount} novo{newCount > 1 ? 's' : ''} treino{newCount > 1 ? 's' : ''} — toque para ver
              </motion.button>
            )}
          </AnimatePresence>

          {/* ── FEED ───────────────────────────────────── */}
          {activeTab === 'feed' && (
            <div className="space-y-4">
              {feed.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <p className="text-5xl">💪</p>
                  <p className="text-white font-bold">Nenhum treino ainda</p>
                  <p className="text-zinc-500 text-sm">Seja o primeiro! Clique em "Registrar Treino".</p>
                </div>
              ) : (
                feed.map(w => (
                  <WorkoutCard
                    key={w.id}
                    w={w}
                    isMine={w.registration_id === registrationId}
                    viewerRegId={registrationId!}
                    viewerName={registration?.athlete_name ?? ''}
                    eventId={eventId}
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
                  <p className="text-zinc-500 text-sm">Registre o primeiro treino para aparecer.</p>
                </div>
              ) : (
                leaderboard.map((entry, idx) => {
                  const isMe  = entry.registration_id === registrationId;
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                  return (
                    <motion.div
                      key={entry.registration_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className={`flex items-center gap-3 p-3 rounded-xl border ${
                        isMe ? 'border-[#EDAC02]/40 bg-[#EDAC02]/5' : 'border-[#1a1a1a] bg-[#0a0a0a]'
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
      </div>

      {/* ── Botão fixo no bottom ────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-[#050505] via-[#050505]/95 to-transparent pointer-events-none">
        <button
          onClick={() => setShowModal(true)}
          className="pointer-events-auto w-full max-w-lg mx-auto flex items-center justify-center gap-2 py-4 bg-[#EDAC02] text-black font-black text-base rounded-2xl shadow-[0_0_30px_rgba(237,172,2,0.4)] hover:bg-[#d49b02] active:scale-95 transition-all"
        >
          💪 Registrar Treino
        </button>
      </div>

      {/* ── Modal ──────────────────────────────────── */}
      {showModal && registration && eventId && (
        <WorkoutModal
          registration={registration}
          eventId={eventId}
          currentCount={myCount}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
