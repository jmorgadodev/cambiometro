import fs from "fs";
import path from "path";
import { leerSnapshot } from "@/lib/snapshot";
import { PARTIDOS_SEED, POLITICOS_SEED } from "@/lib/seed-politicos";
import { leerInfoProbidadV1 } from "@/lib/infoprobidad-lake";
import { leerInfoLobbyV1 } from "@/lib/infolobby";
import type { Politico } from "@/lib/politicos";

export interface EtlRecord {
  id: string;
  nombre?: string;
  fecha?: string;
  organismo?: string;
  cargo?: string;
  distrito?: string | null;
  url?: string;
  fuente?: string;
  sujetos_activos?: string;
  asistentes?: string;
  materia?: string;
  descripcion?: string;
  resultado?: string;
  quorum?: string;
  tipo?: string;
  total_si?: string;
  total_no?: string;
  total_abstencion?: string;
  votos?: VotoRecord[];
  periodo?: string;
  item?: string;
  monto_clp?: number | null;
  [key: string]: string | number | null | string[] | VotoRecord[] | undefined;
}

export interface VotoRecord {
  id: string;
  nombre: string;
  opcion_valor: string;
  opcion: string;
}

interface EtlSnapshot {
  generado_por: string;
  actualizado_en?: string;
  fuentes: Record<string, EtlRecord[]>;
}

export interface SnapshotSourceSummary {
  key: string;
  label: string;
  count: number;
  url?: string;
}

export interface SnapshotSummary {
  generatedAt: string | null;
  generatedAtChile: string | null;
  totalRecords: number;
  sources: SnapshotSourceSummary[];
}

export interface PoliticoEvidence {
  source: SnapshotSourceSummary;
  records: EtlRecord[];
}

const snapshot = leerSnapshot() as EtlSnapshot;

const evidenciaCache = new Map<string, PoliticoEvidence[]>();

const SOURCE_LABELS: Record<string, { label: string; url: string }> = {
  congreso_opendata: {
    label: "Congreso Nacional · OpenData",
    url: "https://opendata.congreso.cl/wscamaradiputados.asmx/getDiputados_Vigentes",
  },
  infoprobidad: {
    label: "InfoProbidad · Consejo para la Transparencia",
    url: "https://datos.cplt.cl/",
  },
  infolobby: {
    label: "InfoLobby · Consejo para la Transparencia",
    url: "https://datos.infolobby.cl/",
  },
  votaciones_camara: {
    label: "Cámara de Diputados · Votaciones en sala (SOAP WSLegislativo)",
    url: "https://opendata.camara.cl/camaradiputados/WServices/WSLegislativo.asmx",
  },
  gastos_senado: {
    label: "Senado · Gastos operacionales (Transparencia activa)",
    url: "https://www.senado.cl/transparencia/gastos-operacionales-senadores",
  },
  gastos_camara: {
    label: "Cámara de Diputados · Gastos operacionales (rendiciones por diputado)",
    url: "https://www.camara.cl/diputados/detalle/gastosoperacionales.aspx",
  },
};

const normCache = new Map<string, string>();

/** Normaliza acentos y espacios para comparar nombres de fuentes heterogéneas. */
export function normalizeSearchText(value: unknown): string {
  if (typeof value !== "string") return "";
  const hit = normCache.get(value);
  if (hit !== undefined) return hit;
  const result = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  normCache.set(value, result);
  return result;
}

function normalizeTokens(value: string): string[] {
  return normalizeSearchText(value).split(" ").filter(Boolean);
}

/**
 * True si el nombre de la nómina (seedName, p.ej. "Vanessa Kaiser Barents-Von
 * Hohenhagen") aparece dentro del nombre oficial de la fuente (recordName, p.ej.
 * "VANESSA OLIMPIA KAISER BARENTS-VON HOHENHAGEN") como subsecuencia ordenada:
 * el último token debe coincidir y los del medio conservar el orden. Tolera que
 * el seed omita segundos nombres que sí publica la fuente.
 */
export function nameSequenceMatches(seedName: string, recordName: string): boolean {
  const seedTokens = normalizeTokens(seedName);
  const recordTokens = normalizeTokens(recordName);
  if (seedTokens.length < 2 || recordTokens.length < seedTokens.length) return false;
  const lastSeed = seedTokens[seedTokens.length - 1];
  const lastRec = recordTokens[recordTokens.length - 1];
  const lastMatches =
    lastSeed === lastRec ||
    (lastSeed.length >= 5 &&
      lastRec.length >= 5 &&
      (lastSeed.startsWith(lastRec) || lastRec.startsWith(lastSeed)));
  if (!lastMatches) return false;

  let cursor = 0;
  for (const recordToken of recordTokens) {
    const target = seedTokens[cursor];
    if (
      recordToken === target ||
      (target &&
        target.length >= 5 &&
        (recordToken.startsWith(target) || target.startsWith(recordToken)))
    ) {
      cursor += 1;
    }
  }
  return cursor === seedTokens.length;
}

function getSourceSummary(key: string, records: EtlRecord[]): SnapshotSourceSummary {
  const known = SOURCE_LABELS[key];
  return {
    key,
    label: known?.label ?? key,
    count: records.length,
    ...(known ? { url: known.url } : {}),
  };
}

export function getSnapshotSummary(): SnapshotSummary {
  const sources = Object.entries(snapshot.fuentes ?? {}).map(([key, records]) =>
    getSourceSummary(key, records)
  );
  const generatedAt = snapshot.actualizado_en ?? null;

  return {
    generatedAt,
    generatedAtChile: generatedAt
      ? new Intl.DateTimeFormat("es-CL", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "America/Santiago",
        }).format(new Date(generatedAt))
      : null,
    totalRecords: sources.reduce((total, source) => total + source.count, 0),
    sources,
  };
}

function recordContainsPolitico(record: EtlRecord, normalizedName: string): boolean {
  if (record.nombre && nameSequenceMatches(normalizedName, record.nombre)) return true;
  return [record.sujetos_activos, record.asistentes]
    .filter((field): field is string => typeof field === "string" && field.length > 0)
    .some((field) => normalizeSearchText(field).includes(normalizedName));
}

export async function getEvidenceForPolitico(politico: Pick<Politico, "nombre_completo"> & { id?: string; cargo?: string }): Promise<PoliticoEvidence[]> {
  const cached = politico.id ? evidenciaCache.get(politico.id) : undefined;
  if (cached) return cached;
  const normalizedName = normalizeSearchText(politico.nombre_completo);
  if (normalizedName.length < 8) return [];

  const evidence = Object.entries(snapshot.fuentes ?? {})
    .map(([key, records]) => {
      const pool = key === "infoprobidad" ? (leerInfoProbidadV1()?.records ?? records) : records;
      return {
        source: getSourceSummary(key, pool),
        records: pool.filter((record) =>
          key === "gastos_senado"
            ? politico.cargo === "Senador" && Boolean(record.nombre) && nameSequenceMatches(politico.nombre_completo, record.nombre ?? "")
            : key === "gastos_camara"
              ? politico.cargo === "Diputado" && diputadoIdParaPolitico(politico) === String(record.diputado_id)
              : recordContainsPolitico(record, normalizedName)
        ),
      };
    })
    .filter((item) => item.records.length > 0);
  if (politico.id) evidenciaCache.set(politico.id, evidence);
  return evidence;
}

export function getPoliticoById(id: string): Politico | undefined {
  return POLITICOS_SEED.find((politico) => politico.id === id);
}

export interface VotacionDelPolitico {
  votacion: EtlRecord;
  voto: VotoRecord;
}

export interface TimelineEvento {
  fecha: string;
  titulo: string;
  detalle?: string;
  tipo: "vida" | "eleccion" | "periodo" | "votacion";
  url?: string;
  fuente?: string;
}

/**
 * Timeline construido solo con eventos con fuente real:
 * nacimiento (bcn.cl), elección general 2025 (Wikipedia, votos reales),
 * inicio del período 2026-2030 (nómina oficial) y votaciones en sala (Cámara).
 * Sin eventos inventados: cada entrada cita su fuente.
 */
export function getTimelineParaPolitico(politico: Pick<Politico, "nombre_completo" | "fecha_nacimiento" | "lugar_nacimiento" | "militancias" | "votos_2025" | "porcentaje_votos" | "cargo">): TimelineEvento[] {
  const eventos: TimelineEvento[] = [];

  if (politico.fecha_nacimiento) {
    eventos.push({
      fecha: politico.fecha_nacimiento,
      titulo: "Nacimiento",
      detalle: politico.lugar_nacimiento ?? undefined,
      tipo: "vida",
      fuente: "bcn.cl / Wikipedia",
    });
  }

  if (politico.votos_2025) {
    eventos.push({
      fecha: "2025-11-16",
      titulo: `Electo ${politico.cargo} con ${politico.votos_2025.toLocaleString("es-CL")} votos`,
      detalle: politico.porcentaje_votos
        ? `${politico.porcentaje_votos.toLocaleString("es-CL", { minimumFractionDigits: 2 })}% de los votos válidos`
        : undefined,
      tipo: "eleccion",
      fuente: "Wikipedia · resultados oficiales 2025",
    });
  }

  for (const militancia of politico.militancias ?? []) {
    if (!militancia.desde) continue;
    const rol = militancia.partido_nombre ?? "partido";
    eventos.push({
      fecha: militancia.desde,
      titulo: `Inicio de período · ${rol}`,
      detalle: militancia.hasta
        ? `Desde ${militancia.desde} hasta ${militancia.hasta}`
        : `Desde ${militancia.desde}`,
      tipo: "periodo",
      fuente: "Nómina oficial 2026-2030",
    });
  }

  // Incluir las votaciones destacadas sustantivas más recientes (excluyendo procedimentales tipo "1-Otros" y resoluciones sin título)
  const allVotaciones = getVotacionesParaPolitico(politico);
  const seenVoteKeys = new Set<string>();
  const destacadasVotaciones: typeof allVotaciones = [];

  for (const item of allVotaciones) {
    const desc = (item.votacion.descripcion ?? "").trim();
    // Excluir procedimentales "1-Otros", "1-otros", etc. y resoluciones genéricas sin título
    if (/^\d+-/i.test(desc) || /^1-otros/i.test(desc) || /^proyecto de resolución\s*n[°º]?\s*\d+$/i.test(desc)) {
      continue;
    }
    const boletin = item.votacion.boletin ? String(item.votacion.boletin) : undefined;
    const voteKey = boletin
      ? `bol:${boletin}`
      : `desc:${item.votacion.fecha || ""}_${desc.toLowerCase().replace(/\s+/g, " ")}_${item.voto.opcion}`;

    if (seenVoteKeys.has(voteKey)) continue;
    seenVoteKeys.add(voteKey);
    if (item.votacion.id) {
      if (seenVoteKeys.has(`id:${item.votacion.id}`)) continue;
      seenVoteKeys.add(`id:${item.votacion.id}`);
    }

    destacadasVotaciones.push(item);
    if (destacadasVotaciones.length >= 6) break;
  }

  for (const { votacion, voto } of destacadasVotaciones) {
    if (!votacion.fecha) continue;
    const boletin = votacion.boletin ? String(votacion.boletin) : undefined;
    const rawDesc = (votacion.descripcion ?? "").trim();

    // Título del proyecto primario limpio
    let tituloProyecto = rawDesc;
    if (!tituloProyecto || /^(decreto|oficio|archivo|resolución|proyecto de acuerdo|informe)\s*$/i.test(tituloProyecto) || /^boletín\s*n[°º]?\s*\d+/i.test(tituloProyecto)) {
      if (boletin) {
        tituloProyecto = `Proyecto de Ley (Boletín N° ${boletin})`;
      } else {
        // Regla: El Timeline SOLO incluye hitos con título catalogado; las votaciones sin título van únicamente al Historial
        continue;
      }
    }


    // Label de voto limpio
    let labelVoto = "Votó";
    const opc = (voto.opcion ?? "").toLowerCase();
    if (opc === "no vota" || opc === "sin emitir" || opc === "no emite") {
      labelVoto = "Presente, no votó";
    } else if (opc.includes("favor") || opc.includes("afirmativo") || opc.includes("aprueba")) {
      labelVoto = "Aprobó (A favor)";
    } else if (opc.includes("contra") || opc.includes("rechaza")) {
      labelVoto = "Rechazó (En contra)";
    } else if (opc.includes("absten")) {
      labelVoto = "Se abstuvo";
    } else if (opc.includes("pareo")) {
      labelVoto = "Pareo reglamentario";
    } else {
      labelVoto = `Votó ${voto.opcion}`;
    }

    const tramitacionUrl = boletin
      ? (politico.cargo === "Senador"
          ? `https://www.senado.cl/appsenado/templates/tramitacion/index.php?boletin_ini=${boletin.split("-")[0]}`
          : `https://www.camara.cl/legislacion/ProyectosDeLey/tramitacion.aspx?prmID=${boletin}`)
      : votacion.url;

    eventos.push({
      fecha: votacion.fecha.slice(0, 10),
      titulo: `${labelVoto} · ${tituloProyecto}`,
      detalle: [
        boletin ? `Boletín N° ${boletin}` : undefined,
        votacion.resultado ? `Resultado: ${votacion.resultado}` : undefined,
        votacion.quorum ? `Quórum: ${votacion.quorum}` : "Mayoría Simple",
      ]
        .filter(Boolean)
        .join(" · "),
      tipo: "votacion",
      url: tramitacionUrl,
      fuente: politico.cargo === "Senador" ? "Senado de la República · API Sala" : "Cámara de Diputados · WSLegislativo",
    });
  }

  return eventos.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/**
 * Entidades que registraron lobby con el político (InfoLobby, ley 20.730).
 * Prioriza la proyección v1 del lake (registros CSV oficiales con sujeto
 * pasivo y organismo) y cae a la ventana legacy del snapshot ETL.
 */
export function getEntidadesRelacionadas(politico: Pick<Politico, "nombre_completo">): EtlRecord[] {
  const normalizedName = normalizeSearchText(politico.nombre_completo);
  if (normalizedName.length < 8) return [];
  const pool = leerInfoLobbyV1()?.records ?? (snapshot.fuentes?.infolobby ?? []);
  return pool.filter((record) =>
    recordContainsPolitico(record, normalizedName)
  );
}

/**
 * Id del diputado en la nómina congreso_opendata (coincide con el prmId de las
 * páginas de transparencia de la Cámara, p. ej. 1208 = Jorge Díaz Ibarra).
 */
import diputadosIds from "../data/diputados-ids.json";

export function diputadoIdParaPolitico(politico: Pick<Politico, "nombre_completo">): string | null {
  const normalizedName = normalizeSearchText(politico.nombre_completo);
  if (normalizedName.length < 8) return null;
  const entries = Object.entries(diputadosIds);
  const match = entries.find(([id, nombre]) => normalizeSearchText(nombre as string) === normalizedName);
  return match ? match[0] : null;
}

/**
 * Gastos operativos rendidos por el parlamentario (último período publicado).
 * Senadores: Transparencia activa del Senado (asociación por nombre oficial).
 * Diputados: rendiciones mensuales de la Cámara (asociación por id de la
 * nómina congreso_opendata, que coincide con el prmId del sitio). Más
 * recientes primero.
 */
export function getGastosParaPolitico(
  politico: Pick<Politico, "nombre_completo"> & { cargo?: Politico["cargo"] }
): EtlRecord[] {
  if (politico.cargo === "Diputado") {
    const diputadoId = diputadoIdParaPolitico(politico);
    if (!diputadoId) return [];
    return (snapshot.fuentes?.gastos_camara ?? [])
      .filter((record) => String(record.diputado_id) === diputadoId)
      .sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
  }
  return (snapshot.fuentes?.gastos_senado ?? [])
    .filter((record) => Boolean(record.nombre) && nameSequenceMatches(politico.nombre_completo, record.nombre ?? ""))
    .sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
}

/**
 * Votaciones en sala donde aparece el parlamentario (por id del diputado en la
 * api de congreso, con fallback de nombre normalizado, y para el Senado por
 * nombre con tolerancia de apellidos). Ordenadas fecha ASC.
 */
function nombreCoincide(nombreVoto: string, nombreSeed: string): boolean {
  const voto = normalizeSearchText(nombreVoto);
  const seed = normalizeSearchText(nombreSeed);
  if (voto === seed) return true;
  // Senado: el API usa el nombre completo mientras la seed usa el nombre corto
  // (p. ej. "Carlos Ignacio Kuschel Silva" vs. "Carlos Kuschel Silva").
  // Fallback: los dos últimos tokens de la seed (apellidos) deben estar en el voto.
  const tokens = seed.split(" ");
  const apellidos = tokens.slice(-2);
  if (apellidos.length < 2) return false;
  return apellidos.every((apellido) => voto.includes(apellido));
}

import politicosVotacionesSubset from "@/data/lake-subsets/politicos-votaciones.subset.json";

let cachedVotacionesDataset: { votes: Record<string, [string, string][]>; sessions: Record<string, EtlRecord> } | null = null;

function getVotacionesDataset() {
  if (cachedVotacionesDataset) return cachedVotacionesDataset;
  try {
    const fullPath = path.join(process.cwd(), "data", "politicos-votaciones.json");
    if (fs.existsSync(fullPath)) {
      cachedVotacionesDataset = JSON.parse(fs.readFileSync(fullPath, "utf8"));
      return cachedVotacionesDataset;
    }
  } catch {}
  cachedVotacionesDataset = politicosVotacionesSubset as unknown as { votes: Record<string, [string, string][]>; sessions: Record<string, EtlRecord> };
  return cachedVotacionesDataset;
}

export function getVotacionesParaPolitico(
  politico: Pick<Politico, "nombre_completo"> & { id?: string }
): VotacionDelPolitico[] {
  let polId = politico.id;
  if (!polId) {
    const seed = POLITICOS_SEED.find(
      (p) => normalizeSearchText(p.nombre_completo) === normalizeSearchText(politico.nombre_completo)
    );
    polId = seed?.id;
  }

  const ds = getVotacionesDataset();
  const allVotes = (ds?.votes || {}) as Record<string, [string, string][]>;
  const sessions = (ds?.sessions || {}) as Record<string, EtlRecord>;

  if (polId && allVotes[polId]) {
    const pVotes = allVotes[polId];
    const result: VotacionDelPolitico[] = [];
    const seenSessionIds = new Set<string>();
    const seenVotingKeys = new Set<string>();
    for (const [sessionId, opcion] of pVotes) {
      if (seenSessionIds.has(sessionId)) continue;
      seenSessionIds.add(sessionId);
      const session = sessions[sessionId];
      if (!session) continue;
      const key = `${session.fecha || ""}_${String(session.descripcion || session.boletin || "").trim().toLowerCase()}_${opcion}`;
      if (seenVotingKeys.has(key)) continue;
      seenVotingKeys.add(key);
      result.push({
        votacion: session,
        voto: {
          id: String(polId),
          nombre: politico.nombre_completo,
          opcion,
          opcion_valor: "0",
        },
      });
    }
    result.sort((a, b) => (b.votacion.fecha ?? "").localeCompare(a.votacion.fecha ?? ""));
    if (result.length > 0) return result;
  }

  const normalizedName = normalizeSearchText(politico.nombre_completo);
  if (normalizedName.length < 8) return [];

  const diputado = (snapshot.fuentes?.congreso_opendata ?? []).find(
    (record) => normalizeSearchText(record.nombre ?? "") === normalizedName
  );
  const diputadoId = diputado?.id;

  const result: VotacionDelPolitico[] = [];
  for (const key of ["votaciones_camara", "votaciones_senado"] as const) {
    for (const votacion of snapshot.fuentes?.[key] ?? []) {
      const voto = (votacion.votos ?? []).find((v) =>
        diputadoId ? v.id === diputadoId || nombreCoincide(v.nombre, politico.nombre_completo) : nombreCoincide(v.nombre, politico.nombre_completo)
      );
      if (voto) result.push({ votacion, voto });
    }
  }
  result.sort((a, b) => (a.votacion.fecha ?? "").localeCompare(b.votacion.fecha ?? ""));
  return result;
}

export function getPartidoById(id: string) {
  return PARTIDOS_SEED.find((partido) => partido.id === id);
}

export async function getAllPoliticosWithEvidence() {
  return Promise.all(POLITICOS_SEED.map(async (politico) => ({
    politico,
    partido: getPartidoById(politico.partido_id) ?? null,
    evidencia: await getEvidenceForPolitico(politico),
  })));
}
