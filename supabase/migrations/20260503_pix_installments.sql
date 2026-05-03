-- ============================================
-- PIX Parcelado: Campos no events + registrations + nova tabela
-- ============================================

-- 1. Campos na tabela events
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS pix_installments_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pix_installments_deadline date DEFAULT NULL;

COMMENT ON COLUMN events.pix_installments_enabled IS 'Habilita parcelamento PIX para este evento';
COMMENT ON COLUMN events.pix_installments_deadline IS 'Data limite para inscrições parceladas';

-- 2. Campo na tabela registrations
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'full';

COMMENT ON COLUMN registrations.payment_type IS 'full = à vista, installments = parcelado PIX';

-- 3. Tabela de parcelas
CREATE TABLE IF NOT EXISTS registration_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  installment_number integer NOT NULL CHECK (installment_number BETWEEN 1 AND 3),
  amount numeric(10,2) NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_at timestamptz DEFAULT NULL,
  receipt_url text DEFAULT NULL,
  notes text DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(registration_id, installment_number)
);

-- 4. RLS
ALTER TABLE registration_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read installments" ON registration_installments FOR SELECT USING (true);
CREATE POLICY "Public insert installments" ON registration_installments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update installments" ON registration_installments FOR UPDATE USING (true);
