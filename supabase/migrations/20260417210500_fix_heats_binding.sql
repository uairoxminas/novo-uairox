-- Corrigindo o apontamento: Usar a tabela 'heats' originária invés de 'race_heats'

-- 1. Remove dependências
ALTER TABLE public.race_splits DROP CONSTRAINT IF EXISTS race_splits_heat_id_fkey;
ALTER TABLE public.race_results DROP CONSTRAINT IF EXISTS race_results_heat_id_fkey;

-- 2. Limpa a tabela fantasma que criamos na etapa anterior
DROP TABLE IF EXISTS public.race_heats CASCADE;

-- 3. Aponta o Heart e o Result pro banco de baterias verdadeiro
ALTER TABLE public.race_splits
  ADD CONSTRAINT race_splits_heat_id_fkey 
  FOREIGN KEY (heat_id) REFERENCES public.heats(id) ON DELETE CASCADE;

ALTER TABLE public.race_results
  ADD CONSTRAINT race_results_heat_id_fkey 
  FOREIGN KEY (heat_id) REFERENCES public.heats(id) ON DELETE CASCADE;
