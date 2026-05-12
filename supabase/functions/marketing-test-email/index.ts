import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function buildEmailHtml(template: any, name: string): string {
  const t = template || {};
  const title = (t.title || '').replace(/\{nome\}/gi, name);
  const body  = (t.body  || '').replace(/\{nome\}/gi, name);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">
        ${t.image_url ? `<tr><td style="padding:0;"><img src="${t.image_url}" alt="" width="600" style="width:100%;max-width:600px;display:block;border:0;"></td></tr>` : ''}
        <tr><td style="padding:32px 40px 24px;">
          ${title ? `<h1 style="margin:0 0 16px;font-size:24px;font-weight:900;color:#111111;line-height:1.3;">${title}</h1>` : ''}
          ${body ? `<div style="font-size:15px;color:#444444;line-height:1.7;white-space:pre-line;">${body}</div>` : ''}
        </td></tr>
        ${t.cta_text && t.cta_url ? `<tr><td style="padding:0 40px 32px;"><a href="${t.cta_url}" style="display:inline-block;background:#EDAC02;color:#000000;font-weight:900;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:.05em;text-transform:uppercase;">${t.cta_text}</a></td></tr>` : ''}
        <tr><td style="padding:12px 40px;background:#EDAC02;text-align:center;">
          <p style="margin:0;font-size:11px;font-weight:900;color:#000;text-transform:uppercase;letter-spacing:.1em;">⚠ EMAIL DE TESTE — não é um envio real</p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #eeeeee;font-size:11px;color:#999999;">Para não receber mais emails, responda com "SAIR".</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { to, subject, template } = await req.json();
    if (!to) return new Response(JSON.stringify({ error: 'Campo "to" obrigatório' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: mktConfig } = await supabase.from('marketing_config').select('email_from, resend_api_key').maybeSingle();

    const resendKey = Deno.env.get('RESEND_API_KEY') || mktConfig?.resend_api_key || '';
    if (!resendKey) throw new Error('RESEND_API_KEY não configurada');

    const emailFrom = mktConfig?.email_from || 'UAIROX <noreply@uairox.com.br>';
    const html = buildEmailHtml(template || {}, 'Teste');
    const emailSubject = (subject || 'Teste de Email — UAIROX').replace(/\{nome\}/gi, 'Teste');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: emailFrom, to: [to], subject: emailSubject, html }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend ${res.status}: ${err}`);
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
