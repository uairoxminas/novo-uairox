-- Libera a trava de RLS pra leitura das lanes e inscrições na tela do Admin
ALTER TABLE public.heat_lane_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations DISABLE ROW LEVEL SECURITY;
