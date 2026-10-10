import type { Metadata } from "next";
import Link from "next/link";
import { getDataQualityDashboardData } from "@/lib/data-quality-dashboard";

export const metadata: Metadata = {
  title: "Fuentes y versiones — El Cambiómetro",
  description:
    "Catálogo de fuentes oficiales del Estado de Chile consultadas por El Cambiómetro, con estado de actualización, períodos cubiertos y versión de la consolidación.",
  alternates: { canonical: "/fuentes" },
};

const COMPONENT_LABELS: Record<string, string> = {
  asistencia: "Asistencia",
  votaciones: "Votaciones",
  datosAbiertos: "Datos abiertos",
  gastos: "Gastos operacionales",
};

export default async function FuentesPage() {
  const { sources, summary } = await getDataQualityDashboardData();
  const sorted = [...sources].sort((a, b) => a.organization.localeCompare(b.organization, "es"));
  const hasRelease = /^[a-f0-9]{16}$/.test(summary.releaseChecksum);
  const totalLabel = hasRelease && Number.isSafeInteger(summary.totalRegistrosCanonicos) && (summary.totalRegistrosCanonicos ?? -1) >= 0
    ? summary.totalRegistrosCanonicos!.toLocaleString("es-CL")
    : "Conteo conjunto no calculable";

  return (
    <div className="page-shell" style={{ minHeight: "100vh" }}>
      <header className="page-masthead">
        <div className="container-main page-masthead__grid">
          <div>
            <span className="eyebrow">Plataforma de Datos Públicos</span>
            <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", margin: "0.25rem 0 0.5rem 0" }}>
              Fuentes y versiones
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6, maxWidth: 720, margin: 0 }}>
              Cada registro publicado por El Cambiómetro mantiene trazabilidad a su fuente y a su corte de actualización.
              Esta página separa lo publicado, lo que puede recorrerse mediante paginación y lo que participa en relaciones documentales.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
              <span className="badge badge-ok" style={{ fontSize: "0.68rem" }}>Cortes por fuente</span>
              <Link prefetch={false} className="data-link" href="/datos/calidad" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                Dashboard de calidad →
              </Link>
            </div>
          </div>

          <dl className="page-fact-sheet">
            <div>
              <dt>Registros Canónicos</dt>
              <dd>{totalLabel}</dd>
            </div>
            <div>
              <dt>Fuentes Públicas</dt>
              <dd>{summary.totalFuentes} ({summary.fuentesOficiales} oficiales + {summary.fuentesDerivadas} derivada)</dd>
            </div>
            <div>
              <dt>Versión del catálogo</dt>
              <dd>{hasRelease ? summary.releaseChecksum : "Versión no informada"}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="container-main" style={{ padding: "2.5rem 1.5rem 4rem", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
        <section>
          <div style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.3rem", margin: "0 0 0.25rem 0", color: "var(--text-primary)" }}>
              Catálogo de fuentes integradas
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
              {totalLabel}{summary.totalRegistrosCanonicos !== null && hasRelease ? " registros en los alcances conciliados" : ""}. Cada fuente conserva su propio período y alcance.{" "}
              <Link prefetch={false} href="/datos/calidad" className="data-link" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                (ver nota en calidad de datos)
              </Link>
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }} aria-label="Métricas de cobertura">
            {([
              ["Publicado", summary.metrics.published],
              ["Consultable", summary.metrics.queryable],
              ["Relacionado", summary.metrics.related],
            ] as const).map(([label, metric]) => (
              <div key={label} className="stat-tile stat-tile--info">
                <div className="stat-tile__value">{hasRelease ? metric.label : "No calculable"}</div>
                <div className="stat-tile__label">{label}</div>
                <div className="stat-tile__hint">{!hasRelease || metric.count === null ? "La evidencia aún no permite calcularlo" : `${metric.count.toLocaleString("es-CL")} registros sobre ${metric.denominator?.toLocaleString("es-CL")}`}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "1rem" }}>
            {sorted.map((source) => {
              const hasSourceCount = hasRelease && (source.reconciliation.comparisonEligible || source.reconciliation.state === "release_override");
              return (
                <article key={source.id} className="card" style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                    <div>
                      <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>{source.name}</h3>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>{source.organization}</span>
                    </div>
                    <span className={hasRelease ? source.statusBadgeClass : "badge"} style={{ fontSize: "0.68rem", whiteSpace: "nowrap" }}>
                      {hasRelease ? source.statusLabel : "Cobertura no medida"}
                    </span>
                  </div>

                  <a href={source.officialUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "var(--accent)" }}>
                    Portal oficial ↗
                  </a>

                  <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.75rem" }}>
                    <div>
                      <dt style={{ fontWeight: 700, display: "inline", color: "var(--text-primary)" }}>Registros: </dt>
                      <dd style={{ display: "inline", color: "var(--text-muted)" }}>
                        {!hasSourceCount ? "Conteo no medido para este corte" : source.reconciliation.state === "release_override"
                          ? `${(source.publicHistoricalCount ?? source.canonicalCount).toLocaleString("es-CL")} registros publicados y consultables`
                          : source.reconciliation.comparisonEligible
                            ? `${source.canonicalCount.toLocaleString("es-CL")} registros en este alcance · Consultables: ${source.publicHistoricalCount?.toLocaleString("es-CL") ?? "No conciliable"}`
                            : "Conteo pendiente de revisión"}
                        {hasSourceCount && source.catalogDeclaredCount && source.publicHistoricalCount !== null && source.catalogDeclaredCount !== source.publicHistoricalCount
                          ? ` · Catálogo declarado: ${source.catalogDeclaredCount.toLocaleString("es-CL")}`
                          : ""}
                      </dd>
                    </div>
              <div style={{ fontSize: "0.7rem", color: source.publicHistoricalCount === null || source.publicHistoricalCount < source.historicalCount ? "var(--warn)" : "var(--text-subtle)", marginTop: "-0.15rem" }}>
                      {!hasSourceCount || source.publicHistoricalCount === null
                        ? "La cobertura total de la fuente no está medida."
                        : source.reconciliation.state === "release_override"
                        ? "La cobertura total de la fuente no está medida."
                        : source.publicHistoricalCount < source.historicalCount
                        ? `Histórico declarado: ${source.historicalCount.toLocaleString("es-CL")}; consultable en este alcance: ${source.publicHistoricalCount.toLocaleString("es-CL")}.`
                        : "Los conteos declarados coinciden en este alcance; no representan necesariamente el universo completo."}
                    </div>
                    <div>
                      <dt style={{ fontWeight: 700, display: "inline", color: "var(--text-primary)" }}>Período reciente: </dt>
                      <dd style={{ display: "inline", color: "var(--text-muted)" }}>{hasRelease ? source.periodoReciente : "No informado para este corte"}</dd>
                    </div>
                    <div>
                      <dt style={{ fontWeight: 700, display: "inline", color: "var(--text-primary)" }}>Desfase / Frescura: </dt>
                      <dd style={{ display: "inline", color: "var(--text-muted)" }}>{hasRelease ? source.desfase : "No medida"}</dd>
                    </div>
                    <div>
                      <dt style={{ fontWeight: 700, display: "inline", color: "var(--text-primary)" }}>Cobertura: </dt>
                      <dd style={{ display: "inline", color: "var(--text-muted)" }}>{hasSourceCount ? source.coberturaDetalle : "No medida"}</dd>
                    </div>
                    <div>
                      <dt style={{ fontWeight: 700, display: "inline", color: "var(--text-primary)" }}>
                        {source.lastSyncKind === "source-success" ? "Última actualización comprobada: " : source.lastSyncKind === "release" ? "Fecha del release: " : "Fecha de actualización: "}
                      </dt>
                      <dd style={{ display: "inline", color: "var(--text-muted)" }}>{hasRelease ? source.lastSyncFormatted : "No informada para este corte"}</dd>
                    </div>
                    <div style={{ paddingTop: "0.35rem", borderTop: "1px solid var(--border-subtle)" }}>
                      <dt style={{ fontWeight: 700, color: "var(--text-primary)" }}>Cobertura con evidencia</dt>
                      <dd style={{ margin: "0.25rem 0 0", color: "var(--text-muted)" }}>
                        Publicado {hasSourceCount ? source.metrics.published.label : "No calculable"} · Consultable {hasSourceCount ? source.metrics.queryable.label : "No calculable"} · Relacionado {hasSourceCount ? source.metrics.related.label : "No calculable"}
                      </dd>
                    </div>
                  </dl>
                  {source.coverageNote && (
                    <p style={{ fontSize: "0.72rem", color: "var(--text-subtle)", lineHeight: 1.5, margin: "0.25rem 0 0 0" }}>
                      {source.coverageNote}
                    </p>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginTop: "auto", paddingTop: "0.5rem" }}>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)" }}>
                      {hasSourceCount && source.reconciliation.comparisonEligible
                        ? "Conteos comparados"
                        : source.reconciliation.state === "release_override"
                          ? "Cobertura total sin medir"
                          : "Conteos pendientes de revisión"}
                    </span>
                    <Link prefetch={false} href={source.modulePath} className="data-link" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                      Explorar registros →
                    </Link>
                  </div>
                  {!hasSourceCount && (
                    <p style={{ margin: "0.25rem 0 0", color: "var(--accent)", fontSize: "0.72rem", lineHeight: 1.45 }}>
                      No hay conteos conciliados para este alcance; no se infiere cobertura completa.
                    </p>
                  )}
                  {hasRelease && source.reconciliation.components && Object.keys(source.reconciliation.components).length > 0 && (
                    <details style={{ margin: "0.25rem 0 0", fontSize: "0.72rem" }}>
                      <summary style={{ cursor: "pointer", color: "var(--accent)" }}>Ver desglose del corte</summary>
                      <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1rem", lineHeight: 1.45, color: "var(--text-muted)" }}>
                        {Object.entries(source.reconciliation.components).map(([key, count]) => (
                          <li key={key}>
                            {COMPONENT_LABELS[key] ?? key}: {count.toLocaleString("es-CL")}
                          </li>
                        ))}
                      </ul>
                      <p style={{ margin: "0.35rem 0 0", color: "var(--text-subtle)" }}>
                        Cada componente conserva su propio alcance.
                      </p>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="card" style={{ padding: "1.75rem" }}>
          <h2 style={{ fontSize: "1.15rem", margin: "0 0 0.5rem 0", color: "var(--text-primary)" }}>Cómo se versionan los datos</h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
            Cada extracción se valida antes de publicarse. Cada fuente conserva su propia fecha de corte;
            la versión del catálogo no es una fecha de actualización común. El detalle de las
            proyecciones está disponible en <Link prefetch={false} href="/datos" style={{ color: "var(--accent)" }}>Datos</Link>,{" "}
            <Link prefetch={false} href="/datos/calidad" style={{ color: "var(--accent)" }}>Dashboard de Calidad</Link> y{" "}
            <Link prefetch={false} href="/como-funciona" style={{ color: "var(--accent)" }}>Metodología</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
