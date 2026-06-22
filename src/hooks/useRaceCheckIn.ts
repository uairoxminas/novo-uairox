import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CheckInAthlete {
  registration_id: string;
  bib: number | null;
  name: string | null;
  verified: boolean;
}

export interface CheckInResult {
  athletes: CheckInAthlete[];
  total: number;
  verified: number;
}

/**
 * Conferência de pulseiras pré-largada.
 * Um atleta é considerado "verificado" quando há uma leitura RFID recente
 * (rfid_reads) resolvida para a inscrição dele neste evento — ou seja, a
 * pulseira foi lida e mapeada ao bib correto antes da prova.
 */
export function useRaceCheckIn(eventId: string) {
  return useQuery<CheckInResult>({
    queryKey: ['race-checkin', eventId],
    queryFn: async () => {
      const empty = { athletes: [], total: 0, verified: 0 };

      // 1. Baterias do evento
      const { data: heats } = await supabase
        .from('heats' as any).select('id').eq('event_id', eventId);
      const heatIds = (heats ?? []).map((h: any) => h.id);
      if (!heatIds.length) return empty;

      // 2. Atletas alocados nas baterias
      const { data: lanes } = await supabase
        .from('heat_lane_assignments' as any).select('registration_id').in('heat_id', heatIds);
      const regIds = [...new Set((lanes ?? []).map((l: any) => l.registration_id).filter(Boolean))];
      if (!regIds.length) return empty;

      // 3. Dados dos atletas
      const { data: regs } = await supabase
        .from('registrations' as any).select('id, bib_number, athlete_name').in('id', regIds);

      // 4. Leituras recentes (últimas 6h) já resolvidas para uma inscrição
      const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
      const { data: reads } = await supabase
        .from('rfid_reads' as any)
        .select('registration_id')
        .eq('event_id', eventId)
        .gte('read_at', since)
        .not('registration_id', 'is', null);
      const seen = new Set((reads ?? []).map((r: any) => r.registration_id));

      const athletes: CheckInAthlete[] = (regs ?? []).map((r: any) => ({
        registration_id: r.id,
        bib: r.bib_number ?? null,
        name: r.athlete_name ?? null,
        verified: seen.has(r.id),
      })).sort((a, b) => (a.bib ?? 0) - (b.bib ?? 0));

      return { athletes, total: athletes.length, verified: athletes.filter(a => a.verified).length };
    },
    refetchInterval: 5000,
    enabled: !!eventId,
  });
}
