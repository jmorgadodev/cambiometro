-- Migration 0007_gobierno_transparencia_activa.sql
-- Integración de APIs de Gobierno Transparente (CPLT, Mercado Público, CGR SISPER)

-- ============================================================
-- 1. TABLA: Solicitudes de Transparencia (Consejo para la Transparencia CPLT)
-- ============================================================
CREATE TABLE IF NOT EXISTS cplt_solicitudes_transparencia (
    id                      TEXT PRIMARY KEY,
    organo_id               TEXT NOT NULL,          -- ID de municipalidad, ministerio o congreso
    organo_nombre           TEXT NOT NULL,
    numero_solicitud        TEXT NOT NULL,
    fecha_ingreso           TEXT NOT NULL,
    materia_solicitada      TEXT NOT NULL,
    estado                  TEXT NOT NULL,          -- 'Respondida', 'No Respondida en Plazo', 'Amparo CPLT'
    dias_atraso             INTEGER DEFAULT 0,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. TABLA: Registro de Sanciones y Sumarios CGR (SISPER)
-- ============================================================
CREATE TABLE IF NOT EXISTS sisper_sanciones_cgr (
    id                      TEXT PRIMARY KEY,
    funcionario_rut         TEXT NOT NULL,
    funcionario_nombre      TEXT NOT NULL,
    organo_nombre           TEXT NOT NULL,
    tipo_sancion            TEXT NOT NULL,          -- 'Censura', 'Multa 20%', 'Suspensión 30 días', 'Destitución'
    fecha_resolucion        TEXT NOT NULL,
    numero_dictamen_cgr     TEXT NOT NULL,
    observacion_sumario     TEXT NOT NULL,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. TABLA: Ordenes de Compra Mercado Público (ChileCompra Open Data)
-- ============================================================
CREATE TABLE IF NOT EXISTS mercadopublico_ordenes_compra (
    id                      TEXT PRIMARY KEY,
    id_oc                   TEXT NOT NULL,          -- Ej: '3452-12-CM24'
    comprador_nombre        TEXT NOT NULL,
    proveedor_rut           TEXT NOT NULL,
    proveedor_razon_social  TEXT NOT NULL,
    monto_total_clp         REAL NOT NULL,
    fecha_emision           TEXT NOT NULL,
    tipo_proceso            TEXT NOT NULL,          -- 'Trato Directo Excepcional', 'Licitación Pública'
    alerta_trato_directo    INTEGER DEFAULT 0,      -- 1 = Trato directo de alto monto sin competencia
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cplt_organo ON cplt_solicitudes_transparencia(organo_id);
CREATE INDEX IF NOT EXISTS idx_sisper_rut ON sisper_sanciones_cgr(funcionario_rut);
CREATE INDEX IF NOT EXISTS idx_mp_oc ON mercadopublico_ordenes_compra(id_oc);
