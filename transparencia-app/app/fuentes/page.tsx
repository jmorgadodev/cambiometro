import type { Metadata } from "next";
import { listPublishedSourceManifests } from "@/lib/published-sources";
import { GLOBAL_KPIS } from "@/lib/global-kpis";

export const metadata: Metadata = {
  title: "Fuentes y versiones — El Cambiómetro",
  description:
    "Catálogo de fuentes oficiales del Estado de Chile consultadas por El Cambiómetro, con estado de actualización, períodos cubiertos y versión de la consolidación.",
};

const VERSION_FECHA = "19 de agosto de 2026";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  connected: { label: "Conectada", className: "badge badge-ok" },
  partial: { label: "Parcial", className: "badge badge-integrating" },
  stale: { label: "Desactualizada", className: "badge" },
  unavailable: { label: "No disponible", className: "badge" },
};

export default async function FuentesPage() {
  const sources = await listPublishedSourceManifests();
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
              trazabilidad a su fuente. Esta página lista las fuentes integradas, su estado y la versión de la
              consolidación vigente.
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-subtle)", marginTop: "0.75rem" }}>
              <span className="badge badge-ok" style={{ fontSize: "0.68rem" }}>Versión {VERSION_FECHA}</span>
            </p>
          </div>

          <dl className="page-fact-sheet">
            <div>
              <dt>Registros Oficiales</dt>
              <dd>{GLOBAL_KPIS.registros_canonicos.toLocaleString("es-CL")}</dd>
            </div>
            <div>
              <dt>Fuentes Públicas</dt>
              <dd>{GLOBAL_KPIS.fuentes_operativas}</dd>
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
              {sorted.length} fuentes oficiales con {GLOBAL_KPIS.registros_canonicos.toLocaleString("es-CL")} registros compilados.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "1rem" }}>
            {sorted.map((source) => {
              const status = STATUS_LABEL[source.status] ?? { label: source.status, className: "badge" };
              return (
                <article key={source.id} className="card" style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                    <div>
                      <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>{source.label}</h3>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>{source.organization}</span>
                    </div>
                    <span className={status.className} style={{ fontSize: "0.68rem", whiteSpace: "nowrap" }}>{status.label}</span>
                  </div>
                  <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "var(--accent)" }}>
                    Portal oficial ↗
                  </a>
                  <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.75rem" }}>
                    <div>
                      <dt style={{ fontWeight: 700, display: "inline", color: "var(--text-primary)" }}>Registros: </dt>
                      <dd style={{ display: "inline", color: "var(--text-muted)" }}>{source.recordCount.toLocaleString("es-CL")}</dd>
                    </div>
                    <div>
                      <dt style={{ fontWeight: 700, display: "inline", color: "var(--text-primary)" }}>Cobertura: </dt>
                      <dd style={{ display: "inline", color: "var(--text-muted)" }}>{source.expectedCoverage}</dd>
                    </div>
                    {source.foundPeriods.length > 0 && (
                      <div>
                        <dt style={{ fontWeight: 700, display: "inline", color: "var(--text-primary)" }}>Períodos: </dt>
                        <dd style={{ display: "inline", color: "var(--text-muted)" }}>
                          {source.foundPeriods.slice(0, 6).join(", ")}
                          {source.foundPeriods.length > 6 ? ` (+${source.foundPeriods.length - 6})` : ""}
                        </dd>
                      </div>
                    )}
                    {source.lastUpdated && (
                      <div>
                        <dt style={{ fontWeight: 700, display: "inline", color: "var(--text-primary)" }}>Última actualización: </dt>
                        <dd style={{ display: "inline", color: "var(--text-muted)" }}>
                          {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(source.lastUpdated))}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt style={{ fontWeight: 700, display: "inline", color: "var(--text-primary)" }}>Licencia: </dt>
                      <dd style={{ display: "inline", color: "var(--text-muted)" }}>{source.license}</dd>
                    </div>
                  </dl>
                  {source.statusDetail && (
                    <p style={{ fontSize: "0.72rem", color: "var(--text-subtle)", lineHeight: 1.5, margin: 0 }}>
                      {source.statusDetail}
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
            proyecciones está disponible en <a href="/datos" style={{ color: "var(--accent)" }}>Datos</a> y{" "}
            <a href="/como-funciona" style={{ color: "var(--accent)" }}>Metodología</a>.
          </p>
        </section>
      </div>
    </div>
  );
}