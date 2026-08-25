import { apiError, apiSuccess } from "@/lib/api-v1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { enforcePublicRateLimit } from "@/lib/rate-limit";
import { FUNCIONARIOS_FALLBACK_UPDATED_AT, queryFallbackFuncionarios } from "@/lib/funcionarios-fallback";
import { MUNICIPALIDADES_SEED } from "@/lib/municipalidades";
import type { FuncionarioPublico } from "@/lib/funcionarios";
import { classifyFuncionarioRecord } from "@/lib/funcionarios-quality";

export const dynamic = "force-dynamic";

interface CpltManifest {
  generatedAt: string;
  version: string;
  assets: Array<{ key: string }>;
  coverage: Array<{ communeId: string; administrationId: string; status: "available" | "unavailable" | "not_applicable" }>;
}

function positiveInteger(value: string | null, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

const CONTRACTS = new Set(["Todos", "Planta", "Contrata", "Honorarios", "CodigoTrabajo", "Codigo del Trabajo"]);
const ESTAMENTOS = new Set([
  "Todos",
  "Directivo",
  "Profesional",
  "Tecnico",
  "Técnico",
  "Administrativo",
  "Auxiliar",
  "Salud",
  "Médicos",
  "Educacion",
  "Educación",
  "Docentes",
]);
const SORTS = new Set(["sueldo_desc", "sueldo_asc", "horas_extras_desc", "nombre_asc", "nombre_desc"]);

function invalidQuery(params: URLSearchParams) {
  const query = (params.get("query") ?? "").trim();
  const organismo = params.get("muni") ?? "Todos";
  const contrato = params.get("contrato") ?? "Todos";
  const estamento = params.get("estamento") ?? "Todos";
  const sortBy = params.get("sortBy") ?? "sueldo_desc";
  const page = params.get("page");
  const limit = params.get("limit");
  if (query.length > 80 || (query.length > 0 && query.length < 2)) return "La busqueda debe tener entre 2 y 80 caracteres.";
  if (!/^(?:Todos|[a-z0-9][a-z0-9_-]{0,159})$/.test(organismo)) return "Organismo invalido.";
  if (!CONTRACTS.has(contrato)) return "Tipo de contrato invalido.";
  if (!ESTAMENTOS.has(estamento)) return "Estamento invalido.";
  if (!SORTS.has(sortBy)) return "Orden invalido.";
  if (page !== null && (!/^\d+$/.test(page) || Number(page) < 1 || Number(page) > 1_000)) return "Pagina invalida.";
  if (limit !== null && (!/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 100)) return "Limite invalido.";
  return null;
}

export async function GET(request: Request) {
  const limited = await enforcePublicRateLimit(request, "officials");
  if (limited) return limited;
  const params = new URL(request.url).searchParams;
  const validationError = invalidQuery(params);
  if (validationError) return apiError("INVALID_QUERY", validationError, 400);

  const query = (params.get("query") ?? "").trim().toLocaleLowerCase("es-CL");
  const organismoId = params.get("muni") ?? params.get("organismo") ?? "Todos";
  const tipoOrgano = params.get("tipo") ?? params.get("tipo_organo") ?? "Todos";
  const isAll = organismoId === "Todos" || !organismoId;

  const requestedCommune = isAll ? null : MUNICIPALIDADES_SEED.find((commune) => commune.id === organismoId);
  const administrationId = requestedCommune ? (requestedCommune.administracion_municipal_id ?? organismoId) : organismoId;
  const contrato = params.get("contrato") ?? "Todos";
  const estamento = params.get("estamento") ?? "Todos";
  const requestedPeriod = params.get("periodo") ?? params.get("fuente_periodo") ?? "Todos";
  const sortBy = params.get("sortBy") ?? "sueldo_desc";
  const soloHorasExtras = params.get("horas_extras") === "true" || params.get("soloHorasExtras") === "true";
  const minSueldo = params.get("min_sueldo") ? Number(params.get("min_sueldo")) : undefined;
  const maxSueldo = params.get("max_sueldo") ? Number(params.get("max_sueldo")) : undefined;

  const page = positiveInteger(params.get("page"), 1, 1_000);
  const limit = positiveInteger(params.get("limit"), 20, 100);

  try {
    if (isAll || !requestedCommune) throw new Error("NATIONAL_OR_CENTRAL_FALLBACK");
    const { env } = await getCloudflareContext({ async: true });
    if (!env.PUBLIC_DATA) throw new Error("R2_NOT_BOUND");
    const manifestObject = await env.PUBLIC_DATA.get("projections/funcionarios-v1/manifest.json");
    if (!manifestObject) throw new Error("CPLT_MANIFEST_NOT_FOUND");
    const manifest = (await manifestObject.json()) as CpltManifest;

    if (requestedCommune) {
      const coverage = manifest.coverage?.find((item) => item.communeId === requestedCommune.id);
      if (!coverage || coverage.status === "unavailable") throw new Error("CPLT_MUNICIPALITY_UNAVAILABLE");
    }

    const partitionKey = `projections/funcionarios-v1/versions/${manifest.version}/${administrationId}.json`;
    if (!manifest.assets.some((asset) => asset.key === partitionKey)) throw new Error("CPLT_PARTITION_NOT_LISTED");
    const partitionObject = await env.PUBLIC_DATA.get(partitionKey);
    if (!partitionObject) throw new Error("CPLT_PARTITION_NOT_FOUND");
    const rawAllRecords = (await partitionObject.json()) as FuncionarioPublico[];
    const allRecords = requestedPeriod && requestedPeriod !== "Todos"
      ? rawAllRecords.filter((f) => (f.fuente_periodo || f.periodo) === requestedPeriod)
      : rawAllRecords;

    // Métricas y desglose forense de calidad de datos
    const includeZero = params.get("include_zero") === "true";
    const onlyAnomalias = params.get("anomalias") === "true";
    
    const sinPagoRecords = allRecords.filter((f) => (f.remuneracion_bruta_mensual || 0) <= 0);
    const microMontoRecords = allRecords.filter(
      (f) => (f.remuneracion_bruta_mensual || 0) > 0 && (f.remuneracion_bruta_mensual || 0) < 50000
    );
    const sueldoCompletoRecords = allRecords.filter((f) => (f.remuneracion_bruta_mensual || 0) >= 50000);

    const sinPagoCount = sinPagoRecords.length;
    const microMontoCount = microMontoRecords.length;
    const sueldoCompletoCount = sueldoCompletoRecords.length;
    const observadosCount = sinPagoCount + microMontoCount;

    // Desglose de causas forenses sobre micro-montos
    const causasBreakdown = {
      ajuste_periodo_anterior: 0,
      prorrateo_dias_horas: 0,
      asignacion_reembolso_menor: 0,
      error_unidad_fuente: 0,
      anomalia_fuente: 0,
      nominal_sin_pago: sinPagoCount,
    };

    const anomaliasSample = microMontoRecords.map((f) => {
      const info = classifyFuncionarioRecord(f);
      if (info.causaId && info.causaId in causasBreakdown) {
        causasBreakdown[info.causaId]++;
      }
      return {
        id: f.id,
        nombre_completo: f.nombre_completo,
        cargo: f.cargo || "Sin cargo especificado",
        tipo_contrato: f.tipo_contrato || "Planta",
        estamento: f.estamento || "Profesional",
        remuneracion_bruta_mensual: f.remuneracion_bruta_mensual || 0,
        remuneracion_liquida_mensual: f.remuneracion_liquida_mensual || 0,
        fuente_periodo: f.fuente_periodo || "Período activo",
        observaciones: f.observaciones || "Sin observaciones",
        causaId: info.causaId,
        etiquetaCausa: info.etiquetaCausa,
        explicacionCiudadana: info.explicacionCiudadana,
        nivelConfianza: info.nivelConfianza,
        urlRegistroOriginal: info.urlRegistroOriginal,
      };
    });

    // D1: Excluir $0 por defecto del listado principal
    let filtered = includeZero
      ? [...allRecords]
      : onlyAnomalias
      ? [...microMontoRecords]
      : allRecords.filter((f) => (f.remuneracion_bruta_mensual || 0) > 0);

    if (query) {
      filtered = filtered.filter(
        (record) =>
          record.nombre_completo.toLocaleLowerCase("es-CL").includes(query) ||
          record.cargo.toLocaleLowerCase("es-CL").includes(query) ||
          (record.formacion && record.formacion.toLocaleLowerCase("es-CL").includes(query))
      );
    }

    if (contrato !== "Todos") filtered = filtered.filter((r) => (r.tipo_contrato || "").toLowerCase().includes(contrato.toLowerCase()));
    if (estamento !== "Todos") filtered = filtered.filter((r) => (r.estamento || "").toLowerCase().includes(estamento.toLowerCase()));
    if (soloHorasExtras) filtered = filtered.filter((r) => (r.horas_extras_mes_anterior || 0) > 0);
    if (minSueldo !== undefined) filtered = filtered.filter((r) => (r.remuneracion_bruta_mensual || 0) >= minSueldo);
    if (maxSueldo !== undefined) filtered = filtered.filter((r) => (r.remuneracion_bruta_mensual || 0) <= maxSueldo);

    // Ordenamiento
    filtered.sort((a, b) => {
      if (sortBy === "sueldo_asc") return (a.remuneracion_bruta_mensual || 0) - (b.remuneracion_bruta_mensual || 0);
      if (sortBy === "horas_extras_desc") return (b.horas_extras_mes_anterior || 0) - (a.horas_extras_mes_anterior || 0);
      if (sortBy === "nombre_asc") return a.nombre_completo.localeCompare(b.nombre_completo, "es-CL");
      if (sortBy === "nombre_desc") return b.nombre_completo.localeCompare(a.nombre_completo, "es-CL");
      return (b.remuneracion_bruta_mensual || 0) - (a.remuneracion_bruta_mensual || 0);
    });

    const total = filtered.length;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    // Estadísticas sobre registros válidos (D3)
    const validCalculable = allRecords.filter((f) => (f.remuneracion_bruta_mensual || 0) >= 50000);
    const totalSueldos = validCalculable.reduce((acc, f) => acc + (f.remuneracion_bruta_mensual || 0), 0);
    const promedioSueldo = validCalculable.length > 0 ? Math.round(totalSueldos / validCalculable.length) : 0;
    const conHorasExtras = validCalculable.filter((f) => (f.horas_extras_mes_anterior || 0) > 0).length;

    const sinPagoSample = sinPagoRecords.slice(0, 50).map((f) => ({
      id: f.id,
      nombre_completo: f.nombre_completo,
      cargo: f.cargo || "Sin cargo especificado",
      tipo_contrato: f.tipo_contrato || "Planta",
      estamento: f.estamento || "Administrativo",
      fuente_periodo: f.fuente_periodo || "Período activo",
      observaciones: f.observaciones || "Licencia sin goce / ex funcionario / sin pago en el período",
    }));

    return apiSuccess(
      data,
      {
        total,
        totalHeadcount: allRecords.length,
        sinPagoCount,
        microMontoCount,
        sueldoCompletoCount,
        observadosCount,
        causasBreakdown,
        anomaliasSample: anomaliasSample.slice(0, 50),
        sinPagoSample,
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        limit,
        updatedAt: manifest.generatedAt,
        communeId: organismoId,
        communeName: requestedCommune ? requestedCommune.nombre_comuna : "Organismos del Estado",
        stats: {
          totalMuni: allRecords.length,
          totalValidos: validCalculable.length,
          promedioSueldo,
          conHorasExtras,
          observadosCount,
          sinPagoCount,
          microMontoCount,
        },
      },
      { self: request.url },
      3600
    );
  } catch {
    const fallback = queryFallbackFuncionarios({
      query,
      organismoId: organismoId !== "Todos" ? organismoId : administrationId,
      tipoOrgano,
      contrato,
      estamento,
      periodo: requestedPeriod,
      sortBy,
      soloHorasExtras,
      minSueldo,
      maxSueldo,
      page,
      limit,
    });

    return apiSuccess(
      fallback.data,
      {
        total: fallback.total,
        page,
        totalPages: Math.max(1, Math.ceil(fallback.total / limit)),
        limit,
        updatedAt: FUNCIONARIOS_FALLBACK_UPDATED_AT,
        sourceStatus: "partial",
        stale: true,
        coverage: organismoId,
        coverageLabel: requestedCommune ? `Municipalidad de ${requestedCommune.nombre_comuna}` : "Todas las municipalidades (Consolidado Nacional)",
        stats: fallback.stats,
      },
      { self: request.url },
      300
    );
  }
}

