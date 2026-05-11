import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Brazil timezone offset = UTC-3
function nowBRT(): Date {
  const now = new Date();
  return new Date(now.getTime() - 3 * 60 * 60 * 1000);
}

function isWithinWindow(): boolean {
  const brt = nowBRT();
  const hour = brt.getUTCHours();
  const dow = brt.getUTCDay(); // 0=Sun, 6=Sat
  const isWeekday = dow >= 1 && dow <= 5;
  const isInHours = hour >= 8 && hour < 18;
  return isWeekday && isInHours;
}

function todayBRT(): string {
  return nowBRT().toISOString().split('T')[0];
}

// Random delay in milliseconds between minMin and maxMin minutes
function randomDelayMs(minMin = 1, maxMin = 30): number {
  const minMs = minMin * 60 * 1000;
  const maxMs = maxMin * 60 * 1000;
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Allow manual trigger with campaign_id override
  let forceCampaignId: string | null = null;
  try {
    const body = await req.json();
    forceCampaignId = body?.campaign_id || null;
  } catch { /* no body */ }

  try {
    if (!isWithinWindow() && !forceCampaignId) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Fora da janela de envio (8h–18h seg–sex BRT)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const today = todayBRT();

    // Load active campaigns
    let campaignQuery = supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('status', 'active');

    if (forceCampaignId) {
      campaignQuery = campaignQuery.eq('id', forceCampaignId);
    }

    const { data: campaigns } = await campaignQuery;
    if (!campaigns?.length) {
      return new Response(JSON.stringify({ processed: 0, message: 'Nenhuma campanha ativa' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const results: any[] = [];

    for (const campaign of campaigns) {
      // Reset sent_today counter if new day
      if (campaign.last_sent_date !== today) {
        await supabase.from('marketing_campaigns')
          .update({ sent_today: 0, last_sent_date: today })
          .eq('id', campaign.id);
        campaign.sent_today = 0;
      }

      // Check daily limit
      if (campaign.sent_today >= campaign.daily_limit) {
        results.push({ campaign_id: campaign.id, skipped: true, reason: 'Limite diário atingido' });
        continue;
      }

      // Find next pending item whose send_after is due
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
        // Check if all items are done → complete campaign
        const { count } = await supabase
          .from('marketing_queue')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .eq('status', 'pending');

        if (count === 0) {
          await supabase.from('marketing_campaigns')
            .update({ status: 'completed' })
            .eq('id', campaign.id);
          results.push({ campaign_id: campaign.id, completed: true });
        } else {
          results.push({ campaign_id: campaign.id, skipped: true, reason: 'Próximo envio agendado no futuro' });
        }
        continue;
      }

      // Build payload
      const variantCount = campaign.variants?.length || 1;
      const variantIdx = item.variant_index % variantCount;
      const messageVariant = campaign.variants?.[variantIdx] || '';

      const payload: Record<string, any> = {
        trigger: campaign.trigger_name,
        nome: item.name || '',
        telefone: item.phone,
        email: item.email || '',
        mensagem: messageVariant,
      };

      // Send webhook (marketing_config)
      const { data: mktConfig } = await supabase
        .from('marketing_config')
        .select('webhook_url')
        .maybeSingle();

      let ok = false;
      let errorMsg: string | undefined;

      if (!mktConfig?.webhook_url) {
        errorMsg = 'Webhook URL não configurada';
      } else {
        try {
          const res = await fetch(mktConfig.webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          ok = res.ok;
          if (!ok) errorMsg = `HTTP ${res.status}`;
        } catch (e: any) {
          errorMsg = e.message;
        }
      }

      // Update queue item
      await supabase.from('marketing_queue')
        .update({
          status: ok ? 'sent' : 'failed',
          sent_at: ok ? new Date().toISOString() : null,
          error_message: errorMsg,
        })
        .eq('id', item.id);

      if (ok) {
        // Update campaign counters
        await supabase.from('marketing_campaigns')
          .update({
            sent_today: campaign.sent_today + 1,
            sent_total: campaign.sent_total + 1,
            last_sent_date: today,
          })
          .eq('id', campaign.id);
        campaign.sent_today += 1;

        // Schedule next pending item with random delay
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
        status: ok ? 'sent' : 'failed',
        error: errorMsg,
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
