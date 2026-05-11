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
    const { base_message, context } = await req.json();

    if (!base_message?.trim()) {
      return new Response(JSON.stringify({ error: 'base_message é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) throw new Error('GEMINI_API_KEY não configurada');

    const prompt = `Você é especialista em marketing de eventos fitness e CrossFit no Brasil.

Crie EXATAMENTE 10 variações de mensagem para WhatsApp com base na mensagem abaixo.
Regras:
- Mantenha o mesmo objetivo/chamada para ação da mensagem original
- Cada variação deve ter ESTRUTURA diferente (emojis diferentes, ordem diferente, tom diferente)
- Algumas mais formais, algumas mais descontraídas, algumas com mais urgência
- Máximo de 4 linhas cada
- Use linguagem brasileira natural
- NÃO mencione "clique aqui" ou links
- O campo {nome} pode aparecer no início de algumas mensagens
- Contexto do evento: ${context || 'Evento de CrossFit/Fitness'}

Mensagem base:
${base_message}

Retorne APENAS um JSON array válido com exatamente 10 strings. Sem explicações, sem markdown, apenas o array JSON puro.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      throw new Error(`Gemini API error: ${err}`);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON array from response (Gemini sometimes wraps in ```json blocks)
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Gemini não retornou um array JSON válido');

    const variants: string[] = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(variants) || variants.length === 0) {
      throw new Error('Resposta inválida do Gemini');
    }

    return new Response(JSON.stringify({ variants: variants.slice(0, 10) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
