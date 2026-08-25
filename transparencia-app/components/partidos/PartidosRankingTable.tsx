"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "@/components/SiteLink";
import { formatCLP, formatPct } from "@/lib/format";
import type { PartidoResumenCompleto } from "@/lib/partido-estadisticas";

interface Props {
  partidos: PartidoResumenCompleto[];
}

type SortField =
  | "escaños"
  | "nombre"
  | "si"
  | "no"
  | "abst"
  | "asistencia"
  | "rebelion"
  | "gastos"
  | "personal"
  | "promedio";

type CoalicionFiltro = "all" | "Oficialismo" | "Oposición" | "Independientes";

const MESES_OPCIONES = [
  { value: "all", label: "Todos los meses (acumulado)" },
  { value: "2026-03", label: "Marzo 2026" },
  { value: "2026-04", label: "Abril 2026" },
  { value: "2026-05", label: "Mayo 2026" },
  { value: "2026-06", label: "Junio 2026" },
  { value: "2026-07", label: "Julio 2026 (Pendiente Cámara)" },
];

export default function PartidosRankingTable({ partidos }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [mesFiltro, setMesFiltro] = useState<string>(() => searchParams.get("mes") || "all");
  const [coalicionFiltro, setCoalicionFiltro] = useState<CoalicionFiltro>(
    () => (searchParams.get("coalicion") as CoalicionFiltro) || "all"
  );
  const [sortField, setSortField] = useState<SortField>(
    () => (searchParams.get("sort") as SortField) || "escaños"
  );
  const [sortAsc, setSortAsc] = useState<boolean>(() => searchParams.get("asc") === "true");

  const updateUrl = (mes: string, coalicion: CoalicionFiltro, sort: SortField, asc: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (mes !== "all") params.set("mes", mes); else params.delete("mes");
    if (coalicion !== "all") params.set("coalicion", coalicion); else params.delete("coalicion");
    if (sort !== "escaños") params.set("sort", sort); else params.delete("sort");
    if (asc) params.set("asc", "true"); else params.delete("asc");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const handleMesChange = (nextMes: string) => {
    setMesFiltro(nextMes);
    updateUrl(nextMes, coalicionFiltro, sortField, sortAsc);
  };

  const handleCoalicionChange = (nextCoalicion: CoalicionFiltro) => {
    setCoalicionFiltro(nextCoalicion);
    updateUrl(mesFiltro, nextCoalicion, sortField, sortAsc);
  };

  const handleSort = (field: SortField) => {
    let nextAsc = false;
    if (sortField === field) {
      nextAsc = !sortAsc;
      setSortAsc(nextAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
    updateUrl(mesFiltro, coalicionFiltro, field, nextAsc);
  };

  const getGastoParaPartido = (p: PartidoResumenCompleto) => {
    if (mesFiltro === "all") return p.gastosTotal;
    return p.gastosPorMes[mesFiltro] ?? 0;
  };

  const getPromedioParaPartido = (p: PartidoResumenCompleto) => {
    const gasto = getGastoParaPartido(p);
    return p.totalEscaños > 0 ? Math.round(gasto / p.totalEscaños) : 0;
  };

  const partidosFiltrados = useMemo(() => {
    if (coalicionFiltro === "all") return partidos;
    return partidos.filter((p) => p.coalicion === coalicionFiltro);
  }, [partidos, coalicionFiltro]);

  const sortedPartidos = useMemo(() => {
    return [...partidosFiltrados].sort((a, b) => {
      let diff = 0;
      switch (sortField) {
        case "nombre":
          diff = a.nombre.localeCompare(b.nombre, "es-CL");
          break;
        case "escaños":
          diff = a.totalEscaños - b.totalEscaños;
          break;
        case "si":
          diff = a.pctSi - b.pctSi;
          break;
        case "no":
          diff = a.pctNo - b.pctNo;
          break;
        case "abst":
          diff = a.pctAbst - b.pctAbst;
          break;
        case "asistencia":
          diff = a.asistencia - b.asistencia;
          break;
        case "rebelion":
          diff = (a.pctRebelion ?? Number.NEGATIVE_INFINITY) - (b.pctRebelion ?? Number.NEGATIVE_INFINITY);
          break;
        case "gastos":
          diff = getGastoParaPartido(a) - getGastoParaPartido(b);
          break;
        case "personal":
          diff = a.personalApoyoTotal - b.personalApoyoTotal;
          break;
        case "promedio":
          diff = getPromedioParaPartido(a) - getPromedioParaPartido(b);
          break;
      }
      return sortAsc ? diff : -diff;
    });
  }, [partidosFiltrados, sortField, sortAsc, mesFiltro]);

  // Subtotal consolidado para la coalición visible
  const subtotalCoalicion = useMemo(() => {
    const totalEscaños = partidosFiltrados.reduce((a, b) => a + b.totalEscaños, 0);
    const totalDiputados = partidosFiltrados.reduce((a, b) => a + b.diputados, 0);
    const totalSenadores = partidosFiltrados.reduce((a, b) => a + b.senadores, 0);
    const totalGastos = partidosFiltrados.reduce((a, b) => a + getGastoParaPartido(b), 0);
    const totalPersonal = partidosFiltrados.reduce((a, b) => a + b.personalApoyoTotal, 0);
    const totalPersonalPersonas = partidosFiltrados.reduce((a, b) => a + b.personalApoyoPersonas, 0);
    const promedioGasto = totalEscaños > 0 ? Math.round(totalGastos / totalEscaños) : 0;
    return {
      totalEscaños,
      totalDiputados,
      totalSenadores,
      totalGastos,
      totalPersonal,
      totalPersonalPersonas,
      promedioGasto,
    };
  }, [partidosFiltrados, mesFiltro]);

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return " ↕";
    return sortAsc ? " ▲" : " ▼";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Barra de Filtros y Controles */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          padding: "1rem",
          background: "var(--surface-2)",
          borderRadius: 10,
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          {/* Chips de filtro por coalición */}
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-3)" }}>Coalición:</span>
            {[
              { key: "all", label: "Todos" },
              { key: "Oficialismo", label: "Oficialismo" },
              { key: "Oposición", label: "Oposición" },
              { key: "Independientes", label: "Independientes" },
            ].map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => handleCoalicionChange(c.key as CoalicionFiltro)}
                className="capsule"
                style={{
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  padding: "0.3rem 0.7rem",
                  background: coalicionFiltro === c.key ? "var(--accent)" : "var(--surface)",
                  color: coalicionFiltro === c.key ? "var(--bg)" : "var(--text-2)",
                  fontWeight: coalicionFiltro === c.key ? 700 : 500,
                  border: coalicionFiltro === c.key ? "1px solid var(--accent)" : "1px solid var(--border)",
                  borderRadius: "6px",
                  transition: "all 0.15s ease",
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Selector de Mes */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <label htmlFor="mes-filtro" style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-3)" }}>
              📅 Período:
            </label>
            <select
              id="mes-filtro"
              value={mesFiltro}
              onChange={(e) => handleMesChange(e.target.value)}
              className="calculator-input"
              style={{
                fontSize: "0.82rem",
                padding: "0.35rem 0.75rem",
                background: "var(--surface)",
                color: "var(--text-1)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                minWidth: 200,
              }}
            >
              {MESES_OPCIONES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ fontSize: "0.75rem", color: "var(--text-3)" }}>
          {partidosFiltrados.length} colectividades · Clic en cabeceras para ordenar
        </div>
      </div>

      {/* Tabla Responsiva con Sticky Column */}
      <div className="table-sticky-col" style={{ overflowX: "auto", background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.82rem",
            minWidth: 1060,
          }}
        >
          <thead>
            <tr
              style={{
                textAlign: "left",
                color: "var(--text-2)",
                fontSize: "0.7rem",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                background: "var(--surface-2)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <th
                style={{ padding: "0.75rem 1rem", cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort("nombre")}
                title="Nombre del partido y sigla institucional"
              >
                Partido {sortIndicator("nombre")}
              </th>
              <th
                style={{ padding: "0.75rem 0.6rem", cursor: "pointer", userSelect: "none" }}
                onClick={() => handleSort("escaños")}
                title="Distribución de escaños en Cámara de Diputados y Senado (período 2026-2030)"
              >
                Escaños {sortIndicator("escaños")}
              </th>
              <th
                style={{ padding: "0.75rem 0.5rem", cursor: "pointer", userSelect: "none", color: "var(--ok)", textAlign: "right" }}
                onClick={() => handleSort("si")}
                title="Porcentaje de votos Afirmativos (A favor) emitidos en sala"
              >
                % Sí {sortIndicator("si")}
              </th>
              <th
                style={{ padding: "0.75rem 0.5rem", cursor: "pointer", userSelect: "none", color: "var(--bad)", textAlign: "right" }}
                onClick={() => handleSort("no")}
                title="Porcentaje de votos En Contra emitidos en sala"
              >
                % No {sortIndicator("no")}
              </th>
              <th
                style={{ padding: "0.75rem 0.5rem", cursor: "pointer", userSelect: "none", color: "var(--warn)", textAlign: "right" }}
                onClick={() => handleSort("abst")}
                title="Porcentaje de Abstenciones emitidas en sala"
              >
                % Abst. {sortIndicator("abst")}
              </th>
              <th
                style={{ padding: "0.75rem 0.5rem", cursor: "pointer", userSelect: "none", textAlign: "right", color: "var(--text-2)" }}
                onClick={() => handleSort("rebelion")}
                title="Tasa de votos disidentes respecto a la mayoría de la bancada (% Rebelión)"
              >
                % Rebelión {sortIndicator("rebelion")}
              </th>
              <th
                style={{ padding: "0.75rem 0.6rem", cursor: "pointer", userSelect: "none", textAlign: "right" }}
                onClick={() => handleSort("asistencia")}
                title="Asistencia a votaciones de sala"
              >
                Asistencia {sortIndicator("asistencia")}
              </th>
              <th
                style={{ padding: "0.75rem 0.75rem", cursor: "pointer", userSelect: "none", textAlign: "right" }}
                onClick={() => handleSort("gastos")}
                title="Gastos operacionales rendidos en Cámara y Senado"
              >
                Gastos Operacionales {sortIndicator("gastos")}
              </th>
              <th
                style={{ padding: "0.75rem 0.75rem", cursor: "pointer", userSelect: "none", textAlign: "right" }}
                onClick={() => handleSort("personal")}
                title="Gasto mensual en asignación de personal de apoyo según la nómina oficial"
              >
                Personal Apoyo {sortIndicator("personal")}
              </th>
              <th
                style={{ padding: "0.75rem 0.75rem", cursor: "pointer", userSelect: "none", textAlign: "right" }}
                onClick={() => handleSort("promedio")}
                title="Promedio de gasto operacional por parlamentario de la bancada"
              >
                Promedio / Parl. {sortIndicator("promedio")}
              </th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "center" }} title="Parlamentarios con rendición sobre total de la bancada">
                Cobertura
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPartidos.map((p) => {
              const gasto = getGastoParaPartido(p);
              const promedio = getPromedioParaPartido(p);

              return (
                <tr
                  key={p.id}
                  style={{
                    borderTop: "1px solid var(--border)",
                    background: p.esIndependiente ? "var(--surface-2)" : undefined,
                    transition: "background 0.15s ease",
                  }}
                  className="hover-row"
                >
                  {/* Partido */}
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <Link
                      href={`/partidos/${p.slug}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.65rem",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      {/* Logo / Badge Oficial */}
                      {p.logo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={p.logo_url}
                          alt={p.sigla}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            flexShrink: 0,
                            objectFit: "contain",
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 6,
                            background: `${p.color_hex}22`,
                            border: `1.5px solid ${p.color_hex}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            color: p.color_hex,
                            flexShrink: 0,
                          }}
                        >
                          {p.sigla}
                        </span>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--text-1)" }}>
                          {p.nombre}
                          {p.esIndependiente && (
                            <span className="badge" style={{ marginLeft: "0.4rem", fontSize: "0.65rem", background: "var(--info-bg)", color: "var(--info)" }}>
                              Categoría Especial
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>
                          {p.sigla} · {p.totalEscaños} parlamentarios · <span style={{ color: "var(--text-2)", fontWeight: 500 }}>{p.coalicion}</span>
                        </div>
                      </div>
                    </Link>
                  </td>

                  {/* Escaños */}
                  <td style={{ padding: "0.75rem 0.6rem", whiteSpace: "nowrap" }}>
                    <strong style={{ color: "var(--text-1)" }}>
                      {p.diputados}D · {p.senadores}S
                    </strong>
                    <span style={{ display: "block", color: "var(--text-3)", fontSize: "0.68rem" }}>
                      {formatPct(p.pctEscaños, 1)} del Congreso
                    </span>
                  </td>

                  {/* % Sí */}
                  <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontFamily: "monospace", color: "var(--ok)", fontWeight: 700 }}>
                    {p.votosCamara.emitidos > 0 || p.votosSenado.emitidos > 0 ? formatPct(p.pctSi) : "—"}
                  </td>

                  {/* % No */}
                  <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontFamily: "monospace", color: "var(--bad)", fontWeight: 700 }}>
                    {p.votosCamara.emitidos > 0 || p.votosSenado.emitidos > 0 ? formatPct(p.pctNo) : "—"}
                  </td>

                  {/* % Abst */}
                  <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontFamily: "monospace", color: "var(--warn)", fontWeight: 700 }}>
                    {p.votosCamara.emitidos > 0 || p.votosSenado.emitidos > 0 ? formatPct(p.pctAbst) : "—"}
                  </td>

                  {/* % Rebelión */}
                  <td style={{ padding: "0.75rem 0.5rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
                    <span style={{ color: p.pctRebelion !== null && p.pctRebelion > 5 ? "var(--warn)" : "var(--text-2)" }}>
                      {formatPct(p.pctRebelion, 1)}
                    </span>
                  </td>

                  {/* Asistencia */}
                  <td style={{ padding: "0.75rem 0.6rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
                    {p.asistencia > 0 ? (
                      <span style={{ color: p.asistencia >= 90 ? "var(--ok)" : p.asistencia >= 75 ? "var(--warn)" : "var(--bad)" }}>
                        {formatPct(p.asistencia)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  {/* Gastos Operacionales */}
                  <td style={{ padding: "0.75rem 0.75rem", textAlign: "right", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                    {gasto > 0 ? (
                      <strong style={{ color: "var(--text-1)" }}>{formatCLP(gasto)}</strong>
                    ) : (
                      <span style={{ color: "var(--text-3)" }}>$0 · Pendiente</span>
                    )}
                  </td>

                  {/* Personal de Apoyo */}
                  <td style={{ padding: "0.75rem 0.75rem", textAlign: "right", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                    {p.personalApoyoTotal > 0 ? (
                      <div>
                        <strong style={{ color: "var(--money)" }}>{formatCLP(p.personalApoyoTotal)}</strong>
                        <span style={{ display: "block", fontSize: "0.65rem", color: "var(--text-3)" }}>
                          {p.personalApoyoPersonas} personas
                        </span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>

                  {/* Promedio / Parl. */}
                  <td style={{ padding: "0.75rem 0.75rem", textAlign: "right", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                    {promedio > 0 ? formatCLP(promedio) : "—"}
                  </td>

                  {/* Cobertura */}
                  <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                    <span className="capsule" style={{ fontSize: "0.68rem", fontFamily: "monospace", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                      {p.coberturaGastos}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Fila Subtotal Consolidado por Coalición */}
          <tfoot>
            <tr
              style={{
                background: "var(--surface-2)",
                borderTop: "2px solid var(--border)",
                fontWeight: 800,
                fontSize: "0.82rem",
                color: "var(--text-1)",
              }}
            >
              <td style={{ padding: "0.85rem 1rem" }}>
                <span style={{ textTransform: "uppercase", fontSize: "0.7rem", color: "var(--text-3)", fontWeight: 700 }}>
                  Subtotal {coalicionFiltro === "all" ? "Congreso Consolidado" : coalicionFiltro}
                </span>
                <div style={{ fontSize: "0.85rem", color: "var(--text-1)", fontWeight: 800 }}>
                  {partidosFiltrados.length} bancadas
                </div>
              </td>
              <td style={{ padding: "0.85rem 0.6rem", whiteSpace: "nowrap" }}>
                <strong>{subtotalCoalicion.totalDiputados}D · {subtotalCoalicion.totalSenadores}S</strong>
                <span style={{ display: "block", color: "var(--text-3)", fontSize: "0.68rem" }}>
                  {subtotalCoalicion.totalEscaños} escaños
                </span>
              </td>
              <td colSpan={4} style={{ padding: "0.85rem 0.5rem", textAlign: "center", color: "var(--text-3)", fontSize: "0.72rem" }}>
                — Resumen Agregado —
              </td>
              <td style={{ padding: "0.85rem 0.6rem", textAlign: "right", color: "var(--text-3)", fontSize: "0.72rem" }}>
                —
              </td>
              <td style={{ padding: "0.85rem 0.75rem", textAlign: "right", fontFamily: "monospace" }}>
                <strong style={{ color: "var(--warn)" }}>{formatCLP(subtotalCoalicion.totalGastos)}</strong>
              </td>
              <td style={{ padding: "0.85rem 0.75rem", textAlign: "right", fontFamily: "monospace" }}>
                {subtotalCoalicion.totalPersonal > 0 ? (
                  <div>
                    <span style={{ color: "var(--money)" }}>{formatCLP(subtotalCoalicion.totalPersonal)}</span>
                    <span style={{ display: "block", fontSize: "0.65rem", color: "var(--text-3)" }}>
                      {subtotalCoalicion.totalPersonalPersonas} asesores
                    </span>
                  </div>
                ) : "—"}
              </td>
              <td style={{ padding: "0.85rem 0.75rem", textAlign: "right", fontFamily: "monospace" }}>
                {subtotalCoalicion.promedioGasto > 0 ? formatCLP(subtotalCoalicion.promedioGasto) : "—"}
              </td>
              <td style={{ padding: "0.85rem 1rem", textAlign: "center", fontSize: "0.72rem", color: "var(--text-3)" }}>
                {subtotalCoalicion.totalEscaños} parl.
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
