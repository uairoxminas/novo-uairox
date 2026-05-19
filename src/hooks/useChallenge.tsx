import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

// ── Types ─────────────────────────────────────────────────

export interface ChallengeConfig {
  id: string;
  event_id: string;
  is_active: boolean;
  goal: number;
  start_date: string | null;
  end_date: string | null;
  title: string | null;
  description: string | null;
}

export interface ChallengeWorkout {
  id: string;
  event_id: string;
  registration_id: string;
  athlete_name: string | null;
  athlete_phone: string | null;
  photo_url: string | null;
  description: string;
  workout_date: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  reactions?: WorkoutReaction[];
}

export interface WorkoutReaction {
  id: string;
  workout_id: string;
  registration_id: string | null;
  reactor_name: string | null;
  emoji: string;
  created_at: string;
}

export interface LeaderboardEntry {
  event_id: string;
  registration_id: string;
  athlete_name: string | null;
  workout_count: number;
  last_workout_at: string | null;
}

// ── Challenge Config ──────────────────────────────────────

export function useChallengeConfig(eventId?: string) {
  return useQuery({
    queryKey: ['challenge-config', eventId],
    queryFn: async () => {
      const { data } = await db
        .from('challenge_configs')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle();
      return (data ?? null) as ChallengeConfig | null;
    },
    enabled: !!eventId,
  });
}

export function useUpsertChallengeConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cfg: {
      event_id: string;
      is_active: boolean;
      goal: number;
      start_date?: string | null;
      end_date?: string | null;
      title?: string | null;
      description?: string | null;
    }) => {
      const { data, error } = await db
        .from('challenge_configs')
        .upsert({ ...cfg, updated_at: new Date().toISOString() }, { onConflict: 'event_id' })
        .select()
        .single();
      if (error) throw error;
      return data as ChallengeConfig;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['challenge-config', vars.event_id] });
      toast.success('Configuração salva!');
    },
    onError: (e: any) => toast.error('Erro ao salvar: ' + e.message),
  });
}

// ── Leaderboard ───────────────────────────────────────────

export function useChallengeLeaderboard(eventId?: string) {
  return useQuery({
    queryKey: ['challenge-leaderboard', eventId],
    queryFn: async () => {
      const { data, error } = await db
        .from('challenge_leaderboard')
        .select('*')
        .eq('event_id', eventId)
        .order('workout_count', { ascending: false });
      if (error) throw error;
      return (data ?? []) as LeaderboardEntry[];
    },
    enabled: !!eventId,
  });
}

// ── Feed de treinos ───────────────────────────────────────

export function useChallengeWorkouts(eventId?: string) {
  return useQuery({
    queryKey: ['challenge-workouts', eventId],
    queryFn: async () => {
      const { data, error } = await db
        .from('challenge_workouts')
        .select('*, workout_reactions(*)')
        .eq('event_id', eventId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ChallengeWorkout[];
    },
    enabled: !!eventId,
  });
}

// Treinos de um atleta específico (para o painel dele)
export function useAthleteWorkouts(eventId?: string, registrationId?: string) {
  return useQuery({
    queryKey: ['athlete-workouts', eventId, registrationId],
    queryFn: async () => {
      const { data, error } = await db
        .from('challenge_workouts')
        .select('*')
        .eq('event_id', eventId)
        .eq('registration_id', registrationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ChallengeWorkout[];
    },
    enabled: !!eventId && !!registrationId,
  });
}

// ── Registrar treino ──────────────────────────────────────

export function useSubmitWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (workout: {
      event_id: string;
      registration_id: string;
      athlete_name: string;
      athlete_phone?: string;
      photo_url?: string;
      description: string;
      workout_date?: string;
    }) => {
      const { data, error } = await db
        .from('challenge_workouts')
        .insert({
          ...workout,
          workout_date: workout.workout_date ?? new Date().toISOString().split('T')[0],
          status: 'approved',
        })
        .select()
        .single();
      if (error) throw error;
      return data as ChallengeWorkout;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['challenge-workouts', vars.event_id] });
      qc.invalidateQueries({ queryKey: ['athlete-workouts', vars.event_id, vars.registration_id] });
      qc.invalidateQueries({ queryKey: ['challenge-leaderboard', vars.event_id] });
      toast.success('Treino registrado! 💪');
    },
    onError: (e: any) => toast.error('Erro ao registrar treino: ' + e.message),
  });
}

// ── Reactions ─────────────────────────────────────────────

export function useToggleReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workoutId,
      registrationId,
      reactorName,
      emoji,
      eventId,
      existing,
    }: {
      workoutId: string;
      registrationId: string;
      reactorName: string;
      emoji: string;
      eventId: string;
      existing?: WorkoutReaction;
      workoutOwnerRegistrationId?: string;
    }) => {
      if (existing) {
        if (existing.emoji === emoji) {
          // Remove reaction
          await db.from('workout_reactions').delete().eq('id', existing.id);
          return null;
        }
        // Change emoji
        await db.from('workout_reactions').update({ emoji }).eq('id', existing.id);
        return emoji;
      }
      // New reaction
      await db.from('workout_reactions').insert({
        workout_id: workoutId,
        registration_id: registrationId,
        reactor_name: reactorName,
        emoji,
      });
      return emoji;
    },
    onSuccess: (result, vars) => {
      qc.invalidateQueries({ queryKey: ['challenge-workouts', vars.eventId] });
      // Push notification para o dono do treino quando alguém reage (não a si mesmo)
      if (result !== null && vars.workoutOwnerRegistrationId && vars.workoutOwnerRegistrationId !== vars.registrationId) {
        fetch('/api/push-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'reaction',
            registration_id: vars.workoutOwnerRegistrationId,
            reactor_name: vars.reactorName,
            emoji: vars.emoji,
          }),
        }).catch(() => {});
      }
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

// ── Admin: todos os treinos (incluindo pendentes/rejeitados) ──

export function useAdminWorkouts(eventId?: string) {
  return useQuery({
    queryKey: ['admin-workouts', eventId],
    queryFn: async () => {
      const { data, error } = await db
        .from('challenge_workouts')
        .select('*, workout_reactions(*)')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ChallengeWorkout[];
    },
    enabled: !!eventId,
  });
}

export function useUpdateWorkoutStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      rejection_reason,
      eventId,
    }: {
      id: string;
      status: 'approved' | 'rejected';
      rejection_reason?: string;
      eventId: string;
    }) => {
      const { error } = await db
        .from('challenge_workouts')
        .update({ status, rejection_reason: rejection_reason ?? null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-workouts', vars.eventId] });
      qc.invalidateQueries({ queryKey: ['challenge-workouts', vars.eventId] });
      qc.invalidateQueries({ queryKey: ['challenge-leaderboard', vars.eventId] });
      toast.success(vars.status === 'approved' ? 'Treino aprovado!' : 'Treino rejeitado.');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });
}

// ── Upload de foto de treino ──────────────────────────────

export async function uploadWorkoutPhoto(file: File, registrationId: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${registrationId}/${Date.now()}.${ext}`;
  const { error } = await (supabase as any).storage.from('workouts').upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = (supabase as any).storage.from('workouts').getPublicUrl(path);
  return data.publicUrl;
}
