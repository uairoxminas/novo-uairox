import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
      return await apiFetch('/marketing-campaigns?action=list') as any[];
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
      daily_limit: number;
      auto_continue: boolean;
      contact_ids: string[];
      email_enabled: boolean;
      email_subject?: string;
      email_template?: { image_url?: string; title?: string; body?: string; cta_text?: string; cta_url?: string };
    }) => {
      const result = await apiFetch('/marketing-campaigns?action=create', {
        method: 'POST',
        body: JSON.stringify(campaign),
      });
      return result.campaign;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-campaigns'] }),
  });
}

export function useUpdateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fields: {
      id: string;
      name?: string;
      trigger_name?: string;
      base_message?: string;
      variants?: string[];
      daily_limit?: number;
      auto_continue?: boolean;
      email_enabled?: boolean;
      email_subject?: string;
      email_template?: any;
      step2_enabled?: boolean;
      step2_message?: string;
      step2_event_ids?: string[];
      response_timeout_days?: number;
    }) => {
      await apiFetch('/marketing-campaigns?action=edit', {
        method: 'POST',
        body: JSON.stringify(fields),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-campaigns'] }),
  });
}

export function useUpdateCampaignStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'paused' | 'draft' }) => {
      await apiFetch('/marketing-campaigns?action=update-status', {
        method: 'POST',
        body: JSON.stringify({ id, status }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-campaigns'] }),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/marketing-campaigns?id=${id}`, { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['marketing-campaigns'] }),
  });
}

export function useCampaignQueue(campaignId: string | null) {
  return useQuery({
    queryKey: ['marketing-queue', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      return await apiFetch(`/marketing-campaigns?action=queue&campaign_id=${campaignId}`) as any[];
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
      return await apiFetch(`/marketing-campaigns?action=metrics&campaign_id=${campaignId}`) as {
        sent: number; responded: number; clicks: number; conversions: number;
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
