export const DEFAULT_MESSAGES = {
  inscricao: `✅ *INSCRIÇÃO RECEBIDA — {{evento}}*

Olá, *{{nome}}*! Sua inscrição foi registrada com sucesso.

📋 *Detalhes*
• Categoria: {{categoria}}
• Camisa: {{camisa}}
• Total: {{total}}

🔑 *Chave PIX:*
{{pix}}
Copie a chave, abra seu banco e realize o pagamento.

📲 Grupo oficial: {{grupo}}

🔖 Código: {{codigo}}`,

  confirmado: `✅ *PAGAMENTO CONFIRMADO — {{evento}}*

Olá, *{{nome}}*! Seu pagamento foi confirmado com sucesso.

Você está oficialmente inscrito(a)!
• Evento: {{evento}}
• Categoria: {{categoria}}
• Código: {{codigo}}

📲 Grupo oficial: {{grupo}}

Até a largada! 🏃`,

  cancelado: `❌ *INSCRIÇÃO CANCELADA — {{evento}}*

Olá, *{{nome}}*. Sua inscrição em *{{evento}}* ({{categoria}}) foi cancelada.

Código: {{codigo}}

Em caso de dúvidas, entre em contato conosco.`,

  pix_2d: `⏰ *LEMBRETE — {{evento}}*

Olá, *{{nome}}*! Sua parcela {{parcela}} vence em *2 dias* ({{vencimento}}).

💰 Valor: *{{valor}}*
🔑 Chave PIX: {{pix}}

Realize o pagamento para garantir sua vaga!
🔖 Código: {{codigo}}`,

  pix_0d: `🚨 *VENCE HOJE — {{evento}}*

Olá, *{{nome}}*! Sua parcela {{parcela}} vence *hoje* ({{vencimento}}).

💰 Valor: *{{valor}}*
🔑 Chave PIX: {{pix}}

Pague agora para não perder sua vaga!
🔖 Código: {{codigo}}`,

  pix_1d: `⚠️ *EM ATRASO — {{evento}}*

Olá, *{{nome}}*! Sua parcela {{parcela}} está em atraso (venceu em {{vencimento}}).

💰 Valor: *{{valor}}*
🔑 Chave PIX: {{pix}}

Regularize para evitar o cancelamento.
🔖 Código: {{codigo}}`,

  pix_5d: `🔴 *ÚLTIMO AVISO — {{evento}}*

Olá, *{{nome}}*! Sua inscrição será *cancelada* se o pagamento não for realizado hoje.

Parcela {{parcela}} em atraso desde {{vencimento}}.
💰 Valor: *{{valor}}*
🔑 Chave PIX: {{pix}}

🔖 Código: {{codigo}}`,
};

export function interpolate(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key];
    return val != null && val !== '' ? String(val) : '';
  });
}
