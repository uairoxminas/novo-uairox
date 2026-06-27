import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ======= HOOK EVENT TIMING PARAMS =======
export function useEventTimingConfig(eventId: string) {
  return useQuery({
    queryKey: ["event_timing", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events" as any)
        .select("id, target_passes_volume, debounce_seconds, rfid_rssi_min")
        .eq("id", eventId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
}

export function useUpdateEventTiming() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { eventId: string; target_passes_volume: number; debounce_seconds: number; rfid_rssi_min: number }) => {
      const { error } = await supabase
        .from("events" as any)
        .update({
          target_passes_volume: vars.target_passes_volume,
          debounce_seconds: vars.debounce_seconds,
          rfid_rssi_min: vars.rfid_rssi_min,
        })
        .eq("id", vars.eventId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event_timing", vars.eventId] });
    },
  });
}

// ======= HOOK CHECKPOINTS =======
export function useRaceCheckpoints(eventId: string) {
  return useQuery({
    queryKey: ["race_checkpoints", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("race_checkpoints" as any)
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!eventId,
  });
}

export function useCreateRaceCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { event_id: string; name: string; is_finish_line: boolean }) => {
      // Se estamos criando e marcando como finish line, vamos garantir unicidade de finish line
      if (vars.is_finish_line) {
        await supabase.from("race_checkpoints" as any).update({ is_finish_line: false }).eq("event_id", vars.event_id);
      }
      const { error } = await supabase.from("race_checkpoints" as any).insert(vars);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["race_checkpoints", vars.event_id] });
    },
  });
}

export function useToggleFinishLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { event_id: string; checkpoint_id: string }) => {
      await supabase.from("race_checkpoints" as any).update({ is_finish_line: false }).eq("event_id", vars.event_id);
      const { error } = await supabase.from("race_checkpoints" as any).update({ is_finish_line: true }).eq("id", vars.checkpoint_id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["race_checkpoints", vars.event_id] });
    },
  });
}

export function useDeleteRaceCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; event_id: string }) => {
      const { error } = await supabase.from("race_checkpoints" as any).delete().eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["race_checkpoints", vars.event_id] });
    },
  });
}

// ======= HOOK PONTO DE CRONOMETRAGEM (tapete + antena num passo) =======
export function useCreateTimingPoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      event_id: string; name: string;
      entry_type: 'start' | 'lap' | 'finish';
      reader_id: string; antenna_index: number;
    }) => {
      const is_finish_line = vars.entry_type === 'finish';
      if (is_finish_line) {
        await supabase.from("race_checkpoints" as any).update({ is_finish_line: false }).eq("event_id", vars.event_id);
      }
      // 1. cria o tapete (checkpoint) e pega o id
      const { data: cp, error: cpErr } = await supabase
        .from("race_checkpoints" as any)
        .insert({ event_id: vars.event_id, name: vars.name, is_finish_line })
        .select("id")
        .single();
      if (cpErr) throw cpErr;

      // 2. garante 1 evento ativo por leitor+antena (desativa nos outros)
      await supabase.from("rfid_antennas" as any)
        .update({ is_active: false })
        .eq("reader_id", vars.reader_id)
        .eq("antenna_index", vars.antenna_index)
        .neq("event_id", vars.event_id);

      // 3. mapeia a antena ao tapete
      const { error: antErr } = await supabase.from("rfid_antennas" as any)
        .upsert({
          event_id: vars.event_id, reader_id: vars.reader_id, antenna_index: vars.antenna_index,
          checkpoint_id: (cp as any).id, entry_type: vars.entry_type, label: vars.name, is_active: true,
        }, { onConflict: "event_id,reader_id,antenna_index" });
      if (antErr) throw antErr;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["race_checkpoints", vars.event_id] });
      qc.invalidateQueries({ queryKey: ["rfid-antennas", vars.event_id] });
      qc.invalidateQueries({ queryKey: ["readiness-antennas", vars.event_id] });
    },
  });
}

// ======= HOOK HEATS OPERATIONS =======
export function useStartHeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; event_id: string }) => {
      const { error } = await supabase
        .from("heats" as any)
        .update({ status: 'running', start_time: new Date().toISOString() })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["heats", vars.event_id] });
    },
  });
}

export function useFinishHeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; event_id: string }) => {
      const { error } = await supabase
        .from("heats" as any)
        .update({ status: 'completed' })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["heats", vars.event_id] });
    },
  });
}

// ======= HOOK RADAR (ACOMPANHAMENTO AO VIVO) =======
export function useHeatAthletesWithSplits(heatId: string) {
  return useQuery({
    queryKey: ["live_radar", heatId],
    queryFn: async () => {
      // 1. Get lanes and athletes
      const { data: lanes, error: lanesErr } = await supabase
        .from('heat_lane_assignments')
        .select(`
          id, lane_number, registration_id,
          registrations(id, bib_number, athlete_name, team_name, categories(team_size))
        `)
        .eq('heat_id', heatId)
        .order('lane_number', { ascending: true });
      if (lanesErr) throw lanesErr;

      // 2. Get splits for this heat
      const { data: splits, error: splitsErr } = await supabase
        .from('race_splits' as any)
        .select('*')
        .eq('heat_id', heatId);
      if (splitsErr) throw splitsErr;

      // 3. Get penalties for this heat
      const { data: penalties, error: penErr } = await supabase
        .from('race_penalties' as any)
        .select('*')
        .eq('heat_id', heatId);
      if (penErr) throw penErr;

      // 4. Get results to know who is already validated
      const { data: results, error: resErr } = await supabase
        .from('race_results' as any)
        .select('*')
        .eq('heat_id', heatId);
      if (resErr) throw resErr;

      // Combine
      return (lanes || []).map((lane: any) => {
        const registration_id = lane.registration_id;
        const bib_number = lane.registrations?.bib_number;
        const mySplits = splits?.filter((s: any) => s.registration_id === registration_id) || [];
        const myPens = penalties?.filter((p: any) => p.registration_id === registration_id) || [];
        const myResult = results?.find((r: any) => String(r.bib_number) === String(bib_number));
        
        return {
          ...lane,
          splits: mySplits,
          penalties: myPens,
          result: myResult,
        };
      });
    },
    refetchInterval: 3000, // Real-time polling
    enabled: !!heatId
  });
}

export function useApplyPenalty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { event_id: string; heat_id: string; registration_id: string; bib_number: string; reason?: string }) => {
      const { error } = await supabase.from('race_penalties' as any).insert({
        event_id: vars.event_id,
        heat_id: vars.heat_id,
        registration_id: vars.registration_id,
        bib_number: vars.bib_number,
        penalty_seconds: 30, // Padrão
        added_by: undefined
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["live_radar", vars.heat_id] });
    }
  });
}

export function useSimulateSplit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { event_id: string; heat_id: string; registration_id: string; bib_number: string; checkpoint_id: string }) => {
      // Injeta uma marcação raw para o radar ver!
      const { error } = await supabase.from('race_splits' as any).insert({
        event_id: vars.event_id,
        heat_id: vars.heat_id,
        registration_id: vars.registration_id,
        bib_number: vars.bib_number,
        checkpoint_id: vars.checkpoint_id,
        split_timestamp: new Date().toISOString()
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["live_radar", vars.heat_id] });
    }
  });
}

export function useValidateResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { 
      event_id: string; 
      heat_id: string;
      registration_id: string;
      bib_number: string;
      raw_time_ms: number;
      total_penalties_seconds: number;
      final_adjusted_time_ms: number;
      total_passes_recorded: number;
    }) => {
      const { error } = await supabase.from('race_results' as any).insert({
        event_id: vars.event_id,
        heat_id: vars.heat_id,
        registration_id: vars.registration_id,
        bib_number: vars.bib_number,
        raw_time_ms: vars.raw_time_ms,
        total_penalties_seconds: vars.total_penalties_seconds,
        final_adjusted_time_ms: vars.final_adjusted_time_ms,
        total_passes_recorded: vars.total_passes_recorded,
        status: 'validated'
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["live_radar", vars.heat_id] });
      // Invalida os results pra quem quiser consultar depois
      qc.invalidateQueries({ queryKey: ["race_results", vars.heat_id] });
    }
  });
}

export function useCompleteHeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (heatId: string) => {
      const { error } = await supabase.from('heats' as any).update({ status: 'completed' }).eq('id', heatId);
      if (error) throw error;
    },
    onSuccess: (_, heatId) => {
      qc.invalidateQueries({ queryKey: ["heats"] });
    }
  });
}
