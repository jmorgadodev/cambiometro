import type { ReactNode } from "react";

export interface OverviewMetric {
  label: string;
  value: string;
  detail?: string;
  tone?: "accent" | "ok" | "warn" | "info";
}

export interface OverviewBar {
  label: string;
  value: number | null;
  max?: number;
  displayValue?: string;
  detail?: string;
  tone?: "accent" | "ok" | "warn" | "info";
}

interface Props {
  eyebrow?: string;
  title: string;
  description: string;
  metrics: OverviewMetric[];
  bars?: OverviewBar[];
  insight?: ReactNode;
}

const toneVars = {
  accent: { color: "var(--accent)", background: "var(--info-bg)" },
  ok: { color: "var(--ok)", background: "var(--ok-bg)" },
  warn: { color: "var(--warn)", background: "var(--warn-bg)" },
  info: { color: "var(--info)", background: "var(--info-bg)" },
} as const;

/**
 * Resumen previo al detalle. Sólo presenta valores ya publicados o cálculos
 * derivados del corte; no consulta D1 ni crea filas sintéticas.
 */
export default function OverviewSignalPanel({
  eyebrow = "Lectura rápida del corte",
  title,
  description,
  metrics,
  bars = [],
  insight,
}: Props) {
  return (
    <section className="card" aria-label={title} style={{ padding: "1.35rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div style={{ maxWidth: 760 }}>
          <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: "0.35rem" }}>{eyebrow}</div>
          <h2 style={{ margin: 0, fontSize: "clamp(1.15rem, 2vw, 1.45rem)", color: "var(--text-1)" }}>{title}</h2>
          <p style={{ margin: "0.45rem 0 0", color: "var(--text-2)", fontSize: "0.82rem", lineHeight: 1.55 }}>{description}</p>
        </div>
        <span className="badge" style={{ color: "var(--text-2)", borderColor: "var(--border)" }}>Datos publicados · sin proyección inventada</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: "0.75rem" }}>
        {metrics.map((metric) => {
          const tone = toneVars[metric.tone ?? "accent"];
          return (
            <div key={metric.label} style={{ padding: "0.85rem", borderRadius: 10, border: "1px solid var(--border)", background: tone.background }}>
              <div style={{ color: "var(--text-2)", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>{metric.label}</div>
              <strong style={{ display: "block", marginTop: "0.3rem", color: tone.color, fontFamily: "monospace", fontSize: "1.15rem" }}>{metric.value}</strong>
              {metric.detail && <div style={{ marginTop: "0.25rem", color: "var(--text-3)", fontSize: "0.7rem", lineHeight: 1.4 }}>{metric.detail}</div>}
            </div>
          );
        })}
      </div>

      {bars.length > 0 && (
        <div style={{ marginTop: "1.2rem", display: "grid", gap: "0.8rem" }}>
          {bars.map((bar) => {
            const tone = toneVars[bar.tone ?? "accent"];
            const max = bar.max ?? 100;
            const width = bar.value === null || !Number.isFinite(bar.value) ? 0 : Math.min(100, Math.max(0, (bar.value / max) * 100));
            return (
              <div key={bar.label}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "baseline", fontSize: "0.78rem" }}>
                  <span style={{ color: "var(--text-2)", fontWeight: 650 }}>{bar.label}</span>
                  <strong style={{ color: tone.color, fontFamily: "monospace", whiteSpace: "nowrap" }}>{bar.value === null ? "No publicado" : (bar.displayValue ?? `${bar.value.toLocaleString("es-CL")} %`)}</strong>
                </div>
                <div role="meter" aria-label={bar.label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={bar.value ?? 0} style={{ height: 8, marginTop: "0.35rem", borderRadius: 99, background: "var(--surface-2)", overflow: "hidden", border: "1px solid var(--border)" }}>
                  <div style={{ width: `${width}%`, height: "100%", borderRadius: 99, background: tone.color, transition: "width 240ms ease" }} />
                </div>
                {bar.detail && <div style={{ color: "var(--text-3)", fontSize: "0.68rem", marginTop: "0.2rem" }}>{bar.detail}</div>}
              </div>
            );
          })}
        </div>
      )}

      {insight && <div style={{ marginTop: "1.1rem", padding: "0.75rem 0.85rem", borderLeft: "3px solid var(--highlight)", background: "var(--surface-2)", color: "var(--text-2)", fontSize: "0.78rem", lineHeight: 1.5 }}>{insight}</div>}
    </section>
  );
}
