import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {POLITICOS_SEED} from '@/lib/seed-politicos';
import {getPoliticoByIdOrSlug,getPoliticoSlug} from '@/lib/politico-slugs';
import {getVotacionesParaPolitico} from '@/lib/data-source';
import {officialCount} from '@/lib/voting-explorer';
import {getVotingWorkspaceData} from '@/lib/voting-workspace-source';
import VotingHistory,{type VotingHistoryEntry} from '@/components/votaciones/VotingHistory';
import VotingPerson from '@/components/votaciones/VotingPerson';
import {VotingNavigation} from '@/components/votaciones/VotingWorkspace';
import styles from '@/components/votaciones/VotingExperience.module.css';
type Props={params:Promise<{id:string}>};
export function generateStaticParams(){return POLITICOS_SEED.map(person=>({id:getPoliticoSlug(person)}));}
export async function generateMetadata({params}:Props):Promise<Metadata>{const {id}=await params;const person=getPoliticoByIdOrSlug(id);return {title:'Cómo votó '+(person?.nombre_completo??'el legislador')+' — El Cambiómetro',description:'Historial de votos registrados de '+(person?.nombre_completo??'este representante')+' desde 2026: asuntos, decisiones y fuentes oficiales.',alternates:person?{canonical:'/votaciones/legisladores/'+getPoliticoSlug(person)}:undefined};}
export default async function LegislatorVotes({params}:Props){const {id}=await params;const person=getPoliticoByIdOrSlug(id);if(!person)notFound();const data=getVotingWorkspaceData();const reference=data.legislators.find(p=>p.id===person.id)!;const entries:VotingHistoryEntry[]=getVotacionesParaPolitico(person).filter(v=>(v.votacion.fecha??'')>='2026-01-01').map(({votacion:v,voto})=>({option:voto.opcion,vote:{id:v.id,chamber:reference.chamber,date:v.fecha??'',title:v.nombre??v.descripcion??'Votación de Sala',description:v.descripcion??v.nombre??'',bulletin:typeof v.boletin==="string"?v.boletin:null,result:v.resultado??'Resultado no informado',quorum:v.quorum??null,type:v.tipo??null,sourceUrl:v.url??'',sessionId:null,stage:typeof v.tramite==="string"?v.tramite:null,procedureUrl:typeof v.url_tramitacion==="string"?v.url_tramitacion:null,counts:{favor:officialCount(v.total_si),contra:officialCount(v.total_no),abstencion:officialCount(v.total_abstencion)},nominal:[],nominalStatus:'unavailable'}}));
 return <div className={styles.experience}><header className={styles.hero}><div className="container-main"><span className={styles.eyebrow}>HISTORIAL NOMINAL · DESDE 2026</span><h1>Cómo votó {person.nombre_completo}</h1><p>{person.cargo} · {reference.party} · {person.distrito_region}</p></div></header><div className={'container-main '+styles.content}><VotingNavigation mode="legisladores"/><div className={styles.sectionHeading}><VotingPerson person={reference}/><Link href="/votaciones/legisladores/" prefetch={false}>← Parlamentarios</Link></div><p className={styles.meta}>Identidad y partido del catálogo vigente. Cada opción conserva su fecha y denominación publicada.</p><VotingHistory entries={entries} person={reference} projects={data.context.projects}/></div></div>;
}
