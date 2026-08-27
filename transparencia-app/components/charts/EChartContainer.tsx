"use client";

import { useEffect, useRef } from "react";
import type { EChartsOption, ECharts, ECElementEvent } from "echarts";

interface EChartContainerProps {
  options: EChartsOption;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  onEvents?: {
    click?: (params: ECElementEvent) => void;
    legendselectchanged?: (params: { name: string; selected: Record<string, boolean> }) => void;
  };
  theme?: "dark" | "light" | "paper" | "night";
}

export default function EChartContainer({
  options,
  height = 300,
  className = "",
  style = {},
  onEvents,
  theme = "paper",
}: EChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<ECharts | null>(null);

  useEffect(() => {
    let active = true;
    let resizeObserver: ResizeObserver | null = null;

    if (!containerRef.current) return;

    import("echarts").then((echarts) => {
      if (!active || !containerRef.current) return;

      // Inicializar o reutilizar instancia
      let chart = chartInstanceRef.current;
      if (!chart) {
        chart = echarts.init(containerRef.current, theme === "dark" || theme === "night" ? "dark" : undefined, {
          renderer: "svg", // SVG para gráficos nítidos y ligeros
        });
        chartInstanceRef.current = chart;
      }

      // Configurar tema base oscuro alineado con la paleta de Cambiómetro
      const enhancedOptions: EChartsOption = {
        backgroundColor: "transparent",
        textStyle: {
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        },
        ...options,
      };

      chart.setOption(enhancedOptions, { notMerge: true });

      // Vincular eventos
      if (onEvents?.click) {
        chart.off("click");
        chart.on("click", (params) => {
          onEvents.click?.(params);
        });
      }

      if (onEvents?.legendselectchanged) {
        chart.off("legendselectchanged");
        chart.on("legendselectchanged", (params) => {
          onEvents.legendselectchanged?.(params as { name: string; selected: Record<string, boolean> });
        });
      }

      // ResizeObserver para ajuste responsivo instantáneo
      resizeObserver = new ResizeObserver(() => {
        chart?.resize();
      });

      resizeObserver.observe(containerRef.current);
    });

    return () => {
      active = false;
      if (resizeObserver && containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
        resizeObserver.disconnect();
      }
    };
  }, [options, onEvents, theme]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`echart-container ${className}`}
      style={{
        width: "100%",
        height: typeof height === "number" ? `${height}px` : height,
        minHeight: typeof height === "number" ? `${height}px` : height,
        ...style,
      }}
    />
  );
}
