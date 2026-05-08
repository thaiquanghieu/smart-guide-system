BEGIN;

CREATE TABLE IF NOT EXISTS tours (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  cover_image_url text,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tour_pois (
  id serial PRIMARY KEY,
  tour_id integer NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  poi_id text NOT NULL REFERENCES pois(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tour_pois_tour_poi_unique ON tour_pois (tour_id, poi_id);
CREATE INDEX IF NOT EXISTS idx_tour_pois_tour_id ON tour_pois (tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_pois_poi_id ON tour_pois (poi_id);

COMMIT;
