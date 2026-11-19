"use client";

import {useMemo,useSyncExternalStore} from "react";
import Link from "next/link";
import type {VotacionAnual} from "@/lib/votaciones-destacadas";
import {getReadableOfficialVoteUrl} from "@/lib/votaciones-presentation";
import {VOTING_MODULES,votingModuleHref,filterVotingRows,groupVotingProjects,groupVotingSessions,normalizeVotingSearch,type VotingModule,type VotingLegislator,type ChamberFilter} from "@/lib/voting-workspace";
import styles from "./VotingWorkspace.module.css";

function subscribe(listener:()=>void){window.addEventListener("popstate",listener);return()=>window.removeEventListener("popstate",listener);}
const querySnapshot=()=>window.location.search;
const serverSnapshot=()=>"";
function date(value:string){return new Intl.DateTimeFormat("es-CL",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(value+"T12:00:00Z"));}
function officialUrl(value:string,chamber:string){
 try{const url=new URL(value);if(url.protocol==="https:"&&!url.username&&!url.password&&["camara.cl","senado.cl","bcn.cl"].some(host=>url.hostname===host||url.hostname.endsWith("."+host)))return getReadableOfficialVoteUrl(chamber==="Senado"?"Senado":"Cámara",value) ?? (chamber==="Senado"?"https://www.senado.cl/":"https://www.camara.cl/");}catch{/* Usar el portal de la corporación si el enlace no está acreditado. */}
 return chamber==="Senado"?"https://www.senado.cl/":"https://www.camara.cl/";
}

export default function VotingWorkspace({mode,rows,legislators,reviewedAt}:{mode:VotingModule;rows:VotacionAnual[];legislators:VotingLegislator[];reviewedAt:string|null}){
 const search=useSyncExternalStore(subscribe,querySnapshot,serverSnapshot);
 const params=useMemo(()=>new URLSearchParams(search),[search]);
 const rawChamber=params.get("camara");const chamber:ChamberFilter=rawChamber==="Senado"||rawChamber==="Cámara"?rawChamber:"Ambas";
 const years=[...new Set(filterVotingRows(rows,{}).map(row=>row.fecha.slice(0,4)))].sort().reverse();
 const year=years.includes(params.get("anio")??"")?params.get("anio")!:"Todos";
 const query=params.get("q")??params.get("boletin")??"";
 const filtered=useMemo(()=>filterVotingRows(rows,{chamber,year,query}),[rows,chamber,year,query]);
 const projects=useMemo(()=>groupVotingProjects(filtered),[filtered]);
 const sessions=useMemo(()=>groupVotingSessions(filtered),[filtered]);
 const people=legislators.filter(person=>(chamber==="Ambas"||person.chamber===chamber)&&normalizeVotingSearch([person.name,person.party,person.territory].join(" ")).includes(normalizeVotingSearch(query)));
 const total=mode==="votaciones"?filtered.length:mode==="proyectos"?projects.length:mode==="sesiones"?sessions.length:people.length;
 const size=12,totalPages=Math.max(1,Math.ceil(total/size));const requested=Number(params.get("pagina")??1);const page=Number.isSafeInteger(requested)?Math.min(totalPages,Math.max(1,requested)):1;
 const slice=<T,>(items:T[])=>items.slice((page-1)*size,page*size);
 function update(changes:Record<string,string>){const next=new URLSearchParams(window.location.search);if(next.has("boletin")&&changes.q===undefined)next.set("q",next.get("boletin")!);next.delete("boletin");next.delete("pagina");for(const [key,value]of Object.entries(changes)){if(value&&value!=="Todos"&&value!=="Ambas")next.set(key,value);else next.delete(key);}const qs=next.toString();window.history.replaceState(null,"",window.location.pathname+(qs?"?"+qs:""));window.dispatchEvent(new Event("popstate"));}
 const currentModule=VOTING_MODULES.find(item=>item.id===mode)!;
 const recordsView=["votaciones","proyectos","sesiones","legisladores"].includes(mode);
 return <div className={styles.workspace}>
  <header className="page-masthead"><div className="container-main"><p className="eyebrow">Congreso Nacional · desde 2026</p><h1>{mode==="votaciones"?"Votaciones parlamentarias":currentModule.label}</h1><p>{currentModule.description}. Consulta registros de Cámara y Senado, con su fecha y fuente.</p><p className={styles.cut}>Corte de actividad: 2026 en adelante. {reviewedAt?"Fecha del archivo publicado: "+reviewedAt.slice(0,10):"Fecha del archivo no informada"}. La fecha del archivo no acredita cobertura completa.</p></div></header>
  <div className={`container-main ${styles.body}`}>
   <nav className={styles.modules} aria-label="Módulos de actividad parlamentaria">{VOTING_MODULES.map(item=><Link prefetch={false} className={styles.module} key={item.id} href={votingModuleHref(item.id)} aria-current={item.id===mode?"page":undefined}><strong>{item.label}</strong><span>{item.description}</span></Link>)}</nav>
   {mode==="votaciones"&&<p className={styles.note}>Este catálogo permite explorar la actividad incorporada. Los detalles nominales no conciliados siguen en revisión. <Link href="/votaciones-destacadas/" prefetch={false}>Abrir el análisis y los enlaces anteriores →</Link></p>}
   {recordsView&&<>
    <form className={styles.filters} aria-label="Filtros de actividad parlamentaria" onSubmit={e=>e.preventDefault()}>
     <label>Cámara<select aria-label="Cámara" value={chamber} onChange={e=>update({camara:e.target.value})}><option>Ambas</option><option>Cámara</option><option>Senado</option></select></label>
     {mode!=="legisladores"&&<label>Año<select aria-label="Año" value={year} onChange={e=>update({anio:e.target.value})}><option>Todos</option>{years.map(y=><option key={y}>{y}</option>)}</select></label>}
     <label className={styles.search}>{mode==="legisladores"?"Buscar representante o territorio":"Buscar materia o boletín"}<input aria-label={mode==="legisladores"?"Buscar representante o territorio":"Buscar materia o boletín"} type="search" value={query} onChange={e=>update({q:e.target.value})}/></label>
     <button type="button" onClick={()=>update({camara:"Ambas",anio:"Todos",q:""})}>Limpiar filtros</button>
    </form>
    <p role="status" className={styles.resultCount}>{total.toLocaleString("es-CL")} {mode==="proyectos"?"boletines con votaciones incorporadas":mode==="sesiones"?"sesiones identificadas o jornadas con registros":mode==="legisladores"?"representantes en la nómina incorporada":"votaciones incorporadas"}{year!=="Todos"?" · "+year:" · desde 2026"}</p>
   </>}
   {mode==="legisladores"&&<><p className={styles.note}>La nómina corresponde al catálogo publicado. Las afiliaciones históricas de cada voto se consultan por su fecha; no se sustituyen por el partido actual.</p><div className={styles.grid}>{slice(people).map(person=><article className={styles.card} key={person.id}><p className={styles.meta}>{person.chamber} · {person.party}</p><h2>{person.name}</h2><p>{person.territory}</p><Link prefetch={false} href={`/politico/${person.slug}/`}>Abrir ficha parlamentaria →</Link></article>)}</div></>}
   {mode==="votaciones"&&<div className={styles.list}>{slice(filtered).map(row=><article className={styles.card} key={row.votacion_id}><div className={styles.row}><p className={styles.meta}>{date(row.fecha)} · {row.camara}</p><span className={styles.badge}>{row.resultado==="En trámite"?"Resultado por verificar":row.resultado}</span></div><h2>{row.titulo}</h2><p>{row.boletin?"Boletín "+row.boletin:"Boletín no informado"}{row.quorum?" · "+row.quorum:""}</p><div className={styles.links}><Link prefetch={false} href={`/votaciones-destacadas/?votacion=${encodeURIComponent(row.votacion_id)}`}>Consultar detalle y cobertura →</Link>{row.boletin&&<Link href={`/votaciones/proyectos/?q=${encodeURIComponent(row.boletin)}`} prefetch={false}>Ver actividad del boletín →</Link>}<a href={officialUrl(row.fuente_url,row.camara)} target="_blank" rel="noopener noreferrer">Fuente oficial ↗</a></div></article>)}</div>}
   {mode==="proyectos"&&<><p className={styles.note}>Boletines con votaciones observadas desde 2026, aunque su ingreso sea anterior. Agrupamos actividad incorporada; el resultado de una votación no significa que el proyecto sea ley ni acredita su tramitación completa.</p><div className={styles.list}>{slice(projects).map(project=><article className={styles.card} key={project.boletin}><p className={styles.meta}>Boletín {project.boletin} · {project.chambers.join(" y ")}</p><h2>Boletín {project.boletin}</h2><p><strong>Último registro incorporado:</strong> {project.title}</p><p>{project.votes} votaciones incorporadas · última: {date(project.lastDate)}</p><div className={styles.links}><Link prefetch={false} href={`/votaciones/?boletin=${encodeURIComponent(project.boletin)}`}>Ver votaciones del boletín →</Link><a href={officialUrl(project.sourceUrl,project.chambers[0])} target="_blank" rel="noopener noreferrer">Consultar fuente oficial ↗</a></div></article>)}</div></>}
   {mode==="sesiones"&&<><p className={styles.note}>Mostramos una sesión cuando la fuente incorpora su identificador. Los demás registros se agrupan por día y cámara como jornadas; una jornada puede incluir varias sesiones y no se cuenta como una sesión acreditada.</p><div className={styles.grid}>{slice(sessions).map(session=><article className={styles.card} key={session.key}><p className={styles.meta}>{session.chamber} · {date(session.date)}</p><h2>{session.sessionId?"Sesión "+session.sessionId:"Jornada con votaciones"}</h2><p>{session.votes} votaciones incorporadas</p>{!session.sessionId&&<p>Identificador de sesión no incorporado en este corte.</p>}<a href={officialUrl(session.sourceUrl,session.chamber)} target="_blank" rel="noopener noreferrer">Consultar registro oficial ↗</a></article>)}</div></>}
   {(mode==="comisiones"||mode==="asistencia")&&<section className={styles.progress} aria-label="Avance y cobertura del módulo"><span className={styles.badge}>En desarrollo · avances consultables</span><h2>{mode==="comisiones"?"Seguimiento de comisiones":"Asistencia formal a sesiones"}</h2><p>{mode==="comisiones"?"La navegación ya está preparada. El corte consumido por este módulo aún no incorpora un catálogo validado de comisiones, sus integrantes y sesiones. No atribuimos una votación de Sala a una comisión por coincidencia de boletín.":"El corte consumido por este módulo aún no incorpora actas de asistencia validadas para calcular porcentajes comparables. La emisión de votos no se presenta como asistencia ni la ausencia de un registro como inasistencia."}</p><div className={styles.grid}><article className={styles.card}><h3>Cámara de Diputadas y Diputados</h3><p>La información se incorporará con fecha, fuente y cobertura desde 2026.</p><a href="https://www.camara.cl/" target="_blank" rel="noopener noreferrer">Portal oficial de la Cámara ↗</a></article><article className={styles.card}><h3>Senado</h3><p>La información se incorporará con fecha, fuente y cobertura desde 2026.</p><a href="https://www.senado.cl/" target="_blank" rel="noopener noreferrer">Portal oficial del Senado ↗</a></article></div><p><Link href="/datos/calidad/" prefetch={false}>Consultar cobertura de los datos →</Link> · <Link href="/votaciones/legisladores/" prefetch={false}>Explorar fichas disponibles →</Link></p></section>}
   {recordsView&&total===0&&<p className={styles.note}>No hay registros incorporados que coincidan con estos filtros. Esto no acredita ausencia de actividad en la fuente.</p>}
   {recordsView&&totalPages>1&&<nav className={styles.pagination} aria-label="Paginación de actividad"><button disabled={page===1} onClick={()=>update({pagina:String(page-1)})}>Anterior</button><span>Página {page} de {totalPages}</span><button disabled={page===totalPages} onClick={()=>update({pagina:String(page+1)})}>Siguiente</button></nav>}
  </div>
 </div>;
}
