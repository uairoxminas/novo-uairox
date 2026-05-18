export const config = { runtime: 'edge' };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'content-type',
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const {
      athlete_name, athlete_email, event_name, event_slug,
      whatsapp_link, registration_code, category_name,
      shirt_size, total_price, pix_key, payment_type, team_name,
      freight_service, freight_amount, freight_days, shipping_address,
    } = await req.json();

    if (!athlete_email?.trim()) {
      return new Response(JSON.stringify({ error: 'Email não fornecido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error('RESEND_API_KEY não configurada no Vercel');

    const fromEmail = process.env.EMAIL_FROM || 'UAIROX <eventos@uairox.com.br>';
    const isSelecao = event_slug === 'selecao';
    const totalFmt = total_price ? `R$ ${Number(total_price).toFixed(2).replace('.', ',')}` : null;
    const freightFmt = freight_amount ? `R$ ${Number(freight_amount).toFixed(2).replace('.', ',')}` : null;

    const heroTitle = isSelecao ? 'VOCÊ ESTÁ CONVOCADO!' : 'INSCRIÇÃO RECEBIDA!';

    const shippingRows = isSelecao && shipping_address ? `
      <tr><td style="padding:8px 0;border-bottom:1px solid #1a1a1a;">
        <table width="100%"><tr>
          <td style="color:#888;font-size:13px;white-space:nowrap;">Endereço de Entrega</td>
          <td style="color:#fff;font-size:12px;text-align:right;padding-left:8px;">${shipping_address}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #1a1a1a;">
        <table width="100%"><tr>
          <td style="color:#888;font-size:13px;">Frete</td>
          <td style="color:#fff;font-size:13px;text-align:right;">${freight_service || ''} · ${freight_days || ''} dias úteis · ${freightFmt || ''}</td>
        </tr></table>
      </td></tr>` : '';

    const pixBlock = pix_key && payment_type !== 'installments' ? `
      <div style="background:#0d0d0d;border:1px solid #262626;border-radius:10px;padding:20px;margin:24px 0;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:bold;color:#EDAC02;text-transform:uppercase;letter-spacing:2px;">💰 Chave PIX para Pagamento</p>
        <div style="background:#111;border:1px solid #333;border-radius:6px;padding:12px 16px;font-family:monospace;font-size:15px;color:#EDAC02;word-break:break-all;">${pix_key}</div>
        <p style="margin:10px 0 0;font-size:12px;color:#666;">Copie a chave, abra seu banco e realize o pagamento.</p>
      </div>` : '';

    const whatsappBlock = whatsapp_link ? `
      <div style="text-align:center;margin-top:24px;">
        <p style="font-size:14px;color:#ccc;margin-bottom:12px;font-weight:bold;">Último Passo 🚀 Entre no grupo oficial!</p>
        <a href="${whatsapp_link}" target="_blank"
          style="display:inline-block;background:#25D366;color:#000;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:900;font-size:15px;">
          📲 Entrar no Grupo de Atletas
        </a>
      </div>` : '';

    const row = (label, value, bold = false) => value ? `
      <tr><td style="padding:8px 0;border-bottom:1px solid #1a1a1a;">
        <table width="100%"><tr>
          <td style="color:#888;font-size:13px;">${label}</td>
          <td style="color:#fff;font-size:13px;text-align:right;font-weight:${bold ? 'bold' : 'normal'};">${value}</td>
        </tr></table>
      </td></tr>` : '';

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#000;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:30px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#050505;border:1px solid #1a1a1a;border-radius:16px;overflow:hidden;">
  <tr><td style="background:#0a0a0a;padding:28px;text-align:center;border-bottom:1px solid #262626;">
    <h1 style="margin:0;color:#EDAC02;font-style:italic;font-size:30px;letter-spacing:-1px;font-weight:900;">UAIROX</h1>
  </td></tr>
  <tr><td style="padding:32px 32px 20px;text-align:center;background:radial-gradient(ellipse at center,rgba(237,172,2,0.07) 0%,transparent 70%);">
    <div style="font-size:48px;margin-bottom:16px;">✅</div>
    <h2 style="margin:0 0 8px;color:#EDAC02;font-style:italic;font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:-1px;">${heroTitle}</h2>
    <p style="margin:0;color:#aaa;font-size:14px;">Olá, <strong style="color:#fff;">${athlete_name}</strong>! Sua inscrição em <strong style="color:#fff;">${event_name}</strong> foi recebida.</p>
  </td></tr>
  <tr><td style="padding:0 32px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1a1a1a;border-radius:10px;overflow:hidden;">
      <tr><td style="background:#0a0a0a;padding:12px 16px;">
        <p style="margin:0;font-size:11px;font-weight:bold;color:#EDAC02;text-transform:uppercase;letter-spacing:2px;">Detalhes da Inscrição</p>
      </td></tr>
      <tr><td style="padding:4px 16px 4px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${row('Atleta', athlete_name, true)}
          ${row('Evento', event_name)}
          ${team_name ? row('Equipe', team_name) : ''}
          ${row('Categoria', category_name)}
          ${row('Tamanho da Camisa', shirt_size)}
          ${shippingRows}
          ${totalFmt ? `<tr><td style="padding:10px 0;">
            <table width="100%"><tr>
              <td style="color:#ccc;font-size:14px;font-weight:bold;">Total</td>
              <td style="color:#EDAC02;font-size:18px;font-weight:900;text-align:right;">${totalFmt}</td>
            </tr></table>
          </td></tr>` : ''}
        </table>
        ${registration_code ? `<p style="margin:6px 0 4px;font-size:11px;color:#555;text-align:center;">Código: <span style="color:#888;font-family:monospace;">${registration_code}</span></p>` : ''}
      </td></tr>
    </table>
  </td></tr>
  ${pixBlock ? `<tr><td style="padding:0 32px;">${pixBlock}</td></tr>` : ''}
  ${whatsappBlock ? `<tr><td style="padding:8px 32px 28px;">${whatsappBlock}</td></tr>` : ''}
  <tr><td style="padding:20px 32px;border-top:1px solid #1a1a1a;text-align:center;">
    <p style="margin:0;font-size:11px;color:#444;">© UAIROX • Esta é uma mensagem automática.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

    const subject = isSelecao
      ? `✅ Você está Convocado! — ${event_name}`
      : `✅ Inscrição Recebida — ${event_name}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromEmail, to: [athlete_email], subject, html }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    const data = await res.json();
    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
