"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { formatPct } from "@/lib/format";
import { useThemeTokens } from "@/lib/theme-tokens";
import type { EChartsOption } from "echarts";

const EChartContainer = dynamic(() => import("@/components/charts/EChartContainer"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "180px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-2)",
        borderRadius: "10px",
        color: "var(--text-2)",
        fontSize: "0.75rem",
      }}
    >
      Cargando gráfico interactivo…
    </div>
  ),
});

export interface SectorDona {
  name: string;
  value: number;
  color: string;
}

interface DonaPartidoProps {
  sectores: SectorDona[];
  camaraNombre?: string;
  selectedSegment?: string | null;
  onSelectSegment?: (segmentName: string) => void;
}

export default function DonaPartido({
  sectores,
  camaraNombre = "Cámara",
  selectedSegment = null,
  onSelectSegment,
}: DonaPartidoProps) {
  const total = sectores.reduce((acc, s) => acc + s.value, 0);
  const tokens = useThemeTokens();

  const chartOptions: EChartsOption = useMemo(() => {
    // Filtrar segmentos para no mostrar items con 0 en la dona
    const dataFiltrada = sectores
      .filter((s) => s.value > 0)
      .map((s) => ({
        name: s.name,
        value: s.value,
        itemStyle: {
          color: s.color,
          opacity: selectedSegment && selectedSegment !== "Todos" && selectedSegment !== s.name ? 0.35 : 1,
          borderColor: selectedSegment === s.name ? tokens.text1 : "transparent",
          borderWidth: selectedSegment === s.name ? 2 : 0,
        },
      }));

    return {
      tooltip: {
        trigger: "item",
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        padding: [8, 12],
        textStyle: {
          color: tokens.text1,
          fontSize: 12,
        },
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number; marker: string };
          return `${p.marker} <strong>${p.name}</strong>: ${p.value.toLocaleString("es-CL")} votos (${p.percent.toFixed(1)}%)`;
        },
      },
      legend: {
        show: false, // Usamos nuestra lista interactiva accesible a la derecha
      },
      series: [
        {
          name: `Votos ${camaraNombre}`,
          type: "pie",
          radius: ["50%", "82%"],
          center: ["50%", "50%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 4,
            borderColor: tokens.surface,
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          emphasis: {
            scale: true,
            scaleSize: 6,
            label: {
              show: false,
            },
          },
          data: dataFiltrada,
        },
      ],
    };
  }, [sectores, camaraNombre, selectedSegment, tokens]);

  if (total === 0) {
    return <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Sin votos emitidos publicados.</p>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: "1.25rem", alignItems: "center" }}>
      {/* Gráfico interactivo ECharts */}
      <div style={{ width: "100%", height: 180, position: "relative" }}>
        <EChartContainer
          options={chartOptions}
          height={180}
          onEvents={{
            click: (params) => {
              if (params.name && onSelectSegment) {
                onSelectSegment(params.name);
              }
            },
          }}
        />
        {/* Centro de la dona con el total */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: "1.15rem", fontWeight: 800, fontFamily: "monospace", color: "var(--text-primary)" }}>
            {total.toLocaleString("es-CL")}
          </div>
          <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            votos
          </div>
        </div>
      </div>

      {/* Lista interactiva con toggle de filtro */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", fontSize: "0.8rem" }}>
        {sectores.map((s) => {
          const isSelected = selectedSegment === s.name;
          const isFaded = selectedSegment && selectedSegment !== "Todos" && !isSelected;
          const pct = (s.value / Math.max(total, 1)) * 100;

          return (
            <button
              key={s.name}
              type="button"
              onClick={() => onSelectSegment?.(isSelected ? "Todos" : s.name)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.35rem 0.5rem",
                borderRadius: 6,
                border: isSelected ? `1.5px solid ${s.color}` : "1px solid transparent",
                background: isSelected ? "var(--bg-surface-2)" : "transparent",
                opacity: isFaded ? 0.45 : 1,
                cursor: "pointer",
                transition: "all 0.15s ease",
                textAlign: "left",
                color: "inherit",
              }}
              title={`Filtrar por opción: ${s.name}`}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)" }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: "inline-block", flexShrink: 0 }} />
                <span style={{ fontWeight: isSelected ? 700 : 500 }}>{s.name}</span>
              </span>
              <strong style={{ fontFamily: "monospace", color: isSelected ? "var(--accent)" : "var(--text-primary)" }}>
                {s.value.toLocaleString("es-CL")} · {formatPct(pct)}
              </strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}