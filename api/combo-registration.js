import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://dhetcnkvgtuatcchropm.supabase.co';
const SITE_URL = 'https://uairox.com.br';
const COMBO_DISCOUNT = 0.10; // 10% off
const CROSS_COUPON_DISCOUNT = 5;  // 5% off (for individual selecao registrations)

function getSupabase() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function genCode(prefix = 'COMBO') {
  return `${prefix}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
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

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'create';

  try {
    const supabase = getSupabase();

    // ── CREATE CROSS COUPON (called after individual selecao registration) ───
    if (action === 'cross-coupon') {
      const { registration_id, athlete_name, athlete_email } = await req.json();

      // Look up events 8experience and 8oficial by slug
      const { data: events } = await supabase
        .from('events')
        .select('id, slug, title')
        .in('slug', ['8experience', '8oficial']);

      if (!events?.length) {
        return new Response(JSON.stringify({ ok: false, error: 'Eventos não encontrados' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const code = genCode('JUN');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Create one coupon per event with the same code
      const coupons = events.map(ev => ({
        event_id: ev.id,
        code,
        discount_type: 'percentage',
        discount_value: CROSS_COUPON_DISCOUNT,
        coupon_type: 'cross_sell',
        max_uses: 1,
        current_uses: 0,
        expires_at: expiresAt,
      }));

      const { error } = await supabase.from('discount_coupons').insert(coupons);
      if (error) throw error;

      return new Response(JSON.stringify({ ok: true, code, discount: CROSS_COUPON_DISCOUNT }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── CREATE COMBO REGISTRATION ─────────────────────────────────────────────
    // Body: { athlete, combo_type: 'experience'|'oficial', category_id_1, batch_id_1, category_id_2, batch_id_2, kit_id_1?, kit_id_2? }
    const body = await req.json();
    const { athlete, combo_type, category_id_1, batch_id_1, category_id_2, batch_id_2 } = body;

    if (!athlete || !combo_type || !category_id_1 || !batch_id_1 || !category_id_2 || !batch_id_2) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load both batches to get prices
    const { data: batches } = await supabase
      .from('price_batches')
      .select('id, event_id, price, payment_link')
      .in('id', [batch_id_1, batch_id_2]);

    if (!batches || batches.length < 2) {
      return new Response(JSON.stringify({ error: 'Lotes não encontrados' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const batch1 = batches.find(b => b.id === batch_id_1);
    const batch2 = batches.find(b => b.id === batch_id_2);

    const price1 = parseFloat(batch1.price) || 0;
    const price2 = parseFloat(batch2.price) || 0;
    const discountedPrice1 = Math.round(price1 * (1 - COMBO_DISCOUNT) * 100) / 100;
    const discountedPrice2 = Math.round(price2 * (1 - COMBO_DISCOUNT) * 100) / 100;
    const totalCombo = Math.round((discountedPrice1 + discountedPrice2) * 100) / 100;

    // Load events to get IDs
    const { data: events } = await supabase
      .from('events')
      .select('id, slug')
      .in('id', [batch1.event_id, batch2.event_id]);

    const event1 = events?.find(e => e.id === batch1.event_id);
    const event2 = events?.find(e => e.id === batch2.event_id);

    // Create combo coupon code for reference
    const comboCode = genCode('COMBO');
    const now = new Date().toISOString();

    // Create registration 1 (selecao)
    const { data: reg1, error: err1 } = await supabase
      .from('registrations')
      .insert({
        event_id: batch1.event_id,
        category_id: category_id_1,
        batch_id: batch_id_1,
        kit_id: body.kit_id_1 || null,
        status: 'pending',
        total_paid: discountedPrice1,
        payment_method: 'pix',
        athletes: [{
          name: athlete.name,
          email: athlete.email,
          phone: athlete.phone,
          cpf: athlete.cpf || null,
          birth_date: athlete.birth_date,
          gender: athlete.gender,
          gym: athlete.gym,
          shirt_size: athlete.shirt_size || null,
        }],
      })
      .select()
      .single();

    if (err1) throw err1;

    // Create registration 2 (experience or oficial)
    const { data: reg2, error: err2 } = await supabase
      .from('registrations')
      .insert({
        event_id: batch2.event_id,
        category_id: category_id_2,
        batch_id: batch_id_2,
        kit_id: body.kit_id_2 || null,
        status: 'pending',
        total_paid: discountedPrice2,
        payment_method: 'pix',
        athletes: [{
          name: athlete.name,
          email: athlete.email,
          phone: athlete.phone,
          cpf: athlete.cpf || null,
          birth_date: athlete.birth_date,
          gender: athlete.gender,
          gym: athlete.gym,
          shirt_size: athlete.shirt_size || null,
        }],
      })
      .select()
      .single();

    if (err2) throw err2;

    // Auto-capture to marketing
    if (athlete.phone) {
      await supabase.from('marketing_contacts').upsert({
        phone: athlete.phone.replace(/\D/g, ''),
        name: athlete.name,
        email: athlete.email || null,
        source: 'combo',
      }, { onConflict: 'phone', ignoreDuplicates: false }).catch(() => {});
    }

    return new Response(JSON.stringify({
      ok: true,
      combo_code: comboCode,
      registrations: [reg1.id, reg2.id],
      price_breakdown: {
        event1: { slug: event1?.slug, original: price1, discounted: discountedPrice1 },
        event2: { slug: event2?.slug, original: price2, discounted: discountedPrice2 },
        total_original: Math.round((price1 + price2) * 100) / 100,
        total_combo: totalCombo,
        savings: Math.round((price1 + price2 - totalCombo) * 100) / 100,
        discount_percent: COMBO_DISCOUNT * 100,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[combo-registration]', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
