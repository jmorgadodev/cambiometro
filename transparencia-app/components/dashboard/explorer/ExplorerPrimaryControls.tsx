"use client";
import { useMemo, useState } from "react";
import type { ExplorerData, ExplorerQuery } from "@/lib/parliamentary-explorer";
import styles from "./Explorer.module.css";
export default function ExplorerPrimaryControls({
  data,
  q,
  onChange,
}: {
  data: ExplorerData;
  q: ExplorerQuery;
  onChange: (patch: Partial<ExplorerQuery>) => void;
}) {
  const [preferredMode, setPreferredMode] = useState<"month" | "range" | null>(
    null,
  );
  const mode = preferredMode ?? (q.from === q.to ? "month" : "range");
  const months = useMemo(() => {
    const institutions = new Map(data.members.map((m) => [m.id, m.chamber]));
    return [
      ...new Set(
        data.facts
          .filter(
            (f) =>
              f.period >= "2026-03" &&
              f.component !== "dieta" &&
              (q.chamber === "ambas" ||
                institutions.get(f.memberId) === q.chamber),
          )
          .map((f) => f.period),
      ),
    ].sort();
  }, [data, q.chamber]);
  const month = months.includes(q.to) ? q.to : (months.at(-1) ?? q.to);
  const label = (p: string) =>
    new Date(
      Number(p.slice(0, 4)),
      Number(p.slice(5)) - 1,
      1,
    ).toLocaleDateString("es-CL", { month: "long", year: "numeric" });
  return (
    <section className={styles.primaryControls} aria-label="Consulta principal">
      <fieldset aria-label="Institución principal">
        <legend>Institución</legend>
        <div className={styles.choices}>
          {[
            ["ambas", "Ambas cámaras"],
            ["camara", "Diputados"],
            ["senado", "Senado"],
          ].map(([id, name]) => (
            <button
              key={id}
              type="button"
              aria-pressed={q.chamber === id}
              onClick={() =>
                onChange({
                  chamber: id,
                  memberIds: [],
                  member: "todos",
                  districts: [],
                })
              }
            >
              {name}
            </button>
          ))}
        </div>
      </fieldset>
      <div className={styles.periodControls}>
        <fieldset aria-label="Modo del período">
          <legend>Período</legend>
          <div className={styles.choices}>
            <button
              type="button"
              aria-pressed={mode === "month"}
              onClick={() => {
                setPreferredMode("month");
                onChange({ from: month, to: month });
              }}
            >
              Un mes
            </button>
            <button
              type="button"
              aria-pressed={mode === "range"}
              onClick={() => setPreferredMode("range")}
            >
              Rango
            </button>
          </div>
        </fieldset>
        {mode === "month" ? (
          <label>
            Mes de consulta
            <select
              aria-label="Mes de consulta"
              value={q.from === q.to ? q.to : month}
              onChange={(e) =>
                onChange({ from: e.target.value, to: e.target.value })
              }
            >
              {!months.includes(q.to) && q.from === q.to && (
                <option value={q.to}>{label(q.to)} · sin publicación</option>
              )}
              {months.map((p) => (
                <option key={p} value={p}>
                  {label(p)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className={styles.dates}>
            <label>
              Desde
              <input
                aria-label="Desde"
                type="month"
                min="2026-03"
                max={q.to}
                value={q.from}
                onChange={(e) => onChange({ from: e.target.value })}
              />
            </label>
            <label>
              Hasta
              <input
                aria-label="Hasta"
                type="month"
                min={q.from}
                value={q.to}
                onChange={(e) => onChange({ to: e.target.value })}
              />
            </label>
          </div>
        )}
      </div>
    </section>
  );
}
