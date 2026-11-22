"use client";
import { useEffect, useRef, useState } from "react";
import {
  DASHBOARD_COMPONENTS,
  type DashboardComponent,
} from "@/lib/parliamentary-dashboard";
import {
  explorerMoney,
  groupExplorer,
  type ExplorerData,
  type ExplorerFact,
  type ExplorerQuery,
} from "@/lib/parliamentary-explorer";
import { useChartTooltip } from "@/components/charts/ChartTooltip";
import { exportExplorerSvg } from "./ExplorerPrimitives";
import styles from "./Explorer.module.css";
export interface ChartEntry {
  id: string;
  label: string;
  value: number | null;
}
export function ExplorerBars({
  title,
  entries,
  context,
  onSelect,
  counts = false,
  empty = "No hay datos comparables con esta selección.",
}: {
  title: string;
  entries: ChartEntry[];
  context: string;
  onSelect: (id: string) => void;
  counts?: boolean;
  empty?: string;
}) {
  const ref = useRef<SVGSVGElement>(null),
    outer = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(680),
    tooltip = useChartTooltip(false, JSON.stringify(entries));
  useEffect(() => {
    const node = outer.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const next = Math.max(
        560,
        Math.min(1200, Math.round(entries[0].contentRect.width)),
      );
      setWidth((value) => (value === next ? value : next));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const labelWidth = width < 700 ? 220 : 260;
  const shown = entries.slice(0, 12),
    height = Math.max(150, shown.length * 43 + 30),
    max = Math.max(1, ...shown.map((e) => Math.abs(e.value ?? 0)));
  const format = (n: number | null) =>
    n === null
      ? "Sin información"
      : counts
        ? n.toLocaleString("es-CL")
        : explorerMoney(n);
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <h2>{title}</h2>
        <button
          type="button"
          disabled={!entries.length}
          onClick={() => {
            if (ref.current) exportExplorerSvg(ref.current, title, context);
          }}
        >
          Exportar SVG
        </button>
      </div>
      {shown.length ? (
        <>
          <div
            ref={outer}
            className={`${styles.chartScroll} ${styles.desktopBars}`}
          >
            <svg
              ref={ref}
              viewBox={`0 0 ${width} ${height}`}
              className={styles.barChart}
              role="group"
              aria-label={title}
            >
              {shown.map((e, i) => (
                <g
                  key={e.id}
                  {...(!counts
                    ? tooltip.bind(e.id, {
                        title: e.label,
                        rows: [{ label: "Monto informado", amount: e.value }],
                      })
                    : {})}
                  role="button"
                  tabIndex={0}
                  aria-label={`${e.label}: ${format(e.value)}. Abrir detalle`}
                  onClick={() => {
                    tooltip.clear();
                    onSelect(e.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      tooltip.clear();
                      onSelect(e.id);
                    }
                  }}
                >
                  <title>{`${e.label}: ${format(e.value)}`}</title>
                  <rect
                    x="0"
                    y={i * 43 + 2}
                    width={width}
                    height="41"
                    fill="transparent"
                  />
                  <text
                    x="4"
                    y={i * 43 + 24}
                    fill="var(--text-1)"
                    fontSize="14"
                  >
                    {e.label.length > 29 ? e.label.slice(0, 28) + "…" : e.label}
                  </text>
                  <rect
                    x={labelWidth}
                    y={i * 43 + 10}
                    width={
                      e.value === null
                        ? 0
                        : Math.max(
                            e.value === 0 ? 0 : 2,
                            (Math.abs(e.value) / max) *
                              (width - labelWidth - 155),
                          )
                    }
                    height="20"
                    rx="3"
                    fill="var(--accent)"
                  />
                  <text
                    x={width - 8}
                    y={i * 43 + 24}
                    textAnchor="end"
                    fill="var(--text-1)"
                    fontSize="14"
                  >
                    {format(e.value)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
          <div className={styles.mobileBars}>
            {shown.map((e) => (
              <button type="button" key={e.id} onClick={() => onSelect(e.id)}>
                <span>
                  <span>{e.label}</span>
                  <strong>{format(e.value)}</strong>
                </span>
                <span className={styles.mobileRail}>
                  <i
                    style={{
                      width: `${e.value === null ? 0 : (Math.abs(e.value) / max) * 100}%`,
                    }}
                  />
                </span>
              </button>
            ))}
          </div>
          {entries.length > 12 && (
            <p className={styles.hint}>
              Se muestran 12 de {entries.length} grupos; la tabla y el CSV
              conservan todos.
            </p>
          )}
          {tooltip.overlay}
        </>
      ) : (
        <p className={styles.empty}>{empty}</p>
      )}
    </section>
  );
}
const colors: Record<DashboardComponent, string> = {
  gastos: "var(--accent)",
  personal: "var(--text-1)",
  asesorias: "var(--warn)",
  dieta: "var(--text-2)",
};
export function ExplorerTimeline({
  data,
  q,
  facts,
  onSelect,
  onComponentChange,
}: {
  data: ExplorerData;
  q: ExplorerQuery;
  facts: ExplorerFact[];
  onSelect: (period: string, component: DashboardComponent) => void;
  onComponentChange?: (component: DashboardComponent) => void;
}) {
  const ref = useRef<SVGSVGElement>(null),
    outer = useRef<HTMLDivElement>(null),
    [width, setWidth] = useState(880),
    [picked, setPicked] = useState<DashboardComponent | null>(null),
    tooltip = useChartTooltip(false, JSON.stringify(q));
  useEffect(() => {
    if (!outer.current) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(
        Math.max(320, Math.min(1200, Math.round(entries[0].contentRect.width))),
      ),
    );
    observer.observe(outer.current);
    return () => observer.disconnect();
  }, []);
  const allowed = (
    Object.keys(DASHBOARD_COMPONENTS) as DashboardComponent[]
  ).filter((c) => !q.componentIds?.length || q.componentIds.includes(c));
  const component =
    !onComponentChange && picked && allowed.includes(picked)
      ? picked
      : allowed.includes(q.metricComponent)
        ? q.metricComponent
        : allowed[0];
  const series = [
    {
      component,
      groups: groupExplorer(
        data,
        { ...q, measure: "amount", metricComponent: component, order: "asc" },
        "period",
        facts,
      ),
    },
  ];
  const periods: string[] = [];
  let index = Number(q.from.slice(0, 4)) * 12 + Number(q.from.slice(5)) - 1;
  const end = Number(q.to.slice(0, 4)) * 12 + Number(q.to.slice(5)) - 1;
  while (index <= end && periods.length < 120) {
    periods.push(
      `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`,
    );
    index++;
  }
  const maximum = Math.max(
      1,
      ...series.flatMap((s) => s.groups.map((g) => g.value ?? 0)),
    ),
    x = (i: number) =>
      periods.length === 1
        ? width / 2
        : 85 + (i * (width - 115)) / Math.max(1, periods.length - 1),
    y = (v: number) => 215 - (v / maximum) * 170;
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeading}>
        <h2>Evolución mensual</h2>
        <button
          type="button"
          disabled={!facts.length}
          onClick={() => {
            if (ref.current)
              exportExplorerSvg(
                ref.current,
                "Evolución mensual",
                `${q.from} a ${q.to}`,
              );
          }}
        >
          Exportar SVG
        </button>
      </div>
      <div
        className={styles.choices}
        role="group"
        aria-label="Serie de evolución"
      >
        {(Object.keys(DASHBOARD_COMPONENTS) as DashboardComponent[]).map(
          (c) => (
            <button
              key={c}
              type="button"
              disabled={!allowed.includes(c)}
              aria-pressed={component === c}
              onClick={() => {
                if (onComponentChange) onComponentChange(c);
                else setPicked(c);
              }}
            >
              {c === "dieta" ? "Dieta de referencia" : DASHBOARD_COMPONENTS[c]}
            </button>
          ),
        )}
      </div>
      <div className={styles.legend}>
        <span>
          <i style={{ background: colors[component] }} />
          {component === "dieta"
            ? "Dieta · referencia fija estimada"
            : DASHBOARD_COMPONENTS[component]}{" "}
          · CLP
        </span>
      </div>
      <div ref={outer} className={styles.chartScroll}>
        <svg
          ref={ref}
          className={styles.lineChart}
          viewBox={`0 0 ${width} 270`}
          role="group"
          aria-label="Evolución mensual; selecciona un punto para abrir el detalle"
        >
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line
                x1="85"
                x2={width - 25}
                y1={y(maximum * t)}
                y2={y(maximum * t)}
                stroke="var(--border)"
              />
              <text
                x="75"
                y={y(maximum * t) + 4}
                textAnchor="end"
                fontSize="12"
                fill="var(--text-2)"
              >
                {((maximum * t) / 1e6).toLocaleString("es-CL", {
                  maximumFractionDigits: 1,
                })}{" "}
                M
              </text>
            </g>
          ))}
          {periods.map((p, i) => (
            <text
              key={p}
              x={x(i)}
              y="249"
              textAnchor="middle"
              fontSize="12"
              fill="var(--text-2)"
            >
              {new Date(
                Number(p.slice(0, 4)),
                Number(p.slice(5)) - 1,
                1,
              ).toLocaleDateString("es-CL", { month: "short" })}
            </text>
          ))}
          {series.map((s) => (
            <g
              key={s.component}
              className={styles.animateSeries}
              style={{ color: colors[s.component] }}
            >
              {periods.map((p, i) => {
                const value = s.groups.find((g) => g.id === p)?.value ?? null,
                  previous =
                    s.groups.find((g) => g.id === periods[i - 1])?.value ??
                    null;
                return value === null ? null : (
                  <g key={p}>
                    {i > 0 && previous !== null && (
                      <path
                        d={`M ${x(i - 1)} ${y(previous)} C ${(x(i - 1) + x(i)) / 2} ${y(previous)}, ${(x(i - 1) + x(i)) / 2} ${y(value)}, ${x(i)} ${y(value)}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={
                          s.component === "dieta" ? "6 4" : undefined
                        }
                      />
                    )}
                    <circle
                      {...tooltip.bind(`${s.component}-${p}`, {
                        title: p,
                        rows: [
                          {
                            label: DASHBOARD_COMPONENTS[s.component],
                            amount: value,
                            detail:
                              s.component === "dieta"
                                ? "Referencia fija estimada"
                                : "Monto informado",
                          },
                        ],
                      })}
                      aria-label={`${p}, ${DASHBOARD_COMPONENTS[s.component]}: ${explorerMoney(value)}. Abrir detalle`}
                      cx={x(i)}
                      cy={y(value)}
                      r="6"
                      fill="currentColor"
                      onClick={() => {
                        tooltip.clear();
                        onSelect(p, s.component);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          tooltip.clear();
                          onSelect(p, s.component);
                        }
                      }}
                    />
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
      {!series[0].groups.some((g) => g.value !== null) && (
        <p className={styles.empty}>Sin datos publicados en el rango.</p>
      )}
      {tooltip.overlay}
    </section>
  );
}
