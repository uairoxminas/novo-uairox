import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

function getSupabase() {
  return createClient(
    process.env.VITE_SUPABASE_URL || 'https://dhetcnkvgtuatcchropm.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
  };

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { event_ids } = await req.json();

    if (!event_ids?.length) {
      return new Response(JSON.stringify({ error: 'Selecione ao menos um evento' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error('GEMINI_API_KEY não configurada no Vercel');

    // Fetch event details
    const supabase = getSupabase();
    const { data: events, error } = await supabase
      .from('events')
      .select('title, date, location, description, status')
      .in('id', event_ids);

    if (error) throw error;
    if (!events?.length) throw new Error('Nenhum evento encontrado com os IDs fornecidos');

    const eventsText = events.map((ev, i) => {
      const dateStr = new Date(ev.date).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
      });
      return `Evento ${i + 1}: ${ev.title} — ${dateStr} — ${ev.location}${ev.description ? ' — ' + ev.description : ''}`;
    }).join('\n');

    const prompt = `Você é especialista em marketing de eventos fitness e CrossFit no Brasil, representando a UAIROX - Hybrid Run.

Crie UMA mensagem de convite para WhatsApp com base nos eventos abaixo.
A mensagem será enviada para pessoas que JÁ responderam uma saudação inicial, então elas estão receptivas.

Regras:
- Tom amigável, animado e direto — como se fosse o próprio organizador escrevendo
- Máximo de 6 linhas
- Mencione os eventos de forma natural (nome, data, local)
- Inclua uma chamada para ação clara (inscreva-se, garanta sua vaga, etc.)
- Use emojis com moderação
- Use {nome} para personalizar (ex: "E aí {nome}!")
- NÃO inclua links (serão adicionados pelo BotConversa)
- Linguagem brasileira natural e envolvente

Eventos a divulgar:
${eventsText}

Retorne APENAS a mensagem final, sem explicações, sem aspas, sem markdown.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.85, maxOutputTokens: 512 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      throw new Error('Gemini API error: ' + err);
    }

    const data = await geminiRes.json();
    const message = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!message) throw new Error('Gemini não retornou uma mensagem válida');

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
