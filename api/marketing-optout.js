import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

function getSupabase() {
  return createClient(
    process.env.VITE_SUPABASE_URL || 'https://dhetcnkvgtuatcchropm.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// Mesmos 6 candidatos do marketing-respond para máxima compatibilidade com BotConversa
async function findContact(supabase, phone) {
  const digits = String(phone).replace(/\D/g, '');
  const candidates = [...new Set([
    digits,
    digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : null,
    digits.length === 11 ? '55' + digits : null,
    digits.length === 10 ? '55' + digits : null,
    digits.length > 11 ? digits.slice(-11) : null,
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
    const secret = process.env.MARKETING_OPTOUT_SECRET;
    if (secret && req.headers.get('x-webhook-secret') !== secret) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const rawPhone = body.phone || body.telefone || body.numero
      || body.subscriber?.phone || body.contact?.phone || '';

    if (!rawPhone) {
      return new Response(JSON.stringify({ error: 'Campo phone não encontrado' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabase();
    const contact = await findContact(supabase, rawPhone);

    if (!contact) {
      const digits = String(rawPhone).replace(/\D/g, '');
      return new Response(JSON.stringify({ ok: true, message: 'Contato não encontrado', debug_phone: digits }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (contact.opt_out) {
      return new Response(JSON.stringify({ ok: true, message: 'Contato já estava em opt-out' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Marca opt-out na tabela de contatos
    await supabase.from('marketing_contacts').update({ opt_out: true }).eq('id', contact.id);

    // Cancela todos os itens pendentes na fila para este contato
    await supabase.from('marketing_queue')
      .update({ status: 'optout' })
      .eq('contact_id', contact.id)
      .in('status', ['pending', 'sent']);

    return new Response(JSON.stringify({
      ok: true,
      message: `Opt-out registrado: ${contact.phone}`,
      contact: contact.phone,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
