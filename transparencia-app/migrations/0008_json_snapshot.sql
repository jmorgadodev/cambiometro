-- Creación de la tabla de caché para los JSON de la UI

CREATE TABLE IF NOT EXISTS politico_data_cache (
    politico_id TEXT PRIMARY KEY,
    gastos_json TEXT,
    votaciones_json TEXT,
    stats_json TEXT,
    personal_json TEXT,
    remuneracion_json TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
