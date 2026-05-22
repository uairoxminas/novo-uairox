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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { campaign_id, phone, name } = await req.json();

    if (!campaign_id || !phone) {
      return new Response(JSON.stringify({ error: 'campaign_id e phone são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabase();

    // Load campaign
    const { data: campaign, error: campErr } = await supabase
      .from('marketing_campaigns')
      .select('name, trigger_name, use_squad_webhook, base_message')
      .eq('id', campaign_id)
      .maybeSingle();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: 'Campanha não encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load webhook URL
    const { data: mktConfig } = await supabase
      .from('marketing_config')
      .select('webhook_url, squad_webhook_url')
      .maybeSingle();

    const webhookUrl = campaign.use_squad_webhook
      ? (mktConfig?.squad_webhook_url || mktConfig?.webhook_url)
      : mktConfig?.webhook_url;

    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: 'Webhook do BotConversa não configurado' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contactName = name?.trim() || 'Teste';
    const digits = String(phone).replace(/\D/g, '');

    // Dispara trigger ao BotConversa — BotConversa cuida da mensagem pelo seu fluxo
    const payload = {
      trigger:  campaign.trigger_name,
      nome:     contactName,
      telefone: digits,
    };
    if (campaign.use_squad_webhook && campaign.base_message) {
      // Busca cupom do membro pelo telefone no teste
      const phoneDigits = digits;
      const phoneCandidates = [...new Set([
        phoneDigits,
        phoneDigits.startsWith('55') ? phoneDigits.slice(2) : '55' + phoneDigits,
      ])];
      let couponCode = '';
      for (const p of phoneCandidates) {
        const { data: sm } = await supabase.from('squad_members').select('coupon_code').eq('phone', p).maybeSingle();
        if (sm?.coupon_code) { couponCode = sm.coupon_code; break; }
      }
      const link = couponCode ? `https://uairox.com.br/squad/${couponCode}` : '';
      payload.mensagem = campaign.base_message
        .replace(/\{nome\}/gi, contactName)
        .replace(/\{cupom\}/gi, couponCode)
        .replace(/\{link\}/gi, link);
    }
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
