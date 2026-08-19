-- Makes source refreshes bounded. Historical rows are reconciled lazily by the
-- materializer the first time each source is refreshed.
ALTER TABLE relations ADD COLUMN source_id TEXT;
CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_id);
