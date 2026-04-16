BEGIN;

-- =========================
-- DROP OLD
-- =========================
DROP TABLE IF EXISTS listen_logs CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS qr_logs CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS ratings CASCADE;
DROP TABLE IF EXISTS audio_guides CASCADE;
DROP TABLE IF EXISTS poi_images CASCADE;
DROP TABLE IF EXISTS pois CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
  id serial PRIMARY KEY,
  user_name text,
  email text UNIQUE,
  password_hash text,
  avatar_url text,
  favorite_count integer DEFAULT 0,
  listened_poi_count integer DEFAULT 0,
  role text DEFAULT 'user' CHECK (role IN ('user', 'owner', 'admin')),
  is_active boolean DEFAULT true,
  created_at timestamp default now()
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
  created_at timestamp default now(),
  updated_at timestamp default now()
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
-- AUDIO GUIDES
-- =========================
CREATE TABLE audio_guides (
  id text PRIMARY KEY,
  poi_id text REFERENCES pois(id) ON DELETE CASCADE,
  language_code text,
  language_name text,
  voice_name text,
  script_text text,
  created_at timestamp default now()
);

-- =========================
-- RATINGS
-- =========================
CREATE TABLE ratings (
  id serial PRIMARY KEY,
  poi_id text REFERENCES pois(id) ON DELETE CASCADE,
  user_id integer REFERENCES users(id) ON DELETE CASCADE,
  rating_value smallint NOT NULL,
  created_at timestamp default now(),
  UNIQUE (poi_id, user_id)
);

-- =========================
-- FAVORITES
-- =========================
CREATE TABLE favorites (
  id serial PRIMARY KEY,
  user_id int NOT NULL,
  poi_id text NOT NULL,
  created_at timestamp DEFAULT NOW(),

  CONSTRAINT fk_fav_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_poi FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE,

  UNIQUE(user_id, poi_id)
);

-- =========================
-- LISTEN LOGS (with duration tracking)
-- =========================
CREATE TABLE listen_logs (
  id serial PRIMARY KEY,
  user_id int NOT NULL,
  poi_id text NOT NULL,
  duration_seconds integer DEFAULT 0,
  listened_at timestamp DEFAULT NOW(),

  CONSTRAINT fk_listen_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
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
    created_at TIMESTAMP DEFAULT NOW()
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
    user_id INT UNIQUE,
    expire_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_sub_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

-- =========================
-- PAYMENTS
-- =========================
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id INT,
    plan_id INT,
    code VARCHAR(100) UNIQUE,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    used_at TIMESTAMP,

    CONSTRAINT fk_pay_user
    FOREIGN KEY (user_id) REFERENCES users(id),

    CONSTRAINT fk_pay_plan
    FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- =========================
-- QR LOGS
-- =========================
CREATE TABLE qr_logs (
    id SERIAL PRIMARY KEY,
    user_id INT,
    code VARCHAR(100),
    scanned_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT fk_qr_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_pois_lat_lon ON pois (latitude, longitude);

COMMIT;