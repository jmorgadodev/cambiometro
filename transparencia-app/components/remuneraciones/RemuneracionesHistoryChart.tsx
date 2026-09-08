"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { EChartsOption, ECElementEvent } from "echarts";
import { useThemeTokens } from "@/lib/theme-tokens";

const EChartContainer = dynamic(() => import("@/components/charts/EChartContainer"), {
  ssr: false,
  loading: () => (
    <div role="status" style={{ minHeight: 340, display: "grid", placeItems: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
      Cargando evolución mensual…
    </div>
  ),
});

export interface RemuneracionPeriodPoint {
  mes: string;
  total: number;
  total_bruto: number;
  registros_con_monto: number;
  comparison: {
    estado: string;
    periodo_anterior: string | null;
    entradas: number;
    salidas_observadas: number;
    cambios: number;
  };
}

const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("es-CL");

function monthLabel(periodo: string) {
  const [year, month] = periodo.split("-");
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return new Intl.DateTimeFormat("es-CL", { month: "short", year: "numeric", timeZone: "UTC" }).format(date).replace(".", "");
}

export default function RemuneracionesHistoryChart({
  periods,
  selectedPeriod,
  onPeriodClick,
}: {
  periods: RemuneracionPeriodPoint[];
  selectedPeriod: string;
  onPeriodClick: (periodo: string) => void;
}) {
  const tokens = useThemeTokens();
  const data = useMemo(() => [...periods].sort((left, right) => left.mes.localeCompare(right.mes)), [periods]);
  const labels = useMemo(() => data.map((item) => monthLabel(item.mes)), [data]);
  const selectedIndex = data.findIndex((item) => item.mes === selectedPeriod);

  const options = useMemo<EChartsOption>(() => ({
    animationDuration: 350,
    grid: { top: 55, right: 58, bottom: 78, left: 62, containLabel: true },
    legend: {
      top: 4,
      left: 0,
      right: 0,
      type: "scroll",
      textStyle: { color: tokens.text2, fontSize: 11 },
      selected: { "Masa bruta publicada": true, "Nuevos registros": true, "Registros que ya no aparecen": false, "Cambios de monto": false },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      backgroundColor: tokens.surface,
      borderColor: tokens.border,
      borderWidth: 1,
      textStyle: { color: tokens.text1, fontSize: 12 },
      formatter: (params: unknown) => {
        const list = params as Array<{ dataIndex: number }>;
        const item = data[list?.[0]?.dataIndex ?? 0];
        if (!item) return "";
        const delta = item.comparison.estado === "comparado"
          ? `<div style="margin-top:6px;color:${tokens.text2};">+${number.format(item.comparison.entradas)} nuevos · ${number.format(item.comparison.salidas_observadas)} ya no aparecen · ${number.format(item.comparison.cambios)} cambios de monto</div>`
          : `<div style="margin-top:6px;color:${tokens.text2};">Primera línea base</div>`;
        return `<strong style="font-size:13px">${item.mes}</strong><div style="margin-top:5px;color:${tokens.money};font-weight:800">${money.format(item.total_bruto)}</div><div style="margin-top:3px;color:${tokens.text2}">${number.format(item.total)} registros · ${number.format(item.registros_con_monto)} con monto</div>${delta}`;
      },
    },
    xAxis: {
      type: "category",
      data: labels,
      boundaryGap: true,
      axisLabel: { color: tokens.text3, fontSize: 10 },
      axisLine: { lineStyle: { color: tokens.border } },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: "value",
        name: "Masa bruta",
        nameTextStyle: { color: tokens.text3, fontSize: 10 },
        axisLabel: { color: tokens.text3, fontSize: 10, formatter: (value: number) => value >= 1_000_000_000 ? `$${Math.round(value / 1_000_000_000)} mil M` : `$${Math.round(value / 1_000_000)} M` },
        splitLine: { lineStyle: { color: tokens.border } },
      },
      {
        type: "value",
        name: "Registros",
        nameTextStyle: { color: tokens.text3, fontSize: 10 },
        axisLabel: { color: tokens.text3, fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    dataZoom: [
      { type: "inside", xAxisIndex: 0, filterMode: "none" },
      { type: "slider", xAxisIndex: 0, height: 18, bottom: 16, borderColor: tokens.border, backgroundColor: tokens.surface2, fillerColor: tokens.infoBg, handleStyle: { color: tokens.accent }, textStyle: { color: tokens.text3, fontSize: 10 } },
    ],
    series: [
      {
        name: "Masa bruta publicada",
        type: "line",
        yAxisIndex: 0,
        smooth: true,
        symbol: "circle",
        symbolSize: (value: unknown, params: { dataIndex: number }) => params.dataIndex === selectedIndex ? 11 : 7,
        itemStyle: { color: tokens.accent, borderColor: tokens.surface, borderWidth: 2 },
        lineStyle: { color: tokens.accent, width: 3 },
        areaStyle: { color: tokens.infoBg, opacity: 0.55 },
        data: data.map((item) => item.total_bruto),
        markLine: selectedIndex >= 0 ? { symbol: "none", label: { show: false }, lineStyle: { color: tokens.highlight, type: "dashed" }, data: [{ xAxis: labels[selectedIndex] }] } : undefined,
      },
      { name: "Nuevos registros", type: "bar", yAxisIndex: 1, barMaxWidth: 14, itemStyle: { color: tokens.ok, borderRadius: [4, 4, 0, 0] }, data: data.map((item) => item.comparison.estado === "comparado" ? item.comparison.entradas : null) },
      { name: "Registros que ya no aparecen", type: "bar", yAxisIndex: 1, barMaxWidth: 14, itemStyle: { color: tokens.warn, borderRadius: [4, 4, 0, 0] }, data: data.map((item) => item.comparison.estado === "comparado" ? item.comparison.salidas_observadas : null) },
      { name: "Cambios de monto", type: "bar", yAxisIndex: 1, barMaxWidth: 14, itemStyle: { color: tokens.series[2], borderRadius: [4, 4, 0, 0] }, data: data.map((item) => item.comparison.estado === "comparado" ? item.comparison.cambios : null) },
    ],
  }), [data, labels, selectedIndex, tokens]);

  const onEvents = useMemo(() => ({
    click: (params: ECElementEvent) => {
      if (typeof params.dataIndex !== "number" || !data[params.dataIndex]) return;
      onPeriodClick(data[params.dataIndex].mes);
    },
  }), [data, onPeriodClick]);

  return (
    <section className="card" aria-labelledby="remuneraciones-evolution-title">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "end" }}>
        <div>
          <span className="eyebrow">Comparación mensual</span>
          <h2 id="remuneraciones-evolution-title" style={{ margin: "0.25rem 0 0.35rem", fontSize: "1.2rem" }}>Cómo cambia el registro mes a mes</h2>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.82rem", lineHeight: 1.6 }}>La línea muestra la masa bruta publicada. Las barras muestran entradas, salidas observadas y cambios de monto frente al mes anterior.</p>
        </div>
        <span className="badge badge-info">Haz clic o arrastra para explorar</span>
      </div>
      <div role="img" aria-label="Gráfico interactivo de evolución mensual de remuneraciones públicas" style={{ width: "100%", minHeight: 340, marginTop: "0.8rem" }}>
        <EChartContainer options={options} height={360} onEvents={onEvents} />
      </div>
    </section>
  );
}
