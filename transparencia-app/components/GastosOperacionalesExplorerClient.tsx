"use client";

import { useEffect, useRef, useState } from "react";
import { advanceExpenseOffsets, mapExpenseApiRecord, mergeExpenseSourcePages, type ExpenseOffsets, type ExpenseSourceId, type PublicExpenseRow } from "@/lib/gastos-public-api";
import { publicApiUrl } from "@/lib/public-api-origin";

export interface ExpenseSummary {
  totalRows: number;
  totalMontoClp: number;
  montoNoInformado: number;
  bySource: Record<ExpenseSourceId, number>;
}

interface ExpenseApiResponse {
  data?: Parameters<typeof mapExpenseApiRecord>[0][];
  meta?: { total?: number; sourceBackend?: string };
}

type LoadState = "loading" | "ready" | "error";
const PAGE_SIZE = 20;
const SOURCES: ExpenseSourceId[] = ["gastos_camara", "gastos_senado"];
const EMPTY_OFFSETS: ExpenseOffsets = { gastos_camara: 0, gastos_senado: 0 };
const money = (value: number | null) => value === null ? "Monto no informado" : value.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const number = (value: number) => value.toLocaleString("es-CL");
const date = (value: string) => value ? value.slice(0, 10).split("-").reverse().join("/") : "—";

function expenseApiUrl(source: ExpenseSourceId, offset: number, query: string, period: string) {
  const params = new URLSearchParams({ source, kind: "expense", limit: String(PAGE_SIZE), offset: String(offset) });
  if (query.trim()) params.set("q", query.trim());
  if (period) params.set("period", period);
  return publicApiUrl(`/api/v1/records?${params}`, window.location.hostname);
}

async function fetchSourcePage(source: ExpenseSourceId, offset: number, query: string, period: string, signal: AbortSignal) {
  const response = await fetch(expenseApiUrl(source, offset, query, period), { signal, cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json() as ExpenseApiResponse;
  if (!Array.isArray(payload.data) || !Number.isFinite(payload.meta?.total)) throw new Error("Respuesta incompleta");
  if (payload.meta?.sourceBackend !== "r2" && payload.meta?.sourceBackend !== "r2-lake") throw new Error("Fuente de datos no disponible");
  return {
    rows: payload.data.map(mapExpenseApiRecord),
    total: payload.meta.total!,
  };
}

export default function GastosOperacionalesExplorerClient({ summary }: { summary: ExpenseSummary }) {
  const [rows, setRows] = useState<PublicExpenseRow[]>([]);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"Todos" | ExpenseSourceId>("Todos");
  const [period, setPeriod] = useState("");
  const [page, setPage] = useState(1);
  const offsetsByPage = useRef<ExpenseOffsets[]>([EMPTY_OFFSETS]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    const start = window.setTimeout(() => {
      setState("loading");
      setError(null);
    }, 0);
    const startOffsets = offsetsByPage.current[page - 1] ?? EMPTY_OFFSETS;
    const sources = source === "Todos" ? SOURCES : [source];

    Promise.all(sources.map((sourceId) => fetchSourcePage(
      sourceId,
      source === "Todos" ? startOffsets[sourceId] : (page - 1) * PAGE_SIZE,
      query,
      period,
      controller.signal,
    ).then((result) => [sourceId, result] as const)))
      .then((results) => {
        const bySource = new Map(results);
        const nextRows = source === "Todos"
          ? mergeExpenseSourcePages(sources.map((sourceId) => bySource.get(sourceId)?.rows ?? []), PAGE_SIZE)
          : {
              rows: bySource.get(source)!.rows,
              consumedBySource: { ...EMPTY_OFFSETS, [source]: bySource.get(source)!.rows.length },
            };
        const nextTotal = results.reduce((sum, [, result]) => sum + result.total, 0);
        setRows(nextRows.rows);
        setTotal(nextTotal);
        if (source === "Todos") {
          const nextOffsets = advanceExpenseOffsets(startOffsets, nextRows.consumedBySource);
          offsetsByPage.current[page] = nextOffsets;
        }
        setState("ready");
      })
      .catch(() => {
        if (controller.signal.aborted) setError("No se pudo cargar la página. Revisa tu conexión e inténtalo nuevamente.");
        else setError("No se pudieron cargar las rendiciones. Inténtalo nuevamente.");
        setRows([]);
        setState("error");
      })
      .finally(() => window.clearTimeout(timeout));

    return () => {
      controller.abort();
      window.clearTimeout(start);
      window.clearTimeout(timeout);
    };
  }, [page, period, query, retry, source]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const updateFilter = <T extends string>(setter: (value: T) => void, value: T) => {
    setter(value);
    setPage(1);
    offsetsByPage.current = [EMPTY_OFFSETS];
  };

  return (
    <div className="container-main" style={{ paddingTop: "2rem", paddingBottom: "5rem" }}>
      <section className="page-masthead" style={{ margin: 0 }}>
        <p className="eyebrow">Transparencia parlamentaria</p>
        <h1>Gastos Operacionales Rendidos</h1>
        <p>Consulta las rendiciones publicadas por la Cámara y el Senado. Cada fila mantiene su período, monto y enlace oficial.</p>
      </section>

      <div className="stat-grid" style={{ marginTop: "1.5rem" }} aria-label="Resumen de gastos operacionales">
        <div className="stat-tile stat-tile--accent"><div className="stat-tile__value">{number(summary.totalRows)}</div><div className="stat-tile__label">Rendiciones publicadas</div></div>
        <div className="stat-tile"><div className="stat-tile__value">{money(summary.totalMontoClp)}</div><div className="stat-tile__label">Montos informados · {number(summary.montoNoInformado)} sin informar</div></div>
        <div className="stat-tile"><div className="stat-tile__value">{number(summary.bySource.gastos_camara ?? 0)}</div><div className="stat-tile__label">Registros Cámara</div></div>
        <div className="stat-tile"><div className="stat-tile__value">{number(summary.bySource.gastos_senado ?? 0)}</div><div className="stat-tile__label">Registros Senado</div></div>
      </div>

      <section className="card-flat" style={{ marginTop: "1.5rem" }} aria-label="Explorador de gastos operacionales">
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <input type="search" value={query} onChange={(event) => updateFilter(setQuery, event.target.value)} placeholder="Buscar autoridad, ítem o período" aria-label="Buscar gastos" style={{ flex: "1 1 260px", minWidth: 220 }} />
          <select value={source} onChange={(event) => updateFilter(setSource, event.target.value as "Todos" | ExpenseSourceId)} aria-label="Filtrar por fuente">
            <option value="Todos">Fuente: todas</option>
            <option value="gastos_camara">Cámara</option>
            <option value="gastos_senado">Senado</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>Período</span>
            <input type="month" value={period} onChange={(event) => updateFilter(setPeriod, event.target.value)} aria-label="Filtrar por período" />
          </label>
        </div>

        {state === "loading" && <p role="status">Cargando rendiciones…</p>}
        {state === "error" && <div role="alert"><p>{error}</p><button type="button" className="btn btn-secondary" onClick={() => setRetry((value) => value + 1)}>Reintentar</button></div>}
        {state === "ready" && !rows.length && <p role="status">No hay rendiciones que coincidan con los filtros.</p>}
        {state === "ready" && rows.length > 0 && (
          <div className="table-shell">
            <table className="data-table">
              <thead><tr><th>Fecha</th><th>Autoridad publicada</th><th>Fuente</th><th>Ítem</th><th>Monto</th><th>Fuente oficial</th></tr></thead>
              <tbody>{rows.map((row) => <tr key={row.id}><td>{date(row.fecha)}</td><td>{row.nombre || "Sin nombre publicado"}</td><td>{row.sourceId === "gastos_camara" ? "Cámara" : "Senado"}</td><td>{row.item}</td><td>{money(row.monto_clp)}</td><td>{row.url ? <a href={row.url} target="_blank" rel="noopener noreferrer">Ver registro ↗</a> : "—"}</td></tr>)}</tbody>
            </table>
          </div>
        )}

        {state === "ready" && <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginTop: "1rem", flexWrap: "wrap" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{number(total)} rendiciones · página {page} de {number(totalPages)}</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Anterior</button>
            <button type="button" className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Siguiente</button>
          </div>
        </div>}
      </section>
    </div>
  );
}
