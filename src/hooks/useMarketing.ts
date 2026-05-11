import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Contacts ────────────────────────────────────────────────────────────────

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

// ─── Config ───────────────────────────────────────────────────────────────────

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

// ─── Campaigns ────────────────────────────────────────────────────────────────

export function useMarketingCampaigns() {
  return useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    refetchInterval: 15000,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campaign: {
      name: string;
      trigger_name: string;
      base_message: string;
      variants: string[];
      daily_limit: number;
      auto_continue: boolean;
      contact_ids: string[];
    }) => {
      // Create campaign
      const { data: camp, error: campErr } = await (supabase as any)
        .from('marketing_campaigns')
        .insert({
          name: campaign.name,
          trigger_name: campaign.trigger_name,
          base_message: campaign.base_message,
          variants: campaign.variants,
          daily_limit: campaign.daily_limit,
          auto_continue: campaign.auto_continue,
          status: 'draft',
          total_contacts: campaign.contact_ids.length,
        })
        .select()
        .single();
      if (campErr) throw campErr;

      // Load contacts
      const { data: contacts, error: contactErr } = await (supabase as any)
        .from('marketing_contacts')
        .select('id, name, phone, email')
        .in('id', campaign.contact_ids)
        .eq('opt_out', false);
      if (contactErr) throw contactErr;

      // Create queue entries with variant rotation
      const variantCount = campaign.variants.length || 1;
      const queueRows = (contacts as any[]).map((c, i) => ({
        campaign_id: camp.id,
        contact_id: c.id,
        phone: c.phone,
        name: c.name,
        email: c.email,
        variant_index: i % variantCount,
        status: 'pending',
        send_after: new Date().toISOString(),
      }));

      const { error: queueErr } = await (supabase as any)
        .from('marketing_queue')
        .insert(queueRows);
      if (queueErr) throw queueErr;

      return camp;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-campaigns'] }),
  });
}

export function useUpdateCampaignStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'paused' | 'draft' }) => {
      const { error } = await (supabase as any)
        .from('marketing_campaigns')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-campaigns'] }),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('marketing_campaigns')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-campaigns'] }),
  });
}

export function useCampaignQueue(campaignId: string | null) {
  return useQuery({
    queryKey: ['marketing-queue', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const { data, error } = await (supabase as any)
        .from('marketing_queue')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!campaignId,
    refetchInterval: 10000,
  });
}
