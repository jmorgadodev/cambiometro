import type { Metadata } from "next";
import Link from "@/components/SiteLink";
import { listEntities } from "@/lib/data-platform-d1";

export const metadata: Metadata = {
  title: "Entidades Canónicas — El Cambiómetro",
  description:
    "Catálogo de personas, organismos, proveedores y municipalidades indexados en la plataforma de evidencia pública. Busca y cruza entidades con documentos oficiales.",
};

const KIND_LABEL: Record<string, { label: string; emoji: string; badge: string }> = {
  person: { label: "Persona", emoji: "👤", badge: "badge-info" },
  public_body: { label: "Organismo", emoji: "🏛️", badge: "badge-ok" },
  supplier: { label: "Proveedor", emoji: "🏭", badge: "badge-warn" },
  municipality: { label: "Municipalidad", emoji: "🏘️", badge: "badge-ok" },
};

const PAGE_SIZE = 40;

export const dynamic = "force-static";

export default async function EntidadesPage() {
  const query: string = "";
  const kindFilter: string = "";
  const cursor = undefined;

  const result = await listEntities({
    kind: kindFilter ? (kindFilter as "person" | "public_body" | "supplier" | "municipality") : undefined,
    limit: PAGE_SIZE,
    cursor,
  });

  const filtered = result.data || [];

  const allKindCounts = await listEntities({ limit: 1 });

  return (
    <main>
      <section className="page-masthead">
        <div className="container-main page-masthead__grid">
          <div>
            <p className="eyebrow">Catálogo de entidades</p>
            <h1>Entidades canónicas</h1>
            <p>
              Personas, organismos, proveedores y municipalidades indexados con su evidencia oficial.
              Cada entidad reúne registros de múltiples fuentes.
            </p>
          </div>
          <dl className="page-fact-sheet">
            <div><dt>Total entidades</dt><dd>{allKindCounts.total.toLocaleString("es-CL")}</dd></div>
            <div><dt>Fuentes</dt><dd>10</dd></div>
          </dl>
        </div>
      </section>

      <div className="container-main entity-layout">
        {/* Search + filters */}
        <section aria-labelledby="search-title">
          <div className="section-heading">
            <div><p className="eyebrow">Filtrar</p><h2 id="search-title">Buscar entidad</h2></div>
          </div>
          <form className="cross-search" role="search" method="GET">
            <label htmlFor="entity-query">Nombre de persona, organismo, empresa o municipalidad</label>
            <div>
              <input
                id="entity-query"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Ej: Cámara de Diputadas, Codelco, Contraloría..."
              />
              <button className="btn btn-primary" type="submit">Buscar</button>
            </div>
          </form>

          {/* Kind filter tabs */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap" }}>
            {[
              { kind: "", label: "Todos" },
              { kind: "person", label: "👤 Personas" },
              { kind: "public_body", label: "🏛️ Organismos" },
              { kind: "supplier", label: "🏭 Proveedores" },
              { kind: "municipality", label: "🏘️ Municipalidades" },
            ].map(({ kind, label }) => {
              const href = kind
                ? `/entidades?${query ? `q=${encodeURIComponent(query)}&` : ""}kind=${kind}`
                : `/entidades${query ? `?q=${encodeURIComponent(query)}` : ""}`;
              const active = kindFilter === kind;
              return (
                <Link
                  key={kind}
                  href={href}
                  className={`btn ${active ? "btn-primary" : "btn-ghost"}`}
                  style={{ fontSize: "0.82rem" }}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </section>

        {/* Results */}
        <section aria-labelledby="results-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {kindFilter ? (KIND_LABEL[kindFilter]?.label ?? kindFilter) : "Todos los tipos"}
                {query ? ` · "${query}"` : ""}
              </p>
              <h2 id="results-title">
                {filtered.length} entidad{filtered.length !== 1 ? "es" : ""}
                {result.total > PAGE_SIZE && !query && (
                  <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                    (de {result.total.toLocaleString("es-CL")} totales)
                  </span>
                )}
              </h2>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <strong>Sin entidades que coincidan con los filtros</strong>
              <p>Prueba ampliar la búsqueda o cambiar el tipo de entidad.</p>
              <Link href="/entidades" className="btn btn-ghost">Ver todas las entidades</Link>
            </div>
          ) : (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Nombre</th>
                    <th>Fuentes</th>
                    <th>Identificadores</th>
                    <th>Ficha</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entity) => {
                    const meta = KIND_LABEL[entity.kind] ?? { label: entity.kind, emoji: "📋", badge: "badge-info" };
                    return (
                      <tr key={entity.id}>
                        <td>
                          <span className={`badge ${meta.badge}`} style={{ fontSize: "0.68rem" }}>
                            {meta.emoji} {meta.label}
                          </span>
                        </td>
                        <td>
                          <strong>{entity.name}</strong>
                          {entity.attributes?.office && (
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              {String(entity.attributes.office)}
                            </div>
                          )}
                          {entity.attributes?.comuna && (
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                              {String(entity.attributes.comuna)}
                            </div>
                          )}
                        </td>
                        <td>
                          {entity.sourceIds.map((src) => (
                            <code
                              key={src}
                              style={{
                                fontSize: "0.65rem",
                                background: "var(--bg-surface-2)",
                                padding: "0.1rem 0.35rem",
                                borderRadius: 4,
                                marginRight: "0.25rem",
                              }}
                            >
                              {src}
                            </code>
                          ))}
                        </td>
                        <td>
                          {entity.identifiers.slice(0, 1).map((id) => (
                            <span
                              key={id.scheme}
                              style={{ fontSize: "0.72rem", fontFamily: "monospace", color: "var(--text-subtle)" }}
                            >
                              {id.scheme}: {id.value.slice(0, 20)}{id.value.length > 20 ? "…" : ""}
                            </span>
                          ))}
                        </td>
                        <td>
                          <Link className="data-link" href={`/entidades/${entity.id}`}>
                            Ver ficha ↗
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!query && (result.nextCursor || cursor) && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1.5rem", gap: "1rem" }}>
              {cursor && (
                <Link
                  href={`/entidades?${kindFilter ? `kind=${kindFilter}&` : ""}${query ? `q=${encodeURIComponent(query)}&` : ""}`}
                  className="btn btn-ghost"
                >
                  ← Primera página
                </Link>
              )}
              {result.nextCursor && (
                <Link
                  href={`/entidades?${kindFilter ? `kind=${kindFilter}&` : ""}${query ? `q=${encodeURIComponent(query)}&` : ""}cursor=${result.nextCursor}`}
                  className="btn btn-ghost"
                  style={{ marginLeft: "auto" }}
                >
                  Siguiente página →
                </Link>
              )}
            </div>
          )}

          <p className="relation-disclaimer" style={{ marginTop: "1.5rem" }}>
            Las entidades se normalizan desde registros oficiales (Cámara, Senado, ChileCompra OCDS, Contraloría, SINIM, SERVEL, InfoLobby, InfoProbidad, DIPRES).
            Una relación documental no implica irregularidad ni responsabilidad.
          </p>
        </section>

        {/* Quick links */}
        <section aria-labelledby="quick-title">
          <div className="section-heading">
            <div><p className="eyebrow">Accesos directos</p><h2 id="quick-title">Entidades destacadas</h2></div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {[
              { href: "/entidades/public-body-camara", label: "🏛️ Cámara de Diputados" },
              { href: "/entidades/public-body-cgr", label: "⚖️ Contraloría General" },
              { href: "/cruces", label: "🔗 Explorar cruces →" },
              { href: "/rankings", label: "📊 Rankings SERVEL" },
            ].map(({ href, label }) => (
              <Link key={href} href={href} className="btn btn-ghost" style={{ fontSize: "0.82rem" }}>
                {label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
