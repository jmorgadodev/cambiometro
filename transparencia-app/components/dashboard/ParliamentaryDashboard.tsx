"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatPublishedMonth } from "@/lib/month-periods";
import { usePathname, useSearchParams } from "next/navigation";
import { DASHBOARD_COMPONENTS, dashboardCsv, dashboardFiltersFromParams, dashboardParams, dashboardMembers, filterDashboardRows, dashboardHeadlineMetrics, type DashboardComponent, type DashboardData, type DashboardFilters } from "@/lib/parliamentary-dashboard";
import DashboardFilterPanel from "./DashboardFilters";
import DashboardTimeline, { dashboardMoney } from "./DashboardTimeline";
import DashboardMonthlyBars from "./DashboardMonthlyBars";
import DashboardComparison from "./DashboardComparison";
import styles from "./ParliamentaryDashboard.module.css";

const components = Object.keys(DASHBOARD_COMPONENTS) as DashboardComponent[];
const month = (value: string) => new Date(Number(value.slice(0, 4)), Number(value.slice(5)) - 1, 1).toLocaleDateString("es-CL", { month: "short", year: "2-digit" });
const tones = { gastos: "var(--accent)", personal: "var(--text-1)", asesorias: "var(--warn)", dieta: "var(--text-2)" };

export default function ParliamentaryDashboard({ data }: { data: DashboardData }) {
  const search = useSearchParams(), pathname = usePathname();
  const serialized = search.toString();
  const filters = useMemo(() => dashboardFiltersFromParams(new URLSearchParams(serialized), data), [serialized, data]);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [pageIndex, setPageIndex] = useState(1);
  const [sort, setSort] = useState<{ key: "amount" | "period" | "name"; asc: boolean }>({ key: "amount", asc: false });
  const rootRef = useRef<HTMLDivElement>(null), toolbarRef = useRef<HTMLDivElement>(null), toggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const root = rootRef.current, toolbar = toolbarRef.current, header = document.querySelector<HTMLElement>(".site-header");
    if (!root || !toolbar) return;
    const measure = () => { root.style.setProperty("--dashboard-header-offset", `${header?.getBoundingClientRect().height ?? 0}px`); root.style.setProperty("--dashboard-toolbar-height", `${toolbar.getBoundingClientRect().height}px`); };
    measure(); const observer = new ResizeObserver(measure); if (header) observer.observe(header); observer.observe(toolbar);
    return () => observer.disconnect();
  }, []);
  const update = (patch: Partial<DashboardFilters>) => {
    const next = { ...filters, ...patch };
    if (patch.member !== undefined && patch.memberIds === undefined) next.memberIds = patch.member === "todos" ? [] : [patch.member];
    if (patch.component !== undefined && patch.componentIds === undefined) next.componentIds = patch.component === "todos" ? [] : [patch.component as DashboardComponent];
    if (patch.memberIds !== undefined) next.member = "todos";
    if (patch.componentIds !== undefined) next.component = "todos";
    if (["component", "componentIds", "chamber", "member", "memberIds", "partyIds", "from", "to"].some(key => Object.hasOwn(patch, key))) { next.category = patch.category ?? "todas"; next.item = patch.item ?? "todos"; }
    if (patch.category !== undefined) next.item = patch.item ?? "todos";
    const valid = dashboardFiltersFromParams(dashboardParams(next), data);
    window.history.pushState(null, "", `${pathname}?${dashboardParams(valid)}`); setPageIndex(1);
  };
  const rows = useMemo(() => filterDashboardRows(data, filters), [data, filters]);
  const headline = useMemo(() => dashboardHeadlineMetrics(data, filters), [data, filters]);
  const summary = headline.summary;
  const eligible = useMemo(() => dashboardMembers(data, filters), [data, filters]);
  const memberMap = useMemo(() => new Map(data.members.map(m => [m.id, m])), [data]);
  const partyMap = useMemo(() => new Map(data.members.map(m => [m.partyId ?? "sin-partido", m.partyLabel ?? "Sin partido incorporado"])), [data]);
  const grouped = useMemo(() => {
    const groups = new Map<string, { category: string; component: DashboardComponent; amount: number | null }>();
    for (const r of rows) { const key = r.component + ":" + r.category, current = groups.get(key) ?? { category: r.category, component: r.component, amount: null }; if (r.amount !== null) current.amount = (current.amount ?? 0) + r.amount; groups.set(key, current); }
    return [...groups.values()].sort((a, b) => (b.amount ?? -Infinity) - (a.amount ?? -Infinity));
  }, [rows]);
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    if (sort.key === "amount" && (a.amount === null || b.amount === null)) return a.amount === b.amount ? a.memberId.localeCompare(b.memberId) : a.amount === null ? 1 : -1;
    const diff = sort.key === "amount" ? a.amount! - b.amount! : sort.key === "period" ? a.period.localeCompare(b.period) : (memberMap.get(a.memberId)?.name ?? "").localeCompare(memberMap.get(b.memberId)?.name ?? "", "es");
    return (sort.asc ? diff : -diff) || a.period.localeCompare(b.period) || a.memberId.localeCompare(b.memberId) || a.item.localeCompare(b.item);
  }), [rows, sort, memberMap]);
  const pages = Math.max(1, Math.ceil(sorted.length / 50)), page = Math.min(pageIndex, pages);
  const exportCsv = () => { const url = URL.createObjectURL(new Blob([dashboardCsv(data, sorted)], { type: "text/csv;charset=utf-8;" })); const link = document.createElement("a"); link.href = url; link.download = `cambiometro-${filters.from}-${filters.to}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const order = (key: typeof sort.key) => { setSort({ key, asc: key === sort.key ? !sort.asc : key !== "amount" }); setPageIndex(1); };
  const moveToMobile = (id: string) => {
    if (window.matchMedia("(max-width:760px)").matches) requestAnimationFrame(() => {
      const target = document.getElementById(id);
      target?.scrollIntoView({ block: "start" });
      target?.focus({ preventScroll: true });
    });
  };
  const closeFilters = () => { setFiltersOpen(false); toggleRef.current?.focus({ preventScroll: true }); moveToMobile("dashboard-canvas"); };
  const toggleFilters = () => { if (filtersOpen) closeFilters(); else { setFiltersOpen(true); moveToMobile("dashboard-filters-heading"); } };
  const selectedCount = (filters.memberIds?.length ?? 0) + (filters.partyIds?.length ?? 0) + (filters.componentIds?.length ?? 0);
  if (data.mode === "unverified") return <div className={styles.empty}><h2>Datos locales por preparar</h2><p>{data.notes[0]}</p></div>;
  return <div id="dashboard-workspace" ref={rootRef} className={styles.workspace}>
    <div ref={toolbarRef} className={styles.toolbar}>
      <button ref={toggleRef} type="button" aria-controls="dashboard-filters" aria-expanded={filtersOpen} onClick={toggleFilters}>{filtersOpen ? "← Ocultar filtros" : "☰ Mostrar filtros"}{selectedCount ? ` · ${selectedCount}` : ""}</button>
      <span>{month(filters.from)} — {month(filters.to)} · {eligible.length} parlamentarios</span>
      <button type="button" onClick={() => { window.history.pushState(null, "", pathname); setPageIndex(1); }}>Restablecer filtros</button>
    </div>
    <div className={styles.analysisLayout} data-filters-open={filtersOpen}>
      <aside id="dashboard-filters" className={styles.filters} hidden={!filtersOpen} aria-label="Filtros del dashboard"><DashboardFilterPanel data={data} filters={filters} onChange={update} onClose={closeFilters} /></aside>
      <div id="dashboard-canvas" role="region" aria-label="Visualizaciones del dashboard" tabIndex={-1} className={styles.canvas}>
        <div className={styles.activeFilters} aria-label="Selección activa">
          {filters.chamber !== "ambas" && <button type="button" onClick={() => update({ chamber: "ambas" })}>{filters.chamber === "camara" ? "Diputados" : "Senado"} ×</button>}
          {filters.partyIds?.map(id => <button type="button" key={id} onClick={() => update({ partyIds: filters.partyIds!.filter(v => v !== id) })}>{partyMap.get(id)} ×</button>)}
          {filters.memberIds?.map(id => <button type="button" key={id} onClick={() => update({ memberIds: filters.memberIds!.filter(v => v !== id) })}>{memberMap.get(id)?.name} ×</button>)}
          {filters.componentIds?.map(id => <button type="button" key={id} onClick={() => update({ componentIds: filters.componentIds!.filter(v => v !== id) })}>{DASHBOARD_COMPONENTS[id]} ×</button>)}
          {filters.category !== "todas" && <button type="button" onClick={() => update({ category: "todas" })}>{filters.category} ×</button>}
          {filters.item !== "todos" && <button type="button" onClick={() => update({ item: "todos" })}>{filters.item} ×</button>}
        </div>
        <p className={styles.status} role="status">{rows.length.toLocaleString("es-CL")} filas · {eligible.length} parlamentarios seleccionados · {month(filters.from)} a {month(filters.to)}</p>
        <p className={styles.filterHint}>Tarjetas: cohorte y período seleccionados. Componentes, categorías e ítems enfocan los gráficos y el detalle; la última dieta oficial se aplica como referencia fija a cada mes del rango.</p>
        <div className={styles.metrics} role="group" aria-label="Tarjetas de contexto">
          <section className={styles.totalCard} aria-label="Total referencial"><span>Suma de las cuatro tarjetas</span><h2>Total referencial</h2><strong>{dashboardMoney(headline.total)}</strong><p>Incluye acumulados del rango y la dieta fija de referencia aplicada a cada mes. Es una estimación: la dieta no acredita pagos de cada mes y otros conceptos pueden solaparse; no es gasto consolidado.</p><details><summary>Ver desglose de la suma</summary><dl>{components.map(c => <div key={c}><dt>{DASHBOARD_COMPONENTS[c]}</dt><dd>{dashboardMoney(summary[c].amount)}</dd></div>)}</dl></details></section>
          {components.map(c => <button type="button" key={c} className={styles.metric} data-component={c} style={{ borderTopColor: tones[c] }} aria-pressed={filters.componentIds?.length === 1 && filters.componentIds[0] === c} onClick={() => update({ componentIds: filters.componentIds?.length === 1 && filters.componentIds[0] === c ? [] : [c] })}>
          <span className={styles.metricTitle}>{DASHBOARD_COMPONENTS[c]}</span><strong>{dashboardMoney(summary[c].amount)}</strong><span>{c === "dieta" ? `Referencia mensual: ${dashboardMoney(headline.referenceMonthlyAmount)} · aplicada a ${headline.appliedMonths} meses · fuente: ${headline.referencePeriods.map(formatPublishedMonth).join(" · ") || "Aún no disponible"}` : summary[c].amount === null ? "Sin registros con importe" : "Acumulado conocido del rango"}</span><small>{summary[c].members}/{eligible.length} autoridades con importe · {summary[c].months} meses</small>
        </button>)}</div>
        <p className={styles.caveat}>Toca una tarjeta para enfocar su componente. La última dieta se repite en todos los meses como referencia fija para el cálculo, no como pago comprobado. El total referencial suma tarjetas y puede incluir solapamientos.</p>
        <DashboardComparison data={data} filters={filters} />
        <DashboardMonthlyBars rows={rows} filters={filters} />
        <div className={styles.visuals}>
          <section className={styles.panel} aria-labelledby="dashboard-evolution"><p className="eyebrow">Línea de tiempo</p><h2 id="dashboard-evolution">Evolución por mes</h2><p>Importes CLP por componente. Los puntos vacíos muestran 0 sin registros; la dieta se aplica como referencia fija en cada mes.</p><DashboardTimeline rows={rows} filters={filters} totalMembers={eligible.length} /></section>
          <section className={styles.panel} aria-labelledby="dashboard-breakdown"><p className="eyebrow">Desglose del rango</p><h2 id="dashboard-breakdown">Categorías de lectura</h2><p>Acumulados por componente; conserva los ítems originales.</p>{grouped.length ? <ul className={styles.breakdown}>{grouped.map(g => <li key={g.component + g.category}><div><span>{g.category}</span><strong>{dashboardMoney(g.amount)}</strong></div><small>{DASHBOARD_COMPONENTS[g.component]}{g.amount === null ? " · sin registros con importe" : ""}</small>{g.component !== "dieta" && g.amount !== null && <div className={styles.bar}><span style={{ width: `${Math.max(1, Math.min(100, Math.abs(g.amount) / Math.max(1, ...grouped.filter(v => v.component !== "dieta").map(v => Math.abs(v.amount ?? 0))) * 100))}%`, background: tones[g.component] }} /></div>}<button type="button" onClick={() => update({ componentIds: [g.component], category: g.category })}>Ver detalle de {g.category.toLowerCase()} →</button></li>)}</ul> : <p className={styles.empty}>$0 · No hay registros incorporados con estos filtros.</p>}</section>
        </div>
        <section className={styles.panel} aria-labelledby="dashboard-detail">
          <div className={styles.detailTitle}><div><p className="eyebrow">Detalle verificable</p><h2 id="dashboard-detail">Importes, períodos e ítems</h2></div><button type="button" onClick={exportCsv} disabled={!rows.length}>Descargar CSV filtrado</button></div>
          <div className={styles.tableScroll} role="region" tabIndex={0} aria-label="Tabla desplazable de importes"><table><caption>CLP nominales. CSV incluye todas las filas filtradas, identifica la dieta estimada y distingue importes no publicados de ceros reales.</caption><thead><tr><th aria-sort={sort.key === "name" ? sort.asc ? "ascending" : "descending" : "none"}><button onClick={() => order("name")}>Parlamentario ↕</button></th><th>Cámara / partido vigente</th><th aria-sort={sort.key === "period" ? sort.asc ? "ascending" : "descending" : "none"}><button onClick={() => order("period")}>Mes ↕</button></th><th>Componente / ítem</th><th aria-sort={sort.key === "amount" ? sort.asc ? "ascending" : "descending" : "none"}><button onClick={() => order("amount")}>Monto CLP ↕</button></th><th>Contratos</th></tr></thead><tbody>{sorted.slice((page - 1) * 50, page * 50).map((r, i) => <tr key={`${r.memberId}-${r.period}-${r.component}-${i}`}><th scope="row">{memberMap.get(r.memberId)?.name}</th><td>{memberMap.get(r.memberId)?.chamber === "camara" ? "Diputados" : "Senado"}<small>{memberMap.get(r.memberId)?.partyLabel}</small></td><td className={styles.noWrap}>{r.period}</td><td>{DASHBOARD_COMPONENTS[r.component]}<small>{r.item}</small>{r.estimated && <small>Estimación fija · referencia oficial: {r.referencePeriod}</small>}</td><td className={styles.amount}>{dashboardMoney(r.amount)}{r.amount === null && <small>Sin importe publicado</small>}</td><td>{r.contracts ?? "—"}</td></tr>)}</tbody></table></div>
          {!rows.length && <p className={styles.empty}>$0 · No hay observaciones incorporadas con esta combinación.</p>}
          <nav className={styles.pagination} aria-label="Páginas del detalle"><button type="button" disabled={page === 1} onClick={() => setPageIndex(page - 1)}>← Anterior</button><span>Página {page} de {pages}</span><button type="button" disabled={page === pages} onClick={() => setPageIndex(page + 1)}>Siguiente →</button></nav>
        </section>
        <details className={styles.panel}><summary>Fuentes y alcances de este dashboard</summary><ul className={styles.notes}>{data.notes.map(note => <li key={note}>{note}</li>)}</ul><p>El 0 mostrado por ausencia no sustituye el estado original. CSV conserva el estado del importe y distingue las dietas estimadas con su mes oficial de referencia.</p><p>{data.mode === "local-verified" ? "Revisión local sobre copia verificada del release publicado." : "Datos del release publicado hidratado al construir la web."}</p><p className={styles.release}>Release: {data.releaseId}</p><Link href="/fuentes">Consultar fuentes y alcances →</Link></details>
      </div>
    </div>
  </div>;
}
