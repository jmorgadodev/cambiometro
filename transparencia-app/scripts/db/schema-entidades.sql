CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    identifiers_json TEXT NOT NULL,
    attributes_json TEXT NOT NULL,
    source_ids_json TEXT NOT NULL,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS records (
    id TEXT PRIMARY KEY,
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
    data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS relations (
    id TEXT PRIMARY KEY,
    from_id TEXT NOT NULL,
    predicate TEXT NOT NULL,
    to_id TEXT NOT NULL,
    evidence_record_ids_json TEXT NOT NULL,
    period_json TEXT NOT NULL,
    reconciliation_json TEXT NOT NULL,
    disclaimer TEXT NOT NULL
);

-- Indices for fast querying
CREATE INDEX IF NOT EXISTS idx_entities_kind ON entities(kind);
CREATE INDEX IF NOT EXISTS idx_records_kind ON records(kind);
CREATE INDEX IF NOT EXISTS idx_records_source_id ON records(source_id);
CREATE INDEX IF NOT EXISTS idx_relations_from_id ON relations(from_id);
CREATE INDEX IF NOT EXISTS idx_relations_to_id ON relations(to_id);
