import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AthleteState = 'racing' | 'complete' | 'incomplete' | 'validated' | 'dnf' | 'dsq';

export interface ArbSplit { id: string; ts: string; checkpoint_id: string | null; }
export interface ArbAthlete {
  registration_id: string;
  heat_id: string | null;
  heat_start: string | null;
  heat_title: string | null;
  bib: number | null;
  name: string | null;
  phone: string | null;            // atleta principal (cap. da equipe em dupla/quarteto)
  member_phones: string[];         // demais integrantes da equipe (team_members[].phone)
  team_name: string | null;
  team_size: number;
  category_id: string | null;
  category_name: string;
  splits: ArbSplit[];
  passCount: number;
  target: number;
  penaltiesSec: number;
  result: { status: string; final_ms: number | null; dq_reason: string | null } | null;
  finalMs: number | null;   // tempo a exibir (result salvo ou calculado)
  computedMs: number | null;
  outOfSync: boolean;       // resultado validado cujo tempo salvo ≠ passagens atuais
  state: AthleteState;
}

export function useRaceArbitration(eventId: string) {
  return useQuery({
    queryKey: ['arbitration', eventId],
    queryFn: async (): Promise<{ athletes: ArbAthlete[]; target: number }> => {
      const { data: ev } = await supabase.from('events' as any).select('target_passes_volume').eq('id', eventId).maybeSingle();
      const target = ((ev as any)?.target_passes_volume as number) || 1;

      const { data: heats } = await supabase.from('heats' as any).select('id, start_time, title').eq('event_id', eventId);
      const heatList = (heats ?? []) as any[];
      const heatStartMap = new Map(heatList.map(h => [h.id, h.start_time]));
      const heatTitleMap = new Map(heatList.map(h => [h.id, h.title]));
      const heatIds = heatList.map(h => h.id);
      if (!heatIds.length) return { athletes: [], target };

      const { data: lanes } = await supabase.from('heat_lane_assignments' as any).select('registration_id, heat_id').in('heat_id', heatIds);
      const laneList = (lanes ?? []) as any[];
      const regIds = [...new Set(laneList.map(l => l.registration_id).filter(Boolean))];
      if (!regIds.length) return { athletes: [], target };

      const { data: regs } = await supabase.from('registrations' as any).select('id, bib_number, athlete_name, athlete_phone, team_members, team_name, category_id').in('id', regIds);
      const regMap = new Map((regs ?? []).map((r: any) => [r.id, r]));

      const catIds = [...new Set((regs ?? []).map((r: any) => r.category_id).filter(Boolean))];
      const catMap = new Map<string, string>();
      const catSizeMap = new Map<string, number>();
      if (catIds.length) {
        const { data: cats } = await supabase.from('categories' as any).select('id, name, team_size').in('id', catIds);
        (cats ?? []).forEach((c: any) => { catMap.set(c.id, c.name); catSizeMap.set(c.id, c.team_size ?? 1); });
      }

      const { data: splits } = await supabase.from('race_splits' as any)
        .select('id, registration_id, split_timestamp, checkpoint_id').in('heat_id', heatIds)
        .order('split_timestamp', { ascending: true });
      const splitsByReg = new Map<string, ArbSplit[]>();
      (splits ?? []).forEach((s: any) => {
        const a = splitsByReg.get(s.registration_id) ?? [];
        a.push({ id: s.id, ts: s.split_timestamp, checkpoint_id: s.checkpoint_id });
        splitsByReg.set(s.registration_id, a);
      });

      const { data: pens } = await supabase.from('race_penalties' as any).select('registration_id, penalty_seconds').in('heat_id', heatIds);
      const penByReg = new Map<string, number>();
      (pens ?? []).forEach((p: any) => penByReg.set(p.registration_id, (penByReg.get(p.registration_id) ?? 0) + (p.penalty_seconds ?? 30)));

      const { data: results } = await supabase.from('race_results' as any).select('registration_id, status, final_adjusted_time_ms, dq_reason').eq('event_id', eventId);
      const resByReg = new Map((results ?? []).map((r: any) => [r.registration_id, r]));

      const athletes: ArbAthlete[] = laneList.map((lane: any) => {
        const reg = regMap.get(lane.registration_id) as any;
        const sp = splitsByReg.get(lane.registration_id) ?? [];
        const passCount = sp.length;
        const penSec = penByReg.get(lane.registration_id) ?? 0;
        const result = resByReg.get(lane.registration_id) as any;
        const heatStart = heatStartMap.get(lane.heat_id) ?? null;
        // Tempo = última passagem − 1ª passagem (o cronômetro do atleta inicia
        // na 1ª leitura, não na largada manual). 1ª passagem conta como marcação 1.
        let computed: number | null = null;
        if (passCount > 0) {
          const firstTs = new Date(sp[0].ts).getTime();
          const lastTs  = new Date(sp[passCount - 1].ts).getTime();
          computed = (lastTs - firstTs) + penSec * 1000;
        }
        let state: AthleteState;
        if (result?.status === 'validated') state = 'validated';
        else if (result?.status === 'dnf') state = 'dnf';
        else if (result?.status === 'disqualified') state = 'dsq';
        else state = passCount >= target ? 'complete' : 'incomplete';
        return {
          registration_id: lane.registration_id, heat_id: lane.heat_id, heat_start: heatStart,
          heat_title: heatTitleMap.get(lane.heat_id) ?? null,
          bib: reg?.bib_number ?? null, name: reg?.athlete_name ?? null, phone: reg?.athlete_phone ?? null,
          member_phones: Array.isArray(reg?.team_members) ? reg.team_members.map((m: any) => m?.phone).filter(Boolean) : [],
          team_name: reg?.team_name ?? null, team_size: catSizeMap.get(reg?.category_id) ?? 1,
          category_id: reg?.category_id ?? null, category_name: catMap.get(reg?.category_id) ?? 'Sem categoria',
          splits: sp, passCount, target, penaltiesSec: penSec,
          result: result ? { status: result.status, final_ms: result.final_adjusted_time_ms, dq_reason: result.dq_reason } : null,
          finalMs: result?.final_adjusted_time_ms ?? computed,
          computedMs: computed,
          // Validado mas o tempo salvo não corresponde mais às passagens (passagem/penalidade
          // mudou após validar). Sinaliza pra recalcular — não altera nada sozinho.
          outOfSync: state === 'validated' && result?.final_adjusted_time_ms != null && computed != null
            && Math.abs((result.final_adjusted_time_ms as number) - computed) > 2000,
          state,
        };
      }).sort((a, b) => (a.bib ?? 0) - (b.bib ?? 0));

      return { athletes, target };
    },
    refetchInterval: 5000,
    enabled: !!eventId,
  });
}

// ── Ações de arbitragem ───────────────────────────────────────────────────────
export function useArbitrationActions(eventId: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['arbitration', eventId] });
    qc.invalidateQueries({ queryKey: ['race-checkin', eventId] });
  };

  const addSplit = useMutation({
    mutationFn: async (v: { registration_id: string; heat_id: string | null; bib: number | null; checkpoint_id: string | null; ts?: string }) => {
      const { error } = await supabase.from('race_splits' as any).insert({
        event_id: eventId, heat_id: v.heat_id, registration_id: v.registration_id,
        bib_number: String(v.bib ?? ''), checkpoint_id: v.checkpoint_id,
        split_timestamp: v.ts ?? new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeSplit = useMutation({
    mutationFn: async (splitId: string) => {
      const { error } = await supabase.from('race_splits' as any).delete().eq('id', splitId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setResult = useMutation({
    mutationFn: async (v: { registration_id: string; heat_id: string | null; bib: number | null; status: string; final_ms: number | null; dq_reason?: string | null }) => {
      const payload: any = {
        event_id: eventId, registration_id: v.registration_id, heat_id: v.heat_id,
        bib_number: String(v.bib ?? ''), status: v.status,
        final_adjusted_time_ms: v.final_ms, raw_time_ms: v.final_ms,
        dq_reason: v.dq_reason ?? null,
      };
      const { data: existing } = await supabase.from('race_results' as any).select('id').eq('event_id', eventId).eq('registration_id', v.registration_id).limit(1).maybeSingle();
      if (existing) { const { error } = await supabase.from('race_results' as any).update(payload).eq('id', (existing as any).id); if (error) throw error; }
      else { const { error } = await supabase.from('race_results' as any).insert(payload); if (error) throw error; }
    },
    onSuccess: invalidate,
  });

  return { addSplit, removeSplit, setResult };
}
