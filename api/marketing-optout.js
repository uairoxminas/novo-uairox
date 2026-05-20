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
    'Access-Control-Allow-Headers': 'content-type, x-webhook-secret',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verificação opcional de secret (configure MARKETING_OPTOUT_SECRET no Vercel)
    const secret = process.env.MARKETING_OPTOUT_SECRET;
    if (secret) {
      const incoming = req.headers.get('x-webhook-secret');
      if (incoming !== secret) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const body = await req.json();

    // Aceita "phone", "telefone" ou "numero" — compatível com payload do BotConversa
    const rawPhone = body.phone || body.telefone || body.numero || '';
    if (!rawPhone) {
      return new Response(JSON.stringify({ error: 'Campo "phone" é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normaliza: remove tudo que não é dígito
    const phone = String(rawPhone).replace(/\D/g, '');
    if (phone.length < 8) {
      return new Response(JSON.stringify({ error: 'Telefone inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabase();

    // Busca por sufixo: tenta match exato primeiro, depois últimos 11 dígitos
    // (BotConversa pode enviar com ou sem código de país)
    let { data: contact } = await supabase
      .from('marketing_contacts')
      .select('id, phone, name, opt_out')
      .eq('phone', phone)
      .maybeSingle();

    if (!contact && phone.length > 11) {
      // Tenta sem o DDI (55)
      const localPhone = phone.slice(-11);
      const { data } = await supabase
        .from('marketing_contacts')
        .select('id, phone, name, opt_out')
        .eq('phone', localPhone)
        .maybeSingle();
      contact = data;
    }

    if (!contact && phone.length === 11) {
      // Tenta com DDI (55)
      const withDDI = '55' + phone;
      const { data } = await supabase
        .from('marketing_contacts')
        .select('id, phone, name, opt_out')
        .eq('phone', withDDI)
        .maybeSingle();
      contact = data;
    }

    if (!contact) {
      // Contato não encontrado — mesmo assim retorna 200 para o BotConversa não retentar
      return new Response(JSON.stringify({ ok: true, message: 'Contato não encontrado na base' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (contact.opt_out) {
      return new Response(JSON.stringify({ ok: true, message: 'Contato já estava em opt-out' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error } = await supabase
      .from('marketing_contacts')
      .update({ opt_out: true })
      .eq('id', contact.id);

    if (error) throw error;

    console.log(`[marketing-optout] Opt-out registrado: ${contact.phone} (${contact.name || 'sem nome'})`);

    return new Response(JSON.stringify({ ok: true, message: `Opt-out registrado para ${contact.phone}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[marketing-optout] Erro:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
