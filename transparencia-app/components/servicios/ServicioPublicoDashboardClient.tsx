"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import AccessibleTooltip from "@/components/ui/AccessibleTooltip";
import type { ServicioPublicoEnriquecido, OrdenCompraChileCompra } from "@/lib/servicios-publicos-data";
import OrganismoFuncionariosList from "@/components/OrganismoFuncionariosList";
import { evaluateBudgetSourceAnomaly } from "@/lib/budget-integrity";

interface Props {
  servicio: ServicioPublicoEnriquecido;
  politicoId?: string | null;
}

function formatCLP(n?: number | null) {
  if (n === null || n === undefined || isNaN(n) || n <= 0) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatCompactCLP(n: number) {
  if (!n || n <= 0) return "—";
  if (n >= 1_000_000_000_000) {
    return `$${(n / 1_000_000_000_000).toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} billones`;
  }
  if (n >= 1_000_000_000) {
    // 3 cifras significativas (M2) para evitar pérdida de información en $1.430 mil millones
    return `$${(n / 1_000_000_000).toLocaleString("es-CL", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} mil millones`;
  }
  return `$${(n / 1_000_000).toLocaleString("es-CL", { maximumFractionDigits: 0 })} MM`;
}

export default function ServicioPublicoDashboardClient({ servicio, politicoId }: Props) {
  const [activeTab, setActiveTab] = useState<"presupuesto" | "personal" | "compras" | "lobby">("presupuesto");
  const [comprasPage, setComprasPage] = useState<number>(1);
  const comprasItemsPerPage = 8;

  const pres = servicio.presupuesto;
  const personal = servicio.personal;
  const compras = servicio.compras;
  const resumenLobby = servicio.resumen_lobby;
  const lobby = servicio.audiencias_lobby ?? [];
  const cgr = servicio.auditorias_cgr ?? [];

  // Paginación para órdenes de compra
  const ordenes = compras?.ordenes_recientes ?? [];
  const totalComprasPages = Math.max(1, Math.ceil(ordenes.length / comprasItemsPerPage));
  const currentComprasPage = Math.min(Math.max(1, comprasPage), totalComprasPages);
  const pagedOrdenes = useMemo(() => {
    const start = (currentComprasPage - 1) * comprasItemsPerPage;
    return ordenes.slice(start, start + comprasItemsPerPage);
  }, [ordenes, currentComprasPage, comprasItemsPerPage]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* ═══ 4 KPIS SUPERIORES ═════════════════════════════════════════════════ */}
      <section aria-label="KPIs institucionales">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "1rem",
          }}
        >
          {/* KPI 1: Presupuesto Vigente */}
          <div
            className="card-flat"
            onClick={() => setActiveTab("presupuesto")}
            style={{
              padding: "1.1rem",
              borderTop: `3px solid ${activeTab === "presupuesto" ? "var(--accent)" : "var(--border)"}`,
              cursor: "pointer",
              background: activeTab === "presupuesto" ? "var(--info-bg)" : "var(--surface)",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-subtle)", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
              📊 Presupuesto Vigente DIPRES
            </div>
            <div style={{ fontFamily: "monospace", fontSize: "1.45rem", fontWeight: 900, color: "var(--accent)" }}>
              {pres && pres.vigente_clp > 0 ? formatCompactCLP(pres.vigente_clp) : "—"}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              {pres && pres.vigente_clp > 0 ? (
                `${pres.porcentaje_ejecucion}% ejecutado`
              ) : (
                <>
                  <span>Organismo sin partida presupuestaria individual · datos agregados desde DIPRES</span>
                  <AccessibleTooltip
                    ariaLabel="Explicación de organismo sin partida individual"
                    content={
                      <div>
                        <strong style={{ display: "block", marginBottom: "0.25rem", color: "var(--accent)" }}>
                          Estructura Presupuestaria DIPRES
                        </strong>
                        <span>
                          Este organismo no posee una partida presupuestaria propia en la Ley de Presupuestos del Sector Público; sus asignaciones operativas se encuentran agregadas dentro de la partida consolidada del <strong>{servicio.ministerio_dependiente}</strong>.
                        </span>
                      </div>
                    }
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        color: "var(--accent)",
                        fontSize: "0.6rem",
                        fontWeight: 700,
                      }}
                      title="Ver detalle"
                    >
                      ℹ️
                    </span>
                  </AccessibleTooltip>
                </>
              )}
            </div>
          </div>

          {/* KPI 2: Dotación Total */}
          <div
            className="card-flat"
            onClick={() => setActiveTab("personal")}
            style={{
              padding: "1.1rem",
              borderTop: `3px solid ${activeTab === "personal" ? "var(--ok)" : "var(--border)"}`,
              cursor: "pointer",
              background: activeTab === "personal" ? "var(--ok-bg)" : "var(--surface)",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-subtle)", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
              👥 Dotación de Personal
            </div>
            <div style={{ fontFamily: "monospace", fontSize: "1.45rem", fontWeight: 900, color: "var(--ok)" }}>
              {personal?.dotacion_total !== null && personal?.dotacion_total !== undefined ? `${personal.dotacion_total.toLocaleString("es-CL")} pers.` : "—"}
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              {personal?.dotacion_total !== null && personal?.dotacion_total !== undefined ? "Transparencia Activa CPLT" : "Sin publicaciones en la fuente"}
            </div>
          </div>

          {/* KPI 3: Compras Públicas */}
          <div
            className="card-flat"
            onClick={() => setActiveTab("compras")}
            style={{
              padding: "1.1rem",
              borderTop: `3px solid ${activeTab === "compras" ? "var(--warn)" : "var(--border)"}`,
              cursor: "pointer",
              background: activeTab === "compras" ? "var(--warn-bg)" : "var(--surface)",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-subtle)", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
              🛒 Compras MercadoPúblico
            </div>
            <div style={{ fontFamily: "monospace", fontSize: "1.45rem", fontWeight: 900, color: "var(--warn)" }}>
              {compras?.monto_total_clp !== null && compras?.monto_total_clp !== undefined ? formatCompactCLP(compras.monto_total_clp) : "—"}
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              {compras ? `${compras.procesos_count.toLocaleString("es-CL")} procesos · ChileCompra OCDS` : "Sin publicaciones en la fuente"}
            </div>
          </div>

          {/* KPI 4: Audiencias Lobby & CGR */}
          <div
            className="card-flat"
            onClick={() => setActiveTab("lobby")}
            style={{
              padding: "1.1rem",
              borderTop: `3px solid ${activeTab === "lobby" ? "var(--info)" : "var(--border)"}`,
              cursor: "pointer",
              background: activeTab === "lobby" ? "var(--info-bg)" : "var(--surface)",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700, color: "var(--text-subtle)", letterSpacing: "0.06em", marginBottom: "0.3rem" }}>
              ⚖️ Audiencias & Control CGR
            </div>
            <div style={{ fontFamily: "monospace", fontSize: "1.45rem", fontWeight: 900, color: "var(--info)" }}>
              {lobby.length > 0
                ? `${lobby.length} reuniones`
                : `${resumenLobby?.audiencias_ministerio_tutelar?.length ?? 0} audiencias`}
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
              {cgr.length} auditorías Contraloría
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SELECTOR DE PESTAÑAS (TABS) ═══════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border)",
          gap: "0.5rem",
          overflowX: "auto",
          paddingBottom: "0.25rem",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("presupuesto")}
          className="btn"
          style={{
            background: activeTab === "presupuesto" ? "var(--bg-surface-2)" : "transparent",
            color: activeTab === "presupuesto" ? "var(--accent)" : "var(--text-muted)",
            borderBottom: activeTab === "presupuesto" ? "2px solid var(--accent)" : "2px solid transparent",
            borderRadius: "6px 6px 0 0",
            fontWeight: activeTab === "presupuesto" ? 700 : 500,
            fontSize: "0.9rem",
            padding: "0.6rem 1.1rem",
          }}
        >
          📊 Presupuesto & Finanzas (DIPRES)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("personal")}
          className="btn"
          style={{
            background: activeTab === "personal" ? "var(--bg-surface-2)" : "transparent",
            color: activeTab === "personal" ? "var(--ok)" : "var(--text-muted)",
            borderBottom: activeTab === "personal" ? "2px solid var(--ok)" : "2px solid transparent",
            borderRadius: "6px 6px 0 0",
            fontWeight: activeTab === "personal" ? 700 : 500,
            fontSize: "0.9rem",
            padding: "0.6rem 1.1rem",
          }}
        >
          👥 Nómina & Remuneraciones (Transparencia Activa)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("compras")}
          className="btn"
          style={{
            background: activeTab === "compras" ? "var(--surface-2)" : "transparent",
            color: activeTab === "compras" ? "var(--warn)" : "var(--text-muted)",
            borderBottom: activeTab === "compras" ? "2px solid var(--warn)" : "2px solid transparent",
            borderRadius: "6px 6px 0 0",
            fontWeight: activeTab === "compras" ? 700 : 500,
            fontSize: "0.9rem",
            padding: "0.6rem 1.1rem",
          }}
        >
          🛒 Contrataciones Públicas (ChileCompra)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("lobby")}
          className="btn"
          style={{
            background: activeTab === "lobby" ? "var(--surface-2)" : "transparent",
            color: activeTab === "lobby" ? "var(--info)" : "var(--text-muted)",
            borderBottom: activeTab === "lobby" ? "2px solid var(--info)" : "2px solid transparent",
            borderRadius: "6px 6px 0 0",
            fontWeight: activeTab === "lobby" ? 700 : 500,
            fontSize: "0.9rem",
            padding: "0.6rem 1.1rem",
          }}
        >
          ⚖️ Lobby & Fiscalizaciones (InfoLobby / CGR)
        </button>
      </div>

      {/* ═══ CONTENIDO DE PESTAÑA 1: PRESUPUESTO ════════════════════════════════ */}
      {activeTab === "presupuesto" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {pres && pres.vigente_clp > 0 ? (
            <div className="card" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <span className="badge badge-info" style={{ marginBottom: "0.4rem" }}>
                    DIPRES · Ley Nº 21.796 (Presupuestos 2026) · Partida {pres.partida} {pres.capitulo ? `· Cap. ${pres.capitulo}` : ""} {pres.programa ? `· Prog. ${pres.programa}` : ""}
                  </span>
                  <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: "0.2rem 0 0.3rem", color: "var(--text-primary)" }}>
                    Presupuesto y Ejecución Fiscal Oficial (Ley 21.796)
                  </h2>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                    Datos oficiales consolidados desde la Dirección de Presupuestos (DIPRES), Ministerio de Hacienda y Ley de Presupuestos del Sector Público 2026 (<a href="https://www.bcn.cl/leychile/navegar?idNorma=1219410" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>BCN Ley 21.796 · idNorma 1219410</a>).
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Avance de Ejecución</span>
                  <strong style={{ fontSize: "1.75rem", color: "var(--ok)", fontFamily: "monospace" }}>
                    {pres.porcentaje_ejecucion}%
                  </strong>
                </div>
              </div>

              {/* Grid de cifras presupuestarias */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ padding: "1rem", background: "var(--bg-surface-2)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Presupuesto Ley Inicial</span>
                  <strong style={{ fontSize: "1.25rem", color: "var(--text-primary)", fontFamily: "monospace" }}>
                    {formatCompactCLP(pres.inicial_ley_clp)}
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", marginTop: "0.2rem" }}>
                    {formatCLP(pres.inicial_ley_clp)}
                  </span>
                </div>

                <div style={{ padding: "1rem", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Presupuesto Vigente Modificado</span>
                  <strong style={{ fontSize: "1.25rem", color: "var(--accent)", fontFamily: "monospace" }}>
                    {formatCompactCLP(pres.vigente_clp)}
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", marginTop: "0.2rem" }}>
                    {formatCLP(pres.vigente_clp)}
                  </span>
                </div>

                <div style={{ padding: "1rem", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Gasto Devengado / Ejecutado</span>
                  <strong style={{ fontSize: "1.25rem", color: "var(--ok)", fontFamily: "monospace" }}>
                    {formatCompactCLP(pres.ejecutado_clp)}
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", marginTop: "0.2rem" }}>
                    {formatCLP(pres.ejecutado_clp)}
                  </span>
                </div>

                <div style={{ padding: "1rem", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Saldo Disponible por Ejecutar</span>
                  <strong style={{ fontSize: "1.25rem", color: "var(--warn)", fontFamily: "monospace" }}>
                    {formatCompactCLP(pres.saldo_disponible_clp)}
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", marginTop: "0.2rem" }}>
                    {formatCLP(pres.saldo_disponible_clp)}
                  </span>
                </div>
              </div>

              {/* Barra de progreso */}
              <div style={{ width: "100%", height: 12, background: "var(--surface-2)", borderRadius: 6, overflow: "hidden", marginBottom: "1.5rem" }}>
                <div
                  style={{
                    width: `${Math.min(100, pres.porcentaje_ejecucion)}%`,
                    height: "100%",
                    background: "var(--accent)",
                    borderRadius: 6,
                  }}
                />
              </div>

              {/* Desglose de Subtítulos Presupuestarios (21, 22, 24, 29, 31) con regla M1 (>999%) */}
              {pres.subtitulos && pres.subtitulos.length > 0 && (
                <div style={{ marginBottom: "2rem" }}>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
                    📑 Desglose por Subtítulos Presupuestarios (Gastos 21, 22, 24, 29, 31)
                  </h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                      <thead>
                        <tr style={{ background: "var(--bg-surface-2)", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                          <th style={{ padding: "0.6rem 0.8rem", textAlign: "left" }}>Subtítulo</th>
                          <th style={{ padding: "0.6rem 0.8rem", textAlign: "left" }}>Denominación</th>
                          <th style={{ padding: "0.6rem 0.8rem", textAlign: "right" }}>Presupuesto Inicial</th>
                          <th style={{ padding: "0.6rem 0.8rem", textAlign: "right" }}>Presupuesto Vigente</th>
                          <th style={{ padding: "0.6rem 0.8rem", textAlign: "right" }}>Ejecutado Acum.</th>
                          <th style={{ padding: "0.6rem 0.8rem", textAlign: "right" }}>% Avance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pres.subtitulos.map((sub, i) => {
                          const rawPct = sub.vigente > 0 ? (sub.ejecutado / sub.vigente) * 100 : sub.ejecutado > 0 ? 9999 : 0;
                          const isOverflow = rawPct > 999.9 || !isFinite(rawPct);
                          const integrity = evaluateBudgetSourceAnomaly({ ejecutado: sub.ejecutado, vigente: sub.vigente });
                          const pctDisplay = isOverflow ? "⚠ >999%" : `${rawPct.toFixed(1)}%`;

                          return (
                            <tr key={sub.subtitulo} style={{ borderBottom: "1px solid var(--border-subtle)", background: i % 2 === 0 ? "transparent" : "var(--bg-surface-2)" }}>
                              <td style={{ padding: "0.65rem 0.8rem", fontFamily: "var(--font-mono, monospace)", fontWeight: 800, color: "var(--accent)" }}>
                                Subt. {sub.subtitulo}
                              </td>
                              <td style={{ padding: "0.65rem 0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>
                                {sub.denominacion}
                                {integrity.status === "ALTA" && (
                                  <span style={{ display: "block", marginTop: "0.2rem", color: "var(--warn)", fontSize: "0.68rem", fontWeight: 800 }}>
                                    Hallazgo de integridad ALTA (V7) · valor oficial preservado
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
                                {formatCLP(sub.inicial)}
                              </td>
                              <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", fontFamily: "var(--font-mono, monospace)", fontWeight: 700, color: "var(--text-primary)" }}>
                                {formatCLP(sub.vigente)}
                              </td>
                              <td style={{ padding: "0.65rem 0.8rem", textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: "var(--ok)", fontWeight: 700 }}>
                                {formatCLP(sub.ejecutado)}
                              </td>
                              <td
                                style={{
                                  padding: "0.65rem 0.8rem",
                                  textAlign: "right",
                                  fontFamily: "var(--font-mono, monospace)",
                                  fontWeight: 800,
                                  color: isOverflow ? "var(--warn)" : Number(rawPct) > 60 ? "var(--ok)" : "var(--text-primary)",
                                  cursor: isOverflow ? "help" : "default",
                                }}
                                title={isOverflow ? "Ejecutado supera el vigente por reembolsos/reclasificaciones; revisar clasificación" : undefined}
                              >
                                {pctDisplay}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Desglose de periodos — bar chart */}
              {pres.desglose_mensual && pres.desglose_mensual.length > 0 && (
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
                    📅 Ejecución Mensual Acumulada
                  </h3>
                  {(() => {
                    const maxVal = Math.max(...pres.desglose_mensual.flatMap(m => [m.vigente, m.ejecutado]));
                    const barH = 130;
                    return (
                      <div style={{ overflowX: "auto" }}>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.4rem", minWidth: pres.desglose_mensual.length * 68, height: barH + 52, paddingTop: "0.75rem" }}>
                          {pres.desglose_mensual.map((m) => {
                            const vPct = maxVal > 0 ? (m.vigente / maxVal) * barH : 0;
                            const ePct = maxVal > 0 ? (m.ejecutado / maxVal) * barH : 0;
                            return (
                              <div key={m.period} style={{ flex: 1, minWidth: 56, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
                                <div style={{ width: "100%", display: "flex", justifyContent: "center", gap: "4px", alignItems: "flex-end", height: barH }}>
                                  {/* Vigente */}
                                  <div
                                    title={`Vigente: ${formatCompactCLP(m.vigente)}`}
                                    style={{
                                      width: "44%",
                                      height: Math.max(3, vPct),
                                      background: "var(--accent)",
                                      borderRadius: "4px 4px 0 0",
                                      transition: "height 0.3s ease",
                                    }}
                                  />
                                  {/* Ejecutado */}
                                  <div
                                    title={`Ejecutado: ${formatCompactCLP(m.ejecutado)}`}
                                    style={{
                                      width: "44%",
                                      height: Math.max(3, ePct),
                                      background: "var(--ok)",
                                      borderRadius: "4px 4px 0 0",
                                      transition: "height 0.3s ease",
                                    }}
                                  />
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-primary)", fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>
                                  {m.period}
                                </div>
                                <div style={{ fontSize: "0.7rem", color: "var(--ok)", fontFamily: "monospace", fontWeight: 700, textAlign: "center" }}>
                                  {formatCompactCLP(m.ejecutado)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Legend */}
                        <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.75rem", fontSize: "0.78rem", color: "var(--text-primary)", fontWeight: 600, alignItems: "center" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ display: "inline-block", width: 12, height: 12, background: "var(--accent)", borderRadius: 3 }} />
                            Presupuesto Vigente
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ display: "inline-block", width: 12, height: 12, background: "var(--ok)", borderRadius: 3 }} />
                            Gasto Devengado
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>
          ) : (
            <div className="card" style={{ padding: "1.75rem" }}>
              <span className="badge badge-info" style={{ marginBottom: "0.5rem" }}>Presupuesto Sectorial Subordinado</span>
              <h2 style={{ fontSize: "1.25rem", margin: "0.2rem 0 0.4rem" }}>
                Organismo sin partida presupuestaria individual · datos agregados desde DIPRES
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 1rem" }}>
                Este organismo no cuenta con una partida presupuestaria independiente en la Ley de Presupuestos del Sector Público. Sus recursos operativos y de inversión forman parte de la partida consolidada del <strong>{servicio.ministerio_dependiente}</strong>.
              </p>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <Link href="/servicios-publicos" className="btn btn-secondary" style={{ fontSize: "0.82rem" }}>
                  Ver Ministerios y Partidas Principales →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ CONTENIDO DE PESTAÑA 2: PERSONAL Y REMUNERACIONES ═════════════════ */}
      {activeTab === "personal" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {personal && (
            <div className="card-flat" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
                    👥 Resumen de Dotación Institucional
                  </h3>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Transparencia Activa · Consejo para la Transparencia (CPLT)
                  </span>
                </div>
                <span className="badge badge-ok">Nómina Integrada</span>
              </div>

              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
                {/* KPI cards con precisión M2 */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", flex: "1 1 260px" }}>
                  <div style={{ padding: "0.85rem", background: "var(--bg-surface-2)", borderRadius: 8 }}>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>Dotación Activa</span>
                    <div style={{ fontFamily: "monospace", fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.2rem" }}>
                      {personal.dotacion_total === null ? "—" : `${personal.dotacion_total.toLocaleString("es-CL")} pers.`}
                    </div>
                  </div>

                  <div style={{ padding: "0.85rem", background: "var(--bg-surface-2)", borderRadius: 8 }}>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>Gasto Mensual Salarios</span>
                    <div
                      style={{ fontFamily: "monospace", fontSize: "1.3rem", fontWeight: 800, color: "var(--ok)", marginTop: "0.2rem" }}
                      title={personal.gasto_mensual_clp === null ? "Monto oficial no publicado" : `Monto exacto mensual: ${formatCLP(personal.gasto_mensual_clp)}`}
                    >
                      {personal.gasto_mensual_clp === null ? "—" : formatCompactCLP(personal.gasto_mensual_clp)}
                    </div>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", marginTop: "0.2rem" }}>
                      {personal.gasto_mensual_clp === null ? "Monto oficial no publicado" : formatCLP(personal.gasto_mensual_clp)}
                    </span>
                  </div>
                </div>

                {/* Stacked bar composition */}
                <div style={{ flex: "1 1 260px" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: "0.6rem" }}>
                    Composición de la Dotación
                  </span>
                  {personal.planta_pct !== null && personal.contrata_pct !== null && personal.honorarios_pct !== null ? (
                    <>
                      <div style={{ height: 20, borderRadius: 99, overflow: "hidden", display: "flex", marginBottom: "0.6rem" }}>
                        <div style={{ width: `${personal.planta_pct}%`, background: "var(--accent)" }} title={`Planta: ${personal.planta_pct}%`} />
                        <div style={{ width: `${personal.contrata_pct}%`, background: "var(--ok)" }} title={`Contrata: ${personal.contrata_pct}%`} />
                        <div style={{ width: `${personal.honorarios_pct}%`, background: "var(--warn)" }} title={`Honorarios: ${personal.honorarios_pct}%`} />
                      </div>
                      <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", flexWrap: "wrap" }}>
                        {[
                          { label: "Planta", pct: personal.planta_pct, color: "var(--accent)" },
                          { label: "Contrata", pct: personal.contrata_pct, color: "var(--ok)" },
                          { label: "Honorarios", pct: personal.honorarios_pct, color: "var(--warn)" },
                        ].map((cat) => (
                          <span key={cat.label} style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-muted)" }}>
                            <span style={{ display: "inline-block", width: 10, height: 10, background: cat.color, borderRadius: 2 }} />
                            <strong style={{ color: cat.color }}>{cat.pct}%</strong> {cat.label}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Desglose oficial no publicado.</span>}
                </div>
              </div>
            </div>
          )}

          {/* Tabla y buscador interactivo de funcionarios */}
          <div className="card" style={{ padding: "1.75rem" }}>
            <div style={{ marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0 0 0.3rem", color: "var(--text-primary)" }}>
                📋 Nómina Detallada de Funcionarios y Remuneraciones
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                Consulta directa de sueldos brutos, líquidos, estamentos y asignaciones reportadas por {servicio.nombre}.
              </p>
            </div>

            <OrganismoFuncionariosList organismoId={servicio.id} nombreOrganismo={servicio.nombre} />
          </div>
        </div>
      )}

      {/* ═══ CONTENIDO DE PESTAÑA 3: COMPRAS PÚBLICAS (CHILECOMPRA) ════════════ */}
      {activeTab === "compras" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          {compras ? (
            <div className="card" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <span className="badge badge-warn" style={{ marginBottom: "0.4rem" }}>
                    ChileCompra · MercadoPúblico OCDS
                  </span>
                  <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: "0.2rem 0 0.3rem", color: "var(--text-primary)" }}>
                    Contrataciones y Compras Públicas
                  </h2>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                    Adjudicaciones y procesos publicados por ChileCompra para el RUT jurídico del organismo.
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Total Transado</span>
                  <strong style={{ fontSize: "1.75rem", color: "var(--warn)", fontFamily: "monospace" }}>
                    {compras.monto_total_clp === null ? "—" : formatCompactCLP(compras.monto_total_clp)}
                  </strong>
                </div>
              </div>

              {compras.anomalias_integridad.length > 0 && (
                <div style={{ padding: "1rem", marginBottom: "1.5rem", borderRadius: 8, border: "1px solid var(--warn)", background: "var(--surface-2)" }}>
                  <strong style={{ color: "var(--warn)", display: "block", marginBottom: "0.35rem" }}>
                    Hallazgo de integridad ALTA (V7) · valor oficial preservado
                  </strong>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    {compras.anomalias_integridad.length} orden(es) oficial(es) superan el límite de sanidad de $100.000 millones por relación. Se conservan como evidencia, pero sus montos, proveedores y relaciones están excluidos de totales y rankings.
                  </p>
                  <ul style={{ margin: "0.65rem 0 0", paddingLeft: "1.2rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {compras.anomalias_integridad.map((anomaly) => (
                      <li key={anomaly.id}>
                        {anomaly.titulo ?? "Orden oficial sin título"} · {formatCLP(anomaly.monto_oficial_clp)}{anomaly.source_url ? <> · <a href={anomaly.source_url} target="_blank" rel="noopener noreferrer">fuente ↗</a></> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Distribución de mecanismos de compra */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ padding: "1rem", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Licitación Pública</span>
                  <strong style={{ fontSize: "1.3rem", color: "var(--ok)", fontFamily: "monospace" }}>
                    {compras.pct_licitacion_publica === null ? "—" : `${compras.pct_licitacion_publica}%`}
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", marginTop: "0.2rem" }}>
                    Mecanismo concursal
                  </span>
                </div>

                <div style={{ padding: "1rem", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Trato Directo</span>
                  <strong style={{ fontSize: "1.3rem", color: "var(--bad)", fontFamily: "monospace" }}>
                    {compras.pct_trato_directo === null ? "—" : `${compras.pct_trato_directo}%`}
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", marginTop: "0.2rem" }}>
                    Contratación excepcional
                  </span>
                </div>

                <div style={{ padding: "1rem", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Convenio Marco</span>
                  <strong style={{ fontSize: "1.3rem", color: "var(--accent)", fontFamily: "monospace" }}>
                    {compras.pct_convenio_marco === null ? "—" : `${compras.pct_convenio_marco}%`}
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", marginTop: "0.2rem" }}>
                    Catálogo estandarizado
                  </span>
                </div>

                <div style={{ padding: "1rem", background: "var(--surface-2)", borderRadius: 8, border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>Procesos</span>
                  <strong style={{ fontSize: "1.3rem", color: "var(--text-primary)", fontFamily: "monospace" }}>
                    {compras.procesos_count.toLocaleString("es-CL")}
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", marginTop: "0.2rem" }}>
                    Procesos OCDS publicados
                  </span>
                </div>
              </div>

              {/* Serie Mensual 2026 de Montos Transados */}
              {compras.serie_mensual_2026 && compras.serie_mensual_2026.length > 0 && (
                <div style={{ marginBottom: "2rem" }}>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
                    📊 Serie Mensual de Compras 2026 (Montos Transados en MercadoPúblico)
                  </h3>
                  {(() => {
                    const montosPublicados = compras.serie_mensual_2026
                      .map((month) => month.monto_clp)
                      .filter((amount): amount is number => typeof amount === "number");
                    const maxMonto = montosPublicados.length > 0 ? Math.max(...montosPublicados) : 0;
                    const barH = 110;
                    return (
                      <div style={{ overflowX: "auto" }}>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.6rem", minWidth: compras.serie_mensual_2026.length * 75, height: barH + 45, paddingTop: "0.5rem" }}>
                          {compras.serie_mensual_2026.map((m) => {
                            const bPct = maxMonto > 0 && m.monto_clp !== null ? (m.monto_clp / maxMonto) * barH : 0;
                            return (
                              <div key={m.period} style={{ flex: 1, minWidth: 65, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
                                <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "flex-end", height: barH }}>
                                  <div
                                    title={`${m.period}: ${m.monto_clp === null ? "monto oficial no publicado" : formatCLP(m.monto_clp)} (${m.procesos_count} procesos)`}
                                    style={{
                                      width: "65%",
                                      height: Math.max(4, bPct),
                                      background: "var(--warn)",
                                      borderRadius: "4px 4px 0 0",
                                      transition: "height 0.3s ease",
                                    }}
                                  />
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "var(--text-primary)", fontWeight: 600 }}>
                                  {m.period}
                                </div>
                                <div style={{ fontSize: "0.7rem", color: "var(--warn)", fontFamily: "monospace", fontWeight: 700 }}>
                                  {m.monto_clp === null ? "—" : formatCompactCLP(m.monto_clp)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tabla Top Proveedores con enlace */}
              {compras.top_proveedores && compras.top_proveedores.length > 0 && (
                <div style={{ marginBottom: "2rem" }}>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.75rem" }}>
                    🏆 Principales Proveedores Adjudicados
                  </h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                          <th style={{ padding: "0.6rem" }}>Razón Social</th>
                          <th style={{ padding: "0.6rem" }}>RUT Proveedor</th>
                          <th style={{ padding: "0.6rem", textAlign: "right" }}>N° Procesos</th>
                          <th style={{ padding: "0.6rem", textAlign: "right" }}>Monto Total</th>
                          <th style={{ padding: "0.6rem", textAlign: "center" }}>MercadoPúblico</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compras.top_proveedores.map((p, i) => (
                          <tr key={p.id} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "var(--surface-2)" }}>
                            <td style={{ padding: "0.75rem 0.6rem", fontWeight: 700, color: "var(--text-primary)" }}>{p.nombre}</td>
                            <td style={{ padding: "0.75rem 0.6rem", color: "var(--text-muted)", fontFamily: "monospace" }}>{p.rut ?? "—"}</td>
                            <td style={{ padding: "0.75rem 0.6rem", textAlign: "right", color: "var(--text-primary)" }}>{p.procesos}</td>
                            <td style={{ padding: "0.75rem 0.6rem", textAlign: "right", color: "var(--warn)", fontWeight: 800, fontFamily: "monospace" }}>
                              {formatCLP(p.monto_total_clp)}
                            </td>
                            <td style={{ padding: "0.75rem 0.6rem", textAlign: "center" }}>
                              <a
                                href={p.url_mercadopublico || `https://www.mercadopublico.cl/Portal/Modules/Site/BusquedaAvanzada.aspx?r=${p.rut || ""}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost"
                                style={{ fontSize: "0.72rem", padding: "0.25rem 0.5rem" }}
                              >
                                Ficha Proveedor ↗
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

                  {/* Tabla paginada de adjudicaciones OCDS (trazabilidad por fila) */}
              {ordenes.length > 0 && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                      📋 Registro Detallado de Adjudicaciones ({ordenes.length})
                    </h3>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Página {currentComprasPage} de {totalComprasPages}
                    </span>
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                      <thead>
                        <tr style={{ background: "var(--bg-surface-2)", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "0.74rem", textTransform: "uppercase" }}>
                          <th style={{ padding: "0.6rem 0.75rem", textAlign: "left" }}>Fecha</th>
                          <th style={{ padding: "0.6rem 0.75rem", textAlign: "left" }}>Modalidad</th>
                          <th style={{ padding: "0.6rem 0.75rem", textAlign: "left" }}>Descripción de Compra</th>
                          <th style={{ padding: "0.6rem 0.75rem", textAlign: "left" }}>Proveedor / RUT</th>
                          <th style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>Monto CLP</th>
                          <th style={{ padding: "0.6rem 0.75rem", textAlign: "center" }}>Enlace Oficial</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedOrdenes.map((ord, i) => (
                          <tr key={ord.ocid} style={{ borderBottom: "1px solid var(--border-subtle)", background: i % 2 === 0 ? "transparent" : "var(--bg-surface-2)" }}>
                            <td style={{ padding: "0.65rem 0.75rem", fontFamily: "var(--font-mono, monospace)", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                              {ord.fecha}
                            </td>
                            <td style={{ padding: "0.65rem 0.75rem", whiteSpace: "nowrap" }}>
                              <span
                                className={`badge ${
                                  ord.modalidad === "Licitación Pública"
                                    ? "badge-ok"
                                    : ord.modalidad === "Trato Directo"
                                    ? "badge-warn"
                                    : "badge-info"
                                }`}
                                style={{ fontSize: "0.68rem" }}
                              >
                                {ord.modalidad}
                              </span>
                            </td>
                            <td style={{ padding: "0.65rem 0.75rem", color: "var(--text-primary)", fontWeight: 600, maxWidth: 280 }}>
                              {ord.descripcion}
                              <div style={{ fontSize: "0.68rem", color: "var(--text-subtle)", fontFamily: "var(--font-mono, monospace)" }}>
                                OCID: {ord.ocid}
                              </div>
                            </td>
                            <td style={{ padding: "0.65rem 0.75rem", color: "var(--text-primary)" }}>
                              <strong>{ord.proveedor}</strong>
                              {ord.proveedor_rut && (
                                <span style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "monospace" }}>
                                  {ord.proveedor_rut}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "0.65rem 0.75rem", textAlign: "right", fontFamily: "var(--font-mono, monospace)", fontWeight: 800, color: "var(--warn)", whiteSpace: "nowrap" }}>
                              {formatCLP(ord.monto_total_clp)}
                            </td>
                            <td style={{ padding: "0.65rem 0.75rem", textAlign: "center", whiteSpace: "nowrap" }}>
                              <a
                                href={ord.url_mercadopublico}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-ghost"
                                style={{ fontSize: "0.72rem", padding: "0.25rem 0.55rem" }}
                              >
                                Ver en MercadoPúblico ↗
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginador de órdenes */}
                  {totalComprasPages > 1 && (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", marginTop: "1rem" }}>
                      <button
                        type="button"
                        disabled={currentComprasPage <= 1}
                        onClick={() => setComprasPage(currentComprasPage - 1)}
                        className="btn btn-secondary"
                        style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", opacity: currentComprasPage <= 1 ? 0.4 : 1 }}
                      >
                        ‹ Anterior
                      </button>
                      <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {currentComprasPage} / {totalComprasPages}
                      </span>
                      <button
                        type="button"
                        disabled={currentComprasPage >= totalComprasPages}
                        onClick={() => setComprasPage(currentComprasPage + 1)}
                        className="btn btn-secondary"
                        style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", opacity: currentComprasPage >= totalComprasPages ? 0.4 : 1 }}
                      >
                        Siguiente ›
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            <div className="card" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <span className="badge badge-warn">ChileCompra · OCDS</span>
              </div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: "0 0 0.5rem", color: "var(--text-primary)" }}>
                Sin compras registradas en MercadoPúblico
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                Sin enlace verificable por RUT jurídico entre este organismo y ChileCompra OCDS. Este organismo no registra procesos ni órdenes de compra adjudicadas bajo su RUT jurídico en el estándar OCDS de ChileCompra; los montos se mantienen ausentes sin estimaciones artificiales (Regla R10).
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══ CONTENIDO DE PESTAÑA 4: LOBBY & FISCALIZACIÓN (S8) ════════════════ */}
      {activeTab === "lobby" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
          
          {/* Audiencias InfoLobby */}
          <div className="card" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <span className="badge badge-info" style={{ marginBottom: "0.3rem" }}>Ley 20.730 · Plataforma InfoLobby</span>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0.2rem 0 0", color: "var(--text-primary)" }}>
                  🏛️ Audiencias y Reuniones de Lobby Registradas
                </h2>
              </div>
              <span className={`badge ${lobby.length > 0 ? "badge-ok" : "badge-warn"}`}>
                {lobby.length > 0 ? `${lobby.length} reuniones directas` : "0 audiencias directas"}
              </span>
            </div>

            {/* Tarjetas de Agregados InfoLobby */}
            {resumenLobby && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                {/* Conteo por año */}
                <div style={{ padding: "1rem", background: "var(--bg-surface-2)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                    Distribución por Año
                  </span>
                  <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
                    {Object.entries(resumenLobby.conteo_por_ano).map(([yr, count]) => (
                      <span key={yr} className="badge badge-info" style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}>
                        {yr}: <strong>{count}</strong>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Top Gestores */}
                <div style={{ padding: "1rem", background: "var(--bg-surface-2)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                    Top Gestores de Interés
                  </span>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-primary)", marginTop: "0.3rem" }}>
                    {resumenLobby.top_gestores.slice(0, 2).map((g, i) => (
                      <div key={i} style={{ marginBottom: "0.2rem" }}>
                        • <strong>{g.nombre}</strong> <small style={{ color: "var(--text-muted)" }}>({g.conteo} aud.)</small>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Materias */}
                <div style={{ padding: "1rem", background: "var(--bg-surface-2)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700, display: "block" }}>
                    Materias más Tratadas
                  </span>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-primary)", marginTop: "0.3rem" }}>
                    {resumenLobby.top_materias.slice(0, 2).map((m, i) => (
                      <div key={i} style={{ marginBottom: "0.2rem" }}>
                        • {m.materia} <small style={{ color: "var(--text-muted)" }}>({m.conteo})</small>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CASO A: TIENE AUDIENCIAS DIRECTAS */}
            {lobby.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {lobby.map((aud) => (
                  <div key={aud.id} style={{ padding: "1rem 1.2rem", background: "var(--bg-surface-2)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                          <span style={{ fontSize: "0.72rem", color: "var(--accent)", fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>
                            📅 {aud.fecha}
                          </span>
                          {aud.forma && (
                            <span className="badge badge-info" style={{ fontSize: "0.68rem" }}>
                              {aud.forma}
                            </span>
                          )}
                          {aud.lugar && (
                            <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)" }}>
                              📍 {aud.lugar}
                            </span>
                          )}
                        </div>

                        <strong style={{ fontSize: "0.92rem", color: "var(--text-primary)", display: "block", lineHeight: 1.3 }}>
                          {aud.materia}
                        </strong>

                        {aud.objeto && aud.objeto !== aud.materia && (
                          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                            <em>Objeto: {aud.objeto}</em>
                          </div>
                        )}

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.5rem", marginTop: "0.5rem", fontSize: "0.76rem" }}>
                          <div>
                            <span style={{ color: "var(--text-subtle)" }}>Sujeto Pasivo:</span>{" "}
                            <strong style={{ color: "var(--text-primary)" }}>{aud.sujeto_pasivo}</strong> ({aud.cargo_sujeto ?? "Autoridad Institucional"})
                          </div>
                          <div>
                            <span style={{ color: "var(--text-subtle)" }}>Gestor / Solicitante:</span>{" "}
                            <strong style={{ color: "var(--text-primary)" }}>{aud.gestor_interes || aud.solicitante}</strong>
                          </div>
                        </div>

                        {aud.asistentes && (
                          <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                            👥 <strong>Asistentes:</strong> {aud.asistentes}
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: "right" }}>
                        {aud.url && (
                          <a href={aud.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: "0.72rem", padding: "0.25rem 0.6rem" }}>
                            Ver en InfoLobby ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* CASO B: S8 LOBBY CON CONTEXTO (0 AUDIENCIAS DIRECTAS) */
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* 1. Honestidad: 0 audiencias directas */}
                <div style={{ padding: "0.9rem 1.1rem", background: "var(--bg-surface-2)", borderRadius: 8, border: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                  <div>
                    <span className="badge badge-info" style={{ marginBottom: "0.25rem" }}>0 audiencias directas en el período</span>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                      Esta institución no registra audiencias directas a su nombre en InfoLobby. A continuación se presenta el contexto de su <strong>ministerio tutelar</strong> y menciones sectoriales.
                    </div>
                  </div>
                  <a href="https://www.infolobby.cl" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ fontSize: "0.75rem" }}>
                    Verificar en InfoLobby ↗
                  </a>
                </div>

                {/* 2. Audiencias del Ministerio Tutelar */}
                {resumenLobby?.audiencias_ministerio_tutelar && resumenLobby.audiencias_ministerio_tutelar.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: "0.98rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.65rem" }}>
                      🏛️ Audiencias del ministerio tutelar ({resumenLobby.nombre_ministerio_tutelar || "Ministerio Dependiente"}) ({resumenLobby.audiencias_ministerio_tutelar.length})
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                      {resumenLobby.audiencias_ministerio_tutelar.map((aud) => (
                        <div key={aud.id} style={{ padding: "0.85rem 1rem", background: "var(--bg-surface-2)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" }}>
                            <div style={{ flex: 1, minWidth: 260 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.25rem" }}>
                                <span style={{ fontSize: "0.72rem", color: "var(--accent)", fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>
                                  📅 {aud.fecha}
                                </span>
                                <span className="badge badge-info" style={{ fontSize: "0.68rem" }}>Ministerio Tutelar</span>
                              </div>
                              <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)", display: "block" }}>
                                {aud.materia}
                              </strong>
                              <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                                Sujeto Pasivo: <strong style={{ color: "var(--text-primary)" }}>{aud.sujeto_pasivo}</strong> ({aud.cargo_sujeto ?? "Autoridad Ministerial"}) · Gestor: <strong style={{ color: "var(--text-primary)" }}>{aud.gestor_interes || aud.solicitante}</strong>
                              </div>
                            </div>
                            {aud.url && (
                              <a href={aud.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: "0.72rem", padding: "0.25rem 0.55rem" }}>
                                Ver en InfoLobby ↗
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Menciones Sectoriales */}
                {resumenLobby?.menciones_sectoriales && resumenLobby.menciones_sectoriales.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: "0.98rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.65rem" }}>
                      🔍 Mencionado en {resumenLobby.total_menciones_sector} audiencias del sector
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                      {resumenLobby.menciones_sectoriales.map((aud) => (
                        <div key={aud.id} style={{ padding: "0.85rem 1rem", background: "var(--bg-surface-2)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem", flexWrap: "wrap" }}>
                            <div style={{ flex: 1, minWidth: 260 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.25rem" }}>
                                <span style={{ fontSize: "0.72rem", color: "var(--accent)", fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>
                                  📅 {aud.fecha}
                                </span>
                                <span className="badge badge-warn" style={{ fontSize: "0.68rem" }}>Mención Sectorial</span>
                              </div>
                              <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)", display: "block" }}>
                                {aud.materia}
                              </strong>
                              <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
                                Sujeto Pasivo: <strong style={{ color: "var(--text-primary)" }}>{aud.sujeto_pasivo}</strong> · Gestor: <strong style={{ color: "var(--text-primary)" }}>{aud.gestor_interes || aud.solicitante}</strong>
                              </div>
                            </div>
                            {aud.url && (
                              <a href={aud.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: "0.72rem", padding: "0.25rem 0.55rem" }}>
                                Ver en InfoLobby ↗
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Auditorías Contraloría CGR */}
          <div className="card" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <span className="badge badge-warn" style={{ marginBottom: "0.3rem" }}>Contraloría General de la República</span>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0.2rem 0 0", color: "var(--text-primary)" }}>
                  ⚖️ Auditorías y Fiscalizaciones CGR
                </h2>
              </div>
              <span className="badge badge-info">{cgr.length} informes</span>
            </div>

            {cgr.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {cgr.map((aud) => (
                  <div key={aud.id} style={{ padding: "0.85rem 1rem", background: "var(--bg-surface-2)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                      <div>
                        <strong style={{ fontSize: "0.88rem", color: "var(--text-primary)", display: "block" }}>
                          {aud.titulo}
                        </strong>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Área: {aud.area ?? "Auditoría Ordinaria"} · {aud.fecha}
                        </span>
                      </div>
                      {aud.url && (
                        <a href={aud.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: "0.72rem", padding: "0.25rem 0.6rem" }}>
                          Dictamen CGR ↗
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "1rem", background: "var(--bg-surface-2)", borderRadius: 8 }}>
                <span style={{ color: "var(--ok)", fontWeight: 700 }}>✓ Sin observaciones críticas vigentes</span>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.3rem 0 0", lineHeight: 1.6 }}>
                  No se registran auditorías ordinarias con sanciones pendientes emitidas por Contraloría en el período fiscalizado.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
