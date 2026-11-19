"use client";
import { useChartTooltip } from "@/components/charts/ChartTooltip";
import motion from "@/components/charts/FinancialBars.module.css";
import { useMemo, useState } from "react";
import { DASHBOARD_COMPONENTS, activeDashboardComponents, dashboardComparisonGroups, dashboardTimeline, type DashboardData, type DashboardFilters, type DashboardComponent } from "@/lib/parliamentary-dashboard";
import { dashboardMoney } from "./DashboardTimeline";
import styles from "./ParliamentaryDashboard.module.css";
const colors = ["var(--accent)", "var(--warn)", "var(--text-1)", "var(--info)", "var(--bad)", "var(--text-2)"];
const short = (amount: number) => new Intl.NumberFormat("es-CL", { notation: "compact", maximumFractionDigits: 1 }).format(amount);

export default function DashboardComparison({ data, filters }: { data: DashboardData; filters: DashboardFilters }) {
  const [mode, setMode] = useState<"auto" | "member" | "party">("auto");
  const [chosen, setChosen] = useState<DashboardComponent>("gastos");
  const dimension = mode === "auto" ? (filters.memberIds?.length ? "member" : "party") : mode;
  const active = activeDashboardComponents(filters);
  const component = active.includes(chosen) ? chosen : active[0];
  const groups = useMemo(() => dashboardComparisonGroups(data, filters, dimension), [data, filters, dimension]);
  const series = useMemo(() => groups.map(group => ({ ...group, timeline: dashboardTimeline(group.rows, filters.from, filters.to) })), [groups, filters.from, filters.to]);
  const tooltip = useChartTooltip(true, JSON.stringify([filters, dimension, component]));
  const selected = !!(filters.memberIds?.length || filters.partyIds?.length);
  if (!selected) return <section className={styles.comparisonIntro} aria-label="Comparación"><strong>Compara partidos o parlamentarios</strong><span>Elige dos o más en los filtros para ver sus series y cifras por separado.</span></section>;
  const points = series.flatMap(s => s.timeline.map(m => m.values[component].amount ?? 0));
  const max = Math.max(1, ...points), min = Math.min(0, ...points), span = max - min;
  const months = series[0]?.timeline ?? [];
  const x = (i: number) => 85 + i * 810 / Math.max(1, months.length - 1), y = (value: number) => 220 - (value - min) / span * 190;
  return <section className={styles.panel} aria-labelledby="dashboard-comparison">
    <div className={styles.detailTitle}><div><p className="eyebrow">Selecciones en paralelo</p><h2 id="dashboard-comparison">Comparación</h2></div><div className={styles.buttonChoices} role="group" aria-label="Agrupar comparación">{[["member", "Por parlamentario"], ["party", "Por partido"]].map(([id, label]) => <button key={id} type="button" aria-pressed={dimension === id} onClick={() => setMode(id as "member" | "party")}>{label}</button>)}</div></div>
    <p>{groups.length} {dimension === "member" ? "parlamentarios" : "partidos"} en el conjunto filtrado. Importes por componente; no se suman conceptos que se solapan.</p>
    <div className={styles.buttonChoices} role="group" aria-label="Componente de comparación">{active.map(c => <button key={c} type="button" aria-pressed={component === c} onClick={() => setChosen(c)}>{DASHBOARD_COMPONENTS[c]}</button>)}</div>
    <div className={styles.legend}>{groups.map((g, i) => <span key={g.id}><b style={{ color: colors[i % colors.length] }}>{i + 1}.</b>{g.label}</span>)}</div>
    <div className={styles.chartScroll} tabIndex={0} role="region" aria-label="Gráfico comparativo desplazable" onScroll={tooltip.clear}><svg className={styles.chart} viewBox="0 0 970 280" role="group" aria-label={`Comparación mensual de ${DASHBOARD_COMPONENTS[component]}. Tabla de valores a continuación.`}>
      {[0, .5, 1].map(t => <g key={t}><line pointerEvents="none" x1="80" x2="930" y1={y(min + span * t)} y2={y(min + span * t)} stroke="var(--border)" /><text x="70" y={y(min + span * t) + 5} textAnchor="end">${short(min + span * t)}</text></g>)}
      {series.map((s, index) => <g key={s.id + JSON.stringify([filters,component])} className={motion.animateSeries} style={{ color: colors[index % colors.length] }}>{s.timeline.map((m, i) => {
        const raw = m.values[component].amount, previous = s.timeline[i - 1]?.values[component].amount;
        return <g key={m.period}>{component !== "dieta" && i > 0 && raw !== null && previous != null && <line pointerEvents="none" x1={x(i - 1)} x2={x(i)} y1={y(previous)} y2={y(raw)} stroke="currentColor" strokeWidth="2.5" strokeDasharray={index ? `${3 + index * 2} 4` : undefined} />}<circle {...tooltip.bind(`${s.id}-${m.period}`, { title: `${s.label} · ${m.period}`, rows: [{ label: DASHBOARD_COMPONENTS[component], amount: raw, detail: `${m.values[component].members}/${s.members} autoridades con importe` }] })} className={motion.mark} data-period={m.period} data-group={s.id} data-component={component} cx={x(i)} cy={y(raw ?? 0)} r={4 + index % 2} fill={raw === null ? "var(--surface)" : "currentColor"} stroke="currentColor"><title>{`${s.label} · ${m.period}: ${dashboardMoney(raw)}${raw === null ? " · sin registros con importe" : ""}`}</title></circle></g>;
      })}</g>)}
      {months.map((m, i) => <text key={m.period} x={x(i)} y="258" textAnchor="middle">{months.length <= 12 || i % Math.ceil(months.length / 12) === 0 ? m.period : ""}</text>)}
    </svg></div>{tooltip.overlay}
    <p className={styles.filterHint}>Los puntos vacíos muestran 0 cuando no hay importe incorporado; los datos originales conservan su estado. La dieta sólo se observa en su mes oficial.</p>
    <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Tabla de comparación"><table><caption>Acumulados del rango por componente. Partido de la nómina vigente, no afiliación histórica. Se indica cobertura por grupo.</caption><thead><tr><th>{dimension === "member" ? "Parlamentario" : "Partido"}</th>{active.map(c => <th key={c}>{DASHBOARD_COMPONENTS[c]}</th>)}</tr></thead><tbody>{groups.map(g => <tr key={g.id}><th scope="row">{g.label}</th>{active.map(c => <td key={c}>{c === "dieta" && g.summary[c].months > 1 ? `${g.summary[c].members} referencias` : dashboardMoney(g.summary[c].amount)}<small>{g.summary[c].members}/{g.members} autoridades con importe{g.summary[c].amount === null ? " · sin registros con importe" : ""}</small></td>)}</tr>)}</tbody></table></div>
    <details className={styles.chartDetails}><summary>Ver comparación por mes</summary><div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Comparación mensual"><table><caption>{DASHBOARD_COMPONENTS[component]} por mes; cada celda informa cobertura.</caption><thead><tr><th>Mes</th>{groups.map(g => <th key={g.id}>{g.label}</th>)}</tr></thead><tbody>{months.map((m, i) => <tr key={m.period}><th scope="row">{m.period}</th>{series.map(s => { const value = s.timeline[i].values[component]; return <td key={s.id}>{dashboardMoney(value.amount)}<small>{value.members}/{s.members}{value.amount === null ? " · sin registros" : ""}</small></td>; })}</tr>)}</tbody></table></div></details>
  </section>;
}
