import {readableVoteTitle,type ExplorerVote,type ExplorerNominal} from './voting-explorer';
import type { VotingLegislator } from './voting-workspace';
import {isValidVoteDate} from './party-membership-periods.mjs';
import { normalizeVotingSearch } from './voting-workspace';
export type ProjectContext = Record<string,{title:string;titleSource:string}>;
export interface CommissionMember {officialId:string;name:string;fromDate:string|null;toDate:string|null}
export interface CommissionSession {id:string;number:string;date:string;state:string;type:string}
export interface VotingCommission {id:string;name:string;chamber:string;type:string;fromDate:string;toDate:string;president:string;members:CommissionMember[];sessions:CommissionSession[];sourceUrl:string;sessionsUrl:string;projectBulletins:string[]}
export interface VotingContext {reviewedAt:string;projects:ProjectContext;commissions:VotingCommission[]}
export interface VotingProject {id:string;bulletin:string|null;title:string;rows:ExplorerVote[];lastDate:string;chambers:string[];titleSource:string|null}
export const displayVotingDate=(date:string)=>date.slice(0,10).split('-').reverse().join('/');
export function normalizedBulletin(value:string|null){const b=(value??'').replaceAll('.','').trim();return /^\d{3,6}-\d{2}$/.test(b)?b:null;}
const descriptiveMatter=(r:ExplorerVote)=>/^Proyecto de Ley$/i.test(r.type??'')&&/^(Modifica|Establece|Aprueba el|Crea|Declara|Regula|Autoriza|Introduce|Dispone|Fortalece|Otorga|Reconoce|Exime|Prohíbe|Actualiza|Fija|Aumenta|Reduce|Amplía|Promueve|Sustituye|Incorpora|Perfecciona|Garantiza)\b/i.test(r.description||r.title)?readableVoteTitle(r.description||r.title):null;
export function projectGroups(rows:readonly ExplorerVote[], context:ProjectContext):VotingProject[]{
 const groups=new Map<string,VotingProject>(),ranks=new Map<string,number>();
 for(const row of [...rows].sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id))){
  const bulletin=normalizedBulletin(row.bulletin),id=bulletin?'boletin:'+bulletin:row.chamber+':'+row.id;
  const known=bulletin?context[bulletin]:null,matter=bulletin?descriptiveMatter(row):null;
  const title=known?.title||row.projectTitle||matter||(bulletin?'Proyecto · Boletín '+bulletin:readableVoteTitle(row.title));
  const rank=known?3:row.projectTitle?2:matter?1:0,source=known?.titleSource??(rank>0?row.sourceUrl:null);
  const found=groups.get(id);
  if(found){found.rows.push(row);if(!found.chambers.includes(row.chamber))found.chambers.push(row.chamber);if(rank>(ranks.get(id)??0)){found.title=title;found.titleSource=source;ranks.set(id,rank);}}
  else {groups.set(id,{id,bulletin,title,rows:[row],lastDate:row.date,chambers:[row.chamber],titleSource:source});ranks.set(id,rank);}
 }
 return [...groups.values()];
}
export function projectStateLabel(project:VotingProject){return project.rows.find(r=>r.projectState)?.projectState??'Estado no incorporado';}
export function votingTextMatches(text:string,query:string){const haystack=normalizeVotingSearch(text);return normalizeVotingSearch(query).split(/\s+/).filter(Boolean).every(token=>haystack.includes(token));}
export function voteMatches(row:ExplorerVote,query:string,context:ProjectContext){
 const q=normalizeVotingSearch(query);if(!q)return true;
 const fields=[row.title,row.description,row.projectTitle??'',context[normalizedBulletin(row.bulletin)??'']?.title??'',row.bulletin??'',row.date,displayVotingDate(row.date),...row.nominal.map(n=>n.name)].join(' ');
 return votingTextMatches(fields,q);
}
const nameKey=(name:string)=>normalizeVotingSearch(name).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean).sort().join(' ');
export function nominalPerson(row:ExplorerNominal,chamber:string,people:readonly VotingLegislator[]){
 const candidates=people.filter(p=>p.chamber===chamber);
 const ids=candidates.filter(p=>p.officialId&&p.officialId===row.id);if(ids.length===1)return ids[0];
 const matches=candidates.filter(p=>nameKey(p.name)===nameKey(row.name));return matches.length===1?matches[0]:null;
}
export function affiliationAtVote(person:VotingLegislator,date:string){const matches=person.memberships?.filter(m=>isValidVoteDate(m.from)&&m.from<=date&&(!m.to||(isValidVoteDate(m.to)&&date<=m.to)))??[];return matches.length===1?{...matches[0],historical:true}:{party:person.party,logo:person.partyLogo,historical:false};}
export function safeOfficialUrl(value:string|null|undefined){try{const u=new URL(value??'');return u.protocol==='https:'&&(/(^|\.)(camara\.cl|senado\.cl|congreso\.cl|bcn\.cl)$/.test(u.hostname))?u.href:null;}catch{return null;}}
export function projectHref(bulletin:string){return '/votaciones/proyectos/?boletin='+encodeURIComponent(bulletin);}

export function votingIdentity(id:string,chamber:string){const prefix=chamber==='Senado'?'votaciones_senado-':'votaciones_camara-';const raw=id.startsWith(prefix)?id.slice(prefix.length):id;const pattern=chamber==='Senado'?/^(?:(?:sen|senado)-)?vot-(\d+)$/:/^(?:camara-)?vot-(\d+)$/;const match=raw.match(pattern);return chamber+':'+(match?.[1]??(/^\d+$/.test(raw)?raw:id));}

export function legislativeStageMeaning(stage:string|null|undefined){
 const text=normalizeVotingSearch(stage??'');
 if(text.includes('primer tramite'))return {meaning:'La cámara de origen está examinando el proyecto.',next:'Si lo aprueba, puede pasar a la cámara revisora, según las reglas aplicables.'};
 if(text.includes('segundo tramite'))return {meaning:'La cámara revisora examina el texto recibido de la cámara de origen.',next:'Si propone cambios, el texto puede volver a la cámara de origen. El recorrido depende de los acuerdos y controles que correspondan.'};
 if(text.includes('tercer tramite'))return {meaning:'La cámara de origen revisa las modificaciones de la cámara revisora.',next:'Las discrepancias pueden requerir otros trámites o una comisión mixta, conforme a las reglas aplicables.'};
 if(text.includes('comision mixta'))return {meaning:'Una comisión de ambas cámaras busca resolver diferencias en el texto.',next:'Una propuesta de comisión mixta requiere los pronunciamientos de las cámaras que correspondan.'};
 if(text.includes('promulgacion'))return {meaning:'La promulgación formaliza la existencia de la ley aprobada conforme al procedimiento aplicable.',next:'La publicación y la entrada en vigencia son actos o momentos que deben verificarse por separado.'};
 return null;
}

export function projectDocumentSources(project:VotingProject){return {procedureUrl:project.rows.map(r=>safeOfficialUrl(r.procedureUrl)).find(Boolean)??null,reportUrl:project.rows.map(r=>safeOfficialUrl(r.reportUrl)).find(Boolean)??null};}
