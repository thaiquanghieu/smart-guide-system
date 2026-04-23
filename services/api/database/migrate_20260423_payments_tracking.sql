ALTER TABLE payments
  ALTER COLUMN device_id DROP NOT NULL,
  ALTER COLUMN plan_id DROP NOT NULL;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS owner_id integer REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS poi_id text REFERENCES pois(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payer_type text DEFAULT 'device',
  ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'user_plan',
  ADD COLUMN IF NOT EXISTS amount integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_reason text;

UPDATE payments
SET
  payer_type = COALESCE(NULLIF(payer_type, ''), 'device'),
  payment_type = COALESCE(NULLIF(payment_type, ''), 'user_plan'),
  amount = COALESCE(amount, 0),
  status = CASE
    WHEN is_used = true THEN 'used'
    ELSE COALESCE(NULLIF(status, ''), 'pending')
  END;

CREATE INDEX IF NOT EXISTS idx_payments_owner_id ON payments (owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_poi_id ON payments (poi_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments (payment_type);
