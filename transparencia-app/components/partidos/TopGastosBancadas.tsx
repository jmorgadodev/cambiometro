"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCLP } from "@/lib/format";
import { getPoliticoSlug } from "@/lib/politico-slugs";
import type { PartidoResumenCompleto } from "@/lib/partido-estadisticas";

export interface TopEquipoDiputado {
  id: string;
  nombre: string;
  partido: string;
  distrito: string | null;
  foto_url: string;
  total: number;
  n: number;
}

interface Props {
  topEquiposDiputados: TopEquipoDiputado[];
  partidos: PartidoResumenCompleto[];
}

export default function TopGastosBancadas({ topEquiposDiputados, partidos }: Props) {
  const [tab, setTab] = useState<"equipos" | "total_bancada" | "promedio_bancada">("equipos");

  const partidosPorTotal = [...partidos]
    .filter((p) => p.gastosTotal > 0)
    .sort((a, b) => b.gastosTotal - a.gastosTotal)
    .slice(0, 5);

  const partidosPorPromedio = [...partidos]
    .filter((p) => p.promedioGastoPorParlamentario > 0)
    .sort((a, b) => b.promedioGastoPorParlamentario - a.promedioGastoPorParlamentario)
    .slice(0, 5);

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      {/* Header y Selector de Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <div className="section-title" style={{ margin: 0 }}>
          🏆 Top Gastos y Asignaciones
        </div>

        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setTab("equipos")}
            className="capsule"
            style={{
              cursor: "pointer",
              fontSize: "0.68rem",
              padding: "0.25rem 0.55rem",
              background: tab === "equipos" ? "var(--accent)" : "var(--surface-2)",
              color: tab === "equipos" ? "var(--surface)" : "var(--text-2)",
              fontWeight: tab === "equipos" ? 700 : 500,
            }}
          >
            Personal de Apoyo
          </button>
          <button
            type="button"
            onClick={() => setTab("total_bancada")}
            className="capsule"
            style={{
              cursor: "pointer",
              fontSize: "0.68rem",
              padding: "0.25rem 0.55rem",
              background: tab === "total_bancada" ? "var(--accent)" : "var(--surface-2)",
              color: tab === "total_bancada" ? "var(--surface)" : "var(--text-2)",
              fontWeight: tab === "total_bancada" ? 700 : 500,
            }}
          >
            Total Bancada
          </button>
          <button
            type="button"
            onClick={() => setTab("promedio_bancada")}
            className="capsule"
            style={{
              cursor: "pointer",
              fontSize: "0.68rem",
              padding: "0.25rem 0.55rem",
              background: tab === "promedio_bancada" ? "var(--accent)" : "var(--surface-2)",
              color: tab === "promedio_bancada" ? "var(--surface)" : "var(--text-2)",
              fontWeight: tab === "promedio_bancada" ? 700 : 500,
            }}
          >
            Promedio / Parl.
          </button>
        </div>
      </div>

      <p style={{ fontSize: "0.72rem", color: "var(--text-3)", margin: "0 0 1rem 0" }}>
        {tab === "equipos"
          ? "Top 5 parlamentarios con mayor asignación de personal de apoyo según la nómina oficial vigente."
          : tab === "total_bancada"
            ? "Top 5 bancadas con mayor monto total acumulado en gastos operacionales (Cámara y Senado)."
            : "Top 5 bancadas con mayor promedio de gasto operacional por parlamentario."}
      </p>

      {/* Lista según Tab */}
      {tab === "equipos" && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {topEquiposDiputados.map((r, index) => (
            <Link
              href={`/politico/${getPoliticoSlug(r.id)}`}
              key={r.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.6rem 0",
                borderBottom: index < topEquiposDiputados.length - 1 ? "1px solid var(--border-subtle)" : "none",
                textDecoration: "none",
                color: "inherit",
              }}
              className="hover-row"
            >
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: index === 0 ? "var(--accent)" : "var(--surface-2)",
                    color: index === 0 ? "var(--surface)" : "var(--text-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.foto_url}
                  alt={r.nombre}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    objectFit: "cover",
                    background: "var(--bg-surface-2)",
                  }}
                />
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>{r.nombre}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                    {r.partido} {r.distrito ? `· ${r.distrito}` : ""}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.82rem", fontFamily: "monospace", fontWeight: 700, color: "var(--text-primary)" }}>
                  {formatCLP(r.total)}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-subtle)" }}>{r.n} personas</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === "total_bancada" && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {partidosPorTotal.map((p, index) => (
            <Link
              href={`/partidos/${p.slug}`}
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.6rem 0",
                borderBottom: index < partidosPorTotal.length - 1 ? "1px solid var(--border-subtle)" : "none",
                textDecoration: "none",
                color: "inherit",
              }}
              className="hover-row"
            >
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: index === 0 ? "var(--accent)" : "var(--surface-2)",
                    color: index === 0 ? "var(--surface)" : "var(--text-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </span>
                {p.logo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={p.logo_url}
                    alt={p.sigla}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 4,
                      flexShrink: 0,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      padding: "0.15rem 0.45rem",
                      borderRadius: 4,
                      background: `${p.color_hex}22`,
                      border: `1px solid ${p.color_hex}`,
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      color: p.color_hex,
                    }}
                  >
                    {p.sigla}
                  </span>
                )}
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>{p.nombre}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                    {p.totalEscaños} parlamentarios ({p.diputados}D · {p.senadores}S)
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.82rem", fontFamily: "monospace", fontWeight: 700, color: "var(--text-primary)" }}>
                  {formatCLP(p.gastosTotal)}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-subtle)" }}>acumulado 2026</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === "promedio_bancada" && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {partidosPorPromedio.map((p, index) => (
            <Link
              href={`/partidos/${p.slug}`}
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.6rem 0",
                borderBottom: index < partidosPorPromedio.length - 1 ? "1px solid var(--border-subtle)" : "none",
                textDecoration: "none",
                color: "inherit",
              }}
              className="hover-row"
            >
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: index === 0 ? "var(--accent)" : "var(--surface-2)",
                    color: index === 0 ? "var(--surface)" : "var(--text-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </span>
                {p.logo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={p.logo_url}
                    alt={p.sigla}
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 4,
                      flexShrink: 0,
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      padding: "0.15rem 0.45rem",
                      borderRadius: 4,
                      background: `${p.color_hex}22`,
                      border: `1px solid ${p.color_hex}`,
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      color: p.color_hex,
                    }}
                  >
                    {p.sigla}
                  </span>
                )}
                <div style={{ lineHeight: 1.3 }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>{p.nombre}</div>
                  <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                    {p.totalEscaños} parlamentarios
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.82rem", fontFamily: "monospace", fontWeight: 700, color: "var(--text-primary)" }}>
                  {formatCLP(p.promedioGastoPorParlamentario)}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-subtle)" }}>promedio / parlamentario</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
