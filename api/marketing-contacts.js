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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'content-type, authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const supabase = getSupabase();

  try {
    // GET: list contacts
    if (req.method === 'GET' && !action) {
      const { data, error } = await supabase
        .from('marketing_contacts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return Response.json(data, { headers: corsHeaders });
    }

    // POST: upsert contacts (import)
    if (req.method === 'POST' && action === 'import') {
      const { contacts } = await req.json();
      // Deduplicate by phone to avoid "ON CONFLICT DO UPDATE cannot affect row a second time"
      const dedupMap = new Map();
      for (const c of contacts) {
        const phone = (c.phone || '').replace(/\D/g, '');
        if (phone.length >= 8) {
          dedupMap.set(phone, { ...c, phone, source: c.source || 'csv', opt_out: false });
        }
      }
      const rows = Array.from(dedupMap.values());
      if (rows.length === 0) {
        return Response.json({ count: 0 }, { headers: corsHeaders });
      }
      // Upsert in batches of 200 to avoid payload limits
      let total = 0;
      for (let i = 0; i < rows.length; i += 200) {
        const batch = rows.slice(i, i + 200);
        const { error } = await supabase
          .from('marketing_contacts')
          .upsert(batch, { onConflict: 'phone', ignoreDuplicates: false });
        if (error) throw error;
        total += batch.length;
      }
      return Response.json({ count: total }, { headers: corsHeaders });
    }

    // PUT: toggle opt-out
    if (req.method === 'PUT' && action === 'toggle-optout') {
      const { id, opt_out } = await req.json();
      const { error } = await supabase
        .from('marketing_contacts')
        .update({ opt_out })
        .eq('id', id);
      if (error) throw error;
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    // DELETE: delete contact
    if (req.method === 'DELETE') {
      const id = url.searchParams.get('id');
      const { error } = await supabase
        .from('marketing_contacts')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    // POST: save config
    if (req.method === 'POST' && action === 'save-config') {
      const cfg = await req.json();
      const { data: existing } = await supabase
        .from('marketing_config')
        .select('id')
        .maybeSingle();
      if (existing?.id) {
        const { error } = await supabase
          .from('marketing_config')
          .update({ ...cfg, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('marketing_config')
          .insert(cfg);
        if (error) throw error;
      }
      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    // GET: get config
    if (req.method === 'GET' && action === 'config') {
      const { data, error } = await supabase
        .from('marketing_config')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return Response.json(data, { headers: corsHeaders });
    }

    // POST: sync squad members → marketing_contacts with source='squad'
    if (req.method === 'POST' && action === 'sync-squad') {
      const { data: squadMembers } = await supabase
        .from('squad_members')
        .select('id, full_name, phone, coupon_code')
        .eq('is_active', true)
        .not('phone', 'is', null);

      const members = (squadMembers || []).filter(m => m.phone?.trim());
      let synced = 0;

      for (const m of members) {
        const phone = String(m.phone).replace(/\D/g, '');
        if (!phone) continue;
        const { data: existing } = await supabase
          .from('marketing_contacts')
          .select('id')
          .eq('phone', phone)
          .maybeSingle();
        if (existing) {
          await supabase.from('marketing_contacts')
            .update({ name: m.full_name, source: 'squad', opt_out: false })
            .eq('id', existing.id);
        } else {
          await supabase.from('marketing_contacts')
            .insert({ phone, name: m.full_name, source: 'squad', opt_out: false });
        }
        synced++;
      }

      return Response.json({ ok: true, synced }, { headers: corsHeaders });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400, headers: corsHeaders });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}
