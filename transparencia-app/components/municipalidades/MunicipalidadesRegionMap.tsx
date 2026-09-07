"use client";

import { useCallback, useMemo, useState } from "react";
import { useEffect } from "react";
import Link from "next/link";
import type { ECElementEvent, EChartsOption } from "echarts";
import EChartContainer from "@/components/charts/EChartContainer";
import regionsGeoJson from "@/data/geo/chile-regiones.geo.json";
import type { MunicipalidadListItem } from "@/lib/municipalidades-list";
import {
  aggregateMunicipalMapMetric,
  formatMunicipalMapValue,
  getMunicipalMapMetric,
  MUNICIPAL_MAP_METRICS,
  regionMatches,
  type MunicipalMapMetric,
} from "@/lib/municipalidades-map";

interface MunicipalidadesRegionMapProps {
  municipalities: readonly MunicipalidadListItem[];
  selectedRegion?: string;
  onRegionSelect?: (region: string) => void;
}

const MAP_NAME = "cambiometro-chile-regiones";

interface ChartColors {
  surface2: string;
  border: string;
  accent: string;
  highlight: string;
  textPrimary: string;
  textMuted: string;
  onAccent: string;
}

function formatCount(value: number): string {
  return value.toLocaleString("es-CL");
}

function sumMetric(rows: readonly MunicipalidadListItem[], metric: MunicipalMapMetric): number | null {
  return aggregateMunicipalMapMetric(rows, metric);
}

function availability(rows: readonly MunicipalidadListItem[], metric: MunicipalMapMetric): string {
  const available = rows.filter((row) => getMunicipalMapMetric(row, metric) !== null).length;
  return `${available} de ${rows.length} comunas con dato`;
}

function collectCoordinates(value: unknown, output: Array<[number, number]>): void {
  if (!Array.isArray(value)) return;
  if (typeof value[0] === "number" && typeof value[1] === "number") {
    output.push([value[0], value[1]]);
    return;
  }
  value.forEach((item) => collectCoordinates(item, output));
}

function getRegionCenter(region: string): [number, number] | null {
  const feature = regionsGeoJson.features.find((item) => String(item.properties?.region ?? "") === region);
  if (!feature) return null;
  const geometry = feature.geometry as unknown as { type?: string; coordinates?: unknown };
  const rawCoordinates = geometry.coordinates;
  const candidateRings = geometry.type === "MultiPolygon" && Array.isArray(rawCoordinates)
    ? rawCoordinates.map((polygon) => Array.isArray(polygon) ? polygon[0] : null)
    : [Array.isArray(rawCoordinates) ? rawCoordinates[0] : null];
  const coordinates = candidateRings
    .map((ring) => {
      const points: Array<[number, number]> = [];
      collectCoordinates(ring, points);
      return points;
    })
    .filter((points) => points.length > 0)
    .sort((left, right) => {
      const area = (points: Array<[number, number]>) => {
        const longitudes = points.map(([longitude]) => longitude);
        const latitudes = points.map(([, latitude]) => latitude);
        return (Math.max(...longitudes) - Math.min(...longitudes)) * (Math.max(...latitudes) - Math.min(...latitudes));
      };
      return area(right) - area(left);
    })[0] ?? [];
  if (coordinates.length === 0) return null;
  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  return [
    (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
  ];
}

export default function MunicipalidadesRegionMap({
  municipalities,
  selectedRegion = "Todas",
  onRegionSelect,
}: MunicipalidadesRegionMapProps) {
  const [metric, setMetric] = useState<MunicipalMapMetric>("population");
  const [chartColors, setChartColors] = useState<ChartColors | null>(null);
  const metricOption = MUNICIPAL_MAP_METRICS.find((item) => item.id === metric) ?? MUNICIPAL_MAP_METRICS[0];

  useEffect(() => {
    const readThemeColors = () => {
      const styles = window.getComputedStyle(document.documentElement);
      const read = (name: string) => styles.getPropertyValue(name).trim() || "transparent";
      setChartColors({
        surface2: read("--surface-2"),
        border: read("--border"),
        accent: read("--accent"),
        highlight: read("--highlight"),
        textPrimary: read("--text-primary"),
        textMuted: read("--text-muted"),
        onAccent: read("--on-accent"),
      });
    };

    readThemeColors();
    const observer = new MutationObserver(readThemeColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const regions = useMemo(() => regionsGeoJson.features.map((feature) => {
    const name = String(feature.properties?.region ?? "");
    const rows = municipalities.filter((municipality) => regionMatches(municipality.region, name));
    return { name, rows, value: sumMetric(rows, metric) };
  }), [municipalities, metric]);

  const selectedRows = useMemo(
    () => selectedRegion === "Todas"
      ? []
      : municipalities.filter((municipality) => regionMatches(municipality.region, selectedRegion)),
    [municipalities, selectedRegion],
  );

  const selectedValue = selectedRegion === "Todas" ? null : sumMetric(selectedRows, metric);
  const selectedCenter = useMemo(
    () => selectedRegion === "Todas" ? null : getRegionCenter(selectedRegion),
    [selectedRegion],
  );
  const nationalPopulation = sumMetric(municipalities, "population");
  const nationalBudget = sumMetric(municipalities, "budget");
  const nationalStaff = sumMetric(municipalities, "staff");
  const nationalFcm = sumMetric(municipalities, "fcm");
  const selectedPerCapita = selectedRows.length > 0 ? sumMetric(selectedRows, "perCapita") : null;

  const options = useMemo<EChartsOption>(() => {
    const max = Math.max(...regions.map((region) => region.value ?? 0), 1);
    const colors = chartColors ?? {
      surface2: "transparent",
      border: "transparent",
      accent: "transparent",
      highlight: "transparent",
      textPrimary: "transparent",
      textMuted: "transparent",
      onAccent: "transparent",
    };
    return {
      aria: { enabled: true, decal: { show: true } },
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const item = Array.isArray(params) ? params[0] : params;
          const name = typeof item?.name === "string" ? item.name : "Región";
          const region = regions.find((candidate) => candidate.name === name);
          return `<strong>${name}</strong><br/>${metricOption.shortLabel}: ${formatMunicipalMapValue(region?.value ?? null, metricOption.unit)}<br/>${formatCount(region?.rows.length ?? 0)} comunas`;
        },
      },
      visualMap: {
        min: 0,
        max,
        calculable: false,
        orient: "horizontal",
        left: "center",
        bottom: 0,
        text: ["Mayor", "Menor"],
        textStyle: { color: colors.textMuted },
        inRange: { color: [colors.surface2, colors.accent] },
        outOfRange: { color: [colors.border] },
      },
      series: [{
        name: metricOption.label,
        type: "map",
        map: MAP_NAME,
        nameProperty: "region",
        roam: true,
        center: selectedCenter ?? undefined,
        zoom: selectedRegion === "Todas" ? 1.08 : 2.1,
        scaleLimit: { min: 1, max: 5 },
        selectedMode: "single",
        selected: selectedRegion === "Todas" ? undefined : { [selectedRegion]: true },
        itemStyle: { areaColor: colors.surface2, borderColor: colors.border, borderWidth: 1 },
        label: { show: false },
        emphasis: {
          label: { show: true, color: colors.textPrimary },
          itemStyle: { areaColor: colors.highlight },
        },
        select: {
          label: { show: true, color: colors.onAccent },
          itemStyle: { areaColor: colors.accent },
        },
        data: regions.map((region) => ({ name: region.name, value: region.value ?? undefined })),
      }],
    };
  }, [chartColors, metricOption, regions, selectedCenter, selectedRegion]);

  const handleMapClick = useCallback((params: ECElementEvent) => {
    const data = params.data;
    const dataName = typeof data === "object" && data !== null && "name" in data && typeof data.name === "string"
      ? data.name
      : undefined;
    const region = params.name ?? dataName;
    if (region) onRegionSelect?.(region);
  }, [onRegionSelect]);

  return (
    <section className="card municipal-region-map" aria-labelledby="municipal-map-title">
      <div className="municipal-map-heading">
        <div>
          <div className="eyebrow">Exploración territorial</div>
          <h2 id="municipal-map-title">Del país a la comuna</h2>
          <p>Marca una región para abrir su resumen y revisar sus comunas. Usa la rueda del ratón para acercar y arrastra el mapa para desplazarte.</p>
        </div>
        <label>
          Indicador
          <select value={metric} onChange={(event) => setMetric(event.target.value as MunicipalMapMetric)} aria-label="Indicador del mapa municipal">
            {MUNICIPAL_MAP_METRICS.filter((option) => option.id !== "purchases").map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="municipal-map-layout">
        <div className="municipal-map-visual">
          <div className="municipal-map-canvas">
            <EChartContainer
              options={options}
              height={500}
              maps={[{ name: MAP_NAME, geoJson: regionsGeoJson }]}
              onEvents={{ click: handleMapClick }}
            />
          </div>
          <div className="municipal-map-help">
            <span><strong>Rueda</strong> acercar</span>
            <span><strong>Arrastrar</strong> desplazar</span>
            <span><strong>Clic</strong> seleccionar región</span>
          </div>
        </div>

        <aside className="municipal-map-inspector" aria-live="polite">
          {selectedRegion === "Todas" ? (
            <>
              <div className="municipal-map-inspector-kicker">Vista nacional</div>
              <h3>Chile completo</h3>
              <p className="municipal-map-inspector-lead">Selecciona una región para desplegar sus comunas y comparar sus principales indicadores.</p>
              <div className="municipal-map-kpis">
                <div><strong>16</strong><span>regiones</span></div>
                <div><strong>{formatCount(municipalities.length)}</strong><span>comunas</span></div>
                <div><strong>{formatMunicipalMapValue(nationalPopulation, "number")}</strong><span>población Censo 2024</span></div>
                <div><strong>{formatMunicipalMapValue(nationalBudget, "currency")}</strong><span>presupuesto vigente</span></div>
                <div><strong>{formatMunicipalMapValue(nationalStaff, "number")}</strong><span>funcionarios</span></div>
                <div><strong>{formatMunicipalMapValue(nationalFcm, "percent")}</strong><span>FCM promedio ponderado</span></div>
              </div>
              <div className="municipal-map-inspector-note">Los indicadores faltantes se mantienen como “Sin dato publicado”. No se imputan valores para completar el mapa.</div>
            </>
          ) : (
            <>
              <div className="municipal-map-inspector-kicker">Región seleccionada</div>
              <div className="municipal-map-inspector-title-row">
                <h3>{selectedRegion}</h3>
                <button type="button" className="btn btn-ghost" onClick={() => onRegionSelect?.("Todas")}>Ver país</button>
              </div>
              <div className="municipal-map-selected-metric">
                <strong>{formatMunicipalMapValue(selectedValue, metricOption.unit)}</strong>
                <span>{metricOption.label}</span>
                <small>{availability(selectedRows, metric)}</small>
              </div>
              <div className="municipal-map-kpis municipal-map-kpis-region">
                <div><strong>{selectedRows.length}</strong><span>comunas</span></div>
                <div><strong>{formatMunicipalMapValue(sumMetric(selectedRows, "population"), "number")}</strong><span>población</span></div>
                <div><strong>{formatMunicipalMapValue(sumMetric(selectedRows, "budget"), "currency")}</strong><span>presupuesto</span></div>
                <div><strong>{formatMunicipalMapValue(selectedPerCapita, "currency")}</strong><span>per cápita</span></div>
                <div><strong>{formatMunicipalMapValue(sumMetric(selectedRows, "staff"), "number")}</strong><span>funcionarios</span></div>
                <div><strong>{formatMunicipalMapValue(sumMetric(selectedRows, "fcm"), "percent")}</strong><span>FCM ponderado</span></div>
              </div>
              <div className="municipal-map-communes-heading">
                <span>Comunas de la región</span>
                <small>{selectedRows.length} fichas disponibles</small>
              </div>
              <div className="municipal-map-communes">
                {[...selectedRows].sort((a, b) => a.nombre_comuna.localeCompare(b.nombre_comuna, "es")).map((municipality) => (
                  <Link key={municipality.id} href={`/municipalidades/${municipality.id}`} prefetch={false}>
                    <span><strong>{municipality.nombre_comuna}</strong><small>{formatMunicipalMapValue(municipality.poblacion_censo_2024, "number")} habitantes</small></span>
                    <span className="municipal-map-commune-value">{formatMunicipalMapValue(getMunicipalMapMetric(municipality, metric), metricOption.unit)} <b>↗</b></span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
