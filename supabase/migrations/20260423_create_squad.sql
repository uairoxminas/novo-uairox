-- Create Enum for Squad Roles
CREATE TYPE squad_role AS ENUM ('coach', 'athlete', 'influencer');

-- Create Enum for Squad Tiers
CREATE TYPE squad_tier AS ENUM ('iniciante', 'bronze', 'prata', 'ouro', 'elite');

-- Create Table for Squad Members (Approved)
CREATE TABLE public.squad_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    full_name TEXT NOT NULL,
    role squad_role NOT NULL DEFAULT 'athlete',
    tier squad_tier NOT NULL DEFAULT 'iniciante',
    location TEXT,
    bio TEXT,
    instagram_handle TEXT,
    avatar_url TEXT,
    coupon_code TEXT,
    coupon_usage_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0
);

-- Create Table for Squad Applications (Form Submissions)
CREATE TABLE public.squad_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    instagram_handle TEXT NOT NULL,
    role squad_role NOT NULL,
    location TEXT NOT NULL,
    why_join TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' -- pending, approved, rejected
);

-- RLS Policies for squad_members
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "squad_members_select_policy"
ON public.squad_members FOR SELECT
USING (is_active = true);

-- RLS Policies for squad_applications
ALTER TABLE public.squad_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can insert an application (public form)
CREATE POLICY "squad_applications_insert_policy"
ON public.squad_applications FOR INSERT
WITH CHECK (true);

-- Functions and Triggers for updated_at
CREATE OR REPLACE FUNCTION update_squad_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_squad_members_updated_at
BEFORE UPDATE ON public.squad_members
FOR EACH ROW
EXECUTE FUNCTION update_squad_updated_at();
