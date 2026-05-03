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
  max_capacity: number | null;
  created_at: string;
  updated_at: string;
}

export interface EventWithStats extends EventRow {
  _registrations_count: number;
  _waitlist_count: number;
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

      // Fetch registration counts per event (with status for waitlist separation)
      const { data: regCounts } = await supabase
        .from("registrations")
        .select("event_id, total_paid, status")
        .in("event_id", eventIds);

      // Fetch category counts per event
      const { data: catCounts } = await supabase
        .from("categories")
        .select("event_id")
        .in("event_id", eventIds);

      // Build stats maps
      const regMap: Record<string, { count: number; waitlist: number; revenue: number }> = {};
      (regCounts || []).forEach(r => {
        if (!regMap[r.event_id]) regMap[r.event_id] = { count: 0, waitlist: 0, revenue: 0 };
        if ((r as any).status === 'waitlist') {
          regMap[r.event_id].waitlist++;
        } else {
          regMap[r.event_id].count++;
          regMap[r.event_id].revenue += r.total_paid || 0;
        }
      });

      const catMap: Record<string, number> = {};
      (catCounts || []).forEach(c => {
        catMap[c.event_id] = (catMap[c.event_id] || 0) + 1;
      });

      return events.map(ev => ({
        ...ev,
        _registrations_count: regMap[ev.id]?.count || 0,
        _waitlist_count: regMap[ev.id]?.waitlist || 0,
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

// ============ DUPLICATE EVENT ============
export function useDuplicateEvent() {
  const queryClient = useQueryClient();
  const createEvent = useCreateEvent();

  return useMutation({
    mutationFn: async (event: EventRow) => {
      // 1. Create new event
      const newEvent = await createEvent.mutateAsync({
        title: `${event.title} (Cópia)`,
        date: event.date,
        end_date: event.end_date || undefined,
        location: event.location,
        description: event.description || undefined,
        image_url: event.image_url || undefined,
        status: 'planning', // Always start as planning
        event_type: event.event_type,
        // @ts-ignore
        whatsapp_group_link: event.whatsapp_group_link,
        // @ts-ignore
        require_shirt_size: (event as any).require_shirt_size,
      });

      if (!newEvent?.id) throw new Error("Falha ao criar o evento base.");

      // 2. Duplicate Categories
      const { data: categories } = await supabase.from('categories').select('*').eq('event_id', event.id);
      if (categories && categories.length > 0) {
        const newCategories = categories.map(c => {
          const { id, created_at, ...rest } = c;
          return { ...rest, event_id: newEvent.id };
        });
        await supabase.from('categories').insert(newCategories);
      }

      // 3. Duplicate Price Batches
      const { data: batches } = await supabase.from('price_batches').select('*').eq('event_id', event.id);
      if (batches && batches.length > 0) {
        const newBatches = batches.map(b => {
          const { id, created_at, ...rest } = b;
          return { ...rest, event_id: newEvent.id, active: false }; // Disable active on copies just to be safe
        });
        await supabase.from('price_batches').insert(newBatches);
      }

      return newEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
      toast.success("Evento duplicado com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao duplicar evento: " + error.message);
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
      
      // Also fetch active and future price batches for each event
      if (data?.length) {
        const eventIds = data.map(e => e.id);
        const { data: batches } = await supabase
          .from("price_batches")
          .select("event_id, name, price, start_date, end_date, active")
          .in("event_id", eventIds)
          .order("order_index");
        
        const now = new Date();
        const batchMap: Record<string, any> = {};
        const nextBatchMap: Record<string, any> = {};

        (batches || []).forEach(b => {
          const start = b.start_date ? new Date(b.start_date) : null;
          const end = b.end_date ? new Date(b.end_date) : null;

          // Catch the first future batch
          if (start && now < start) {
            if (!nextBatchMap[b.event_id]) {
              nextBatchMap[b.event_id] = b;
            }
          }

          // Active batch logic
          if (!b.active) return;
          if (batchMap[b.event_id]) return; // first active wins
          if (start && now < start) return;
          if (end && now > end) return;
          batchMap[b.event_id] = b;
        });

        return data.map(ev => ({
          ...ev,
          _active_batch: batchMap[ev.id] || null,
          _next_batch: nextBatchMap[ev.id] || null,
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
