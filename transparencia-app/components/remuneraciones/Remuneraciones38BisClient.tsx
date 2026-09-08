"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Remuneracion38BisRecord } from "@/lib/remuneraciones-38bis";
import RemuneracionesHistoryChart, { type RemuneracionPeriodPoint } from "@/components/remuneraciones/RemuneracionesHistoryChart";

interface PageEntry {
  page: number;
  key: string;
  count: number;
}

export interface PeriodSummary {
  mes: string;
  total: number;
  registros_con_monto: number;
  total_bruto: number;
  manifest_key: string;
  comparison: {
    estado: string;
    periodo_anterior: string | null;
    entradas: number;
    salidas_observadas: number;
    cambios: number;
  };
  comparison_key: string;
}

export interface PeriodManifest {
  mes: string;
  base_path: string;
  total: number;
  registros_con_monto: number;
  total_bruto: number;
  page_size: number;
  page_count: number;
  pages: PageEntry[];
  sort_pages: Record<"sueldo_desc" | "sueldo_asc", PageEntry[]>;
  search_index: string;
  organismos: string[];
  organismo_pages: Record<string, number[]>;
  cargos: string[];
  cargo_pages: Record<string, number[]>;
  comparison: {
    estado: string;
    periodo_anterior: string | null;
    entradas: number;
    salidas_observadas: number;
    cambios: number;
  };
  comparison_key: string;
}

interface ComparisonDetail {
  tipo: "entrada" | "salida_observada" | "cambio";
  partida: string;
  organismo: string;
  cargo: string;
  nombre: string;
  bruto_mensual: number | null;
  bruto_anterior: number | null;
  bruto_actual: number | null;
  diferencia: number | null;
}

interface ComparisonDetails {
  estado: string;
  periodo_anterior: string | null;
  entradas: ComparisonDetail[];
  salidas_observadas: ComparisonDetail[];
  cambios: ComparisonDetail[];
}

type ComparisonKind = "entradas" | "salidas_observadas" | "cambios";

type SortMode = "relevancia" | "sueldo_desc" | "sueldo_asc";

export interface ReleaseManifest {
  source_url: string;
  mes: string;
  extraido_en: string;
  total: number;
  registros_con_monto: number;
  total_bruto: number;
  page_size: number;
  page_count: number;
  pages: PageEntry[];
  sort_pages: Record<"sueldo_desc" | "sueldo_asc", PageEntry[]>;
  periodos: PeriodSummary[];
  search_index: string;
  organismos: string[];
  organismo_pages: Record<string, number[]>;
  cargos: string[];
  cargo_pages: Record<string, number[]>;
  comparison_key: string;
  comparison: {
    estado: string;
    periodo_anterior: string | null;
    entradas: number;
    salidas_observadas: number;
    cambios: number;
  };
}

type SearchIndex = Record<string, number[]>;

function currentPeriodFromManifest(manifest: ReleaseManifest): PeriodManifest {
  return {
    mes: manifest.mes,
    base_path: "",
    total: manifest.total,
    registros_con_monto: manifest.registros_con_monto,
    total_bruto: manifest.total_bruto,
    page_size: manifest.page_size,
    page_count: manifest.page_count,
    pages: manifest.pages,
    sort_pages: manifest.sort_pages,
    search_index: manifest.search_index,
    organismos: manifest.organismos,
    organismo_pages: manifest.organismo_pages,
    cargos: manifest.cargos,
    cargo_pages: manifest.cargo_pages,
    comparison_key: manifest.comparison_key,
    comparison: manifest.comparison,
  };
}

const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("es-CL");

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeZone: "America/Santiago" }).format(new Date(value));
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function rowText(row: Remuneracion38BisRecord) {
  return normalize(`${row.nombre} ${row.organismo} ${row.cargo} ${row.partida}`);
}

export default function Remuneraciones38BisClient({
  manifest,
  initialRows,
}: {
  manifest: ReleaseManifest;
  initialRows: Remuneracion38BisRecord[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [organismo, setOrganismo] = useState("todos");
  const [cargo, setCargo] = useState("todos");
  const [sortMode, setSortMode] = useState<SortMode>("relevancia");
  const [periodo, setPeriodo] = useState(manifest.mes);
  const [loadedPeriod, setLoadedPeriod] = useState<PeriodManifest | null>(null);
  const [page, setPage] = useState(1);
  const [resultCount, setResultCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Remuneracion38BisRecord | null>(null);
  const [searchIndex, setSearchIndex] = useState<SearchIndex | null>(null);
  const [searchIndexPeriod, setSearchIndexPeriod] = useState<string | null>(null);
  const [comparisonKind, setComparisonKind] = useState<ComparisonKind | null>(null);
  const [comparisonDetails, setComparisonDetails] = useState<ComparisonDetails | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [comparisonPage, setComparisonPage] = useState(1);
  const currentPeriod = currentPeriodFromManifest(manifest);
  const activePeriod = periodo === manifest.mes || loadedPeriod?.mes !== periodo ? currentPeriod : loadedPeriod;
  const activePeriodReady = activePeriod.mes === periodo;

  useEffect(() => {
    if (!comparisonKind || !activePeriodReady) return;
    let active = true;
    setComparisonLoading(true);
    setComparisonError(null);
    setComparisonPage(1);
    fetch(`/data/remuneraciones-38bis/${activePeriod.base_path}${activePeriod.comparison_key}`)
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo cargar el detalle de la comparación mensual.");
        return response.json() as Promise<ComparisonDetails>;
      })
      .then((value) => { if (active) setComparisonDetails(value); })
      .catch((reason: Error) => { if (active) { setComparisonDetails(null); setComparisonError(reason.message); } })
      .finally(() => { if (active) setComparisonLoading(false); });
    return () => { active = false; };
  }, [activePeriod.base_path, activePeriod.comparison_key, activePeriod.mes, activePeriodReady, comparisonKind]);

  useEffect(() => {
    if (periodo === manifest.mes) return;
    const summary = manifest.periodos.find((period) => period.mes === periodo);
    if (!summary) return;
    let active = true;
    fetch(`/data/remuneraciones-38bis/${summary.manifest_key}`)
      .then((response) => {
        if (!response.ok) throw new Error("No se pudo cargar el corte mensual seleccionado.");
        return response.json() as Promise<PeriodManifest>;
      })
      .then((value) => { if (active) setLoadedPeriod(value); })
      .catch((reason: Error) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [manifest.mes, manifest.periodos, periodo]);

  useEffect(() => {
    let active = true;
    fetch(`/data/remuneraciones-38bis/${activePeriod.search_index}`)
      .then((response) => response.json() as Promise<SearchIndex>)
      .then((value) => { if (active) { setSearchIndex(value); setSearchIndexPeriod(activePeriod.mes); } })
      .catch(() => { if (active) { setSearchIndex({}); setSearchIndexPeriod(activePeriod.mes); } });
    return () => { active = false; };
  }, [activePeriod.mes, activePeriod.search_index]);

  const fetchPage = useCallback(async (pageNumber: number, order: SortMode = "relevancia", period = activePeriod) => {
    const entries = order === "relevancia" ? period.pages : period.sort_pages[order];
    const entry = entries.find((item) => item.page === pageNumber);
    if (!entry) return [];
    const directory = order === "relevancia" ? "" : order === "sueldo_desc" ? "sueldo-desc/" : "sueldo-asc/";
    const response = await fetch(`/data/remuneraciones-38bis/${period.base_path}${directory}${entry.key}`);
    if (!response.ok) throw new Error("No se pudo cargar esta página del registro.");
    return response.json() as Promise<Remuneracion38BisRecord[]>;
  }, [activePeriod]);

  useEffect(() => {
    const filterActive = Boolean(query.trim() || cargo !== "todos" || organismo !== "todos");
    if (!activePeriodReady || filterActive || (page === 1 && sortMode === "relevancia" && periodo === manifest.mes)) return;
    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) return;
      setLoading(true);
      setError(null);
      fetchPage(page, sortMode, activePeriod)
        .then((value) => { if (active) setRows(value); })
        .catch((reason: Error) => { if (active) setError(reason.message); })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [activePeriod, activePeriodReady, cargo, fetchPage, manifest.mes, organismo, page, periodo, query, sortMode]);

  useEffect(() => {
    const filterActive = Boolean(query.trim() || cargo !== "todos" || organismo !== "todos");
    if (!activePeriodReady || !filterActive || (query.trim() && (!searchIndex || searchIndexPeriod !== activePeriod.mes))) return;
    let active = true;
    const terms = normalize(query).split(/\s+/).filter((term) => term.length >= 2);
    const candidatePages = new Set<number>();
    if (terms.length > 0 && searchIndex) {
      for (const term of terms) for (const pageNumber of searchIndex[term] ?? []) candidatePages.add(pageNumber);
    }
    if (cargo !== "todos") for (const pageNumber of activePeriod.cargo_pages[cargo] ?? []) candidatePages.add(pageNumber);
    if (organismo !== "todos") for (const pageNumber of activePeriod.organismo_pages[organismo] ?? []) candidatePages.add(pageNumber);
    const normalizedQuery = normalize(query);
    const timer = window.setTimeout(() => {
      if (!active) return;
      setLoading(true);
      setError(null);
      Promise.all([...candidatePages].sort((a, b) => a - b).map((pageNumber) => fetchPage(pageNumber, "relevancia", activePeriod)))
        .then((groups) => {
          if (!active) return;
          const matches = groups.flat()
            .filter((row) => !normalizedQuery || rowText(row).includes(normalizedQuery))
            .filter((row) => cargo === "todos" || row.cargo === cargo)
            .filter((row) => organismo === "todos" || row.organismo === organismo)
            .sort((left, right) => {
              if (sortMode === "relevancia") return 0;
              const leftValue = left.bruto_mensual ?? -1;
              const rightValue = right.bruto_mensual ?? -1;
              return sortMode === "sueldo_desc" ? rightValue - leftValue : leftValue - rightValue;
            });
          setRows(matches);
          setResultCount(matches.length);
          setPage(1);
        })
        .catch((reason: Error) => { if (active) setError(reason.message); })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [activePeriod, activePeriodReady, cargo, fetchPage, organismo, query, searchIndex, searchIndexPeriod, sortMode]);

  const filterActive = Boolean(query.trim() || cargo !== "todos" || organismo !== "todos");
  const sourceRows = !filterActive && page === 1 && sortMode === "relevancia" && periodo === manifest.mes ? initialRows : rows;
  const filteredRows = useMemo(() => sourceRows.filter((row) => organismo === "todos" || row.organismo === organismo).filter((row) => cargo === "todos" || row.cargo === cargo), [cargo, organismo, sourceRows]);
  const pageCount = filterActive ? Math.max(1, Math.ceil((resultCount ?? filteredRows.length) / activePeriod.page_size)) : activePeriod.page_count;
  const visibleRows = filterActive ? filteredRows.slice((page - 1) * activePeriod.page_size, page * activePeriod.page_size) : filteredRows;

  const showingLabel = filterActive
    ? `${number.format(resultCount ?? filteredRows.length)} coincidencias`
    : `Página ${page} de ${activePeriod.page_count}`;

  const periodPoints = manifest.periodos as RemuneracionPeriodPoint[];
  const comparisonRows = comparisonDetails && comparisonKind ? comparisonDetails[comparisonKind] : [];
  const comparisonPageSize = 20;
  const comparisonPageCount = Math.max(1, Math.ceil(comparisonRows.length / comparisonPageSize));
  const visibleComparisonRows = comparisonRows.slice((comparisonPage - 1) * comparisonPageSize, comparisonPage * comparisonPageSize);
  const comparisonTitle: Record<ComparisonKind, string> = {
    entradas: "Nuevos registros detectados",
    salidas_observadas: "Registros que ya no aparecen",
    cambios: "Cambios de remuneración detectados",
  };
  const comparisonDescription: Record<ComparisonKind, string> = {
    entradas: "Registros presentes en el mes seleccionado que no estaban en el corte anterior.",
    salidas_observadas: "Registros del mes anterior que no aparecen en el corte seleccionado. No prueba por sí solo un término de contrato.",
    cambios: "Personas cuyo monto bruto publicado cambió entre ambos cortes.",
  };

  const selectPeriod = (nextPeriod: string) => {
    setPeriodo(nextPeriod);
    setPage(1);
    setResultCount(null);
    setRows([]);
    setComparisonKind(null);
    setComparisonDetails(null);
  };

  const openComparison = (kind: ComparisonKind) => {
    setComparisonKind(kind);
    setComparisonPage(1);
  };

  return (
    <div className="page-shell" style={{ minHeight: "100vh" }}>
      <header className="page-masthead">
        <div className="container-main page-masthead__grid">
          <div>
            <span className="eyebrow">Personas · Registro público 38 bis</span>
            <h1>Remuneraciones públicas</h1>
            <p>
              Consulta las remuneraciones brutas publicadas para autoridades y asesores directos sujetos al artículo 38 bis.
              Cada corte conserva su período, organismo, cargo y fuente original.
            </p>
          </div>
          <dl className="page-fact-sheet">
            <div><dt>Último corte</dt><dd>{manifest.mes}</dd></div>
            <div><dt>Registros publicados</dt><dd>{number.format(manifest.total)}</dd></div>
            <div><dt>Actualizado aquí</dt><dd>{formatDate(manifest.extraido_en)}</dd></div>
          </dl>
        </div>
      </header>

      <main className="container-main" style={{ padding: "2.25rem 1.5rem 4rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <section className="card" aria-labelledby="release-title">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <span className="eyebrow">Trazabilidad del release</span>
              <h2 id="release-title" style={{ margin: "0.25rem 0 0.35rem", fontSize: "1.35rem" }}>Un corte mensual, una versión verificable</h2>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.86rem", lineHeight: 1.6 }}>
                La Comisión mantiene este registro mensualmente; la fecha del corte puede tener desfase respecto de la fecha de publicación.
                La información es reportada por las instituciones responsables.
              </p>
            </div>
            <span className="badge badge-ok">Registro mensual</span>
          </div>

          <div className="stat-grid" style={{ marginTop: "1.25rem" }}>
            <div className="stat-tile stat-tile--accent"><div className="stat-tile__value">{number.format(activePeriod.total)}</div><div className="stat-tile__label">Registros del corte</div><div className="stat-tile__hint">{activePeriod.mes}</div></div>
            <button type="button" className="stat-tile stat-tile--ok stat-tile--interactive" aria-pressed={comparisonKind === "entradas"} onClick={() => openComparison("entradas")} disabled={activePeriod.comparison.estado !== "comparado"}><div className="stat-tile__value">{activePeriod.comparison.estado === "comparado" ? number.format(activePeriod.comparison.entradas) : "—"}</div><div className="stat-tile__label">Nuevos registros</div><div className="stat-tile__hint">{activePeriod.comparison.estado === "comparado" ? "Ver detalle frente al mes anterior ↗" : "Primera línea base"}</div></button>
            <button type="button" className="stat-tile stat-tile--warn stat-tile--interactive" aria-pressed={comparisonKind === "salidas_observadas"} onClick={() => openComparison("salidas_observadas")} disabled={activePeriod.comparison.estado !== "comparado"}><div className="stat-tile__value">{activePeriod.comparison.estado === "comparado" ? number.format(activePeriod.comparison.salidas_observadas) : "—"}</div><div className="stat-tile__label">Registros que ya no aparecen</div><div className="stat-tile__hint">Ver detalle · no prueba término jurídico ↗</div></button>
            <button type="button" className="stat-tile stat-tile--info stat-tile--interactive" aria-pressed={comparisonKind === "cambios"} onClick={() => openComparison("cambios")} disabled={activePeriod.comparison.estado !== "comparado"}><div className="stat-tile__value">{activePeriod.comparison.estado === "comparado" ? number.format(activePeriod.comparison.cambios) : "—"}</div><div className="stat-tile__label">Cambios de monto</div><div className="stat-tile__hint">Ver montos anterior y actual ↗</div></button>
            <div className="stat-tile stat-tile--accent"><div className="stat-tile__value">{money.format(activePeriod.total_bruto)}</div><div className="stat-tile__label">Masa bruta publicada</div><div className="stat-tile__hint">{number.format(activePeriod.registros_con_monto)} registros con monto</div></div>
          </div>

          {comparisonKind && (
            <section className="remuneraciones-comparison-panel" aria-labelledby="comparison-detail-title">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                <div>
                  <span className="eyebrow">Detalle de la comparación</span>
                  <h3 id="comparison-detail-title" style={{ margin: "0.25rem 0 0.3rem", fontSize: "1.05rem" }}>{comparisonTitle[comparisonKind]}</h3>
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.78rem", lineHeight: 1.5 }}>{comparisonDescription[comparisonKind]} Corte {activePeriod.mes} frente a {activePeriod.comparison.periodo_anterior ?? "—"}.</p>
                </div>
                <button type="button" className="btn btn-ghost" onClick={() => { setComparisonKind(null); setComparisonDetails(null); }}>Cerrar detalle</button>
              </div>
              {comparisonLoading && <p role="status" style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Cargando registros comparados…</p>}
              {comparisonError && <p role="alert" className="badge badge-danger" style={{ marginTop: "0.8rem", textTransform: "none", letterSpacing: 0 }}>{comparisonError}</p>}
              {!comparisonLoading && !comparisonError && comparisonDetails && (
                <>
                  {comparisonRows.length === 0 ? <p role="status" style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: "1rem 0 0" }}>No hay registros en esta categoría para el corte seleccionado.</p> : (
                    <>
                      <div className="table-shell" style={{ marginTop: "0.9rem", overflowX: "auto" }}>
                        <table className="data-table"><caption className="sr-only">{comparisonTitle[comparisonKind]} del corte {activePeriod.mes}</caption><thead><tr><th>Persona</th><th>Organismo y cargo</th><th>Mes anterior</th><th>Mes seleccionado</th><th>Diferencia</th></tr></thead><tbody>
                          {visibleComparisonRows.map((row) => <tr key={`${row.tipo}-${row.nombre}-${row.organismo}-${row.cargo}`}><td><strong>{row.nombre}</strong><small>{row.partida}</small></td><td>{row.organismo}<small>{row.cargo}</small></td><td>{row.bruto_anterior === null ? "No reportado" : money.format(row.bruto_anterior)}</td><td>{row.bruto_actual === null ? "No reportado" : money.format(row.bruto_actual)}</td><td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: row.diferencia === null ? "var(--text-muted)" : row.diferencia >= 0 ? "var(--ok)" : "var(--warn)" }}>{row.diferencia === null ? "—" : `${row.diferencia >= 0 ? "+" : ""}${money.format(row.diferencia)}`}</td></tr>)}
                        </tbody></table>
                      </div>
                      <nav aria-label="Paginación del detalle mensual" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginTop: "0.8rem" }}><button type="button" className="btn btn-ghost" disabled={comparisonPage <= 1} onClick={() => setComparisonPage((value) => Math.max(1, value - 1))}>← Anterior</button><span style={{ color: "var(--text-subtle)", fontSize: "0.74rem" }}>Página {comparisonPage} / {comparisonPageCount} · {number.format(comparisonRows.length)} registros</span><button type="button" className="btn btn-ghost" disabled={comparisonPage >= comparisonPageCount} onClick={() => setComparisonPage((value) => Math.min(comparisonPageCount, value + 1))}>Siguiente →</button></nav>
                    </>
                  )}
                </>
              )}
            </section>
          )}

          <div style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: "1rem", flexWrap: "wrap", color: "var(--text-subtle)", fontSize: "0.74rem" }}>
            <span>Actualización: mensual</span>
            <span>Período publicado: <strong>{activePeriod.mes}</strong></span>
            <a href={manifest.source_url} target="_blank" rel="noopener noreferrer" className="data-link">Ver fuente oficial ↗</a>
          </div>
        </section>

        <section className="card" aria-labelledby="explore-title">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "end" }}>
            <div>
              <span className="eyebrow">Explorador paginado</span>
              <h2 id="explore-title" style={{ margin: "0.25rem 0 0.25rem", fontSize: "1.25rem" }}>Busca una persona, organismo o cargo</h2>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.82rem" }}>El navegador carga sólo la página solicitada; no descarga el universo completo.</p>
            </div>
            <span style={{ color: "var(--text-subtle)", fontSize: "0.78rem" }}>{showingLabel}</span>
          </div>

          <div className="remuneraciones-filters" style={{ marginTop: "1rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.74rem", fontWeight: 700 }}>
              Buscar
              <input className="form-input" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); setResultCount(null); }} placeholder="Ej. Ministerio del Interior" aria-label="Buscar remuneraciones públicas" />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.74rem", fontWeight: 700 }}>
              Mes publicado
              <select className="form-input" value={periodo} onChange={(event) => selectPeriod(event.target.value)} aria-label="Filtrar por mes publicado">
                {manifest.periodos.map((period) => <option key={period.mes} value={period.mes}>{period.mes}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.74rem", fontWeight: 700 }}>
              Organismo
              <select className="form-input" value={organismo} onChange={(event) => { setOrganismo(event.target.value); setPage(1); setResultCount(null); }} aria-label="Filtrar por organismo">
                <option value="todos">Todos los organismos</option>
                {activePeriod.organismos.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.74rem", fontWeight: 700 }}>
              Cargo
              <select className="form-input" value={cargo} onChange={(event) => { setCargo(event.target.value); setPage(1); setResultCount(null); }} aria-label="Filtrar por cargo">
                <option value="todos">Todos los cargos</option>
                {manifest.cargos.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.74rem", fontWeight: 700 }}>
              Ordenar sueldo
              <select className="form-input" value={sortMode} onChange={(event) => { setSortMode(event.target.value as SortMode); setPage(1); setResultCount(null); }} aria-label="Ordenar por sueldo">
                <option value="relevancia">Orden original de la fuente</option>
                <option value="sueldo_desc">Mayor a menor</option>
                <option value="sueldo_asc">Menor a mayor</option>
              </select>
            </label>
          </div>

          {error && <p role="alert" className="badge badge-danger" style={{ marginTop: "1rem", textTransform: "none", letterSpacing: 0 }}>{error}</p>}
          {loading && <p role="status" style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: "1rem 0 0" }}>Cargando registros…</p>}

          <div className="table-shell" style={{ marginTop: "1rem", overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%" }}>
              <caption className="sr-only">Registros de remuneraciones públicas del corte {activePeriod.mes}</caption>
              <thead><tr><th>Persona</th><th>Organismo</th><th>Cargo</th><th>Bruto del mes</th><th aria-label="Acciones" /></tr></thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={`${row.nombre}-${row.organismo}-${row.cargo}`}>
                    <td><strong>{row.nombre}</strong><small>{row.partida}</small></td>
                    <td>{row.organismo}</td>
                    <td>{row.cargo}</td>
                    <td style={{ whiteSpace: "nowrap", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{row.bruto_mensual === null ? "No reportado" : money.format(row.bruto_mensual)}</td>
                    <td><button type="button" className="btn btn-ghost" style={{ padding: "0.35rem 0.55rem", fontSize: "0.74rem" }} onClick={() => setSelected(row)}>Ver ficha</button></td>
                  </tr>
                ))}
                {!loading && visibleRows.length === 0 && <tr><td colSpan={5}><div role="status" style={{ padding: "2rem 0", textAlign: "center", color: "var(--text-muted)" }}>No encontramos registros con esos filtros.</div></td></tr>}
              </tbody>
            </table>
          </div>

          <nav aria-label="Paginación de remuneraciones" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginTop: "1rem" }}>
            <button type="button" className="btn btn-ghost" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>← Anterior</button>
            <span style={{ color: "var(--text-subtle)", fontSize: "0.75rem" }}>Página {page} / {pageCount}</span>
            <button type="button" className="btn btn-ghost" disabled={page >= pageCount || loading} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Siguiente →</button>
          </nav>
        </section>

        <RemuneracionesHistoryChart periods={periodPoints} selectedPeriod={periodo} onPeriodClick={selectPeriod} />

        <section className="card" aria-labelledby="method-title">
          <span className="eyebrow">Cómo leer estos cambios</span>
          <h2 id="method-title" style={{ margin: "0.25rem 0 0.4rem", fontSize: "1.15rem" }}>Auditoría mensual, no una acusación automática</h2>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.84rem", lineHeight: 1.7 }}>
            La fuente publica un corte mensual, pero no entrega en este registro la fecha de contratación, término, jornada, descuentos ni acto administrativo de cada persona. Por eso no presentamos “contrataciones” como hechos: al comparar meses detectamos registros que aparecen, dejan de aparecer o cambian de monto. Un valor bajo, como $216.323, es el monto que la institución reportó para ese corte; sin jornada ni explicación publicada no corresponde convertirlo en un error ni recalcularlo.
          </p>
          <p style={{ margin: "0.8rem 0 0", color: "var(--text-muted)", fontSize: "0.84rem", lineHeight: 1.7 }}>
            El primer corte completo funciona como línea base. Desde el mes siguiente se pueden contar entradas observadas, salidas observadas y cambios de monto, además de comparar la masa bruta publicada de cada mes. Los registros “NO REPORTADO” permanecen visibles y no se suman como cero. Una entrada o salida orienta una revisión, pero no prueba por sí sola un nombramiento o término jurídico. Una misma persona puede aparecer más de una vez si la fuente reporta cargos u organismos distintos.
          </p>
        </section>
      </main>

      {selected && (
        <div role="dialog" aria-modal="true" aria-labelledby="remuneracion-ficha-title" className="overlay-panel" onClick={() => setSelected(null)}>
          <div className="card" style={{ width: "min(100% - 2rem, 34rem)", margin: "auto", padding: "1.5rem" }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start" }}>
              <div><span className="eyebrow">Registro {manifest.mes}</span><h2 id="remuneracion-ficha-title" style={{ margin: "0.25rem 0", fontSize: "1.25rem" }}>{selected.nombre}</h2></div>
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)} aria-label="Cerrar ficha">Cerrar</button>
            </div>
            <dl style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "0.8rem", margin: "1.25rem 0 0", fontSize: "0.82rem" }}>
              <div><dt style={{ color: "var(--text-subtle)" }}>Organismo</dt><dd style={{ margin: 0, fontWeight: 700 }}>{selected.organismo}</dd></div>
              <div><dt style={{ color: "var(--text-subtle)" }}>Partida</dt><dd style={{ margin: 0, fontWeight: 700 }}>{selected.partida}</dd></div>
              <div><dt style={{ color: "var(--text-subtle)" }}>Cargo o perfil</dt><dd style={{ margin: 0, fontWeight: 700 }}>{selected.cargo}</dd></div>
              <div><dt style={{ color: "var(--text-subtle)" }}>Remuneración bruta reportada</dt><dd style={{ margin: 0, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{selected.bruto_mensual === null ? "No reportado" : money.format(selected.bruto_mensual)}</dd></div>
            </dl>
            <p style={{ margin: "1.25rem 0 0", color: "var(--text-muted)", fontSize: "0.75rem", lineHeight: 1.6 }}>Este registro corresponde al corte {activePeriod.mes}. La fuente no publica aquí jornada, fecha de contratación, descuentos ni motivo del monto. La ficha conserva el dato informado y no interpreta por sí sola la legalidad o pertinencia del nombramiento.</p>
          </div>
        </div>
      )}
    </div>
  );
}
