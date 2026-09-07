"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { MunicipalidadListItem } from "@/lib/municipalidades-list";
import { getMunicipalMapMetric, MUNICIPAL_MAP_METRICS, type MunicipalMapMetric } from "@/lib/municipalidades-map";
import { getMuniCanonicalSlug } from "@/lib/slug-utils";

interface MunicipalidadesRegionalPanelProps {
  municipalities: readonly MunicipalidadListItem[];
  selectedRegion: string;
  onRegionSelect: (region: string) => void;
}

const RANKING_METRICS: MunicipalMapMetric[] = ["budget", "population", "perCapita", "fcm", "staff"];

function formatCompact(value: number | null, unit: string): string {
  if (value === null || !Number.isFinite(value)) return "Sin dato";
  if (unit === "percent") return `${value.toLocaleString("es-CL", { maximumFractionDigits: 1 })}%`;
  if (unit === "currency") {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toLocaleString("es-CL", { maximumFractionDigits: 1 })} mil MM`;
    if (value >= 1_000_000) return `$${Math.round(value / 1_000_000).toLocaleString("es-CL")} MM`;
    return `$${Math.round(value).toLocaleString("es-CL")}`;
  }
  return Math.round(value).toLocaleString("es-CL");
}

function sumMetric(rows: readonly MunicipalidadListItem[], metric: MunicipalMapMetric): number | null {
  const values = rows.map((row) => getMunicipalMapMetric(row, metric)).filter((value): value is number => value !== null && Number.isFinite(value));
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function averageMetric(rows: readonly MunicipalidadListItem[], metric: MunicipalMapMetric): number | null {
  const total = sumMetric(rows, metric);
  const count = rows.filter((row) => getMunicipalMapMetric(row, metric) !== null).length;
  return total === null || count === 0 ? null : total / count;
}

export default function MunicipalidadesRegionalPanel({ municipalities, selectedRegion, onRegionSelect }: MunicipalidadesRegionalPanelProps) {
  const [expandedRegion, setExpandedRegion] = useState(selectedRegion === "Todas" ? "" : selectedRegion);
  const [rankingMetric, setRankingMetric] = useState<MunicipalMapMetric>("budget");

  const regions = useMemo(() => Array.from(new Set(municipalities.map((row) => row.region))).sort((a, b) => a.localeCompare(b, "es")).map((name) => {
    const rows = municipalities.filter((row) => row.region === name);
    return { name, rows, budget: sumMetric(rows, "budget"), population: sumMetric(rows, "population"), perCapita: averageMetric(rows, "perCapita"), fcm: averageMetric(rows, "fcm"), staff: sumMetric(rows, "staff") };
  }), [municipalities]);

  const rankingOption = MUNICIPAL_MAP_METRICS.find((option) => option.id === rankingMetric) ?? MUNICIPAL_MAP_METRICS[0];
  const ranking = useMemo(() => municipalities.map((municipality) => ({ municipality, value: getMunicipalMapMetric(municipality, rankingMetric) })).filter((row): row is typeof row & { value: number } => row.value !== null).sort((a, b) => b.value - a.value).slice(0, 5), [municipalities, rankingMetric]);
  const rankingMax = ranking[0]?.value ?? 1;
  const selected = regions.find((region) => region.name === expandedRegion) ?? null;

  function selectRegion(region: string) {
    const next = expandedRegion === region ? "" : region;
    setExpandedRegion(next);
    onRegionSelect(next || "Todas");
  }

  return (
    <section className="municipal-regional-panel" aria-labelledby="municipal-regional-title">
      <header className="municipal-regional-header">
        <div>
          <div className="municipal-panel-kicker">Lectura territorial</div>
          <h2 id="municipal-regional-title">Regiones y rankings municipales</h2>
          <p>Compara el territorio primero y entra al detalle sólo cuando encuentres una comuna que quieras revisar.</p>
        </div>
        <Link className="municipal-panel-detail-link" href="/municipalidades?view=table" prefetch={false}>Explorar las 346 comunas →</Link>
      </header>

      <div className="municipal-regional-layout">
        <div className="municipal-regions-column">
          <div className="municipal-panel-section-heading">
            <div><span>01</span><h3>Comparación por región</h3></div>
            <small>{regions.length} regiones · selecciona una para desplegar sus comunas</small>
          </div>
          <div className="municipal-region-cards">
            {regions.map((region) => {
              const isSelected = expandedRegion === region.name;
              return (
                <article className={`municipal-region-card${isSelected ? " is-selected" : ""}`} key={region.name}>
                  <button type="button" className="municipal-region-card-trigger" aria-expanded={isSelected} onClick={() => selectRegion(region.name)}>
                    <span className="municipal-region-card-heading"><strong>{region.name}</strong><b>{region.rows.length} comunas</b></span>
                    <span className="municipal-region-card-values"><span><small>Población</small><strong>{formatCompact(region.population, "number")}</strong></span><span><small>Presupuesto</small><strong>{formatCompact(region.budget, "currency")}</strong></span><span><small>FCM promedio</small><strong>{formatCompact(region.fcm, "percent")}</strong></span></span>
                    <span className="municipal-region-card-action">{isSelected ? "Ocultar detalle" : "Ver comunas"}<b aria-hidden="true">{isSelected ? "−" : "+"}</b></span>
                  </button>
                  {isSelected && selected && (
                    <div className="municipal-region-expanded" aria-label={`Comunas de ${region.name}`}>
                      <div className="municipal-expanded-heading"><span>Comunas de {region.name}</span><small>{region.rows.length} fichas disponibles</small></div>
                      <div className="municipal-expanded-list">
                        {[...selected.rows].sort((a, b) => a.nombre_comuna.localeCompare(b.nombre_comuna, "es")).slice(0, 6).map((municipality) => (
                          <Link key={municipality.id} href={`/municipalidades/${getMuniCanonicalSlug(municipality.id) ?? municipality.id}`} prefetch={false}><span>{municipality.nombre_comuna}</span><b>{formatCompact(getMunicipalMapMetric(municipality, "budget"), "currency")} ↗</b></Link>
                        ))}
                      </div>
                      <Link className="municipal-expanded-all" href={`/municipalidades?region=${encodeURIComponent(region.name)}`} prefetch={false}>Ver las {region.rows.length} comunas de esta región →</Link>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>

        <aside className="municipal-rankings-column" aria-labelledby="municipal-rankings-title">
          <div className="municipal-panel-section-heading municipal-rankings-heading">
            <div><span>02</span><h3 id="municipal-rankings-title">Rankings nacionales</h3></div>
            <label><span className="sr-only">Indicador del ranking</span><select value={rankingMetric} onChange={(event) => setRankingMetric(event.target.value as MunicipalMapMetric)} aria-label="Indicador del ranking municipal">{RANKING_METRICS.map((metric) => <option key={metric} value={metric}>{MUNICIPAL_MAP_METRICS.find((option) => option.id === metric)?.label}</option>)}</select></label>
          </div>
          <p className="municipal-rankings-intro">Las cinco comunas con mayor valor en <strong>{rankingOption.label.toLocaleLowerCase("es")}</strong>. Cada resultado abre su ficha completa.</p>
          <div className="municipal-ranking-list">
            {ranking.map(({ municipality, value }, index) => {
              const width = Math.max(10, Math.round((value / rankingMax) * 100));
              return <Link className="municipal-ranking-row" key={municipality.id} href={`/municipalidades/${getMuniCanonicalSlug(municipality.id) ?? municipality.id}`} prefetch={false}><span className="municipal-ranking-index">{String(index + 1).padStart(2, "0")}</span><span className="municipal-ranking-content"><b>{municipality.nombre_comuna}</b><small>{municipality.region}</small><i><em style={{ width: `${width}%` }} /></i></span><strong>{formatCompact(value, rankingOption.unit)}</strong></Link>;
            })}
          </div>
          <div className="municipal-ranking-note"><b>Comparación rápida</b><span>Usa el selector para alternar entre presupuesto, población, autonomía financiera, dependencia FCM y dotación municipal.</span></div>
        </aside>
      </div>
    </section>
  );
}
