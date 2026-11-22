"use client";
import {useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import {type VotingLegislator} from '@/lib/voting-workspace';
import {votingTextMatches} from '@/lib/voting-presentation';
import VotingPerson from './VotingPerson';
import styles from './VotingExperience.module.css';
export default function VotingPeople({people}:{people:VotingLegislator[]}){
 const params=useSearchParams();const [search,setSearch]=useState(params.get('q')??''),[chamber,setChamber]=useState('Ambas'),[page,setPage]=useState(0);
 const rows=people.filter(p=>(chamber==='Ambas'||p.chamber===chamber)&&votingTextMatches(p.name+' '+p.party+' '+p.territory,search)).sort((a,b)=>a.name.split(' ').slice(-2).join(' ').localeCompare(b.name.split(' ').slice(-2).join(' '),'es'));const pages=Math.max(1,Math.ceil(rows.length/20));
 return <section><label className={styles.search}>Busca por nombre, apellido, partido o región<input type="search" placeholder="¿Cómo votó…?" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);const q=new URLSearchParams();if(e.target.value)q.set('q',e.target.value);window.history.replaceState(null,'','?'+q);}}/></label><div className={styles.optionFilters} role="group" aria-label="Institución del parlamentario">{['Ambas','Cámara','Senado'].map(c=><button key={c} onClick={()=>{setChamber(c);setPage(0);}} aria-pressed={chamber===c}>{c==='Cámara'?'Diputados':c==='Ambas'?'Ambas cámaras':c}</button>)}</div><p className={styles.meta} role="status">{rows.length} parlamentarios · Partidos del catálogo vigente</p><ul className={styles.peopleList}>{rows.slice(page*20,(page+1)*20).map(p=><li key={p.id}><Link href={'/votaciones/legisladores/'+p.slug+'/'} prefetch={false}><VotingPerson person={p}><span aria-hidden="true">↗</span></VotingPerson></Link></li>)}</ul>{!rows.length&&<p>No hay coincidencias. Prueba con un apellido.</p>}{pages>1&&<nav className={styles.pagination} aria-label="Páginas de parlamentarios"><button disabled={!page} onClick={()=>setPage(n=>n-1)}>Anterior</button><span>{page+1} / {pages}</span><button disabled={page+1>=pages} onClick={()=>setPage(n=>n+1)}>Siguiente</button></nav>}</section>;
}
