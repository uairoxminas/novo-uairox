import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const db = supabase as any;

// ============ CONFIG ============
export function useRaffleConfig(eventId?: string) {
  return useQuery({
    queryKey: ["raffle-config", eventId],
    queryFn: async () => {
      const { data, error } = await db
        .from("raffle_configs")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();
      if (error) throw error;
      return data as RaffleConfig | null;
    },
    enabled: !!eventId,
  });
}

export function useUpsertRaffleConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cfg: Partial<RaffleConfig> & { event_id: string }) => {
      const { data, error } = await db
        .from("raffle_configs")
        .upsert({ ...cfg, updated_at: new Date().toISOString() }, { onConflict: "event_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["raffle-config", vars.event_id] });
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
}

// ============ TICKETS ============
export function useRaffleTickets(eventId?: string) {
  return useQuery({
    queryKey: ["raffle-tickets", eventId],
    queryFn: async () => {
      const { data, error } = await db
        .from("raffle_tickets")
        .select("*")
        .eq("event_id", eventId)
        .order("ticket_number");
      if (error) throw error;
      return (data ?? []) as RaffleTicket[];
    },
    enabled: !!eventId,
  });
}

export function useGenerateTickets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data, error } = await db.rpc("generate_raffle_tickets", { p_event_id: eventId });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (total, eventId) => {
      qc.invalidateQueries({ queryKey: ["raffle-tickets", eventId] });
      toast.success(`${total} ticket(s) gerado(s)!`);
    },
    onError: (e: any) => toast.error("Erro ao gerar tickets: " + e.message),
  });
}

// ============ WINNERS ============
export function useRaffleWinners(eventId?: string) {
  return useQuery({
    queryKey: ["raffle-winners", eventId],
    queryFn: async () => {
      const { data, error } = await db
        .from("raffle_winners")
        .select("*, raffle_tickets(*)")
        .eq("event_id", eventId)
        .order("draw_order");
      if (error) throw error;
      return (data ?? []) as RaffleWinner[];
    },
    enabled: !!eventId,
  });
}

export function useDrawWinner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventId, prizeDescription }: { eventId: string; prizeDescription: string }) => {
      // Fetch tickets not yet drawn
      const { data: tickets, error: tErr } = await db
        .from("raffle_tickets")
        .select("id, ticket_number, participant_name, participant_type")
        .eq("event_id", eventId);
      if (tErr) throw tErr;

      const { data: winners, error: wErr } = await db
        .from("raffle_winners")
        .select("raffle_ticket_id")
        .eq("event_id", eventId);
      if (wErr) throw wErr;

      const drawnIds = new Set((winners ?? []).map((w: any) => w.raffle_ticket_id));
      const available = (tickets ?? []).filter((t: any) => !drawnIds.has(t.id));
      if (available.length === 0) throw new Error("Todos os tickets já foram sorteados.");

      // Pick random using crypto
      const arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      const idx = arr[0] % available.length;
      const winner = available[idx];

      const { data: drawnWinners } = await db
        .from("raffle_winners")
        .select("draw_order")
        .eq("event_id", eventId)
        .order("draw_order", { ascending: false })
        .limit(1);
      const nextOrder = ((drawnWinners?.[0]?.draw_order) ?? 0) + 1;

      const { data, error } = await db
        .from("raffle_winners")
        .insert({
          event_id: eventId,
          raffle_ticket_id: winner.id,
          prize_description: prizeDescription || null,
          draw_order: nextOrder,
        })
        .select("*, raffle_tickets(*)")
        .single();
      if (error) throw error;
      return data as RaffleWinner;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["raffle-winners", vars.eventId] });
      qc.invalidateQueries({ queryKey: ["raffle-tickets", vars.eventId] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteRaffleWinner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, eventId }: { id: string; eventId: string }) => {
      const { error } = await db.from("raffle_winners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["raffle-winners", vars.eventId] });
      toast.success("Sorteio removido.");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });
}

// ============ TYPES ============
export interface RaffleConfig {
  id: string;
  event_id: string;
  prizes: { description: string }[];
  is_live: boolean;
  show_ticket_list: boolean;
  created_at: string;
  updated_at: string;
}

export interface RaffleTicket {
  id: string;
  event_id: string;
  ticket_number: number;
  participant_type: "athlete" | "squad" | "location";
  registration_id: string | null;
  squad_member_id: string | null;
  location_id: string | null;
  participant_name: string | null;
  participant_email: string | null;
  created_at: string;
}

export interface RaffleWinner {
  id: string;
  event_id: string;
  raffle_ticket_id: string;
  prize_description: string | null;
  draw_order: number;
  drawn_at: string;
  raffle_tickets: RaffleTicket;
}
