-- ============================================================
-- RFID — Correção de RLS para permitir INSERT/UPDATE pelo painel admin
-- O painel admin é protegido por senha no frontend (PanelGate) e NÃO faz
-- login no Supabase, então opera com o papel `anon`. As políticas RFID
-- originais exigiam `authenticated` / auth.uid() IS NOT NULL, bloqueando
-- todas as escritas do painel. Aqui liberamos para todos os papéis
-- (USING true / WITH CHECK true), alinhado ao modelo do restante do app.
-- A escrita real do hardware continua via edge function (service_role).
-- ============================================================

-- rfid_tags
DROP POLICY IF EXISTS "rfid_tags_authenticated_select" ON public.rfid_tags;
DROP POLICY IF EXISTS "rfid_tags_authenticated_all"    ON public.rfid_tags;
DROP POLICY IF EXISTS "rfid_tags_all_authenticated"    ON public.rfid_tags;
CREATE POLICY "rfid_tags_all" ON public.rfid_tags
  FOR ALL USING (true) WITH CHECK (true);

-- rfid_tag_assignments
DROP POLICY IF EXISTS "rfid_assignments_authenticated_select" ON public.rfid_tag_assignments;
DROP POLICY IF EXISTS "rfid_assignments_authenticated_all"    ON public.rfid_tag_assignments;
DROP POLICY IF EXISTS "rfid_assignments_all_authenticated"    ON public.rfid_tag_assignments;
CREATE POLICY "rfid_assignments_all" ON public.rfid_tag_assignments
  FOR ALL USING (true) WITH CHECK (true);

-- rfid_antennas
DROP POLICY IF EXISTS "rfid_antennas_authenticated_select" ON public.rfid_antennas;
DROP POLICY IF EXISTS "rfid_antennas_authenticated_all"    ON public.rfid_antennas;
DROP POLICY IF EXISTS "rfid_antennas_all_authenticated"    ON public.rfid_antennas;
CREATE POLICY "rfid_antennas_all" ON public.rfid_antennas
  FOR ALL USING (true) WITH CHECK (true);

-- rfid_reads — leitura pelo painel; a edge function (service_role) ignora RLS
DROP POLICY IF EXISTS "rfid_reads_authenticated_select" ON public.rfid_reads;
DROP POLICY IF EXISTS "rfid_reads_select_authenticated"  ON public.rfid_reads;
CREATE POLICY "rfid_reads_select" ON public.rfid_reads
  FOR SELECT USING (true);
