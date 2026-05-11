export async function sendWebhook(
  url: string,
  payload: object,
  options: { maxAttempts?: number; retryDelay?: number } = {}
): Promise<{ ok: boolean; error?: string }> {
  const { maxAttempts = 3, retryDelay = 1000 } = options;
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) return { ok: true };
      // 4xx = client error (wrong URL, bad payload) — retrying won't help
      if (res.status >= 400 && res.status < 500) {
        return { ok: false, error: `HTTP ${res.status}` };
      }
      lastError = `HTTP ${res.status}`;
    } catch (err: any) {
      lastError = err?.message || 'Network error';
    }
    if (attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, retryDelay * attempt));
    }
  }
  return { ok: false, error: lastError };
}
