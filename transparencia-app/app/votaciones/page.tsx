import type {Metadata} from "next";
import VotingWorkspace from "@/components/votaciones/VotingWorkspace";
import {getVotingWorkspaceData} from "@/lib/voting-workspace-source";
export const metadata:Metadata={title:"¿Qué se votó en el Congreso? — El Cambiómetro",description:"Explora legisladores, votaciones, boletines y sesiones de Cámara y Senado desde 2026, con sus fuentes y cobertura.",alternates:{canonical:"/votaciones"}};
export default function VotingPage(){const data=getVotingWorkspaceData();return <VotingWorkspace mode="votaciones" records={data.records} knownBulletins={data.knownBulletins} reviewedAt={data.reviewedAt} legislators={data.legislators} context={{projects:data.context.projects,reviewedAt:data.context.reviewedAt,commissions:[]}}/>;}
