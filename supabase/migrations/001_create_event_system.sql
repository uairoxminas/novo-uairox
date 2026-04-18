-- ============================================================
-- UAIROX V2 - Event System Base Tables
-- Run this SQL in the Supabase SQL Editor
-- ============================================================

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    location TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'open', 'closed', 'completed')),
    race_status TEXT DEFAULT 'idle',
    checkin_method TEXT DEFAULT 'staff_only',
    partner_payment_link TEXT,
    partner_payment_link_with_kit TEXT,
    whatsapp_group_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    race_type_id UUID,
    stage_id UUID,
    team_size INTEGER DEFAULT 1,
    gender_requirement TEXT DEFAULT 'any',
    age_type TEXT DEFAULT 'livre',
    min_age INTEGER,
    max_age INTEGER,
    mixed_config JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_stages table
CREATE TABLE IF NOT EXISTS public.event_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    distance_meters INTEGER,
    lap_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create heats table
CREATE TABLE IF NOT EXISTS public.heats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    start_time TEXT NOT NULL,
    lane_count INTEGER DEFAULT 8,
    status TEXT DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create registrations table
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
    heat_id UUID REFERENCES public.heats(id) ON DELETE SET NULL,
    kit_id UUID,
    team_id UUID,
    race_type_id UUID,
    imported_athlete_id UUID,
    batch_id UUID,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    bib_number INTEGER,
    total_paid DECIMAL(10, 2) DEFAULT 0,
    payment_method TEXT,
    coupon_id UUID,
    start_time TEXT,
    pix_receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create registration_teams table  
CREATE TABLE IF NOT EXISTS public.registration_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name TEXT,
    captain_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create price_batches table
CREATE TABLE IF NOT EXISTS public.price_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    category_id UUID,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    max_registrations INTEGER,
    active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    pix_key TEXT,
    payment_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create discount_coupons table
CREATE TABLE IF NOT EXISTS public.discount_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    code TEXT NOT NULL,
    discount_type TEXT NOT NULL DEFAULT 'percentage',
    discount_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
    coupon_type TEXT,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    active BOOLEAN DEFAULT true,
    payment_link TEXT,
    payment_link_with_kit TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create athlete_kits table
CREATE TABLE IF NOT EXISTS public.athlete_kits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    items JSONB DEFAULT '[]',
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create heat_lane_assignments table
CREATE TABLE IF NOT EXISTS public.heat_lane_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    heat_id UUID REFERENCES public.heats(id) ON DELETE CASCADE NOT NULL,
    lane_number INTEGER NOT NULL,
    registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS POLICIES - Allow public read, anon insert for registrations
-- ============================================================

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.heat_lane_assignments ENABLE ROW LEVEL SECURITY;

-- Events: public read, auth write
CREATE POLICY "events_public_read" ON public.events FOR SELECT USING (true);
CREATE POLICY "events_auth_write" ON public.events FOR ALL USING (true);

-- Categories: public read
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_auth_write" ON public.categories FOR ALL USING (true);

-- Event Stages: public read
CREATE POLICY "stages_public_read" ON public.event_stages FOR SELECT USING (true);
CREATE POLICY "stages_auth_write" ON public.event_stages FOR ALL USING (true);

-- Heats: public read
CREATE POLICY "heats_public_read" ON public.heats FOR SELECT USING (true);
CREATE POLICY "heats_auth_write" ON public.heats FOR ALL USING (true);

-- Registrations: public read (for leaderboard), anon insert (no login required)
CREATE POLICY "registrations_public_read" ON public.registrations FOR SELECT USING (true);
CREATE POLICY "registrations_anon_insert" ON public.registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "registrations_auth_write" ON public.registrations FOR ALL USING (true);

-- Teams: public read
CREATE POLICY "teams_public_read" ON public.registration_teams FOR SELECT USING (true);
CREATE POLICY "teams_anon_insert" ON public.registration_teams FOR INSERT WITH CHECK (true);
CREATE POLICY "teams_auth_write" ON public.registration_teams FOR ALL USING (true);

-- Price Batches: public read
CREATE POLICY "batches_public_read" ON public.price_batches FOR SELECT USING (true);
CREATE POLICY "batches_auth_write" ON public.price_batches FOR ALL USING (true);

-- Coupons: public read
CREATE POLICY "coupons_public_read" ON public.discount_coupons FOR SELECT USING (true);
CREATE POLICY "coupons_auth_write" ON public.discount_coupons FOR ALL USING (true);

-- Kits: public read
CREATE POLICY "kits_public_read" ON public.athlete_kits FOR SELECT USING (true);
CREATE POLICY "kits_auth_write" ON public.athlete_kits FOR ALL USING (true);

-- Lane assignments: public read
CREATE POLICY "lanes_public_read" ON public.heat_lane_assignments FOR SELECT USING (true);
CREATE POLICY "lanes_auth_write" ON public.heat_lane_assignments FOR ALL USING (true);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- auto-update updated_at on events
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS events_updated_at ON public.events;
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
