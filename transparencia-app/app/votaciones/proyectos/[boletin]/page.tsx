import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getVotingWorkspaceData} from '@/lib/voting-workspace-source';
import {projectGroups,normalizedBulletin} from '@/lib/voting-presentation';
import VotingProjectArticle from '@/components/votaciones/VotingProjectArticle';
import {VotingNavigation} from '@/components/votaciones/VotingWorkspace';
import styles from '@/components/votaciones/VotingExperience.module.css';
type Props={params:Promise<{boletin:string}>};
function projects(){const d=getVotingWorkspaceData({all:true});return {data:d,groups:projectGroups(d.records,d.context.projects)};}
export function generateStaticParams(){return projects().groups.flatMap(g=>g.bulletin?[{boletin:g.bulletin}]:[]);}
export async function generateMetadata({params}:Props):Promise<Metadata>{const {boletin}=await params;const p=projects().groups.find(g=>g.bulletin===boletin);return {title:(p?.title??'Proyecto legislativo')+' — El Cambiómetro',description:'Decisiones registradas, resultados y fuentes del Boletín '+boletin+' desde 2026.',alternates:{canonical:'/votaciones/proyectos/'+boletin}};}
export default async function ProjectPage({params}:Props){const {boletin}=await params;if(!normalizedBulletin(boletin))notFound();const {data,groups}=projects();const p=groups.find(g=>g.bulletin===boletin);if(!p)notFound();return <div className={styles.experience}><header className={styles.hero}><div className="container-main"><span className={styles.eyebrow}>PROYECTO · BOLETÍN {boletin}</span><h1>{p.title}</h1><p>{p.chambers.join(' · ')} · Decisiones incorporadas desde 2026</p></div></header><div className={'container-main '+styles.content}><VotingNavigation mode="proyectos"/><VotingProjectArticle project={p} people={data.legislators}/></div></div>;}
