import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

function getSupabase() {
  return createClient(
    process.env.VITE_SUPABASE_URL || 'https://dhetcnkvgtuatcchropm.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Envia UMA mensagem de premiação ao webhook BotConversa do evento.
// Body: { event_id, telefone, nome, mensagem }
export default async function handler(req) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  try {
    const { event_id, telefone, nome, mensagem } = await req.json();
    if (!event_id || !telefone || !mensagem) {
      return new Response(JSON.stringify({ error: 'event_id, telefone e mensagem são obrigatórios' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const supabase = getSupabase();
    const { data: cfg } = await supabase
      .from('botconversa_config')
      .select('trigger_broadcast_url')
      .eq('event_id', event_id)
      .maybeSingle();

    const webhookUrl = cfg?.trigger_broadcast_url;
    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: 'Webhook de broadcast não configurado para este evento (Config do Evento → BotConversa → Broadcast).' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const phone = String(telefone).replace(/\D/g, '');
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // O fluxo de Broadcast do BotConversa lê o campo "message" (igual ao broadcast/comprovante).
      body: JSON.stringify({ telefone: phone, message: mensagem, nome: nome || '' }),
    });

    return new Response(JSON.stringify({ ok: res.ok, status: res.status }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
}
