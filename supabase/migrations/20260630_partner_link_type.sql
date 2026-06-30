-- Tipo do link de parceiro: 'inscricoes' (padrão, view de inscrições) ou
-- 'financeiro' (relatório financeiro para sócios). Reaproveita event_partner_links
-- (token auto-gerado + revoked_at) com separação por tipo.
ALTER TABLE public.event_partner_links ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'inscricoes';
