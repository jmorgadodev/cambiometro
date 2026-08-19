-- Migration 0005_judicial_and_audit_sources.sql
-- Ampliación de Esquema: Poder Judicial (PJUD), Contraloría General (CGR), Servel y ChileCompra

-- ============================================================
-- 1. TABLA: Causas Judiciales y Querellas (Poder Judicial PJUD)
-- ============================================================
CREATE TABLE IF NOT EXISTS causas_judiciales (
    id                   TEXT PRIMARY KEY,
    politico_id          TEXT NOT NULL,
    tribunal             TEXT NOT NULL,          -- 'Juzgado de Garantía de Santiago', 'Corte de Apelaciones'
    rol_rit              TEXT NOT NULL,          -- RIT (ej: 'RIT 1234-2024')
    materia              TEXT NOT NULL,          -- 'Fraude al Fisco', 'Cohecho', 'Negociación Incompatible', 'Lavado de Activos'
    calidad_procesal     TEXT NOT NULL,          -- 'Imputado', 'Querellado', 'Testigo', 'Formalizado'
    estado_causa         TEXT NOT NULL,          -- 'En Tramitación', 'Formalizada', 'Sobreseído', 'Condenado'
    fecha_ingreso        TEXT NOT NULL,
    resumen_hechos       TEXT NOT NULL,
    monto_involucrado    REAL DEFAULT 0,
    url_pjud             TEXT,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(politico_id) REFERENCES politicos(id)
);

-- ============================================================
-- 2. TABLA: Informes de Auditoría de Contraloría (CGR)
-- ============================================================
CREATE TABLE IF NOT EXISTS auditorias_contraloria (
    id                   TEXT PRIMARY KEY,
    politico_id          TEXT NOT NULL,
    organo_auditado      TEXT NOT NULL,          -- 'Municipalidad de...', 'Gobierno Regional', 'Ministerio'
    numero_informe       TEXT NOT NULL,          -- 'Informe N° 450/2024'
    ano                  INTEGER NOT NULL,
    observaciones_criticas TEXT NOT NULL,
    monto_reparos        REAL DEFAULT 0,
    reparos_patrimoniales INTEGER DEFAULT 0,     -- 1 = Sumario administrativo o reparo monetario
    url_informe_cgr      TEXT,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(politico_id) REFERENCES politicos(id)
);

-- ============================================================
-- 3. TABLA: Financiamiento y Gastos de Campaña (SERVEL)
-- ============================================================
CREATE TABLE IF NOT EXISTS gastos_campana_servel (
    id                   TEXT PRIMARY KEY,
    politico_id          TEXT NOT NULL,
    eleccion_ano         INTEGER NOT NULL,
    tipo_eleccion        TEXT NOT NULL,          -- 'Parlamentaria', 'Senatorial'
    total_gastado        REAL NOT NULL,
    reembolso_servel     REAL NOT NULL,
    aportes_propios      REAL DEFAULT 0,
    aportes_terceros     REAL DEFAULT 0,
    credito_conapoyo     REAL DEFAULT 0,
    url_servel           TEXT,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(politico_id) REFERENCES politicos(id)
);

-- ============================================================
-- 4. TABLA: Contrataciones en Mercado Público (ChileCompra)
-- ============================================================
CREATE TABLE IF NOT EXISTS contratos_mercado_publico (
    id                   TEXT PRIMARY KEY,
    politico_id          TEXT NOT NULL,
    rut_proveedor        TEXT NOT NULL,
    razon_social         TEXT NOT NULL,
    organismo_comprador  TEXT NOT NULL,
    id_licitacion        TEXT NOT NULL,          -- '2345-12-LR24'
    tipo_contratacion    TEXT NOT NULL,          -- 'Trato Directo', 'Licitación Pública'
    monto_neto           REAL NOT NULL,
    fecha_adjudicacion   TEXT NOT NULL,
    alerta_parentesco    INTEGER DEFAULT 0,      -- 1 = Proveedor coincide con familiar o socio
    url_mercado_publico  TEXT,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(politico_id) REFERENCES politicos(id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_causas_politico ON causas_judiciales(politico_id);
CREATE INDEX IF NOT EXISTS idx_auditorias_politico ON auditorias_contraloria(politico_id);
CREATE INDEX IF NOT EXISTS idx_servel_politico ON gastos_campana_servel(politico_id);
CREATE INDEX IF NOT EXISTS idx_mercado_publico_politico ON contratos_mercado_publico(politico_id);
