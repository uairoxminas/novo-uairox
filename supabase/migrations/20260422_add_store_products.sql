-- ============================================
-- UAIROX Store Products Table
-- ============================================

CREATE TABLE IF NOT EXISTS store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  compare_price numeric,
  image_url text,
  images jsonb DEFAULT '[]'::jsonb,
  category text DEFAULT 'Geral',
  sizes jsonb DEFAULT '[]'::jsonb,
  payment_link text,
  pix_key text,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  stock_quantity integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;

-- Public read (active products only)
CREATE POLICY "Public can view active store products"
  ON store_products FOR SELECT
  USING (is_active = true);

-- Admin full access
CREATE POLICY "Admins can manage store products"
  ON store_products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Index for public queries
CREATE INDEX idx_store_products_active ON store_products(is_active, sort_order);
CREATE INDEX idx_store_products_category ON store_products(category) WHERE is_active = true;
