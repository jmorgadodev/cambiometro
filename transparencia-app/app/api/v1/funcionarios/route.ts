import { apiError, apiSuccess } from "@/lib/api-v1";
import { MUNICIPALIDADES_SEED } from "@/lib/municipalidades";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { enforcePublicRateLimit } from "@/lib/rate-limit";
import { FUNCIONARIOS_FALLBACK_UPDATED_AT, getFallbackFuncionarios } from "@/lib/funcionarios-fallback";

interface CpltManifest {
  generatedAt: string;
  version: string;
  recordCount: number;
  assets: Array<{ key: string }>;
  coverage: Array<{
    communeId: string;
    administrationId: string;
    status: "available" | "unavailable" | "not_applicable";
    recordCount: number;
  }>;
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limited = await enforcePublicRateLimit(request, "officials-by-organization");
  if (limited) return limited;
  const muniId = new URL(request.url).searchParams.get("muni");
  if (!muniId) return apiError("INVALID_QUERY", "Debe proporcionar ?muni=.", 400);
  const commune = MUNICIPALIDADES_SEED.find((municipalidad) => municipalidad.id === muniId);
  if (!commune) {
    return apiError("NOT_FOUND", "Municipalidad no encontrada.", 404);
  }

  try {
    const { env } = await getCloudflareContext({ async: true });
    if (!env.PUBLIC_DATA) throw new Error("R2_NOT_BOUND");
    const manifestObject = await env.PUBLIC_DATA.get("projections/funcionarios-v1/manifest.json");
    if (!manifestObject) throw new Error("CPLT_MANIFEST_NOT_FOUND");
    const manifest = await manifestObject.json() as CpltManifest;
    const coverage = manifest.coverage?.find((item) => item.communeId === muniId);
    if (!coverage) throw new Error("CPLT_COVERAGE_NOT_FOUND");
    if (coverage.status === "unavailable") {
      throw new Error("CPLT_STATUS_UNAVAILABLE");
    }
    const administrationId = coverage.administrationId;
    const key = `projections/funcionarios-v1/versions/${manifest.version}/${administrationId}.json`;
    if (!manifest.assets.some((asset) => asset.key === key)) throw new Error("CPLT_ASSET_NOT_LISTED");
    const object = await env.PUBLIC_DATA.get(key);
    if (!object) throw new Error("CPLT_VERSIONED_ASSET_NOT_FOUND");
    const records = await object.json<unknown[]>();
    return apiSuccess(records, {
      total: records.length,
      updatedAt: manifest.generatedAt,
      communeId: muniId,
      administrationId,
      administeredByAnotherMunicipality: administrationId !== muniId,
    }, { self: request.url }, 3600);
  } catch {
    const fallback = getFallbackFuncionarios(muniId || commune.administracion_municipal_id);
    return apiSuccess(fallback, {
      total: fallback.length,
      updatedAt: FUNCIONARIOS_FALLBACK_UPDATED_AT,
      sourceStatus: "partial",
      stale: true,
      coverage: muniId,
      coverageLabel: `Personal municipal de ${commune.nombre_comuna}; snapshot oficial verificado`,
    }, { self: request.url }, 300);
  }
}

