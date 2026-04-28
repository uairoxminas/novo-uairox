-- =============================================
-- PANEL PASSWORDS — Autenticação por senha para painéis operacionais
-- =============================================

CREATE TABLE IF NOT EXISTS public.panel_passwords (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    panel TEXT NOT NULL UNIQUE CHECK (panel IN ('admin', 'judge', 'headjudge', 'finaljudge')),
    password TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Senha padrão para todos os painéis: 2026
INSERT INTO public.panel_passwords (panel, password) VALUES
    ('admin', '2026'),
    ('judge', '2026'),
    ('headjudge', '2026'),
    ('finaljudge', '2026')
ON CONFLICT (panel) DO NOTHING;

-- RLS: leitura pública para validação, escrita pública (admin gerencia via frontend)
ALTER TABLE public.panel_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read panel_passwords" ON public.panel_passwords
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow public update panel_passwords" ON public.panel_passwords
    FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow authenticated read panel_passwords" ON public.panel_passwords
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated update panel_passwords" ON public.panel_passwords
    FOR UPDATE TO authenticated USING (true);
