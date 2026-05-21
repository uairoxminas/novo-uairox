import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

function getSupabase() {
  return createClient(
    process.env.VITE_SUPABASE_URL || 'https://dhetcnkvgtuatcchropm.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Called when a registration succeeds — marks any pending clicks as converted
export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { phone, event_id, registration_id } = await req.json();

    if (!phone || !event_id) {
      return new Response(JSON.stringify({ ok: true, converted: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabase();
    const digits = String(phone).replace(/\D/g, '');

    // Try multiple phone formats
    const candidates = [
      digits,
      digits.length === 11 ? '55' + digits : null,
      digits.length > 11 ? digits.slice(-11) : null,
    ].filter(Boolean);

    let converted = 0;
    for (const candidate of candidates) {
      const { data: clicks } = await supabase
        .from('marketing_clicks')
        .select('id')
        .eq('phone', candidate)
        .eq('event_id', event_id)
        .eq('converted', false);

      if (clicks?.length) {
        const ids = clicks.map(c => c.id);
        await supabase
          .from('marketing_clicks')
          .update({
            converted: true,
            converted_at: new Date().toISOString(),
            registration_id: registration_id || null,
          })
          .in('id', ids);
        converted += clicks.length;
        break;
      }
    }

    return new Response(JSON.stringify({ ok: true, converted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[marketing-convert]', error.message);
    // Always 200 — don't block registration flow
    return new Response(JSON.stringify({ ok: true, converted: 0, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
