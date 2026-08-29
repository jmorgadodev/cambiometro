-- Dedicated query projection for the public transfer API.
-- The complete historical release remains canonical in R2; this database
-- prevents the main transparency database from reaching its storage limit.
CREATE TABLE IF NOT EXISTS transferencias_19862 (
  id TEXT PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS transferencias_19862_stage (
  id TEXT PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS transferencias_19862_release (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  checksum_sha256 TEXT NOT NULL,
  total_rows INTEGER NOT NULL,
  total_monto_clp INTEGER NOT NULL,
  generated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transferencias_19862_fecha ON transferencias_19862(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_transferencias_19862_periodo ON transferencias_19862(periodo);
CREATE INDEX IF NOT EXISTS idx_transferencias_19862_emisor ON transferencias_19862(emisor_nombre);
CREATE INDEX IF NOT EXISTS idx_transferencias_19862_receptor ON transferencias_19862(receptor_nombre);
CREATE INDEX IF NOT EXISTS idx_transferencias_19862_monto ON transferencias_19862(monto_clp DESC);
CREATE INDEX IF NOT EXISTS idx_transferencias_19862_search ON transferencias_19862(emisor_nombre, receptor_nombre, materia, comuna);
