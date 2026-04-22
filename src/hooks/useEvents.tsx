import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============ TYPES ============
export type EventType = 'experience' | 'oficial';

export interface EventRow {
  id: string;
  title: string;
  date: string;
  end_date: string | null;
  location: string;
  description: string | null;
  image_url: string | null;
  status: string | null;
  race_status: string | null;
  event_type: EventType;
  whatsapp_group_link: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventWithStats extends EventRow {
  _registrations_count: number;
  _categories_count: number;
  _revenue: number;
}

export type EventStatus = 'planning' | 'open' | 'closed' | 'completed';

export const EVENT_STATUS_MAP: Record<EventStatus, { label: string; color: string }> = {
  planning: { label: 'Planejamento', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  open: { label: 'Inscrições Abertas', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  closed: { label: 'Inscrições Fechadas', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  completed: { label: 'Realizado', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
};

// ============ LIST EVENTS WITH STATS ============
export function useEvents() {
  return useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      // Fetch all events
      const { data: events, error } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;
      if (!events?.length) return [] as EventWithStats[];

      const eventIds = events.map(e => e.id);

      // Fetch registration counts per event
      const { data: regCounts } = await supabase
        .from("registrations")
        .select("event_id, total_paid")
        .in("event_id", eventIds);

      // Fetch category counts per event
      const { data: catCounts } = await supabase
        .from("categories")
        .select("event_id")
        .in("event_id", eventIds);

      // Build stats maps
      const regMap: Record<string, { count: number; revenue: number }> = {};
      (regCounts || []).forEach(r => {
        if (!regMap[r.event_id]) regMap[r.event_id] = { count: 0, revenue: 0 };
        regMap[r.event_id].count++;
        regMap[r.event_id].revenue += r.total_paid || 0;
      });

      const catMap: Record<string, number> = {};
      (catCounts || []).forEach(c => {
        catMap[c.event_id] = (catMap[c.event_id] || 0) + 1;
      });

      return events.map(ev => ({
        ...ev,
        _registrations_count: regMap[ev.id]?.count || 0,
        _categories_count: catMap[ev.id] || 0,
        _revenue: regMap[ev.id]?.revenue || 0,
      })) as unknown as EventWithStats[];
    },
  });
}

// ============ SINGLE EVENT ============
export function useEvent(eventId?: string) {
  return useQuery({
    queryKey: ["admin-event", eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) throw error;
      return data as unknown as EventRow;
    },
    enabled: !!eventId,
  });
}

// ============ CREATE EVENT ============
export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (event: {
      title: string;
      date: string;
      end_date?: string;
      location: string;
      description?: string;
      image_url?: string;
      status?: string;
      event_type?: EventType;
    }) => {
      const { data, error } = await (supabase as any)
        .from("events")
        .insert({
          ...event,
          status: event.status || 'planning',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success("Evento criado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao criar evento: " + error.message);
    },
  });
}

// ============ UPDATE EVENT ============
export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase
        .from("events")
        .update(updates as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-event"] });
      toast.success("Evento atualizado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar evento: " + error.message);
    },
  });
}

// ============ DELETE EVENT ============
export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success("Evento excluído com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir evento: " + error.message);
    },
  });
}

// ============ PUBLIC: UPCOMING EVENTS (for homepage) ============
export function usePublicEvents() {
  return useQuery({
    queryKey: ["public-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .neq("status", "completed")
        .order("date", { ascending: true });

      if (error) throw error;
      
      // Also fetch active price batches for each event
      if (data?.length) {
        const eventIds = data.map(e => e.id);
        const { data: batches } = await supabase
          .from("price_batches")
          .select("event_id, name, price, start_date, end_date, active")
          .in("event_id", eventIds)
          .eq("active", true)
          .order("order_index");
        
        // Find active batch for each event
        const now = new Date();
        const batchMap: Record<string, any> = {};
        (batches || []).forEach(b => {
          if (batchMap[b.event_id]) return; // first active wins
          const start = b.start_date ? new Date(b.start_date) : null;
          const end = b.end_date ? new Date(b.end_date) : null;
          if (start && now < start) return;
          if (end && now > end) return;
          batchMap[b.event_id] = b;
        });

        return data.map(ev => ({
          ...ev,
          _active_batch: batchMap[ev.id] || null,
        }));
      }
      
      return data || [];
    },
    staleTime: 5 * 60_000, // 5 min cache for public
  });
}

// ============ UPDATE EVENT STATUS ============
export function useUpdateEventStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EventStatus }) => {
      const { error } = await supabase
        .from("events")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      queryClient.invalidateQueries({ queryKey: ["admin-event"] });
      toast.success("Status atualizado!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar status: " + error.message);
    },
  });
}
