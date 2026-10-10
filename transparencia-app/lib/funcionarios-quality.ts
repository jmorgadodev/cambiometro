/**
 * lib/funcionarios-quality.ts
 * Motor unificado de clasificación forense y calidad de datos para nóminas CPLT.
 * Aplica los Principios Rectores R1-R5 y el estándar de Trazabilidad por Fila.
 */

export type AnomaliaCausa =
  | "ajuste_periodo_anterior"
  | "prorrateo_dias_horas"
  | "asignacion_reembolso_menor"
  | "nominal_sin_pago"
  | "error_unidad_fuente"
  | "anomalia_fuente";

export interface AnomaliaInfo {
  isAnomalia: boolean;
  isSueldoCompleto: boolean;
  isSinPago: boolean;
  isMicroMonto: boolean;
  causaId: AnomaliaCausa | null;
  etiquetaCausa: string;
  explicacionCiudadana: string;
  nivelConfianza: "Alto (Confirmado en fuente)" | "Medio (Inferido por fechas/patrón)" | "En revisión de origen";
  urlRegistroOriginal: string;
}

export function classifyFuncionarioRecord(f: {
  remuneracion_bruta_mensual?: number | null;
  observaciones?: string | null;
  fecha_ingreso?: string | null;
  fecha_termino?: string | null;
  url?: string | null;
  fuente?: string | null;
  organo_nombre?: string | null;
}): AnomaliaInfo {
  const provided = typeof f.remuneracion_bruta_mensual === "number" && Number.isFinite(f.remuneracion_bruta_mensual);
  const bruto = provided ? f.remuneracion_bruta_mensual! : 0;
  const obs = String(f.observaciones ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const missing = !provided;
  let cause: AnomaliaCausa | null = null;
  let label = missing ? "Monto no informado" : bruto === 0 ? "Monto cero informado" : bruto < 0 ? "Monto negativo informado" : "Importe publicado";
  let explanation = "Importe del registro publicado; no acredita por sí solo un sueldo mensual completo ni explica el motivo del pago.";
  if (missing) explanation = "La fuente no informa un monto en este registro. Esto no permite concluir si hubo o no pago.";
  else if (bruto === 0) explanation = "La fuente informa explícitamente monto cero. Esto no demuestra por sí solo ausencia de pago ni su motivo.";
  else if (bruto < 0) explanation = "La fuente informa un monto negativo; requiere revisar el registro original y no se interpreta como pago ordinario.";
  if (provided && /rectificaci|meses anteriores|reliquidaci|retroactiv|ajuste/.test(obs)) {
    cause = "ajuste_periodo_anterior";
    label = "Importe con observación de ajuste";
    explanation = "Las observaciones mencionan un ajuste; consulte el texto original para conocer su alcance. No se infiere el desglose del pago.";
  } else if (provided && /prorrate|\b\d+\s+dias\b|proporcional/.test(obs)) {
    cause = "prorrateo_dias_horas";
    label = "Importe con observación de proporcionalidad";
    explanation = "Las observaciones mencionan días o proporcionalidad; no se calcula una causa a partir de fechas de ingreso o término.";
  } else if (provided && /movilizaci|viatico|colaci|reembolso/.test(obs)) {
    cause = "asignacion_reembolso_menor";
    label = "Importe con observación de asignación";
    explanation = "Las observaciones mencionan una asignación o reembolso. El importe no demuestra por sí solo que ése sea su único componente.";
  }
  return {
    isAnomalia: false,
    // The published amount alone cannot establish that this is a complete salary.
    isSueldoCompleto: false,
    isSinPago: missing,
    // A low amount alone is not a source error or a partial payment.
    isMicroMonto: false,
    causaId: cause,
    etiquetaCausa: label,
    explicacionCiudadana: explanation,
    nivelConfianza: "En revisión de origen",
    urlRegistroOriginal: f.url || f.fuente || "https://www.portaltransparencia.cl/",
  };
}

/** Counts published amounts, never people or inferred complete salaries. */
export function summarizePayrollAmounts(rows: readonly { remuneracion_bruta_mensual?: unknown }[]) {
  const amountCounts = { positive: 0, zero: 0, negative: 0, missing: 0 };
  let grossSum = 0;
  let lowAmountCount = 0;
  for (const row of rows) {
    const value = row.remuneracion_bruta_mensual;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      amountCounts.missing++;
      continue;
    }
    grossSum += value;
    if (value === 0) amountCounts.zero++;
    else if (value < 0) amountCounts.negative++;
    else {
      amountCounts.positive++;
      if (value < 50_000) lowAmountCount++;
    }
  }
  const informedCount = rows.length - amountCounts.missing;
  return { amountCounts, informedCount, lowAmountCount, grossSum, meanAmount: informedCount ? Math.round(grossSum / informedCount) : null };
}
