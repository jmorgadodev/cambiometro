"use client";

import { useId } from "react";
import { availablePeriodYears, formatPublishedMonth, periodsForYear, publishedMonthPeriods } from "@/lib/month-periods";

interface PeriodYearMonthFilterProps {
  periods: readonly string[];
  selectedPeriod: string;
  onChange: (period: string) => void;
  label: string;
}

export default function PeriodYearMonthFilter({ periods, selectedPeriod, onChange, label }: PeriodYearMonthFilterProps) {
  const id = useId();
  const availablePeriods = publishedMonthPeriods(periods);
  const years = availablePeriodYears(availablePeriods);
  if (availablePeriods.length === 0) return null;

  const activePeriod = availablePeriods.includes(selectedPeriod) ? selectedPeriod : availablePeriods[0];
  const activeYear = activePeriod.slice(0, 4);
  const months = periodsForYear(availablePeriods, activeYear);

  return (
    <div
      role="group"
      aria-label={label}
      style={{ display: "flex", flexWrap: "wrap", alignItems: "end", gap: "0.65rem" }}
    >
      <div style={{ display: "grid", gap: "0.25rem" }}>
        <label htmlFor={`${id}-year`} style={{ fontSize: "0.68rem", color: "var(--text-3)", fontWeight: 700 }}>
          Año
        </label>
        <select
          id={`${id}-year`}
          aria-label={`${label}: año`}
          value={activeYear}
          onChange={(event) => {
            const periodsInYear = periodsForYear(availablePeriods, event.target.value);
            if (periodsInYear[0]) onChange(periodsInYear[0]);
          }}
          style={selectStyle}
        >
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
      </div>
      <div style={{ display: "grid", gap: "0.25rem" }}>
        <label htmlFor={`${id}-month`} style={{ fontSize: "0.68rem", color: "var(--text-3)", fontWeight: 700 }}>
          Mes publicado
        </label>
        <select
          id={`${id}-month`}
          aria-label={`${label}: mes publicado`}
          value={activePeriod}
          onChange={(event) => onChange(event.target.value)}
          style={selectStyle}
        >
          {months.map((period) => <option key={period} value={period}>{formatPublishedMonth(period)}</option>)}
        </select>
      </div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  minHeight: "2.45rem",
  minWidth: "9rem",
  padding: "0.45rem 2rem 0.45rem 0.7rem",
  borderRadius: "var(--radius-sm, 6px)",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text-1)",
  font: "inherit",
  fontSize: "0.78rem",
};
