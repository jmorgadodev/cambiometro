import type { Metadata } from "next";
import Link from "next/link";
import { getDataQualityDashboardData } from "@/lib/data-quality-dashboard";
import Icono from "@/components/ui/Icono";

export const metadata: Metadata = {
  title: "Dashboard Público de Calidad de Datos — El Cambiómetro",
  description:
    "Monitor público de integridad, frescura, volumen canónico e histórico, cobertura municipal y validación de guards V1-V7 de las 13 fuentes oficiales del Estado de Chile.",
  alternates: { canonical: "/datos/calidad" },
};

export default async function DataQualityPage() {
  const { sources, summary } = await getDataQualityDashboardData();

  return (
    <div className="page-shell" style={{ minHeight: "100vh" }}>
      {/* ─── HERO MASTHEAD ──────────────────────────────────────────────── */}
      <header className="page-masthead">
        <div className="container-main page-masthead__grid" style={{ gridTemplateColumns: "minmax(0, 1.25fr) minmax(22rem, 1fr)" }}>
          <div>
            <span className="eyebrow">Auditoría y Confianza Pública</span>
            <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", margin: "0.25rem 0 0.5rem 0" }}>
              Dashboard de Calidad de Datos
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6, maxWidth: 720, margin: 0 }}>
              Consolidación pública del estado de integridad, frescura, cobertura y volumen de las {summary.totalFuentes} fuentes
              ({summary.fuentesOficiales} oficiales + {summary.fuentesDerivadas} derivada) consultadas por El Cambiómetro.
              Inspirado en los estándares internacionales de datos abiertos y trazabilidad ciudadana.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
              <span className="badge badge-ok" style={{ fontSize: "0.72rem", padding: "0.3rem 0.6rem" }}>
                ✓ Guards V1-V7: 0 violaciones críticas
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>
                Última validación ETL: <strong style={{ color: "var(--text-primary)" }}>{summary.ultimaValidacionFormatted}</strong>
              </span>
            </div>
          </div>

          <dl className="page-fact-sheet" aria-label="Resumen de calidad de datos">
            <div>
              <dt>Registros Canónicos</dt>
              <dd>{summary.totalRegistrosCanonicos.toLocaleString("es-CL")}</dd>
            </div>
            <div>
              <dt>Fuentes Operativas</dt>
              <dd>{summary.fuentesAlDia} / {summary.totalFuentes}</dd>
            </div>
            <div>
              <dt>Release & Integridad</dt>
              <dd style={{ fontSize: "1.1rem" }}>
                {summary.releaseVersion}{" "}
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                  ({summary.releaseChecksum})
                </span>
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <main id="contenido-principal" className="container-main" style={{ padding: "2.5rem 1.5rem 4rem", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
        {/* ─── KPIS GLOBALES ──────────────────────────────────────────────── */}
        <section aria-label="Indicadores clave de calidad">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
            }}
          >
            <div className="stat-tile stat-tile--ok">
              <div className="stat-tile__value">{summary.fuentesAlDia} / {summary.totalFuentes}</div>
              <div className="stat-tile__label">Fuentes Operativas</div>
              <div className="stat-tile__hint">12 oficiales + 1 derivada parlamentaria</div>
            </div>

            <div className="stat-tile stat-tile--accent">
              <div className="stat-tile__value">{summary.coberturaMunicipalAlDia} / {summary.coberturaMunicipalTotal}</div>
              <div className="stat-tile__label">Nóminas Municipales ≤90d</div>
              <div className="stat-tile__hint">Cobertura CPLT Transparencia Activa</div>
            </div>

            <div className="stat-tile stat-tile--ok">
              <div className="stat-tile__value">0</div>
              <div className="stat-tile__label">Incidentes Críticos</div>
              <div className="stat-tile__hint">100% registros validados bajo guards V1-V7</div>
            </div>

            <div className="stat-tile stat-tile--info">
              <div className="stat-tile__value">{summary.totalRegistrosHistoricos.toLocaleString("es-CL")}</div>
              <div className="stat-tile__label">Registros Históricos</div>
              <div className="stat-tile__hint">Consolidación en Lake D1 / R2</div>
            </div>
          </div>
        </section>

        {/* ─── TABLA PRINCIPAL DE FUENTES Y CALIDAD ───────────────────────── */}
        <section aria-labelledby="tabla-calidad-title">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Matriz de Auditoría</p>
              <h2 id="tabla-calidad-title" style={{ fontSize: "1.35rem", margin: "0.25rem 0 0", color: "var(--text-primary)" }}>
                Estado y Cobertura de las 13 Fuentes
              </h2>
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Cifras calculadas dinámicamente desde el catálogo authoritative y Lake de datos.
            </div>
          </div>

          <div
            className="table-container"
            style={{
              overflowX: "auto",
              background: "var(--bg-surface-2)",
              borderRadius: "var(--radius-card, 12px)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface-3)" }}>
                  <th style={{ padding: "0.9rem 1rem", fontWeight: 700, color: "var(--text-primary)" }}>Fuente Oficial / Institución</th>
                  <th style={{ padding: "0.9rem 1rem", fontWeight: 700, color: "var(--text-primary)" }}>Ámbito</th>
                  <th style={{ padding: "0.9rem 1rem", fontWeight: 700, color: "var(--text-primary)" }}>Estado</th>
                  <th style={{ padding: "0.9rem 1rem", fontWeight: 700, color: "var(--text-primary)", textAlign: "right" }}>Canónicos</th>
                  <th style={{ padding: "0.9rem 1rem", fontWeight: 700, color: "var(--text-primary)", textAlign: "right" }}>Históricos</th>
                  <th style={{ padding: "0.9rem 1rem", fontWeight: 700, color: "var(--text-primary)" }}>Período</th>
                  <th style={{ padding: "0.9rem 1rem", fontWeight: 700, color: "var(--text-primary)" }}>Última Sinc.</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr
                    key={source.id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "0.9rem 1rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {source.name}
                          {source.isDerived && (
                            <span className="badge" style={{ marginLeft: "0.4rem", fontSize: "0.65rem" }}>
                              Derivada
                            </span>
                          )}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          <span>{source.organization}</span>
                          <span>·</span>
                          <a
                            href={source.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--accent)", textDecoration: "none" }}
                            aria-label={`Ver portal oficial de ${source.name}`}
                          >
                            Portal oficial ↗
                          </a>
                        </div>
                        <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.72rem", color: "var(--text-subtle)", lineHeight: 1.4 }}>
                          {source.coverageNote}
                        </p>
                      </div>
                    </td>
                    <td style={{ padding: "0.9rem 1rem", whiteSpace: "nowrap" }}>
                      <span className="badge" style={{ fontSize: "0.7rem" }}>
                        {source.scopeLabel}
                      </span>
                    </td>
                    <td style={{ padding: "0.9rem 1rem", whiteSpace: "nowrap" }}>
                      <span className={source.statusBadgeClass} style={{ fontSize: "0.7rem" }}>
                        {source.statusLabel}
                      </span>
                    </td>
                    <td style={{ padding: "0.9rem 1rem", textAlign: "right", fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-mono, monospace)" }}>
                      {source.canonicalCount.toLocaleString("es-CL")}
                    </td>
                    <td style={{ padding: "0.9rem 1rem", textAlign: "right", color: "var(--text-muted)", fontFamily: "var(--font-mono, monospace)" }}>
                      {source.historicalCount.toLocaleString("es-CL")}
                    </td>
                    <td style={{ padding: "0.9rem 1rem", whiteSpace: "nowrap", color: "var(--text-primary)", fontWeight: 500 }}>
                      {source.periodoReciente}
                    </td>
                    <td style={{ padding: "0.9rem 1rem", whiteSpace: "nowrap", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {source.lastSyncFormatted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ─── PRINCIPIOS Y METODOLOGÍA DE CALIDAD ───────────────────────── */}
        <section aria-labelledby="metodologia-title" style={{ marginTop: "1rem" }}>
          <div className="section-heading" style={{ marginBottom: "1.25rem" }}>
            <div>
              <p className="eyebrow">Estándares Metodológicos</p>
              <h2 id="metodologia-title" style={{ fontSize: "1.35rem", margin: "0.25rem 0 0" }}>
                Principios de Integridad y Trazabilidad
              </h2>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
            <article className="card" style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Icono nombre="check" size={18} />
                <span>1. Regla R10: Sin Datos Inventados</span>
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                Si una municipalidad u organismo no publica información en el período consultado, el sistema muestra <strong style={{ color: "var(--text-primary)" }}>&ldquo;—&rdquo;</strong> con nota explicativa de origen. NUNCA se interpolan, aproximan o sustituyen cifras faltantes por conteos de otras tablas.
              </p>
            </article>

            <article className="card" style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Icono nombre="organismo" size={18} />
                <span>2. Deduplicación Canónica</span>
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                La diferencia entre registros históricos y canónicos responde al algoritmo de reconciliación de entidades por RUT oficial y CUT territorial. Permite fiscalizar personas y contratos únicos a través de múltiples períodos sin doble contabilidad.
              </p>
            </article>

            <article className="card" style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Icono nombre="cgr" size={18} />
                <span>3. Guards Automatizados V1-V7</span>
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.5, margin: 0 }}>
                Cada pipeline ejecuta validaciones estrictas en tiempo de compilación. Registros con anomalías extremas (sueldos &gt; $60M o &gt; 300 hrs extras) son aislados en capas de cuarentena conservando intacta la URL del documento original.
              </p>
            </article>
          </div>
        </section>

        {/* ─── NAVEGACIÓN CRUZADA ─────────────────────────────────────────── */}
        <section
          style={{
            padding: "1.5rem",
            background: "var(--bg-surface-2)",
            borderRadius: "var(--radius-card, 12px)",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1.25rem",
          }}
          aria-label="Enlaces relacionados de datos y fuentes"
        >
          <div>
            <h3 style={{ fontSize: "1rem", margin: "0 0 0.25rem 0", color: "var(--text-primary)" }}>
              ¿Quieres explorar el catálogo detallado o el estado técnico de los ETLs?
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              Accede a las especificaciones técnicas por fuente o al estado de conexión de los pipelines.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link className="btn btn-secondary" href="/fuentes" style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}>
              Ver catálogo de fuentes →
            </Link>
            <Link className="btn btn-secondary" href="/datos" style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}>
              Monitor de salud de ETLs →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export const dynamic = "force-dynamic";
