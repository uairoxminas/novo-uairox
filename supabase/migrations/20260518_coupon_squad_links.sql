-- Link coupons to squad members or training locations
ALTER TABLE public.discount_coupons
  ADD COLUMN IF NOT EXISTS squad_member_id UUID REFERENCES public.squad_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_id     UUID REFERENCES public.training_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS benefit_description TEXT;

-- Give training locations a fixed coupon code
ALTER TABLE public.training_locations
  ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- Track each use of a squad/partner coupon
CREATE TABLE IF NOT EXISTS public.coupon_benefit_logs (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id           UUID NOT NULL REFERENCES public.discount_coupons(id) ON DELETE CASCADE,
  registration_id     UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  event_id            UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  squad_member_id     UUID REFERENCES public.squad_members(id) ON DELETE SET NULL,
  location_id         UUID REFERENCES public.training_locations(id) ON DELETE SET NULL,
  athlete_name        TEXT,
  athlete_email       TEXT,
  coupon_code         TEXT NOT NULL,
  benefit_description TEXT,
  discount_applied    DECIMAL(10,2),
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.coupon_benefit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "benefit_logs_auth_read"   ON public.coupon_benefit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "benefit_logs_anon_insert" ON public.coupon_benefit_logs FOR INSERT WITH CHECK (true);
