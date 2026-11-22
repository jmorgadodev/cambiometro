import type { VotacionAnual } from "./votaciones-destacadas";
export const VOTING_MODULES = [
 {id:"legisladores",label:"Parlamentarios",description:"Cómo votó cada representante"},
 {id:"votaciones",label:"Inicio",description:"Qué se votó en el Congreso"},
 {id:"proyectos",label:"Proyectos y votaciones",description:"Asuntos y decisiones legislativas"},
 {id:"sesiones",label:"Sesiones",description:"Decisiones de cada sesión dentro del sitio"},
 {id:"comisiones",label:"Comisiones",description:"Avances y fuentes para seguir su actividad"},
 {id:"aprende",label:"Aprende",description:"Entiende cómo vota el Congreso"},
] as const;
export type VotingModule = typeof VOTING_MODULES[number]["id"];
export type ChamberFilter = "Ambas" | "Cámara" | "Senado";
export interface VotingLegislator {id:string;name:string;chamber:"Cámara"|"Senado";territory:string;party:string;slug:string;photo?:string|null;officialId?:string|null;partyLogo?:string;memberships?:{from:string;to:string|null;party:string;logo?:string}[]}
export function isVotingModule(value:string):value is VotingModule {return VOTING_MODULES.some(m=>m.id===value);}
export function votingModuleHref(id:VotingModule){return id==="votaciones"?"/votaciones/":`/votaciones/${id}/`;}
export function normalizeVotingSearch(value:string){return value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replaceAll(".","").trim();}
export function isVotingDate(value:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<"2026-01-01")return false;const date=new Date(value+"T00:00:00Z");return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;}
export function filterVotingRows(rows:readonly VotacionAnual[],{chamber="Ambas",year="Todos",query=""}:{chamber?:ChamberFilter;year?:string;query?:string}) {
 const needle=normalizeVotingSearch(query);
 return rows.filter(row=>isVotingDate(row.fecha)&&(chamber==="Ambas"||row.camara===chamber)&&(year==="Todos"||row.fecha.startsWith(year+"-"))&&(!needle||normalizeVotingSearch([row.titulo,row.resumen,row.boletin??""].join(" ")).includes(needle))).sort((a,b)=>b.fecha.localeCompare(a.fecha)||b.votacion_id.localeCompare(a.votacion_id));
}
export function groupVotingProjects(rows:readonly VotacionAnual[]) {
 const map=new Map<string,{boletin:string;title:string;lastDate:string;votes:number;chambers:string[];sourceUrl:string}>();
 for(const row of filterVotingRows(rows,{})){const boletin=row.boletin?.replaceAll(".","").trim();if(!boletin||!/^\d{4,6}-\d{2}$/.test(boletin))continue;const previous=map.get(boletin);if(previous){previous.votes++;if(!previous.chambers.includes(row.camara))previous.chambers.push(row.camara);}else map.set(boletin,{boletin,title:row.titulo,lastDate:row.fecha,votes:1,chambers:[row.camara],sourceUrl:row.tramite_url??row.fuente_url});}
 return [...map.values()];
}
export function sourceSessionId(row:VotacionAnual):string|null {
 if(row.camara!=="Senado")return null;
 try{const url=new URL(row.fuente_url);const id=url.searchParams.get("id_sesion");return url.protocol==="https:"&&url.hostname==="web-back.senado.cl"&&url.pathname==="/api/votes"&&/^[1-9]\d*$/.test(id??"")?id:null;}catch{return null;}
}
export function groupVotingSessions(rows:readonly VotacionAnual[]) {
 const map=new Map<string,{key:string;date:string;chamber:string;sessionId:string|null;votes:number;sourceUrl:string}>();
 for(const row of filterVotingRows(rows,{})){const sessionId=sourceSessionId(row);const key=[row.camara,row.fecha,sessionId??"jornada"].join(":");const previous=map.get(key);if(previous)previous.votes++;else map.set(key,{key,date:row.fecha,chamber:row.camara,sessionId,votes:1,sourceUrl:row.fuente_url});}return [...map.values()];
}
