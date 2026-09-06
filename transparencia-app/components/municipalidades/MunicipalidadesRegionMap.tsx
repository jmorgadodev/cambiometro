"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import type { EChartsOption } from "echarts";
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
  type MunicipalMapPurchaseMetric,
} from "@/lib/municipalidades-map";

interface MunicipalidadesRegionMapProps {
  municipalities: readonly MunicipalidadListItem[];
  purchasesById?: Readonly<Record<string, MunicipalMapPurchaseMetric | null>>;
  selectedRegion?: string;
  onRegionSelect?: (region: string) => void;
}

const MAP_NAME = "cambiometro-chile-regiones";

function formatCount(value: number): string {
  return value.toLocaleString("es-CL");
}

export default function MunicipalidadesRegionMap({
  municipalities,
  purchasesById = {},
  selectedRegion = "Todas",
  onRegionSelect,
}: MunicipalidadesRegionMapProps) {
  const [metric, setMetric] = useState<MunicipalMapMetric>("population");

  const metricOption = MUNICIPAL_MAP_METRICS.find((item) => item.id === metric) ?? MUNICIPAL_MAP_METRICS[0];

  const regions = useMemo(() => {
    return regionsGeoJson.features.map((feature) => {
      const name = String(feature.properties?.region ?? "");
      const rows = municipalities.filter((municipality) => regionMatches(municipality.region, name));
      return {
        name,
        rows,
        value: aggregateMunicipalMapMetric(rows, metric, purchasesById),
      };
    });
  }, [municipalities, metric, purchasesById]);

  const selectedRows = selectedRegion === "Todas"
    ? []
    : municipalities.filter((municipality) => regionMatches(municipality.region, selectedRegion));
  const selectedValue = selectedRegion === "Todas"
    ? null
    : aggregateMunicipalMapMetric(selectedRows, metric, purchasesById);

  const options = useMemo<EChartsOption>(() => ({
    aria: { enabled: true, decal: { show: true } },
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0] : params;
        const name = typeof item?.name === "string" ? item.name : "Región";
        const region = regions.find((item) => item.name === name);
        return `<strong>${name}</strong><br/>${metricOption.shortLabel}: ${formatMunicipalMapValue(region?.value ?? null, metricOption.unit)}<br/>${formatCount(region?.rows.length ?? 0)} comunas`;
      },
    },
    visualMap: {
      min: 0,
      max: Math.max(...regions.map((item) => item.value ?? 0), 1),
      calculable: false,
      orient: "horizontal",
      left: "center",
      bottom: 0,
      text: ["Mayor", "Menor"],
      textStyle: { color: "var(--text-muted)" },
      inRange: { color: ["var(--surface-2)", "var(--accent)"] },
      outOfRange: { color: ["var(--border)"] },
    },
    series: [{
      name: metricOption.label,
      type: "map",
      map: MAP_NAME,
      roam: true,
      selectedMode: "single",
      emphasis: { label: { show: true } },
      label: { show: false },
      data: regions.map((region) => ({ name: region.name, value: region.value ?? undefined })),
    }],
  }), [metricOption, regions]);

  const handleMapClick = useCallback((params: { name?: string }) => {
    if (params.name) onRegionSelect?.(params.name);
  }, [onRegionSelect]);

  return (
    <section className="card" aria-labelledby="municipal-map-title" style={{ padding: "1.4rem", marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow">Exploración territorial</div>
          <h2 id="municipal-map-title" style={{ margin: "0.25rem 0 0.35rem", fontSize: "1.35rem" }}>Las municipalidades, de región a comuna</h2>
          <p style={{ margin: 0, color: "var(--text-muted)", maxWidth: 680, fontSize: "0.86rem", lineHeight: 1.55 }}>
            Selecciona un indicador para comparar las 16 regiones y luego abre el detalle de sus comunas. El mapa usa los mismos datos publicados que las tarjetas y la tabla.
          </p>
        </div>
        <label style={{ display: "grid", gap: "0.3rem", minWidth: 230, color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 700 }}>
          Indicador del mapa
          <select value={metric} onChange={(event) => setMetric(event.target.value as MunicipalMapMetric)} aria-label="Indicador del mapa municipal" style={{ minHeight: 40 }}>
            {MUNICIPAL_MAP_METRICS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(240px, 0.8fr)", gap: "1rem", alignItems: "stretch", marginTop: "1.2rem" }}>
        <div style={{ minWidth: 0, border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface-2)", padding: "0.8rem" }}>
          <EChartContainer
            options={options}
            height={430}
            maps={[{ name: MAP_NAME, geoJson: regionsGeoJson }]}
            onEvents={{ click: handleMapClick }}
          />
          <p style={{ margin: "0.4rem 0 0", color: "var(--text-subtle)", fontSize: "0.72rem" }}>
            Arrastra para desplazar y usa la rueda o los controles para acercar. Las regiones sin valor publicado aparecen en neutro.
          </p>
        </div>

        <aside style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "1rem", background: "var(--surface)" }} aria-live="polite">
          <div className="eyebrow">Selección actual</div>
          {selectedRegion === "Todas" ? (
            <>
              <h3 style={{ margin: "0.35rem 0", fontSize: "1.05rem" }}>Chile completo</h3>
              <p style={{ margin: "0 0 1rem", color: "var(--text-muted)", fontSize: "0.8rem", lineHeight: 1.5 }}>
                Haz clic en una región para ver sus comunas y abrir una ficha municipal.
              </p>
              <strong style={{ display: "block", fontSize: "1.5rem", color: "var(--accent)" }}>{formatCount(municipalities.length)}</strong>
              <span style={{ color: "var(--text-muted)", fontSize: "0.76rem" }}>comunas catalogadas</span>
            </>
          ) : (
            <>
              <h3 style={{ margin: "0.35rem 0", fontSize: "1.05rem" }}>{selectedRegion}</h3>
              <strong style={{ display: "block", fontSize: "1.35rem", color: "var(--accent)" }}>{formatMunicipalMapValue(selectedValue, metricOption.unit)}</strong>
              <span style={{ color: "var(--text-muted)", fontSize: "0.76rem" }}>{metricOption.label}</span>
              <div style={{ margin: "1rem 0", paddingTop: "0.8rem", borderTop: "1px solid var(--border)" }}>
                <strong>{selectedRows.length}</strong> comunas con catálogo regional
              </div>
              <div style={{ display: "grid", gap: "0.35rem", maxHeight: 210, overflowY: "auto" }}>
                {selectedRows.sort((a, b) => a.nombre_comuna.localeCompare(b.nombre_comuna, "es")).map((municipality) => (
                  <Link key={municipality.id} href={`/municipalidades/${municipality.id}`} prefetch={false} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", textDecoration: "none", color: "var(--text-primary)", fontSize: "0.78rem", padding: "0.35rem 0", borderBottom: "1px solid var(--border)" }}>
                    <span>{municipality.nombre_comuna}</span>
                    <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatMunicipalMapValue(getMunicipalMapMetric(municipality, metric, purchasesById[municipality.id]), metricOption.unit)}</span>
                  </Link>
                ))}
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => onRegionSelect?.("Todas")} style={{ marginTop: "0.8rem", width: "100%" }}>Ver todas las regiones</button>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
