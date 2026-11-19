"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { DASHBOARD_COMPONENTS, dashboardCsv, dashboardDefaults, dashboardFiltersFromParams, dashboardParams, dashboardTimeline, filterDashboardRows, summarizeDashboardRows, type DashboardComponent, type DashboardData, type DashboardFilters } from "@/lib/parliamentary-dashboard";
import styles from "./ParliamentaryDashboard.module.css";

const components = Object.keys(DASHBOARD_COMPONENTS) as DashboardComponent[];
const money = (amount: number | null) => amount === null ? "Sin dato" : new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(amount);
const compact = (amount: number) => new Intl.NumberFormat("es-CL", { notation: "compact", maximumFractionDigits: 1 }).format(amount);
const month = (value: string) => new Date(Number(value.slice(0, 4)), Number(value.slice(5)) - 1, 1).toLocaleDateString("es-CL", { month: "short", year: "2-digit" });
const tones = { gastos: "var(--accent)", personal: "var(--text-1)", asesorias: "var(--warn)", dieta: "var(--text-2)" };

function Timeline({ rows, filters, totalMembers }: { rows: DashboardData["rows"]; filters: DashboardFilters; totalMembers: number }) {
  const timeline = useMemo(() => dashboardTimeline(rows, filters.from, filters.to), [rows, filters.from, filters.to]);
  const active = components.filter(c => filters.component === "todos" || c === filters.component);
  const values = timeline.flatMap(m => active.map(c => m.values[c].amount).filter((n): n is number => n !== null));
  if (!values.length) return <p className={styles.empty}>No hay importes publicados para este rango. Los meses ausentes no se representan como cero.</p>;
  const max = Math.max(1, ...values), min = Math.min(0, ...values), span = max - min;
  const x = (i: number) => 82 + i * (830 / Math.max(1, timeline.length - 1));
  const y = (v: number) => 220 - (v - min) / span * 190;
  return <>
    <div className={styles.legend}>{active.map(c => <span key={c}><i style={{ background: tones[c] }} />{DASHBOARD_COMPONENTS[c]}</span>)}</div>
    <div className={styles.chartScroll} tabIndex={0} role="region" aria-label="Gráfico mensual desplazable"><svg className={styles.chart} viewBox="0 0 970 280" role="img" aria-label="Evolución mensual de importes publicados. El detalle accesible está en la tabla inferior.">
      {[0, .5, 1].map(t => <g key={t}><line x1="78" x2="930" y1={y(min + span * t)} y2={y(min + span * t)} stroke="var(--border)" /><text x="68" y={y(min + span * t) + 5} textAnchor="end">${compact(min + span * t)}</text></g>)}
      {active.map(c => <g key={c} style={{ color: tones[c] }}>
        {timeline.map((m, i) => {
          const value = m.values[c].amount, previous = timeline[i - 1]?.values[c].amount;
          return <g key={m.period}>{i > 0 && value !== null && previous != null && <line x1={x(i - 1)} x2={x(i)} y1={y(previous)} y2={y(value)} stroke="currentColor" strokeWidth="2.5" strokeDasharray={c === "personal" ? "7 4" : c === "asesorias" ? "2 4" : c === "dieta" ? "10 4 2 4" : undefined} />}{value !== null && <circle cx={x(i)} cy={y(value)} r="4.5" fill="currentColor"><title>{`${month(m.period)} · ${DASHBOARD_COMPONENTS[c]}: ${money(value)} · ${m.values[c].members} autoridades con importe`}</title></circle>}</g>;
        })}
      </g>)}
      {timeline.map((m, i) => <text key={m.period} x={x(i)} y="258" textAnchor="middle">{timeline.length <= 12 || i % Math.ceil(timeline.length / 12) === 0 ? month(m.period) : ""}</text>)}
    </svg></div>
    <p className={styles.mobileHint}>Desliza el gráfico para recorrer los meses, o abre la tabla mensual.</p>
    <details className={styles.chartDetails}><summary>Ver importes y cobertura por mes</summary><div className={styles.tableScroll} role="region" tabIndex={0} aria-label="Tabla desplazable de importes"><table><caption>Importes CLP; cobertura = autoridades con importe / autoridades seleccionadas.</caption><thead><tr><th>Mes</th>{active.map(c => <th key={c}>{DASHBOARD_COMPONENTS[c]}</th>)}</tr></thead><tbody>{timeline.map(m => <tr key={m.period}><th>{month(m.period)}</th>{active.map(c => <td key={c}>{money(m.values[c].amount)}<small>{m.values[c].members}/{totalMembers} autoridades con importe{m.values[c].missing > 0 ? ` · ${m.values[c].missing} sin monto` : ""}</small></td>)}</tr>)}</tbody></table></div></details>
  </>;
}

export default function ParliamentaryDashboard({ data }: { data: DashboardData }) {
  const search = useSearchParams(), pathname = usePathname();
  const serialized = search.toString();
  const filters = useMemo(() => dashboardFiltersFromParams(new URLSearchParams(serialized), data), [serialized, data]);
  const defaults = useMemo(() => dashboardDefaults(data), [data]);
  const [pageIndex, setPageIndex] = useState(1);
  const [sort, setSort] = useState<{ key: "amount" | "period" | "name"; asc: boolean }>({ key: "amount", asc: false });
  const update = (patch: Partial<DashboardFilters>) => {
    const next = { ...filters, ...patch };
    if (patch.chamber !== undefined) next.member = "todos";
    if (patch.component !== undefined || patch.chamber !== undefined || patch.member !== undefined || patch.from !== undefined || patch.to !== undefined) { next.category = patch.category ?? "todas"; next.item = patch.item ?? "todos"; }
    if (patch.category !== undefined) next.item = "todos";
    const valid = dashboardFiltersFromParams(dashboardParams(next), data);
    window.history.pushState(null, "", `${pathname}?${dashboardParams(valid)}`);
    setPageIndex(1);
  };
  const rows = useMemo(() => filterDashboardRows(data, filters), [data, filters]);
  const summary = useMemo(() => summarizeDashboardRows(rows), [rows]);
  const memberMap = useMemo(() => new Map(data.members.map(m => [m.id, m])), [data]);
  const eligible = data.members.filter(m => (filters.chamber === "ambas" || m.chamber === filters.chamber) && (filters.member === "todos" || m.id === filters.member));
  const options = useMemo(() => filterDashboardRows(data, { ...filters, category: "todas", item: "todos" }), [data, filters]);
  const categories = [...new Set(options.map(r => r.category))].sort();
  const items = [...new Set(options.filter(r => filters.category === "todas" || r.category === filters.category).map(r => r.item))].sort();
  const grouped = useMemo(() => {
    const groups = new Map<string, { category: string; component: DashboardComponent; amount: number | null }>();
    for (const r of rows) {
      const key = r.component + ":" + r.category, current = groups.get(key) ?? { category: r.category, component: r.component, amount: null };
      if (r.amount !== null) current.amount = (current.amount ?? 0) + r.amount;
      groups.set(key, current);
    }
    return [...groups.values()].sort((a, b) => (b.amount ?? -Infinity) - (a.amount ?? -Infinity));
  }, [rows]);
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    if (sort.key === "amount" && (a.amount === null || b.amount === null)) return a.amount === b.amount ? a.memberId.localeCompare(b.memberId) : a.amount === null ? 1 : -1;
    const diff = sort.key === "amount" ? a.amount! - b.amount! : sort.key === "period" ? a.period.localeCompare(b.period) : (memberMap.get(a.memberId)?.name ?? "").localeCompare(memberMap.get(b.memberId)?.name ?? "", "es");
    return (sort.asc ? diff : -diff) || a.period.localeCompare(b.period) || a.memberId.localeCompare(b.memberId) || a.item.localeCompare(b.item);
  }), [rows, sort, memberMap]);
  const pages = Math.max(1, Math.ceil(sorted.length / 50)), page = Math.min(pageIndex, pages);
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([dashboardCsv(data, sorted)], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = `cambiometro-${filters.from}-${filters.to}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const order = (key: typeof sort.key) => { setSort({ key, asc: key === sort.key ? !sort.asc : key !== "amount" }); setPageIndex(1); };
  if (data.mode === "unverified") return <div className={styles.empty}><h2>Datos locales por preparar</h2><p>{data.notes[0]}</p></div>;
  return <div className={styles.workspace}>
    <section className={styles.filters} aria-label="Filtros del dashboard">
      <div className={styles.filterTitle}><h2>Explora los recursos parlamentarios</h2><button type="button" onClick={() => { window.history.pushState(null, "", pathname); setPageIndex(1); }}>Restablecer filtros</button></div>
      <div className={styles.filterGrid}>
        <label>Cámara<select value={filters.chamber} onChange={e => update({ chamber: e.target.value })}><option value="ambas">Ambas cámaras</option><option value="camara">Diputados</option><option value="senado">Senado</option></select></label>
        <label className={styles.memberFilter}>Parlamentario<select value={filters.member} onChange={e => update({ member: e.target.value })}><option value="todos">Todos los parlamentarios</option>{data.members.filter(m => filters.chamber === "ambas" || filters.chamber === m.chamber).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <label>Desde<input type="month" min="2026-01" max={filters.to} value={filters.from} onChange={e => update({ from: e.target.value })} /></label>
        <label>Hasta<input type="month" min={filters.from} max={defaults.to} value={filters.to} onChange={e => update({ to: e.target.value })} /></label>
        <label>Componente<select value={filters.component} onChange={e => update({ component: e.target.value })}><option value="todos">Todos, por separado</option>{components.map(c => <option key={c} value={c}>{DASHBOARD_COMPONENTS[c]}</option>)}</select></label>
        <label>Categoría de lectura<select value={filters.category} onChange={e => update({ category: e.target.value })}><option value="todas">Todas las categorías</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
        <label className={styles.itemFilter}>Ítem<select value={filters.item} onChange={e => update({ item: e.target.value })}><option value="todos">Todos los ítems</option>{items.map(i => <option key={i}>{i}</option>)}</select></label>
      </div>
    </section>
    <p className={styles.status} role="status">{rows.length.toLocaleString("es-CL")} filas · {eligible.length} parlamentarios seleccionados · {month(filters.from)} a {month(filters.to)}</p>
    <div className={styles.metrics}>{components.map(c => <section key={c} className={styles.metric} style={{ borderTopColor: tones[c] }} aria-label={DASHBOARD_COMPONENTS[c]}><h3>{DASHBOARD_COMPONENTS[c]}</h3><strong>{c === "dieta" ? `${summary[c].members} referencias` : money(summary[c].amount)}</strong><p>{c === "dieta" ? "Importe individual y mes oficial en el detalle" : "Acumulado conocido del rango seleccionado"}</p><small>{summary[c].members}/{eligible.length} autoridades con importe · {summary[c].months} meses{summary[c].missing > 0 ? ` · ${summary[c].missing} observaciones sin monto` : ""}</small></section>)}</div>
    <p className={styles.caveat}>Los componentes se muestran por separado: pueden tener distintos cortes y conceptos que se solapan. Una dieta de referencia no es un pago mensual confirmado. Sin dato significa que no hay un importe incorporado, no que el gasto sea cero.</p>
    <div className={styles.visuals}>
      <section className={styles.panel} aria-labelledby="dashboard-evolution"><p className="eyebrow">Línea de tiempo</p><h2 id="dashboard-evolution">Evolución por mes</h2><p>Importes CLP por componente. Los huecos indican meses sin importe; la dieta aparece sólo en su mes oficial.</p><Timeline rows={rows} filters={filters} totalMembers={eligible.length} /></section>
      <section className={styles.panel} aria-labelledby="dashboard-breakdown"><p className="eyebrow">Desglose del rango</p><h2 id="dashboard-breakdown">Categorías de lectura</h2><p>Agrupación para navegar; conserva los ítems originales. Acumulados por componente, sin total conjunto.</p>{grouped.length ? <ul className={styles.breakdown}>{grouped.map(g => <li key={g.component + g.category}><div><span>{g.category}</span><strong>{g.component === "dieta" ? "Ver referencias" : money(g.amount)}</strong></div><small>{DASHBOARD_COMPONENTS[g.component]}</small>{g.component !== "dieta" && g.amount !== null && <div className={styles.bar}><span style={{ width: `${Math.max(1, Math.min(100, Math.abs(g.amount) / Math.max(1, ...grouped.filter(v => v.component !== "dieta").map(v => Math.abs(v.amount ?? 0))) * 100))}%`, background: tones[g.component] }} /></div>}<button type="button" onClick={() => update({ component: g.component, category: g.category })}>Ver detalle de {g.category.toLowerCase()} →</button></li>)}</ul> : <p className={styles.empty}>Sin observaciones para estos filtros.</p>}</section>
    </div>
    <section className={styles.panel} aria-labelledby="dashboard-detail">
      <div className={styles.detailTitle}><div><p className="eyebrow">Detalle verificable</p><h2 id="dashboard-detail">Importes, períodos e ítems</h2></div><button type="button" onClick={exportCsv} disabled={!rows.length}>Descargar CSV filtrado</button></div>
      <div className={styles.tableScroll} role="region" tabIndex={0} aria-label="Tabla desplazable de importes"><table><caption>CLP nominales. Cada fila conserva su período. Contratos no equivale a personas únicas. Exportación incluye todas las filas filtradas.</caption><thead><tr><th aria-sort={sort.key === "name" ? sort.asc ? "ascending" : "descending" : "none"}><button onClick={() => order("name")}>Parlamentario ↕</button></th><th>Cámara</th><th aria-sort={sort.key === "period" ? sort.asc ? "ascending" : "descending" : "none"}><button onClick={() => order("period")}>Mes ↕</button></th><th>Componente / ítem</th><th aria-sort={sort.key === "amount" ? sort.asc ? "ascending" : "descending" : "none"}><button onClick={() => order("amount")}>Monto CLP ↕</button></th><th>Contratos</th></tr></thead><tbody>{sorted.slice((page - 1) * 50, page * 50).map((r, i) => <tr key={`${r.memberId}-${r.period}-${r.component}-${i}`}><th scope="row">{memberMap.get(r.memberId)?.name}</th><td>{memberMap.get(r.memberId)?.chamber === "camara" ? "Diputados" : "Senado"}</td><td className={styles.noWrap}>{r.period}</td><td>{DASHBOARD_COMPONENTS[r.component]}<small>{r.item}</small>{r.component === "dieta" && <small>Referencia oficial; no imputada a otros meses</small>}</td><td className={styles.amount}>{money(r.amount)}</td><td>{r.contracts ?? "—"}</td></tr>)}</tbody></table></div>
      {!rows.length && <p className={styles.empty}>No hay observaciones incorporadas con esta combinación. Prueba otra cámara, período o componente.</p>}
      <nav className={styles.pagination} aria-label="Páginas del detalle"><button type="button" disabled={page === 1} onClick={() => setPageIndex(page - 1)}>← Anterior</button><span>Página {page} de {pages}</span><button type="button" disabled={page === pages} onClick={() => setPageIndex(page + 1)}>Siguiente →</button></nav>
    </section>
    <details className={styles.panel}><summary>Fuentes y alcances de este dashboard</summary><ul className={styles.notes}>{data.notes.map(note => <li key={note}>{note}</li>)}</ul><p>{data.mode === "local-verified" ? "Revisión local sobre copia verificada del release publicado." : "Datos del release publicado hidratado al construir la web."}</p><p className={styles.release}>Release: {data.releaseId}</p><Link href="/fuentes">Consultar fuentes y alcances →</Link></details>
  </div>;
}
