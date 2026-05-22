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
    const { members, event_name, discount_type, discount_value, reward_value } = await req.json();

    if (!members?.length) {
      return new Response(JSON.stringify({ ok: true, results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabase();
    const { data: mktConfig } = await supabase
      .from('marketing_config')
      .select('webhook_url')
      .maybeSingle();

    if (!mktConfig?.webhook_url) {
      return new Response(JSON.stringify({ error: 'Webhook BotConversa não configurado em Marketing > Contatos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const discountLabel = discount_type === 'percentage'
      ? `${discount_value}% de desconto`
      : `R$ ${Number(discount_value).toFixed(2).replace('.', ',')} de desconto`;

    const results = [];

    for (const member of members) {
      if (!member.phone) {
        results.push({ name: member.name, code: member.code, ok: false, reason: 'sem telefone cadastrado' });
        continue;
      }

      const phone = String(member.phone).replace(/\D/g, '');
      const trackingLink = `https://uairox.com.br/squad/${member.code}`;

      const lines = [
        `🎟 Seu cupom foi criado!`,
        ``,
        `📅 Evento: ${event_name}`,
        `🏷 Cupom: *${member.code}*`,
        `💸 Desconto: ${discountLabel}`,
      ];
      if (reward_value) lines.push(`🎁 Recompensa: ${reward_value}`);
      lines.push(``, `📊 Acompanhe seus resultados:`, trackingLink, ``, `Compartilhe com sua galera! 💪`);

      const mensagem = lines.join('\n');

      try {
        await fetch(mktConfig.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trigger: 'squad_cupom',
            nome: member.name,
            telefone: phone,
            mensagem,
          }),
        });
        results.push({ name: member.name, code: member.code, ok: true });
      } catch {
        results.push({ name: member.name, code: member.code, ok: false, reason: 'erro de rede' });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
