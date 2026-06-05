-- WaterLab — Schéma Supabase
-- À exécuter dans : Supabase Dashboard → SQL Editor → New Query

-- ── Cache des marées ──────────────────────────────────────
-- Stocke les données Stormglass une fois par jour par spot.
-- Tous vos appareils lisent depuis ici → économise les 10 appels/jour.
CREATE TABLE IF NOT EXISTS tide_cache (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  location_key TEXT   NOT NULL,          -- ex: "46.159_-1.152"
  cache_date   DATE   NOT NULL,          -- date du jour de la récupération
  tide_data    JSONB  NOT NULL,          -- tableau des extrêmes de marée (10 jours)
  fetched_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (location_key, cache_date)
);

-- ── Spots favoris ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spots (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT             NOT NULL,
  lat        DOUBLE PRECISION NOT NULL,
  lng        DOUBLE PRECISION NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sécurité (app personnelle sans auth) ──────────────────
ALTER TABLE tide_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE spots      ENABLE ROW LEVEL SECURITY;

-- Accès total pour la clé anon (usage personnel uniquement)
CREATE POLICY "anon_all_tide_cache" ON tide_cache
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_spots" ON spots
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── Journées favorites (références de pêche) ──────────────
CREATE TABLE IF NOT EXISTS favorite_days (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date           DATE NOT NULL UNIQUE,
  comment        TEXT,
  moon_phase     FLOAT   NOT NULL,          -- 0–1
  moon_name      TEXT,
  coeff_category TEXT,                      -- 'neap' | 'medium' | 'spring' | 'extreme'
  tide_coeff     INTEGER,
  pressure_trend TEXT,                      -- 'rising' | 'stable' | 'falling'
  fishing_score  INTEGER,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE favorite_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_favorites" ON favorite_days
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Nouvelles colonnes (créneau + marée du créneau)
-- À exécuter si la table existe déjà :
ALTER TABLE favorite_days ADD COLUMN IF NOT EXISTS time_of_day    TEXT;    -- 'morning' | 'afternoon' | 'all_day'
ALTER TABLE favorite_days ADD COLUMN IF NOT EXISTS tide_period_type TEXT;  -- 'high' | 'low'
ALTER TABLE favorite_days ADD COLUMN IF NOT EXISTS tide_period_hour INTEGER; -- heure locale de la marée du créneau
