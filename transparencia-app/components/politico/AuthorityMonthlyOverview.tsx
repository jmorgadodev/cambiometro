import { authorityOverviewMonths, type AuthorityOverviewMonth } from "@/lib/authority-monthly-overview";
import { formatCLP, formatCLPCompact } from "@/lib/format";
import { formatPublishedMonth } from "@/lib/month-periods";
import styles from "./AuthorityMonthlyOverview.module.css";

const series = [{ key: "gastos", label: "Gastos operacionales", color: "var(--accent)", href: "#seccion-gastos" }, { key: "personal", label: "Personal de apoyo", color: "var(--text-1)", href: "#seccion-asesores" }] as const;
export default function AuthorityMonthlyOverview({ months }: { months: readonly AuthorityOverviewMonth[] }) {
  const rows = authorityOverviewMonths(months);
  if (!rows.length) return <section className={styles.overview} aria-labelledby="authority-monthly-title"><h3 id="authority-monthly-title">Gastos y apoyo por mes</h3><p>Todavía no hay importes mensuales incorporados para estas dos series.</p></section>;
  const amounts = rows.flatMap(row => [row.gastos, row.personal]).filter((value): value is number => value !== null);
  const min = Math.min(0, ...amounts), max = Math.max(1, ...amounts), span = max - min;
  const width = Math.max(640, 100 + rows.length * 68), plotWidth = width - 110;
  const x = (index: number) => 90 + (index + .5) * plotWidth / rows.length;
  const y = (amount: number) => 235 - (amount - min) / span * 200;
  const baseline = y(0);
  const display = (amount: number | null) => amount === null ? "Sin registro" : formatCLP(amount);
  return <section className={styles.overview} aria-labelledby="authority-monthly-title">
    <p className={styles.eyebrow}>Vista general mensual</p><h3 id="authority-monthly-title">Gastos y apoyo por mes</h3>
    <p id="authority-monthly-description">Compara los importes publicados de cada mes. Las barras son independientes y no se suman como un costo total.</p>
    <div className={styles.legend}>{series.map(s => <a key={s.key} href={s.href}><i style={{ background: s.color }} aria-hidden="true" />{s.label} →</a>)}</div>
    <div className={styles.chartScroll} role="region" aria-label="Gráfico mensual desplazable" tabIndex={0}>
      <svg className={styles.chart} style={{ minWidth: width }} viewBox={`0 0 ${width} 285`} role="img" aria-labelledby="authority-monthly-title authority-monthly-description">
        {[0, .5, 1].map(t => { const value = min + span * t; return <g key={t}><line x1="85" x2={width - 20} y1={y(value)} y2={y(value)} stroke="var(--border)" /><text x="77" y={y(value) + 4} textAnchor="end">{formatCLPCompact(value)}</text></g>; })}
        {min < 0 && <line x1="85" x2={width - 20} y1={baseline} y2={baseline} stroke="var(--text-2)" />}
        {rows.map((row, index) => <g key={row.periodo}>{series.map((s, i) => {
          const amount = row[s.key], left = x(index) + (i === 0 ? -19 : 2);
          const label = `${formatPublishedMonth(row.periodo)} · ${s.label}: ${display(amount)}`;
          if (amount === null) return <text key={s.key} x={left + 8} y={baseline - 5} textAnchor="middle"><title>{label}</title>—</text>;
          if (amount === 0) return <circle key={s.key} data-period={row.periodo} data-component={s.key} data-amount={amount} cx={left + 8} cy={baseline} r="3" fill="var(--surface)" stroke={s.color}><title>{label}</title></circle>;
          return <rect key={s.key} data-period={row.periodo} data-component={s.key} data-amount={amount} x={left} y={Math.min(y(amount), baseline)} width="16" height={Math.max(1, Math.abs(y(amount) - baseline))} rx="2" fill={s.color}><title>{label}</title></rect>;
        })}<text x={x(index)} y="267" textAnchor="middle">{new Date(Number(row.periodo.slice(0,4)),Number(row.periodo.slice(5))-1,1).toLocaleDateString("es-CL",{month:"short",year:"2-digit"})}</text></g>)}
      </svg>
    </div>
    <p className={styles.hint}>— Sin registro en ese mes. Un cero publicado se marca sobre la línea base. En móvil puedes deslizar el gráfico.</p>
    <details><summary>Ver importes por mes</summary><div className={styles.tableScroll} role="region" aria-label="Importes mensuales de gastos y apoyo" tabIndex={0}><table><caption>Importes nominales CLP de la misma ficha; cada componente conserva su período.</caption><thead><tr><th scope="col">Mes</th>{series.map(s => <th scope="col" key={s.key}>{s.label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.periodo}><th scope="row">{formatPublishedMonth(row.periodo)}</th><td>{display(row.gastos)}</td><td>{display(row.personal)}</td></tr>)}</tbody></table></div></details>
  </section>;
}
