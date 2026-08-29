"use client";

import { useEffect, useState } from "react";

type SourceId = "chilecompra" | "infolobby" | "contraloria" | "infoprobidad";

interface SourceRecord {
  id: string;
  title?: string | null;
  description?: string | null;
  occurredAt?: string | null;
  sourceId?: string | null;
  data?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
}

const SOURCES: Array<{ id: SourceId; label: string; description: string }> = [
  { id: "chilecompra", label: "ChileCompra", description: "Compras, contratos y proveedores publicados." },
  { id: "infolobby", label: "InfoLobby", description: "Audiencias, sujetos pasivos y organismos." },
  { id: "contraloria", label: "Contraloría", description: "Informes y documentos de fiscalización." },
  { id: "infoprobidad", label: "InfoProbidad", description: "Declaraciones y registros de probidad." },
];

const PAGE_SIZE = 25;

export default function CrucesSourceRecords({ counts }: { counts?: Partial<Record<SourceId, number>> }) {
  const [source, setSource] = useState<SourceId>("chilecompra");
  const [query, setQuery] = useState("");
  const [entityId, setEntityId] = useState("");
  const [kind, setKind] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<SourceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ source, limit: String(PAGE_SIZE), cursor: `v1_${(page - 1) * PAGE_SIZE}` });
    if (query.trim()) params.set("q", query.trim());
    if (entityId.trim()) params.set("entity_id", entityId.trim());
    if (kind) params.set("kind", kind);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    // Defer the state reset to the request tick so changing a filter does not
    // synchronously cascade another render from inside this effect.
    const requestTimer = setTimeout(() => {
      setLoading(true);
      setError(null);
      fetch(`/api/v1/records?${params}`, { signal: controller.signal })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload?.error?.message || "No se pudieron consultar los registros.");
          return payload;
        })
        .then((payload) => {
          setRows(Array.isArray(payload.data) ? payload.data : []);
          setTotal(Number(payload.meta?.total ?? 0));
        })
        .catch((cause: unknown) => {
          if (cause instanceof DOMException && cause.name === "AbortError") return;
          setRows([]);
          setTotal(0);
          setError(cause instanceof Error ? cause.message : "No se pudieron consultar los registros.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 0);
    return () => {
      clearTimeout(requestTimer);
      controller.abort();
    };
  }, [source, page, query, entityId, kind, from, to, retry]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const active = SOURCES.find((item) => item.id === source) ?? SOURCES[0];

  return (
    <section aria-label="Registros completos por fuente" className="card" style={{ padding: "1.25rem", marginTop: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <span className="badge badge-info">Datos originales consultables</span>
          <h2 style={{ margin: "0.45rem 0 0.25rem", fontSize: "1.15rem", color: "var(--text-primary)" }}>Explora todos los registros por fuente</h2>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>{active.description} Se carga una página por vez.</p>
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "right" }}>
          <strong style={{ display: "block", color: "var(--text-primary)", fontSize: "1.1rem" }}>{total.toLocaleString("es-CL")}</strong>
          registros encontrados
        </div>
      </div>

      <div role="tablist" aria-label="Fuentes de registros" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "1rem 0" }}>
        {SOURCES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={source === item.id}
            onClick={() => { setSource(item.id); setPage(1); setQuery(""); setEntityId(""); setKind(""); setFrom(""); setTo(""); }}
            className={source === item.id ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
          >
            {item.label}{counts?.[item.id] ? ` (${counts[item.id]?.toLocaleString("es-CL")})` : ""}
          </button>
        ))}
      </div>

      <div className="cruces-record-filters" style={{ display: "grid", gridTemplateColumns: "minmax(220px, 2fr) minmax(150px, 1fr) repeat(3, minmax(130px, 1fr))", gap: "0.55rem", marginBottom: "0.85rem" }}>
        <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Entidad, proveedor, autoridad o materia" className="input" aria-label="Buscar entidad, proveedor o autoridad" />
        <input type="search" value={entityId} onChange={(event) => { setEntityId(event.target.value); setPage(1); }} placeholder="ID de entidad" className="input" aria-label="Filtrar por ID de entidad" />
        <select value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }} className="input" aria-label="Filtrar por tipo">
          <option value="">Todos los tipos</option>
          <option value="purchase">Compras</option><option value="contract">Contratos</option><option value="lobby">Audiencias</option><option value="audit">Auditorías</option><option value="declaration">Declaraciones</option>
        </select>
        <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className="input" aria-label="Desde" />
        <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className="input" aria-label="Hasta" />
      </div>

      {loading ? <p style={{ padding: "1.5rem 0", textAlign: "center", color: "var(--text-muted)" }}>Cargando registros…</p> : error ? (
        <div role="alert" style={{ padding: "1.25rem", textAlign: "center", border: "1px solid var(--danger)", borderRadius: 8 }}>
          <p style={{ margin: "0 0 0.75rem", color: "var(--danger)" }}>{error}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRetry((value) => value + 1)}>Reintentar consulta</button>
        </div>
      ) : rows.length === 0 ? (
        <p style={{ padding: "1.5rem 0", textAlign: "center", color: "var(--text-muted)" }}>No hay registros para estos filtros.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%" }}>
            <thead><tr><th>Fecha</th><th>Registro</th><th>Descripción</th><th>Detalle</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={{ whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: "0.78rem" }}>{row.occurredAt || "—"}</td>
                  <td style={{ minWidth: 220, fontWeight: 700, color: "var(--text-primary)" }}>{row.title || row.id}</td>
                  <td style={{ minWidth: 280, color: "var(--text-muted)", fontSize: "0.8rem" }}>{row.description || "Registro oficial publicado por la fuente."}</td>
                  <td><details><summary style={{ cursor: "pointer", color: "var(--accent)", fontSize: "0.78rem" }}>Ver JSON</summary><pre style={{ maxWidth: 360, whiteSpace: "pre-wrap", fontSize: "0.68rem" }}>{JSON.stringify(row.data ?? row.evidence ?? {}, null, 2)}</pre></details></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)", fontSize: "0.78rem" }}>
        <span style={{ color: "var(--text-muted)" }}>Página {page} de {totalPages}</span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Siguiente</button>
        </div>
      </div>
    </section>
  );
}
