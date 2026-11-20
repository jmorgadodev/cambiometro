"use client";
import { useEffect, useRef, useState } from "react";
import { formatCLPCompact } from "@/lib/format";
import { formatPublishedMonth } from "@/lib/month-periods";
import { useChartTooltip } from "./ChartTooltip";
import styles from "./FinancialBars.module.css";
export interface FinancialBarSeries { id: string; label: string; color: string }
export interface FinancialBarMonth { period: string; values: Readonly<Record<string, number | null>> }
export default function FinancialBars({ rows, series, label, zeroForMissing = false, compact = false }: { rows: readonly FinancialBarMonth[]; series: readonly FinancialBarSeries[]; label: string; zeroForMissing?: boolean; compact?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(0);
  useEffect(() => {
    const container = containerRef.current;
    if (!compact || !container) return;
    const measure = () => setAvailableWidth(container.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [compact]);
  const version = JSON.stringify([rows, series]);
  const tooltip = useChartTooltip(zeroForMissing, version);
  const amounts = rows.flatMap(row => series.map(s => row.values[s.id]).filter((value): value is number => typeof value === "number"));
  const min = Math.min(0, ...amounts), max = Math.max(2, ...amounts), span = max - min;
  const width = compact ? Math.max(560, availableWidth, 80 + rows.length * 42) : Math.max(640, 110 + rows.length * Math.max(84, series.length * 18 + 16));
  const axis = compact ? 70 : 85, bottom = compact ? 190 : 235, height = compact ? 170 : 200;
  const x = (index: number) => (axis + 5) + (index + .5) * (width - axis - 25) / Math.max(1, rows.length);
  const y = (value: number) => bottom - (value - min) / span * height, baseline = y(0);
  const barWidth = compact ? 12 : 16, gap = compact ? 3 : 4, groupWidth = series.length * (barWidth + gap) - gap;
  return <>
    <div ref={containerRef} className={`${styles.scroll} ${compact ? styles.compactScroll : ""}`} role="region" aria-label={label} tabIndex={0} onScroll={tooltip.clear}>
      <svg className={`${styles.chart} ${compact ? styles.compactChart : ""}`} style={{ minWidth: width }} viewBox={`0 0 ${width} ${compact ? 240 : 285}`} role="group" aria-label={label}>
        {[0, .5, 1].map(t => { const value = min + span * t; return <g key={t}><line pointerEvents="none" x1={axis} x2={width - 20} y1={y(value)} y2={y(value)} stroke="var(--border)" /><text x={axis - 6} y={y(value) + 4} textAnchor="end">{formatCLPCompact(value)}</text></g>; })}
        {min < 0 && <line pointerEvents="none" x1={axis} x2={width - 20} y1={baseline} y2={baseline} stroke="var(--text-2)" />}
        <g key={version} className={styles.animateSeries}>{rows.map((row, index) => {
          const detail = { title: formatPublishedMonth(row.period), rows: series.map(s => ({ label: s.label, amount: row.values[s.id] ?? null })) };
          return <g key={row.period}>{series.map((s, i) => {
            const amount = row.values[s.id] ?? null, left = x(index) - groupWidth / 2 + i * (barWidth + gap);
            const key = `${row.period}-${s.id}`;
            if (amount === null && !zeroForMissing) return <text key={s.id} x={left + barWidth / 2} y={baseline - 5} textAnchor="middle" {...tooltip.bind(key, detail)}>—</text>;
            const attributes = { "data-period": row.period, "data-component": s.id, "data-amount": amount ?? undefined, "data-unavailable": amount === null || undefined };
            if (amount === null || amount === 0) return <circle key={s.id} {...attributes} {...tooltip.bind(key, detail)} className={styles.mark} cx={left + barWidth / 2} cy={baseline} r="4" fill={amount === null ? "var(--surface)" : s.color} stroke={s.color} />;
            return <rect key={s.id} {...attributes} {...tooltip.bind(key, detail)} className={styles.mark} x={left} y={Math.min(y(amount), baseline)} width={barWidth} height={Math.max(1, Math.abs(y(amount) - baseline))} rx="2" fill={s.color} />;
          })}<text x={x(index)} y={compact ? 225 : 267} textAnchor="middle">{new Date(Number(row.period.slice(0, 4)), Number(row.period.slice(5)) - 1, 1).toLocaleDateString("es-CL", { month: "short", ...(compact ? {} : { year: "numeric" as const }) })}</text></g>;
        })}</g>
      </svg>
    </div>{tooltip.overlay}
  </>;
}
