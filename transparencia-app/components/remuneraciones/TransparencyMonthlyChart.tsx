"use client";

import { useMemo, useState } from "react";

export interface TransparencyMonthlyChartPoint {
  period: string;
  rows: number;
  grossTotal: number;
  newRecords: number | null;
  removedRecords: number | null;
  amountChanges: number | null;
  amountDelta: number | null;
}

type ChartMode = "changes" | "amounts";

const number = new Intl.NumberFormat("es-CL");
const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

function formatPeriod(period: string) {
  const [year, month] = period.split("-");
  return `${month}/${year}`;
}

function formatCompact(value: number) {
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toLocaleString("es-CL", { maximumFractionDigits: 1 })} B`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toLocaleString("es-CL", { maximumFractionDigits: 1 })} mil M`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toLocaleString("es-CL", { maximumFractionDigits: 1 })} M`;
  return money.format(value);
}

function comparable(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : null;
}

function formatComparison(value: number | null) {
  const normalized = comparable(value);
  return normalized === null ? "No calculado" : number.format(normalized);
}

function formatRowChange(current: number, previous: number | null) {
  if (previous === null || previous <= 0) return "No disponible";
  const delta = current - previous;
  const percentage = (delta / previous) * 100;
  const signedDelta = delta > 0 ? `+${number.format(delta)}` : number.format(delta);
  const signedPercentage = percentage > 0 ? `+${percentage.toLocaleString("es-CL", { maximumFractionDigits: 1 })}` : percentage.toLocaleString("es-CL", { maximumFractionDigits: 1 });
  return `${signedDelta} (${signedPercentage}%)`;
}

function pointX(index: number, count: number, left: number, width: number) {
  return count <= 1 ? left + width / 2 : left + (index / (count - 1)) * width;
}

function pointY(value: number, max: number, top: number, height: number) {
  return top + height - (max <= 0 ? 0 : value / max) * height;
}

function linePath(values: number[], max: number, left: number, top: number, width: number, height: number) {
  return values.map((value, index) => {
    const x = pointX(index, values.length, left, width).toFixed(1);
    const y = pointY(value, max, top, height).toFixed(1);
    return `${index === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
}

export default function TransparencyMonthlyChart({ periods }: { periods: TransparencyMonthlyChartPoint[] }) {
  const [mode, setMode] = useState<ChartMode>("changes");
  const [selectedPeriod, setSelectedPeriod] = useState(periods.at(-1)?.period ?? "");
  const data = useMemo(() => [...periods].sort((left, right) => left.period.localeCompare(right.period)), [periods]);
  if (data.length === 0) return null;

  const latest = data[data.length - 1];
  const selected = data.find((item) => item.period === selectedPeriod) ?? latest;
  const latestNew = comparable(selected.newRecords);
  const latestRemoved = comparable(selected.removedRecords);
  const latestChanges = comparable(selected.amountChanges);
  const selectedIndex = data.findIndex((item) => item.period === selected.period);
  const previous = selectedIndex > 0 ? data[selectedIndex - 1] : null;
  const hasMovementComparison = data.some((item) => comparable(item.newRecords) !== null || comparable(item.removedRecords) !== null);
  const hasAmountComparison = data.some((item) => comparable(item.amountChanges) !== null);
  const comparisonAvailable = mode === "changes" ? hasMovementComparison : hasAmountComparison;
  const lineValues = data.map((item) => mode === "changes" ? item.rows : item.grossTotal);
  const barValues = data.flatMap((item) => {
    if (mode === "changes") {
      return [comparable(item.newRecords), comparable(item.removedRecords)].filter((value): value is number => value !== null);
    }
    const value = comparable(item.amountChanges);
    return value === null ? [] : [value];
  });
  const lineMax = Math.max(...lineValues, 1);
  const barMax = Math.max(...barValues, 1);
  const width = 760;
  const height = 326;
  const left = 68;
  const right = 24;
  const top = 34;
  const bottom = 54;
  const barZone = 62;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const lineHeight = plotHeight - barZone;
  const baseY = top + lineHeight + barZone;
  const step = data.length > 8 ? Math.ceil(data.length / 6) : 1;
  const line = linePath(lineValues, lineMax, left, top, plotWidth, lineHeight);
  const yTicks = [0, 0.5, 1].map((ratio) => ({
    ratio,
    y: top + lineHeight - ratio * lineHeight,
    label: mode === "changes" ? number.format(Math.round(lineMax * ratio)) : formatCompact(lineMax * ratio),
  }));

  return (
    <section className="remuneration-monthly-chart" aria-labelledby="transparency-monthly-chart-title">
      <div className="remuneration-monthly-chart__header">
        <div>
          <span className="eyebrow">EVOLUCIÓN MENSUAL</span>
          <h4 id="transparency-monthly-chart-title">{comparisonAvailable ? "Qué cambió en el registro publicado" : "Tamaño de cada corte publicado"}</h4>
          <p>{comparisonAvailable
            ? mode === "changes"
              ? "La línea muestra cuántos registros publicó la fuente. Las barras muestran las entradas y las salidas observadas frente al corte anterior."
              : "La línea muestra el monto bruto total publicado. Las barras indican cuántos registros cambiaron de monto frente al corte anterior."
            : mode === "changes"
              ? "La fuente conserva el tamaño de cada corte, pero todavía no entrega una comparación fila a fila. La variación de filas sólo describe el tamaño del archivo; no equivale a entradas ni salidas de personas."
              : "La fuente conserva los montos brutos por corte, pero todavía no entrega cuántos registros cambiaron de monto. No se estima esa diferencia."}</p>
        </div>
        <div className="segmented-control" aria-label="Elegir métrica de evolución">
          <button type="button" className={mode === "changes" ? "is-active" : ""} aria-pressed={mode === "changes"} onClick={() => setMode("changes")}>Movimiento de personas</button>
          <button type="button" className={mode === "amounts" ? "is-active" : ""} aria-pressed={mode === "amounts"} onClick={() => setMode("amounts")}>Montos publicados</button>
        </div>
      </div>

      <div className="remuneration-monthly-chart__signals" aria-label={`Corte seleccionado ${formatPeriod(selected.period)}`}>
        <span><b>{formatPeriod(selected.period)}</b><small>{selected.period === latest.period ? "último corte" : "corte seleccionado"}</small></span>
        <span><b>{number.format(selected.rows)}</b><small>registros publicados</small></span>
        <span><b>{formatRowChange(selected.rows, previous?.rows ?? null)}</b><small>variación del corte</small></span>
        <span><b>{formatComparison(latestNew)}</b><small>entradas calculadas</small></span>
        <span><b>{formatComparison(latestRemoved)}</b><small>salidas observadas</small></span>
        <span><b>{formatComparison(latestChanges)}</b><small>cambios de monto calculados</small></span>
      </div>

      <div className="remuneration-monthly-chart__legend" aria-hidden="true">
        <span><i className="is-line" />{mode === "changes" ? "Registros publicados" : "Monto bruto total"}</span>
        {comparisonAvailable ? <>
          <span><i className="is-new" />{mode === "changes" ? "Entradas" : "Cambios de monto"}</span>
          {mode === "changes" && <span><i className="is-removed" />Salidas observadas</span>}
        </> : <span className="is-unavailable">Comparación pendiente</span>}
      </div>

      <div className="remuneration-monthly-chart__canvas" role="img" aria-label={`${comparisonAvailable ? (mode === "changes" ? "Gráfico de registros, entradas y salidas" : "Gráfico de monto bruto y cambios de monto") : "Gráfico del tamaño de los cortes publicados"} entre ${formatPeriod(data[0].period)} y ${formatPeriod(latest.period)}`}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" focusable="false">
          {yTicks.map((tick) => (
            <g key={tick.ratio}>
              <line x1={left} x2={width - right} y1={tick.y} y2={tick.y} className="remuneration-monthly-chart__grid" />
              <text x={left - 10} y={tick.y + 4} textAnchor="end" className="remuneration-monthly-chart__axis">{tick.label}</text>
            </g>
          ))}
          <line x1={left} x2={width - right} y1={baseY} y2={baseY} className="remuneration-monthly-chart__baseline" />
          {data.map((item, index) => {
            const x = pointX(index, data.length, left, plotWidth);
            const newValue = comparable(item.newRecords);
            const removedValue = comparable(item.removedRecords);
            const amountValue = comparable(item.amountChanges);
            const barValue = mode === "changes" ? Math.max(newValue ?? 0, removedValue ?? 0) : (amountValue ?? 0);
            const barHeight = barValue === 0 ? 0 : Math.max(2, (barValue / barMax) * (barZone - 10));
            const isLabelled = index % step === 0 || index === data.length - 1;
            return (
              <g key={item.period} className="remuneration-monthly-chart__month" role="button" tabIndex={0} aria-label={`Seleccionar corte ${formatPeriod(item.period)}`} onClick={() => setSelectedPeriod(item.period)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedPeriod(item.period); }}>
                <title>{`${formatPeriod(item.period)} · ${number.format(item.rows)} registros${mode === "changes" ? ` · ${formatComparison(newValue)} entradas · ${formatComparison(removedValue)} salidas` : ` · ${formatComparison(amountValue)} cambios de monto`}`}</title>
                {mode === "changes" && newValue !== null && newValue > 0 && <rect x={x - 8} y={baseY - (newValue / barMax) * (barZone - 10)} width={7} height={Math.max(2, (newValue / barMax) * (barZone - 10))} rx="2" className="remuneration-monthly-chart__bar is-new" />}
                {mode === "changes" && removedValue !== null && removedValue > 0 && <rect x={x + 1} y={baseY - (removedValue / barMax) * (barZone - 10)} width={7} height={Math.max(2, (removedValue / barMax) * (barZone - 10))} rx="2" className="remuneration-monthly-chart__bar is-removed" />}
                {mode === "amounts" && barHeight > 0 && <rect x={x - 5} y={baseY - barHeight} width={10} height={barHeight} rx="2" className="remuneration-monthly-chart__bar is-new" />}
                {isLabelled && <text x={x} y={height - 17} textAnchor="middle" className="remuneration-monthly-chart__label">{formatPeriod(item.period)}</text>}
              </g>
            );
          })}
          <path d={line} className="remuneration-monthly-chart__line" />
          {data.map((item, index) => {
            const x = pointX(index, data.length, left, plotWidth);
            const y = pointY(lineValues[index], lineMax, top, lineHeight);
            return <circle key={`${item.period}-point`} cx={x} cy={y} r={item.period === selectedPeriod ? 6 : 4} className="remuneration-monthly-chart__point"><title>{`${formatPeriod(item.period)}: ${mode === "changes" ? number.format(item.rows) : formatCompact(item.grossTotal)}`}</title></circle>;
          })}
        </svg>
      </div>
      <p className="remuneration-monthly-chart__note">Haz clic en un mes para revisar el corte correspondiente. {comparisonAvailable ? "“Salidas observadas” significa que la fila dejó de aparecer en la comparación; no demuestra por sí sola un despido." : "“No calculado” significa que la fuente aún no permite comparar ese indicador; no equivale a cero."}</p>
    </section>
  );
}
