import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ============ CATEGORIES ============
export function useCategories(eventId?: string) {
  return useQuery({
    queryKey: ["event-categories", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("event_id", eventId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: { event_id: string; name: string; team_size?: number; gender_requirement?: string; age_type?: string; min_age?: number | null; max_age?: number | null; price?: number }) => {
      const { data, error } = await supabase.from("categories").insert(cat).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event-categories", vars.event_id] });
      toast.success("Categoria criada!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, event_id, ...updates }: { id: string; event_id: string; [key: string]: any }) => {
      const { error } = await supabase.from("categories").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event-categories", vars.event_id] });
      toast.success("Categoria atualizada!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, event_id }: { id: string; event_id: string }) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event-categories", vars.event_id] });
      toast.success("Categoria excluída!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ============ EVENT STAGES (PROVAS) ============
export function useEventStages(eventId?: string) {
  return useQuery({
    queryKey: ["event-stages", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_stages")
        .select("*")
        .eq("event_id", eventId!)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
}

export function useCreateEventStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (stage: { event_id: string; name: string; description?: string; weight_load?: string; metric_text?: string; order_index?: number; distance_meters?: number; lap_count?: number; image_url?: string }) => {
      const { data, error } = await supabase.from("event_stages").insert(stage as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event-stages", vars.event_id] });
      toast.success("Prova criada!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateEventStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, event_id, ...updates }: { id: string; event_id: string; [key: string]: any }) => {
      const { error } = await supabase.from("event_stages").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event-stages", vars.event_id] });
      toast.success("Prova atualizada!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteEventStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, event_id }: { id: string; event_id: string }) => {
      const { error } = await supabase.from("event_stages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event-stages", vars.event_id] });
      toast.success("Prova excluída!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ============ PRICE BATCHES (LOTES) ============
export function usePriceBatches(eventId?: string) {
  return useQuery({
    queryKey: ["price-batches", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_batches")
        .select("*")
        .eq("event_id", eventId!)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
}

export function useCreatePriceBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (batch: { event_id: string; name: string; price: number; start_date?: string; end_date?: string; max_registrations?: number; pix_key?: string; payment_link?: string; order_index?: number; category_id?: string }) => {
      const { data, error } = await supabase.from("price_batches").insert(batch).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["price-batches", vars.event_id] });
      toast.success("Lote criado!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useUpdatePriceBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, event_id, ...updates }: { id: string; event_id: string; [key: string]: any }) => {
      const { error } = await supabase.from("price_batches").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["price-batches", vars.event_id] });
      toast.success("Lote atualizado!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useDeletePriceBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, event_id }: { id: string; event_id: string }) => {
      const { error } = await supabase.from("price_batches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["price-batches", vars.event_id] });
      toast.success("Lote excluído!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ============ DISCOUNT COUPONS ============
export function useDiscountCoupons(eventId?: string) {
  return useQuery({
    queryKey: ["discount-coupons", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_coupons")
        .select("*")
        .eq("event_id", eventId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
}

export function useCreateDiscountCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (coupon: { event_id: string; code: string; discount_type: string; discount_value: number; max_uses?: number; payment_link?: string; category_id?: string }) => {
      const { data, error } = await supabase.from("discount_coupons").insert(coupon as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["discount-coupons", vars.event_id] });
      toast.success("Cupom criado!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateDiscountCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, event_id, ...updates }: { id: string; event_id: string; [key: string]: any }) => {
      const { error } = await supabase.from("discount_coupons").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["discount-coupons", vars.event_id] });
      toast.success("Cupom atualizado!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteDiscountCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, event_id }: { id: string; event_id: string }) => {
      const { error } = await supabase.from("discount_coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["discount-coupons", vars.event_id] });
      toast.success("Cupom excluído!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ============ ATHLETE KITS ============
export function useAthleteKits(eventId?: string) {
  return useQuery({
    queryKey: ["athlete-kits", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_kits")
        .select("*")
        .eq("event_id", eventId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
}

export function useCreateAthleteKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (kit: { event_id: string; name: string; description?: string; price: number; items?: any; image_url?: string; is_optional?: boolean }) => {
      const { data, error } = await supabase.from("athlete_kits").insert(kit as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["athlete-kits", vars.event_id] });
      toast.success("Kit criado!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateAthleteKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, event_id, ...updates }: { id: string; event_id: string; [key: string]: any }) => {
      const { error } = await supabase.from("athlete_kits").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["athlete-kits", vars.event_id] });
      toast.success("Kit atualizado!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteAthleteKit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, event_id }: { id: string; event_id: string }) => {
      const { error } = await supabase.from("athlete_kits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["athlete-kits", vars.event_id] });
      toast.success("Kit excluído!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ============ REGISTRATIONS ============
export function useEventRegistrations(eventId?: string) {
  return useQuery({
    queryKey: ["event-registrations", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select(`
          *,
          categories(name, team_size),
          heats(title, start_time)
        `)
        .eq("event_id", eventId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
}

export function useEventStats(eventId?: string) {
  return useQuery({
    queryKey: ["event-stats", eventId],
    queryFn: async () => {
      const { data: regs } = await supabase
        .from("registrations")
        .select("id, status, total_paid, category_id, categories(name)")
        .eq("event_id", eventId!);

      const total = regs?.length || 0;
      const confirmed = regs?.filter(r => r.status === 'confirmed').length || 0;
      const pending = regs?.filter(r => r.status === 'pending').length || 0;
      const cancelled = regs?.filter(r => r.status === 'cancelled').length || 0;
      const revenue = regs?.reduce((sum, r) => sum + (r.total_paid || 0), 0) || 0;

      // Group by category
      const catMap: Record<string, { name: string; count: number; revenue: number }> = {};
      (regs || []).forEach(r => {
        const catId = r.category_id;
        const catName = (r.categories as any)?.name || 'Sem Categoria';
        if (!catMap[catId]) catMap[catId] = { name: catName, count: 0, revenue: 0 };
        catMap[catId].count++;
        catMap[catId].revenue += r.total_paid || 0;
      });

      return {
        total,
        confirmed,
        pending,
        cancelled,
        revenue,
        byCategory: Object.entries(catMap).map(([id, data]) => ({ id, ...data })),
      };
    },
    enabled: !!eventId,
  });
}

// ============ HEATS (BATERIAS) ============
export function useHeats(eventId?: string) {
  return useQuery({
    queryKey: ["event-heats", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("heats")
        .select(`
          *,
          categories(name, team_size)
        `)
        .eq("event_id", eventId!)
        .order("start_time");
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
}

export function useCreateHeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (heat: { event_id: string; category_id: string; title: string; start_time: string; lane_count?: number }) => {
      const { data, error } = await supabase.from("heats").insert({ ...heat, status: 'pending' }).select(`*, categories(name)`).single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event-heats", vars.event_id] });
      toast.success("Bateria criada!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useUpdateHeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, event_id, ...updates }: { id: string; event_id: string; [key: string]: any }) => {
      const { error } = await supabase.from("heats").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event-heats", vars.event_id] });
      toast.success("Bateria atualizada!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteHeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, event_id }: { id: string; event_id: string }) => {
      // Delete lane assignments first
      await supabase.from("heat_lane_assignments").delete().eq("heat_id", id);
      const { error } = await supabase.from("heats").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event-heats", vars.event_id] });
      qc.invalidateQueries({ queryKey: ["lane-assignments"] });
      toast.success("Bateria excluída!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ============ LANE ASSIGNMENTS ============
export function useLaneAssignments(heatId?: string) {
  return useQuery({
    queryKey: ["lane-assignments", heatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("heat_lane_assignments")
        .select(`
          *,
          registrations(id, bib_number, user_id, status, athlete_name, team_name)
        `)
        .eq("heat_id", heatId!)
        .order("lane_number");
      if (error) throw error;
      return data;
    },
    enabled: !!heatId,
  });
}

export function useCreateLaneAssignments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ heat_id, lane_count }: { heat_id: string; lane_count: number }) => {
      const lanes = Array.from({ length: lane_count }, (_, i) => ({
        heat_id,
        lane_number: i + 1,
        registration_id: null,
      }));
      const { error } = await supabase.from("heat_lane_assignments").insert(lanes);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["lane-assignments", vars.heat_id] });
      toast.success("Raias criadas!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useAssignLane() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, registration_id, heat_id }: { id: string; registration_id: string | null; heat_id: string }) => {
      const { error } = await supabase
        .from("heat_lane_assignments")
        .update({ registration_id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["lane-assignments", vars.heat_id] });
    },
  });
}

// ============ AUTO-GENERATE HEATS ============
export function useAutoGenerateHeats() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ event_id, ordered_category_ids, allow_mixing, lane_count, start_time, interval_minutes }: {
      event_id: string;
      ordered_category_ids: string[];
      allow_mixing: boolean;
      lane_count: number;
      start_time: string;
      interval_minutes: number;
    }) => {
      // Puxar inscritos dessas categorias listadas e alocá-los em formato tabular com cruzamento
      const { data: rawRegs, error: regError } = await supabase
        .from("registrations")
        .select("id, bib_number, category_id, categories(name)")
        .eq("event_id", event_id)
        .in("category_id", ordered_category_ids)
        .in("status", ["confirmed", "pending"]);

      if (regError) throw regError;

      // Classificar 1º pela Ordem solicitada das categorias e 2º pela Numeração (BIB) Crescente
      const getCatIndex = (catId: string) => ordered_category_ids.indexOf(catId);
      
      const regs = [...(rawRegs || [])].sort((a: any, b: any) => {
         const idxA = getCatIndex(a.category_id);
         const idxB = getCatIndex(b.category_id);
         if (idxA !== idxB) return idxA - idxB;
         
         const bibA = parseInt(a.bib_number) || 999999;
         const bibB = parseInt(b.bib_number) || 999999;
         return bibA - bibB;
      });

      const totalRegs = regs.length;
      let currentDateTime = new Date(start_time);
      let heatIndexGlobal = 1;
      let heatsCreatedCount = 0;

      if (allow_mixing && regs.length > 0) {
         // Lógica "Otimo Global" - Corta por quantidade de raias independentemente da categoria
         for (let i = 0; i < regs.length; i += lane_count) {
             const chunk = regs.slice(i, i + lane_count);
             const uniqueCatNamesArr = Array.from(new Set(chunk.map((r:any) => r.categories?.name)));
             const uniqueCatNames = uniqueCatNamesArr.join(' / ');
             
             const title = uniqueCatNames.length > 50 ? `Bateria Mista ${heatIndexGlobal}` : `${uniqueCatNames} - Bat. ${heatIndexGlobal}`;
             const mainCatId = chunk[0].category_id; // Sempre pega a categoria mãe como host para satisfazer NOT NULL

             const { data, error } = await supabase.from("heats").insert({
                event_id, 
                category_id: mainCatId, 
                title, 
                start_time: currentDateTime.toTimeString().slice(0, 5), 
                lane_count, 
                status: 'pending'
             }).select().single();
             if (error) throw error;
             heatsCreatedCount++;
             
             // Criar raias e ligar aos atletas
             const lanes = Array.from({ length: lane_count }, (_, j) => ({ heat_id: data.id, lane_number: j + 1 }));
             await supabase.from("heat_lane_assignments").insert(lanes);
             
             for (let j = 0; j < chunk.length; j++) {
                await supabase.from("heat_lane_assignments").update({ registration_id: chunk[j].id }).eq("heat_id", data.id).eq("lane_number", j + 1);
                await supabase.from("registrations").update({ heat_id: data.id }).eq("id", chunk[j].id);
             }
             
             currentDateTime.setMinutes(currentDateTime.getMinutes() + interval_minutes);
             heatIndexGlobal++;
         }
      } else {
         // Lógica Padrão: Blocos rigorosos de Bateria por categoria
         for (const catId of ordered_category_ids) {
             const subset = regs.filter((r: any) => r.category_id === catId);
             if (subset.length === 0) continue;
             
             const catName = subset[0].categories?.name || 'Categoria';
             const numHeats = Math.ceil(subset.length / lane_count);
             
             for (let i = 0; i < numHeats; i++) {
                 const chunk = subset.slice(i * lane_count, (i + 1) * lane_count);
                 const title = `${catName} - Bat. ${i + 1}`;
                 
                 const { data, error } = await supabase.from("heats").insert({
                    event_id, category_id: catId, title, start_time: currentDateTime.toTimeString().slice(0, 5), lane_count, status: 'pending'
                 }).select().single();
                 if (error) throw error;
                 heatsCreatedCount++;
                 
                 const lanes = Array.from({ length: lane_count }, (_, j) => ({ heat_id: data.id, lane_number: j + 1 }));
                 await supabase.from("heat_lane_assignments").insert(lanes);
                 
                 for (let j = 0; j < chunk.length; j++) {
                    await supabase.from("heat_lane_assignments").update({ registration_id: chunk[j].id }).eq("heat_id", data.id).eq("lane_number", j + 1);
                    await supabase.from("registrations").update({ heat_id: data.id }).eq("id", chunk[j].id);
                 }
                 
                 currentDateTime.setMinutes(currentDateTime.getMinutes() + interval_minutes);
             }
         }
      }

      return { created: heatsCreatedCount, assigned: totalRegs };
    },
    onSuccess: (result, vars) => {
      qc.invalidateQueries({ queryKey: ["event-heats", vars.event_id] });
      qc.invalidateQueries({ queryKey: ["event-registrations", vars.event_id] });
      qc.invalidateQueries({ queryKey: ["lane-assignments"] });
      toast.success(`${result.created} bateria(s) criada(s), ${result.assigned} atleta(s) distribuído(s)!`);
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ============ CATEGORY REGISTRATION COUNT ============
export function useCategoryRegCounts(eventId?: string) {
  return useQuery({
    queryKey: ["category-reg-counts", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registrations")
        .select("category_id")
        .eq("event_id", eventId!)
        .in("status", ["confirmed", "pending"]);

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach(r => {
        counts[r.category_id] = (counts[r.category_id] || 0) + 1;
      });
    },
    enabled: !!eventId,
  });
}

// ============ EXPENSE CATEGORIES (BUDGETS) ============
export function useEventExpenseCategories(eventId?: string) {
  return useQuery({
    queryKey: ["event-expense-categories", eventId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("event_expense_categories")
        .select("*")
        .eq("event_id", eventId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
}

export function useCreateExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cat: { event_id: string; name: string; planned_amount: number }) => {
      const { data, error } = await (supabase as any).from("event_expense_categories").insert(cat).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event-expense-categories", vars.event_id] });
      toast.success("Categoria de despesa criada!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

export function useDeleteExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, event_id }: { id: string; event_id: string }) => {
      const { error } = await (supabase as any).from("event_expense_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event-expense-categories", vars.event_id] });
      toast.success("Categoria excluída!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}

// ============ EXPENSES ============
export function useEventExpenses(eventId?: string) {
  return useQuery({
    queryKey: ["event-expenses", eventId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("event_expenses")
        .select("*, event_expense_categories(name)")
        .eq("event_id", eventId!)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });
}

export function useCreateEventExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (expense: { event_id: string; category_id?: string | null; description: string; amount: number; expense_date: string; status: string; receipt_url?: string | null; paid_by?: string | null }) => {
      const { data, error } = await (supabase as any).from("event_expenses").insert(expense).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event-expenses", vars.event_id] });
      toast.success("Despesa lançada!");
    },
    onError: (e) => toast.error("Erro ao lançar despesa: " + e.message),
  });
}

export function useUpdateEventExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, event_id, ...updates }: { id: string; event_id: string; [key: string]: any }) => {
      const { error } = await (supabase as any).from("event_expenses").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event-expenses", vars.event_id] });
      toast.success("Despesa atualizada!");
    },
    onError: (e) => toast.error("Erro ao atualizar despesa: " + e.message),
  });
}

export function useDeleteEventExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, event_id }: { id: string; event_id: string }) => {
      const { error } = await (supabase as any).from("event_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["event-expenses", vars.event_id] });
      toast.success("Despesa excluída!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });
}
