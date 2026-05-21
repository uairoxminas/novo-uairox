import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

function getSupabase() {
  return createClient(
    process.env.VITE_SUPABASE_URL || 'https://dhetcnkvgtuatcchropm.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Normalize phone: try all common BR formats (BotConversa sends with DDI 55)
async function findContact(supabase, phone) {
  const digits = String(phone).replace(/\D/g, '');
  const candidates = [...new Set([
    digits,
    // BotConversa envia 5531XXXXXXXXX (13 digits) → tentar sem o 55
    digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : null,
    // 11 digits → add DDI
    digits.length === 11 ? '55' + digits : null,
    // 10 digits (old format without leading 9) → add DDI
    digits.length === 10 ? '55' + digits : null,
    // >11 digits → strip to last 11 (DDD + 9 digits)
    digits.length > 11 ? digits.slice(-11) : null,
    // >10 digits → strip to last 10 (old 8-digit landline format)
    digits.length > 10 ? digits.slice(-10) : null,
  ].filter(Boolean))];

  for (const candidate of candidates) {
    const { data } = await supabase
      .from('marketing_contacts')
      .select('id, phone, name, opt_out')
      .eq('phone', candidate)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-webhook-secret',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Optional secret validation
    const secret = process.env.MARKETING_OPTOUT_SECRET;
    if (secret && req.headers.get('x-webhook-secret') !== secret) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();

    // Accept multiple BotConversa payload formats
    const rawPhone =
      body.phone || body.telefone || body.numero ||
      body.subscriber?.phone || body.subscriber?.phone_number ||
      body.contact?.phone || body.contact?.phone_number || '';

    if (!rawPhone) {
      return new Response(JSON.stringify({ error: 'Campo phone não encontrado no payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabase();
    const contact = await findContact(supabase, rawPhone);

    if (!contact) {
      const digits = String(rawPhone).replace(/\D/g, '');
      return new Response(JSON.stringify({ ok: true, message: 'Contato não encontrado na base', debug_phone_received: digits }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (contact.opt_out) {
      return new Response(JSON.stringify({ ok: true, message: 'Contato em opt-out, ignorado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find step-1 queue items awaiting response
    // Accept 'pending' or 'sent' — there's no background sender marking items as 'sent' yet
    // tracking_code column may not exist if migration wasn't run, so try without it first
    let queueItems = null;
    {
      const { data, error } = await supabase
        .from('marketing_queue')
        .select('id, campaign_id, name, tracking_code')
        .eq('contact_id', contact.id)
        .in('status', ['sent', 'pending'])
        .is('responded_at', null);

      if (error) {
        // columns tracking_code/responded_at may not exist yet (migration not run)
        const { data: data2, error: err2 } = await supabase
          .from('marketing_queue')
          .select('id, campaign_id, name')
          .eq('contact_id', contact.id)
          .in('status', ['sent', 'pending'])
          .is('responded_at', null);

        if (err2) {
          // responded_at also missing — minimal query without extra filters
          const { data: data3 } = await supabase
            .from('marketing_queue')
            .select('id, campaign_id, name')
            .eq('contact_id', contact.id)
            .in('status', ['sent', 'pending']);
          queueItems = data3;
        } else {
          queueItems = data2;
        }
      } else {
        queueItems = data;
      }
    }

    if (!queueItems?.length) {
      return new Response(JSON.stringify({ ok: true, message: 'Nenhum item aguardando resposta', contact_found: contact.phone }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();
    const step2Results = [];

    // Load webhook config once
    const { data: mktConfig } = await supabase
      .from('marketing_config')
      .select('webhook_url')
      .maybeSingle();

    for (const item of queueItems) {
      // Mark as responded (ignore error if column doesn't exist yet)
      await supabase.from('marketing_queue')
        .update({ responded_at: now, status: 'responded' })
        .eq('id', item.id).catch(() => {});

      // Get campaign step2 config
      const { data: campaign } = await supabase
        .from('marketing_campaigns')
        .select('step2_enabled, step2_message, trigger_name, status')
        .eq('id', item.campaign_id)
        .maybeSingle();

      if (!campaign?.step2_enabled || !campaign?.step2_message?.trim()) {
        step2Results.push({ campaign_id: item.campaign_id, step2: 'disabled' });
        continue;
      }
      if (!mktConfig?.webhook_url) {
        step2Results.push({ campaign_id: item.campaign_id, step2: 'no-webhook' });
        continue;
      }

      const contactName = contact.name || item.name || '';
      const trackingUrl = item.tracking_code
        ? `https://uairox.com.br/t/${item.tracking_code}`
        : 'https://uairox.com.br';
      const personalizedMessage = campaign.step2_message
        .replace(/\{nome\}/gi, contactName)
        .replace(/\{link\}/gi, trackingUrl);

      // Send step 2 via BotConversa (trigger = original_trigger + '_step2')
      const payload = {
        trigger: campaign.trigger_name + '_step2',
        nome: contactName,
        telefone: contact.phone,
        mensagem: personalizedMessage,
      };

      // BotConversa may return 400 even on successful delivery — any reached response = ok
      let waOk = false;
      try {
        await fetch(mktConfig.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        waOk = true;
      } catch { /* network error */ }

      if (waOk) {
        await supabase.from('marketing_queue')
          .update({ step2_sent_at: new Date().toISOString() })
          .eq('id', item.id).catch(() => {});
      }

      step2Results.push({ campaign_id: item.campaign_id, step2: waOk ? 'sent' : 'failed' });
    }

    return new Response(JSON.stringify({
      ok: true,
      contact: contact.phone,
      responded: queueItems.length,
      step2: step2Results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[marketing-respond]', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
