"use client";
import { useMemo } from "react";
import FinancialBars from "@/components/charts/FinancialBars";
import { DASHBOARD_COMPONENTS, dashboardTimeline, activeDashboardComponents, type DashboardData, type DashboardFilters } from "@/lib/parliamentary-dashboard";
import { dashboardMoney } from "./DashboardTimeline";
import styles from "./ParliamentaryDashboard.module.css";
const tones = { gastos: "var(--accent)", personal: "var(--text-1)", asesorias: "var(--warn)", dieta: "var(--text-2)" };
export default function DashboardMonthlyBars({ rows, filters }: { rows: DashboardData["rows"]; filters: DashboardFilters }) {
  const timeline = useMemo(() => dashboardTimeline(rows, filters.from, filters.to), [rows, filters.from, filters.to]);
  const active = activeDashboardComponents(filters);
  const series = active.map(id => ({ id, label: DASHBOARD_COMPONENTS[id], color: tones[id] }));
  return <section className={styles.panel} aria-labelledby="dashboard-monthly-bars"><p className="eyebrow">Comparación visual por mes</p><h2 id="dashboard-monthly-bars">Barras mensuales</h2><p>Cada componente tiene su barra y escala común en CLP. La dieta se repite como referencia fija estimada. No se apilan como gasto consolidado.</p>
    <div className={styles.legend}>{series.map(s => <span key={s.id}><i style={{ background: s.color }} />{s.label}</span>)}</div>
    <FinancialBars rows={timeline.map(m => ({ period: m.period, values: Object.fromEntries(active.map(c => [c, m.values[c].amount])) }))} series={series} label="Barras mensuales del Dashboard" zeroForMissing />
    <p className={styles.filterHint}>Pasa por una barra, tócala o usa el teclado para ver el detalle. Los puntos vacíos indican 0 sin registros con importe.</p>
    <details><summary>Ver valores de las barras</summary><div className={styles.tableScroll} role="region" aria-label="Valores de las barras mensuales" tabIndex={0}><table><caption>Importes por componente y mes del mismo conjunto filtrado.</caption><thead><tr><th>Mes</th>{active.map(c => <th key={c}>{DASHBOARD_COMPONENTS[c]}</th>)}</tr></thead><tbody>{timeline.map(m => <tr key={m.period}><th scope="row">{m.period}</th>{active.map(c => <td key={c}>{dashboardMoney(m.values[c].amount)}{m.values[c].amount === null && <small>Aún no disponible</small>}</td>)}</tr>)}</tbody></table></div></details>
  </section>;
}
