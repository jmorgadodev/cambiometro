import type { Movimiento, MovimientoSignal } from "./movimientos";
import { MOVIMIENTOS_TIPO_LABEL } from "./movimientos";
import type { MovementItem } from "@/components/home/MovementsTimeline";
import type { FeaturedVoteItem } from "@/components/home/FeaturedVotes";
import type { VotacionAnual, VotacionDestacada } from "./votaciones-destacadas";
import { tituloVotacionLegible } from "./votaciones-format";
import type { EtlSourceInfo } from "./etl-sources-data";
import type { PillarChapter } from "@/components/home/SourcesCatalog";

const GOVERNMENT_START = "2026-03-11";
const monthLabel = new Intl.DateTimeFormat("es-CL", { month: "short", timeZone: "UTC" });

export function buildEditorialMovements(movements: Movimiento[], signals: MovimientoSignal[] = []): MovementItem[] {
  const publishedMovements = movements
    .filter((movement) => movement.fecha >= GOVERNMENT_START && movement.fechaExacta !== false)
    .map((movement): { sortDate: string; item: MovementItem } => {
      const name = movement.salio?.nombre || movement.entro?.nombre || "";
      const kind = MOVIMIENTOS_TIPO_LABEL[movement.tipo_evento] || "Cambio de autoridad";
      const source = movement.fuentes?.find((item) => item.nivel === "oficial") ?? movement.fuentes?.[0];
      const date = new Date(`${movement.fecha}T12:00:00Z`);
      const status = movement.estado === "verificado_oficial" || movement.estado === "verificado"
        ? "VERIFICADO OFICIAL"
        : movement.estado === "corroborado" ? "CORROBORADO" : "EN CONFIRMACIÓN";
      return { sortDate: movement.fecha, item: {
        id: movement.id,
        refCode: movement.decreto_numero || "",
        day: String(date.getUTCDate()).padStart(2, "0"),
        month: monthLabel.format(date).replace(".", "").toUpperCase(),
        year: String(date.getUTCFullYear()),
        category: kind.toUpperCase(),
        title: name ? `${kind} de ${name}` : `${kind} en ${movement.organismo}`,
        desc: [movement.cargo, movement.organismo].filter(Boolean).join(" · "),
        source: source?.medio || "Fuente del registro",
        status,
        link: name ? `/movimientos/?q=${encodeURIComponent(name)}` : "/movimientos/",
      } };
    });

  const publishedSignals = signals
    .filter((signal) => signal.date && signal.date >= GOVERNMENT_START && /^\d{4}-\d{2}-\d{2}$/u.test(signal.date))
    .map((signal): { sortDate: string; item: MovementItem } => {
      const date = new Date(`${signal.date}T12:00:00Z`);
      return { sortDate: signal.date!, item: {
        id: signal.signal_id,
        refCode: "",
        day: String(date.getUTCDate()).padStart(2, "0"),
        month: monthLabel.format(date).replace(".", "").toUpperCase(),
        year: String(date.getUTCFullYear()),
        category: "RENUNCIA · EN CONFIRMACIÓN",
        title: signal.title,
        desc: [signal.role, signal.ministry, signal.region, signal.summary].filter(Boolean).join(" · "),
        source: signal.source_label,
        status: "EN CONFIRMACIÓN",
        link: `/movimientos/?q=${encodeURIComponent(signal.person_name || signal.title)}&estado=en_confirmacion`,
        dateQualifier: "FECHA DE PUBLICACIÓN",
      } };
    });

  return [...publishedMovements, ...publishedSignals]
    .sort((a, b) => b.sortDate.localeCompare(a.sortDate) || a.item.id.localeCompare(b.item.id))
    .slice(0, 3)
    .map(({ item }) => item);
}

export function buildEditorialVotes(selected: VotacionDestacada[], annual: VotacionAnual[]): FeaturedVoteItem[] {
  const byId = new Map(annual.map((vote) => [vote.votacion_id, vote]));
  return selected
    .filter((vote) => vote.resultado === "Aprobado" || vote.resultado === "Rechazado")
    .slice(0, 3)
    .map((vote) => {
      const detail = byId.get(vote.votacion_id);
      const favor = detail?.votos.favor ?? 0;
      const contra = detail?.votos.contra ?? 0;
      const abstencion = detail?.votos.abstencion ?? 0;
      const total = favor + contra + abstencion;
      const percentage = (value: number) => total > 0 ? Math.round(value / total * 100) : 0;
      return {
        id: vote.votacion_id,
        camara: vote.camara,
        fecha: new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${vote.fecha}T12:00:00Z`)).toUpperCase(),
        boletin: `BOLETÍN ${vote.boletin}`,
        etapa: detail?.tipo || "Votación de sala",
        dilemaCivico: vote.tags[0] || "VOTACIÓN EN SALA",
        titulo: tituloVotacionLegible(vote, detail?.tipo),
        impactoCiudadano: vote.resumen,
        veredicto: vote.resultado,
        veredictoTipo: vote.resultado === "Aprobado" ? "aprobado" : "rechazado",
        quorumExplicado: detail?.quorum || "",
        votosFavor: percentage(favor),
        votosContra: percentage(contra),
        votosAbstencion: percentage(abstencion),
        conteoVotosFavor: total > 0 ? favor : undefined,
        conteoVotosContra: total > 0 ? contra : undefined,
        conteoVotosAbstencion: total > 0 ? abstencion : undefined,
        totalVotosEmitidos: total > 0 ? total : undefined,
        hasNominalVotes: total > 0,
        link: `/votaciones-destacadas/?votacion=${encodeURIComponent(vote.votacion_id)}`,
      };
    });
}

interface VoteRecordLike {
  kind?: unknown;
  sourceId?: unknown;
  camara?: unknown;
  id?: unknown;
  occurredAt?: unknown;
  evidence?: { sourceUrl?: unknown };
  data?: Record<string, unknown>;
  votacion_id?: unknown;
  fecha?: unknown;
  fecha_original?: unknown;
  titulo?: unknown;
  descripcion?: unknown;
  resultado?: unknown;
  boletin?: unknown;
  tipo?: unknown;
  quorum?: unknown;
  fuente_url?: unknown;
  url?: unknown;
  votos?: { favor?: unknown; contra?: unknown; abstencion?: unknown };
  total_si?: unknown;
  total_no?: unknown;
  total_abstencion?: unknown;
}

function voteTimestamp(value: unknown, fallback: unknown): number {
  const text = String(value ?? "");
  const spanishDate = text.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/u);
  if (spanishDate) {
    const [, day, month, year, hour = "12", minute = "0", second = "0"] = spanishDate;
    return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  }
  const isoDate = String(fallback ?? text).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/u.test(isoDate) ? Date.parse(`${isoDate}T12:00:00Z`) : Number.NaN;
}

function numericVoteId(value: unknown): number {
  const match = String(value ?? "").match(/(\d+)$/u);
  return match ? Number(match[1]) : 0;
}

/** Adapts one bounded R2 page of official Senate votes for the home cards. */
export function buildLatestSenateVotes(
  records: readonly VoteRecordLike[],
  limit = 2,
  excludedIds: readonly string[] = [],
): FeaturedVoteItem[] {
  const excluded = new Set(excludedIds);
  return records
    .map((record) => {
      const data = record.data ?? record;
      const sourceId = String(record.sourceId ?? (record.camara === "Senado" ? "votaciones_senado" : ""));
      const kind = String(record.kind ?? "vote");
      const id = String(data.id ?? data.votacion_id ?? record.votacion_id ?? record.id ?? "");
      const occurredAt = String(record.occurredAt ?? data.fecha ?? record.fecha ?? "").slice(0, 10);
      const result = String(data.resultado ?? record.resultado ?? "");
      const isValid = sourceId === "votaciones_senado"
        && kind === "vote"
        && Boolean(id)
        && /^\d{4}-\d{2}-\d{2}$/u.test(occurredAt)
        && (result === "Aprobado" || result === "Rechazado")
        && !excluded.has(id);
      if (!isValid) return null;

      const favor = Number(data.total_si ?? record.votos?.favor) || 0;
      const contra = Number(data.total_no ?? record.votos?.contra) || 0;
      const abstencion = Number(data.total_abstencion ?? record.votos?.abstencion) || 0;
      const total = favor + contra + abstencion;
      const percentage = (value: number) => total > 0 ? Math.round(value / total * 100) : 0;
      const sourceUrl = String(record.evidence?.sourceUrl ?? data.url ?? record.fuente_url ?? "https://www.senado.cl/");
      const bulletin = String(data.boletin ?? record.boletin ?? "").trim();
      const title = String(data.descripcion ?? record.titulo ?? record.descripcion ?? "Votación de sala del Senado")
        .replace(/\s+/gu, " ")
        .trim();
      const verdictType: FeaturedVoteItem["veredictoTipo"] = result === "Aprobado" ? "aprobado" : "rechazado";
      const date = new Intl.DateTimeFormat("es-CL", {
        day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
      }).format(new Date(`${occurredAt}T12:00:00Z`)).toUpperCase();

      return {
        id,
        camara: "Senado",
        fecha: date,
        boletin: bulletin ? `BOLETÍN ${bulletin}` : "VOTACIÓN DE SALA",
        etapa: String(data.tipo ?? record.tipo ?? "Votación de sala"),
        dilemaCivico: "ÚLTIMA DEL SENADO",
        titulo: title,
        impactoCiudadano: title.length > 220 ? `${title.slice(0, 217).trimEnd()}…` : title,
        veredicto: result,
        veredictoTipo: verdictType,
        quorumExplicado: String(data.quorum ?? record.quorum ?? ""),
        votosFavor: percentage(favor),
        votosContra: percentage(contra),
        votosAbstencion: percentage(abstencion),
        conteoVotosFavor: favor,
        conteoVotosContra: contra,
        conteoVotosAbstencion: abstencion,
        totalVotosEmitidos: total,
        hasNominalVotes: total > 0,
        link: "/votaciones-destacadas/#ultimas-senado",
        linkLabel: "Ver en votaciones",
        sourceUrl,
        externalLink: false,
        sortAt: voteTimestamp(data.fecha_original ?? record.fecha_original, occurredAt),
        sortId: numericVoteId(data.votacion_id ?? id),
      };
    })
    .filter((vote): vote is NonNullable<typeof vote> => vote !== null)
    .sort((left, right) => right.sortAt - left.sortAt || right.sortId - left.sortId)
    .slice(0, Math.max(0, limit))
    .map((entry) => {
      const { sortAt, sortId, ...vote } = entry;
      void sortAt;
      void sortId;
      return vote;
    });
}

/** Places the newest Senate vote in the center, flanked by the next two newest. */
export function composeHomeLatestSenateVotes(latestSenateVotes: readonly FeaturedVoteItem[]): FeaturedVoteItem[] {
  const [newest, secondNewest, thirdNewest] = latestSenateVotes.slice(0, 3);
  if (!newest) return [];
  return [secondNewest, newest, thirdNewest].filter((vote): vote is FeaturedVoteItem => Boolean(vote));
}

const CHAPTERS = [
  { id: "dinero", romanNumeral: "I", title: "Dinero Público & Contrataciones", shortLabel: "Dinero & Contratos", question: "¿A dónde van los recursos del Estado y cómo se compran bienes y servicios?", categories: ["finanzas", "compras"] },
  { id: "poder", romanNumeral: "II", title: "Poder, Vínculos & Gestión de Intereses", shortLabel: "Poder & Lobby", question: "¿Qué relaciones y declaraciones se han publicado?", categories: ["probidad"] },
  { id: "leyes", romanNumeral: "III", title: "Decisión Legislativa", shortLabel: "Congreso", question: "¿Cómo votan la Cámara y el Senado?", categories: ["parlamento"] },
  { id: "control", romanNumeral: "IV", title: "Función Pública & Territorio", shortLabel: "Función Pública", question: "¿Qué personal y datos municipales están publicados?", categories: ["personal", "municipios"] },
] as const;

export function buildEditorialChapters(sources: EtlSourceInfo[]): PillarChapter[] {
  return CHAPTERS.map((chapter) => {
    const matching = sources.filter((source) => chapter.categories.some((category) => category === source.category));
    return {
      id: chapter.id,
      romanNumeral: chapter.romanNumeral,
      title: chapter.title,
      shortLabel: chapter.shortLabel,
      question: chapter.question,
      totalRecords: `${matching.reduce((total, source) => total + source.recordCount, 0).toLocaleString("es-CL")} registros`,
      sourcesCount: matching.length,
      sources: matching.map((source) => ({
        id: source.id,
        code: `SRC-${String(sources.indexOf(source) + 1).padStart(2, "0")}`,
        name: source.name,
        org: source.organization,
        scope: source.description,
        recordsCount: source.recordCount.toLocaleString("es-CL"),
        frequency: source.frequency,
        verificationStatus: source.statusText,
        link: source.viewLink,
      })),
    };
  }).filter((chapter) => chapter.sourcesCount > 0);
}
