"use client";

import { useEffect } from "react";
import Link from "next/link";
import { formatMontoConsolidado } from "@/lib/format";
import type { CrossEdge, EvidenceRecord } from "@/lib/data-contracts";

interface CrucesDetailDrawerProps {
  cross: CrossEdge | null;
  isLoading?: boolean;
  onClose: () => void;
}

import {
  DICCIONARIO_CRUCES_ES,
  ENTIDAD_TIPO_ES,
  traducirPredicado,
  traducirTipoEntidad,
  formatNombreInstitucional,
  formatearFuenteYConfianza,
} from "@/lib/diccionario-cruces";

export {
  DICCIONARIO_CRUCES_ES,
  ENTIDAD_TIPO_ES,
  traducirPredicado,
  traducirTipoEntidad,
  formatNombreInstitucional,
  formatearFuenteYConfianza,
};

export const FUENTE_CONFIANZA_ES: Record<string, string> = {
  infoprobidad: "Declaraciones InfoProbidad",
  official_declaration_json: "Declaraciones InfoProbidad",
  official_infoprobidad_id: "Declaraciones InfoProbidad",
  declaration: "Declaraciones InfoProbidad",
  contraloria: "Informes CGR",
  cgr: "Informes CGR",
  official_report_number: "Informes CGR",
  audit: "Informes CGR",
  chilecompra: "Órdenes ChileCompra",
  ocds: "Órdenes ChileCompra",
  purchase: "Órdenes ChileCompra",
  contract: "Órdenes ChileCompra",
  "CL-MP": "Órdenes ChileCompra",
  infolobby: "Audiencias InfoLobby",
  lobby: "Audiencias InfoLobby",
  "ley-19862": "Transferencias Ley 19.862",
  transfer: "Transferencias Ley 19.862",
  camara: "Votaciones Congreso",
  senado: "Votaciones Congreso",
  congreso: "Votaciones Congreso",
  vote: "Votaciones Congreso",
  attendance: "Asistencia Congreso",
  expense: "Gastos Parlamentarios",
  authority: "Nómina Oficial Congreso",
  sinim: "Indicadores SINIM",
  territorial_code: "Indicadores SINIM",
  dipres: "Presupuesto DIPRES",
  budget_execution: "Presupuesto DIPRES",
  editorial_review: "Revisión Documental Oficial",
  official_id: "Registro Oficial del Estado",
};

export default function CrucesDetailDrawer({ cross, isLoading = false, onClose }: CrucesDetailDrawerProps) {
  const showSkeleton = isLoading;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (cross || isLoading) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [cross, isLoading, onClose]);

  if (!cross && !isLoading) return null;

  return (
    <div
      className="cruces-drawer-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <div className="cruces-drawer-panel">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
          <div>
            <span style={{ fontSize: "0.7rem", color: "var(--accent)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
              Detalle del Cruce Documental
            </span>
            <h3 id="drawer-title" style={{ margin: "0.25rem 0 0", fontSize: "1.15rem", color: "var(--text-1)", fontWeight: 800 }}>
              {cross ? `${formatNombreInstitucional(cross.fromEntity.name).display} ↔ ${formatNombreInstitucional(cross.toEntity.name).display}` : "Cargando cruce..."}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              color: "var(--text-muted)",
              cursor: "pointer",
              lineHeight: 1,
              padding: "0.2rem 0.5rem",
            }}
            aria-label="Cerrar detalle"
          >
            &times;
          </button>
        </div>

        {/* SKELETON (<100ms) con las 4 cajas pulsantes */}
        {showSkeleton || !cross ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }} aria-busy="true" aria-label="Cargando información">
            <div style={{ height: 75, background: "var(--surface-2)", borderRadius: 8, animation: "pulse 1.2s infinite" }} />
            <div style={{ height: 75, background: "var(--surface-2)", borderRadius: 8, animation: "pulse 1.2s infinite" }} />
            <div style={{ height: 60, background: "var(--surface-2)", borderRadius: 8, animation: "pulse 1.2s infinite" }} />
            <div style={{ height: 120, background: "var(--surface-2)", borderRadius: 8, animation: "pulse 1.2s infinite" }} />
          </div>
        ) : (
          <>
            {/* 1. Entidades involucradas */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div className="card" style={{ padding: "0.85rem 1rem", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  Entidad Origen ({traducirTipoEntidad(cross.fromEntity.kind)})
                </span>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-1)", marginTop: "0.15rem" }}>
                  {formatNombreInstitucional(cross.fromEntity.name).display}
                </div>
                <Link prefetch={false}
                  href={`/entidades/${cross.fromEntity.id}?from_cruce=${encodeURIComponent(cross.relation.id)}&q=${encodeURIComponent(cross.toEntity.name)}#reg-${cross.evidence[0]?.id || ""}`}
                  style={{ fontSize: "0.75rem", color: "var(--accent)", textDecoration: "none", marginTop: "0.3rem", display: "inline-block", fontWeight: 600 }}
                >
                  Ver ficha institucional →
                </Link>
              </div>

              <div className="card" style={{ padding: "0.85rem 1rem", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                  Entidad Destino ({traducirTipoEntidad(cross.toEntity.kind)})
                </span>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-1)", marginTop: "0.15rem" }}>
                  {formatNombreInstitucional(cross.toEntity.name).display}
                </div>
                <Link prefetch={false}
                  href={`/entidades/${cross.toEntity.id}?from_cruce=${encodeURIComponent(cross.relation.id)}&q=${encodeURIComponent(cross.fromEntity.name)}#reg-${cross.evidence[0]?.id || ""}`}
                  style={{ fontSize: "0.75rem", color: "var(--accent)", textDecoration: "none", marginTop: "0.3rem", display: "inline-block", fontWeight: 600 }}
                >
                  Ver ficha institucional →
                </Link>
              </div>
            </div>

            {/* 2. Resumen del Vínculo */}
            {(() => {
              const calculatedAmount =
                (cross.totalAmountClp && cross.totalAmountClp > 0)
                  ? cross.totalAmountClp
                  : cross.evidence.reduce((sum, e) => sum + (e.amount?.amountClp || 0), 0);
              return (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="card" style={{ padding: "0.75rem 1rem", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Tipo de Vínculo</span>
                    <strong style={{ display: "block", fontSize: "0.88rem", color: "var(--text-1)", marginTop: "0.2rem" }}>
                      {traducirPredicado(cross.relation.predicate)}
                    </strong>
                  </div>
                  <div className="card" style={{ padding: "0.75rem 1rem", background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Monto Consolidado</span>
                    <strong style={{ display: "block", fontSize: "0.88rem", color: calculatedAmount > 0 ? "var(--ok)" : "var(--text-muted)", marginTop: "0.2rem", fontFamily: "var(--font-mono, monospace)" }}>
                      {calculatedAmount > 0 ? formatMontoConsolidado(calculatedAmount) : "No monetario"}
                    </strong>
                  </div>
                </div>
              );
            })()}

            {/* 3. Fuente y Confianza (Alto contraste y legibilidad absoluta) */}
            {(() => {
              const info = formatearFuenteYConfianza(
                cross.evidence[0]?.sourceId,
                cross.relation.reconciliation?.method,
                cross.relation.reconciliation?.confidence
              );
              return (
                <div
                  className="card"
                  style={{
                    padding: "0.95rem 1.1rem",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    flexShrink: 0,
                    overflow: "visible",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: "var(--text-3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        fontWeight: 700,
                      }}
                    >
                      Fuente y Confianza Oficial
                    </span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "0.15rem 0.45rem",
                        borderRadius: 4,
                        background: "var(--color-success-bg, var(--surface-2))",
                        color: "var(--color-success, var(--text-1))",
                        border: "1px solid var(--color-success-border, var(--border))",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.2rem",
                      }}
                    >
                      ✓ {info.confianzaPct} Verificado
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: "0.92rem",
                      fontWeight: 800,
                      color: "var(--text-1)",
                      lineHeight: 1.3,
                      marginTop: "0.15rem",
                    }}
                  >
                    {info.fuenteNombre || info.nombre}
                  </div>

                  <div
                    style={{
                      fontSize: "0.78rem",
                      color: "var(--text-2)",
                      marginTop: "0.25rem",
                      lineHeight: 1.4,
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.15rem",
                    }}
                  >
                    <span>{info.fuenteOrigen}</span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-3)",
                        fontFamily: "var(--font-mono, monospace)",
                      }}
                    >
                      {info.metodoTexto}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Disclaimer institucional */}
            <p style={{ fontSize: "0.76rem", color: "var(--text-1)", fontStyle: "normal", margin: 0, padding: "0.75rem 0.9rem", background: "var(--surface-2)", borderRadius: 6, border: "1px solid var(--border)", lineHeight: 1.4 }}>
              ℹ️ <strong>Nota institucional</strong>: Una relación documental refleja vínculos registrados en fuentes públicas oficiales y no implica irregularidad ni responsabilidad penal o civil.
            </p>

            {/* 4. Evidencias documentales oficiales */}
            <div>
              <h4 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", margin: "0 0 0.5rem", fontWeight: 700 }}>
                Evidencias Oficiales Vinculadas ({cross.evidence.length})
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {cross.evidence.map((rec: EvidenceRecord) => {
                  const sourceHuman = FUENTE_CONFIANZA_ES[rec.sourceId] || "Documento oficial del Estado";
                  const recAmount = rec.amount?.amountClp;
                  return (
                    <div
                      key={rec.id}
                      className="card"
                      style={{ padding: "0.85rem 1rem", borderLeft: "3px solid var(--accent)", fontSize: "0.82rem", background: "var(--surface-2)", border: "1px solid var(--border)" }}
                    >
                      <div style={{ fontWeight: 700, color: "var(--text-1)" }}>{rec.title}</div>
                      {rec.description && (
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.3rem 0 0", lineHeight: 1.4 }}>
                          {rec.description}
                        </p>
                      )}
                      {recAmount && recAmount > 0 && (
                        <div style={{ marginTop: "0.35rem" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--ok)", fontFamily: "var(--font-mono, monospace)" }}>
                            Monto: {formatMontoConsolidado(recAmount)}
                          </span>
                        </div>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem", fontSize: "0.72rem", color: "var(--text-muted)", flexWrap: "wrap", gap: "0.4rem" }}>
                        <span>Fuente: {sourceHuman}</span>
                        {rec.evidence?.sourceUrl && (
                          <a
                            href={rec.evidence.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
                          >
                            Documento oficial ↗
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
