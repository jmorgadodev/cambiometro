import type { D1Database } from "@cloudflare/workers-types";
import type { EtlRecord, VotacionDelPolitico, VotoRecord } from "@/lib/data-source";
import { getVotacionesParaPolitico, nameSequenceMatches } from "@/lib/data-source";
import { getD1Database } from "@/lib/db";

export interface CanonicalPoliticoRecordRow {
  id: string;
  source_id: string;
  kind: string;
  title: string;
  description: string | null;
  occurred_at: string | null;
  period_json: string;
  subject_entity_ids_json: string;
  object_entity_ids_json: string;
  amount_json: string | null;
  evidence_json: string;
  data_json: string;
}

interface PoliticoDescriptor {
  cargo: string | null | undefined;
  nombreCompleto: string;
  camaraId: string | null | undefined;
  politicoId?: string | null;
}

interface CandidateEntity {
  id: string;
  name: string;
}

function jsonObject(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

import { POLITICOS_SEED } from "@/lib/seed-politicos";
import { diputadoIdParaPolitico, normalizeSearchText } from "@/lib/data-source";
import diputadosIds from "@/data/diputados-ids.json";

export function politicoIdFromEntityId(entityId: string, entityName?: string): string | null {
  if (!entityId) return null;
  const cleanId = entityId.trim();

  // Si ya es un ID de político
  if (cleanId.startsWith("dip-") || cleanId.startsWith("sen-")) {
    const exists = POLITICOS_SEED.find((p) => p.id === cleanId);
    if (exists) return exists.id;
  }

  // person-camara-XXXX (ej. person-camara-1009)
  if (cleanId.startsWith("person-camara-")) {
    const camaraId = cleanId.replace("person-camara-", "");
    for (const pol of POLITICOS_SEED) {
      if (pol.cargo === "Diputado" && diputadoIdParaPolitico(pol) === camaraId) {
        return pol.id;
      }
    }
    const nombreEnMap = (diputadosIds as Record<string, string>)[camaraId];
    if (nombreEnMap) {
      const match = POLITICOS_SEED.find(
        (p) => normalizeSearchText(p.nombre_completo) === normalizeSearchText(nombreEnMap)
      );
      if (match) return match.id;
    }
  }

  // person-senado-XXXX
  if (cleanId.startsWith("person-senado-")) {
    const raw = cleanId.replace("person-senado-", "").replace(/-/g, " ");
    const matchSen = POLITICOS_SEED.find(
      (p) =>
        p.cargo === "Senador" &&
        (normalizeSearchText(p.nombre_completo).includes(normalizeSearchText(raw)) ||
          nameSequenceMatches(p.nombre_completo, raw))
    );
    if (matchSen) return matchSen.id;
  }

  // Por nombre de entidad si se provee
  if (entityName) {
    const normalized = normalizeSearchText(entityName);
    if (normalized.length >= 8) {
      const match = POLITICOS_SEED.find(
        (p) =>
          normalizeSearchText(p.nombre_completo) === normalized ||
          nameSequenceMatches(p.nombre_completo, entityName)
      );
      if (match) return match.id;
    }
  }

  return null;
}

export function politicoCanonicalEntityIds(
  politico: PoliticoDescriptor,
  candidates: CandidateEntity[],
): string[] {
  if (politico.cargo === "Diputado" && politico.camaraId) {
    return [`person-camara-${politico.camaraId}`];
  }
  if (politico.cargo !== "Senador") return [];
  return candidates
    .filter((candidate) => nameSequenceMatches(politico.nombreCompleto, candidate.name))
    .map((candidate) => candidate.id);
}

export function expenseRowToEtlRecord(row: CanonicalPoliticoRecordRow): EtlRecord {
  const data = jsonObject(row.data_json);
  const amount = jsonObject(row.amount_json);
  const evidence = jsonObject(row.evidence_json);
  const period = jsonObject(row.period_json);
  const amountClp = amount.amountClp ?? amount.value;
  const periodo = String(data.periodo ?? period.label ?? "");

  return {
    id: row.id,
    nombre: typeof data.nombre === "string" ? data.nombre : undefined,
    fecha: row.occurred_at ?? (periodo ? `${periodo}-01` : undefined),
    periodo: periodo || undefined,
    item: typeof data.item === "string" ? data.item : row.title,
    monto_clp: typeof amountClp === "number" && Number.isFinite(amountClp) ? amountClp : null,
    url: typeof evidence.sourceUrl === "string" ? evidence.sourceUrl : undefined,
    fuente: row.source_id,
    descripcion: row.description ?? undefined,
  };
}

function joinedNames(value: unknown, keys: string[]): string | undefined {
  if (typeof value === "string") return value || undefined;
  if (!Array.isArray(value)) return undefined;
  const names = value.map((item) => {
    if (!item || typeof item !== "object") return "";
    const row = item as Record<string, unknown>;
    const found = keys.map((key) => row[key]).find((entry) => typeof entry === "string");
    return typeof found === "string" ? found.trim() : "";
  }).filter(Boolean);
  return names.length > 0 ? names.join(" · ") : undefined;
}

export function lobbyRowToEtlRecord(row: CanonicalPoliticoRecordRow): EtlRecord {
  const data = jsonObject(row.data_json);
  const evidence = jsonObject(row.evidence_json);
  const details = Array.isArray(data.detalle) ? data.detalle : [];
  const firstDetail = details[0] && typeof details[0] === "object"
    ? details[0] as Record<string, unknown>
    : {};

  return {
    id: row.id,
    nombre: typeof data.sujeto_pasivo === "string" ? data.sujeto_pasivo : undefined,
    fecha: row.occurred_at ?? undefined,
    organismo: typeof data.organismo === "string" ? data.organismo : undefined,
    materia: typeof data.materia === "string"
      ? data.materia
      : typeof firstDetail.materia === "string" ? firstDetail.materia : undefined,
    descripcion: typeof data.descripcion === "string" ? data.descripcion : row.description ?? undefined,
    sujetos_activos: joinedNames(data.sujetos_activos, ["activo", "nombre"]),
    asistentes: joinedNames(data.otros_asistentes, ["asistente", "nombre"]),
    url: typeof evidence.sourceUrl === "string" ? evidence.sourceUrl : undefined,
    fuente: row.source_id,
    lobby_event_kind: typeof data.lobby_event_kind === "string" ? data.lobby_event_kind : undefined,
    destino: typeof data.destino === "string" ? data.destino : undefined,
    costo_original: typeof data.costo_original === "string" || typeof data.costo_original === "number" ? data.costo_original : undefined,
    financistas: typeof data.financistas === "string" ? data.financistas : undefined,
    ocasion: typeof data.ocasion === "string" ? data.ocasion : undefined,
  };
}

async function senatorCandidateEntities(db: D1Database): Promise<CandidateEntity[]> {
  const { results } = await db.prepare(
    "SELECT id,name FROM entities WHERE kind='person' AND (id LIKE 'senator-cl-ue-%' OR id LIKE 'person-senado-%')",
  ).all<CandidateEntity>();
  return results ?? [];
}

/**
 * Obtiene rendiciones desde el modelo canónico. La unión usa record_subjects,
 * no búsquedas parciales dentro de JSON, para que el ID oficial sea exacto.
 */
export async function getCanonicalGastosParaPolitico(
  politico: PoliticoDescriptor,
): Promise<EtlRecord[]> {
  const db = await getD1Database();
  if (!db) return [];

  try {
    const candidates = politico.cargo === "Senador" ? await senatorCandidateEntities(db) : [];
    const entityIds = politicoCanonicalEntityIds(politico, candidates);
    if (entityIds.length === 0) return [];
    const placeholders = entityIds.map(() => "?").join(",");
    const { results } = await db.prepare(`
      SELECT DISTINCT records.*
      FROM records
      INNER JOIN record_subjects ON record_subjects.record_id = records.id
      WHERE record_subjects.entity_id IN (${placeholders}) AND records.kind = 'expense'
      ORDER BY records.occurred_at DESC, records.id ASC
      LIMIT 1000
    `).bind(...entityIds).all<CanonicalPoliticoRecordRow>();
    return (results ?? []).map(expenseRowToEtlRecord);
  } catch (error) {
    console.error("Error al consultar gastos canónicos de la ficha:", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function getCanonicalLobbyParaPolitico(nombreCompleto: string): Promise<EtlRecord[]> {
  const db = await getD1Database();
  if (!db) return [];
  const surnameTokens = nombreCompleto.split(/\s+/).map((token) => token.replace(/[^\p{L}\p{N}-]/gu, "")).filter(Boolean).slice(-2);
  if (surnameTokens.length === 0) return [];

  try {
    const clauses = surnameTokens.map(() => "name LIKE ? COLLATE NOCASE").join(" AND ");
    const { results: candidates } = await db.prepare(`
      SELECT id,name FROM entities
      WHERE kind='person' AND id LIKE 'person-infolobby-%' AND ${clauses}
      LIMIT 250
    `).bind(...surnameTokens.map((token) => `%${token}%`)).all<CandidateEntity>();
    const entityIds = (candidates ?? [])
      .filter((candidate) => nameSequenceMatches(nombreCompleto, candidate.name))
      .map((candidate) => candidate.id);
    if (entityIds.length === 0) return [];
    const placeholders = entityIds.map(() => "?").join(",");
    const { results } = await db.prepare(`
      SELECT DISTINCT records.*
      FROM records
      INNER JOIN record_subjects ON record_subjects.record_id = records.id
      WHERE record_subjects.entity_id IN (${placeholders})
        AND records.source_id = 'infolobby'
        AND records.kind = 'lobby'
      ORDER BY records.occurred_at DESC, records.id ASC
      LIMIT 250
    `).bind(...entityIds).all<CanonicalPoliticoRecordRow>();
    return (results ?? []).map(lobbyRowToEtlRecord);
  } catch (error) {
    console.error("Error al consultar lobby canónico de la ficha:", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function getCanonicalVotacionesParaPolitico(
  politico: PoliticoDescriptor,
): Promise<VotacionDelPolitico[]> {
  const db = await getD1Database();
  if (!db) {
    return getVotacionesParaPolitico({ nombre_completo: politico.nombreCompleto, id: politico.politicoId ?? undefined });
  }

  try {
    const candidates = politico.cargo === "Senador" ? await senatorCandidateEntities(db) : [];
    const entityIds = politicoCanonicalEntityIds(politico, candidates);
    if (entityIds.length === 0) {
      return getVotacionesParaPolitico({ nombre_completo: politico.nombreCompleto, id: politico.politicoId ?? undefined });
    }
    const placeholders = entityIds.map(() => "?").join(",");
    const { results } = await db.prepare(`
      SELECT DISTINCT records.*
      FROM records
      INNER JOIN record_subjects ON record_subjects.record_id = records.id
      WHERE record_subjects.entity_id IN (${placeholders}) AND records.kind = 'vote'
      ORDER BY records.occurred_at DESC, records.id ASC
      LIMIT 1000
    `).bind(...entityIds).all<CanonicalPoliticoRecordRow>();

    const output: VotacionDelPolitico[] = [];
    for (const row of results ?? []) {
      const data = jsonObject(row.data_json);
      const evidence = jsonObject(row.evidence_json);
      const period = jsonObject(row.period_json);

      const votosArray = Array.isArray(data.votos) ? (data.votos as Array<Record<string, unknown>>) : [];
      const votosMap = (data.votos_map && typeof data.votos_map === "object" ? data.votos_map : {}) as Record<string, string>;

      const votoMatch = votosArray.find((v) => {
        const id = String(v.id ?? "");
        const nombre = String(v.nombre ?? "");
        if (politico.camaraId && (id === politico.camaraId || id === `person-camara-${politico.camaraId}`)) return true;
        return nameSequenceMatches(politico.nombreCompleto, nombre);
      });

      const opcion = votoMatch?.opcion
        ? String(votoMatch.opcion)
        : politico.camaraId && votosMap[politico.camaraId]
          ? votosMap[politico.camaraId]
          : typeof data.opcion === "string"
            ? data.opcion
            : "Sin registro";

      const votoRecord: VotoRecord = {
        id: String(votoMatch?.id ?? row.id),
        nombre: String(votoMatch?.nombre ?? politico.nombreCompleto),
        opcion,
        opcion_valor: String(votoMatch?.opcion_valor ?? "0"),
      };

      const votacionRecord: EtlRecord = {
        id: row.id,
        nombre: row.title,
        fecha: row.occurred_at ?? undefined,
        periodo: String(data.periodo ?? period.label ?? ""),
        materia: typeof data.materia === "string" ? data.materia : row.title,
        descripcion: row.description ?? (typeof data.descripcion === "string" ? String(data.descripcion) : undefined),
        resultado: typeof data.resultado === "string" ? data.resultado : undefined,
        quorum: typeof data.quorum === "string" ? data.quorum : undefined,
        total_si: typeof data.total_si === "string" || typeof data.total_si === "number" ? String(data.total_si) : undefined,
        total_no: typeof data.total_no === "string" || typeof data.total_no === "number" ? String(data.total_no) : undefined,
        total_abstencion: typeof data.total_abstencion === "string" || typeof data.total_abstencion === "number" ? String(data.total_abstencion) : undefined,
        votos: votosArray.map((v) => ({
          id: String(v.id ?? ""),
          nombre: String(v.nombre ?? ""),
          opcion: String(v.opcion ?? ""),
          opcion_valor: String(v.opcion_valor ?? ""),
        })),
        url: typeof evidence.sourceUrl === "string" ? evidence.sourceUrl : undefined,
        fuente: row.source_id,
      };

      output.push({ votacion: votacionRecord, voto: votoRecord });
    }

    if (output.length === 0 || output.every((row) => row.voto.opcion === "Sin registro")) {
      return getVotacionesParaPolitico({ nombre_completo: politico.nombreCompleto, id: politico.politicoId ?? undefined });
    }

    return output;
  } catch (error) {
    console.error("Error al consultar votaciones canónicas de la ficha:", error instanceof Error ? error.message : error);
    return getVotacionesParaPolitico({ nombre_completo: politico.nombreCompleto, id: politico.politicoId ?? undefined });
  }
}
