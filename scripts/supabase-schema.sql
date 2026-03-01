-- Ragnarok LATAM — Supabase Schema
-- Run this in the Supabase SQL Editor

-- Extensions for accent-insensitive trigram search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ─── Items (~30k rows) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS items (
  id              INTEGER PRIMARY KEY,
  aegis_name      TEXT NOT NULL DEFAULT '',
  name_en         TEXT NOT NULL DEFAULT '',
  name_pt         TEXT NOT NULL DEFAULT '',
  type            TEXT NOT NULL DEFAULT 'Etc',
  sub_type        TEXT,
  weight          REAL NOT NULL DEFAULT 0,
  attack          INTEGER,
  magic_attack    INTEGER,
  defense         INTEGER,
  range           INTEGER,
  slots           INTEGER NOT NULL DEFAULT 0,
  equip_level_min INTEGER,
  equip_level_max INTEGER,
  weapon_level    INTEGER,
  armor_level     INTEGER,
  refineable      BOOLEAN NOT NULL DEFAULT FALSE,
  gradable        BOOLEAN NOT NULL DEFAULT FALSE,
  buy             INTEGER,
  sell            INTEGER,
  locations       TEXT[] NOT NULL DEFAULT '{}',
  jobs            TEXT[] NOT NULL DEFAULT '{}',
  classes         TEXT[] NOT NULL DEFAULT '{}',
  description     TEXT[] NOT NULL DEFAULT '{}',
  script          TEXT,
  equip_script    TEXT,
  class_num       INTEGER NOT NULL DEFAULT 0,
  costume         BOOLEAN NOT NULL DEFAULT FALSE,
  affix_text      TEXT,
  affix_type      TEXT CHECK (affix_type IN ('prefix', 'suffix')),
  search_text     TEXT GENERATED ALWAYS AS (
    lower(coalesce(name_pt, '') || ' ' || coalesce(name_en, '') || ' ' || coalesce(aegis_name, ''))
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_aegis_name ON items(aegis_name);
CREATE INDEX IF NOT EXISTS idx_items_search ON items USING gin (search_text gin_trgm_ops);

-- ─── Monsters (~2.7k rows) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monsters (
  id              INTEGER PRIMARY KEY,
  aegis_name      TEXT NOT NULL DEFAULT '',
  name            TEXT NOT NULL DEFAULT '',
  name_pt         TEXT NOT NULL DEFAULT '',
  level           INTEGER NOT NULL DEFAULT 1,
  hp              BIGINT NOT NULL DEFAULT 1,
  sp              INTEGER NOT NULL DEFAULT 0,
  base_exp        BIGINT NOT NULL DEFAULT 0,
  job_exp         BIGINT NOT NULL DEFAULT 0,
  mvp_exp         BIGINT NOT NULL DEFAULT 0,
  attack          INTEGER NOT NULL DEFAULT 0,
  magic_attack    INTEGER NOT NULL DEFAULT 0,
  defense         INTEGER NOT NULL DEFAULT 0,
  magic_defense   INTEGER NOT NULL DEFAULT 0,
  str             INTEGER NOT NULL DEFAULT 0,
  agi             INTEGER NOT NULL DEFAULT 0,
  vit             INTEGER NOT NULL DEFAULT 0,
  "int"           INTEGER NOT NULL DEFAULT 0,
  dex             INTEGER NOT NULL DEFAULT 0,
  luk             INTEGER NOT NULL DEFAULT 0,
  attack_range    INTEGER NOT NULL DEFAULT 0,
  skill_range     INTEGER NOT NULL DEFAULT 0,
  chase_range     INTEGER NOT NULL DEFAULT 0,
  size            TEXT NOT NULL DEFAULT 'Small',
  race            TEXT NOT NULL DEFAULT 'Formless',
  element         TEXT NOT NULL DEFAULT 'Neutral',
  element_level   INTEGER NOT NULL DEFAULT 1,
  walk_speed      INTEGER NOT NULL DEFAULT 200,
  attack_delay    INTEGER NOT NULL DEFAULT 0,
  attack_motion   INTEGER NOT NULL DEFAULT 0,
  damage_motion   INTEGER NOT NULL DEFAULT 0,
  ai              TEXT NOT NULL DEFAULT '06',
  class           TEXT NOT NULL DEFAULT 'Normal',
  is_mvp          BOOLEAN NOT NULL DEFAULT FALSE,
  modes           TEXT[] NOT NULL DEFAULT '{}',
  search_text     TEXT GENERATED ALWAYS AS (
    lower(coalesce(name_pt, '') || ' ' || coalesce(name, '') || ' ' || coalesce(aegis_name, ''))
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_monsters_race ON monsters(race);
CREATE INDEX IF NOT EXISTS idx_monsters_element ON monsters(element);
CREATE INDEX IF NOT EXISTS idx_monsters_is_mvp ON monsters(is_mvp);
CREATE INDEX IF NOT EXISTS idx_monsters_class ON monsters(class);
CREATE INDEX IF NOT EXISTS idx_monsters_search ON monsters USING gin (search_text gin_trgm_ops);

-- ─── Monster Drops ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monster_drops (
  id              SERIAL PRIMARY KEY,
  monster_id      INTEGER NOT NULL REFERENCES monsters(id) ON DELETE CASCADE,
  aegis_name      TEXT NOT NULL,
  rate            INTEGER NOT NULL DEFAULT 0,
  steal_protected BOOLEAN NOT NULL DEFAULT FALSE,
  is_mvp_drop     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_monster_drops_monster ON monster_drops(monster_id);
CREATE INDEX IF NOT EXISTS idx_monster_drops_aegis ON monster_drops(aegis_name);

-- ─── Aegis → ID mapping (~29k rows) ────────────────────────────────

CREATE TABLE IF NOT EXISTS aegis_to_id (
  aegis_name TEXT PRIMARY KEY,
  item_id    INTEGER NOT NULL
);

-- ─── Skills (~1.6k rows) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS skills (
  id          INTEGER PRIMARY KEY,
  aegis_name  TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  name_pt     TEXT NOT NULL DEFAULT '',
  max_level   INTEGER NOT NULL DEFAULT 1,
  type        TEXT NOT NULL DEFAULT 'None',
  target_type TEXT NOT NULL DEFAULT 'Passive',
  search_text TEXT GENERATED ALWAYS AS (
    lower(coalesce(name_pt, '') || ' ' || coalesce(description, '') || ' ' || coalesce(aegis_name, ''))
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_skills_type ON skills(type);
CREATE INDEX IF NOT EXISTS idx_skills_search ON skills USING gin (search_text gin_trgm_ops);

-- ─── Changelog ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS changelog (
  id    SERIAL PRIMARY KEY,
  date  TEXT NOT NULL,
  data  JSONB NOT NULL DEFAULT '{}'
);

-- ─── Row Level Security (read-only public access) ──────────────────

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE monsters ENABLE ROW LEVEL SECURITY;
ALTER TABLE monster_drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE aegis_to_id ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read items" ON items FOR SELECT USING (true);
CREATE POLICY "Public read monsters" ON monsters FOR SELECT USING (true);
CREATE POLICY "Public read drops" ON monster_drops FOR SELECT USING (true);
CREATE POLICY "Public read aegis" ON aegis_to_id FOR SELECT USING (true);
CREATE POLICY "Public read skills" ON skills FOR SELECT USING (true);
CREATE POLICY "Public read changelog" ON changelog FOR SELECT USING (true);
