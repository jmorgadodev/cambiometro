-- Migration 0004_full_d1_seed.sql
-- Inserción de partidos y autoridades políticas de Chile en Cloudflare D1.
-- REGLA: solo datos reales y verificados. El RUT no lo publican las fuentes
-- oficiales, así que NO se siembra un RUT simulado. Los scores de probidad se
-- calculan con el ETL cuando exista fuente real; NO se siembran cifras aleatorias.

-- 1. Partidos Políticos
INSERT OR IGNORE INTO partidos (id, nombre, sigla, color_hex) VALUES
('udi', 'Unión Demócrata Independiente', 'UDI', '#1E40AF'),
('rn', 'Renovación Nacional', 'RN', '#2563EB'),
('evopoli', 'Evolución Política', 'EvoPoli', '#4F46E5'),
('ps', 'Partido Socialista', 'PS', '#EF4444'),
('ppd', 'Partido por la Democracia', 'PPD', '#F97316'),
('pdc', 'Partido Demócrata Cristiano', 'PDC', '#F59E0B'),
('fa', 'Frente Amplio', 'FA', '#8B5CF6'),
('pc', 'Partido Comunista de Chile', 'PC', '#DC2626'),
('rep', 'Partido Republicano', 'REP', '#0F172A'),
('dem', 'Demócratas', 'DEM', '#0284C7'),
('ama', 'Amarillos por Chile', 'AMA', '#EAB308'),
('ind', 'Independientes', 'IND', '#64748B');

-- 2. Diputados y Senadores (2026-2030, verificado). Sin columna rut: el RUT no lo
-- publican las fuentes oficiales y no se debe inventar.
INSERT OR IGNORE INTO politicos (id, nombre_completo, cargo, partido_id, distrito_region, twitter_handle) VALUES
('dip-002', 'Luis Malla Valenzuela', 'Diputado', 'pl', 'Región de Arica y Parinacota', '@luismalla'),
('dip-055', 'Emilia Schneider Videla', 'Diputado', 'fa', 'Región Metropolitana', '@emiliaschneider'),
('dip-061', 'José Antonio Kast Adriasola', 'Diputado', 'rep', 'Región Metropolitana', '@joseantoniokast'),
('dip-063', 'Catalina Del Real Mihovilovic', 'Diputado', 'rep', 'Región Metropolitana', '@catadelreal'),
('sen-015', 'Camila Flores Oporto', 'Senador', 'rn', 'Región de Valparaíso', '@camilaflores'),
('sen-038', 'Vanessa Kaiser Barents-Von Hohenhagen', 'Senador', 'pnl', 'Región de La Araucanía', '@vkaisersen');

-- 3. Scores de Probidad: SIGUEN VACÍOS.
--    Antes esta migración sembraba scores (82/90/80/…) sin fuente. REGLA: un score
--    solo se inserta si proviene de fuentes reales (asistencia Congreso OpenData,
--    gastos opendata.congreso.cl, DIP). Mientras no exista fuente, la tabla
--    scores_probidad queda sin filas y el frontend muestra "Sin datos verificados".
--    (Habilitar cuando se conecten las fuentes reales.)

-- 4. Alertas de Anomalías Iniciales (solo inicio de período, sin cifras inventadas)
INSERT OR IGNORE INTO alertas_anomalias (id, politico_id, fecha, tipo_alerta, nivel_gravedad, descripcion) VALUES
('alerta-001', 'dip-061', date('now'), 'InicioPeríodo', 'info', 'Asume escaño del distrito 10 que ocupó Johannes Kaiser desde 2026'),
('alerta-002', 'sen-015', date('now'), 'InicioPeríodo', 'info', 'Comienza como senadora por Valparaíso (2026-2034)'),
('alerta-003', 'sen-038', date('now'), 'InicioPeríodo', 'info', 'Comienza como senadora por La Araucanía (2026-2034)');