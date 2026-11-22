"use client";
import {Suspense} from 'react';
import Link from 'next/link';
import {VOTING_MODULES,votingModuleHref,type VotingModule,type VotingLegislator} from '@/lib/voting-workspace';
import type {ExplorerVote} from '@/lib/voting-explorer';
import {projectGroups,type ProjectContext,type VotingCommission} from '@/lib/voting-presentation';
import VotingExplorer from './VotingExplorer';
import VotingPeople from './VotingPeople';
import VotingCommissions from './VotingCommissions';
import VotingLearn from './VotingLearn';
import styles from './VotingExperience.module.css';
const order:VotingModule[]=['votaciones','proyectos','legisladores','comisiones','aprende'];
export function VotingNavigation({mode}:{mode:VotingModule}){return <nav className={styles.navigation} aria-label="Explorar Votaciones">{order.map(id=>{const m=VOTING_MODULES.find(m=>m.id===id)!;return <Link key={id} prefetch={false} href={votingModuleHref(id)} aria-current={mode===id?'page':undefined}>{m.label}</Link>;})}</nav>;}
export default function VotingWorkspace({mode,records=[],legislators,context,reviewedAt,knownBulletins=[]}:{knownBulletins?:string[];mode:VotingModule;records?:ExplorerVote[];legislators:VotingLegislator[];context?:{projects:ProjectContext;commissions:VotingCommission[];reviewedAt:string};reviewedAt:string|null}){
 const current=VOTING_MODULES.find(m=>m.id===mode)!;const home=mode==='votaciones';const quickLinks=home?<div className={styles.quickLinks}><Link href="/votaciones/proyectos/" prefetch={false}><span>01 / ASUNTOS</span><strong>Proyectos y votaciones</strong><span>Explorar decisiones <b aria-hidden="true">↗</b></span></Link><Link href="/votaciones/legisladores/" prefetch={false}><span>02 / PERSONAS</span><strong>¿Cómo votó tu representante?</strong><span>Buscar parlamentario <b aria-hidden="true">↗</b></span></Link><Link href="/votaciones/comisiones/" prefetch={false}><span>03 / COMISIONES</span><strong>El trabajo antes de la Sala</strong><span>Consultar comisiones <b aria-hidden="true">↗</b></span></Link></div>:null;
 return <div className={styles.experience}><header className={styles.hero}><div className="container-main"><span className={styles.eyebrow}>EL CONGRESO, DECISIÓN A DECISIÓN · DESDE 2026</span><h1>{home?'¿Qué se votó en el Congreso?':mode==='aprende'?'Entiende cómo vota el Congreso':current.label}</h1><p>{home?'Encuentra el asunto. Conoce la decisión. Mira cómo votó cada representante.':mode==='proyectos'?'Del proyecto a sus decisiones, con los votos de ambas cámaras.':mode==='legisladores'?'Busca a una persona y consulta sus votos registrados.':mode==='comisiones'?'Quiénes las integran y qué actividad está documentada.':mode==='sesiones'?'El contexto cronológico de las decisiones de Sala.':'Una guía breve para seguir el recorrido legislativo.'}</p></div></header><div className={'container-main '+styles.content}><VotingNavigation mode={mode}/>

 {mode==='legisladores'?<Suspense fallback={<ul>{legislators.map(p=><li key={p.id}><Link href={'/votaciones/legisladores/'+p.slug+'/'} prefetch={false}>{p.name}</Link></li>)}</ul>}><VotingPeople people={legislators}/></Suspense>:mode==='comisiones'?<VotingCommissions commissions={context?.commissions??[]} people={legislators} reviewedAt={context?.reviewedAt??reviewedAt?.slice(0,10)??'2026-11-22'}/>:mode==='aprende'?<VotingLearn/>:<Suspense fallback={<section><h2>Asuntos incorporados</h2><ul>{projectGroups(records,context?.projects??{}).map(g=><li key={g.id}>{g.bulletin?<Link href={"/votaciones/proyectos/"+g.bulletin+"/"} prefetch={false}>{g.title}</Link>:g.title}</li>)}</ul></section>}><VotingExplorer knownBulletins={knownBulletins} intro={quickLinks} mode={mode} initialRecords={records} people={legislators} projects={context?.projects}/></Suspense>}
 </div></div>;
}
