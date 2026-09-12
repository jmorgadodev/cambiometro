"use client";

import { useEffect, useState } from "react";

type MonthlySummary = {
  period: string;
  rows: number;
  people: number;
  organisms: number;
  withAmount: number;
  withoutAmount: number;
  grossTotal: number;
  averageGross: number | null;
  newRecords: number;
  removedRecords: number;
  amountChanges: number;
  amountDelta: number;
  organismChanges: number;
  roleChanges: number;
};

type TransparencySummary = {
  recordCount: number;
  generatedAt: string;
  latestPeriod: string | null;
  periods: MonthlySummary[];
  coverage: {
    total: number;
    available: number;
    unavailable: number;
    notApplicable: number;
    unavailableItems: Array<{ communeId: string; name: string; cut: string | null; status: string; reason: string }>;
  };
  quality: {
    recordsWithIssues: number;
    invalidPeriodCount: number;
    amountStates: { positive: number; zero: number; notPublished: number };
  };
  multiOrganismPeople: number;
  notes: string[];
};

const number = new Intl.NumberFormat("es-CL");
const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

function formatPeriod(period: string) {
  const [year, month] = period.split("-");
  return `${month}/${year}`;
}

function formatMoney(value: number | null) {
  return value === null ? "—" : money.format(value);
}

function humanizeMunicipality(id: string) {
  return id.replace(/^muni-/, "").split(/[-_]/g).map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join(" ");
}

export default function TransparencyActivaSummary() {
  const [summary, setSummary] = useState<TransparencySummary | null>(null);

  useEffect(() => {
    fetch("/data/funcionarios/transparency-summary.json", { cache: "force-cache" })
      .then((response) => response.ok ? response.json() as Promise<TransparencySummary> : null)
      .then((payload) => setSummary(payload))
      .catch(() => setSummary(null));
  }, []);

  if (!summary) return null;
  const recentPeriods = summary.periods.slice(-12).reverse();
  const latest = summary.periods.at(-1) ?? null;

  return (
    <section id="historial-transparencia" className="remuneration-module remuneration-transparency-summary" aria-labelledby="historial-transparencia-title">
      <div className="remuneration-module__heading">
        <span className="eyebrow">TRANSPARENCIA ACTIVA</span>
        <h3 id="historial-transparencia-title">Qué cambió entre un mes y otro</h3>
        <p>
          Resumen del release publicado por el CPLT. Las altas y bajas indican que un registro apareció o dejó de aparecer entre dos cortes; no prueban por sí solas una contratación o un despido.
        </p>
      </div>

      <div className="remuneration-transparency-kpis">
        <article><strong>{number.format(summary.recordCount)}</strong><span>registros en el release</span></article>
        <article><strong>{number.format(summary.coverage.available)} / {number.format(summary.coverage.total)}</strong><span>comunas con nómina publicada</span></article>
        <article><strong>{number.format(summary.quality.amountStates.notPublished)}</strong><span>sin monto publicado</span></article>
        <article><strong>{summary.latestPeriod ? formatPeriod(summary.latestPeriod) : "—"}</strong><span>último corte incorporado</span></article>
      </div>

      {latest && (
        <div className="remuneration-transparency-latest" role="status">
          <strong>En el corte {formatPeriod(latest.period)}:</strong>
          <span>{number.format(latest.newRecords)} nuevos registros</span>
          <span>{number.format(latest.removedRecords)} que ya no aparecen</span>
          <span>{number.format(latest.amountChanges)} cambios de monto</span>
        </div>
      )}

      <div className="remuneration-transparency-table-wrap">
        <table className="data-table remuneration-transparency-table">
          <caption>Comparación de los últimos cortes mensuales publicados</caption>
          <thead><tr><th>Corte</th><th>Registros</th><th>Personas</th><th>Nuevos</th><th>Ya no aparecen</th><th>Cambios de monto</th><th>Monto bruto total</th></tr></thead>
          <tbody>{recentPeriods.map((period) => (
            <tr key={period.period}>
              <td><strong>{formatPeriod(period.period)}</strong></td>
              <td>{number.format(period.rows)}</td>
              <td>{number.format(period.people)}</td>
              <td>{number.format(period.newRecords)}</td>
              <td>{number.format(period.removedRecords)}</td>
              <td>{number.format(period.amountChanges)}</td>
              <td>{formatMoney(period.grossTotal)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <details className="remuneration-transparency-coverage">
        <summary>Ver las comunas sin nómina publicada y el motivo</summary>
        <p>“Sin nómina publicada” significa que el release no trae registros para ninguna de las cuatro categorías consultadas en ese corte. No se transforma en cero.</p>
        <div className="remuneration-transparency-coverage-list">
          {summary.coverage.unavailableItems.map((item) => (
            <div key={item.communeId}>
              <strong>{item.name === item.communeId ? humanizeMunicipality(item.name) : item.name}</strong>
              <span>{item.status === "not_applicable" ? "Territorio no aplicable" : "Sin nómina publicada en el corte"} · CUT {item.cut ?? "no informado"}</span>
              <small>{item.reason}</small>
            </div>
          ))}
        </div>
      </details>

      <p className="remuneration-reading-note"><strong>Cómo leerlo:</strong> los montos comparados son brutos y sólo se cuentan cuando la fuente los publicó. El release conserva {number.format(summary.quality.amountStates.zero)} valores en cero y {number.format(summary.quality.recordsWithIssues)} registros con observaciones de calidad. {summary.notes?.[1] ?? "Los cambios se calculan sólo con datos publicados y comparables."}</p>
    </section>
  );
}
