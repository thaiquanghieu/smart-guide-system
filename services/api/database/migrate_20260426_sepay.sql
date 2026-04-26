ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS provider_transaction_id text,
  ADD COLUMN IF NOT EXISTS provider_reference_code text,
  ADD COLUMN IF NOT EXISTS paid_amount integer,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS provider_payload jsonb,
  ADD COLUMN IF NOT EXISTS draft_payload jsonb,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

UPDATE payments
SET provider = COALESCE(NULLIF(provider, ''), 'manual')
WHERE provider IS NULL OR provider = '';

CREATE INDEX IF NOT EXISTS idx_payments_code ON payments (code);
CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments (provider);
