"use client";

import { useState, useMemo } from "react";
import { formatCLP } from "@/lib/format";

export interface MesGastos {
  periodo: string;
  etiqueta: string;
  total: number;
  sumaItems?: number;
  totalPublicadoFuente?: number | null;
  diferenciaExplicada?: {
    totalPublicado: number;
    sumaItems: number;
    diferencia: number;
    mensaje: string;
  } | null;
  variacion: number | null;
  items: Array<{ item: string; monto: number }>;
}

function getCategoryColor(item: string): { bg: string; text: string } {
  const low = item.toLowerCase();
  if (low.includes("sede") || low.includes("oficina") || low.includes("arriendo")) {
    return { bg: "var(--info-bg)", text: "var(--info)" };
  }
  if (low.includes("traslado") || low.includes("viatico") || low.includes("combustible") || low.includes("pasaje") || low.includes("peaje") || low.includes("traslacion") || low.includes("vehiculo")) {
    return { bg: "var(--warn-bg)", text: "var(--warn)" };
  }
  if (low.includes("asesor") || low.includes("profesional") || low.includes("personal")) {
    return { bg: "var(--info-bg)", text: "var(--accent)" };
  }
  if (low.includes("telef") || low.includes("comunic") || low.includes("internet") || low.includes("difusion") || low.includes("publicidad")) {
    return { bg: "var(--ok-bg)", text: "var(--ok)" };
  }
  return { bg: "var(--surface-2)", text: "var(--text-2)" };
}

export default function GastosMensuales({ meses, ultimo }: { meses: MesGastos[]; ultimo: string }) {
  const [seleccionado, setSeleccionado] = useState(ultimo);
  const [mostrarSinGasto, setMostrarSinGasto] = useState(false);

  const activo = useMemo(
    () => meses.find((m) => m.periodo === seleccionado) ?? meses[meses.length - 1],
    [meses, seleccionado]
  );

  const itemsConGasto = useMemo(
    () => (activo ? activo.items.filter((i) => i.monto > 0).sort((a, b) => b.monto - a.monto) : []),
    [activo]
  );

  const itemsSinGasto = useMemo(
    () => (activo ? activo.items.filter((i) => i.monto === 0) : []),
    [activo]
  );

  if (!activo) return null;

  const esPendiente = activo.total === 0;
  const totalMes = activo.total > 0 ? activo.total : 1;
  const maxMonto = itemsConGasto.length > 0 ? itemsConGasto[0].monto : 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Selector de Meses */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
        {meses.map((mes) => {
          const activoMes = mes.periodo === activo.periodo;
          const esCero = mes.total === 0;
          return (
            <button
              key={mes.periodo}
              type="button"
              onClick={() => setSeleccionado(mes.periodo)}
              aria-pressed={activoMes}
              className="capsule"
              style={{
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
                padding: "0.35rem 0.75rem",
                borderRadius: 99,
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                border: activoMes ? "1px solid var(--accent)" : "1px solid var(--border)",
                background: activoMes ? "var(--accent)" : esCero ? "var(--surface-2)" : "var(--surface)",
                color: activoMes ? "var(--bg)" : esCero ? "var(--text-3)" : "var(--text-1)",
                fontWeight: activoMes ? 800 : 500,
                boxShadow: activoMes ? "0 0 12px var(--accent-glow)" : "none",
                opacity: esCero && !activoMes ? 0.75 : 1,
              }}
              title={
                esCero
                  ? "Mes aún no publicado por la fuente oficial ($0)"
                  : mes.variacion !== null
                    ? `Variación vs. mes anterior: ${mes.variacion > 0 ? "+" : ""}${mes.variacion.toLocaleString("es-CL", { maximumFractionDigits: 1 })}%`
                    : "Primer mes registrado"
              }
            >
              {mes.etiqueta} {esCero ? "· Pendiente" : ""}
            </button>
          );
        })}
      </div>

      {/* Resumen del Mes Activo */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.75rem 1rem",
          background: "var(--surface-2)",
          borderRadius: 8,
          border: esPendiente ? "1px dashed var(--border)" : "1px solid var(--border)",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.7rem", color: esPendiente ? "var(--warn)" : "var(--text-3)", textTransform: "uppercase", fontWeight: 700 }}>
              Mes Rendido: {activo.etiqueta} {esPendiente ? "· Pendiente" : ""}
            </span>
            {esPendiente && (
              <span className="badge badge-warn" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>
                Pendiente de publicación
              </span>
            )}
          </div>
          {!esPendiente && activo.variacion !== null && (
            <div style={{ fontSize: "0.68rem", color: activo.variacion > 0 ? "var(--bad)" : "var(--ok)", fontWeight: 700, marginTop: "0.1rem" }}>
              {activo.variacion > 0 ? "▲ +" : "▼ "}{activo.variacion.toLocaleString("es-CL", { maximumFractionDigits: 1 })}% vs mes anterior
            </div>
          )}
          {esPendiente && (
            <div style={{ fontSize: "0.68rem", color: "var(--text-3)", marginTop: "0.2rem" }}>
              La Cámara/Senado publica con ~1-2 meses de desfase normativo a mes vencido.
            </div>
          )}
        </div>
        <strong style={{ fontFamily: "monospace", fontSize: "1.1rem", color: esPendiente ? "var(--warn)" : "var(--text-1)" }}>
          {formatCLP(activo.total)}
        </strong>
      </div>

      {/* Badge de Discrepancia Explicada (si la fuente publicó un total distinto a la suma de ítems) */}
      {activo.diferenciaExplicada && (
        <div
          role="alert"
          style={{
            padding: "0.6rem 0.85rem",
            background: "var(--warn-bg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: "0.75rem",
            color: "var(--text-1)",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            lineHeight: 1.4,
          }}
        >
          <span style={{ fontSize: "1rem", lineHeight: 1 }}>⚠️</span>
          <div>
            <strong style={{ color: "var(--warn)", display: "block", marginBottom: "0.15rem" }}>
              Aviso de auditoría metodológica:
            </strong>
            <span>{activo.diferenciaExplicada.mensaje}</span>
          </div>
        </div>
      )}

      {/* Lista de Ítems Rendidos (Todos los ítems > $0 ordenados desc con barras) */}
      {esPendiente ? (
        <div style={{ padding: "1rem", background: "var(--surface-2)", borderRadius: 8, border: "1px dashed var(--border)", textAlign: "center" }}>
          <p style={{ fontSize: "0.82rem", color: "var(--text-1)", margin: "0 0 0.3rem 0", fontWeight: 600 }}>
            ⏳ Sin rendiciones publicadas para {activo.etiqueta} en la fuente oficial.
          </p>
          <span style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>
            Los datos se actualizarán automáticamente cuando la Cámara o el Senado publiquen el corte oficial.
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {itemsConGasto.map(({ item, monto }) => {
            const pct = Math.round((monto / totalMes) * 100);
            const barPct = Math.round((monto / maxMonto) * 100);
            const colorCat = getCategoryColor(item);

            return (
              <div
                key={item}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.3rem",
                  padding: "0.55rem 0.8rem",
                  background: "var(--surface)",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-1)" }}>
                    {item}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        padding: "0.15rem 0.45rem",
                        borderRadius: 4,
                        background: colorCat.bg,
                        color: colorCat.text,
                        fontWeight: 700,
                      }}
                    >
                      {pct}%
                    </span>
                    <strong style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--text-1)" }}>
                      {formatCLP(monto)}
                    </strong>
                  </div>
                </div>

                {/* Mini-barra de proporción */}
                <div style={{ height: 5, borderRadius: 99, background: "var(--surface-2)", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${barPct}%`,
                      borderRadius: 99,
                      background: colorCat.text,
                      transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* Acordeón para ítems sin gasto ($0) */}
          {itemsSinGasto.length > 0 && (
            <div style={{ marginTop: "0.4rem" }}>
              <button
                type="button"
                onClick={() => setMostrarSinGasto(!mostrarSinGasto)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "0.3rem 0",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  color: "var(--text-subtle)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontWeight: 600,
                }}
              >
                {mostrarSinGasto
                  ? `▲ Ocultar ítems sin gasto (${itemsSinGasto.length})`
                  : `▼ Ver ítems sin gasto (${itemsSinGasto.length})`}
              </button>

              {mostrarSinGasto && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.35rem", marginTop: "0.4rem" }}>
                  {itemsSinGasto.map(({ item }) => (
                    <div
                      key={item}
                      style={{
                        padding: "0.4rem 0.6rem",
                        background: "var(--surface-2)",
                        borderRadius: 6,
                        border: "1px dashed var(--border)",
                        fontSize: "0.72rem",
                        color: "var(--text-3)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item}</span>
                      <strong style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "var(--text-3)" }}>$0</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activo.items.length === 0 && (
            <p style={{ fontSize: "0.8rem", color: "var(--text-2)", margin: 0 }}>Sin ítems desglosados en este mes.</p>
          )}
        </div>
      )}
    </div>
  );
}