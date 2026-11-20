"use client";
import { useChartTooltip } from "@/components/charts/ChartTooltip";
import motion from "@/components/charts/FinancialBars.module.css";
import { useMemo } from "react";
import { DASHBOARD_COMPONENTS, dashboardTimeline, activeDashboardComponents, type DashboardData, type DashboardFilters } from "@/lib/parliamentary-dashboard";
import styles from "./ParliamentaryDashboard.module.css";
export const dashboardMoney = (amount: number | null) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(amount ?? 0);
const compact = (amount: number) => new Intl.NumberFormat("es-CL", { notation: "compact", maximumFractionDigits: 1 }).format(amount ?? 0);
const month = (value: string) => new Date(Number(value.slice(0, 4)), Number(value.slice(5)) - 1, 1).toLocaleDateString("es-CL", { month: "short", year: "numeric" });
const tones = { gastos: "var(--accent)", personal: "var(--text-1)", asesorias: "var(--warn)", dieta: "var(--text-2)" };

export default function DashboardTimeline({ rows, filters, totalMembers }: { rows: DashboardData["rows"]; filters: DashboardFilters; totalMembers: number }) {
  const timeline = useMemo(() => dashboardTimeline(rows, filters.from, filters.to), [rows, filters.from, filters.to]);
  const active = activeDashboardComponents(filters);
  const tooltip = useChartTooltip(true, JSON.stringify([timeline, active]));
  const values = timeline.flatMap(m => active.map(c => m.values[c].amount).filter((n): n is number => n !== null));

  const max = Math.max(1, ...values), min = Math.min(0, ...values), span = max - min;
  const x = (i: number) => 82 + i * (830 / Math.max(1, timeline.length - 1));
  const y = (v: number) => 220 - (v - min) / span * 190;
  return <>
    <div className={styles.legend}>{active.map(c => <span key={c}><i style={{ background: tones[c] }} />{DASHBOARD_COMPONENTS[c]}</span>)}</div>
    <div className={styles.chartScroll} tabIndex={0} role="region" aria-label="Gráfico mensual desplazable" onScroll={tooltip.clear}><svg className={styles.chart} viewBox="0 0 970 280" role="group" aria-label="Evolución mensual de importes y dieta estimada. El detalle accesible está en la tabla inferior.">
      {[0, .5, 1].map(t => <g key={t}><line pointerEvents="none" x1="78" x2="930" y1={y(min + span * t)} y2={y(min + span * t)} stroke="var(--border)" /><text x="68" y={y(min + span * t) + 5} textAnchor="end">${compact(min + span * t)}</text></g>)}
      {active.map(c => <g key={c + JSON.stringify(filters)} className={motion.animateSeries} style={{ color: tones[c] }}>
        {timeline.map((m, i) => {
          const published = m.values[c].amount, value = published ?? 0, previous = timeline[i - 1]?.values[c].amount;
          return <g key={m.period}>{i > 0 && published !== null && previous != null && <line pointerEvents="none" x1={x(i - 1)} x2={x(i)} y1={y(previous)} y2={y(value)} stroke="currentColor" strokeWidth="2.5" strokeDasharray={c === "personal" ? "7 4" : c === "asesorias" ? "2 4" : undefined} />}{value !== null && <circle {...tooltip.bind(`${c}-${m.period}`, { title: month(m.period), rows: active.map(component => ({ label: DASHBOARD_COMPONENTS[component], amount: m.values[component].amount, detail: `${m.values[component].members}/${totalMembers} autoridades con importe` })) })} className={motion.mark} data-period={m.period} data-component={c} cx={x(i)} cy={y(value)} r="4.5" fill={published === null ? "var(--surface)" : "currentColor"} stroke="currentColor"><title>{`${month(m.period)} · ${DASHBOARD_COMPONENTS[c]}: ${dashboardMoney(value)} · ${m.values[c].members} autoridades con importe${published === null ? " · 0 sin registros con importe" : ""}`}</title></circle>}</g>;
        })}
      </g>)}
      {timeline.map((m, i) => <text key={m.period} x={x(i)} y="258" textAnchor="middle">{timeline.length <= 12 || i % Math.ceil(timeline.length / 12) === 0 ? month(m.period) : ""}</text>)}
    </svg></div>{tooltip.overlay}
    <p className={styles.mobileHint}>Desliza el gráfico para recorrer los meses, o abre la tabla mensual.</p>
    <details className={styles.chartDetails}><summary>Ver importes y cobertura por mes</summary><div className={styles.tableScroll} role="region" tabIndex={0} aria-label="Tabla desplazable de importes"><table><caption>Importes CLP; cobertura = autoridades con importe / autoridades seleccionadas.</caption><thead><tr><th>Mes</th>{active.map(c => <th key={c}>{DASHBOARD_COMPONENTS[c]}</th>)}</tr></thead><tbody>{timeline.map(m => <tr key={m.period}><th>{month(m.period)}</th>{active.map(c => <td key={c}>{dashboardMoney(m.values[c].amount)}{m.values[c].amount === null && <small>Sin registros con importe</small>}<small>{m.values[c].members}/{totalMembers} autoridades con importe{m.values[c].missing > 0 ? ` · ${m.values[c].missing} sin monto` : ""}</small></td>)}</tr>)}</tbody></table></div></details>
  </>;
}
