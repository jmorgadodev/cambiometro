"use client";

import { useState, useMemo } from "react";
import { POLITICOS_SEED, SCORES_SEED, PARTIDOS_SEED } from "@/lib/seed-politicos";
import { getPoliticoSlug } from "@/lib/politico-slugs";

function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

export default function ChileMapExplorer() {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

  const hayScores = SCORES_SEED.length > 0;

  // Estadísticas agregadas por Región (solo datos con fuente: nunca se inventa un gasto)
  const statsPorRegion = useMemo(() => {
    const map = new Map<
      string,
      {
        nombreRegion: string;
        politicos: typeof POLITICOS_SEED;
        gastoPromedio: number | null;
        alertasTotales: number | null;
      }
    >();

    for (const pol of POLITICOS_SEED) {
      const region = pol.distrito_region;
      const score = SCORES_SEED.find((s) => s.politico_id === pol.id);
      const gasto = score?.gasto_bruto_mensual ?? null;
      const alertas = typeof score?.total_alertas_criticas === "number" && typeof score.total_alertas_altas === "number"
        ? score.total_alertas_criticas + score.total_alertas_altas
        : null;

      if (!map.has(region)) {
        map.set(region, {
          nombreRegion: region,
          politicos: [pol],
          gastoPromedio: gasto,
          alertasTotales: alertas,
        });
      } else {
        const item = map.get(region)!;
        item.politicos.push(pol);

        if (gasto !== null && item.gastoPromedio !== null) {
          item.gastoPromedio = (item.gastoPromedio * (item.politicos.length - 1) + gasto) / item.politicos.length;
        } else if (gasto !== null && item.gastoPromedio === null) {
          item.gastoPromedio = gasto;
        }

        if (alertas !== null) {
          item.alertasTotales = (item.alertasTotales ?? 0) + alertas;
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => (b.gastoPromedio ?? 0) - (a.gastoPromedio ?? 0));
  }, []);

  const currentRegionData = useMemo(() => {
    if (!selectedRegion) return null;
    return statsPorRegion.find((r) => r.nombreRegion === selectedRegion) || null;
  }, [selectedRegion, statsPorRegion]);

  return (
    <div className="card-flat" style={{ marginBottom: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <div className="section-title" style={{ marginBottom: "0.2rem" }}>
            🗺️ Mapa Regional de Autoridades
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
            Haz clic en cualquier región para ver sus parlamentarios. Gastos y alertas se publicarán cuando el ETL
            provea datos con fuente verificada.
          </p>
        </div>
        {selectedRegion && (
          <button
            onClick={() => setSelectedRegion(null)}
            className="btn btn-ghost"
            style={{ fontSize: "0.8rem", color: "var(--accent)" }}
          >
            Ver todas las regiones ✕
          </button>
        )}
      </div>

      {/* Grid de Regiones */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        {statsPorRegion.map((item) => {
          const isSelected = selectedRegion === item.nombreRegion;

          return (
            <div
              key={item.nombreRegion}
              onClick={() => setSelectedRegion(isSelected ? null : item.nombreRegion)}
              style={{
                padding: "0.85rem",
                borderRadius: 10,
                background: isSelected ? "var(--accent-glow)" : "var(--bg-primary)",
                border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--border-subtle)"}`,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)", marginBottom: "0.3rem" }}>
                {item.nombreRegion.replace("Región ", "")}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                <span>{item.politicos.length} autoridades</span>
                {item.alertasTotales !== null && (
                  <span style={{ color: "var(--warn)", fontWeight: 600 }}>{item.alertasTotales} Banderas</span>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                {item.gastoPromedio !== null && hayScores ? (
                  <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: "0.95rem", color: "var(--accent)" }}>
                    {formatCLP(item.gastoPromedio)}
                  </span>
                ) : (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-subtle)" }}>Sin datos verificados</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detalle de Región Seleccionada */}
      {currentRegionData && (
        <div
          style={{
            padding: "1.25rem",
            background: "var(--bg-primary)",
            borderRadius: 12,
            border: "1px solid var(--accent)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              📍 {currentRegionData.nombreRegion}
            </h3>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {currentRegionData.gastoPromedio !== null && hayScores ? (
                <>
                  Gasto promedio mensual:{" "}
                  <strong style={{ color: "var(--accent)" }}>{formatCLP(currentRegionData.gastoPromedio)}</strong>
                </>
              ) : (
                "Gastos: sin datos verificados"
              )}
            </span>
          </div>

          <div className="section-title" style={{ fontSize: "0.85rem" }}>👥 Parlamentarios en esta Región</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.75rem" }}>
            {currentRegionData.politicos.map((pol) => {
              const score = SCORES_SEED.find((s) => s.politico_id === pol.id);
              const partido = PARTIDOS_SEED.find((p) => p.id === pol.partido_id);

              return (
                <a
                  key={pol.id}
                  href={`/politico/${getPoliticoSlug(pol)}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.6rem 0.85rem",
                    background: "var(--bg-surface)",
                    borderRadius: 8,
                    textDecoration: "none",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)" }}>{pol.nombre_completo}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {partido?.sigla} · {pol.cargo}
                    </div>
                  </div>
                  {score && hayScores && score.gasto_bruto_mensual !== null && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: "0.9rem", color: "var(--accent)" }}>
                        {formatCLP(score.gasto_bruto_mensual)}
                      </div>
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
