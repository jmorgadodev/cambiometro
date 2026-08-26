import type { FuncionarioPublico } from "./funcionarios";
import { classifyFuncionarioRecord } from "./funcionarios-quality";

export interface StaticFuncionariosQuery {
  query?: string;
  contrato?: string;
  estamento?: string;
  sortBy?: string;
  periodo?: string;
  page?: number;
  limit?: number;
  generatedAt?: string | null;
}

function normalized(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-CL").trim();
}

function salary(row: FuncionarioPublico) {
  const value = Number(row.remuneracion_bruta_mensual ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function sortRows(rows: FuncionarioPublico[], sortBy: string) {
  return rows.sort((left, right) => {
    if (sortBy === "sueldo_asc") return salary(left) - salary(right);
    if (sortBy === "horas_extras_desc") return Number(right.horas_extras_mes_anterior ?? 0) - Number(left.horas_extras_mes_anterior ?? 0);
    if (sortBy === "nombre_asc") return left.nombre_completo.localeCompare(right.nombre_completo, "es-CL");
    if (sortBy === "nombre_desc") return right.nombre_completo.localeCompare(left.nombre_completo, "es-CL");
    return salary(right) - salary(left);
  });
}

export function queryStaticFuncionarios(rows: FuncionarioPublico[], query: StaticFuncionariosQuery = {}) {
  const period = query.periodo && query.periodo !== "Todos" ? query.periodo : "Todos";
  const allRecords = period === "Todos"
    ? rows
    : rows.filter((row) => String(row.fuente_periodo ?? row.periodo ?? "") === period);
  const sinPago = allRecords.filter((row) => salary(row) <= 0);
  const microMonto = allRecords.filter((row) => salary(row) > 0 && salary(row) < 50_000);
  const sueldoCompleto = allRecords.filter((row) => salary(row) >= 50_000);
  const needle = normalized(query.query);
  const contract = normalized(query.contrato ?? "Todos");
  const estamento = normalized(query.estamento ?? "Todos");

  let filtered = allRecords.filter((row) => salary(row) > 0);
  if (needle) filtered = filtered.filter((row) => normalized(`${row.nombre_completo} ${row.cargo} ${row.formacion ?? ""}`).includes(needle));
  if (contract && contract !== "todos") filtered = filtered.filter((row) => normalized(row.tipo_contrato).includes(contract));
  if (estamento && estamento !== "todos") filtered = filtered.filter((row) => normalized(row.estamento).includes(estamento));
  sortRows(filtered, query.sortBy ?? "sueldo_desc");

  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.trunc(query.limit ?? 24)));
  const total = filtered.length;
  const anomaliasSample = microMonto.slice(0, 50).map((row) => {
    const info = classifyFuncionarioRecord(row);
    return {
      id: row.id,
      nombre_completo: row.nombre_completo,
      cargo: row.cargo,
      tipo_contrato: row.tipo_contrato,
      estamento: row.estamento,
      remuneracion_bruta_mensual: row.remuneracion_bruta_mensual,
      remuneracion_liquida_mensual: row.remuneracion_liquida_mensual,
      fuente_periodo: row.fuente_periodo ?? row.periodo ?? "",
      observaciones: row.observaciones ?? "",
      causaId: info.causaId,
      etiquetaCausa: info.etiquetaCausa,
      explicacionCiudadana: info.explicacionCiudadana,
      nivelConfianza: info.nivelConfianza,
      urlRegistroOriginal: info.urlRegistroOriginal,
    };
  });
  const causes = { ajuste_periodo_anterior: 0, prorrateo_dias_horas: 0, asignacion_reembolso_menor: 0, error_unidad_fuente: 0, anomalia_fuente: 0 };
  for (const row of microMonto) {
    const cause = classifyFuncionarioRecord(row).causaId;
    if (cause && cause in causes) causes[cause as keyof typeof causes] += 1;
  }
  const validSalaryTotal = sueldoCompleto.reduce((sum, row) => sum + salary(row), 0);
  const sinPagoSample = sinPago.slice(0, 50).map((row) => ({
    id: row.id,
    nombre_completo: row.nombre_completo,
    cargo: row.cargo,
    tipo_contrato: row.tipo_contrato,
    estamento: row.estamento,
    fuente_periodo: row.fuente_periodo ?? row.periodo ?? "",
    observaciones: row.observaciones ?? "",
  }));

  return {
    data: filtered.slice((page - 1) * limit, page * limit),
    meta: {
      total,
      totalHeadcount: allRecords.length,
      sinPagoCount: sinPago.length,
      microMontoCount: microMonto.length,
      sueldoCompletoCount: sueldoCompleto.length,
      observadosCount: sinPago.length + microMonto.length,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      limit,
      updatedAt: query.generatedAt ?? null,
      sourceStatus: "static-fallback",
      causasBreakdown: { ...causes, nominal_sin_pago: sinPago.length },
      anomaliasSample,
      sinPagoSample,
      stats: {
        totalMuni: allRecords.length,
        totalValidos: sueldoCompleto.length,
        promedioSueldo: sueldoCompleto.length ? Math.round(validSalaryTotal / sueldoCompleto.length) : 0,
        conHorasExtras: sueldoCompleto.filter((row) => Number(row.horas_extras_mes_anterior ?? 0) > 0).length,
        observadosCount: sinPago.length + microMonto.length,
        sinPagoCount: sinPago.length,
        microMontoCount: microMonto.length,
      },
    },
  };
}
