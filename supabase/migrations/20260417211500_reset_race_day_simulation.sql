-- Reset completo do Race Day para simulação "Bandeira Branca"
-- 1. Zera todas as baterias de volta para o status inicial (Mas seta um horário inicial qualquer)
UPDATE public.heats SET status = 'pending', start_time = CURRENT_TIMESTAMP;

-- 2. Limpa os logs de leitura de chip
TRUNCATE TABLE public.race_splits CASCADE;

-- 3. Limpa qualquer punição feita no radar
TRUNCATE TABLE public.race_penalties CASCADE;

-- 4. Limpa os resultados já salvos (se houver)
TRUNCATE TABLE public.race_results CASCADE;
