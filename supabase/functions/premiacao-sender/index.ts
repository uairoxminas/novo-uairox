import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH = 2;            // mensagens por rodada (cron roda a cada 1 min)
const GAP_MS = 30000;       // 30s entre cada envio
const MAX_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const now = Date.now();

  // Recuperação: o que ficou preso em 'sending' há > 5 min volta para 'pending'
  await supabase.from('premiacao_queue')
    .update({ status: 'pending', updated_at: new Date(now).toISOString() })
    .eq('status', 'sending')
    .lt('updated_at', new Date(now - 5 * 60000).toISOString());

  // Pega as mensagens vencidas mais antigas
  const { data: due } = await supabase.from('premiacao_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', new Date(now).toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(BATCH);

  const list = due ?? [];
  let sent = 0;

  for (let i = 0; i < list.length; i++) {
    const msg = list[i] as any;

    // Claim atômico: só processa se ainda estiver 'pending'
    const { data: claimed } = await supabase.from('premiacao_queue')
      .update({ status: 'sending', updated_at: new Date().toISOString() })
      .eq('id', msg.id).eq('status', 'pending')
      .select('id');
    if (!claimed || !claimed.length) continue;

    let ok = false;
    try {
      const res = await fetch(msg.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'premiacao', nome: msg.nome ?? '', telefone: msg.telefone, mensagem: msg.mensagem }),
      });
      ok = res.ok;
    } catch (_) {
      ok = false;
    }

    const attempts = (msg.attempts ?? 0) + 1;
    await supabase.from('premiacao_queue').update({
      status: ok ? 'sent' : (attempts >= MAX_ATTEMPTS ? 'failed' : 'pending'),
      sent_at: ok ? new Date().toISOString() : null,
      attempts,
      updated_at: new Date().toISOString(),
    }).eq('id', msg.id);

    if (ok) sent++;

    // Espaça 30s entre os envios (não dorme após o último)
    if (i < list.length - 1) await sleep(GAP_MS);
  }

  return new Response(JSON.stringify({ ok: true, processed: list.length, sent }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
