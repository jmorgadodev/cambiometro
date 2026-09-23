import type { Movimiento } from "./movimientos";
import { MOVIMIENTOS_TIPO_LABEL } from "./movimientos";
import type { MovementItem } from "@/components/home/MovementsTimeline";
import type { FeaturedVoteItem } from "@/components/home/FeaturedVotes";
import type { VotacionAnual, VotacionDestacada } from "./votaciones-destacadas";
import { tituloVotacionLegible } from "./votaciones-format";
import type { EtlSourceInfo } from "./etl-sources-data";
import type { PillarChapter } from "@/components/home/SourcesCatalog";

const GOVERNMENT_START = "2026-03-11";
const monthLabel = new Intl.DateTimeFormat("es-CL", { month: "short", timeZone: "UTC" });

export function buildEditorialMovements(movements: Movimiento[]): MovementItem[] {
  return movements
    .filter((movement) => movement.fecha >= GOVERNMENT_START && movement.fechaExacta !== false)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map((movement) => {
      const name = movement.salio?.nombre || movement.entro?.nombre || "";
      const kind = MOVIMIENTOS_TIPO_LABEL[movement.tipo_evento] || "Cambio de autoridad";
      const source = movement.fuentes?.find((item) => item.nivel === "oficial") ?? movement.fuentes?.[0];
      const date = new Date(`${movement.fecha}T12:00:00Z`);
      const status = movement.estado === "verificado_oficial" || movement.estado === "verificado"
        ? "VERIFICADO OFICIAL"
        : movement.estado === "corroborado" ? "CORROBORADO" : "EN CONFIRMACIÓN";
      return {
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
      };
    });
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
        hasNominalVotes: total > 0,
        link: `/votaciones-destacadas/?votacion=${encodeURIComponent(vote.votacion_id)}`,
      };
    });
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
