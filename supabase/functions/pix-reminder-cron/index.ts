import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_PIX_MESSAGES: Record<string, string> = {
  'pix2': `⏰ *LEMBRETE — {{evento}}*\n\nOlá, *{{nome}}*! Sua parcela {{parcela}} vence em *2 dias* ({{vencimento}}).\n\n💰 Valor: *{{valor}}*\n🔑 Chave PIX: {{pix}}\n\nRealize o pagamento para garantir sua vaga!\n🔖 Código: {{codigo}}`,
  'pix0': `🚨 *VENCE HOJE — {{evento}}*\n\nOlá, *{{nome}}*! Sua parcela {{parcela}} vence *hoje* ({{vencimento}}).\n\n💰 Valor: *{{valor}}*\n🔑 Chave PIX: {{pix}}\n\nPague agora para não perder sua vaga!\n🔖 Código: {{codigo}}`,
  'pix-1': `⚠️ *EM ATRASO — {{evento}}*\n\nOlá, *{{nome}}*! Sua parcela {{parcela}} está em atraso (venceu em {{vencimento}}).\n\n💰 Valor: *{{valor}}*\n🔑 Chave PIX: {{pix}}\n\nRegularize para evitar o cancelamento.\n🔖 Código: {{codigo}}`,
  'pix-5': `🔴 *ÚLTIMO AVISO — {{evento}}*\n\nOlá, *{{nome}}*! Sua inscrição será *cancelada* se o pagamento não for realizado hoje.\n\nParcela {{parcela}} em atraso desde {{vencimento}}.\n💰 Valor: *{{valor}}*\n🔑 Chave PIX: {{pix}}\n\n🔖 Código: {{codigo}}`,
};

function interpolate(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => {
    const val = vars[key];
    return val != null && val !== '' ? String(val) : '';
  });
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function diffDays(a: string, b: string): number {
  return Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const today = new Date().toISOString().split('T')[0];
    const in2days = addDays(today, 2);
    const minus1day = addDays(today, -1);
    const minus5days = addDays(today, -5);

    // Body pode trazer event_id para filtro manual
    let filterEventId: string | null = null;
    try {
      const body = await req.json();
      filterEventId = body?.event_id || null;
    } catch { /* sem body */ }

    // Busca todas as parcelas pendentes/overdue relevantes, com dados da inscrição e evento
    let query = supabase
      .from('registration_installments')
      .select(`
        id, installment_number, amount, due_date, status,
        registration_id,
        registrations!inner(
          id, athlete_name, athlete_phone, athlete_email,
          status, event_id,
          events!inner(id, title),
          categories(name),
          price_batches(pix_key)
        )
      `)
      .in('status', ['pending', 'overdue'])
      .or(`due_date.eq.${in2days},due_date.eq.${today},due_date.eq.${minus1day},due_date.lte.${minus5days}`);

    if (filterEventId) {
      query = query.eq('registrations.event_id', filterEventId);
    }

    const { data: installments, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    if (!installments || installments.length === 0) {
      return new Response(JSON.stringify({ success: true, processed: 0, message: 'Nenhuma parcela encontrada.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Agrupa configs BotConversa por event_id (evita buscar repetido)
    const eventIds = [...new Set(installments.map((i: any) => i.registrations?.event_id).filter(Boolean))];
    const configMap: Record<string, any> = {};
    for (const eid of eventIds) {
      const { data: cfg } = await supabase
        .from('botconversa_config')
        .select('*')
        .eq('event_id', eid)
        .maybeSingle();
      if (cfg) configMap[eid] = cfg;
    }

    // Busca logs de hoje para deduplicação (evitar reenvio se cron rodar 2x)
    const { data: todayLogs } = await supabase
      .from('botconversa_logs')
      .select('registration_id, trigger_type')
      .gte('created_at', today + 'T00:00:00Z');

    const alreadySent = new Set(
      (todayLogs || []).map((l: any) => `${l.registration_id}:${l.trigger_type}`)
    );

    const results: any[] = [];

    for (const inst of (installments as any[])) {
      const reg = inst.registrations;
      if (!reg) continue;
      const eventId = reg.event_id;
      const cfg = configMap[eventId];
      if (!cfg?.trigger_pix_ativo || !cfg?.trigger_pix_url) continue;

      const due = inst.due_date;
      const regStatus = reg.status;

      // Determina qual trigger disparar com base na due_date
      let triggerType: string | null = null;

      if (due === in2days && cfg.pix_lembrete_2d_ativo) {
        triggerType = 'pix2';
      } else if (due === today && cfg.pix_lembrete_venc_ativo) {
        triggerType = 'pix0';
      } else if (due === minus1day && cfg.pix_atraso_1d_ativo) {
        triggerType = 'pix-1';
      } else if (due <= minus5days && cfg.pix_cancelamento_5d_ativo) {
        triggerType = 'pix-5';
      }

      if (!triggerType) continue;
      if (regStatus === 'cancelled') continue;

      // Deduplicação
      const key = `${reg.id}:${triggerType}`;
      if (alreadySent.has(key)) continue;
      alreadySent.add(key);

      const daysLate = diffDays(due, today);
      const cfgMsgKey = triggerType === 'pix2' ? 'msg_pix_2d' : triggerType === 'pix0' ? 'msg_pix_0d' : triggerType === 'pix-1' ? 'msg_pix_1d' : 'msg_pix_5d';
      const template = cfg[cfgMsgKey] || DEFAULT_PIX_MESSAGES[triggerType] || '';
      const message = interpolate(template, {
        nome: reg.athlete_name,
        evento: reg.events?.title || eventId,
        parcela: inst.installment_number,
        valor: `R$ ${Number(inst.amount).toFixed(2).replace('.', ',')}`,
        vencimento: due,
        pix: reg.price_batches?.pix_key || '',
        codigo: reg.id?.slice(0, 8) || '',
      });
      const payload = { telefone: reg.athlete_phone, message };

      let ok = false;
      let errorMsg: string | undefined;

      try {
        const res = await fetch(cfg.trigger_pix_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        ok = res.ok;
        if (!ok) errorMsg = `HTTP ${res.status}`;
      } catch (e: any) {
        errorMsg = e.message;
      }

      // Log
      await supabase.from('botconversa_logs').insert({
        event_id: eventId,
        registration_id: reg.id,
        trigger_type: triggerType,
        webhook_url: cfg.trigger_pix_url,
        payload,
        status: ok ? 'sent' : 'failed',
        error_message: errorMsg,
      });

      // Auto-cancelar inscrição se 5 dias de atraso e opção ativada
      if (triggerType === 'pix-5' && cfg.pix_cancelar_automatico) {
        await supabase
          .from('registrations')
          .update({ status: 'cancelled' } as any)
          .eq('id', reg.id);
        await supabase
          .from('registration_installments')
          .update({ status: 'overdue' })
          .eq('registration_id', reg.id)
          .neq('status', 'paid');
      }

      results.push({ registration_id: reg.id, trigger: triggerType, status: ok ? 'sent' : 'failed' });
    }

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      results,
      date: today,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
