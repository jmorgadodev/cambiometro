-- Proyección consultable de Ley 19.862. El detalle original permanece en R2/lake.
CREATE TABLE IF NOT EXISTS transferencias_19862 (
  id TEXT PRIMARY KEY,
  folio TEXT,
  fecha TEXT NOT NULL,
  periodo TEXT NOT NULL,
  emisor_nombre TEXT NOT NULL,
  emisor_rut TEXT,
  receptor_nombre TEXT NOT NULL,
  receptor_rut TEXT,
  materia TEXT NOT NULL,
  monto_clp INTEGER NOT NULL CHECK (monto_clp >= 0),
  url_registro TEXT NOT NULL,
  clasificacion TEXT,
  comuna TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stage_transferencias_19862 (
  run_id TEXT NOT NULL,
  id TEXT NOT NULL,
  folio TEXT,
  fecha TEXT NOT NULL,
  periodo TEXT NOT NULL,
  emisor_nombre TEXT NOT NULL,
  emisor_rut TEXT,
  receptor_nombre TEXT NOT NULL,
  receptor_rut TEXT,
  materia TEXT NOT NULL,
  monto_clp INTEGER NOT NULL CHECK (monto_clp >= 0),
  url_registro TEXT NOT NULL,
  clasificacion TEXT,
  comuna TEXT,
  PRIMARY KEY (run_id, id)
);

CREATE INDEX IF NOT EXISTS idx_transferencias_19862_fecha ON transferencias_19862(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_transferencias_19862_periodo ON transferencias_19862(periodo);
CREATE INDEX IF NOT EXISTS idx_transferencias_19862_emisor ON transferencias_19862(emisor_nombre);
CREATE INDEX IF NOT EXISTS idx_transferencias_19862_receptor ON transferencias_19862(receptor_nombre);
CREATE INDEX IF NOT EXISTS idx_transferencias_19862_monto ON transferencias_19862(monto_clp DESC);
CREATE INDEX IF NOT EXISTS idx_transferencias_19862_search_emisor_rut ON transferencias_19862(emisor_rut);
CREATE INDEX IF NOT EXISTS idx_transferencias_19862_search_receptor_rut ON transferencias_19862(receptor_rut);
CREATE INDEX IF NOT EXISTS idx_stage_transferencias_19862_run ON stage_transferencias_19862(run_id);
