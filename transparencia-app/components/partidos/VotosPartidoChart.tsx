"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { formatFechaCorta } from "@/lib/format";
import { useThemeTokens } from "@/lib/theme-tokens";
import type { EChartsOption } from "echarts";

const EChartContainer = dynamic(() => import("@/components/charts/EChartContainer"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "320px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-2)",
        borderRadius: "10px",
        color: "var(--text-2)",
        fontSize: "0.75rem",
      }}
    >
      Cargando historial de votaciones…
    </div>
  ),
});

export interface FilaVotosChart {
  id: string;
  fecha: string;
  descripcion: string;
  nombre?: string;
  si: number;
  no: number;
  abst: number;
  noVota: number;
  votosNominales?: { politico_id: string; nombre: string; opcion: string }[];
}

interface VotosPartidoChartProps {
  filas: FilaVotosChart[];
  onSelectVotacion?: (votacion: FilaVotosChart) => void;
  selectedVotacionId?: string | null;
}

export default function VotosPartidoChart({
  filas,
  onSelectVotacion,
  selectedVotacionId,
}: VotosPartidoChartProps) {
  const [visible, setVisible] = useState<Set<"si" | "no" | "abst" | "noVota">>(
    () => new Set(["si", "no", "abst", "noVota"])
  );
  const tokens = useThemeTokens();

  const toggleSerie = (key: "si" | "no" | "abst" | "noVota") => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const datosOrdenados = useMemo(() => {
    const list = [...filas].reverse();
    const conteoFechas = new Map<string, number>();

    return list.map((item) => {
      const fechaCorta = formatFechaCorta(item.fecha);
      const diaMes = item.fecha ? `${item.fecha.slice(8, 10)}/${item.fecha.slice(5, 7)}` : fechaCorta;
      const count = (conteoFechas.get(diaMes) || 0) + 1;
      conteoFechas.set(diaMes, count);
      const etiquetaFinal = count === 1 ? diaMes : `${diaMes} · ${count}ª sesión`;

      return {
        ...item,
        fechaCorta,
        fechaDiaMes: etiquetaFinal,
      };
    });
  }, [filas]);

  const chartOptions: EChartsOption = useMemo(() => {
    const fechas = datosOrdenados.map((d) => d.fechaDiaMes);

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: {
          type: "shadow",
        },
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        padding: [10, 14],
        textStyle: {
          color: tokens.text1,
          fontSize: 12,
        },
        formatter: (params: unknown) => {
          const list = params as Array<{ dataIndex: number; seriesName: string; value: number; marker: string }>;
          if (!list || list.length === 0) return "";
          const item = datosOrdenados[list[0].dataIndex];
          if (!item) return "";

          let html = `<div style="font-weight:700;margin-bottom:4px;font-size:12.5px;max-width:320px;line-height:1.35;color:${tokens.text1};">${item.descripcion || "Votación de Sala"}</div>`;
          html += `<div style="font-size:11px;color:${tokens.text3};margin-bottom:8px;border-bottom:1px solid ${tokens.border};padding-bottom:4px;">Fecha: ${item.fechaCorta} · Haz clic para ver detalle nominal ↗</div>`;

          list.forEach((entry) => {
            if (entry.value > 0) {
              html += `<div style="display:flex;justify-content:space-between;gap:12px;margin:2px 0;color:${tokens.text1};"><span>${entry.marker} ${entry.seriesName}</span><strong>${entry.value} parlamentarios</strong></div>`;
            }
          });
          return html;
        },
      },
      grid: {
        top: 20,
        left: "2%",
        right: "2%",
        bottom: 30,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: fechas,
        axisLabel: {
          color: tokens.text3,
          fontSize: 11,
        },
        axisTick: { show: false },
        axisLine: {
          lineStyle: { color: tokens.border },
        },
      },
      yAxis: {
        type: "value",
        axisLabel: {
          color: tokens.text3,
          fontSize: 11,
        },
        splitLine: {
          lineStyle: { color: tokens.border },
        },
      },
      series: [
        {
          name: "A favor (Sí)",
          type: "bar",
          stack: "votos",
          data: visible.has("si")
            ? datosOrdenados.map((d) => ({
                value: d.si > 0 ? d.si : 0,
                itemStyle: {
                  color: tokens.ok,
                  borderColor: selectedVotacionId === d.id ? tokens.text1 : "transparent",
                  borderWidth: selectedVotacionId === d.id ? 2 : 0,
                },
              }))
            : [],
          emphasis: { focus: "series" },
        },
        {
          name: "En contra (No)",
          type: "bar",
          stack: "votos",
          data: visible.has("no")
            ? datosOrdenados.map((d) => ({
                value: d.no > 0 ? d.no : 0,
                itemStyle: {
                  color: tokens.bad,
                  borderColor: selectedVotacionId === d.id ? tokens.text1 : "transparent",
                  borderWidth: selectedVotacionId === d.id ? 2 : 0,
                },
              }))
            : [],
          emphasis: { focus: "series" },
        },
        {
          name: "Abstención",
          type: "bar",
          stack: "votos",
          data: visible.has("abst")
            ? datosOrdenados.map((d) => ({
                value: d.abst > 0 ? d.abst : 0,
                itemStyle: {
                  color: tokens.warn,
                  borderColor: selectedVotacionId === d.id ? tokens.text1 : "transparent",
                  borderWidth: selectedVotacionId === d.id ? 2 : 0,
                },
              }))
            : [],
          emphasis: { focus: "series" },
        },
        {
          name: "No vota (pareo / ausente)",
          type: "bar",
          stack: "votos",
          data: visible.has("noVota")
            ? datosOrdenados.map((d) => ({
                value: d.noVota > 0 ? d.noVota : 0,
                itemStyle: {
                  color: tokens.text3,
                  borderColor: selectedVotacionId === d.id ? tokens.text1 : "transparent",
                  borderWidth: selectedVotacionId === d.id ? 2 : 0,
                },
              }))
            : [],
          emphasis: { focus: "series" },
        },
      ],
    };
  }, [datosOrdenados, visible, selectedVotacionId, tokens]);

  if (filas.length === 0) {
    return <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Sin votaciones publicadas para este partido.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Barra de opciones visibles */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {[
            ["si", "Sí", tokens.ok],
            ["no", "No", tokens.bad],
            ["abst", "Abstención", tokens.warn],
            ["noVota", "No vota", tokens.text3],
          ].map(([key, label, color]) => {
            const active = visible.has(key as "si" | "no" | "abst" | "noVota");
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => toggleSerie(key as "si" | "no" | "abst" | "noVota")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.72rem",
                  padding: "0.25rem 0.55rem",
                  borderRadius: "6px",
                  border: `1px solid ${active ? color : "var(--border)"}`,
                  background: active ? "var(--surface-2)" : "transparent",
                  color: active ? "var(--text-1)" : "var(--text-2)",
                  cursor: "pointer",
                  opacity: active ? 1 : 0.5,
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </div>
        <span style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>
          💡 Haz clic en una barra para abrir el detalle nominal
        </span>
      </div>

      <div role="img" aria-label="Gráfico de votaciones recientes de la bancada" style={{ width: "100%", height: 320 }}>
        <EChartContainer
          options={chartOptions}
          height={320}
          onEvents={{
            click: (params) => {
              const item = datosOrdenados[params.dataIndex];
              if (item && onSelectVotacion) {
                onSelectVotacion(item);
              }
            },
          }}
        />
      </div>
    </div>
  );
}
