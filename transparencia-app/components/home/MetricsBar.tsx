"use client";
import React from "react";
import { StatCounter } from "./StatCounter";

export interface MetricsBarProps {
  metrics: {
    registros: number;
    fuentes: number;
    entidades: number;
    votaciones: number;
    relaciones: number;
  };
}

export function MetricsBar({ metrics }: MetricsBarProps) {
  const hasEntered = true;

  const kpiData = [
    {
      index: "01",
      target: metrics.registros,
      suffix: "",
      label: "Registros indexados",
      detail: "Según el catálogo publicado",
      delay: 100,
    },
    {
      index: "02",
      target: metrics.fuentes,
      suffix: "",
      label: "Fuentes integradas",
      detail: "Cada fuente tiene su propio corte",
      delay: 240,
    },
    {
      index: "03",
      target: metrics.entidades,
      suffix: "",
      label: "Entidades identificadas",
      detail: "Organismos y otras entidades catalogadas",
      delay: 380,
    },
    {
      index: "04",
      target: metrics.votaciones,
      suffix: "",
      label: "Votaciones de Sala",
      detail: "Cámara y Senado · corte publicado",
      delay: 520,
    },
    {
      index: "05",
      target: metrics.relaciones,
      suffix: "",
      label: "Cruces documentales",
      detail: "Vínculos respaldados por registros",
      delay: 660,
    },
  ];

  return (
    <section
      className="relative overflow-hidden border-y border-forest-border bg-forest-bg py-8 sm:py-10 transition-colors duration-200 text-white shadow-xs"
    >
      {/* Sutil Retícula Milimétrica Documental en Tono Luz */}
      <div className="absolute inset-0 bg-grid-dark-documental mask-radial-fade pointer-events-none opacity-40" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-6 lg:gap-0 lg:divide-x divide-forest-border">
          {kpiData.map((kpi, idx) => (
            <div
              key={kpi.index}
              style={{
                opacity: hasEntered ? 1 : 0,
                transform: hasEntered ? "translateY(0)" : "translateY(14px)",
                transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${kpi.delay * 0.7}ms`,
              }}
              className={`flex flex-col items-center justify-center text-center px-3 sm:px-4 py-2 group cursor-default transition-all ${
                idx === 4 ? "col-span-2 md:col-span-1" : ""
              }`}
            >
              {/* Index Indicator (01, 02...) Centered */}
              <div className="text-[11px] font-mono font-bold text-forest-accent tracking-widest mb-1.5 flex items-center justify-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-forest-accent-ok opacity-80" />
                <span>{kpi.index}</span>
                <span className="w-1 h-1 rounded-full bg-forest-accent-ok opacity-80" />
              </div>

              {/* Big Stat Metric Centered */}
              <div className="font-serif text-2xl sm:text-3xl lg:text-[32px] font-bold tracking-tight text-forest-text group-hover:text-forest-accent-ok transition-colors mb-1">
                <StatCounter target={kpi.target} suffix={kpi.suffix} delay={kpi.delay} />
              </div>

              {/* Metric Label Centered */}
              <div className="text-xs font-semibold text-forest-text mb-1">
                {kpi.label}
              </div>

              {/* Metric Detail Subtitle Centered */}
              <div className="text-[11px] text-forest-subtle leading-snug max-w-[190px] mx-auto">
                {kpi.detail}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default MetricsBar;
