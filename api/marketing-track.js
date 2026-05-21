import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://dhetcnkvgtuatcchropm.supabase.co';
const SITE_URL = 'https://uairox.com.br';

function getSupabase() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export default async function handler(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('c') || url.pathname.split('/').pop();

  if (!code) {
    return Response.redirect(`${SITE_URL}/`, 302);
  }

  try {
    const supabase = getSupabase();

    // Find queue item by tracking_code
    const { data: item } = await supabase
      .from('marketing_queue')
      .select('id, campaign_id, contact_id, phone, name, tracking_event_id')
      .eq('tracking_code', code)
      .maybeSingle();

    if (!item) {
      return Response.redirect(`${SITE_URL}/`, 302);
    }

    // Record click (insert only — ignore duplicate if clicked before)
    const { data: existing } = await supabase
      .from('marketing_clicks')
      .select('id, converted')
      .eq('tracking_code', code)
      .maybeSingle();

    if (!existing) {
      await supabase.from('marketing_clicks').insert({
        tracking_code: code,
        campaign_id: item.campaign_id,
        contact_id: item.contact_id,
        event_id: item.tracking_event_id,
        phone: item.phone,
      });
    }

    // Resolve event URL
    let destination = SITE_URL;
    if (item.tracking_event_id) {
      const { data: event } = await supabase
        .from('events')
        .select('id, slug')
        .eq('id', item.tracking_event_id)
        .maybeSingle();

      if (event) {
        destination = `${SITE_URL}/evento/${event.slug || event.id}`;
      }
    }

    return Response.redirect(destination, 302);

  } catch {
    return Response.redirect(`${SITE_URL}/`, 302);
  }
}
