import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {normalizedBulletin} from "./voting-presentation";
import { type ExplorerVote, explorerRecord } from "./voting-explorer";
import { getVotacionesDesde2026, getVotingFreshness } from "./votaciones-destacadas";
import { POLITICOS_SEED, PARTIDOS_SEED } from "./seed-politicos";
import { getPoliticoSlug } from "./politico-slugs";
import { diputadoIdParaPolitico } from "./data-source";
import type {VotingContext} from "./voting-presentation";
let contextCache:{mtime:number;data:VotingContext}|null=null;
function readContext(){const file=join(process.cwd(),"data","voting-context.json");const mtime=statSync(file).mtimeMs;if(!contextCache||contextCache.mtime!==mtime)contextCache={mtime,data:JSON.parse(readFileSync(file,"utf8"))};return contextCache.data;}
import type { VotingLegislator } from "./voting-workspace";
let snapshot: {mtime:number;raw:Record<string,unknown>}|null=null;
function readSnapshot(){const file=join(process.cwd(),"data","politicos-votaciones.json");const mtime=statSync(file).mtimeMs;if(!snapshot||snapshot.mtime!==mtime)snapshot={mtime,raw:JSON.parse(readFileSync(file,"utf8"))};return snapshot.raw;}
function buildVotingWorkspaceData() {
    const rows = getVotacionesDesde2026();
    const context=readContext();
    const legislators: VotingLegislator[] = POLITICOS_SEED.map(person => {
        const party = PARTIDOS_SEED.find(p => p.id === person.partido_id);
        return { id: person.id, name: person.nombre_completo, chamber: person.cargo === "Senador" ? "Senado" : "Cámara", territory: person.distrito_region, party: party?.sigla ?? person.partido_id, partyLogo: party?.logo_url, slug: getPoliticoSlug(person), photo: person.foto_url?.startsWith("https://") ? person.foto_url : null, officialId: person.cargo === "Diputado" ? diputadoIdParaPolitico(person) : null, memberships: (person.militancias ?? []).flatMap(m => m.desde ? [{from:m.desde,to:m.hasta??null,party:PARTIDOS_SEED.find(p=>p.id===m.partido_id)?.sigla??m.partido_nombre,logo:PARTIDOS_SEED.find(p=>p.id===m.partido_id)?.logo_url}] : []) };
    });
    let records: ExplorerVote[] = [];
    try {
        const raw = readSnapshot();
        records = Object.values(raw.sessions as Record<string, Record<string, unknown>>).flatMap(row => { const vote = explorerRecord({ kind: "vote", id: String(row.id), sourceId: row.fuente === "senado" ? "votaciones_senado" : "camara", occurredAt: String(row.fecha ?? ""), evidence: { sourceUrl: String(row.url ?? ""), checksumSha256: null, retrievedAt: null, documentPage: null }, data: row }); return vote ? [vote] : []; });
    }
    catch (error) {
        if (process.env.NEXT_PHASE === "phase-production-build")
            throw error;
    }
    return { rows, records: records.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)), knownBulletins:[...new Set(records.flatMap(r=>{const b=normalizedBulletin(r.bulletin);return b?[b]:[];}))], legislators, context, reviewedAt: getVotingFreshness().reviewedAt };
}

let workspaceCache:{stamp:string;data:ReturnType<typeof buildVotingWorkspaceData>}|null=null;
export function getVotingWorkspaceData(options:{all?:boolean}={}){
 const stamp=["politicos-votaciones.json","voting-context.json"].map(name=>{const stat=statSync(join(process.cwd(),"data",name));return stat.mtimeMs+":"+stat.size;}).join(";");
 if(!workspaceCache||workspaceCache.stamp!==stamp)workspaceCache={stamp,data:buildVotingWorkspaceData()};
 const data=workspaceCache.data;
 return {...data,records:options.all?data.records:data.records.slice(0,80)};
}
