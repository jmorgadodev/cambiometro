import { getVotacionesDesde2026, getVotingFreshness } from "./votaciones-destacadas";
import { POLITICOS_SEED, PARTIDOS_SEED } from "./seed-politicos";
import { getPoliticoSlug } from "./politico-slugs";
import type { VotingLegislator } from "./voting-workspace";
export function getVotingWorkspaceData(){
 const rows=getVotacionesDesde2026();
 const legislators:VotingLegislator[]=POLITICOS_SEED.map(person=>({id:person.id,name:person.nombre_completo,chamber:person.cargo==="Senador"?"Senado":"Cámara",territory:person.distrito_region,party:PARTIDOS_SEED.find(p=>p.id===person.partido_id)?.sigla??person.partido_id,slug:getPoliticoSlug(person)}));
 return {rows,legislators,reviewedAt:getVotingFreshness().reviewedAt};
}
