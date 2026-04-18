-- Correção RLS para permitir INSERT (Adicionando WITH CHECK)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.race_heats;
DROP POLICY IF EXISTS "Ativacao Total para Admins" ON public.race_heats;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.race_checkpoints;
DROP POLICY IF EXISTS "Ativacao Total para Admins" ON public.race_checkpoints;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.race_penalties;
DROP POLICY IF EXISTS "Ativacao Total para Admins" ON public.race_penalties;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.race_splits;
DROP POLICY IF EXISTS "Ativacao Total para Admins" ON public.race_splits;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.race_results;
DROP POLICY IF EXISTS "Ativacao Total para Admins" ON public.race_results;

CREATE POLICY "Ativacao Total para Admins" ON public.race_checkpoints FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Ativacao Total para Admins" ON public.race_penalties FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Ativacao Total para Admins" ON public.race_splits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Ativacao Total para Admins" ON public.race_results FOR ALL TO authenticated USING (true) WITH CHECK (true);
