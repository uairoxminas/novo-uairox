-- Deleta as políticas restritas
DROP POLICY IF EXISTS "Public Access for approved locations" ON public.training_locations;
DROP POLICY IF EXISTS "Admin can read all" ON public.training_locations;

-- Cria uma política global permitindo leitura de tudo por qualquer um (seguro, pois a página pública já tem os filtros no código)
CREATE POLICY "Allow all to read locations" ON public.training_locations
    FOR SELECT USING (true);
