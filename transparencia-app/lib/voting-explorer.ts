import type { EvidenceRecord } from "./data-contracts";
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
function optionKey(value: string): "favor" | "contra" | "abstencion" | null {
    const n = normalizeVotingSearch(value);
    return ["afirmativo", "a favor"].includes(n) ? "favor" : ["en contra", "negativo"].includes(n) ? "contra" : n.startsWith("abstenc") ? "abstencion" : null;
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
    const nominal = raw.map(v => ({ id: text(v.id), name: text(v.nombre), option: text(v.opcion) }));
    const tally = { favor: 0, contra: 0, abstencion: 0 };
    for (const row of nominal) {
        const key = optionKey(row.option);
        if (key)
            tally[key]++;
    }
    const valid = nominal.length > 0 && nominal.every(v => v.name && v.option) && new Set(nominal.map(v => v.id || normalizeVotingSearch(v.name))).size === nominal.length && Object.entries(counts).every(([key, n]) => n !== null && tally[key as keyof typeof tally] === n);
    // El servicio de Cámara reutiliza un padrón fijo: no habilitar su nominal por coincidencia de totales.
    const status = chamber === "Cámara" ? "unavailable" : valid ? "validated" : "review";
    const sourceUrl = text(record.evidence.sourceUrl ?? d.url);
    const explicitSession = text(d.sesion);
    return { id: record.id, chamber, date, title: text(d.nombre) || description || "Votación de Sala", description, bulletin, result: text(d.resultado) || "Resultado no informado", quorum: text(d.quorum) || null, type: text(d.tipo) || null, sourceUrl, sessionId: explicitSession && /^\d+$/.test(explicitSession) ? explicitSession : sessionFromUrl(sourceUrl, chamber), counts, nominal: status === "validated" ? nominal : [], nominalStatus: status };
}
export function readableVoteTitle(value:string){const cleaned=value.replace(/^en votaci[oó]n[,.:]?\s*/i,"").replace(/\s+/g," ").trim();return cleaned.length>150?cleaned.slice(0,147).trimEnd()+"…":cleaned;}
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
