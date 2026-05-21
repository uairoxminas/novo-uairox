import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── API helpers (use serverless API with service_role for marketing tables) ──

const API_BASE = '/api';

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || 'API error');
  }
  return res.json();
}

// ─── Contacts ────────────────────────────────────────────────────────────────

export function useMarketingContacts() {
  return useQuery({
    queryKey: ['marketing-contacts'],
    queryFn: async () => {
      return await apiFetch('/marketing-contacts') as any[];
    },
  });
}

export function useUpsertMarketingContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contact: { name?: string; phone: string; email?: string; source?: string }) => {
      await apiFetch('/marketing-contacts?action=import', {
        method: 'POST',
        body: JSON.stringify({ contacts: [{ ...contact }] }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-contacts'] }),
  });
}

export function useImportMarketingContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contacts: { name?: string; phone: string; email?: string }[]) => {
      const result = await apiFetch('/marketing-contacts?action=import', {
        method: 'POST',
        body: JSON.stringify({ contacts }),
      });
      return result.count;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-contacts'] }),
  });
}

export function useToggleOptOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, opt_out }: { id: string; opt_out: boolean }) => {
      await apiFetch('/marketing-contacts?action=toggle-optout', {
        method: 'PUT',
        body: JSON.stringify({ id, opt_out }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-contacts'] }),
  });
}

export function useDeleteMarketingContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/marketing-contacts?action=delete&id=${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-contacts'] }),
  });
}

// ─── Config ───────────────────────────────────────────────────────────────────

export function useMarketingConfig() {
  return useQuery({
    queryKey: ['marketing-config'],
    queryFn: async () => {
      return await apiFetch('/marketing-contacts?action=config') as { id?: string; webhook_url?: string } | null;
    },
  });
}

export function useSaveMarketingConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cfg: { webhook_url?: string; email_from?: string; resend_api_key?: string }) => {
      await apiFetch('/marketing-contacts?action=save-config', {
        method: 'POST',
        body: JSON.stringify(cfg),
      });
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
      email_enabled: boolean;
      email_subject?: string;
      email_template?: { image_url?: string; title?: string; body?: string; cta_text?: string; cta_url?: string };
      step2_enabled: boolean;
      step2_message?: string;
      step2_event_ids?: string[];
      response_timeout_days: number;
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
          email_enabled: campaign.email_enabled,
          email_subject: campaign.email_subject || null,
          email_template: campaign.email_template || null,
          step2_enabled: campaign.step2_enabled,
          step2_message: campaign.step2_message || null,
          step2_event_ids: campaign.step2_event_ids || null,
          response_timeout_days: campaign.response_timeout_days,
          status: 'draft',
          total_contacts: campaign.contact_ids.length,
        })
        .select()
        .single();
      if (campErr) throw campErr;

      // Load contacts via API (service_role)
      const allContacts = await apiFetch('/marketing-contacts') as any[];
      const contacts = allContacts.filter((c: any) =>
        campaign.contact_ids.includes(c.id) && !c.opt_out
      );

      // Create queue entries with variant rotation + unique tracking code per contact
      const variantCount = campaign.variants.length || 1;
      const trackingEventId = campaign.step2_event_ids?.[0] || null;
      const queueRows = contacts.map((c: any, i: number) => ({
        campaign_id: camp.id,
        contact_id: c.id,
        phone: c.phone,
        name: c.name,
        email: c.email,
        variant_index: i % variantCount,
        status: 'pending',
        send_after: new Date().toISOString(),
        tracking_code: Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6),
        tracking_event_id: trackingEventId,
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

// ─── Campaign Metrics ─────────────────────────────────────────────────────────

export function useCampaignMetrics(campaignId: string | null) {
  return useQuery({
    queryKey: ['marketing-metrics', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;

      const [queueRes, clicksRes] = await Promise.all([
        (supabase as any)
          .from('marketing_queue')
          .select('id, step, status, responded_at, step2_sent_at')
          .eq('campaign_id', campaignId),
        (supabase as any)
          .from('marketing_clicks')
          .select('id, converted')
          .eq('campaign_id', campaignId),
      ]);

      const queue: any[] = queueRes.data || [];
      const clicks: any[] = clicksRes.data || [];

      return {
        sent: queue.filter(q => q.status === 'sent' || q.status === 'skipped').length,
        responded: queue.filter(q => q.responded_at).length,
        clicks: clicks.length,
        conversions: clicks.filter(c => c.converted).length,
      };
    },
    enabled: !!campaignId,
    refetchInterval: 30000,
  });
}

// ─── Sync Registrations → Marketing ──────────────────────────────────────────

export function useSyncRegistrationsToMarketing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Use the serverless API endpoint which uses service_role
      const result = await apiFetch('/marketing-sync', { method: 'POST' });
      return result.synced as number;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-contacts'] }),
  });
}
