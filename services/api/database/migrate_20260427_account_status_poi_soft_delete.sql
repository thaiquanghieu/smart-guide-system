BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_account_status_check;

ALTER TABLE users
  ADD CONSTRAINT users_account_status_check
  CHECK (account_status IN ('active', 'paused', 'banned', 'canceled'));

UPDATE users
SET account_status = CASE
  WHEN is_active = false THEN 'banned'
  ELSE 'active'
END
WHERE account_status IS NULL OR account_status = '';

ALTER TABLE pois
  DROP CONSTRAINT IF EXISTS pois_status_check;

ALTER TABLE pois
  ADD CONSTRAINT pois_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'seller_deleted'));

COMMIT;
