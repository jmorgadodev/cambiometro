"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useThemeTokens } from "@/lib/theme-tokens";
import { getPartidoConfig } from "@/lib/partidos.config";
import type { EChartsOption } from "echarts";

const EChartContainer = dynamic(() => import("@/components/charts/EChartContainer"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        height: "380px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-2)",
        borderRadius: "10px",
        color: "var(--text-2)",
        fontSize: "0.75rem",
      }}
    >
      Cargando gráfico comparativo de votaciones…
    </div>
  ),
});

export interface FilaRankingVotos {
  nombre: string;
  si: number;
  no: number;
  abst: number;
  noVota: number;
}

export default function RankingVotosChart({ filas }: { filas: FilaRankingVotos[] }) {
  const [modoPct, setModoPct] = useState<boolean>(false);
  const tokens = useThemeTokens();

  // Ordenar siempre de mayor a menor por total de votos emitidos
  const filasSorted = useMemo(() => {
    return [...filas].sort((a, b) => {
      const totalA = a.si + a.no + a.abst + a.noVota;
      const totalB = b.si + b.no + b.abst + b.noVota;
      return totalB - totalA;
    });
  }, [filas]);

  const chartOptions: EChartsOption = useMemo(() => {
    const partidos = filasSorted.map((f) => f.nombre);

    const seriesData = {
      si: filasSorted.map((f) => {
        const total = f.si + f.no + f.abst + f.noVota;
        if (f.si === 0) return 0;
        return modoPct ? (total > 0 ? Number(((f.si / total) * 100).toFixed(1)) : 0) : f.si;
      }),
      no: filasSorted.map((f) => {
        const total = f.si + f.no + f.abst + f.noVota;
        if (f.no === 0) return 0;
        return modoPct ? (total > 0 ? Number(((f.no / total) * 100).toFixed(1)) : 0) : f.no;
      }),
      abst: filasSorted.map((f) => {
        const total = f.si + f.no + f.abst + f.noVota;
        if (f.abst === 0) return 0;
        return modoPct ? (total > 0 ? Number(((f.abst / total) * 100).toFixed(1)) : 0) : f.abst;
      }),
      noVota: filasSorted.map((f) => {
        const total = f.si + f.no + f.abst + f.noVota;
        if (f.noVota === 0) return 0;
        return modoPct ? (total > 0 ? Number(((f.noVota / total) * 100).toFixed(1)) : 0) : f.noVota;
      }),
    };

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
          const list = params as Array<{ seriesName: string; value: number; marker: string; axisValue: string; dataIndex: number }>;
          if (!list || list.length === 0) return "";
          const partyName = list[0].axisValue;
          const fila = filasSorted[list[0].dataIndex];
          const totalEmitidos = fila ? fila.si + fila.no + fila.abst + fila.noVota : 0;
          const pCfg = getPartidoConfig(partyName);

          let html = `<div style="display:flex;align-items:center;gap:6px;font-weight:700;margin-bottom:6px;font-size:13px;border-bottom:1px solid ${tokens.border};padding-bottom:4px;color:${tokens.text1};">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${pCfg.color_oficial};"></span>
            <span>${pCfg.nombre} (${partyName})</span>
          </div>`;

          list.forEach((item) => {
            const rawVal = modoPct
              ? item.value
              : item.seriesName.includes("Sí")
                ? fila?.si ?? item.value
                : item.seriesName.includes("No") && !item.seriesName.includes("vota")
                  ? fila?.no ?? item.value
                  : item.seriesName.includes("Abstención")
                    ? fila?.abst ?? item.value
                    : fila?.noVota ?? item.value;

            const pctVal = totalEmitidos > 0 ? ((rawVal / totalEmitidos) * 100).toFixed(1) : "0.0";
            const valFormatted = modoPct
              ? `${item.value}%`
              : `${rawVal.toLocaleString("es-CL")} votos (${pctVal}%)`;

            html += `<div style="display:flex;justify-content:space-between;gap:12px;margin:3px 0;color:${tokens.text1};"><span>${item.marker} ${item.seriesName}</span><strong>${valFormatted}</strong></div>`;
          });

          if (!modoPct && totalEmitidos > 0) {
            html += `<div style="border-top:1px solid ${tokens.border};margin-top:6px;padding-top:4px;display:flex;justify-content:space-between;font-size:11px;color:${tokens.text3};">
              <span>Total apariciones en sala:</span>
              <strong style="color:${tokens.text1};">${totalEmitidos.toLocaleString("es-CL")}</strong>
            </div>`;
          }

          return html;
        },
      },
      legend: {
        data: ["A favor (Sí)", "En contra (No)", "Abstención", "No vota / Ausente"],
        bottom: 0,
        textStyle: {
          color: tokens.text2,
          fontSize: 11,
        },
        itemWidth: 12,
        itemHeight: 10,
      },
      grid: {
        top: 10,
        left: "3%",
        right: "4%",
        bottom: 40,
        containLabel: true,
      },
      xAxis: {
        type: "value",
        max: modoPct ? 100 : undefined,
        axisLabel: {
          formatter: modoPct ? "{value}%" : "{value}",
          color: tokens.text3,
          fontSize: 11,
        },
        splitLine: {
          lineStyle: {
            color: tokens.border,
          },
        },
      },
      yAxis: {
        type: "category",
        inverse: true, // Bancada con más votos aparece al inicio (arriba)
        data: partidos,
        axisLabel: {
          color: tokens.text2,
          fontWeight: 600,
          fontSize: 12,
        },
        axisTick: { show: false },
        axisLine: {
          lineStyle: {
            color: tokens.border,
          },
        },
      },
      series: [
        {
          name: "A favor (Sí)",
          type: "bar",
          stack: "total",
          data: seriesData.si,
          itemStyle: { color: tokens.ok },
          emphasis: { focus: "series" },
        },
        {
          name: "En contra (No)",
          type: "bar",
          stack: "total",
          data: seriesData.no,
          itemStyle: { color: tokens.bad },
          emphasis: { focus: "series" },
        },
        {
          name: "Abstención",
          type: "bar",
          stack: "total",
          data: seriesData.abst,
          itemStyle: { color: tokens.warn },
          emphasis: { focus: "series" },
        },
        {
          name: "No vota / Ausente",
          type: "bar",
          stack: "total",
          data: seriesData.noVota,
          itemStyle: { color: tokens.text3 },
          emphasis: { focus: "series" },
        },
      ],
    };
  }, [filasSorted, modoPct, tokens]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
          Disciplina de votos acumulada en sala (Cámara)
        </span>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            type="button"
            onClick={() => setModoPct(false)}
            className="capsule"
            style={{
              cursor: "pointer",
              fontSize: "0.72rem",
              padding: "0.25rem 0.6rem",
              background: !modoPct ? "var(--accent)" : "var(--surface-2)",
              color: !modoPct ? "var(--bg)" : "var(--text-2)",
              fontWeight: !modoPct ? 700 : 500,
              border: !modoPct ? "1px solid var(--accent)" : "1px solid var(--border)",
              borderRadius: "6px",
            }}
          >
            Total Votos
          </button>
          <button
            type="button"
            onClick={() => setModoPct(true)}
            className="capsule"
            style={{
              cursor: "pointer",
              fontSize: "0.72rem",
              padding: "0.25rem 0.6rem",
              background: modoPct ? "var(--accent)" : "var(--surface-2)",
              color: modoPct ? "var(--bg)" : "var(--text-2)",
              fontWeight: modoPct ? 700 : 500,
              border: modoPct ? "1px solid var(--accent)" : "1px solid var(--border)",
              borderRadius: "6px",
            }}
          >
            Porcentajes (%)
          </button>
        </div>
      </div>

      <div role="img" aria-label="Ranking comparativo de votos por partido y opción" style={{ width: "100%", height: 380 }}>
        <EChartContainer options={chartOptions} height={380} />
      </div>
    </div>
  );
}
