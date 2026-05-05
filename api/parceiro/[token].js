const SUPABASE_URL = 'https://dhetcnkvgtuatcchropm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZXRjbmt2Z3R1YXRjY2hyb3BtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NzAzNzMsImV4cCI6MjA5MTM0NjM3M30.5JA4vx2PN1kePf9L9qMp23ogORXhRnqZmtzw0BMJ8xs';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req, res) {
  const { token } = req.query;
  const tokenStr = Array.isArray(token) ? token[0] : token;

  if (!tokenStr) {
    return res.redirect(302, '/');
  }

  try {
    // Fetch partner link from Supabase
    const linkUrl = `${SUPABASE_URL}/rest/v1/event_partner_links?select=id,event_id,token,label,revoked_at&token=eq.${encodeURIComponent(tokenStr)}&limit=1`;
    const linkRes = await fetch(linkUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    const links = await linkRes.json();
    const link = links?.[0];

    if (!link || link.revoked_at) {
      return res.redirect(302, `/parceiro/${tokenStr}`);
    }

    // Fetch event info
    const eventUrl = `${SUPABASE_URL}/rest/v1/events?select=id,title,date,location,image_url&id=eq.${link.event_id}&limit=1`;
    const eventRes = await fetch(eventUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    const events = await eventRes.json();
    const event = events?.[0];

    // Bot check
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const botPatterns = [
      'facebookexternalhit', 'facebot', 'twitterbot', 'whatsapp',
      'linkedinbot', 'slackbot', 'telegrambot', 'discordbot',
      'google-inspectiontool', 'applebot', 'bot', 'crawler',
      'spider', 'preview',
    ];
    const isBot = botPatterns.some(p => userAgent.includes(p));

    if (!isBot) {
      const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/parceiro/${escapeHtml(tokenStr)}"></head><body><script>window.location.replace("/parceiro/${escapeHtml(tokenStr)}");</script></body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    // Bot → serve OG tags
    const eventTitle = event?.title || 'UAIROX';
    const partnerLabel = link.label || 'Parceiro';
    const title = `${eventTitle} — Painel do ${partnerLabel}`;
    const description = `Acompanhe as inscrições de ${eventTitle} em tempo real. Painel exclusivo do parceiro.`;
    const ogImage = 'https://www.uairox.com.br/og-parceiro.png';
    const canonicalUrl = `https://www.uairox.com.br/parceiro/${tokenStr}`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} | UAIROX</title>
  <meta name="description" content="${escapeHtml(description)}" />
  
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:site_name" content="UAIROX - Hybrid RUN" />
  
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <img src="${escapeHtml(ogImage)}" alt="${escapeHtml(title)}" />
  <a href="${escapeHtml(canonicalUrl)}">Acessar painel</a>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.status(200).send(html);

  } catch (error) {
    return res.redirect(302, `/parceiro/${tokenStr}`);
  }
}
