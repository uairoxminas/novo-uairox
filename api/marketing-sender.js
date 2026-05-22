import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

function getSupabase() {
  return createClient(
    process.env.VITE_SUPABASE_URL || 'https://dhetcnkvgtuatcchropm.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Brasília = UTC-3; permite disparos entre 8h e 19h
function isSendWindow() {
  const brasiliaHour = (new Date().getUTCHours() - 3 + 24) % 24;
  return brasiliaHour >= 8 && brasiliaHour < 19;
}

// Delay aleatório: 1 a 30 minutos em ms
function randomDelayMs() {
  const min = 1  * 60 * 1000;  //  1 min
  const max = 30 * 60 * 1000;  // 30 min
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-cron-secret',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Protege o endpoint com secret (configurado no Vercel + cron-job.org)
  const secret = process.env.MARKETING_CRON_SECRET;
  if (secret && req.headers.get('x-cron-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'Não autorizado' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Fora do horário permitido: 8h–19h Brasília
  if (!isSendWindow()) {
    return new Response(JSON.stringify({ ok: true, skipped: 'fora do horário (8h–19h Brasília)' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = getSupabase();
  const now     = new Date();
  const nowIso  = now.toISOString();

  // ── 1. Pega UM item pronto para enviar (send_after <= agora) ──────────────
  const { data: items } = await supabase
    .from('marketing_queue')
    .select('id, campaign_id, phone, name, variant_index')
    .eq('status', 'pending')
    .lte('send_after', nowIso)
    .order('send_after', { ascending: true })
    .limit(1);

  if (!items?.length) {
    return new Response(JSON.stringify({ ok: true, skipped: 'nenhum item pronto para envio' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const item = items[0];

  // ── 2. Carrega campanha ───────────────────────────────────────────────────
  const { data: campaign } = await supabase
    .from('marketing_campaigns')
    .select('trigger_name, base_message, variants, daily_limit, status')
    .eq('id', item.campaign_id)
    .maybeSingle();

  if (!campaign || campaign.status !== 'active') {
    return new Response(JSON.stringify({ ok: true, skipped: 'campanha não está ativa' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── 3. Verifica limite diário ─────────────────────────────────────────────
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count: sentToday, error: countErr } = await supabase
    .from('marketing_queue')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', item.campaign_id)
    .eq('status', 'sent')
    .gte('sent_at', todayStart.toISOString());

  if (!countErr && sentToday >= (campaign.daily_limit || 50)) {
    return new Response(JSON.stringify({
      ok: true,
      skipped: `limite diário atingido: ${sentToday}/${campaign.daily_limit}`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // ── 4. Monta mensagem personalizada com variante do contato ──────────────
  const variants   = campaign.variants?.length ? campaign.variants : [campaign.base_message];
  const variantIdx = (item.variant_index || 0) % variants.length;
  const rawMessage = variants[variantIdx] || campaign.base_message || '';
  const message    = rawMessage.replace(/\{nome\}/gi, item.name || '');

  // ── 5. Carrega webhook BotConversa ───────────────────────────────────────
  const { data: mktConfig } = await supabase
    .from('marketing_config')
    .select('webhook_url')
    .maybeSingle();

  if (!mktConfig?.webhook_url) {
    return new Response(JSON.stringify({ ok: false, error: 'Webhook BotConversa não configurado' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── 6. Envia via BotConversa (ignora HTTP status — BC retorna 400 mesmo com sucesso) ─
  let sent = false;
  try {
    await fetch(mktConfig.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trigger:   campaign.trigger_name,
        nome:      item.name || '',
        telefone:  item.phone,
        mensagem:  message,
      }),
    });
    sent = true;
  } catch { /* erro de rede — marca como failed */ }

  // ── 7. Atualiza status do item enviado ───────────────────────────────────
  await supabase.from('marketing_queue')
    .update({ status: sent ? 'sent' : 'failed', sent_at: nowIso })
    .eq('id', item.id);

  // ── 8. Agenda próximo item da mesma campanha com delay aleatório ──────────
  let nextDelayMin = null;
  if (sent) {
    const delayMs      = randomDelayMs();
    nextDelayMin       = Math.round(delayMs / 60000);
    const nextSendAfter = new Date(Date.now() + delayMs).toISOString();

    const { data: nextItems } = await supabase
      .from('marketing_queue')
      .select('id')
      .eq('campaign_id', item.campaign_id)
      .eq('status', 'pending')
      .order('send_after', { ascending: true })
      .limit(1);

    if (nextItems?.length) {
      await supabase.from('marketing_queue')
        .update({ send_after: nextSendAfter })
        .eq('id', nextItems[0].id);
    }
  }

  return new Response(JSON.stringify({
    ok:                  true,
    sent,
    phone:               item.phone,
    variant_used:        variantIdx,
    daily_sent:          (sentToday || 0) + 1,
    daily_limit:         campaign.daily_limit,
    next_send_in_minutes: nextDelayMin,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
