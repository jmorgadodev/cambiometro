import Link from "next/link";
import MechanicalCounter from "@/components/ui/MechanicalCounter";
import type { HomeMetric } from "./types";

export default function MetricsBar({ metrics }: { metrics: HomeMetric[] }) {
  return (
    <section className="editorial-metrics" aria-label="Cobertura actual consolidada">
      <div className="editorial-grid editorial-grid--dark" aria-hidden="true" />
      <div className="container-main editorial-metrics__grid">
        {metrics.map((item, index) => (
          <Link
            prefetch={false}
            href={item.href}
            className="editorial-metric"
            key={item.key}
            title={item.tooltip}
            aria-label={`${item.label}: ${item.value.toLocaleString("es-CL")}. ${item.tooltip}`}
          >
            <span className="editorial-metric__index">{String(index + 1).padStart(2, "0")}</span>
            <MechanicalCounter value={item.value} delay={index * 90} />
            <b>{item.key === "votaciones" ? "Votaciones de sala históricas" : item.label}</b>
            <small>{item.key === "votaciones" ? "Cámara + Senado · 2022–2026" : item.tooltip}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}
