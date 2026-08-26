-- Projection indexed for the public Ley 19.862 API. The canonical lake and
-- static Pages release remain the source of truth; this table is a queryable
-- D1 projection of the same release.

CREATE TABLE IF NOT EXISTS transferencias_19862 (
  id TEXT PRIMARY KEY,
  folio TEXT,
  fecha TEXT,
  periodo TEXT,
  emisor_nombre TEXT,
  emisor_rut TEXT,
  receptor_nombre TEXT,
  receptor_rut TEXT,
  materia TEXT,
  monto_clp INTEGER NOT NULL CHECK (monto_clp >= 0),
  url_registro TEXT NOT NULL,
  clasificacion TEXT,
  comuna TEXT
);

CREATE TABLE IF NOT EXISTS stage_transferencias_19862 (
  run_id TEXT NOT NULL,
  id TEXT NOT NULL,
  folio TEXT,
  fecha TEXT,
  periodo TEXT,
  emisor_nombre TEXT,
  emisor_rut TEXT,
  receptor_nombre TEXT,
  receptor_rut TEXT,
  materia TEXT,
  monto_clp INTEGER NOT NULL CHECK (monto_clp >= 0),
  url_registro TEXT NOT NULL,
  clasificacion TEXT,
  comuna TEXT,
  PRIMARY KEY (run_id, id)
);

CREATE TABLE IF NOT EXISTS transferencias_19862_release (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  checksum_sha256 TEXT NOT NULL,
  total_rows INTEGER NOT NULL,
  total_monto_clp INTEGER NOT NULL,
  generated_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transferencias_19862_fecha ON transferencias_19862(fecha);
CREATE INDEX IF NOT EXISTS idx_transferencias_19862_periodo ON transferencias_19862(periodo);
CREATE INDEX IF NOT EXISTS idx_transferencias_19862_emisor ON transferencias_19862(emisor_nombre);
CREATE INDEX IF NOT EXISTS idx_transferencias_19862_receptor ON transferencias_19862(receptor_nombre);
CREATE INDEX IF NOT EXISTS idx_transferencias_19862_monto ON transferencias_19862(monto_clp DESC);
CREATE INDEX IF NOT EXISTS idx_transferencias_19862_search ON transferencias_19862(emisor_nombre, receptor_nombre, materia);
