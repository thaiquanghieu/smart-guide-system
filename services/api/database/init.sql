BEGIN;

DROP TABLE IF EXISTS poi_images;
DROP TABLE IF EXISTS audio_guides;
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS pois;
DROP TABLE IF EXISTS users;

CREATE TABLE pois (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text,
  categories jsonb,
  short_description text,
  description text,
  address text,
  open_time text,
  close_time text,
  price_text text,
  listened_count integer DEFAULT 0,
  rating_avg double precision DEFAULT 0,
  rating_count integer DEFAULT 0,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_at timestamp default now()
);

CREATE TABLE poi_images (
  id serial PRIMARY KEY,
  poi_id text REFERENCES pois(id) ON DELETE CASCADE,
  image_url text,
  sort_order integer DEFAULT 0
);

CREATE TABLE audio_guides (
  id text PRIMARY KEY,
  poi_id text REFERENCES pois(id) ON DELETE CASCADE,
  language_code text,
  language_name text,
  voice_name text,
  script_text text,
  created_at timestamp default now()
);

CREATE TABLE users (
  id serial PRIMARY KEY,
  user_name text,
  email text UNIQUE,
  avatar_url text,
  favorite_count integer DEFAULT 0,
  listened_poi_count integer DEFAULT 0,
  created_at timestamp default now()
);

CREATE TABLE ratings (
  id serial PRIMARY KEY,
  poi_id text REFERENCES pois(id) ON DELETE CASCADE,
  user_id integer REFERENCES users(id) ON DELETE CASCADE,
  rating_value smallint NOT NULL,
  created_at timestamp default now(),
  UNIQUE (poi_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_pois_lat_lon ON pois (latitude, longitude);

COMMIT;