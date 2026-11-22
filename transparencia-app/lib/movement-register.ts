/** Presentation-only query model. Original records and verification states remain untouched. */
export type MovementStatus = 'official' | 'institutional' | 'reported' | 'pending' | 'detected';
export type MovementDateBasis = 'registro' | 'publicacion' | 'efectiva';
export type MovementSource = {title:string;label:string;url:string|null;kind:'document'|'institutional'|'press'|'other';date:string|null};
export type MovementEntry = {
 id:string;kind:'movement'|'signal';name:string|null;otherName:string|null;role:string;institution:string;ministry:string;region:string;
 type:string;typeLabel:string;status:MovementStatus;originalStatus:string;summary:string;reason:string;
 date:string|null;dateLabel:string;publishedDate:string|null;effectiveDate:string|null;originalDate:string|null;
 outgoingDate:string|null;incomingDate:string|null;detectedAt:string|null;reviewedAt:string|null;lastSeenAt:string|null;
 sources:MovementSource[];review:string|null;reviewUrl:string|null;pendingDocument:boolean;
};
export const MOVEMENT_STATUS_LABEL:Record<MovementStatus,string>={official:'Documento oficial verificado',institutional:'Respaldo institucional',reported:'Corroborado públicamente',pending:'En confirmación',detected:'Detectado'};
export const MOVEMENT_SOURCE_LABEL:Record<MovementSource['kind'],string>={document:'Documento oficial',institutional:'Publicación institucional',press:'Fuente periodística',other:'Otra fuente'};
export const MOVEMENT_DATE_LABEL:Record<MovementDateBasis,string>={registro:'Fecha del registro',publicacion:'Publicación de la fuente',efectiva:'Fecha efectiva informada'};
export const normalizeMovementText=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-CL').trim();
export function validMovementDate(value:unknown):string|null{
 const s=String(value??'');if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
 const d=new Date(s+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s?s:null;
}
export function safeMovementUrl(value:unknown):string|null{try{const u=new URL(String(value??''));return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function movementDate(entry:MovementEntry,basis:MovementDateBasis){return basis==='publicacion'?entry.publishedDate:basis==='efectiva'?entry.effectiveDate:entry.date;}
export function formatMovementDate(value:string|null){if(!value)return 'Sin fecha acreditada';const date=validMovementDate(value.slice(0,10));return date?new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')):'No informada';}
export function movementMonthLabel(value:string){if(value==='sin-fecha')return 'Sin fecha acreditada';return new Intl.DateTimeFormat('es-CL',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'-01T12:00:00Z'));}
export type MovementQuery={q:string;types:string[];institutions:string[];regions:string[];states:string[];reasons:string[];basis:MovementDateBasis;month:string;from:string;to:string;sort:'reciente'|'antiguo'|'nombre';view:'registro'|'cronologia';page:number};
const values=(p:URLSearchParams,key:string)=>[...new Set(p.getAll(key).filter(v=>v&&v!=='todos'))];
export function parseMovementQuery(p:URLSearchParams):MovementQuery{
 const basis=p.get('fecha');const sort=p.get('orden');const states=values(p,'estado');if(!states.length&&p.get('verificado')==='true')states.push('verificado');
 const month=p.get('mes')??'';const view=p.get('vista');
 return {q:p.get('q')??'',types:values(p,'tipo'),institutions:[...new Set([...values(p,'institucion'),...values(p,'ministerio')])],regions:values(p,'region'),states,reasons:values(p,'motivo'),basis:basis==='publicacion'||basis==='efectiva'?basis:'registro',month:/^\d{4}-(0[1-9]|1[0-2])$/.test(month)?month:'',from:validMovementDate(p.get('desde'))??'',to:validMovementDate(p.get('hasta'))??'',sort:sort==='antiguo'||sort==='nombre'?sort:'reciente',view:view==='timeline'||view==='cronologia'?'cronologia':'registro',page:Math.min(1000000,Math.max(1,Number.parseInt(p.get('pagina')??'1',10)||1))};
}
export function movementStateMatches(e:MovementEntry,state:string){
 if(state==='verificado')return ['verificado','verificado_oficial','corroborado'].includes(e.originalStatus);
 if(state==='en_confirmacion')return e.status==='pending';
 return e.status===state;
}
export function filterMovementEntries(entries:readonly MovementEntry[],query:MovementQuery):MovementEntry[]{
 const tokens=normalizeMovementText(query.q).split(/\s+/).filter(Boolean);
 return entries.filter(e=>{
  if(query.types.length&&!query.types.includes(e.type))return false;
  if(query.institutions.length&&!query.institutions.some(i=>i===e.institution||i===e.ministry))return false;
  if(query.regions.length&&!query.regions.includes(e.region))return false;
  if(query.states.length&&!query.states.some(s=>movementStateMatches(e,s)))return false;
  if(query.reasons.length&&!query.reasons.includes(e.reason))return false;
  const date=movementDate(e,query.basis);
  if(query.month&&(!date||!date.startsWith(query.month)))return false;
  if(query.from&&(!date||date<query.from)||query.to&&(!date||date>query.to))return false;
  const text=normalizeMovementText([e.name,e.otherName,e.role,e.institution,e.ministry,e.region,e.typeLabel,e.summary,e.id,...e.sources.map(s=>s.title)].filter(Boolean).join(' '));
  return tokens.every(t=>text.includes(t));
 }).sort((a,b)=>{
  if(query.sort==='nombre')return (a.name??a.summary).localeCompare(b.name??b.summary,'es-CL')||a.id.localeCompare(b.id);
  const da=movementDate(a,query.basis),db=movementDate(b,query.basis);
  if(!da||!db)return da?-1:db?1:a.id.localeCompare(b.id);
  return (query.sort==='antiguo'?da.localeCompare(db):db.localeCompare(da))||a.id.localeCompare(b.id);
 });
}
export function summarizeMovementEntries(entries:readonly MovementEntry[]){return {total:entries.length,official:entries.filter(e=>e.status==='official').length,pending:entries.filter(e=>e.status==='pending'||e.status==='detected').length,publication:entries.flatMap(e=>e.sources.map(s=>s.date)).filter((d):d is string=>!!d).sort().at(-1)??null};}
export function movementPage(entries:readonly MovementEntry[],page:number,size=20){const pages=Math.max(1,Math.ceil(entries.length/size)),current=Math.min(Math.max(1,page),pages);return {rows:entries.slice((current-1)*size,current*size),page:current,pages,total:entries.length};}
