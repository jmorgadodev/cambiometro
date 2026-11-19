"use client";
import { useState } from "react";
import FinancialBars from "@/components/charts/FinancialBars";
import { authorityOverviewMonths, authorityOverviewYears, type AuthorityOverviewMonth } from "@/lib/authority-monthly-overview";
import { formatCLP } from "@/lib/format";
import { formatPublishedMonth } from "@/lib/month-periods";
import styles from "./AuthorityMonthlyOverview.module.css";

const series = [{ key: "gastos", label: "Gastos operacionales", color: "var(--accent)", href: "#seccion-gastos" }, { key: "personal", label: "Personal de apoyo", color: "var(--text-1)", href: "#seccion-asesores" }] as const;
export default function AuthorityMonthlyOverview({ months }: { months: readonly AuthorityOverviewMonth[] }) {
  const [year, setYear] = useState(2026);
  const years = authorityOverviewYears(months);
  const rows = authorityOverviewMonths(months, year);
  const display = (amount: number | null) => amount === null ? "Aún no disponible" : formatCLP(amount);
  return <section className={styles.overview} aria-labelledby="authority-monthly-title">
    <p className={styles.eyebrow}>Vista general mensual</p><h3 id="authority-monthly-title">Gastos y apoyo por mes · {year}</h3>
    {years.length > 1 && <label className={styles.yearPicker}>Año<select value={year} onChange={event => setYear(Number(event.target.value))}>{years.map(value => <option key={value} value={value}>{value}</option>)}</select></label>}
    <p id="authority-monthly-description">Compara los importes publicados de cada mes. Las barras son independientes y no se suman como un costo total.</p>
    <div className={styles.legend}>{series.map(s => <a key={s.key} href={s.href}><i style={{ background: s.color }} aria-hidden="true" />{s.label} →</a>)}</div>
    {rows.length ? <FinancialBars rows={rows.map(row => ({ period: row.periodo, values: { gastos: row.gastos, personal: row.personal } }))} series={series.map(s => ({ id: s.key, label: s.label, color: s.color }))} label="Gráfico mensual desplazable" /> : <p>Aún no hay importes de gastos o apoyo incorporados para {year}. {years.length > 1 ? "Puedes consultar otro año disponible." : ""}</p>}
    <p className={styles.hint}>Pasa por las barras, tócalas o enfócalas con el teclado para ver los montos. — Aún no disponible en ese mes. Las barras son independientes.</p>
    <details><summary>Ver importes por mes</summary><div className={styles.tableScroll} role="region" aria-label="Importes mensuales de gastos y apoyo" tabIndex={0}><table><caption>Importes nominales CLP de la misma ficha; cada componente conserva su período.</caption><thead><tr><th scope="col">Mes</th>{series.map(s => <th scope="col" key={s.key}>{s.label}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.periodo}><th scope="row">{formatPublishedMonth(row.periodo)}</th><td>{display(row.gastos)}</td><td>{display(row.personal)}</td></tr>)}</tbody></table></div></details>
  </section>;
}
