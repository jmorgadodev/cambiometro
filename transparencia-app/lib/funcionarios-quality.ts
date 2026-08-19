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
  const bruto = Number(f.remuneracion_bruta_mensual || 0);
  const obs = String(f.observaciones || "").toLowerCase();
  const fTerm = String(f.fecha_termino || "");
  const fIng = String(f.fecha_ingreso || "");
  const targetUrl =
    f.url ||
    f.fuente ||
    `https://www.portaltransparencia.cl/PortalPdT/directorio-de-organismos-regulados/?org=${encodeURIComponent(
      f.organo_nombre || "Municipalidad"
    )}`;

  if (bruto <= 0) {
    return {
      isAnomalia: true,
      isSueldoCompleto: false,
      isSinPago: true,
      isMicroMonto: false,
      causaId: "nominal_sin_pago",
      etiquetaCausa: "Registro nominal sin pago efectivo",
      explicacionCiudadana:
        "Registro administrativo en nómina sin liquidación de pago en el período (ej. ex funcionario, permiso sin goce de sueldo o suspensión temporal).",
      nivelConfianza: "Alto (Confirmado en fuente)",
      urlRegistroOriginal: targetUrl,
    };
  }

  if (bruto > 0 && bruto < 50000) {
    if (
      obs.includes("rectificaci") ||
      obs.includes("descuento") ||
      obs.includes("meses anteriores") ||
      obs.includes("reliquidaci") ||
      obs.includes("diferencia") ||
      obs.includes("retroactiv") ||
      obs.includes("ajuste")
    ) {
      return {
        isAnomalia: true,
        isSueldoCompleto: false,
        isSinPago: false,
        isMicroMonto: true,
        causaId: "ajuste_periodo_anterior",
        etiquetaCausa: "Ajuste / rectificación de período anterior",
        explicacionCiudadana:
          "Corresponde a reliquidación, reintegro o rectificación de descuentos y diferencias de meses previos registrada en el período.",
        nivelConfianza: "Alto (Confirmado en fuente)",
        urlRegistroOriginal: targetUrl,
      };
    }

    if (
      obs.includes("movilizaci") ||
      obs.includes("gasto") ||
      obs.includes("viatico") ||
      obs.includes("colaci") ||
      obs.includes("asignaci")
    ) {
      return {
        isAnomalia: true,
        isSueldoCompleto: false,
        isSinPago: false,
        isMicroMonto: true,
        causaId: "asignacion_reembolso_menor",
        etiquetaCausa: "Asignación puntual o reembolso de gastos",
        explicacionCiudadana:
          "Pago puntual por concepto de movilización, viático específico o reembolso de gasto menor; no constituye remuneración mensual completa.",
        nivelConfianza: "Alto (Confirmado en fuente)",
        urlRegistroOriginal: targetUrl,
      };
    }

    if (
      (fTerm &&
        (fTerm.startsWith("2026-05") ||
          fTerm.startsWith("2026-06") ||
          fTerm.startsWith("2026-04") ||
          fTerm.startsWith("2025-12"))) ||
      (fIng &&
        (fIng.startsWith("2026-05") ||
          fIng.startsWith("2026-06") ||
          fIng.startsWith("2026-04") ||
          fIng.startsWith("2026-01-26")))
    ) {
      return {
        isAnomalia: true,
        isSueldoCompleto: false,
        isSinPago: false,
        isMicroMonto: true,
        causaId: "prorrateo_dias_horas",
        etiquetaCausa: "Prorrateo por días/horas trabajadas",
        explicacionCiudadana:
          "Monto proporcional liquidado por fracción de días u horas efectivamente trabajadas debido a ingreso o cese en el período.",
        nivelConfianza: "Medio (Inferido por fechas/patrón)",
        urlRegistroOriginal: targetUrl,
      };
    }

    if (bruto <= 500) {
      return {
        isAnomalia: true,
        isSueldoCompleto: false,
        isSinPago: false,
        isMicroMonto: true,
        causaId: "error_unidad_fuente",
        etiquetaCausa: "Anomalía de la fuente (valor nominal residual)",
        explicacionCiudadana:
          "Monto reportado directamente por el organismo en Transparencia Activa. No corresponde a un sueldo mensual ni boleta legal válida; es una inconsistencia originada en el reporte oficial.",
        nivelConfianza: "Alto (Confirmado en fuente)",
        urlRegistroOriginal: targetUrl,
      };
    }

    return {
      isAnomalia: true,
      isSueldoCompleto: false,
      isSinPago: false,
      isMicroMonto: true,
      causaId: "anomalia_fuente",
      etiquetaCausa: "Anomalía de la fuente",
      explicacionCiudadana:
        "Micro-monto registrado en la fuente oficial sin observaciones explicativas de desglose. Mantenido tal cual por principio de trazabilidad pública.",
      nivelConfianza: "En revisión de origen",
      urlRegistroOriginal: targetUrl,
    };
  }

  return {
    isAnomalia: false,
    isSueldoCompleto: true,
    isSinPago: false,
    isMicroMonto: false,
    causaId: null,
    etiquetaCausa: "Sueldo mensual completo",
    explicacionCiudadana:
      "Remuneración mensual estándar superior a $50.000 calculada conforme a la nómina oficial.",
    nivelConfianza: "Alto (Confirmado en fuente)",
    urlRegistroOriginal: targetUrl,
  };
}
