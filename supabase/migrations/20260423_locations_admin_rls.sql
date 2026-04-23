-- Criar a política que permite o Admin ver TODOS os parceiros (inclusive os pendentes e rejeitados)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'training_locations' AND policyname = 'Admin can read all'
    ) THEN
        CREATE POLICY "Admin can read all" ON public.training_locations
            FOR SELECT TO authenticated USING (true);
    END IF;
END
$$;
