BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- DROP OLD
-- =========================
DROP TABLE IF EXISTS listen_logs CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS qr_logs CASCADE;
DROP TABLE IF EXISTS qr_entries CASCADE;
DROP TABLE IF EXISTS device_entry_grants CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS audio_guides CASCADE;
DROP TABLE IF EXISTS poi_translations CASCADE;
DROP TABLE IF EXISTS poi_images CASCADE;
DROP TABLE IF EXISTS pois CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =========================
-- USERS (SYSTEM ACCOUNTS FOR OWNER/ADMIN)
-- =========================
CREATE TABLE users (
  id serial PRIMARY KEY,
  user_name text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  avatar_url text,
  role text DEFAULT 'owner' CHECK (role IN ('owner', 'admin')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login_at timestamptz
);

-- =========================
-- DEVICES
-- =========================
CREATE TABLE devices (
  id serial PRIMARY KEY,
  device_uuid uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  token_hash text,
  token_issued_at timestamptz,
  name text,
  platform text,
  model text,
  app_version text,
  is_active boolean DEFAULT true,
  last_seen timestamptz,
  registered_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  push_token text,
  qr_code text UNIQUE
);

-- =========================
-- POIS
-- =========================
CREATE TABLE pois (
  id text PRIMARY KEY,
  owner_id integer REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  categories jsonb,
  short_description text,
  description text,
  address text,
  open_time text,
  close_time text,
  price_text text,
  radius integer DEFAULT 100,
  priority integer DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  listened_count integer DEFAULT 0,
  rating_avg double precision DEFAULT 0,
  rating_count integer DEFAULT 0,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =========================
-- QR ENTRIES
-- =========================
CREATE TABLE qr_entries (
  id serial PRIMARY KEY,
  owner_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  poi_id text NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
  name text NOT NULL,
  entry_code text NOT NULL UNIQUE,
  total_scans integer NOT NULL DEFAULT 0,
  used_scans integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =========================
-- DEVICE ENTRY GRANTS
-- =========================
CREATE TABLE device_entry_grants (
  id serial PRIMARY KEY,
  qr_entry_id integer REFERENCES qr_entries(id) ON DELETE CASCADE,
  device_id int NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  entry_code text NOT NULL,
  poi_id text REFERENCES pois(id) ON DELETE SET NULL,
  free_plays_total int NOT NULL DEFAULT 1,
  free_plays_used int NOT NULL DEFAULT 0,
  granted_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- =========================
-- POI IMAGES
-- =========================
CREATE TABLE poi_images (
  id serial PRIMARY KEY,
  poi_id text REFERENCES pois(id) ON DELETE CASCADE,
  image_url text,
  sort_order integer DEFAULT 0
);

-- =========================
-- POI TRANSLATIONS
-- =========================
CREATE TABLE poi_translations (
  id serial PRIMARY KEY,
  poi_id text NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
  language_code text NOT NULL,
  name text,
  category text,
  short_description text,
  description text,
  address text,
  price_text text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (poi_id, language_code)
);

-- =========================
-- AUDIO GUIDES
-- =========================
CREATE TABLE audio_guides (
  id text PRIMARY KEY,
  poi_id text REFERENCES pois(id) ON DELETE CASCADE,
  language_code text,
  language_name text,
  voice_name text,
  script_text text,
  created_at timestamptz DEFAULT now()
);

-- =========================
-- RATINGS
-- =========================
CREATE TABLE ratings (
  id serial PRIMARY KEY,
  poi_id text REFERENCES pois(id) ON DELETE CASCADE,
  device_id integer REFERENCES devices(id) ON DELETE CASCADE,
  rating_value smallint NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (poi_id, device_id)
);

-- =========================
-- FAVORITES
-- =========================
CREATE TABLE favorites (
  id serial PRIMARY KEY,
  device_id int NOT NULL,
  poi_id text NOT NULL,
  created_at timestamptz DEFAULT NOW(),

  CONSTRAINT fk_fav_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_poi FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE,

  UNIQUE(device_id, poi_id)
);

-- =========================
-- LISTEN LOGS (with duration tracking)
-- =========================
CREATE TABLE listen_logs (
  id serial PRIMARY KEY,
  device_id int NOT NULL,
  poi_id text NOT NULL,
  duration_seconds integer DEFAULT 0,
  listened_at timestamptz DEFAULT NOW(),

  CONSTRAINT fk_listen_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
  CONSTRAINT fk_listen_poi FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE
);

-- =========================
-- PLANS
-- =========================
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE,
    days INT,
    price INT,
    created_at timestamptz DEFAULT NOW()
);

INSERT INTO plans (name, days, price) VALUES
('Gói ngày', 1, 29000),
('Gói tuần', 7, 99000),
('Gói tháng', 30, 199000),
('Gói năm', 365, 999000)
ON CONFLICT DO NOTHING;

-- =========================
-- SUBSCRIPTIONS
-- =========================
CREATE TABLE subscriptions (
    id SERIAL PRIMARY KEY,
    device_id INT UNIQUE,
    expire_at timestamptz,
    created_at timestamptz DEFAULT NOW(),

    CONSTRAINT fk_sub_device
    FOREIGN KEY (device_id) REFERENCES devices(id)
    ON DELETE CASCADE
);

-- =========================
-- PAYMENTS
-- =========================
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    device_id INT NOT NULL,
    plan_id INT NOT NULL,
    code VARCHAR(100) UNIQUE,
    is_used BOOLEAN DEFAULT FALSE,
    created_at timestamptz DEFAULT NOW(),
    used_at timestamptz,

    CONSTRAINT fk_pay_device
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,

    CONSTRAINT fk_pay_plan
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- =========================
-- QR LOGS
-- =========================
CREATE TABLE qr_logs (
    id SERIAL PRIMARY KEY,
    qr_entry_id INT REFERENCES qr_entries(id) ON DELETE CASCADE,
    device_id INT NOT NULL,
    poi_id text REFERENCES pois(id) ON DELETE SET NULL,
    code VARCHAR(100),
    granted_free_listen BOOLEAN DEFAULT FALSE,
    scan_status text NOT NULL DEFAULT 'granted',
    scanned_at timestamptz DEFAULT NOW(),

    CONSTRAINT fk_qr_device
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pois_lat_lon ON pois (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices (last_seen);
CREATE INDEX IF NOT EXISTS idx_devices_is_active ON devices (is_active);
CREATE INDEX IF NOT EXISTS idx_devices_uuid ON devices (device_uuid);
CREATE INDEX IF NOT EXISTS idx_qr_entries_owner_id ON qr_entries (owner_id);
CREATE INDEX IF NOT EXISTS idx_qr_entries_poi_id ON qr_entries (poi_id);
CREATE INDEX IF NOT EXISTS idx_qr_entries_status ON qr_entries (status);
CREATE INDEX IF NOT EXISTS idx_qr_entries_entry_code ON qr_entries (entry_code);
CREATE INDEX IF NOT EXISTS idx_device_entry_grants_device_id ON device_entry_grants (device_id);
CREATE INDEX IF NOT EXISTS idx_device_entry_grants_qr_entry_id ON device_entry_grants (qr_entry_id);
CREATE INDEX IF NOT EXISTS idx_device_entry_grants_entry_code ON device_entry_grants (entry_code);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expire_at ON subscriptions (expire_at);
CREATE INDEX IF NOT EXISTS idx_payments_device_id ON payments (device_id);
CREATE INDEX IF NOT EXISTS idx_qr_logs_device_id ON qr_logs (device_id);
CREATE INDEX IF NOT EXISTS idx_qr_logs_qr_entry_id ON qr_logs (qr_entry_id);
CREATE INDEX IF NOT EXISTS idx_favorites_device_id ON favorites (device_id);
CREATE INDEX IF NOT EXISTS idx_listen_logs_device_id ON listen_logs (device_id);

COMMIT;
