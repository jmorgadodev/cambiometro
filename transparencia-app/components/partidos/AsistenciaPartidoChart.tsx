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
      Cargando serie de asistencia…
    </div>
  ),
});

export interface PuntoAsistencia {
  sesion: string;
  fecha: string;
  asistencia: number;
  presentes?: number;
  total?: number;
}

interface Props {
  serie: PuntoAsistencia[];
}

const NOMBRES_MESES: Record<string, string> = {
  "01": "Enero",
  "02": "Febrero",
  "03": "Marzo",
  "04": "Abril",
  "05": "Mayo",
  "06": "Junio",
  "07": "Julio",
  "08": "Agosto",
  "09": "Septiembre",
  "10": "Octubre",
  "11": "Noviembre",
  "12": "Diciembre",
};

export default function AsistenciaPartidoChart({ serie }: Props) {
  const [rango, setRango] = useState<"30" | "90" | "180" | "all">("all");
  const [modo, setModo] = useState<"sesion" | "mensual">("sesion");
  const tokens = useThemeTokens();

  // 1. Filtrar por rango
  const serieFiltrada = useMemo(() => {
    if (rango === "all") return serie;
    const days = Number(rango);
    const limite = new Date();
    limite.setDate(limite.getDate() - days);
    const isoLimit = limite.toISOString().slice(0, 10);
    return serie.filter((s) => (s.fecha ? s.fecha.slice(0, 10) >= isoLimit : true));
  }, [serie, rango]);

  // Primer punto de la serie para el label de rango
  const infoRango = useMemo(() => {
    if (serie.length === 0) return null;
    const primerFecha = serie[0].fecha;
    if (!primerFecha) return null;
    const mesNum = primerFecha.slice(5, 7);
    const yearNum = primerFecha.slice(0, 4);
    const mesNombre = NOMBRES_MESES[mesNum] || mesNum;
    return {
      mesTexto: `${mesNombre} ${yearNum}`,
      mesCodigo: `${mesNum}/${yearNum}`,
    };
  }, [serie]);

  // 2. Agrupar por mes si aplica
  const datosParaChart = useMemo(() => {
    if (modo === "sesion") {
      return serieFiltrada.map((s) => ({
        label: s.fecha ? `${s.fecha.slice(8, 10)}/${s.fecha.slice(5, 7)}` : s.sesion,
        fechaCompleta: s.fecha,
        sesion: s.sesion,
        asistencia: s.asistencia,
        presentes: s.presentes,
        total: s.total,
        esMensual: false,
      }));
    }

    // Agrupación mensual
    const mensualMap: Record<string, { presentes: number; total: number; count: number }> = {};
    for (const s of serieFiltrada) {
      const mesKey = s.fecha ? s.fecha.slice(0, 7) : "2026-03";
      if (!mensualMap[mesKey]) mensualMap[mesKey] = { presentes: 0, total: 0, count: 0 };
      mensualMap[mesKey].presentes += s.presentes ?? 0;
      mensualMap[mesKey].total += s.total ?? 0;
      mensualMap[mesKey].count++;
    }

    return Object.entries(mensualMap)
      .sort(([mA], [mB]) => mA.localeCompare(mB))
      .map(([mes, info]) => {
        const pct = info.total > 0 ? (info.presentes / info.total) * 100 : 0;
        const [y, m] = mes.split("-");
        const nombreMes = NOMBRES_MESES[m] || mes;
        return {
          label: `${m}/${y}`,
          subLabel: `${nombreMes.slice(0, 3)} ${y}`,
          fechaCompleta: mes,
          sesion: nombreMes,
          asistencia: Math.round(pct * 10) / 10,
          presentes: info.presentes,
          total: info.total,
          esMensual: true,
        };
      });
  }, [serieFiltrada, modo]);

  const chartOptions: EChartsOption = useMemo(() => {
    const labels = datosParaChart.map((d) => d.label);
    const valores = datosParaChart.map((d) => d.asistencia);

    return {
      tooltip: {
        trigger: "axis",
        backgroundColor: tokens.surface,
        borderColor: tokens.border,
        borderWidth: 1,
        padding: [10, 14],
        textStyle: { color: tokens.text1, fontSize: 12 },
        formatter: (params: unknown) => {
          const list = params as Array<{ dataIndex: number; value: number }>;
          if (!list || list.length === 0) return "";
          const item = datosParaChart[list[0].dataIndex];
          if (!item) return "";

          const titulo = item.esMensual
            ? `Promedio Mensual · ${item.sesion}`
            : `Sesión de Sala · ${formatFechaCorta(item.fechaCompleta)}`;

          const desglose =
            item.presentes !== undefined && item.total !== undefined && item.total > 0
              ? `<div style="font-size:11px;color:${tokens.text3};margin-top:3px;">${item.presentes} de ${item.total} presencias registradas</div>`
              : "";

          return `
            <div style="font-weight:700;margin-bottom:3px;font-size:12px;color:${tokens.text1};">${titulo}</div>
            <div style="color:${tokens.accent};font-size:14px;font-weight:800;font-family:monospace;">${item.asistencia.toFixed(1)}% asistencia</div>
            ${desglose}
          `;
        },
      },
      grid: {
        top: 20,
        left: "3%",
        right: "4%",
        bottom: 30,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: labels,
        axisLabel: {
          color: tokens.text3,
          fontSize: 10,
          rotate: labels.length > 20 ? 45 : 0,
        },
        axisLine: { lineStyle: { color: tokens.border } },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: {
          formatter: "{value}%",
          color: tokens.text3,
          fontSize: 10,
        },
        splitLine: { lineStyle: { color: tokens.border } },
      },
      series: [
        {
          name: "Asistencia",
          type: "line",
          data: valores,
          smooth: true,
          showSymbol: labels.length < 35,
          symbolSize: 6,
          itemStyle: { color: tokens.accent },
          lineStyle: { color: tokens.accent, width: 2.5 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: tokens.infoBg },
                { offset: 1, color: "transparent" },
              ],
            },
          },
        },
      ],
    };
  }, [datosParaChart, tokens]);

  if (serie.length === 0) {
    return <p style={{ fontSize: "0.8rem", color: "var(--text-2)" }}>Sin sesiones publicadas.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Etiqueta de rango de inicio de la serie */}
      {infoRango && (
        <div
          style={{
            fontSize: "0.72rem",
            color: "var(--text-3)",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.25rem 0.6rem",
            background: "var(--surface-2)",
            borderRadius: "6px",
            border: "1px solid var(--border)",
            width: "fit-content",
          }}
        >
          <span>🗓️</span>
          <span>Serie oficial disponible desde <strong>{infoRango.mesTexto} ({infoRango.mesCodigo})</strong> · Período 2026-2030</span>
        </div>
      )}

      {/* Controles de Rango y Modo */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        {/* Toggle Por Sesión vs Promedio Mensual */}
        <div style={{ display: "flex", gap: "0.3rem" }}>
          <button
            type="button"
            onClick={() => setModo("sesion")}
            className="capsule"
            style={{
              cursor: "pointer",
              fontSize: "0.7rem",
              padding: "0.2rem 0.55rem",
              background: modo === "sesion" ? "var(--accent)" : "var(--surface-2)",
              color: modo === "sesion" ? "var(--bg)" : "var(--text-2)",
              fontWeight: modo === "sesion" ? 700 : 500,
              border: modo === "sesion" ? "1px solid var(--accent)" : "1px solid var(--border)",
              borderRadius: "6px",
            }}
          >
            Por Sesión
          </button>
          <button
            type="button"
            onClick={() => setModo("mensual")}
            className="capsule"
            style={{
              cursor: "pointer",
              fontSize: "0.7rem",
              padding: "0.2rem 0.55rem",
              background: modo === "mensual" ? "var(--accent)" : "var(--surface-2)",
              color: modo === "mensual" ? "var(--bg)" : "var(--text-2)",
              fontWeight: modo === "mensual" ? 700 : 500,
              border: modo === "mensual" ? "1px solid var(--accent)" : "1px solid var(--border)",
              borderRadius: "6px",
            }}
          >
            Promedio Mensual
          </button>
        </div>

        {/* Filtros de Rango */}
        <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
          {[
            { key: "30", label: "30d" },
            { key: "90", label: "90d" },
            { key: "180", label: "180d" },
            { key: "all", label: "Todo" },
          ].map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRango(r.key as "30" | "90" | "180" | "all")}
              className="capsule"
              style={{
                cursor: "pointer",
                fontSize: "0.68rem",
                padding: "0.2rem 0.45rem",
                background: rango === r.key ? "var(--accent)" : "var(--surface-2)",
                color: rango === r.key ? "var(--bg)" : "var(--text-2)",
                fontWeight: rango === r.key ? 700 : 500,
                border: rango === r.key ? "1px solid var(--accent)" : "1px solid var(--border)",
                borderRadius: "4px",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div role="img" aria-label="Evolución porcentual de asistencia a votaciones" style={{ width: "100%", height: 230 }}>
        <EChartContainer options={chartOptions} height={230} />
      </div>
    </div>
  );
}
