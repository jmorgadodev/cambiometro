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
const PAID_SOURCE_IDS = ["transparencia-activa", "remuneraciones-38bis", "camara", "senado"];
const RESULTS_PAGE_SIZE = 15;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-CL");
}

function tokens(value: string) {
  return normalize(value).split(/[^a-z0-9]+/).filter((token) => token.length >= 2);
}

function personIdentityKey(value: string) {
  return tokens(value).sort().join(" ");
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
    personKey: personIdentityKey(name),
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
  const [currentPage, setCurrentPage] = useState(1);
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
      // Algunas nóminas intercambian el orden de los apellidos entre meses.
      // Agrupamos por el conjunto normalizado de palabras, pero conservamos
      // debajo cada nombre y fila tal como fueron publicados.
      const groupKey = personIdentityKey(row.nombreOriginal) || row.personKey;
      const list = grouped.get(groupKey) ?? [];
      list.push(row);
      grouped.set(groupKey, list);
    }
    return [...grouped.values()].sort((left, right) => left[0].nombreOriginal.localeCompare(right[0].nombreOriginal, "es-CL"));
  }, [results]);

  const paidSources = useMemo(() => manifest?.sources.filter((item) => PAID_SOURCE_IDS.includes(item.id)) ?? [], [manifest]);
  const totalPages = Math.max(1, Math.ceil(groups.length / RESULTS_PAGE_SIZE));
  const pageStart = groups.length === 0 ? 0 : (currentPage - 1) * RESULTS_PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * RESULTS_PAGE_SIZE, groups.length);
  const visibleGroups = groups.slice((currentPage - 1) * RESULTS_PAGE_SIZE, currentPage * RESULTS_PAGE_SIZE);

  function goToResultsPage(nextPage: number) {
    setCurrentPage(nextPage);
    window.setTimeout(() => {
      const target = document.getElementById("resultados-remuneraciones");
      if (!target) return;
      const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - 112);
      window.scrollTo({ top, behavior: "smooth" });
    }, 0);
  }

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      setError("Escribe al menos dos caracteres para buscar.");
      setResults(null);
      return;
    }
    if (!manifest) return;
    setCurrentPage(1);
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
    <section className="container-main remuneration-unified" aria-labelledby="unified-remuneraciones-title">
      <header className="remuneration-hero">
        <div>
          <div className="eyebrow">REMUNERACIONES PÚBLICAS</div>
          <h2 id="unified-remuneraciones-title">Encuentra un pago publicado</h2>
          <p>Busca una persona, un organismo o un cargo. Cada resultado conserva el mes, la fuente y el monto informado.</p>
        </div>
        {manifest && <div className="remuneration-hero__summary"><strong>{paidSources.length}</strong><span>fuentes con pagos publicados</span></div>}
      </header>

      {!manifest && !error && <div className="stat-tile" role="status" aria-busy="true">Cargando fuentes públicas…</div>}
      {error && <div className="badge badge-danger" role="alert" style={{ textTransform: "none", letterSpacing: 0 }}>{error}</div>}

      {manifest && (
        <>
          <nav className="remuneration-module-nav" aria-label="Secciones de remuneraciones">
            <a href="#buscar-remuneraciones">Buscar</a>
            <a href="#fuentes-remuneraciones">Fuentes</a>
            <a href="#detalle-38bis">Historial mensual</a>
          </nav>

          <section id="buscar-remuneraciones" className="remuneration-module remuneration-module--search" aria-labelledby="buscar-remuneraciones-title">
            <div className="remuneration-module__heading"><span className="eyebrow">BUSCAR</span><h3 id="buscar-remuneraciones-title">¿A quién quieres revisar?</h3><p>Escribe un nombre, organismo o cargo. Puedes afinar la búsqueda después.</p></div>
            <form id="remuneration-search" className="remuneration-search-form" onSubmit={runSearch}>
              <label className="remuneration-search__main">Nombre, organismo o cargo<input className="form-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej.: Sofía Pumpin, Ministerio del Interior o asesor" autoComplete="off" /></label>
              <button className="btn btn-primary remuneration-search__button" type="submit" disabled={loading}>{loading ? "Buscando…" : "Buscar"}</button>
            </form>
            <details className="remuneration-filters">
              <summary>Agregar filtros</summary>
              <div className="remuneration-filters__grid">
                <label>Fuente<select className="form-input" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">Todas las fuentes</option>{paidSources.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                <label>Organismo<input className="form-input" value={organism} onChange={(event) => setOrganism(event.target.value)} placeholder="Ej.: Subsecretaría del Interior" /></label>
                <label>Cargo<input className="form-input" value={role} onChange={(event) => setRole(event.target.value)} placeholder="Ej.: asesor junior" /></label>
              </div>
            </details>
          </section>

          {results && <section id="resultados-remuneraciones" className="remuneration-module remuneration-module--results" aria-labelledby="resultados-remuneraciones-title" aria-live="polite">
            <div className="remuneration-results__heading"><div><span className="eyebrow">RESULTADOS</span><h3 id="resultados-remuneraciones-title">Coincidencias para “{query.trim()}”</h3></div><span>{number.format(groups.length)} personas · {number.format(results.rows.length + results.remoteRows.length)} registros</span></div>
            {results.remoteRows.length === 0 && (source === "all" || source === "transparencia-activa") && <p className="remuneration-results__note">La búsqueda muestra los pagos publicados en los archivos disponibles. La nómina de Transparencia Activa se consulta por separado cuando el servicio responde.</p>}
            {groups.length === 0 && <div className="stat-tile" role="status">No encontramos coincidencias. Prueba con el apellido, organismo o cargo sin tildes.</div>}
             <div className="remuneration-results__list">
               {visibleGroups.map((group) => {
                 const sourceIds = new Set(group.map((row) => row.sourceId));
                 const primaryRow = group[0];
                 const publishedNames = [...new Set(group.map((row) => row.nombreOriginal).filter(Boolean))];
                 return <details key={group[0].personKey} className="remuneration-person-result">
                   <summary className="remuneration-person-result__summary">
                     <span className="remuneration-person-result__identity">
                       <span className="remuneration-person-result__marker" aria-hidden="true">{primaryRow.nombreOriginal.slice(0, 1).toUpperCase()}</span>
                       <span className="remuneration-person-result__copy">
                         <strong>{primaryRow.nombreOriginal}</strong>
                         <small>{primaryRow.organismoOriginal} · {primaryRow.cargoOriginal}</small>
                       </span>
                     </span>
                     <span className="remuneration-person-result__summary-meta">
                       <span className={`badge ${sourceIds.size > 1 ? "badge-warn" : "badge-info"}`}>{sourceIds.size} fuente{sourceIds.size === 1 ? "" : "s"}</span>
                       <span className="remuneration-person-result__action">Ver ficha y registros</span>
                     </span>
                   </summary>
                   <div className="remuneration-person-result__body">
                     <p className="remuneration-person-result__note">
                       {sourceIds.size > 1 ? "Hay registros con este mismo nombre en más de una fuente; revisa el organismo y el período antes de relacionarlos." : "Registro publicado por una fuente oficial."}
                       {publishedNames.length > 1 && <> La fuente publicó variantes del nombre: {publishedNames.join(" / ")}.</>}
                     </p>
                     <div className="remuneration-person-result__table"><table className="data-table"><thead><tr><th>Fuente</th><th>Organismo</th><th>Cargo</th><th>Mes</th><th>Monto</th></tr></thead><tbody>{group.map((row) => <tr key={row.recordId}><td><strong>{row.sourceLabel}</strong><small>{recordDescription(row)}</small></td><td>{row.organismoOriginal}</td><td>{row.cargoOriginal}</td><td>{row.periodo ?? "No informado"}</td><td>{displayAmount(row.montoBruto)}</td></tr>)}</tbody></table></div>
                   </div>
                 </details>;
               })}
            </div>
            {groups.length > RESULTS_PAGE_SIZE && <nav className="remuneration-results__pagination" aria-label="Paginación de resultados">
              <button type="button" onClick={() => goToResultsPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>← Anterior</button>
              <span>Mostrando {number.format(pageStart)}–{number.format(pageEnd)} de {number.format(groups.length)} personas</span>
              <button type="button" onClick={() => goToResultsPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Siguiente →</button>
            </nav>}
          </section>}

          <section id="fuentes-remuneraciones" className="remuneration-module remuneration-module--sources" aria-labelledby="fuentes-remuneraciones-title">
            <div className="remuneration-module__heading"><span className="eyebrow">FUENTES</span><h3 id="fuentes-remuneraciones-title">De dónde salen los pagos</h3><p>Estas son las fuentes de remuneraciones individuales que puedes consultar. Cada registro conserva su organismo, período y procedencia.</p></div>
            <div className="remuneration-source-list" aria-label="Fuentes de pagos publicados">
              {paidSources.map((item) => <article key={item.id} className="remuneration-source-card"><div className="remuneration-source-card__header"><span><strong>{item.label}</strong><small>{sourceDescription(item)}</small></span><b>{displayCount(item.publishedCount)} registros</b></div>{item.officialUrl && <a href={item.officialUrl} target="_blank" rel="noopener noreferrer">Ver fuente oficial ↗</a>}</article>)}
            </div>
            <p className="remuneration-reading-note"><strong>Cómo leer los resultados:</strong> un monto aparece sólo cuando la fuente lo publicó. Si falta, se indica “Monto no publicado”; nunca se completa con una estimación.</p>
          </section>
        </>
      )}
    </section>
  );
}
