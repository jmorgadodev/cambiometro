import fs from "node:fs";
import path from "node:path";
import type { FuncionarioPublico } from "@/lib/funcionarios";
import { FUNCIONARIOS_REALES_POR_MUNI } from "@/lib/funcionarios-source";
import { classifyFuncionarioRecord } from "@/lib/funcionarios-quality";

// Fecha de corte del único respaldo embebido: nómina oficial CPLT de Maipú.
export const FUNCIONARIOS_FALLBACK_UPDATED_AT = "2026-06-30T00:00:00.000Z";

function normalized(value: string | undefined | null) {
  if (!value) return "";
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-CL");
}

function readOfficialArray(filePath: string): FuncionarioPublico[] | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function projectionRoots(): string[] {
  if (typeof process === "undefined" || !process.cwd) return [];
  const roots = [path.resolve(process.cwd(), "data/lake/projections/funcionarios-v1")];
  const versionsRoot = path.resolve(process.cwd(), "data/lake-cplt/projections/funcionarios-v1/versions");
  try {
    const newest = fs.readdirSync(versionsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left))[0];
    if (newest) roots.push(path.join(versionsRoot, newest));
  } catch {}
  return roots;
}

function loadOfficialFuncionarios(organismoId: string): FuncionarioPublico[] | null {
  for (const root of projectionRoots()) {
    const records = readOfficialArray(path.join(root, `${organismoId}.json`));
    if (records?.length) return records;
  }
  return null;
}

function deduplicate(records: FuncionarioPublico[]): FuncionarioPublico[] {
  const byKey = new Map<string, FuncionarioPublico>();
  for (const record of records) {
    if (!record?.nombre_completo || !record?.organo_nombre) continue;
    const key = record.id || `${record.nombre_completo}|${record.organo_nombre}|${record.tipo_contrato ?? ""}`;
    byKey.set(key, record);
  }
  return [...byKey.values()];
}

let cachedAll: FuncionarioPublico[] | null = null;

/**
 * Respaldo local exclusivamente oficial. R10: si una nómina no fue publicada o
 * materializada, devuelve [] y nunca genera personas, cargos ni remuneraciones.
 */
export function getFallbackFuncionarios(organismoId: string): FuncionarioPublico[] {
  if (organismoId === "Todos" || !organismoId) {
    if (cachedAll) return cachedAll;
    const records: FuncionarioPublico[] = Object.values(FUNCIONARIOS_REALES_POR_MUNI).flat();
    for (const root of projectionRoots()) {
      try {
        for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
          if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
          const official = readOfficialArray(path.join(root, entry.name));
          if (official) records.push(...official);
        }
      } catch {}
    }
    cachedAll = deduplicate(records);
    return cachedAll;
  }

  const official = loadOfficialFuncionarios(organismoId);
  if (official?.length) return deduplicate(official);
  return deduplicate(FUNCIONARIOS_REALES_POR_MUNI[organismoId] ?? []);
}

export function queryFallbackFuncionarios({
  query = "",
  organismoId = "Todos",
  tipoOrgano = "Todos",
  contrato = "Todos",
  estamento = "Todos",
  periodo = "Todos",
  sortBy = "sueldo_desc",
  soloHorasExtras = false,
  includeZero = false,
  minSueldo,
  maxSueldo,
  page = 1,
  limit = 20,
}: {
  query?: string;
  organismoId?: string;
  tipoOrgano?: string;
  contrato?: string;
  estamento?: string;
  periodo?: string;
  sortBy?: string;
  soloHorasExtras?: boolean;
  includeZero?: boolean;
  minSueldo?: number;
  maxSueldo?: number;
  page?: number;
  limit?: number;
}) {
  let allForOrg = [...getFallbackFuncionarios(organismoId)];
  if (periodo && periodo !== "Todos") {
    allForOrg = allForOrg.filter(
      (record) => (record.fuente_periodo || record.periodo) === periodo
    );
  }
  const amount = (record: FuncionarioPublico) => record.remuneracion_bruta_mensual ?? 0;
  const sinPagoRecords = allForOrg.filter((record) => amount(record) <= 0);
  const microMontoRecords = allForOrg.filter((record) => amount(record) > 0 && amount(record) < 50_000);
  const sueldoCompletoRecords = allForOrg.filter((record) => amount(record) >= 50_000);

  const causasBreakdown = {
    ajuste_periodo_anterior: 0,
    prorrateo_dias_horas: 0,
    asignacion_reembolso_menor: 0,
    error_unidad_fuente: 0,
    anomalia_fuente: 0,
    nominal_sin_pago: sinPagoRecords.length,
  };
  const anomaliasSample = microMontoRecords.map((record) => {
    const info = classifyFuncionarioRecord(record);
    if (info.causaId && info.causaId in causasBreakdown) causasBreakdown[info.causaId]++;
    return {
      id: record.id,
      nombre_completo: record.nombre_completo,
      cargo: record.cargo ?? null,
      tipo_contrato: record.tipo_contrato ?? null,
      estamento: record.estamento ?? null,
      remuneracion_bruta_mensual: record.remuneracion_bruta_mensual ?? null,
      remuneracion_liquida_mensual: record.remuneracion_liquida_mensual ?? null,
      fuente_periodo: record.fuente_periodo ?? null,
      observaciones: record.observaciones ?? null,
      causaId: info.causaId,
      etiquetaCausa: info.etiquetaCausa,
      explicacionCiudadana: info.explicacionCiudadana,
      nivelConfianza: info.nivelConfianza,
      urlRegistroOriginal: info.urlRegistroOriginal,
    };
  });

  let filtered = includeZero ? allForOrg : allForOrg.filter((record) => amount(record) > 0);
  if (tipoOrgano && tipoOrgano !== "Todos") {
    const normTipo = normalized(tipoOrgano);
    filtered = filtered.filter((record) => {
      const actual = normalized(record.organo_tipo);
      if (normTipo.includes("muni")) return actual.includes("muni");
      if (normTipo.includes("minis")) return actual.includes("minis");
      if (normTipo.includes("subsec")) return actual.includes("subsec");
      if (normTipo.includes("gore")) return actual.includes("gore") || actual.includes("regional");
      if (normTipo.includes("empresa")) return actual.includes("empresa");
      if (normTipo.includes("serv")) return actual.includes("serv") || actual.includes("super");
      return actual.includes(normTipo);
    });
  }
  const needle = normalized(query);
  if (needle) {
    filtered = filtered.filter((record) =>
      normalized(`${record.nombre_completo} ${record.cargo ?? ""} ${record.organo_nombre}`).includes(needle)
    );
  }
  if (contrato !== "Todos") filtered = filtered.filter((record) => record.tipo_contrato === contrato);
  if (estamento !== "Todos") filtered = filtered.filter((record) => normalized(record.estamento).includes(normalized(estamento)));
  if (soloHorasExtras) filtered = filtered.filter((record) => (record.horas_extras_mes_anterior ?? 0) > 0);
  if (minSueldo && minSueldo > 0) filtered = filtered.filter((record) => amount(record) >= minSueldo);
  if (maxSueldo && maxSueldo > 0) filtered = filtered.filter((record) => amount(record) <= maxSueldo);

  filtered.sort((left, right) => {
    if (sortBy === "nombre_asc") return left.nombre_completo.localeCompare(right.nombre_completo, "es-CL");
    if (sortBy === "nombre_desc") return right.nombre_completo.localeCompare(left.nombre_completo, "es-CL");
    if (sortBy === "sueldo_asc") return amount(left) - amount(right);
    if (sortBy === "horas_extras_desc") return (right.horas_extras_mes_anterior ?? 0) - (left.horas_extras_mes_anterior ?? 0);
    return amount(right) - amount(left);
  });

  const total = filtered.length;
  const start = (page - 1) * limit;
  const totalSueldos = sueldoCompletoRecords.reduce((sum, record) => sum + amount(record), 0);
  const promedioSueldo = sueldoCompletoRecords.length > 0 ? Math.round(totalSueldos / sueldoCompletoRecords.length) : 0;
  const conHorasExtras = sueldoCompletoRecords.filter((record) => (record.horas_extras_mes_anterior ?? 0) > 0).length;
  const sinPagoSample = sinPagoRecords.slice(0, 50).map((record) => ({
    id: record.id,
    nombre_completo: record.nombre_completo,
    cargo: record.cargo ?? null,
    tipo_contrato: record.tipo_contrato ?? null,
    estamento: record.estamento ?? null,
    fuente_periodo: record.fuente_periodo ?? null,
    observaciones: record.observaciones ?? null,
  }));
  const observadosCount = sinPagoRecords.length + microMontoRecords.length;

  return {
    data: filtered.slice(start, start + limit),
    total,
    totalHeadcount: allForOrg.length,
    sinPagoCount: sinPagoRecords.length,
    microMontoCount: microMontoRecords.length,
    sueldoCompletoCount: sueldoCompletoRecords.length,
    observadosCount,
    causasBreakdown,
    anomaliasSample: anomaliasSample.slice(0, 50),
    sinPagoSample,
    stats: {
      totalMuni: allForOrg.length,
      totalValidos: sueldoCompletoRecords.length,
      promedioSueldo,
      conHorasExtras,
      observadosCount,
      sinPagoCount: sinPagoRecords.length,
      microMontoCount: microMontoRecords.length,
    },
  };
}
