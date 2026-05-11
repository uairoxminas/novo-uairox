import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function nowBRT(): Date {
  const now = new Date();
  return new Date(now.getTime() - 3 * 60 * 60 * 1000);
}

function isWithinWindow(): boolean {
  const brt = nowBRT();
  const hour = brt.getUTCHours();
  const dow = brt.getUTCDay();
  return dow >= 1 && dow <= 5 && hour >= 8 && hour < 18;
}

function todayBRT(): string {
  return nowBRT().toISOString().split('T')[0];
}

function randomDelayMs(minMin = 1, maxMin = 30): number {
  const minMs = minMin * 60 * 1000;
  const maxMs = maxMin * 60 * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

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
        ${t.image_url ? `
        <tr><td style="padding:0;">
          <img src="${t.image_url}" alt="" width="600" style="width:100%;max-width:600px;display:block;border:0;">
        </td></tr>` : ''}
        <tr><td style="padding:32px 40px 24px;">
          ${title ? `<h1 style="margin:0 0 16px;font-size:24px;font-weight:900;color:#111111;line-height:1.3;">${title}</h1>` : ''}
          ${body ? `<div style="font-size:15px;color:#444444;line-height:1.7;white-space:pre-line;">${body}</div>` : ''}
        </td></tr>
        ${t.cta_text && t.cta_url ? `
        <tr><td style="padding:0 40px 32px;">
          <a href="${t.cta_url}" style="display:inline-block;background:#EDAC02;color:#000000;font-weight:900;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:8px;letter-spacing:.05em;text-transform:uppercase;">${t.cta_text}</a>
        </td></tr>` : ''}
        <tr><td style="padding:20px 40px;border-top:1px solid #eeeeee;font-size:11px;color:#999999;">
          Para não receber mais emails, responda com "SAIR".
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendEmail(opts: {
  resendKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${opts.resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: opts.from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (res.ok) return { ok: true };
    const err = await res.text();
    return { ok: false, error: `Resend ${res.status}: ${err}` };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let forceCampaignId: string | null = null;
  try {
    const body = await req.json();
    forceCampaignId = body?.campaign_id || null;
  } catch { /* no body */ }

  try {
    if (!isWithinWindow() && !forceCampaignId) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Fora da janela (8h–18h seg–sex BRT)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const today = todayBRT();

    let campaignQuery = supabase.from('marketing_campaigns').select('*').eq('status', 'active');
    if (forceCampaignId) campaignQuery = campaignQuery.eq('id', forceCampaignId);

    const { data: campaigns } = await campaignQuery;
    if (!campaigns?.length) {
      return new Response(JSON.stringify({ processed: 0, message: 'Nenhuma campanha ativa' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load config once
    const { data: mktConfig } = await supabase.from('marketing_config').select('*').maybeSingle();
    const resendKey = Deno.env.get('RESEND_API_KEY') || mktConfig?.resend_api_key || '';
    const emailFrom = mktConfig?.email_from || 'UAIROX <noreply@uairox.com.br>';

    const results: any[] = [];

    for (const campaign of campaigns) {
      if (campaign.last_sent_date !== today) {
        await supabase.from('marketing_campaigns')
          .update({ sent_today: 0, last_sent_date: today })
          .eq('id', campaign.id);
        campaign.sent_today = 0;
      }

      if (campaign.sent_today >= campaign.daily_limit) {
        results.push({ campaign_id: campaign.id, skipped: true, reason: 'Limite diário atingido' });
        continue;
      }

      const { data: item } = await supabase
        .from('marketing_queue')
        .select('*')
        .eq('campaign_id', campaign.id)
        .eq('status', 'pending')
        .lte('send_after', new Date().toISOString())
        .order('send_after', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!item) {
        const { count } = await supabase
          .from('marketing_queue')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .eq('status', 'pending');
        if (count === 0) {
          await supabase.from('marketing_campaigns').update({ status: 'completed' }).eq('id', campaign.id);
          results.push({ campaign_id: campaign.id, completed: true });
        } else {
          results.push({ campaign_id: campaign.id, skipped: true, reason: 'Próximo envio agendado no futuro' });
        }
        continue;
      }

      const contactName = item.name || '';
      const variantCount = campaign.variants?.length || 1;
      const variantIdx = item.variant_index % variantCount;
      const messageVariant = campaign.variants?.[variantIdx] || '';
      const personalizedMessage = messageVariant.replace(/\{nome\}/gi, contactName);

      // ── WhatsApp ──────────────────────────────────────────────────────────
      let waOk = false;
      let waError: string | undefined;

      if (!mktConfig?.webhook_url) {
        waError = 'Webhook URL não configurada';
      } else {
        const payload = {
          trigger: campaign.trigger_name,
          nome: contactName,
          telefone: item.phone,
          email: item.email || '',
          mensagem: personalizedMessage,
        };
        try {
          const res = await fetch(mktConfig.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          waOk = res.ok;
          if (!waOk) waError = `HTTP ${res.status}`;
        } catch (e: any) {
          waError = e.message;
        }
      }

      // ── Email ─────────────────────────────────────────────────────────────
      let emailOk: boolean | null = null;
      let emailError: string | undefined;

      if (campaign.email_enabled && item.email) {
        if (!resendKey) {
          emailError = 'RESEND_API_KEY não configurada';
          emailOk = false;
        } else {
          const subject = (campaign.email_subject || '').replace(/\{nome\}/gi, contactName);
          const html = buildEmailHtml(campaign.email_template, contactName);
          const result = await sendEmail({ resendKey, from: emailFrom, to: item.email, subject, html });
          emailOk = result.ok;
          emailError = result.error;
        }
      }

      // ── Update queue ──────────────────────────────────────────────────────
      const overallOk = waOk && (emailOk === null || emailOk === true);
      await supabase.from('marketing_queue')
        .update({
          status: overallOk ? 'sent' : 'failed',
          sent_at: overallOk ? new Date().toISOString() : null,
          error_message: [waError, emailError].filter(Boolean).join(' | ') || undefined,
        })
        .eq('id', item.id);

      if (waOk) {
        await supabase.from('marketing_campaigns')
          .update({
            sent_today: campaign.sent_today + 1,
            sent_total: campaign.sent_total + 1,
            last_sent_date: today,
          })
          .eq('id', campaign.id);
        campaign.sent_today += 1;

        const delay = randomDelayMs(1, 30);
        const nextSendAfter = new Date(Date.now() + delay).toISOString();
        await supabase.from('marketing_queue')
          .update({ send_after: nextSendAfter })
          .eq('campaign_id', campaign.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(1);
      }

      results.push({
        campaign_id: campaign.id,
        queue_id: item.id,
        phone: item.phone,
        whatsapp: waOk ? 'sent' : 'failed',
        email: emailOk === null ? 'n/a' : emailOk ? 'sent' : 'failed',
        errors: [waError, emailError].filter(Boolean),
      });
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
