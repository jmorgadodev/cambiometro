"use client";

import { useEffect, useId } from "react";

export interface FuncionarioDetailRecord {
  id: string;
  nombre: string;
  cargo?: string | null;
  estamento?: string | null;
  tipoContrato?: string | null;
  periodo?: string | null;
  sueldoBase?: number | null;
  remuneracionBruta?: number | null;
  remuneracionLiquida?: number | null;
  horasExtras?: number | null;
  montoHorasExtras?: number | null;
  montoHorasExtrasCalculado?: boolean;
  horasExtrasDiurnas?: number | null;
  horasExtrasNocturnas?: number | null;
  horasExtrasFestivas?: number | null;
  grado?: string | null;
  formacion?: string | null;
  region?: string | null;
  fechaIngreso?: string | null;
  fechaTermino?: string | null;
  asignacionesEspeciales?: number | null;
  remuneracionesAdicionales?: number | null;
  bonosIncentivos?: number | null;
  viaticos?: number | null;
  derechoHorasExtras?: boolean | null;
  observaciones?: string | null;
  fuente?: string | null;
  fuentePeriodo?: string | null;
  calidad?: string | null;
  calidadDetalle?: string | null;
  totalContratos?: number | null;
  cargosConsolidados?: string[];
  sourceUrl?: string | null;
}

interface Props {
  record: FuncionarioDetailRecord;
  nombreOrganismo: string;
  onClose: () => void;
}

function formatCLP(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "No informado";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "No informado";
  return value.toLocaleString("es-CL");
}

function formatDate(value?: string | null) {
  if (!value) return "No informado";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("es-CL");
}

function valueOrFallback(value?: string | null) {
  return value?.trim() || "No informado";
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className="municipal-staff-dialog-metric">
      <span>{label}</span>
      <strong className={tone ? `is-${tone}` : undefined}>{value}</strong>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="municipal-staff-dialog-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default function FuncionarioDetailDialog({ record, nombreOrganismo, onClose }: Props) {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const hasOvertime = (record.horasExtras ?? 0) > 0 || (record.montoHorasExtras ?? 0) > 0;
  const breakdown = [
    record.horasExtrasDiurnas,
    record.horasExtrasNocturnas,
    record.horasExtrasFestivas,
  ].filter((value): value is number => typeof value === "number" && value > 0);

  return (
    <div
      className="municipal-staff-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="municipal-staff-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="municipal-staff-dialog-header">
          <div>
            <span className="eyebrow">EXPEDIENTE DE NÓMINA</span>
            <h2 id={titleId}>{record.nombre}</h2>
            <p>{nombreOrganismo}{record.periodo ? ` · ${record.periodo}` : ""}</p>
          </div>
          <button type="button" className="municipal-staff-dialog-close" onClick={onClose} aria-label="Cerrar expediente">
            ×
          </button>
        </header>

        <div className="municipal-staff-dialog-body">
          <div className="municipal-staff-dialog-role">
            <span className="eyebrow">CARGO COMPLETO</span>
            <strong>{valueOrFallback(record.cargo)}</strong>
            <div className="municipal-staff-dialog-tags">
              <span>{valueOrFallback(record.estamento)}</span>
              <span>{valueOrFallback(record.tipoContrato)}</span>
              {record.grado && <span>Grado {record.grado}</span>}
            </div>
          </div>

          <div className="municipal-staff-dialog-metrics" aria-label="Resumen de remuneraciones">
            <Metric label="Sueldo bruto" value={formatCLP(record.remuneracionBruta)} tone="ok" />
            <Metric label="Sueldo líquido" value={formatCLP(record.remuneracionLiquida)} />
            <Metric label="Sueldo base" value={formatCLP(record.sueldoBase)} />
            <Metric label="Horas extra" value={hasOvertime ? `${formatNumber(record.horasExtras)} hrs` : "0 hrs"} tone={hasOvertime ? "warn" : undefined} />
            <Metric label="Monto horas extra" value={formatCLP(record.montoHorasExtras)} tone={hasOvertime ? "warn" : undefined} />
            {record.montoHorasExtrasCalculado && (
              <p className="municipal-staff-dialog-note">Monto estimado a partir del sueldo bruto y el sueldo base publicados.</p>
            )}
            {hasOvertime && (record.montoHorasExtras === null || record.montoHorasExtras === undefined) && !record.montoHorasExtrasCalculado && (
              <p className="municipal-staff-dialog-note">La fuente informa horas extra, pero no publica el monto. No se estima porque faltan la tasa o la base legal aplicable.</p>
            )}
          </div>

          {hasOvertime && breakdown.length > 0 && (
            <div className="municipal-staff-dialog-callout">
              <strong>Detalle de horas extra disponible</strong>
              <span>
                Diurnas: {formatNumber(record.horasExtrasDiurnas)} · Nocturnas: {formatNumber(record.horasExtrasNocturnas)} · Festivas: {formatNumber(record.horasExtrasFestivas)}
              </span>
            </div>
          )}

          <dl className="municipal-staff-dialog-details">
            <DetailRow label="Período informado" value={valueOrFallback(record.fuentePeriodo || record.periodo)} />
            <DetailRow label="Fecha de ingreso" value={formatDate(record.fechaIngreso)} />
            <DetailRow label="Fecha de término" value={formatDate(record.fechaTermino)} />
            <DetailRow label="Región" value={valueOrFallback(record.region)} />
            <DetailRow label="Derecho a horas extra" value={record.derechoHorasExtras === null || record.derechoHorasExtras === undefined ? "No informado" : record.derechoHorasExtras ? "Sí" : "No"} />
            <DetailRow label="Asignaciones especiales" value={formatCLP(record.asignacionesEspeciales)} />
            <DetailRow label="Remuneraciones adicionales" value={formatCLP(record.remuneracionesAdicionales)} />
            <DetailRow label="Bonos e incentivos" value={formatCLP(record.bonosIncentivos)} />
            <DetailRow label="Viáticos" value={formatCLP(record.viaticos)} />
            {record.totalContratos !== null && record.totalContratos !== undefined && (
              <DetailRow label="Contratos agrupados" value={formatNumber(record.totalContratos)} />
            )}
          </dl>

          {(record.cargosConsolidados?.length || record.formacion || record.observaciones || record.calidadDetalle) && (
            <div className="municipal-staff-dialog-extra">
              {record.cargosConsolidados && record.cargosConsolidados.length > 0 && (
                <div><strong>Otros cargos consolidados</strong><p>{record.cargosConsolidados.join(" · ")}</p></div>
              )}
              {record.formacion && <div><strong>Formación</strong><p>{record.formacion}</p></div>}
              {record.observaciones && <div><strong>Observaciones de la fuente</strong><p>{record.observaciones}</p></div>}
              {record.calidadDetalle && <div><strong>Calidad y normalización</strong><p>{record.calidadDetalle}</p></div>}
            </div>
          )}

          <footer className="municipal-staff-dialog-footer">
            <span>Fuente: {valueOrFallback(record.fuente)}{record.calidad ? ` · ${record.calidad}` : ""}</span>
            {record.sourceUrl ? (
              <a href={record.sourceUrl} target="_blank" rel="noopener noreferrer">Ver registro original ↗</a>
            ) : (
              <span>El registro se conserva según el release publicado.</span>
            )}
          </footer>
        </div>
      </section>
    </div>
  );
}
