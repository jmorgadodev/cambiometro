"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { formatCLP } from "@/lib/format";
import { useThemeTokens } from "@/lib/theme-tokens";
import type { EChartsOption } from "echarts";

const EChartContainer = dynamic(() => import("@/components/charts/EChartContainer"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "240px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-2)",
        borderRadius: "10px",
        color: "var(--text-2)",
        fontSize: "0.75rem",
      }}
    >
      Cargando evolución de gastos…
    </div>
  ),
});

export interface GastoMes {
  periodo: string;
  total: number;
}

const MESES: Record<string, string> = {
  "01": "Ene",
  "02": "Feb",
  "03": "Mar",
  "04": "Abr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Ago",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dic",
};

const MESES_ESPERADOS = [
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
];

export default function GastosPartidoChart({
  porMes,
  color,
}: {
  porMes: GastoMes[];
  color: string;
}) {
  const tokens = useThemeTokens();

  const datos = useMemo(() => {
    const mapa = new Map(porMes.map((m) => [m.periodo, m.total]));
    return MESES_ESPERADOS.map((p) => {
      const total = mapa.get(p) ?? 0;
      const mesNum = p.slice(5, 7);
      return {
        periodo: p,
        total,
        pendiente: total === 0,
        nombre: `${MESES[mesNum] ?? ""} ${p.slice(0, 4)}`,
      };
    });
  }, [porMes]);

  const chartOptions: EChartsOption = useMemo(() => {
    const periodos = datos.map((d) => d.nombre);
    const maxVal = Math.max(...datos.map((d) => d.total), 1);
    const dummyHeight = Math.round(maxVal * 0.04);

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
          const list = params as Array<{ dataIndex: number; value: number }>;
          if (!list || list.length === 0) return "";
          const item = datos[list[0].dataIndex];
          if (!item) return "";

          if (item.pendiente) {
            return `
              <div style="font-weight:700;margin-bottom:4px;font-size:13px;color:${tokens.text1};">${item.nombre}</div>
              <div style="display:inline-block;background:${tokens.warnBg};color:${tokens.warn};border:1px solid ${tokens.warn};font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;margin:2px 0 4px;">Pendiente de publicación</div>
              <div style="font-size:11px;color:${tokens.text3};margin-top:4px;">Gasto de la bancada aún no publicado por la Cámara/Senado (desfase reglamentario ~2 meses).</div>
            `;
          }

          return `
            <div style="font-weight:700;margin-bottom:4px;font-size:13px;color:${tokens.text1};">${item.nombre}</div>
            <div style="color:${color || tokens.accent};font-size:14px;font-weight:800;font-family:monospace;">${formatCLP(item.total)}</div>
            <div style="font-size:11px;color:${tokens.text3};margin-top:4px;">Gasto operacional total de la bancada</div>
          `;
        },
      },
      grid: {
        top: 20,
        left: "3%",
        right: "3%",
        bottom: 25,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: periodos,
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
          formatter: (v: number) => (v >= 1_000_000 ? `${Math.round(v / 1_000_000)}M` : `${Math.round(v / 1000)}k`),
        },
        splitLine: {
          lineStyle: { color: tokens.border },
        },
      },
      series: [
        {
          name: "Gasto bancada",
          type: "bar",
          data: datos.map((d) => {
            if (d.pendiente) {
              return {
                value: dummyHeight,
                itemStyle: {
                  color: tokens.surface2,
                  borderColor: tokens.border,
                  borderWidth: 1.5,
                  borderType: "dashed",
                  borderRadius: [4, 4, 0, 0],
                },
              };
            }
            return {
              value: d.total,
              itemStyle: {
                color: color || tokens.accent,
                borderRadius: [4, 4, 0, 0],
              },
            };
          }),
          emphasis: {
            itemStyle: {
              shadowBlur: 8,
              shadowColor: tokens.border,
            },
          },
        },
      ],
    };
  }, [datos, color, tokens]);

  const mesesPendientes = datos.filter((d) => d.pendiente);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {mesesPendientes.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
          <span className="badge badge-warn" style={{ fontSize: "0.68rem", padding: "0.15rem 0.5rem" }}>
            ⏳ {mesesPendientes.map((m) => m.nombre).join(" y ")}: Pendiente de publicación
          </span>
          <span style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>
            Desfase reglamentario de rendiciones en Cámara y Senado.
          </span>
        </div>
      )}
      <div
        role="img"
        aria-label="Evolución de gastos operacionales de la bancada por mes"
        style={{ width: "100%", height: "260px" }}
      >
        <EChartContainer options={chartOptions} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
