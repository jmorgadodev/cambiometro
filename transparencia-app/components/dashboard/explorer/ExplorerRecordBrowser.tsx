"use client";
import { useMemo, useState } from "react";
import { DASHBOARD_COMPONENTS, type DashboardComponent } from "@/lib/parliamentary-dashboard";
import { explorerCsv, explorerMoney, filterExplorerRecords, institutionLabel, type ExplorerData, type ExplorerQuery, type ExplorerRecord } from "@/lib/parliamentary-explorer";
import { selectRecordDetails, recordComponentTotals, type DetailRecordFilters } from "@/lib/parliamentary-explorer-records";
import { DataState, downloadExplorerBlob } from "./ExplorerPrimitives";
import { RecordEvidence, RecordSource } from "./ExplorerRecordEvidence";
import styles from "./Explorer.module.css";
const PAGE_SIZE = 10;
export default function ExplorerRecordBrowser({ data, q, records, loading, error, retry, expected }: {
    data: ExplorerData;
    q: ExplorerQuery;
    records: ExplorerRecord[];
    loading: boolean;
    error: string | null;
    retry: () => void;
    expected: Partial<Record<DashboardComponent, number | null>>;
}) {
    const [filters, setFilters] = useState<DetailRecordFilters>({});
    const [page, setPage] = useState(1);
    const members = useMemo(() => new Map(data.members.map(m => [m.id, m])), [data]);
    const scoped = useMemo(() => filterExplorerRecords(data, q, records), [data, q, records]);
    const selected = useMemo(() => selectRecordDetails(data, scoped, filters), [data, scoped, filters]);
    const totals = useMemo(() => recordComponentTotals(selected), [selected]);
    const complete = useMemo(() => recordComponentTotals(scoped), [scoped]);
    const reconciles = Object.entries(expected).every(([key, value]) => value === (complete[key as DashboardComponent]?.amount ?? null));
    const pages = Math.max(1, Math.ceil(selected.length / PAGE_SIZE)), active = Math.min(page, pages);
    const shown = selected.slice((active - 1) * PAGE_SIZE, active * PAGE_SIZE);
    const patch = (p: Partial<DetailRecordFilters>) => { setFilters(f => ({ ...f, ...p })); setPage(1); };
    const options = (key: keyof ExplorerRecord) => [...new Set(scoped.map(r => String(r[key] ?? "")))].filter(Boolean).sort((a, b) => a.localeCompare(b, "es"));
    const chooser = (label: string, key: keyof DetailRecordFilters, values: string[], labelFor: (v: string) => string = (v) => v) => values.length > 1 ? <label key={key}>{label}<select aria-label={label} value={filters[key] ?? ""} onChange={e => patch({ [key]: e.target.value })}><option value="">Todos</option>{values.map(v => <option key={v} value={v}>{labelFor(v)}</option>)}</select></label> : null;
    const chambers = [...new Set(scoped.flatMap(r => members.get(r.memberId)?.chamber ?? []))].sort();
    const people = options("memberId").sort((a, b) => (members.get(a)?.name ?? a).localeCompare(members.get(b)?.name ?? b, "es"));
    const filtered = Object.values(filters).some(Boolean) && Object.entries(filters).some(([k, v]) => k !== "order" && v);
    return <section aria-label="Registros del total" className={styles.detailRecords} data-reconciliation={!loading && !error ? (reconciles ? "matched" : "mismatch") : "pending"}>
    <h3>Registros que componen el total</h3>
    <DataState loading={loading} error={error} onRetry={retry} empty={!loading && !error && !scoped.length}/>
    {!loading && !error && <>
      {!reconciles && <p role="alert">El detalle disponible no concilia con el total de la selección. No se presenta como un conjunto completo.</p>}
      <label className={styles.detailSearch}>Buscar en los registros<input type="search" value={filters.search ?? ""} placeholder="Concepto, prestador, integrante o parlamentario…" onChange={e => patch({ search: e.target.value })}/></label>
      <div className={styles.detailRecordTools}>
        <label>Ordenar registros<select value={filters.order ?? "amount-desc"} onChange={e => patch({ order: e.target.value as DetailRecordFilters["order"] })}><option value="amount-desc">Mayor a menor monto</option><option value="amount-asc">Menor a mayor monto</option><option value="period-desc">Mes más reciente</option><option value="period-asc">Mes más antiguo</option></select></label>
        <button type="button" disabled={!selected.length} onClick={() => downloadExplorerBlob(new Blob([explorerCsv(data, selected)], { type: "text/csv;charset=utf-8" }), `cambiometro-detalle-${q.from}-${q.to}.csv`)}>Exportar detalle CSV ({selected.length})</button>
      </div>
      <details><summary>Filtrar registros del detalle</summary><div className={styles.detailRecordFilters}>
        {chooser("Institución", "chamber", chambers, institutionLabel)}
        {chooser("Mes", "period", options("period"))}
        {chooser("Parlamentario informante", "memberId", people, v => members.get(v)?.name ?? "Sin asociación")}
        {chooser("Componente", "component", options("component"), v => DASHBOARD_COMPONENTS[v as DashboardComponent])}
        {chooser("Agrupación visual (opcional)", "category", options("category"))}
        {chooser("Ítem original", "item", options("item"))}
      </div><button type="button" onClick={() => { setFilters({}); setPage(1); }}>Restablecer detalle</button></details>
      <div aria-live="polite" className={styles.detailRecordSummary}><span>{selected.length.toLocaleString("es-CL")} de {scoped.length.toLocaleString("es-CL")} registros{filtered ? " · resultados filtrados" : ""}</span>
        {Object.entries(totals).map(([component, value]) => <span key={component}>Subtotal de resultados · {DASHBOARD_COMPONENTS[component as DashboardComponent]} · {explorerMoney(value.amount)}</span>)}
      </div>
      {!selected.length && <p>No hay registros que coincidan con estos filtros.</p>}
      <div className={styles.evidenceList}>
        {shown.map(r => {
                const member = members.get(r.memberId);
                return <article key={r.id} data-record-id={r.id} data-record-amount={r.amount ?? undefined}>
          <details><summary><span className={styles.detailRecordTitle}>{r.providerName ?? r.personName ?? r.originalConcept ?? r.item}</span><strong>{explorerMoney(r.amount)}</strong><span className={styles.detailRecordMeta}>{member?.name ?? "Sin asociación"} · {institutionLabel(member?.chamber ?? "")} · {r.period}</span></summary>
            <RecordEvidence row={r} member={member}/>
          </details>
          <div className={styles.detailRecordSource}><RecordSource row={r}/></div>
        </article>;
            })}
      </div>
      {selected.length > 0 && <nav className={styles.pagination} aria-label="Páginas del detalle"><button type="button" disabled={active === 1} onClick={() => setPage(active - 1)}>← Anterior</button><label className={styles.detailPage}>Página<input type="number" min={1} max={pages} value={active} aria-label="Ir a página del detalle" onChange={e => setPage(Math.max(1, Math.min(pages, Number(e.target.value) || 1)))}/>de {pages}</label><button type="button" disabled={active === pages} onClick={() => setPage(active + 1)}>Siguiente →</button></nav>}
    </>}
  </section>;
}
