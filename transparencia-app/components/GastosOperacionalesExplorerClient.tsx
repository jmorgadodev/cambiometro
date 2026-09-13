"use client";

import { useEffect, useMemo, useState } from "react";

interface GastoRow {
  id: string;
  sourceId: "gastos_camara" | "gastos_senado";
  nombre?: string;
  fecha: string;
  periodo: string;
  item: string;
  monto_clp: number;
  url: string;
  fuente?: string;
}

interface SearchRow {
  i: number;
  p: number;
  n: string | null;
  y: string;
  d: string;
  t: string;
  m: number;
  s: string;
}

interface ExpenseManifest {
  totalRows: number;
  pageSize: number;
  totalPages: number;
  pages: Array<{ page: number; path: string; count: number }>;
  searchIndex: { path: string };
  expected: { totalMontoClp: number; bySource: Record<string, number> };
}

type LoadState = "loading" | "ready" | "error";

const PAGE_SIZE = 20;
const money = (value: number) => value.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const number = (value: number) => value.toLocaleString("es-CL");
const date = (value: string) => value ? value.slice(0, 10).split("-").reverse().join("/") : "—";

export default function GastosOperacionalesExplorerClient() {
  const [manifest, setManifest] = useState<ExpenseManifest | null>(null);
  const [index, setIndex] = useState<SearchRow[]>([]);
  const [rows, setRows] = useState<GastoRow[]>([]);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("Todos");
  const [period, setPeriod] = useState("Todos");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>("loading");
  const [detailState, setDetailState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    const start = window.setTimeout(() => {
      setState("loading");
      setError(null);
    }, 0);
    Promise.all([
      fetch("/data/gastos-operacionales/manifest.json", { signal: controller.signal, cache: "no-store" }),
      fetch("/data/gastos-operacionales/search-index.json", { signal: controller.signal, cache: "no-store" }),
    ])
      .then(async ([manifestResponse, indexResponse]) => {
        if (!manifestResponse.ok) throw new Error(`manifest HTTP ${manifestResponse.status}`);
        if (!indexResponse.ok) throw new Error(`índice HTTP ${indexResponse.status}`);
        const nextManifest = await manifestResponse.json() as ExpenseManifest;
        const nextIndex = await indexResponse.json() as SearchRow[];
        if (!nextManifest.totalRows || !nextManifest.pages?.length || nextIndex.length !== nextManifest.totalRows) {
          throw new Error("release de gastos incompleto");
        }
        setManifest(nextManifest);
        setIndex(nextIndex);
        setState("ready");
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === "AbortError") setError("La carga del índice tardó demasiado. Reintenta.");
        else setError("No se pudo cargar el índice público de gastos. Revisa tu conexión y reintenta.");
        setState("error");
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      controller.abort();
      window.clearTimeout(start);
      window.clearTimeout(timeout);
    };
  }, [retry]);

  const periods = useMemo(() => ["Todos", ...new Set(index.map((entry) => entry.y).filter(Boolean))].sort((a, b) => a === "Todos" ? -1 : b === "Todos" ? 1 : b.localeCompare(a)), [index]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es-CL");
    return index.filter((entry) => {
      if (source !== "Todos" && entry.s !== source) return false;
      if (period !== "Todos" && entry.y !== period) return false;
      if (!needle) return true;
      return [entry.n, entry.t, entry.y, entry.s].filter(Boolean).some((value) => value!.toLocaleLowerCase("es-CL").includes(needle));
    });
  }, [index, period, query, source]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const selected = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (!manifest || !selected.length) {
      window.setTimeout(() => {
        setRows([]);
        setDetailState("ready");
      }, 0);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    const start = window.setTimeout(() => setDetailState("loading"), 0);
    const pageNumbers = [...new Set(selected.map((entry) => entry.p))];
    Promise.all(pageNumbers.map(async (pageNumber) => {
      const pageInfo = manifest.pages[pageNumber - 1];
      if (!pageInfo) throw new Error(`chunk ${pageNumber} ausente`);
      const response = await fetch(pageInfo.path, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error(`chunk HTTP ${response.status}`);
      return [pageNumber, await response.json() as GastoRow[]] as const;
    }))
      .then((chunks) => {
        const byIndex = new Map<number, GastoRow>();
        for (const [pageNumber, chunk] of chunks) chunk.forEach((row, rowIndex) => byIndex.set((pageNumber - 1) * manifest.pageSize + rowIndex, row));
        setRows(selected.map((entry) => byIndex.get(entry.i)).filter((row): row is GastoRow => Boolean(row)));
        setDetailState("ready");
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === "AbortError") setError("La carga de este detalle tardó demasiado. Reintenta.");
        else setError("No se pudo cargar este bloque de gastos. Reintenta.");
        setDetailState("error");
        setRows([]);
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      controller.abort();
      window.clearTimeout(start);
      window.clearTimeout(timeout);
    };
  }, [manifest, selected]);

  const updateFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="container-main" style={{ paddingTop: "2rem", paddingBottom: "5rem" }}>
      <section className="page-masthead" style={{ margin: 0 }}>
        <p className="eyebrow">Transparencia parlamentaria</p>
        <h1>Gastos Operacionales Rendidos</h1>
        <p>Universo completo de rendiciones publicadas por la Cámara y el Senado. Cada fila mantiene su período, monto y enlace oficial; los nombres históricos no se asignan artificialmente a una autoridad vigente.</p>
      </section>

      {manifest && (
        <div className="stat-grid" style={{ marginTop: "1.5rem" }} aria-label="Resumen de gastos operacionales">
          <div className="stat-tile stat-tile--accent"><div className="stat-tile__value">{number(manifest.totalRows)}</div><div className="stat-tile__label">Rendiciones publicadas</div></div>
          <div className="stat-tile"><div className="stat-tile__value">{money(manifest.expected.totalMontoClp)}</div><div className="stat-tile__label">Monto acumulado</div></div>
          <div className="stat-tile"><div className="stat-tile__value">{number(manifest.expected.bySource.gastos_camara ?? 0)}</div><div className="stat-tile__label">Registros Cámara</div></div>
          <div className="stat-tile"><div className="stat-tile__value">{number(manifest.expected.bySource.gastos_senado ?? 0)}</div><div className="stat-tile__label">Registros Senado</div></div>
        </div>
      )}

      <section className="card-flat" style={{ marginTop: "1.5rem" }} aria-label="Explorador de gastos operacionales">
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <input type="search" value={query} onChange={(event) => updateFilter(setQuery, event.target.value)} placeholder="Buscar autoridad, ítem o período" aria-label="Buscar gastos" style={{ flex: "1 1 260px", minWidth: 220 }} />
          <select value={source} onChange={(event) => updateFilter(setSource, event.target.value)} aria-label="Filtrar por fuente">
            <option value="Todos">Fuente: todas</option>
            <option value="gastos_camara">Cámara</option>
            <option value="gastos_senado">Senado</option>
          </select>
          <select value={period} onChange={(event) => updateFilter(setPeriod, event.target.value)} aria-label="Filtrar por período">
            {periods.map((value) => <option key={value} value={value}>{value === "Todos" ? "Período: todos" : value}</option>)}
          </select>
        </div>

        {state === "loading" && <p role="status">Preparando índice de gastos…</p>}
        {state === "error" && <div role="alert"><p>{error}</p><button type="button" className="btn btn-secondary" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></div>}
        {state === "ready" && !selected.length && <p role="status">No hay rendiciones que coincidan con los filtros.</p>}
        {state === "ready" && selected.length > 0 && detailState === "loading" && <p role="status">Cargando este bloque de rendiciones…</p>}
        {state === "ready" && detailState === "error" && <div role="alert"><p>{error}</p><button type="button" className="btn btn-secondary" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></div>}
        {rows.length > 0 && (
          <div className="table-shell">
            <table className="data-table">
              <thead><tr><th>Fecha</th><th>Autoridad publicada</th><th>Fuente</th><th>Ítem</th><th>Monto</th><th>Fuente oficial</th></tr></thead>
              <tbody>{rows.map((row) => <tr key={row.id}><td>{date(row.fecha)}</td><td>{row.nombre || "Sin nombre publicado"}</td><td>{row.sourceId === "gastos_camara" ? "Cámara" : "Senado"}</td><td>{row.item}</td><td>{money(row.monto_clp)}</td><td><a href={row.url} target="_blank" rel="noopener noreferrer">Ver registro ↗</a></td></tr>)}</tbody>
            </table>
          </div>
        )}

        {state === "ready" && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginTop: "1rem", flexWrap: "wrap" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{number(filtered.length)} rendiciones filtradas · página {page} de {number(totalPages)}</span>
          <div style={{ display: "flex", gap: "0.5rem" }}><button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button><button type="button" className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Siguiente</button></div>
        </div>}
      </section>
    </div>
  );
}
