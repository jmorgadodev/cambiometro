"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { formatCLP, formatApellidoInicial } from "@/lib/format";
import { useThemeTokens } from "@/lib/theme-tokens";
import type { EChartsOption } from "echarts";

const EChartContainer = dynamic(() => import("@/components/charts/EChartContainer"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "250px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-2)",
        borderRadius: "10px",
        color: "var(--text-2)",
        fontSize: "0.75rem",
      }}
    >
      Cargando ranking de parlamentarios…
    </div>
  ),
});

export interface FilaGasto {
  nombre: string;
  total: number;
}

export default function GastosParlamentarioChart({
  filas,
  color,
}: {
  filas: FilaGasto[];
  color: string;
}) {
  const tokens = useThemeTokens();

  const chartOptions: EChartsOption = useMemo(() => {
    const ordenados = [...filas].reverse();
    const etiquetas = ordenados.map((f) => formatApellidoInicial(f.nombre));
    const montos = ordenados.map((f) => f.total);

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: tokens.text1, fontSize: 12 },
        formatter: (params: unknown) => {
          const list = params as Array<{ dataIndex: number }>;
          if (!list || list.length === 0) return "";
          const item = ordenados[list[0].dataIndex];
          if (!item) return "";
          return `
            <div style="font-weight:700;margin-bottom:4px;font-size:13px;color:${tokens.text1};line-height:1.35;">${item.nombre}</div>
            <div style="color:${color || tokens.accent};font-size:15px;font-weight:800;font-family:monospace;margin:3px 0;">${formatCLP(item.total)}</div>
            <div style="font-size:11px;color:${tokens.text3};">Gasto operacional total rendido</div>
          `;
        },
      },
      grid: {
        top: 10,
        left: "3%",
        right: "6%",
        bottom: 10,
        containLabel: true,
      },
      xAxis: {
        type: "value",
        axisLabel: {
          color: tokens.text3,
          fontSize: 11,
          formatter: (v: number) => `$${(v / 1_000_000).toFixed(0)}M`,
        },
        splitLine: { lineStyle: { color: tokens.border } },
      },
      yAxis: {
        type: "category",
        data: etiquetas,
        axisLabel: {
          color: tokens.text1,
          fontWeight: 600,
          fontSize: 11,
          width: 145,
          overflow: "truncate",
        },
        axisTick: { show: false },
        axisLine: { lineStyle: { color: tokens.border } },
      },
      series: [
        {
          name: "Rendido",
          type: "bar",
          data: montos,
          itemStyle: {
            color: color || tokens.accent,
            borderRadius: [0, 4, 4, 0],
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 8,
              shadowColor: tokens.border,
            },
          },
        },
      ],
    };
  }, [filas, color, tokens]);

  if (filas.length === 0) return null;

  const height = Math.max(260, filas.length * 30);

  return (
    <div role="img" aria-label="Comparación de gastos rendidos por parlamentario" style={{ width: "100%", height }}>
      <EChartContainer options={chartOptions} height={height} />
    </div>
  );
}
