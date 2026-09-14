"use client";

import { useState } from "react";

type HistoryChange = {
  from: string;
  to: string;
  comparable: boolean;
  entries: number;
  exitsObserved: number | null;
  amountChanges: Array<{ before: number | null; after: number | null; delta: number }>;
  organismChanges: boolean;
};

type HistoryPerson = {
  firstPeriod: string | null;
  lastPeriod: string | null;
  recordCount: number;
  periods: Array<{ period: string; records: Array<{ gross: number | null; grossState: string }> }>;
  comparisons: HistoryChange[];
};

type HistoryResponse = {
  recordCount: number;
  invalidPeriodCount: number;
  people: HistoryPerson[];
};

const number = new Intl.NumberFormat("es-CL");
const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

function formatPeriod(period: string | null) {
  if (!period) return "sin período";
  const [year, month] = period.split("-");
  return `${month}/${year}`;
}

function formatMoney(value: number | null) {
  return value === null ? "Monto no publicado" : money.format(value);
}

export default function R2RemunerationHistoryPanel({ name }: { name: string }) {
  const [history, setHistory] = useState<HistoryPerson | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  async function loadHistory() {
    if (loaded || loading) return;
    setLoading(true);
    setError(false);
    try {
      const response = await fetch(`/api/v1/remuneraciones/history?q=${encodeURIComponent(name)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("history unavailable");
      const payload = await response.json() as HistoryResponse;
      setHistory(payload.people?.[0] ?? null);
    } catch {
      setError(true);
    } finally {
      setLoaded(true);
      setLoading(false);
    }
  }

  return (
    <div className="remuneration-history-panel">
      <div className="remuneration-history-panel__heading">
        <strong>Historial publicado por Transparencia Activa</strong>
        <button type="button" onClick={() => void loadHistory()} disabled={loading}>
          {loading ? "Revisando…" : "Revisar historial"}
        </button>
      </div>
      {!loaded && <p>Consulta los períodos publicados para esta persona.</p>}
      {error && <p role="status">El historial no está disponible en este momento.</p>}
      {loaded && !error && !history && <p role="status">No hay un historial publicado para esta persona en esta fuente.</p>}
      {history && (
        <>
          <p>{number.format(history.recordCount)} registros entre {formatPeriod(history.firstPeriod)} y {formatPeriod(history.lastPeriod)}.</p>
          <div className="remuneration-history-panel__facts">
            <span><strong>{number.format(history.periods.length)}</strong> períodos publicados</span>
            <span><strong>{number.format(history.comparisons.reduce((total, item) => total + item.entries, 0))}</strong> entradas observadas</span>
            <span><strong>{number.format(history.comparisons.reduce((total, item) => total + (item.exitsObserved ?? 0), 0))}</strong> ausencias observadas</span>
            <span><strong>{number.format(history.comparisons.reduce((total, item) => total + item.amountChanges.length, 0))}</strong> cambios de monto</span>
          </div>
          <div className="remuneration-history-panel__latest">
            <strong>Últimos períodos publicados</strong>
            {history.periods.slice(-3).reverse().map((period) => (
              <span key={period.period}>{formatPeriod(period.period)} · {period.records.map((record) => formatMoney(record.gross)).join(" / ")}</span>
            ))}
          </div>
          {history.comparisons.length > 0 && (
            <details>
              <summary>Ver cambios comparables</summary>
              <ul>
                {history.comparisons.slice(-6).reverse().map((change) => (
                  <li key={`${change.from}-${change.to}`}>
                    <strong>{formatPeriod(change.from)} → {formatPeriod(change.to)}</strong>: {number.format(change.entries)} entradas, {change.exitsObserved === null ? "sin comparación de ausencia" : `${number.format(change.exitsObserved)} ausencias observadas`}, {number.format(change.amountChanges.length)} cambios de monto{change.organismChanges ? "; cambio de organismo observado" : ""}.
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
