import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RFIDTag {
  id: string;
  tag_epc: string;
  number: number;
  notes: string | null;
  created_at: string;
}

export interface RFIDAssignment {
  id: string;
  tag_epc: string;
  registration_id: string;
  event_id: string;
  assigned_at: string;
  released_at: string | null;
  is_active: boolean;
  assigned_by: string | null;
  rfid_tags: { number: number } | null;
  registrations: { athlete_name: string; bib_number: string; team_name: string | null } | null;
}

export interface RFIDAntenna {
  id: string;
  event_id: string;
  reader_id: string;
  antenna_index: number;
  checkpoint_id: string | null;
  entry_type: string;
  label: string | null;
  is_active: boolean;
  debounce_ms: number;
}

export interface RegistrationResult {
  id: string;
  athlete_name: string;
  bib_number: string;
  team_name: string | null;
}

// ── Queries ─────────────────────────────────────────────────────────────────

export function useRFIDTags() {
  return useQuery({
    queryKey: ['rfid-tags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfid_tags' as any)
        .select('*')
        .order('number', { ascending: true });
      if (error) throw error;
      return (data ?? []) as RFIDTag[];
    },
  });
}

export function useRFIDAssignments(eventId: string) {
  return useQuery({
    queryKey: ['rfid-assignments', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfid_tag_assignments' as any)
        .select('*, rfid_tags(number), registrations(athlete_name, bib_number, team_name)')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as RFIDAssignment[];
    },
    refetchInterval: 5000,
  });
}

export function useRFIDAntennas(eventId: string) {
  return useQuery({
    queryKey: ['rfid-antennas', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rfid_antennas' as any)
        .select('*')
        .eq('event_id', eventId)
        .order('antenna_index', { ascending: true });
      if (error) throw error;
      return (data ?? []) as RFIDAntenna[];
    },
  });
}

export function useSearchRegistrations(eventId: string, query: string) {
  return useQuery({
    queryKey: ['registrations-search', eventId, query],
    queryFn: async () => {
      const q = query.trim();
      if (q.length < 2) return [];
      // bib_number é inteiro — ilike quebraria a query. Só filtra por bib quando numérico (eq).
      const filters = [`athlete_name.ilike.%${q}%`];
      if (/^\d+$/.test(q)) filters.push(`bib_number.eq.${q}`);
      const { data, error } = await supabase
        .from('registrations' as any)
        .select('id, athlete_name, bib_number, team_name')
        .eq('event_id', eventId)
        .or(filters.join(','))
        .limit(8);
      if (error) throw error;
      return (data ?? []) as RegistrationResult[];
    },
    enabled: query.trim().length >= 2,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useRegisterRFIDTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tag_epc, number }: { tag_epc: string; number: number }) => {
      const { data, error } = await supabase
        .from('rfid_tags' as any)
        .insert({ tag_epc: tag_epc.trim().toUpperCase(), number })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') throw new Error('Pulseira ou EPC já cadastrado.');
        throw error;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rfid-tags'] }),
  });
}

export function useAssignRFIDTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tag_number,
      registration_id,
      event_id,
    }: {
      tag_number: number;
      registration_id: string;
      event_id: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: tag, error: tagErr } = await supabase
        .from('rfid_tags' as any)
        .select('tag_epc')
        .eq('number', tag_number)
        .maybeSingle();
      if (tagErr) throw tagErr;
      if (!tag) throw new Error(`Pulseira #${tag_number} não está cadastrada. Cadastre-a primeiro.`);

      const { data, error } = await supabase
        .from('rfid_tag_assignments' as any)
        .insert({
          tag_epc: (tag as any).tag_epc,
          registration_id,
          event_id,
          assigned_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') throw new Error('Pulseira já está em uso, ou este atleta já tem pulseira ativa.');
        throw error;
      }
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['rfid-assignments', vars.event_id] }),
  });
}

export function useReleaseRFIDTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignment_id, event_id }: { assignment_id: string; event_id: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.rpc('release_rfid_tag' as any, {
        p_assignment_id: assignment_id,
        p_released_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['rfid-assignments', vars.event_id] }),
  });
}

export function useSaveRFIDAntenna() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (antenna: Omit<RFIDAntenna, 'id'>) => {
      const { data, error } = await supabase
        .from('rfid_antennas' as any)
        .upsert(antenna, { onConflict: 'event_id,reader_id,antenna_index' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['rfid-antennas', vars.event_id] }),
  });
}
