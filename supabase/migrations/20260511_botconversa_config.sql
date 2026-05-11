-- Configuração de webhooks BotConversa por evento
CREATE TABLE IF NOT EXISTS public.botconversa_config (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id                  UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  UNIQUE(event_id),

  -- Trigger 1: Inscrição realizada (status=pendente)
  trigger_inscricao_ativo   BOOLEAN DEFAULT false,
  trigger_inscricao_url     TEXT,

  -- Trigger 2: Pagamento confirmado
  trigger_confirmado_ativo  BOOLEAN DEFAULT false,
  trigger_confirmado_url    TEXT,

  -- Trigger 3: Inscrição cancelada
  trigger_cancelado_ativo   BOOLEAN DEFAULT false,
  trigger_cancelado_url     TEXT,

  -- Trigger 4: PIX parcelado — régua de cobranças (URL única, payload indica o tipo)
  trigger_pix_ativo         BOOLEAN DEFAULT false,
  trigger_pix_url           TEXT,
  pix_lembrete_2d_ativo     BOOLEAN DEFAULT true,
  pix_lembrete_venc_ativo   BOOLEAN DEFAULT true,
  pix_atraso_1d_ativo       BOOLEAN DEFAULT true,
  pix_cancelamento_5d_ativo BOOLEAN DEFAULT true,
  pix_cancelar_automatico   BOOLEAN DEFAULT false,  -- cancela a inscrição automaticamente aos 5 dias

  -- Trigger 5: Broadcast (URL para envios manuais)
  trigger_broadcast_url     TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.botconversa_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_botconversa_config" ON public.botconversa_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_botconversa_config" ON public.botconversa_config
  FOR SELECT TO anon USING (true);
