"use client";
import NormativeInfo from "@/components/financial/NormativeInfo";

import SourceLink from "@/components/data/SourceLink";
import { useState, useMemo } from "react";
import { formatCLP } from "@/lib/format";
import { latestPublishedPeriod, parseSpanishMonthPeriod } from "@/lib/month-periods";
import PeriodYearMonthFilter from "@/components/PeriodYearMonthFilter";
import type { AsignacionSenado } from "@/lib/personal-apoyo";
import type { SenateSupportEvaluation } from "@/scripts/etl/senado-assignment.mjs";

export interface FilaPersonalDiputado {
  tipo: string;
  nombre: string;
  cargo: string;
  sueldo: number;
  cargo_servel?: string;
  inicio?: string;
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
    personal_apoyo_por_periodo?: Record<string, {
      periodo: string;
      status: "available" | "empty_confirmed" | "unpublished";
      rows: FilaPersonalDiputado[];
      retrieved_at: string | null;
    }>;
  } | null;
  senadorPersonal?: {
    registros: FilaPersonalSenador[];
    ultimo_mes: string;
    asignacion: AsignacionSenado | null;
    evaluaciones: Record<string, SenateSupportEvaluation>;
  } | null;
  fuenteUrl?: string;
}

function normalizeCamaraMonth(mesPersonal?: string | null): string {
  return parseSpanishMonthPeriod(mesPersonal);
}

function byAmountDescending(a: { monto: number; nombre: string }, b: { monto: number; nombre: string }) {
  const amountA = Number.isFinite(a.monto) ? a.monto : -Infinity;
  const amountB = Number.isFinite(b.monto) ? b.monto : -Infinity;
  return amountB - amountA || a.nombre.localeCompare(b.nombre, "es-CL", { sensitivity: "base" });
}

export default function PersonalApoyoMensual({
  cargo,
  mesesDisponibles,
  ultimoPeriodo,
  diputadoPersonal,
  senadorPersonal,
  fuenteUrl,
}: PersonalApoyoProps) {
  const ultimoPublicado = latestPublishedPeriod(mesesDisponibles.map((month) => month.periodo));
  const periodoInicial = ultimoPeriodo && mesesDisponibles.some((month) => month.periodo === ultimoPeriodo)
    ? ultimoPeriodo
    : ultimoPublicado;
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState(periodoInicial);

  const esSenador = cargo === "Senador";
  const mesDiputadoOficial = normalizeCamaraMonth(diputadoPersonal?.mes_personal);

  // Datos filtrados para el mes seleccionado
  const { filas, totalMensual, totalAcumuladoAnual, personasContratadas } = useMemo(() => {
    if (esSenador) {
      const all = senadorPersonal?.registros ?? [];
      const selectedYear = periodoSeleccionado.slice(0, 4);
      const acumulado = all
        .filter((record) => record.periodo.startsWith(`${selectedYear}-`))
        .reduce((sum, record) => sum + (record.monto ?? 0), 0);
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
            inicio: undefined,
          }))
          .sort(byAmountDescending),
        totalMensual: totalMes,
        totalAcumuladoAnual: acumulado,
        personasContratadas: enMes.length,
      };
    } else {
      const periodRecord = diputadoPersonal?.personal_apoyo_por_periodo?.[periodoSeleccionado];
      const allDip = periodRecord?.rows
        ?? (periodoSeleccionado === mesDiputadoOficial ? diputadoPersonal?.personal_apoyo ?? [] : []);
      const totalMes = allDip.reduce((sum, f) => sum + (f.sueldo ?? 0), 0);
      const coincideMes = Boolean(periodRecord) || periodoSeleccionado === mesDiputadoOficial;

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
              inicio: f.inicio,
            }))
            .sort(byAmountDescending),
          totalMensual: totalMes,
          totalAcumuladoAnual: totalMes,
          personasContratadas: allDip.length,
        };
      }


      return {
        filas: [],
        totalMensual: 0,
        totalAcumuladoAnual: totalMes,
        personasContratadas: 0,
      };
    }
  }, [esSenador, senadorPersonal, diputadoPersonal, periodoSeleccionado, mesDiputadoOficial]);

  const mesActivoEtiqueta =
    mesesDisponibles.find((m) => m.periodo === periodoSeleccionado)?.etiqueta ?? periodoSeleccionado;
  const periodoDiputadoSeleccionado = diputadoPersonal?.personal_apoyo_por_periodo?.[periodoSeleccionado];
  const mesDiputadoSinPublicar = !esSenador && periodoDiputadoSeleccionado?.status === "unpublished";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
<NormativeInfo label="Personal de apoyo" component="personal" from={periodoSeleccionado} to={periodoSeleccionado}/>

      <PeriodYearMonthFilter
        periods={mesesDisponibles.map((month) => month.periodo)}
        selectedPeriod={periodoSeleccionado}
        onChange={setPeriodoSeleccionado}
        label="Filtrar personal de apoyo y asesores"
      />

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
            <span>{mesDiputadoSinPublicar ? "—" : personasContratadas}</span>{" "}
            <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-subtle)" }}>
              {personasContratadas === 1 ? "registro" : "registros"}
            </span>
          </div>
          <div className="stat-tile__label">
            Registros publicados ({mesActivoEtiqueta})
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
            {mesDiputadoSinPublicar ? "Aún no publicado" : totalMensual > 0 ? formatCLP(totalMensual) : "$0"}
          </div>
          <div className="stat-tile__label">
            Monto total informado ({mesActivoEtiqueta})
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
            {mesDiputadoSinPublicar ? "—" : formatCLP(totalAcumuladoAnual)}
          </div>
          <div className="stat-tile__label">
            {esSenador ? `Acumulado ${periodoSeleccionado.slice(0, 4)}` : "Total del corte publicado"}
          </div>
        </div>
      </div>

      {/* (d) Listado Nominal del Mes o Estado Sin Contrataciones */}
      {!esSenador && personasContratadas > 0 && (
        <p style={{ fontSize: "0.78rem", color: "var(--text-2)", margin: 0 }}>
          Un mismo nombre puede figurar en varios registros por contratos o cambios dentro del mes. Se conserva cada fila y monto publicado por la Cámara.
        </p>
      )}
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
                  {f.inicio && (
                    <span style={{ fontSize: "0.68rem", color: "var(--text-3)" }}>
                      · Inicio: {f.inicio}
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
              {mesDiputadoSinPublicar ? `Datos aún no publicados para ${mesActivoEtiqueta}` : `Sin contrataciones publicadas en ${mesActivoEtiqueta}`}
            </span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--text-2)", margin: 0 }}>
            {mesDiputadoSinPublicar
              ? "La Cámara aún no ha publicado la nómina de personal de este mes. El último corte disponible se conserva por separado."
              : esSenador
              ? `El Senado no registra contrataciones asignadas a este parlamentario durante el período ${mesActivoEtiqueta}.`
              : `La Cámara de Diputados publica la nómina de personal a mes vencido con desfase oficial. Los datos se incorporan automáticamente cuando la fuente emite el corte de ${mesActivoEtiqueta}.`}
          </p>
        </div>
      )}

      {fuenteUrl && (
        <div style={{ marginTop: "0.3rem" }}>
          <SourceLink
            href={fuenteUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "0.72rem", color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}
          >
            Ver nómina oficial de personal en la fuente ↗
          </SourceLink>
        </div>
      )}
    </div>
  );
}
