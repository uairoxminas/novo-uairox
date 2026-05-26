function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default async function handler(req, res) {
  try {
    const userAgent = (req.headers['user-agent'] || '').toLowerCase();
    const botPatterns = [
      'facebookexternalhit', 'facebot', 'twitterbot', 'whatsapp',
      'linkedinbot', 'slackbot', 'telegrambot', 'discordbot',
      'google-inspectiontool', 'applebot', 'bot', 'crawler',
      'spider', 'preview',
    ];

    const isBot = botPatterns.some(pattern => userAgent.includes(pattern));

    if (!isBot) {
      const html = `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/regulamento"></head><body><script>window.location.replace("/regulamento");</script></body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    const title = 'Regulamento Oficial | UAIROX Hybrid RUN';
    const description = 'Regras completas da competição UAIROX: categorias, cargas, padrões de movimento, penalidades e conduta. Leia antes de competir.';
    const image = 'https://www.uairox.com.br/og-regulamento.png';
    const canonicalUrl = 'https://www.uairox.com.br/regulamento';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />

  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1080" />
  <meta property="og:image:height" content="1080" />
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
  <meta property="og:site_name" content="UAIROX - Hybrid RUN" />
  <meta property="og:locale" content="pt_BR" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <a href="${escapeHtml(canonicalUrl)}">Acessar Regulamento</a>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    return res.status(200).send(html);

  } catch (error) {
    return res.redirect(302, '/regulamento');
  }
}
