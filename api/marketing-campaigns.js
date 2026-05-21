import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

function getSupabase() {
  return createClient(
    process.env.VITE_SUPABASE_URL || 'https://dhetcnkvgtuatcchropm.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const supabase = getSupabase();

  try {
    // ── CREATE campaign ───────────────────────────────────────────────────────
    if (req.method === 'POST' && action === 'create') {
      const campaign = await req.json();

      // 1. Insert campaign record
      const { data: camp, error: campErr } = await supabase
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
          total_contacts: campaign.contact_ids?.length || 0,
        })
        .select()
        .single();

      if (campErr) throw campErr;

      // 2. Load contacts (filter by selected IDs, exclude opt-out)
      const { data: allContacts } = await supabase
        .from('marketing_contacts')
        .select('id, phone, name, email, opt_out')
        .in('id', campaign.contact_ids || []);

      const contacts = (allContacts || []).filter(c => !c.opt_out);

      // 3. Build queue rows with tracking codes
      const variantCount = campaign.variants?.length || 1;
      const trackingEventId = campaign.step2_event_ids?.[0] || null;

      const queueRows = contacts.map((c, i) => ({
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

      if (queueRows.length > 0) {
        const { error: queueErr } = await supabase
          .from('marketing_queue')
          .insert(queueRows);
        if (queueErr) throw queueErr;
      }

      return new Response(JSON.stringify({ ok: true, campaign: camp }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── UPDATE status ─────────────────────────────────────────────────────────
    if (req.method === 'POST' && action === 'update-status') {
      const { id, status } = await req.json();
      const { error } = await supabase
        .from('marketing_campaigns')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── DELETE campaign ───────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) throw new Error('id obrigatório');
      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ação não reconhecida' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
