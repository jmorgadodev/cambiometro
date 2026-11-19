import type {Metadata} from "next";
import {notFound} from "next/navigation";
import VotingWorkspace from "@/components/votaciones/VotingWorkspace";
import {getVotingWorkspaceData} from "@/lib/voting-workspace-source";
import {VOTING_MODULES,isVotingModule} from "@/lib/voting-workspace";
export function generateStaticParams(){return VOTING_MODULES.filter(m=>m.id!=="votaciones").map(m=>({modulo:m.id}));}
export async function generateMetadata({params}:{params:Promise<{modulo:string}>}):Promise<Metadata>{const {modulo}=await params;const m=VOTING_MODULES.find(m=>m.id===modulo);return {title:(m?.label??"Actividad parlamentaria")+" desde 2026 — El Cambiómetro",alternates:{canonical:"/votaciones/"+modulo},...(["comisiones","asistencia"].includes(modulo)?{robots:{index:false,follow:true}}:{})};}
export default async function VotingModulePage({params}:{params:Promise<{modulo:string}>}){const {modulo}=await params;if(!isVotingModule(modulo)||modulo==="votaciones")notFound();const data=getVotingWorkspaceData();return <VotingWorkspace mode={modulo} {...data} rows={modulo==="legisladores"||modulo==="comisiones"||modulo==="asistencia"?[]:data.rows} legislators={modulo==="legisladores"?data.legislators:[]}/>;}
