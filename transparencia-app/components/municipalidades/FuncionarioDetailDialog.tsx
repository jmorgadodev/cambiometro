"use client";

import { useEffect, useId } from "react";
import type { FuncionarioSalaryHistoryPoint } from "@/lib/funcionarios-history";

export type { FuncionarioSalaryHistoryPoint } from "@/lib/funcionarios-history";

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
  historial?: FuncionarioSalaryHistoryPoint[];
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

function parseCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
}

function formatDate(value?: string | null) {
  if (!value) return "No informado";
  const date = parseCalendarDate(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("es-CL");
}

function formatServiceYears(fechaIngreso?: string | null, periodo?: string | null) {
  if (!fechaIngreso) return "No informado";
  const start = parseCalendarDate(fechaIngreso);
  if (Number.isNaN(start.getTime())) return "No informado";
  const reference = /^\d{4}-\d{2}$/.test(periodo || "")
    ? (() => {
        const [year, month] = (periodo as string).split("-").map(Number);
        return new Date(year, month, 0);
      })()
    : new Date();
  if (reference < start) return "Aún no iniciado en el corte";
  let years = reference.getFullYear() - start.getFullYear();
  let months = reference.getMonth() - start.getMonth();
  if (reference.getDate() < start.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return `${years} ${years === 1 ? "año" : "años"}${months > 0 ? ` y ${months} ${months === 1 ? "mes" : "meses"}` : ""}`;
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

function SalaryHistory({ history }: { history: FuncionarioSalaryHistoryPoint[] }) {
  if (history.length === 0) {
    return (
      <section className="municipal-staff-dialog-history" aria-label="Historial salarial">
        <div className="municipal-staff-dialog-history-heading">
          <div>
            <span className="eyebrow">EVOLUCIÓN SALARIAL</span>
            <h3>Historial de nóminas</h3>
          </div>
        </div>
        <p className="municipal-staff-dialog-history-empty">
          No hay más cortes de nómina cargados para esta persona en el release consultado. No se infiere una evolución con datos que la fuente no publicó.
        </p>
      </section>
    );
  }

  const max = Math.max(...history.map((point) => point.bruto), 1);
  const chartWidth = 620;
  const chartHeight = 190;
  const padding = { left: 14, right: 14, top: 18, bottom: 24 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const pointCoordinates = history.map((point, index) => ({
    x: history.length === 1 ? chartWidth / 2 : padding.left + (index / (history.length - 1)) * innerWidth,
    y: padding.top + innerHeight - (point.bruto / max) * innerHeight,
  }));
  const polyline = pointCoordinates.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section className="municipal-staff-dialog-history" aria-labelledby="municipal-history-title">
      <div className="municipal-staff-dialog-history-heading">
        <div>
          <span className="eyebrow">EVOLUCIÓN SALARIAL</span>
          <h3 id="municipal-history-title">Historial de nóminas</h3>
          <p>Remuneración bruta informada por corte. Si hubo más de una fila en un mes, se muestra el total de esas filas.</p>
        </div>
        <strong>{history.length} {history.length === 1 ? "corte" : "cortes"}</strong>
      </div>

      <div className="municipal-staff-dialog-history-chart">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Evolución de la remuneración bruta por período">
          {[0, 0.5, 1].map((ratio) => {
            const y = padding.top + innerHeight - ratio * innerHeight;
            return <line key={ratio} x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} className="municipal-staff-dialog-history-grid" />;
          })}
          {history.length > 1 && <polyline points={polyline} className="municipal-staff-dialog-history-line" />}
          {pointCoordinates.map((point, index) => (
            <circle key={history[index].periodo} cx={point.x} cy={point.y} r="4" className="municipal-staff-dialog-history-point">
              <title>{`${history[index].etiqueta}: ${formatCLP(history[index].bruto)}`}</title>
            </circle>
          ))}
        </svg>
      </div>

      <div className="municipal-staff-dialog-history-table-wrap">
        <table className="municipal-staff-dialog-history-table">
          <caption className="sr-only">Detalle del sueldo por nómina</caption>
          <thead>
            <tr><th scope="col">Corte</th><th scope="col">Bruto</th><th scope="col">Líquido</th><th scope="col">Horas extra</th></tr>
          </thead>
          <tbody>
            {history.map((point) => (
              <tr key={point.periodo}>
                <th scope="row">{point.etiqueta}</th>
                <td>{formatCLP(point.bruto)}</td>
                <td>{formatCLP(point.liquido)}</td>
                <td>{point.horasExtras > 0 ? `${formatNumber(point.horasExtras)} hrs` : "0 hrs"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
            <Metric label="Años de servicio" value={formatServiceYears(record.fechaIngreso, record.periodo)} />
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

          <SalaryHistory history={record.historial ?? []} />

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
