"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type SourceStatus = "complete" | "partial" | "aggregate_only" | "unavailable";

interface SourceInfo {
  id: string;
  label: string;
  organization: string | null;
  officialUrl: string | null;
  period: string | null;
  frequency: string | null;
  status: SourceStatus;
  sourceType: string;
  publishedCount: number | null;
  queryableCount: number | null;
  relatedCount: number | null;
  checksum: string | null;
  note: string | null;
  modulePath?: string;
}

interface UnifiedManifest {
  pageSize: number;
  totalRows: number;
  pageCount: number;
  pages: Array<{ page: number; key: string; count: number }>;
  searchIndexKey: string;
  sources: SourceInfo[];
  quality: { rows: { total: number; withAmount: number; withoutAmount: number }; relationGroups: number; notes: string[] };
}

interface UnifiedRow {
  sourceId: string;
  sourceLabel: string;
  sourceType: string;
  recordId: string;
  personKey: string;
  nombreOriginal: string;
  organismoOriginal: string;
  cargoOriginal: string;
  periodo: string | null;
  montoBruto: number | null;
  tipoContrato: string | null;
  estadoRegistro: string;
}

interface SearchResult {
  rows: UnifiedRow[];
  remoteRows: UnifiedRow[];
  totalRemote: number | null;
}

const number = new Intl.NumberFormat("es-CL");
const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
}

function tokens(value: string) {
  return normalize(value).split(/[^a-z0-9]+/).filter((token) => token.length >= 2);
}

function statusLabel(status: SourceStatus) {
  return status === "complete" ? "Completo" : status === "partial" ? "Parcial" : status === "aggregate_only" ? "Agregado" : "No disponible";
}

function statusClass(status: SourceStatus) {
  return status === "complete" ? "badge-ok" : status === "partial" ? "badge-warn" : status === "aggregate_only" ? "badge-info" : "badge-subtle";
}

function displayAmount(value: number | null) {
  return value === null ? "Monto no publicado" : money.format(value);
}

async function loadJson<T>(key: string) {
  const response = await fetch(`/data/remuneraciones-unified/${key}`, { cache: "force-cache" });
  if (!response.ok) throw new Error("No se pudo cargar el índice unificado.");
  return response.json() as Promise<T>;
}

function RemoteOfficialRow(row: Record<string, unknown>, query: string): UnifiedRow | null {
  const name = String(row.nombre_completo ?? row.nombre ?? "").trim();
  if (!name) return null;
  const amount = Number(row.remuneracion_bruta_mensual ?? row.bruto_mensual);
  return {
    sourceId: "transparencia-activa",
    sourceLabel: "Transparencia Activa CPLT",
    sourceType: "individual",
    recordId: String(row.id ?? `cplt-${normalize(name)}-${query}`),
    personKey: normalize(name),
    nombreOriginal: name,
    organismoOriginal: String(row.organo_nombre ?? row.organo_id ?? "Organismo no informado"),
    cargoOriginal: String(row.cargo ?? "Cargo no informado"),
    periodo: String(row.periodo ?? row.fecha_ingreso ?? "").slice(0, 7) || null,
    montoBruto: Number.isFinite(amount) ? amount : null,
    tipoContrato: String(row.tipo_contrato ?? "").trim() || null,
    estadoRegistro: Number.isFinite(amount) ? "publicado" : "monto_no_publicado",
  };
}

export default function RemuneracionesUnifiedExplorer() {
  const [manifest, setManifest] = useState<UnifiedManifest | null>(null);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [organism, setOrganism] = useState("");
  const [role, setRole] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJson<UnifiedManifest>("manifest.json").then(setManifest).catch((reason: Error) => setError(reason.message));
  }, []);

  const groups = useMemo(() => {
    const allRows = [...(results?.rows ?? []), ...(results?.remoteRows ?? [])];
    const grouped = new Map<string, UnifiedRow[]>();
    for (const row of allRows) {
      const list = grouped.get(row.personKey) ?? [];
      list.push(row);
      grouped.set(row.personKey, list);
    }
    return [...grouped.values()].sort((left, right) => left[0].nombreOriginal.localeCompare(right[0].nombreOriginal, "es-CL"));
  }, [results]);

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      setError("Escribe al menos dos caracteres para buscar.");
      setResults(null);
      return;
    }
    if (!manifest) return;
    setLoading(true);
    setError(null);
    try {
      const index = await loadJson<Record<string, number[]>>(manifest.searchIndexKey);
      const requestedTokens = tokens(cleanQuery);
      const candidatePages = requestedTokens.reduce<number[] | null>((current, token) => {
        const pages = index[token] ?? [];
        return current === null ? pages : current.filter((page) => pages.includes(page));
      }, null) ?? [];
      const staticRows = (await Promise.all(candidatePages.map(async (page) => {
        const entry = manifest.pages.find((item) => item.page === page);
        return entry ? loadJson<UnifiedRow[]>(entry.key) : [];
      }))).flat().filter((row) => {
        const haystack = normalize(`${row.nombreOriginal} ${row.organismoOriginal} ${row.cargoOriginal} ${row.periodo ?? ""}`);
        return requestedTokens.every((token) => haystack.includes(token))
          && (source === "all" || row.sourceId === source)
          && (!organism.trim() || normalize(row.organismoOriginal).includes(normalize(organism.trim())))
          && (!role.trim() || normalize(row.cargoOriginal).includes(normalize(role.trim())));
      });

      let remoteRows: UnifiedRow[] = [];
      let totalRemote: number | null = null;
      const isLocalStaticPreview = typeof window !== "undefined"
        && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      if (!isLocalStaticPreview && (source === "all" || source === "transparencia-activa")) {
        try {
          const response = await fetch(`/api/funcionarios?query=${encodeURIComponent(cleanQuery)}&include_zero=true&limit=20&sortBy=nombre_asc`, { cache: "no-store" });
          if (response.ok) {
            const payload = await response.json() as { data?: Record<string, unknown>[]; total?: number };
            remoteRows = (payload.data ?? []).map((row) => RemoteOfficialRow(row, cleanQuery)).filter((row): row is UnifiedRow => Boolean(row));
            totalRemote = Number.isFinite(payload.total) ? Number(payload.total) : remoteRows.length;
          }
        } catch {
          // El release estático sigue disponible; la fuente CPLT se marca como no consultada si el Worker no responde.
        }
      }
      setResults({ rows: staticRows, remoteRows, totalRemote });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo completar la búsqueda.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-shell" aria-labelledby="unified-remuneraciones-title" style={{ paddingTop: "1rem", paddingBottom: "0" }}>
      <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: "0.35rem" }}>ÍNDICE UNIFICADO · FUENTES SEPARADAS</div>
      <h2 id="unified-remuneraciones-title" style={{ margin: 0, fontSize: "clamp(1.35rem, 3vw, 2rem)" }}>Busca una persona en todas las remuneraciones disponibles</h2>
      <p style={{ color: "var(--text-muted)", maxWidth: "850px", margin: "0.5rem 0 1rem", lineHeight: 1.6 }}>
        Los registros se agrupan para facilitar la lectura, pero cada fuente, organismo, cargo, período y monto permanece separado. Una coincidencia nominal no prueba por sí sola que dos filas pertenezcan a la misma persona.
      </p>

      {!manifest && !error && <div className="stat-tile" role="status" aria-busy="true">Cargando catálogo de fuentes…</div>}
      {error && <div className="badge badge-danger" role="alert" style={{ textTransform: "none", letterSpacing: 0 }}>{error}</div>}

      {manifest && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0.65rem", marginBottom: "1rem" }}>
            {manifest.sources.map((item) => (
              <article key={item.id} className="stat-tile" style={{ minHeight: "0", padding: "0.85rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
                  <strong style={{ fontSize: "0.78rem", lineHeight: 1.25 }}>{item.label}</strong>
                  <span className={`badge ${statusClass(item.status)}`} style={{ fontSize: "0.62rem", whiteSpace: "nowrap" }}>{statusLabel(item.status)}</span>
                </div>
                <dl style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.2rem 0.5rem", margin: "0.6rem 0 0", fontSize: "0.7rem" }}>
                  <dt>Publicado</dt><dd style={{ margin: 0, color: "var(--accent)", fontFamily: "var(--font-mono)", fontWeight: 800 }}>{item.publishedCount === null ? "No calculable" : number.format(item.publishedCount)}</dd>
                  <dt>Consultable</dt><dd style={{ margin: 0, fontWeight: 700 }}>{item.queryableCount === null ? "No calculable" : number.format(item.queryableCount)}</dd>
                  <dt>Relacionado</dt><dd style={{ margin: 0, fontWeight: 700 }}>{item.relatedCount === null ? "No calculable" : number.format(item.relatedCount)}</dd>
                </dl>
                <small style={{ display: "block", color: "var(--text-muted)", marginTop: "0.25rem", lineHeight: 1.4 }}>{item.note ?? `Último período: ${item.period ?? "no informado"}`}</small>
                {item.officialUrl && <a className="data-link" href={item.officialUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: "0.45rem", fontSize: "0.72rem" }}>Fuente oficial ↗</a>}
              </article>
            ))}
          </div>

          <form onSubmit={runSearch} style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1.4fr) repeat(3, minmax(140px, 1fr)) auto", gap: "0.55rem", alignItems: "end", padding: "0.85rem", border: "1px solid var(--border-subtle)", borderRadius: "0.8rem", background: "var(--bg-surface-2)" }}>
            <label style={{ display: "grid", gap: "0.3rem", fontSize: "0.72rem", fontWeight: 700 }}>Persona, organismo o cargo<input className="form-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej.: Lucy Depablos, asesor" /></label>
            <label style={{ display: "grid", gap: "0.3rem", fontSize: "0.72rem", fontWeight: 700 }}>Fuente<select className="form-input" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">Todas las fuentes</option>{manifest.sources.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label style={{ display: "grid", gap: "0.3rem", fontSize: "0.72rem", fontWeight: 700 }}>Organismo<input className="form-input" value={organism} onChange={(event) => setOrganism(event.target.value)} placeholder="Ej.: Servicio Civil" /></label>
            <label style={{ display: "grid", gap: "0.3rem", fontSize: "0.72rem", fontWeight: 700 }}>Cargo<input className="form-input" value={role} onChange={(event) => setRole(event.target.value)} placeholder="Ej.: asesor" /></label>
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Buscando…" : "Buscar"}</button>
          </form>

          {results && <div style={{ marginTop: "1rem" }} aria-live="polite">
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "baseline" }}>
              <h3 style={{ margin: 0 }}>Coincidencias para “{query.trim()}”</h3>
              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{number.format(groups.length)} personas agrupadas · {number.format(results.rows.length + results.remoteRows.length)} filas visibles</span>
            </div>
            {results.remoteRows.length === 0 && (source === "all" || source === "transparencia-activa") && <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>La fuente Transparencia Activa no respondió en esta consulta o no tiene coincidencias en el release actual. Los resultados estáticos sí permanecen disponibles.</p>}
            {groups.length === 0 && <div className="stat-tile" role="status" style={{ marginTop: "0.65rem" }}>No encontramos coincidencias con esos filtros. Prueba con el apellido, organismo o cargo sin tildes.</div>}
            <div style={{ display: "grid", gap: "0.7rem", marginTop: "0.65rem" }}>
              {groups.map((group) => {
                const sourceIds = new Set(group.map((row) => row.sourceId));
                return <article key={group[0].personKey} className="stat-tile" style={{ padding: "0.95rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.7rem", flexWrap: "wrap" }}><div><h4 style={{ margin: 0, fontSize: "1rem" }}>{group[0].nombreOriginal}</h4><small style={{ color: "var(--text-muted)" }}>{sourceIds.size > 1 ? "Coincidencia nominal entre fuentes · requiere revisión contextual" : "Registro encontrado en una fuente"}</small></div><span className={`badge ${sourceIds.size > 1 ? "badge-warn" : "badge-info"}`}>{sourceIds.size} fuente{sourceIds.size === 1 ? "" : "s"}</span></div>
                  <div style={{ overflowX: "auto", marginTop: "0.7rem" }}><table className="data-table" style={{ width: "100%" }}><thead><tr><th>Fuente</th><th>Organismo</th><th>Cargo</th><th>Período</th><th>Monto</th></tr></thead><tbody>{group.map((row) => <tr key={row.recordId}><td><strong>{row.sourceLabel}</strong><small style={{ display: "block", color: "var(--text-muted)" }}>{row.sourceType === "support_staff" ? "Consolidado de apoyo" : "Registro original"}</small></td><td>{row.organismoOriginal}</td><td>{row.cargoOriginal}</td><td>{row.periodo ?? "No informado"}</td><td>{displayAmount(row.montoBruto)}</td></tr>)}</tbody></table></div>
                </article>;
              })}
            </div>
          </div>}
          <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", lineHeight: 1.5, marginTop: "0.85rem" }}>Índice estático: {number.format(manifest.totalRows)} filas de 38 bis, Cámara y Senado. No se descarga el universo completo al navegador. Las filas CPLT se solicitan de forma paginada al Worker sólo cuando realizas una búsqueda.</p>
        </>
      )}
    </section>
  );
}
