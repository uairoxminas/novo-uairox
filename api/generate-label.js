export const config = { runtime: 'edge' };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'content-type',
};

const ME_BASE = 'https://melhorenvio.com.br/api/v2/me';

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const { service_id, shipping_address, athlete_name, athlete_email, athlete_phone, registration_id } = await req.json();

    const token = process.env.MELHOR_ENVIO_TOKEN;
    if (!token) throw new Error('MELHOR_ENVIO_TOKEN não configurado no Vercel');

    const from = {
      name:       process.env.SHIPPING_SENDER_NAME     || 'UAIROX',
      phone:      (process.env.SHIPPING_SENDER_PHONE   || '').replace(/\D/g, ''),
      email:      process.env.SHIPPING_SENDER_EMAIL    || '',
      document:   process.env.SHIPPING_SENDER_DOCUMENT || '',
      address:    process.env.SHIPPING_SENDER_ADDRESS  || '',
      number:     process.env.SHIPPING_SENDER_NUMBER   || 'S/N',
      district:   process.env.SHIPPING_SENDER_DISTRICT || '',
      city:       process.env.SHIPPING_SENDER_CITY     || '',
      state_abbr: process.env.SHIPPING_SENDER_STATE    || '',
      country_id: 'BR',
      postal_code: (process.env.SHIPPING_ORIGIN_CEP   || '').replace(/\D/g, ''),
    };

    const addr = shipping_address || {};
    const to = {
      name:       athlete_name  || 'Atleta',
      phone:      (athlete_phone || '').replace(/\D/g, ''),
      email:      athlete_email || '',
      address:    addr.rua      || '',
      complement: addr.complemento || null,
      number:     addr.numero   || 'S/N',
      district:   addr.bairro   || '',
      city:       addr.cidade   || '',
      state_abbr: addr.estado   || '',
      country_id: 'BR',
      postal_code: (addr.cep || '').replace(/\D/g, ''),
    };

    const meHeaders = {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'Authorization': `Bearer ${token}`,
      'User-Agent':    'App UAIROX (leobergconsultoria@gmail.com)',
    };

    // Step 1 — Add to cart
    const cartRes = await fetch(`${ME_BASE}/cart`, {
      method:  'POST',
      headers: meHeaders,
      body: JSON.stringify({
        service:  service_id,
        from,
        to,
        products: [{ name: 'Camisa UAIROX', quantity: 1, unitary_value: 50 }],
        volumes:  [{ height: 5, width: 15, length: 20, weight: 0.3 }],
        options: {
          insurance_value: 50,
          receipt:         false,
          own_hand:        false,
          collect:         false,
          reverse:         false,
          non_commercial:  true,
          invoice:         { key: null },
        },
        tag: `UAIROX-${registration_id || 'unknown'}`,
      }),
    });

    const cartData = await cartRes.json();
    if (!cartRes.ok || cartData.errors) {
      throw new Error(`Erro ao adicionar ao carrinho: ${JSON.stringify(cartData.errors || cartData)}`);
    }
    const cartId = cartData.id;

    // Step 2 — Checkout (debita da carteira ME)
    const checkoutRes = await fetch(`${ME_BASE}/shipment/checkout`, {
      method:  'POST',
      headers: meHeaders,
      body: JSON.stringify({ orders: [cartId] }),
    });
    const checkoutData = await checkoutRes.json();
    if (!checkoutRes.ok) {
      throw new Error(`Erro no checkout: ${JSON.stringify(checkoutData)}`);
    }

    // Step 3 — Generate label
    const labelRes = await fetch(`${ME_BASE}/shipment/generate`, {
      method:  'POST',
      headers: meHeaders,
      body: JSON.stringify({ orders: [cartId] }),
    });
    const labelData = await labelRes.json();
    if (!labelRes.ok) {
      throw new Error(`Erro ao gerar etiqueta: ${JSON.stringify(labelData)}`);
    }

    const order = labelData[cartId] || {};
    const labelUrl = order.link || order.label?.link;
    if (!labelUrl) throw new Error('Etiqueta gerada mas link não retornado pelo Melhor Envio');

    return json({
      label_url:     labelUrl,
      tracking_code: order.tracking || null,
      cart_id:       cartId,
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
