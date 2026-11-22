"use client";
import {useState} from 'react';
import Link from 'next/link';
import type {VotingLegislator} from '@/lib/voting-workspace';
import type {ExplorerVote} from '@/lib/voting-explorer';
import type {VotingProject} from '@/lib/voting-presentation';
import VotingProjectDetail from './VotingProjectDetail';
import VoteDetail from './VoteDetail';
export default function VotingProjectArticle({project,people}:{project:VotingProject;people:VotingLegislator[]}){const [selected,setSelected]=useState<ExplorerVote|null>(null);return <><VotingProjectDetail showTitle={false} project={project} onVote={setSelected}/><p><Link href={'/votaciones/proyectos/?boletin='+project.bulletin} prefetch={false}>Consultar todas las decisiones publicadas de este boletín →</Link></p><VoteDetail vote={selected} people={people} onClose={()=>setSelected(null)}/></>;}
