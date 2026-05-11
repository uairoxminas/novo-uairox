import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useMarketingContacts() {
  return useQuery({
    queryKey: ['marketing-contacts'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('marketing_contacts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useUpsertMarketingContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contact: { name?: string; phone: string; email?: string; source?: string }) => {
      const { error } = await (supabase as any)
        .from('marketing_contacts')
        .upsert({ ...contact, opt_out: false }, { onConflict: 'phone', ignoreDuplicates: false });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-contacts'] }),
  });
}

export function useImportMarketingContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contacts: { name?: string; phone: string; email?: string }[]) => {
      const rows = contacts.map(c => ({ ...c, source: 'csv', opt_out: false }));
      const { error } = await (supabase as any)
        .from('marketing_contacts')
        .upsert(rows, { onConflict: 'phone', ignoreDuplicates: false });
      if (error) throw error;
      return rows.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-contacts'] }),
  });
}

export function useToggleOptOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, opt_out }: { id: string; opt_out: boolean }) => {
      const { error } = await (supabase as any)
        .from('marketing_contacts')
        .update({ opt_out })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-contacts'] }),
  });
}

export function useDeleteMarketingContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('marketing_contacts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-contacts'] }),
  });
}

export function useMarketingConfig() {
  return useQuery({
    queryKey: ['marketing-config'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('marketing_config')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data as { id?: string; webhook_url?: string } | null;
    },
  });
}

export function useSaveMarketingConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (webhook_url: string) => {
      const { data: existing } = await (supabase as any)
        .from('marketing_config')
        .select('id')
        .maybeSingle();
      if (existing?.id) {
        const { error } = await (supabase as any)
          .from('marketing_config')
          .update({ webhook_url, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('marketing_config')
          .insert({ webhook_url });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-config'] }),
  });
}
