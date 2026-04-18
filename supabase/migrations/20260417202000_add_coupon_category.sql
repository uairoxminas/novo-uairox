-- Migration: Add category_id to discount_coupons to allow per-category coupons

ALTER TABLE public.discount_coupons 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE;

-- Note: When category_id is NULL, the coupon applies to all categories. 
-- When category_id is set, the coupon only works if the registration is for that specific category.
