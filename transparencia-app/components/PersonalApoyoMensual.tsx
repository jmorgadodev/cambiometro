"use client";

import { useState, useMemo } from "react";
import { formatCLP } from "@/lib/format";
import type { AsignacionSenado } from "@/lib/personal-apoyo";
import type { SenateSupportEvaluation } from "@/scripts/etl/senado-assignment.mjs";

export interface FilaPersonalDiputado {
  tipo: string;
  nombre: string;
  cargo: string;
  sueldo: number;
  cargo_servel?: string;
  cese?: string;
}

export interface FilaPersonalSenador {
  periodo: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  cargo: string;
  monto: number;
  calidad_juridica: string;
}

export interface PersonalApoyoProps {
  cargo: "Diputado" | "Senador";
  mesesDisponibles: Array<{ periodo: string; etiqueta: string }>;
  ultimoPeriodo: string;
  diputadoPersonal?: {
    mes_personal: string;
    personal_apoyo: FilaPersonalDiputado[];
  } | null;
  senadorPersonal?: {
    registros: FilaPersonalSenador[];
    ultimo_mes: string;
    asignacion: AsignacionSenado | null;
    evaluaciones: Record<string, SenateSupportEvaluation>;
  } | null;
  fuenteUrl?: string;
}

const MONTH_MAP: Record<string, string> = {
  enero: "2026-01",
  febrero: "2026-02",
  marzo: "2026-03",
  abril: "2026-04",
  mayo: "2026-05",
  junio: "2026-06",
  julio: "2026-07",
  agosto: "2026-08",
  septiembre: "2026-09",
  octubre: "2026-10",
  noviembre: "2026-11",
  diciembre: "2026-12",
};

function normalizeCamaraMonth(mesPersonal?: string | null): string {
  if (!mesPersonal) return "";
  const parts = mesPersonal.toLowerCase().trim().split(/\s+/);
  if (parts.length >= 2 && MONTH_MAP[parts[0]]) {
    return MONTH_MAP[parts[0]];
  }
  return mesPersonal;
}

export default function PersonalApoyoMensual({
  cargo,
  mesesDisponibles,
  ultimoPeriodo,
  diputadoPersonal,
  senadorPersonal,
  fuenteUrl,
}: PersonalApoyoProps) {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(
    ultimoPeriodo || mesesDisponibles[mesesDisponibles.length - 1]?.periodo || ""
  );

  const esSenador = cargo === "Senador";
  const mesDiputadoOficial = normalizeCamaraMonth(diputadoPersonal?.mes_personal);

  // Datos filtrados para el mes seleccionado
  const { filas, totalMensual, totalAcumulado2026, personasContratadas } = useMemo(() => {
    if (esSenador) {
      const all = senadorPersonal?.registros ?? [];
      const acumulado = all.reduce((sum, r) => sum + (r.monto ?? 0), 0);
      const enMes = all.filter((r) => r.periodo === periodoSeleccionado);
      const totalMes = enMes.reduce((sum, r) => sum + (r.monto ?? 0), 0);
      return {
        filas: enMes
          .map((r) => ({
            nombre: [r.apellido_paterno, r.apellido_materno, r.nombre].filter(Boolean).join(" "),
            cargo: r.cargo,
            tipo: r.calidad_juridica,
            monto: r.monto,
            cese: undefined,
            cargo_servel: undefined,
          }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es-CL", { sensitivity: "base" })),
        totalMensual: totalMes,
        totalAcumulado2026: acumulado,
        personasContratadas: enMes.length,
      };
    } else {
      const allDip = diputadoPersonal?.personal_apoyo ?? [];
      const totalMes = allDip.reduce((sum, f) => sum + (f.sueldo ?? 0), 0);
      const coincideMes =
        periodoSeleccionado === mesDiputadoOficial ||
        periodoSeleccionado === "2026-06" ||
        (mesesDisponibles.length > 0 && periodoSeleccionado === mesesDisponibles[mesesDisponibles.length - 1]?.periodo);

      if (coincideMes && allDip.length > 0) {
        return {
          filas: allDip
            .map((f) => ({
              nombre: f.nombre,
              cargo: f.cargo,
              tipo: f.tipo,
              monto: f.sueldo,
              cese: f.cese,
              cargo_servel: f.cargo_servel,
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, "es-CL", { sensitivity: "base" })),
          totalMensual: totalMes,
          totalAcumulado2026: totalMes,
          personasContratadas: allDip.length,
        };
      }


      return {
        filas: [],
        totalMensual: 0,
        totalAcumulado2026: totalMes,
        personasContratadas: 0,
      };
    }
  }, [esSenador, senadorPersonal, diputadoPersonal, periodoSeleccionado, mesDiputadoOficial, mesesDisponibles]);

  const mesActivoEtiqueta =
    mesesDisponibles.find((m) => m.periodo === periodoSeleccionado)?.etiqueta ?? periodoSeleccionado;
  const evaluacionActiva = senadorPersonal?.evaluaciones[periodoSeleccionado];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
      {/* Selector de Meses */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
        {mesesDisponibles.map((m) => {
          const activo = m.periodo === periodoSeleccionado;
          return (
            <button
              key={m.periodo}
              type="button"
              onClick={() => setPeriodoSeleccionado(m.periodo)}
              aria-pressed={activo}
              className="capsule"
              style={{
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
                padding: "0.35rem 0.75rem",
                borderRadius: 99,
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                border: activo ? "1px solid var(--accent)" : "1px solid var(--border)",
                background: activo ? "var(--accent)" : "var(--surface)",
                color: activo ? "var(--bg)" : "var(--text-1)",
                fontWeight: activo ? 800 : 500,
                boxShadow: activo ? "0 0 12px var(--accent-glow)" : "none",
              }}
            >
              {m.etiqueta}
            </button>
          );
        })}
      </div>

      {/* Tarjetas Resumen del Mes Seleccionado */}
      <div className="stat-grid" style={{ marginTop: "0.25rem" }}>
        {/* (a) Personas contratadas */}
        <div className="stat-tile" style={{ textAlign: "center" }}>
          <div
            className="stat-tile__value"
            style={{
              fontSize: "clamp(14px, 4.5vw, 1.25rem)",
              color: personasContratadas > 0 ? "var(--text-1)" : "var(--text-3)",
            }}
          >
            <span>{personasContratadas}</span>{" "}
            <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-subtle)" }}>
              {personasContratadas === 1 ? "persona" : "personas"}
            </span>
          </div>
          <div className="stat-tile__label">
            Personas contratadas ({mesActivoEtiqueta})
          </div>
        </div>

        {/* (b) Total mensual */}
        <div className="stat-tile stat-tile--accent" style={{ textAlign: "center" }}>
          <div
            className="stat-tile__value"
            style={{
              fontSize: "clamp(14px, 4.5vw, 1.25rem)",
            }}
          >
            {totalMensual > 0 ? formatCLP(totalMensual) : "$0"}
          </div>
          <div className="stat-tile__label">
            Total mensual ({mesActivoEtiqueta})
          </div>
        </div>

        {/* (c) Acumulado 2026 */}
        <div className="stat-tile" style={{ textAlign: "center" }}>
          <div
            className="stat-tile__value"
            style={{
              fontSize: "clamp(14px, 4.5vw, 1.25rem)",
            }}
          >
            {formatCLP(totalAcumulado2026)}
          </div>
          <div className="stat-tile__label">
            Acumulado 2026
          </div>
        </div>
      </div>

      {esSenador && senadorPersonal?.asignacion && (
        <div
          role={evaluacionActiva && evaluacionActiva.status !== "OK" ? "alert" : undefined}
          style={{
            padding: "0.9rem",
            borderRadius: 8,
            border: `1px solid ${evaluacionActiva && evaluacionActiva.status !== "OK" ? "var(--bad)" : "var(--border)"}`,
            background: "var(--surface)",
          }}
        >
          <strong style={{ fontSize: "0.82rem", color: evaluacionActiva && evaluacionActiva.status !== "OK" ? "var(--bad)" : "var(--text-1)" }}>
            {evaluacionActiva && evaluacionActiva.status !== "OK"
              ? `Hallazgo de integridad ${evaluacionActiva.status}`
              : "Asignación mensual conciliada"}
          </strong>
          {evaluacionActiva && evaluacionActiva.status !== "OK" && (() => {
            const baseOficial = Number(senadorPersonal.asignacion.base_mensual_clp);
            const totalPublicado = Number(evaluacionActiva.total_clp);
            const pct = baseOficial > 0 ? ((totalPublicado - baseOficial) / baseOficial) * 100 : 0;
            const pctFormateado = `${pct >= 0 ? "+" : ""}${pct.toFixed(1).replace(".", ",")}%`;
            return (
              <div style={{ marginTop: "0.25rem", fontSize: "0.8rem", fontWeight: 700, color: "var(--bad)" }}>
                Exceso de {pctFormateado} sobre la base mensual oficial
              </div>
            );
          })()}
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.76rem", color: "var(--text-2)" }}>
            Base mensual oficial: {formatCLP(senadorPersonal.asignacion.base_mensual_clp)}.
            {evaluacionActiva
              ? ` Total publicado: ${formatCLP(evaluacionActiva.total_clp)}; traspaso individual acreditado: ${formatCLP(evaluacionActiva.verified_transfer_clp)}; diferencia sin respaldo: ${formatCLP(evaluacionActiva.unexplained_clp)}.`
              : " No hay una evaluación comparable para este período."}
          </p>
          {evaluacionActiva && evaluacionActiva.status !== "OK" && (
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.72rem", color: "var(--text-2)" }}>
              La regla general de traspaso no acredita este caso individual; la diferencia se muestra como hallazgo y no como dato conciliado.
            </p>
          )}
        </div>
      )}

      {/* (d) Listado Nominal del Mes o Estado Sin Contrataciones */}
      {personasContratadas > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {filas.map((f, i) => (
            <div
              key={`${f.nombre}-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                padding: "0.65rem 0.85rem",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--text-1)" }}>
                  {f.nombre}
                </strong>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                  <span
                    className="badge"
                    style={{
                      fontSize: "0.65rem",
                      padding: "0.1rem 0.4rem",
                      background: "var(--surface-2)",
                      color: "var(--text-2)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {f.tipo || "Personal de Apoyo"}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-2)" }}>
                    {f.cargo}
                  </span>
                  {f.cargo_servel && (
                    <span style={{ fontSize: "0.68rem", color: "var(--text-3)" }}>
                      · Cargo SERVEL: {f.cargo_servel}
                    </span>
                  )}
                  {f.cese && (
                    <span style={{ fontSize: "0.68rem", color: "var(--bad)" }}>
                      · Cese: {f.cese}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <strong style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", color: "var(--money)" }}>
                  {formatCLP(f.monto)}
                </strong>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: "1.25rem",
            background: "var(--surface)",
            borderRadius: 8,
            border: "1px dashed var(--border)",
            textAlign: "center",
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
            <span className="badge badge-warn" style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem" }}>
              Sin contrataciones publicadas en {mesActivoEtiqueta}
            </span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-2)", margin: 0 }}>
            {esSenador
              ? `El Senado no registra contrataciones asignadas a este parlamentario durante el período ${mesActivoEtiqueta}.`
              : `La Cámara de Diputados publica la nómina de personal a mes vencido con desfase oficial. Los datos se incorporan automáticamente cuando la fuente emite el corte de ${mesActivoEtiqueta}.`}
          </p>
        </div>
      )}

      {fuenteUrl && (
        <div style={{ marginTop: "0.3rem" }}>
          <a
            href={fuenteUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "0.72rem", color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
          >
            Ver nómina oficial de personal en la fuente ↗
          </a>
        </div>
      )}
    </div>
  );
}
