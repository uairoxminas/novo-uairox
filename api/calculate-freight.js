export const config = { runtime: 'edge' };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'content-type',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { cep_destino } = await req.json();

    const cep = (cep_destino || '').replace(/\D/g, '');
    if (cep.length !== 8) {
      return new Response(JSON.stringify({ error: 'CEP inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = process.env.MELHOR_ENVIO_TOKEN;
    const originCep = (process.env.SHIPPING_ORIGIN_CEP || '').replace(/\D/g, '');

    if (!token) throw new Error('MELHOR_ENVIO_TOKEN não configurado no Vercel');
    if (!originCep || originCep.length !== 8) throw new Error('SHIPPING_ORIGIN_CEP não configurado ou inválido no Vercel');

    const payload = {
      from: { postal_code: originCep },
      to: { postal_code: cep },
      package: {
        height: 5,
        width: 15,
        length: 20,
        weight: 0.3,
      },
      services: '1,2,17',
    };

    const meRes = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'App UAIROX (leobergconsultoria@gmail.com)',
      },
      body: JSON.stringify(payload),
    });

    if (!meRes.ok) {
      const err = await meRes.text();
      throw new Error(`Melhor Envio API error: ${err}`);
    }

    const services = await meRes.json();

    const options = (Array.isArray(services) ? services : [])
      .filter(s => !s.error)
      .map(s => ({
        id: s.id,
        name: s.name,
        price: parseFloat(s.price),
        delivery_time: s.delivery_time,
        company: s.company?.name || '',
      }))
      .sort((a, b) => a.price - b.price);

    return new Response(JSON.stringify({ options }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
