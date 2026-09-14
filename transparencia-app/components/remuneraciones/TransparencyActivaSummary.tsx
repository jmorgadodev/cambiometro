"use client";

import { useEffect, useState } from "react";

type MonthlySummary = {
  period: string;
  rows: number;
  people: number | null;
  organisms: number;
  withAmount: number;
  withoutAmount: number;
  grossTotal: number;
  averageGross: number | null;
  newRecords: number | null;
  removedRecords: number | null;
  amountChanges: number | null;
  amountDelta: number | null;
  organismChanges: number | null;
  roleChanges: number | null;
  comparisonStatus?: "baseline" | "comparable" | "review";
  comparisonNote?: string | null;
};

type TransparencySummary = {
  comparisonsAvailable?: boolean;
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

function formatPeriod(period: string) {
  const [year, month] = period.split("-");
  return `${month}/${year}`;
}

function formatCount(value: number | null) {
  return value === null ? "—" : number.format(value);
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
  const latest = summary.periods.at(-1) ?? null;

  return (
    <section id="estado-transparencia" className="remuneration-module remuneration-transparency-summary" aria-labelledby="estado-transparencia-title">
      <div className="remuneration-module__heading">
        <span className="eyebrow">TRANSPARENCIA ACTIVA</span>
        <h3 id="estado-transparencia-title">Estado del último corte</h3>
        <p>
          La fuente conserva los registros publicados y sus montos originales. Los cambios sólo se muestran cuando existen dos cortes comparables.
        </p>
      </div>

      <div className="remuneration-transparency-kpis">
        <article><strong>{number.format(summary.recordCount)}</strong><span>registros publicados</span></article>
        <article><strong>{number.format(summary.coverage.available)} / {number.format(summary.coverage.total)}</strong><span>comunas con nómina publicada</span></article>
        <article><strong>{number.format(summary.quality.amountStates.notPublished)}</strong><span>sin monto publicado</span></article>
        <article><strong>{summary.latestPeriod ? formatPeriod(summary.latestPeriod) : "—"}</strong><span>último corte incorporado</span></article>
      </div>

      {latest && (
        <div className="remuneration-transparency-latest" role="status">
          <strong>En el corte {formatPeriod(latest.period)}:</strong>
          {summary.comparisonsAvailable !== false && latest.comparisonStatus !== "review" ? <>
            <span>{formatCount(latest.newRecords)} nuevos registros</span>
            <span>{formatCount(latest.removedRecords)} que ya no aparecen</span>
            <span>{formatCount(latest.amountChanges)} cambios de monto</span>
          </> : <span>este corte requiere revisión antes de comparar nuevos registros, ausencias o cambios de monto</span>}
        </div>
      )}

      <details className="remuneration-transparency-coverage">
        <summary>Ver las comunas sin nómina publicada y el motivo</summary>
        <p>“Sin nómina publicada” significa que la fuente no trae registros para ninguna de las cuatro categorías consultadas en ese corte. No se transforma en cero.</p>
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

      <p className="remuneration-reading-note"><strong>Cómo leerlo:</strong> los montos comparados son brutos y sólo se cuentan cuando la fuente los publicó. La fuente conserva {number.format(summary.quality.amountStates.zero)} valores en cero y {number.format(summary.quality.recordsWithIssues)} registros con observaciones de calidad.</p>
    </section>
  );
}
