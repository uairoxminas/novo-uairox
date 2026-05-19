import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'content-type',
};

webPush.setVapidDetails(
  'mailto:leobergconsultoria@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type, registration_id } = body;

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || 'https://dhetcnkvgtuatcchropm.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Fetch push subscriptions for the target athlete
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('registration_id', registration_id);

    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no subscriptions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build notification payload
    let payload;
    if (type === 'reaction') {
      const { reactor_name, emoji } = body;
      payload = {
        title: 'UAIROX Desafio 💪',
        body: `${reactor_name} reagiu com ${emoji} ao seu treino!`,
        tag: 'uairox-reaction',
      };
    } else if (type === 'milestone') {
      const { milestone, name } = body;
      const msgs = {
        10: `🎉 Incrível! ${name} completou 10 treinos!`,
        20: `🔥 ${name} chegou a 20 treinos! Falta pouco!`,
        30: `🏆 ${name} completou 30 treinos e está no SORTEIO!`,
      };
      payload = {
        title: 'UAIROX Desafio — Marco!',
        body: msgs[milestone] ?? `${name} atingiu ${milestone} treinos!`,
        tag: `uairox-milestone-${milestone}`,
      };
    } else {
      payload = { title: body.title ?? 'UAIROX', body: body.body ?? '', tag: 'uairox' };
    }

    // Send to all subscriptions of that athlete
    let sent = 0;
    await Promise.allSettled(
      subs.map(async sub => {
        try {
          await webPush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload)
          );
          sent++;
        } catch (err) {
          // 410 Gone = subscription expired, clean it up
          if (err.statusCode === 410) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
        }
      })
    );

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
