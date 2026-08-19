-- Migration 0006_servicios_y_municipalidades.sql
-- Ampliación de Esquema: Servicios Públicos, Municipalidades, Funcionarios Públicos y Red de Influencias

-- ============================================================
-- 1. TABLA: Servicios Públicos y Ministerios
-- ============================================================
CREATE TABLE IF NOT EXISTS servicios_publicos (
    id                      TEXT PRIMARY KEY,
    nombre                  TEXT NOT NULL,
    sigla                   TEXT NOT NULL,
    tipo_organo             TEXT NOT NULL,          -- 'Ministerio', 'Subsecretaría', 'Servicio Nacional', 'Empresa Pública'
    ministerio_dependiente  TEXT,
    presupuesto_anual_clp   REAL DEFAULT 0,
    director_jefe_actual    TEXT,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. TABLA: Municipalidades de Chile
-- ============================================================
CREATE TABLE IF NOT EXISTS municipalidades (
    id                      TEXT PRIMARY KEY,
    nombre_comuna           TEXT NOT NULL,
    region                  TEXT NOT NULL,
    alcalde_actual          TEXT NOT NULL,
    partido_alcalde         TEXT,
    poblacion               INTEGER DEFAULT 0,
    presupuesto_municipal_clp REAL DEFAULT 0,
    alertas_contraloria_cgr INTEGER DEFAULT 0,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. TABLA: Funcionarios Públicos y Asesores
-- ============================================================
CREATE TABLE IF NOT EXISTS funcionarios_publicos (
    id                      TEXT PRIMARY KEY,
    rut                     TEXT NOT NULL,
    nombre_completo         TEXT NOT NULL,
    organo_id               TEXT NOT NULL,          -- ID de servicio_publico, municipalidad o congreso
    organo_tipo             TEXT NOT NULL,          -- 'servicio', 'municipalidad', 'congreso'
    cargo                   TEXT NOT NULL,
    estamento               TEXT NOT NULL,          -- 'Directivo', 'Profesional', 'Técnico', 'Honorarios'
    tipo_contrato           TEXT NOT NULL,          -- 'Planta', 'Contrata', 'Honorarios'
    remuneracion_bruta_mensual REAL NOT NULL,
    fecha_ingreso           TEXT NOT NULL,
    alerta_parentesco_politico INTEGER DEFAULT 0,  -- 1 = Familiar directo de parlamentario o alcalde
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. TABLA: Red de Influencias y Nombramientos
-- ============================================================
CREATE TABLE IF NOT EXISTS red_influencias (
    id                      TEXT PRIMARY KEY,
    entidad_origen_id       TEXT NOT NULL,          -- ID de politico, funcionario o alcalde
    entidad_origen_tipo     TEXT NOT NULL,          -- 'politico', 'funcionario', 'alcalde', 'empresa'
    entidad_destino_id      TEXT NOT NULL,
    entidad_destino_tipo    TEXT NOT NULL,
    tipo_relacion           TEXT NOT NULL,          -- 'Nombramiento', 'Militancia', 'Familiar', 'Socio', 'Asesoría'
    nivel_influencia        TEXT NOT NULL,          -- 'Directa', 'Alta', 'Moderada'
    descripcion_vinculo     TEXT NOT NULL,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_funcionarios_organo ON funcionarios_publicos(organo_id, organo_tipo);
CREATE INDEX IF NOT EXISTS idx_funcionarios_rut ON funcionarios_publicos(rut);
CREATE INDEX IF NOT EXISTS idx_red_origen ON red_influencias(entidad_origen_id);
CREATE INDEX IF NOT EXISTS idx_red_destino ON red_influencias(entidad_destino_id);
