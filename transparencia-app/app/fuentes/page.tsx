import type { Metadata } from "next";
import Link from "next/link";
import { getDataQualityDashboardData } from "@/lib/data-quality-dashboard";
import { GLOBAL_KPIS } from "@/lib/global-kpis";

export const metadata: Metadata = {
  title: "Fuentes y versiones — El Cambiómetro",
  description:
    "Catálogo de fuentes oficiales del Estado de Chile consultadas por El Cambiómetro, con estado de actualización, períodos cubiertos y versión de la consolidación.",
  alternates: { canonical: "/fuentes" },
};

export default async function FuentesPage() {
  const { sources, summary } = await getDataQualityDashboardData();
  const sorted = [...sources].sort((a, b) => a.organization.localeCompare(b.organization, "es"));

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
              Cada registro publicado por El Cambiómetro proviene de un portal oficial del Estado de Chile y mantiene
              trazabilidad a su fuente. Esta página lista las fuentes integradas, su cadencia de actualización,
              cobertura declarada y trazabilidad a la consolidación vigente.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
              <span className="badge badge-ok" style={{ fontSize: "0.68rem" }}>Versión {GLOBAL_KPIS.corte}</span>
              <Link prefetch={false} className="data-link" href="/datos/calidad" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                Dashboard de calidad →
              </Link>
            </div>
          </div>

          <dl className="page-fact-sheet">
            <div>
              <dt>Registros Canónicos</dt>
              <dd>{GLOBAL_KPIS.registros_canonicos.toLocaleString("es-CL")}</dd>
            </div>
            <div>
              <dt>Fuentes Públicas</dt>
              <dd>{GLOBAL_KPIS.total_fuentes} ({GLOBAL_KPIS.fuentes_oficiales} oficiales + {GLOBAL_KPIS.fuentes_derivadas} derivada)</dd>
            </div>
            <div>
              <dt>Actualización</dt>
              <dd>{GLOBAL_KPIS.corte}</dd>
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
              {summary.totalRegistrosCanonicos.toLocaleString("es-CL")} registros canónicos por fuente · consolidado {GLOBAL_KPIS.registros_canonicos.toLocaleString("es-CL")} (incluye actividad parlamentaria){" "}
              <Link prefetch={false} href="/datos/calidad" className="data-link" style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                (ver nota en calidad de datos)
              </Link>
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))", gap: "1rem" }}>
            {sorted.map((source) => {
              return (
                <article key={source.id} className="card" style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                    <div>
                      <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>{source.name}</h3>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>{source.organization}</span>
                    </div>
                    <span className={source.statusBadgeClass} style={{ fontSize: "0.68rem", whiteSpace: "nowrap" }}>
                      {source.statusLabel}
                    </span>
                  </div>

                  <a href={source.officialUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "var(--accent)" }}>
                    Portal oficial ↗
                  </a>

                  <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.75rem" }}>
                    <div>
                      <dt style={{ fontWeight: 700, display: "inline", color: "var(--text-primary)" }}>Registros: </dt>
                      <dd style={{ display: "inline", color: "var(--text-muted)" }}>
                        Canónicos: {source.canonicalCount.toLocaleString("es-CL")} · Histórico: {source.historicalCount.toLocaleString("es-CL")}
                      </dd>
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-subtle)", marginTop: "-0.15rem" }}>
                      Diferencia por deduplicación y cobertura declarada
                    </div>
                    <div>
                      <dt style={{ fontWeight: 700, display: "inline", color: "var(--text-primary)" }}>Período reciente: </dt>
                      <dd style={{ display: "inline", color: "var(--text-muted)" }}>{source.periodoReciente}</dd>
                    </div>
                    <div>
                      <dt style={{ fontWeight: 700, display: "inline", color: "var(--text-primary)" }}>Desfase / Frescura: </dt>
                      <dd style={{ display: "inline", color: "var(--text-muted)" }}>{source.desfase}</dd>
                    </div>
                    <div>
                      <dt style={{ fontWeight: 700, display: "inline", color: "var(--text-primary)" }}>Cobertura: </dt>
                      <dd style={{ display: "inline", color: "var(--text-muted)" }}>{source.coberturaDetalle}</dd>
                    </div>
                    <div>
                      <dt style={{ fontWeight: 700, display: "inline", color: "var(--text-primary)" }}>Última validación ETL: </dt>
                      <dd style={{ display: "inline", color: "var(--text-muted)" }}>{source.lastSyncFormatted}</dd>
                    </div>
                  </dl>
                  {source.coverageNote && (
                    <p style={{ fontSize: "0.72rem", color: "var(--text-subtle)", lineHeight: 1.5, margin: "0.25rem 0 0 0" }}>
                      {source.coverageNote}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="card" style={{ padding: "1.75rem" }}>
          <h2 style={{ fontSize: "1.15rem", margin: "0 0 0.5rem 0", color: "var(--text-primary)" }}>Cómo se versionan los datos</h2>
          <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>
            Cada extracción se valida contra el contrato de datos de la plataforma y se publica como una versión
            con checksum. La fecha de corte de la consolidación vigente es{" "}
            <strong style={{ color: "var(--text-primary)" }}>{GLOBAL_KPIS.corte}</strong>, y el detalle de las
            proyecciones está disponible en <Link prefetch={false} href="/datos" style={{ color: "var(--accent)" }}>Datos</Link>,{" "}
            <Link prefetch={false} href="/datos/calidad" style={{ color: "var(--accent)" }}>Dashboard de Calidad</Link> y{" "}
            <Link prefetch={false} href="/como-funciona" style={{ color: "var(--accent)" }}>Metodología</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}