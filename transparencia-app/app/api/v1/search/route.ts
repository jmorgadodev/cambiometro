import { apiError, apiSuccess } from "@/lib/api-v1";
import { getPartidoById, normalizeSearchText } from "@/lib/data-source";
import { getFuncionariosPorOrganismo } from "@/lib/funcionarios";
import { legalEntityIdFromRut } from "@/lib/legal-rut";
import { MUNICIPALIDADES_SEED } from "@/lib/municipalidades";
import { POLITICOS_SEED } from "@/lib/seed-politicos";
import { readR2Entity } from "@/lib/r2-entities";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import evidenceStats from "@/data/politicos-evidences-stats.json";
import { enforcePublicRateLimit } from "@/lib/rate-limit";
import { searchEntities } from "@/lib/data-platform-d1";

function matches(query: string, ...values: Array<string | undefined>): boolean {
  return values.some((value) => value && normalizeSearchText(value).includes(query));
}

export async function GET(request: Request) {
  const limited = await enforcePublicRateLimit(request, "search");
  if (limited) return limited;
  const rawQuery = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (rawQuery.length < 2 || rawQuery.length > 80) {
    return apiError("INVALID_QUERY", "La consulta debe tener entre 2 y 80 caracteres.", 400);
  }
  const query = normalizeSearchText(rawQuery);
  if (!query) return apiError("INVALID_QUERY", "Debe proporcionar una consulta en ?q=.", 400);

  const authorityMatches = POLITICOS_SEED
    .map((politico) => ({ politico, partido: getPartidoById(politico.partido_id) }))
    .filter(({ politico, partido }) => matches(query, politico.nombre_completo, politico.cargo, politico.distrito_region)
      || matches(query, partido?.nombre, partido?.sigla))
    .map(({ politico, partido }) => ({
      type: "politico" as const,
      id: politico.id,
      nombre: politico.nombre_completo,
      cargo: politico.cargo,
      partido: partido?.sigla,
      region: politico.distrito_region,
      evidencia_etl: (evidenceStats[politico.id as keyof typeof evidenceStats] ?? [])
        .reduce((total, source) => total + source.count, 0),
      url: `/politico/${politico.id}`,
    }));
  const authorities = authorityMatches.slice(0, 25);

  const municipalityMatches = MUNICIPALIDADES_SEED
    .filter((municipalidad) => matches(query, municipalidad.nombre_comuna, municipalidad.alcalde_actual ?? undefined, municipalidad.region, municipalidad.partido_alcalde ?? undefined))
    .map((municipalidad) => ({
      type: "municipalidad" as const,
      id: municipalidad.id,
      nombre: `Municipalidad de ${municipalidad.nombre_comuna}`,
      alcalde: municipalidad.alcalde_actual,
      partido: municipalidad.partido_alcalde,
      region: municipalidad.region,
      url: `/municipalidades/${municipalidad.id}`,
    }));
  const municipalidades = municipalityMatches.slice(0, 25);

  const officialMatches = MUNICIPALIDADES_SEED.flatMap((municipalidad) => getFuncionariosPorOrganismo(municipalidad.id))
    .filter((funcionario) => matches(query, funcionario.nombre_completo, funcionario.organo_nombre, funcionario.cargo))
    .map((funcionario) => ({
      type: "funcionario" as const,
      id: funcionario.id,
      nombre: funcionario.nombre_completo,
      organo: funcionario.organo_nombre,
      cargo: funcionario.cargo,
      remuneracion_bruta: funcionario.remuneracion_bruta_mensual,
      url: "/funcionarios",
    }));
  const funcionarios = officialMatches.slice(0, 25);

  const canonicalMatches = (await searchEntities(rawQuery, 25)).map((entity) => ({
    type: "entidad" as const,
    id: entity.id,
    nombre: entity.name,
    cargo: entity.kind,
    url: `/entidades/${entity.id}`,
  }));
  const entityId = legalEntityIdFromRut(rawQuery);
  const rutMatches = entityId ? await (async () => {
    try {
      const { env } = await getCloudflareContext({ async: true });
      const entity = env.PUBLIC_DATA ? await readR2Entity(env.PUBLIC_DATA, entityId) : null;
      return entity ? [{ type: "entidad" as const, id: entity.id, nombre: entity.name, cargo: entity.kind, url: `/entidades/${entity.id}` }] : [];
    } catch {
      return [];
    }
  })() : [];
  const entidades = [...new Map(
    canonicalMatches.concat(rutMatches).map((entity) => [entity.id, entity]),
  ).values()].slice(0, 25);

  const total = authorityMatches.length + municipalityMatches.length + officialMatches.length + entidades.length;
  const returned = authorities.length + municipalidades.length + funcionarios.length + entidades.length;
  const echoedQuery = rawQuery.replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
  return apiSuccess(
    { autoridades: authorities, municipalidades, funcionarios, entidades },
    { query: echoedQuery, engine: "Indice textual sobre fuentes verificadas", total, returned, truncated: returned < total },
    { self: request.url },
    3600,
  );
}
