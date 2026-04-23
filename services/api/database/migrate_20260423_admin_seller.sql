BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS banned_at timestamptz,
  ADD COLUMN IF NOT EXISTS ban_reason text;

UPDATE devices
SET status = CASE WHEN is_active THEN 'active' ELSE 'user_deleted' END
WHERE status IS NULL;

ALTER TABLE pois
  ADD COLUMN IF NOT EXISTS approval_note text,
  ADD COLUMN IF NOT EXISTS rejected_reason text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS categories jsonb DEFAULT '[]'::jsonb;

ALTER TABLE audio_guides
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejected_reason text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE audio_guides
SET approval_status = 'approved'
WHERE approval_status IS NULL OR approval_status = 'pending';

ALTER TABLE poi_translations
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE qr_entries
  DROP CONSTRAINT IF EXISTS qr_entries_status_check;

ALTER TABLE qr_entries
  ADD CONSTRAINT qr_entries_status_check CHECK (status IN ('active', 'inactive', 'expired', 'admin_suspended'));

ALTER TABLE qr_entries
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS activation_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS activation_request_note text;

CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices (last_seen);
CREATE INDEX IF NOT EXISTS idx_devices_is_active ON devices (is_active);

COMMIT;
