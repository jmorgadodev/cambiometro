-- Tabla genérica de caché para archivos JSON pesados
CREATE TABLE IF NOT EXISTS kv_cache (
    key TEXT PRIMARY KEY,
    value_json TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
