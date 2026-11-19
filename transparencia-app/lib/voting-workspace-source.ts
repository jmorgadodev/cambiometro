import { readFileSync } from "node:fs";
import { join } from "node:path";
import { type ExplorerVote, explorerRecord } from "./voting-explorer";
import { getVotacionesDesde2026, getVotingFreshness } from "./votaciones-destacadas";
import { POLITICOS_SEED, PARTIDOS_SEED } from "./seed-politicos";
import { getPoliticoSlug } from "./politico-slugs";
import type { VotingLegislator } from "./voting-workspace";
export function getVotingWorkspaceData() {
    const rows = getVotacionesDesde2026();
    const legislators: VotingLegislator[] = POLITICOS_SEED.map(person => ({ id: person.id, name: person.nombre_completo, chamber: person.cargo === "Senador" ? "Senado" : "Cámara", territory: person.distrito_region, party: PARTIDOS_SEED.find(p => p.id === person.partido_id)?.sigla ?? person.partido_id, slug: getPoliticoSlug(person) }));
    let records: ExplorerVote[] = [];
    try {
        const raw = JSON.parse(readFileSync(join(process.cwd(), "data", "politicos-votaciones.json"), "utf8"));
        records = Object.values(raw.sessions as Record<string, Record<string, unknown>>).flatMap(row => { const vote = explorerRecord({ kind: "vote", id: String(row.id), sourceId: row.fuente === "senado" ? "votaciones_senado" : "camara", occurredAt: String(row.fecha ?? ""), evidence: { sourceUrl: String(row.url ?? ""), checksumSha256: null, retrievedAt: null, documentPage: null }, data: row }); return vote ? [vote] : []; });
    }
    catch (error) {
        if (process.env.NEXT_PHASE === "phase-production-build")
            throw error;
    }
    return { rows, records: records.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)).slice(0, 80), legislators, reviewedAt: getVotingFreshness().reviewedAt };
}
