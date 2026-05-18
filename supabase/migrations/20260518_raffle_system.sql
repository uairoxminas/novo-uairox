-- ============================================================
-- SISTEMA DE SORTEIO UAIROX
-- ============================================================

-- Tickets numerados do sorteio
CREATE TABLE IF NOT EXISTS public.raffle_tickets (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id         UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_number    INTEGER NOT NULL,
  participant_type TEXT NOT NULL CHECK (participant_type IN ('athlete', 'squad', 'location')),
  registration_id  UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  squad_member_id  UUID REFERENCES public.squad_members(id) ON DELETE SET NULL,
  location_id      UUID REFERENCES public.training_locations(id) ON DELETE SET NULL,
  participant_name TEXT,
  participant_email TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id, ticket_number)
);

ALTER TABLE public.raffle_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "raffle_tickets_public_read" ON public.raffle_tickets FOR SELECT USING (true);
CREATE POLICY "raffle_tickets_anon_write"  ON public.raffle_tickets FOR ALL USING (true) WITH CHECK (true);

-- Vencedores sorteados
CREATE TABLE IF NOT EXISTS public.raffle_winners (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id         UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  raffle_ticket_id UUID NOT NULL REFERENCES public.raffle_tickets(id) ON DELETE CASCADE,
  prize_description TEXT,
  draw_order       INTEGER NOT NULL DEFAULT 1,
  drawn_at         TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.raffle_winners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "raffle_winners_public_read" ON public.raffle_winners FOR SELECT USING (true);
CREATE POLICY "raffle_winners_anon_write"  ON public.raffle_winners FOR ALL USING (true) WITH CHECK (true);

-- Configurações do sorteio por evento
CREATE TABLE IF NOT EXISTS public.raffle_configs (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id         UUID NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  prizes           JSONB NOT NULL DEFAULT '[]',
  is_live          BOOLEAN DEFAULT false,
  show_ticket_list BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.raffle_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "raffle_configs_public_read" ON public.raffle_configs FOR SELECT USING (true);
CREATE POLICY "raffle_configs_anon_write"  ON public.raffle_configs FOR ALL USING (true) WITH CHECK (true);

-- Função SQL: gera (ou re-gera) todos os tickets de um evento
CREATE OR REPLACE FUNCTION public.generate_raffle_tickets(p_event_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_counter INTEGER := 1;
  v_reg     RECORD;
  v_log     RECORD;
BEGIN
  -- Apaga tickets anteriores (permite re-gerar)
  DELETE FROM public.raffle_tickets WHERE event_id = p_event_id;

  -- 1. Atletas confirmados → 1 ticket cada
  FOR v_reg IN
    SELECT id, athlete_name, athlete_email
    FROM public.registrations
    WHERE event_id = p_event_id AND status = 'confirmed'
    ORDER BY created_at
  LOOP
    INSERT INTO public.raffle_tickets (
      event_id, ticket_number, participant_type,
      registration_id, participant_name, participant_email
    ) VALUES (
      p_event_id, v_counter, 'athlete',
      v_reg.id, v_reg.athlete_name, v_reg.athlete_email
    );
    v_counter := v_counter + 1;
  END LOOP;

  -- 2. Membros do Squad → 1 ticket por uso de cupom
  FOR v_log IN
    SELECT cbl.squad_member_id, sm.full_name
    FROM public.coupon_benefit_logs cbl
    JOIN public.squad_members sm ON sm.id = cbl.squad_member_id
    WHERE cbl.event_id = p_event_id AND cbl.squad_member_id IS NOT NULL
    ORDER BY cbl.created_at
  LOOP
    INSERT INTO public.raffle_tickets (
      event_id, ticket_number, participant_type,
      squad_member_id, participant_name
    ) VALUES (
      p_event_id, v_counter, 'squad',
      v_log.squad_member_id, v_log.full_name
    );
    v_counter := v_counter + 1;
  END LOOP;

  -- 3. Parceiros/Locais → 1 ticket por uso de cupom
  FOR v_log IN
    SELECT cbl.location_id, tl.name
    FROM public.coupon_benefit_logs cbl
    JOIN public.training_locations tl ON tl.id = cbl.location_id
    WHERE cbl.event_id = p_event_id AND cbl.location_id IS NOT NULL
    ORDER BY cbl.created_at
  LOOP
    INSERT INTO public.raffle_tickets (
      event_id, ticket_number, participant_type,
      location_id, participant_name
    ) VALUES (
      p_event_id, v_counter, 'location',
      v_log.location_id, v_log.name
    );
    v_counter := v_counter + 1;
  END LOOP;

  RETURN v_counter - 1;
END;
$$;
