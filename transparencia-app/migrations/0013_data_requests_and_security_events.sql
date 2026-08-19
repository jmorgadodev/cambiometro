-- Canal de solicitudes Ley 21.715 y eventos de seguridad.
-- Retención documentada en docs/registro-tratamientos.md:
--   data_requests: 3 años; security_events: 12 meses; request_rate_events: 7 días (hash de IP).
CREATE TABLE IF NOT EXISTS data_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,
  nombre TEXT,
  email TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'recibida',
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  responded_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_data_requests_created ON data_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_data_requests_email ON data_requests(email);
CREATE INDEX IF NOT EXISTS idx_data_requests_estado ON data_requests(estado);

CREATE TABLE IF NOT EXISTS security_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at);

-- Ventana deslizante antiabuso por IP hasheada (scope + 6 horas).
CREATE TABLE IF NOT EXISTS request_rate_events (
  ip_hash TEXT NOT NULL,
  scope TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_request_rate_events ON request_rate_events(ip_hash, scope, created_at);
