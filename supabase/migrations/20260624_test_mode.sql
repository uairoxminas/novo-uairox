-- ============================================================
-- UAIROX V2 - Modo Teste de Eventos
-- Execute este SQL manualmente no Supabase SQL Editor
-- ============================================================

-- Adiciona campo is_test_mode na tabela events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN DEFAULT false;

-- Adiciona campo is_test nas registrations para identificar inscrições de teste
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS is_test BOOLEAN DEFAULT false;
