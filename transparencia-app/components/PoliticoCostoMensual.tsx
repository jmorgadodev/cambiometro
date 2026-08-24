"use client";

import { useState, useMemo } from "react";
import { formatCLP } from "@/lib/format";

export interface MesCostoData {
  periodo: string; // e.g. "2026-05"
  etiqueta: string; // e.g. "Mayo 2026"
  sueldo: number | null;
  gastos: number | null;
  personal: number | null;
}

export interface PoliticoCostoMensualProps {
  cargo: "Diputado" | "Senador";
  meses: MesCostoData[];
  ultimoPeriodoConDatos: string;
  fuenteSueldoUrl?: string;
  fuenteGastosUrl?: string;
  fuentePersonalUrl?: string;
}

export default function PoliticoCostoMensual({
  cargo,
  meses,
  ultimoPeriodoConDatos,
  fuenteSueldoUrl = "https://comision38bis.gob.cl/registro-publico",
}: PoliticoCostoMensualProps) {
  const defaultPeriodo = useMemo(() => {
    if (ultimoPeriodoConDatos && meses.some((m) => m.periodo === ultimoPeriodoConDatos)) {
      return ultimoPeriodoConDatos;
    }
    return meses[meses.length - 1]?.periodo || "";
  }, [meses, ultimoPeriodoConDatos]);

  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<string>(defaultPeriodo);

  const mesActivo = useMemo(() => {
    return meses.find((m) => m.periodo === periodoSeleccionado) || meses[meses.length - 1] || null;
  }, [meses, periodoSeleccionado]);

  if (!mesActivo || meses.length === 0) {
    return null;
  }

  const { sueldo, gastos, personal } = mesActivo;

  // Calculo de suma de componentes disponibles
  const componentesVisibles: number[] = [];
  if (typeof sueldo === "number") componentesVisibles.push(sueldo);
  if (typeof gastos === "number") componentesVisibles.push(gastos);
  if (typeof personal === "number") componentesVisibles.push(personal);

  const totalCalculado = componentesVisibles.reduce((acc, val) => acc + val, 0);
  const totalVisible = componentesVisibles.length > 0;
  const esParcial = componentesVisibles.length < 3 && totalVisible;
  const sinDatos = componentesVisibles.length === 0;

  const fuenteGastosTexto = cargo === "Senador" ? "Transparencia Senado" : "Transparencia Cámara";
  const fuentePersonalTexto = cargo === "Senador" ? "CPLT / Senado" : "CPLT / Cámara";

  return (
    <section
      id="costo-mensual"
      aria-label="Costo mensual del parlamentario"
      className="card-flat costo-mensual-card"
      style={{
        marginTop: "1.25rem",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "1.25rem",
        width: "100%",
      }}
    >
      {/* Encabezado del Panel y Selector */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <div>
          <div
            className="section-title"
            style={{
              margin: 0,
              fontSize: "1rem",
              fontWeight: 800,
              color: "var(--text-1)",
              letterSpacing: "-0.01em",
            }}
          >
            Costo mensual del parlamentario
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--text-3)", display: "block", marginTop: "0.15rem" }}>
            Desglose consolidado de dieta oficial, gastos de función y personal de apoyo del mes.
          </span>
        </div>

        {/* Selector de meses interactivo */}
        <div
          role="group"
          aria-label="Seleccionar mes de costo"
          style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}
        >
          {meses.map((m) => {
            const isSelected = m.periodo === mesActivo.periodo;
            return (
              <button
                key={m.periodo}
                type="button"
                onClick={() => setPeriodoSeleccionado(m.periodo)}
                aria-pressed={isSelected}
                className="capsule"
                style={{
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.72rem",
                  padding: "0.3rem 0.65rem",
                  borderRadius: "99px",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
                  background: isSelected ? "var(--accent)" : "var(--surface)",
                  color: isSelected ? "var(--bg)" : "var(--text-1)",
                  fontWeight: isSelected ? 800 : 500,
                  boxShadow: isSelected ? "0 0 12px var(--accent-glow)" : "none",
                }}
              >
                {m.etiqueta}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid de 4 Tiles */}
      <div
        className="costo-mensual-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {/* Tile 1: Sueldo parlamentario (dieta) */}
        <div
          className="costo-tile"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "0.85rem 1rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "110px",
          }}
        >
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Sueldo (dieta bruta)
            </div>
            <div
              style={{
                fontSize: "clamp(1.15rem, 2.5vw, 1.4rem)",
                fontWeight: 800,
                color: typeof sueldo === "number" ? "var(--text-1)" : "var(--text-3)",
                fontFamily: "var(--font-mono)",
                marginTop: "0.25rem",
              }}
            >
              {typeof sueldo === "number" ? formatCLP(sueldo) : "—"}
            </div>
            {typeof sueldo !== "number" && (
              <span style={{ fontSize: "0.68rem", color: "var(--text-3)", display: "block", marginTop: "0.2rem" }}>
                No publicado por la fuente
              </span>
            )}
          </div>
          <div style={{ marginTop: "0.5rem", borderTop: "1px dashed var(--border)", paddingTop: "0.35rem" }}>
            <a
              href={fuenteSueldoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "0.68rem", color: "var(--accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}
            >
              <span>Comisión art. 38 bis</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        {/* Tile 2: Gastos operacionales del mes */}
        <div
          className="costo-tile"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "0.85rem 1rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "110px",
          }}
        >
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Gastos operacionales
            </div>
            <div
              style={{
                fontSize: "clamp(1.15rem, 2.5vw, 1.4rem)",
                fontWeight: 800,
                color: typeof gastos === "number" ? "var(--text-1)" : "var(--text-3)",
                fontFamily: "var(--font-mono)",
                marginTop: "0.25rem",
              }}
            >
              {typeof gastos === "number" ? formatCLP(gastos) : "—"}
            </div>
            {typeof gastos !== "number" && (
              <span style={{ fontSize: "0.68rem", color: "var(--text-3)", display: "block", marginTop: "0.2rem" }}>
                No publicado por la fuente
              </span>
            )}
          </div>
          <div style={{ marginTop: "0.5rem", borderTop: "1px dashed var(--border)", paddingTop: "0.35rem" }}>
            <a
              href="#gastos-operacionales"
              style={{ fontSize: "0.68rem", color: "var(--accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}
            >
              <span>{fuenteGastosTexto}</span>
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        {/* Tile 3: Personal y asesores del mes */}
        <div
          className="costo-tile"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "0.85rem 1rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "110px",
          }}
        >
          <div>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Personal y asesores
            </div>
            <div
              style={{
                fontSize: "clamp(1.15rem, 2.5vw, 1.4rem)",
                fontWeight: 800,
                color: typeof personal === "number" ? "var(--text-1)" : "var(--text-3)",
                fontFamily: "var(--font-mono)",
                marginTop: "0.25rem",
              }}
            >
              {typeof personal === "number" ? formatCLP(personal) : "—"}
            </div>
            {typeof personal !== "number" && (
              <span style={{ fontSize: "0.68rem", color: "var(--text-3)", display: "block", marginTop: "0.2rem" }}>
                No publicado por la fuente
              </span>
            )}
          </div>
          <div style={{ marginTop: "0.5rem", borderTop: "1px dashed var(--border)", paddingTop: "0.35rem" }}>
            <a
              href="#personal-apoyo"
              style={{ fontSize: "0.68rem", color: "var(--accent)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}
            >
              <span>{fuentePersonalTexto}</span>
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        {/* Tile 4: TOTAL MENSUAL / TOTAL PARCIAL */}
        <div
          className="costo-tile costo-tile--total"
          style={{
            background: "var(--surface)",
            border: esParcial ? "1.5px solid var(--warn)" : "1.5px solid var(--ok)",
            borderRadius: "8px",
            padding: "0.85rem 1rem",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: "110px",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.3rem" }}>
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  color: esParcial ? "var(--warn)" : "var(--ok)",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                {esParcial ? "Total parcial" : "Total mensual"}
              </div>
              {esParcial && (
                <span
                  style={{
                    fontSize: "0.62rem",
                    padding: "0.1rem 0.4rem",
                    background: "var(--warn-bg)",
                    color: "var(--warn)",
                    borderRadius: "4px",
                    fontWeight: 700,
                  }}
                >
                  Parcial
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: "clamp(1.2rem, 2.5vw, 1.5rem)",
                fontWeight: 900,
                color: sinDatos ? "var(--text-3)" : esParcial ? "var(--warn)" : "var(--ok)",
                fontFamily: "var(--font-mono)",
                marginTop: "0.25rem",
              }}
            >
              {totalVisible ? formatCLP(totalCalculado) : "—"}
            </div>
            <span style={{ fontSize: "0.68rem", color: "var(--text-2)", display: "block", marginTop: "0.2rem" }}>
              {sinDatos
                ? "Sin datos oficiales para este mes"
                : esParcial
                  ? "Suma de componentes publicados a la fecha"
                  : "Suma total de los 3 componentes oficiales"}
            </span>
          </div>
          <div style={{ marginTop: "0.5rem", borderTop: "1px dashed var(--border)", paddingTop: "0.35rem" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--text-3)" }}>
              {esParcial ? "Faltan componentes por publicar" : "Consolidado 100% oficial"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
