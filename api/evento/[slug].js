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
  const { slug, isCronograma } = req.query;
  const idOrSlug = Array.isArray(slug) ? slug[0] : slug;
  
  if (!idOrSlug) {
    return res.redirect(302, '/');
  }

  try {
    // Detect if it's a UUID or slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    
    // Fetch from Supabase REST API directly (no SDK needed in serverless)
    const column = isUUID ? 'id' : 'slug';
    const supabaseUrl = `${SUPABASE_URL}/rest/v1/events?select=id,title,description,image_url,date,location,slug&${column}=eq.${encodeURIComponent(idOrSlug)}&limit=1`;
    
    const response = await fetch(supabaseUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    
    const events = await response.json();
    const event = events?.[0];
    
    if (!event) {
      // No event found, redirect to SPA to show 404
      return res.redirect(302, `/evento/${idOrSlug}`);
    }

    // Check if the requester is a bot
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const botPatterns = [
      'facebookexternalhit', 'facebot', 'twitterbot', 'whatsapp',
      'linkedinbot', 'slackbot', 'telegrambot', 'discordbot',
      'google-inspectiontool', 'applebot', 'bot', 'crawler',
      'spider', 'preview',
    ];
    
    const isBot = botPatterns.some(pattern => userAgent.includes(pattern));
    
    if (!isBot) {
      // Real user somehow hit the API → client-side redirect to prevent infinite loops
      const redirectPath = `/evento/${escapeHtml(idOrSlug)}${isCronograma ? '/cronograma' : ''}`;
      const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${redirectPath}"></head><body><script>window.location.replace("${redirectPath}");</script></body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    // It's a bot → serve HTML with rich OG tags
    const titleBase = event.title || 'UAIROX - Hybrid RUN';
    const title = isCronograma ? `⚠️ CRONOGRAMA DAS PROVAS - ${titleBase}` : titleBase;
    
    const rawDesc = event.description || 'A maior competição de fitness híbrido do Brasil.';
    const descriptionBase = rawDesc.length > 160 ? rawDesc.substring(0, 157) + '...' : rawDesc;
    const image = event.image_url || 'https://uairox.com.br/logo-uairox.png';
    const canonicalUrl = `https://www.uairox.com.br/evento/${event.slug || event.id}${isCronograma ? '/cronograma' : ''}`;
    
    let dateStr = '';
    if (event.date) {
      try {
        dateStr = new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      } catch(e) {}
    }
    
    let fullDescription = '';
    if (isCronograma) {
      fullDescription = `- Não haverá mudança de horários / equipes\n- Confira se o seu nome ou da sua equipe estão corretos\n- Cheque no mínimo 30-60 minutos antes da sua largada\nEm caso de atraso o atleta está desclassificado`;
    } else {
      fullDescription = `${descriptionBase}${dateStr ? ` · 📅 ${dateStr}` : ''}${event.location ? ` · 📍 ${event.location}` : ''}`;
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} | UAIROX</title>
  <meta name="description" content="${escapeHtml(fullDescription)}" />
  
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(fullDescription)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:site_name" content="UAIROX - Hybrid RUN" />
  
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(fullDescription)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(fullDescription)}</p>
  <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" />
  <a href="${escapeHtml(canonicalUrl)}">Ver evento</a>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    return res.status(200).send(html);
    
  } catch (error) {
    // On error, redirect to SPA
    return res.redirect(302, `/evento/${idOrSlug}`);
  }
}
