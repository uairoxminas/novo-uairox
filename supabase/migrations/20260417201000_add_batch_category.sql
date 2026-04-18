-- Migration: Add category_id to price_batches to allow per-category batches

ALTER TABLE public.price_batches 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE;

-- Note: When category_id is NULL, the batch applies to all categories. 
-- When category_id is set, the batch only applies to that specific category.
