-- Cross-source identities are kept as auditable aliases instead of rewriting
-- official source identifiers. Only deterministic, high-confidence matches are
-- inserted automatically.
CREATE TABLE IF NOT EXISTS entity_aliases (
  alias_id TEXT PRIMARY KEY,
  canonical_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  method TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entity_aliases_canonical ON entity_aliases(canonical_id, alias_id);
CREATE INDEX IF NOT EXISTS idx_entity_aliases_source ON entity_aliases(source_id, canonical_id);
