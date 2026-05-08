-- Trava de lotes e desconto específico por lote nos cupons
CREATE TABLE IF NOT EXISTS public.coupon_batch_rules (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id   UUID NOT NULL REFERENCES public.discount_coupons(id) ON DELETE CASCADE,
  batch_id    UUID NOT NULL REFERENCES public.price_batches(id)    ON DELETE CASCADE,
  -- Opcional: sobrescreve o desconto base do cupom para este lote
  discount_type  VARCHAR(20),  -- 'percentage' | 'fixed' | null (usa o do cupom)
  discount_value NUMERIC,      -- null = usa o valor base do cupom
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(coupon_id, batch_id)
);

ALTER TABLE public.coupon_batch_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_coupon_batch_rules"  ON public.coupon_batch_rules FOR SELECT TO anon        USING (true);
CREATE POLICY "anon_insert_coupon_batch_rules"  ON public.coupon_batch_rules FOR INSERT TO anon        WITH CHECK (true);
CREATE POLICY "anon_delete_coupon_batch_rules"  ON public.coupon_batch_rules FOR DELETE TO anon        USING (true);
CREATE POLICY "auth_select_coupon_batch_rules"  ON public.coupon_batch_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_coupon_batch_rules"  ON public.coupon_batch_rules FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_delete_coupon_batch_rules"  ON public.coupon_batch_rules FOR DELETE TO authenticated USING (true);
