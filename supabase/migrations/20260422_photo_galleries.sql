-- ============================================
-- UAIROX Photo Galleries System
-- ============================================

-- 1. Galerias por evento
CREATE TABLE IF NOT EXISTS photo_galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_image_url text,
  price_single numeric NOT NULL DEFAULT 29.90,
  price_pack_5 numeric NOT NULL DEFAULT 99.90,
  price_all numeric NOT NULL DEFAULT 149.90,
  pix_key text,
  payment_link text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Fotos individuais
CREATE TABLE IF NOT EXISTS gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES photo_galleries(id) ON DELETE CASCADE,
  bib_number text,
  drive_file_id text NOT NULL,
  caption text,
  photographer text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Compras de fotos
CREATE TABLE IF NOT EXISTS photo_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES photo_galleries(id) ON DELETE CASCADE,
  buyer_name text NOT NULL,
  buyer_email text,
  buyer_phone text,
  bib_number text,
  package_type text NOT NULL DEFAULT 'single',
  selected_photo_ids jsonb DEFAULT '[]'::jsonb,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'pix',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE photo_galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "photo_galleries_public_read" ON photo_galleries FOR SELECT USING (true);
CREATE POLICY "photo_galleries_auth_write" ON photo_galleries FOR ALL USING (true);

CREATE POLICY "gallery_photos_public_read" ON gallery_photos FOR SELECT USING (true);
CREATE POLICY "gallery_photos_auth_write" ON gallery_photos FOR ALL USING (true);

CREATE POLICY "photo_purchases_public_read" ON photo_purchases FOR SELECT USING (true);
CREATE POLICY "photo_purchases_public_insert" ON photo_purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "photo_purchases_auth_write" ON photo_purchases FOR ALL USING (true);

-- Indexes
CREATE INDEX idx_gallery_photos_gallery ON gallery_photos(gallery_id);
CREATE INDEX idx_gallery_photos_bib ON gallery_photos(bib_number);
CREATE INDEX idx_photo_purchases_gallery ON photo_purchases(gallery_id);
CREATE INDEX idx_photo_purchases_status ON photo_purchases(status);
