-- Canonical query model for Cambiometro. Large originals stay in R2.

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  organization TEXT,
  official_url TEXT,
  license TEXT,
  expected_coverage TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  identifiers_json TEXT NOT NULL DEFAULT '[]',
  attributes_json TEXT NOT NULL DEFAULT '{}',
  source_ids_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  occurred_at TEXT,
  period_json TEXT NOT NULL DEFAULT '{}',
  subject_entity_ids_json TEXT NOT NULL DEFAULT '[]',
  object_entity_ids_json TEXT NOT NULL DEFAULT '[]',
  amount_json TEXT,
  evidence_json TEXT NOT NULL,
  data_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS relations (
  id TEXT PRIMARY KEY,
  from_id TEXT NOT NULL,
  predicate TEXT NOT NULL,
  to_id TEXT NOT NULL,
  evidence_record_ids_json TEXT NOT NULL DEFAULT '[]',
  period_json TEXT NOT NULL DEFAULT '{}',
  reconciliation_json TEXT NOT NULL DEFAULT '{}',
  disclaimer TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS record_subjects (
  record_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  PRIMARY KEY (record_id, entity_id)
);

CREATE TABLE IF NOT EXISTS record_objects (
  record_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  PRIMARY KEY (record_id, entity_id)
);

CREATE TABLE IF NOT EXISTS mandates (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  chamber TEXT NOT NULL,
  seat TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'pending_change', 'closed')),
  cause TEXT,
  evidence_url TEXT NOT NULL,
  missing_streak INTEGER NOT NULL DEFAULT 0,
  last_seen_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS etl_runs (
  id TEXT PRIMARY KEY,
  cadence TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  catalog_version TEXT,
  catalog_checksum TEXT,
  source_count INTEGER NOT NULL DEFAULT 0,
  record_count INTEGER NOT NULL DEFAULT 0,
  error TEXT
);

CREATE TABLE IF NOT EXISTS source_state (
  source_id TEXT PRIMARY KEY,
  etl_run_id TEXT NOT NULL,
  status TEXT NOT NULL,
  record_count INTEGER NOT NULL DEFAULT 0,
  checksum_sha256 TEXT,
  generated_at TEXT,
  last_success_at TEXT,
  error TEXT,
  published_version TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stage_entities (
  run_id TEXT NOT NULL,
  id TEXT NOT NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  identifiers_json TEXT NOT NULL,
  attributes_json TEXT NOT NULL,
  source_ids_json TEXT NOT NULL,
  updated_at TEXT,
  PRIMARY KEY (run_id, id)
);

CREATE TABLE IF NOT EXISTS stage_records (
  run_id TEXT NOT NULL,
  id TEXT NOT NULL,
  kind TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  occurred_at TEXT,
  period_json TEXT NOT NULL,
  subject_entity_ids_json TEXT NOT NULL,
  object_entity_ids_json TEXT NOT NULL,
  amount_json TEXT,
  evidence_json TEXT NOT NULL,
  data_json TEXT NOT NULL,
  PRIMARY KEY (run_id, id)
);

CREATE TABLE IF NOT EXISTS stage_relations (
  run_id TEXT NOT NULL,
  id TEXT NOT NULL,
  from_id TEXT NOT NULL,
  predicate TEXT NOT NULL,
  to_id TEXT NOT NULL,
  evidence_record_ids_json TEXT NOT NULL,
  period_json TEXT NOT NULL,
  reconciliation_json TEXT NOT NULL,
  disclaimer TEXT NOT NULL,
  PRIMARY KEY (run_id, id)
);

CREATE TABLE IF NOT EXISTS mandate_snapshot (
  run_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  chamber TEXT NOT NULL,
  name TEXT NOT NULL,
  evidence_url TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  PRIMARY KEY (run_id, entity_id, chamber)
);

CREATE INDEX IF NOT EXISTS idx_entities_kind ON entities(kind);
CREATE INDEX IF NOT EXISTS idx_records_source_date ON records(source_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_records_kind_date ON records(kind, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_record_subjects_entity ON record_subjects(entity_id, record_id);
CREATE INDEX IF NOT EXISTS idx_record_objects_entity ON record_objects(entity_id, record_id);
CREATE INDEX IF NOT EXISTS idx_relations_from ON relations(from_id, predicate);
CREATE INDEX IF NOT EXISTS idx_relations_to ON relations(to_id, predicate);
CREATE INDEX IF NOT EXISTS idx_mandates_entity_dates ON mandates(entity_id, started_at, ended_at);
CREATE INDEX IF NOT EXISTS idx_mandates_status ON mandates(status, chamber);
CREATE INDEX IF NOT EXISTS idx_etl_runs_started ON etl_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_source_state_status ON source_state(status, updated_at DESC);
