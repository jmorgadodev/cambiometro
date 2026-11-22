import type { EvidenceRecord } from "./data-contracts";
import camaraDeputyNames from "../data/diputados-ids.json";
import { normalizeVotingSearch, isVotingDate } from "./voting-workspace";
export interface ExplorerNominal {
    id: string;
    name: string;
    option: string;
}
export interface ExplorerVote {
    id: string;
    chamber: "Cámara" | "Senado";
    date: string;
    title: string;
    description: string;
    bulletin: string | null;
    result: string;
    quorum: string | null;
    type: string | null;
    sourceUrl: string;
    sessionId: string | null;
    projectTitle?: string | null;
    projectState?: string | null;
    stage?: string | null;
    procedureUrl?: string | null;
    reportUrl?: string | null;
    law?: string | null;
    counts: {
        favor: number | null;
        contra: number | null;
        abstencion: number | null;
    };
    nominal: ExplorerNominal[];
    nominalStatus: "validated" | "unavailable" | "review";
}
export interface VoteQuery {
    chamber: "Ambas" | "Cámara" | "Senado";
    from: string;
    to: string;
    query: string;
}
export function officialCount(value: unknown): number | null {
    if ((typeof value !== "number" && typeof value !== "string") || (typeof value === "string" && !value.trim()))
        return null;
    const n = Number(value);
    return Number.isSafeInteger(n) && n >= 0 ? n : null;
}
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
export function sessionFromUrl(url: string, chamber: ExplorerVote["chamber"]): string | null {
    try {
        const u = new URL(url);
        if (u.protocol !== "https:")
            return null;
        if (chamber === "Senado" && (u.hostname === "web-back.senado.cl" || u.hostname === "www.senado.cl" || u.hostname === "senado.cl")) {
            const id = u.searchParams.get("id_sesion") ?? u.pathname.match(/\/sesiones-de-sala\/(\d+)\/?$/)?.[1];
            return /^[1-9]\d*$/.test(id ?? "") ? id! : null;
        }
    }
    catch { }
    return null;
}
export type NominalOption = "favor" | "contra" | "abstencion" | "no-vota" | "pareo" | "dispensado";
export const NOMINAL_OPTIONS: Record<NominalOption, string> = {
    favor: "A favor", contra: "En contra", abstencion: "Abstención",
    "no-vota": "Sin voto emitido", pareo: "Pareo", dispensado: "Dispensado",
};
export function nominalOption(value: string): NominalOption | null {
    const n = normalizeVotingSearch(value).replace(/\s+/g, " ");
    if (["afirmativo", "a favor"].includes(n)) return "favor";
    if (["en contra", "negativo"].includes(n)) return "contra";
    if (["abstencion", "abstiene"].includes(n)) return "abstencion";
    if (["no vota", "no voto"].includes(n)) return "no-vota";
    if (n === "pareo") return "pareo";
    if (n === "dispensado") return "dispensado";
    return null;
}
export function explorerRecord(record: Pick<EvidenceRecord, "id" | "sourceId" | "occurredAt" | "evidence" | "data"> & {kind?:unknown}): ExplorerVote | null {
    if(record.kind !== "vote") return null;
    const d = record.data;
    const date = text(record.occurredAt ?? d.fecha).slice(0, 10);
    if (!isVotingDate(date))
        return null;
    const chamber = record.sourceId === "votaciones_senado" || d.fuente === "senado" ? "Senado" : "Cámara";
    const description = text(d.descripcion ?? d.nombre);
    const bulletin = text(d.boletin).replaceAll(".", "") || description.replaceAll(".", "").match(/(\d{3,6}-\d{2})/)?.[1] || null;
    const counts = { favor: officialCount(d.total_si), contra: officialCount(d.total_no), abstencion: officialCount(d.total_abstencion) };
    const raw = Array.isArray(d.votos) ? d.votos as Record<string, unknown>[] : [];
    // Reuse the same official DIPID identity map as ingest-votaciones-full.mjs.
    // Identity is stable; no current party affiliation is assigned to historical votes.
    const namesById: Record<string, string> = camaraDeputyNames;
    const nominal = raw.map(v => {
        const id = text(v?.id);
        return { id, name: (chamber === "Cámara" ? namesById[id] : null) || text(v?.nombre), option: text(v?.opcion) };
    });
    const tally = { favor: 0, contra: 0, abstencion: 0 };
    for (const row of nominal) {
        const key = nominalOption(row.option);
        if (key === "favor" || key === "contra" || key === "abstencion")
            tally[key]++;
    }
    const names = nominal.map(v => normalizeVotingSearch(v.name).replace(/\s+/g, " "));
    const ids = nominal.map(v => v.id).filter(Boolean);
    const valid = nominal.length > 0 && nominal.every(v => v.name && nominalOption(v.option))
        && new Set(names).size === names.length && new Set(ids).size === ids.length
        && Object.entries(counts).every(([key, n]) => n !== null && tally[key as keyof typeof tally] === n);
    // Validación por registro para ambas cámaras; no reconstruir votos desde el padrón.
    const status = !raw.length ? "unavailable" : valid ? "validated" : "review";
    const sourceUrl = text(record.evidence.sourceUrl ?? d.url);
    const explicitSession = text(d.sesion);
    return { id: record.id, chamber, date, title: text(d.nombre) || description || "Votación de Sala", description, bulletin, result: text(d.resultado) || "Resultado no informado", quorum: text(d.quorum) || null, type: text(d.tipo) || null, sourceUrl, sessionId: explicitSession && /^\d+$/.test(explicitSession) ? explicitSession : sessionFromUrl(sourceUrl, chamber), projectTitle: text(d.titulo_proyecto ?? d.nombre_proyecto) || null, projectState: text(d.estado_proyecto) || null, stage: text(d.tramite) || null, procedureUrl: text(d.url_tramitacion) || null, reportUrl: text(d.informe_url) || null, law: text(d.ley) || null, counts, nominal: status === "validated" ? nominal : [], nominalStatus: status };
}
export function readableVoteTitle(value:string){const cleaned=value.replace(/^\d+[-–]\s*(?=Cambio de Trámite)/i, "").replace(/^en votaci[oó]n[,.:]?\s*/i,"").replace(/\s+/g," ").trim();return cleaned.length>150?cleaned.slice(0,147).trimEnd()+"…":cleaned;}
export function groupExplorerVotes(rows: readonly ExplorerVote[], mode: "proyectos" | "sesiones" | "votaciones") {
    const groups = new Map<string, {
        id: string;
        title: string;
        subtitle: string;
        rows: ExplorerVote[];
    }>();
    for (const row of [...rows].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))) {
        const id = mode === "sesiones" ? [row.chamber, row.date, row.sessionId ?? "jornada"].join(":") : row.bulletin ? "boletin:" + row.bulletin : row.chamber + ":" + row.id;
        const title = mode === "sesiones" ? (row.sessionId ? "Sesión " + row.sessionId : "Jornada de Sala") : (row.bulletin ? "Boletín " + row.bulletin : readableVoteTitle(row.title));
        const subtitle = mode === "sesiones" ? row.chamber + " · " + row.date : row.title;
        const found = groups.get(id);
        if (found)
            found.rows.push(row);
        else
            groups.set(id, { id, title, subtitle, rows: [row] });
    }
    return [...groups.values()];
}
export function votingRecordUrl(chamber: "Cámara" | "Senado", query: VoteQuery, cursor?: string | null) {
    const params = new URLSearchParams({ source: chamber === "Senado" ? "votaciones_senado" : "votaciones_camara", from: query.from, to: query.to, limit: "100" });
    params.set("kind", "vote");
    if (query.query)
        params.set("q", query.query);
    if (cursor)
        params.set("cursor", cursor);
    return "/api/v1/records?" + params;
}
