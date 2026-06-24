-- Trava de publicação dos resultados: a categoria só aparece no /leaderboard
-- depois que o organizador clica em "Liberar premiação" (Race Day → Premiação).
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS results_published BOOLEAN DEFAULT false;
