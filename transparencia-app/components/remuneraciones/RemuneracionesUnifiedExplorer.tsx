"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

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
  return status === "complete" ? "Disponible" : status === "partial" ? "Parcial" : status === "aggregate_only" ? "Contexto" : "En revisión";
}

function statusClass(status: SourceStatus) {
  return status === "complete" ? "badge-ok" : status === "partial" ? "badge-warn" : status === "aggregate_only" ? "badge-info" : "badge-subtle";
}

function displayAmount(value: number | null) {
  return value === null ? "Monto no publicado" : money.format(value);
}

function recordDescription(row: UnifiedRow) {
  if (row.sourceType === "support_staff") return "Personal de apoyo con monto publicado";
  if (row.sourceId === "remuneraciones-38bis") return "Remuneración individual publicada";
  return "Registro original de la fuente";
}

function sourceDescription(item: SourceInfo) {
  if (item.sourceType === "appointment") return "Nombramientos oficiales; sin sueldo individual publicado.";
  if (item.sourceType === "official_call") return "Cargos convocados y renta bruta referencial.";
  if (item.sourceType === "aggregate") return "Cifras generales, no fichas personales.";
  if (item.sourceType === "support_staff") return "Personal de apoyo publicado por el Congreso.";
  if (item.id === "transparencia-activa") return "Nóminas de transparencia activa disponibles para buscar por persona, organismo o cargo.";
  return "Remuneraciones individuales publicadas por la fuente.";
}

function displayCount(value: number | null) {
  return value === null ? "Sin registros descargables" : number.format(value);
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
  const initialQueryHandled = useRef(false);

  useEffect(() => {
    loadJson<UnifiedManifest>("manifest.json").then(setManifest).catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    if (!manifest || initialQueryHandled.current || typeof window === "undefined") return;
    const initialQuery = new URLSearchParams(window.location.search).get("q")?.trim() ?? "";
    initialQueryHandled.current = true;
    if (initialQuery.length < 2) return;
    const timer = window.setTimeout(() => {
      setQuery(initialQuery);
      window.setTimeout(() => (document.getElementById("remuneration-search") as HTMLFormElement | null)?.requestSubmit(), 0);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [manifest]);

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

  const paidSources = useMemo(() => manifest?.sources.filter((item) => item.sourceType !== "aggregate") ?? [], [manifest]);
  const aggregateSources = useMemo(() => manifest?.sources.filter((item) => item.sourceType === "aggregate") ?? [], [manifest]);

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
    <section className="page-shell remuneration-unified" aria-labelledby="unified-remuneraciones-title" style={{ paddingTop: "1rem", paddingBottom: "0" }}>
      <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: "0.35rem" }}>REMUNERACIONES PUBLICADAS</div>
      <h2 id="unified-remuneraciones-title" style={{ margin: 0, fontSize: "clamp(1.35rem, 3vw, 2rem)" }}>Busca una persona, organismo o cargo</h2>
      <p style={{ color: "var(--text-muted)", maxWidth: "850px", margin: "0.5rem 0 1rem", lineHeight: 1.6 }}>
        Consulta pagos y remuneraciones publicados por organismos oficiales. Cada resultado conserva su fuente, organismo, cargo, período y monto; los datos que no están publicados no se completan ni se estiman.
      </p>

      {!manifest && !error && <div className="stat-tile" role="status" aria-busy="true">Cargando fuentes públicas…</div>}
      {error && <div className="badge badge-danger" role="alert" style={{ textTransform: "none", letterSpacing: 0 }}>{error}</div>}

      {manifest && (
        <>
          <nav className="remuneration-module-nav" aria-label="Secciones de remuneraciones">
            <a href="#buscar-remuneraciones">Buscar remuneraciones</a>
            <a href="#fuentes-remuneraciones">Fuentes integradas</a>
            <a href="#detalle-38bis">Historial 38 bis</a>
          </nav>

          <section id="buscar-remuneraciones" className="remuneration-module" aria-labelledby="buscar-remuneraciones-title">
            <div className="remuneration-module__heading"><span className="eyebrow">01 · BÚSQUEDA</span><h3 id="buscar-remuneraciones-title">Encuentra un registro publicado</h3><p>Busca por nombre, organismo o cargo. Después podrás comparar los períodos disponibles para esa persona.</p></div>
            <form id="remuneration-search" className="remuneration-search-form" onSubmit={runSearch}>
              <label style={{ display: "grid", gap: "0.3rem", fontSize: "0.72rem", fontWeight: 700 }}>Nombre, organismo o cargo<input className="form-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej.: Sofía Pumpin o asesor" /></label>
              <label style={{ display: "grid", gap: "0.3rem", fontSize: "0.72rem", fontWeight: 700 }}>Fuente<select className="form-input" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">Todas las fuentes</option>{paidSources.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
              <label style={{ display: "grid", gap: "0.3rem", fontSize: "0.72rem", fontWeight: 700 }}>Organismo (opcional)<input className="form-input" value={organism} onChange={(event) => setOrganism(event.target.value)} placeholder="Ej.: Subsecretaría del Interior" /></label>
              <label style={{ display: "grid", gap: "0.3rem", fontSize: "0.72rem", fontWeight: 700 }}>Cargo (opcional)<input className="form-input" value={role} onChange={(event) => setRole(event.target.value)} placeholder="Ej.: asesor junior" /></label>
              <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Buscando…" : "Buscar"}</button>
            </form>
          </section>

          {results && <section id="resultados-remuneraciones" className="remuneration-module remuneration-module--results" aria-labelledby="resultados-remuneraciones-title" aria-live="polite">
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "baseline" }}>
              <h3 id="resultados-remuneraciones-title" style={{ margin: 0 }}>Resultados para “{query.trim()}”</h3>
              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{number.format(groups.length)} personas agrupadas · {number.format(results.rows.length + results.remoteRows.length)} filas visibles</span>
            </div>
            {results.remoteRows.length === 0 && (source === "all" || source === "transparencia-activa") && <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>La fuente Transparencia Activa no respondió en esta consulta o no tiene coincidencias en el release actual. Los resultados estáticos sí permanecen disponibles.</p>}
            {groups.length === 0 && <div className="stat-tile" role="status" style={{ marginTop: "0.65rem" }}>No encontramos coincidencias con esos filtros. Prueba con el apellido, organismo o cargo sin tildes.</div>}
            <div style={{ display: "grid", gap: "0.7rem", marginTop: "0.65rem" }}>
              {groups.map((group) => {
                const sourceIds = new Set(group.map((row) => row.sourceId));
                return <article key={group[0].personKey} className="stat-tile" style={{ padding: "0.95rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.7rem", flexWrap: "wrap" }}><div><h4 style={{ margin: 0, fontSize: "1rem" }}>{group[0].nombreOriginal}</h4><small style={{ color: "var(--text-muted)" }}>{sourceIds.size > 1 ? "Coincidencia nominal entre fuentes · requiere revisión contextual" : "Registro encontrado en una fuente"}</small></div><span className={`badge ${sourceIds.size > 1 ? "badge-warn" : "badge-info"}`}>{sourceIds.size} fuente{sourceIds.size === 1 ? "" : "s"}</span></div>
                  <div style={{ overflowX: "auto", marginTop: "0.7rem" }}><table className="data-table" style={{ width: "100%" }}><thead><tr><th>Fuente</th><th>Organismo</th><th>Cargo</th><th>Período</th><th>Monto</th></tr></thead><tbody>{group.map((row) => <tr key={row.recordId}><td><strong>{row.sourceLabel}</strong><small style={{ display: "block", color: "var(--text-muted)" }}>{recordDescription(row)}</small></td><td>{row.organismoOriginal}</td><td>{row.cargoOriginal}</td><td>{row.periodo ?? "No informado"}</td><td>{displayAmount(row.montoBruto)}</td></tr>)}</tbody></table></div>
                </article>;
              })}
            </div>
          </section>}

          <section id="fuentes-remuneraciones" className="remuneration-module remuneration-module--sources" aria-labelledby="fuentes-remuneraciones-title">
            <div className="remuneration-module__heading"><span className="eyebrow">02 · FUENTES</span><h3 id="fuentes-remuneraciones-title">Qué información está integrada</h3><p>Las fuentes se mantienen separadas. Sólo se agrupan registros cuando la publicación permite compararlos.</p></div>
            <div className="remuneration-reading-key" aria-label="Cómo interpretar los resultados">
              <div><strong>Remuneración publicada</strong><span>La fuente informa un monto asociado a una persona y un período.</span></div>
              <div><strong>Personal de apoyo</strong><span>Pagos publicados por la Cámara o el Senado.</span></div>
              <div><strong>Sin monto publicado</strong><span>La ausencia se conserva y no se convierte en cero.</span></div>
            </div>
            <div className="remuneration-source-grid" aria-label="Fuentes de pagos y remuneraciones">
              {paidSources.map((item) => (
                <article key={item.id} className="stat-tile remuneration-source-card" style={{ minHeight: "0", padding: "0.85rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}><strong style={{ fontSize: "0.78rem", lineHeight: 1.25 }}>{item.label}</strong><span className={`badge ${statusClass(item.status)}`} style={{ fontSize: "0.62rem", whiteSpace: "nowrap" }}>{statusLabel(item.status)}</span></div>
                  <dl className="remuneration-source-card__facts"><div><dt>Registros</dt><dd>{displayCount(item.publishedCount)}</dd></div><div><dt>Último corte</dt><dd>{item.period ?? "Sin fecha publicada"}</dd></div></dl>
                  <small className="remuneration-source-card__description">{sourceDescription(item)}</small>
                  {item.officialUrl && <a className="data-link" href={item.officialUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: "0.45rem", fontSize: "0.72rem" }}>Fuente oficial ↗</a>}
                </article>
              ))}
            </div>
            {aggregateSources.map((item) => <div key={item.id} className="remuneration-context-note"><strong>{item.label}</strong><span>{sourceDescription(item)} No forma parte de la búsqueda individual.</span></div>)}
          </section>
        </>
      )}
    </section>
  );
}
