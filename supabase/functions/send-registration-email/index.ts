import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      athlete_name,
      athlete_email,
      event_name,
      event_slug,
      whatsapp_link,
      registration_code,
      category_name,
      shirt_size,
      total_price,
      pix_key,
      payment_type,
      freight_service,
      freight_amount,
      freight_days,
      shipping_address,
    } = await req.json();

    if (!athlete_email) {
      return new Response(JSON.stringify({ error: 'Email não fornecido.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) throw new Error('RESEND_API_KEY não configurada');

    const fromEmail = Deno.env.get('EMAIL_FROM') || 'UAIROX <eventos@uairox.com.br>';
    const isSelecao = event_slug === 'selecao';
    const totalFormatted = total_price
      ? `R$ ${Number(total_price).toFixed(2).replace('.', ',')}`
      : null;
    const freightFormatted = freight_amount
      ? `R$ ${Number(freight_amount).toFixed(2).replace('.', ',')}`
      : null;

    const heroTitle = isSelecao ? 'VOCÊ ESTÁ CONVOCADO!' : 'INSCRIÇÃO RECEBIDA!';
    const heroSub = isSelecao
      ? 'Sua vaga na Seleção UAIROX foi registrada com sucesso.'
      : `Sua inscrição em <strong>${event_name}</strong> foi registrada.`;

    const shippingBlock = isSelecao && shipping_address
      ? `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #1a1a1a;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#888;font-size:13px;">Endereço de Entrega</td>
                <td style="color:#fff;font-size:13px;text-align:right;">${shipping_address}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #1a1a1a;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#888;font-size:13px;">Frete</td>
                <td style="color:#fff;font-size:13px;text-align:right;">${freight_service || ''} · ${freight_days || ''} dias úteis · ${freightFormatted || ''}</td>
              </tr>
            </table>
          </td>
        </tr>`
      : '';

    const pixBlock = pix_key && payment_type !== 'installments'
      ? `
        <div style="background:#0d0d0d;border:1px solid #262626;border-radius:10px;padding:20px;margin:24px 0;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:bold;color:#EDAC02;text-transform:uppercase;letter-spacing:2px;">💰 Chave PIX para Pagamento</p>
          <div style="background:#111;border:1px solid #333;border-radius:6px;padding:12px 16px;font-family:monospace;font-size:15px;color:#EDAC02;word-break:break-all;">${pix_key}</div>
          <p style="margin:10px 0 0;font-size:12px;color:#666;">Copie a chave, abra seu banco e realize o pagamento. Após pagar, envie o comprovante na página do evento.</p>
        </div>`
      : '';

    const whatsappBlock = whatsapp_link
      ? `
        <div style="text-align:center;margin-top:28px;">
          <p style="font-size:14px;color:#ccc;margin-bottom:14px;font-weight:bold;">Último Passo 🚀</p>
          <a href="${whatsapp_link}" target="_blank"
            style="display:inline-block;background:#25D366;color:#000;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:900;font-size:15px;letter-spacing:0.5px;">
            📲 Entrar no Grupo de Atletas
          </a>
        </div>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#000;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#050505;border:1px solid #1a1a1a;border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a0a0a 0%,#111 100%);padding:32px;text-align:center;border-bottom:1px solid #262626;">
            <h1 style="margin:0;color:#EDAC02;font-style:italic;font-size:32px;letter-spacing:-1px;font-weight:900;">UAIROX</h1>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td style="padding:36px 32px 24px;text-align:center;background:radial-gradient(ellipse at center,rgba(237,172,2,0.08) 0%,transparent 70%);">
            <div style="width:72px;height:72px;background:rgba(237,172,2,0.1);border:1px solid rgba(237,172,2,0.3);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
              <span style="font-size:32px;">✅</span>
            </div>
            <h2 style="margin:0 0 8px;color:#EDAC02;font-style:italic;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-1px;">${heroTitle}</h2>
            <p style="margin:0;color:#aaa;font-size:15px;line-height:1.5;">${heroSub}</p>
          </td>
        </tr>

        <!-- Details -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #1a1a1a;border-radius:10px;overflow:hidden;">
              <tr><td style="background:#0a0a0a;padding:12px 16px;">
                <p style="margin:0;font-size:11px;font-weight:bold;color:#EDAC02;text-transform:uppercase;letter-spacing:2px;">Detalhes da Inscrição</p>
              </td></tr>
              <tr><td style="padding:4px 16px 4px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr><td style="padding:8px 0;border-bottom:1px solid #1a1a1a;">
                    <table width="100%" cellpadding="0" cellspacing="0"><tr>
                      <td style="color:#888;font-size:13px;">Atleta</td>
                      <td style="color:#fff;font-size:13px;font-weight:bold;text-align:right;">${athlete_name}</td>
                    </tr></table>
                  </td></tr>
                  <tr><td style="padding:8px 0;border-bottom:1px solid #1a1a1a;">
                    <table width="100%" cellpadding="0" cellspacing="0"><tr>
                      <td style="color:#888;font-size:13px;">Evento</td>
                      <td style="color:#fff;font-size:13px;text-align:right;">${event_name}</td>
                    </tr></table>
                  </td></tr>
                  ${category_name ? `
                  <tr><td style="padding:8px 0;border-bottom:1px solid #1a1a1a;">
                    <table width="100%" cellpadding="0" cellspacing="0"><tr>
                      <td style="color:#888;font-size:13px;">Categoria</td>
                      <td style="color:#fff;font-size:13px;text-align:right;">${category_name}</td>
                    </tr></table>
                  </td></tr>` : ''}
                  ${shirt_size ? `
                  <tr><td style="padding:8px 0;border-bottom:1px solid #1a1a1a;">
                    <table width="100%" cellpadding="0" cellspacing="0"><tr>
                      <td style="color:#888;font-size:13px;">Tamanho da Camisa</td>
                      <td style="color:#fff;font-size:13px;text-align:right;">${shirt_size}</td>
                    </tr></table>
                  </td></tr>` : ''}
                  ${shippingBlock}
                  ${totalFormatted ? `
                  <tr><td style="padding:10px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0"><tr>
                      <td style="color:#ccc;font-size:14px;font-weight:bold;">Total</td>
                      <td style="color:#EDAC02;font-size:18px;font-weight:900;text-align:right;">${totalFormatted}</td>
                    </tr></table>
                  </td></tr>` : ''}
                </table>
              </td></tr>
            </table>
            ${registration_code ? `<p style="margin:10px 0 0;font-size:11px;color:#555;text-align:center;">Código da Inscrição: <span style="color:#888;font-family:monospace;">${registration_code}</span></p>` : ''}
          </td>
        </tr>

        <!-- PIX -->
        ${pixBlock ? `<tr><td style="padding:0 32px;">${pixBlock}</td></tr>` : ''}

        <!-- WhatsApp -->
        ${whatsappBlock ? `<tr><td style="padding:8px 32px 32px;">${whatsappBlock}</td></tr>` : ''}

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #1a1a1a;text-align:center;">
            <p style="margin:0;font-size:11px;color:#444;">© UAIROX • Eventos Esportivos</p>
            <p style="margin:4px 0 0;font-size:10px;color:#333;">Esta é uma mensagem automática — não responda este email.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [athlete_email],
        subject: `✅ ${isSelecao ? 'Você está Convocado!' : 'Inscrição Recebida'} — ${event_name}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    const resData = await res.json();
    return new Response(JSON.stringify({ success: true, id: resData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
