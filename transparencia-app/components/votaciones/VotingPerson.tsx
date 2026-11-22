"use client";
import {useState} from 'react';
import Image from 'next/image';
import type {VotingLegislator} from '@/lib/voting-workspace';
import {affiliationAtVote} from '@/lib/voting-presentation';
import styles from './VotingExperience.module.css';
export default function VotingPerson({person,name,date,children}:{person?:VotingLegislator|null;name?:string;date?:string;children?:React.ReactNode}){
 const [broken,setBroken]=useState(false);const display=person?.name??name??'Identidad no incorporada';const party=person?(date?affiliationAtVote(person,date):{party:person.party,logo:person.partyLogo,historical:false}):null;
 return <div className={styles.person}><span className={styles.portrait}>{person?.photo&&!broken?<Image src={person.photo} alt={display} width={44} height={52} unoptimized loading="lazy" onError={()=>setBroken(true)}/>:<span aria-hidden="true">{display.split(' ').slice(0,2).map(s=>s[0]).join('')}</span>}</span><span className={styles.personName}><strong>{display}</strong>{person&&<small>{person.chamber} · {party?.logo&&<Image src={party.logo} width={16} height={16} unoptimized alt=""/>}{party?.party}<span title={party?.historical?'Afiliación acreditada para esta fecha':'Referencia del catálogo vigente'}>{party?.historical?' · al votar':date?' · actual':''}</span>{!date&&' · '+person.territory}</small>}</span>{children}</div>;
}
