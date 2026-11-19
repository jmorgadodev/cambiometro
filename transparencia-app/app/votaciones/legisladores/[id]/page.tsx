import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { POLITICOS_SEED, PARTIDOS_SEED } from "@/lib/seed-politicos";
import { getPoliticoByIdOrSlug, getPoliticoSlug } from "@/lib/politico-slugs";
import { getVotacionesParaPolitico } from "@/lib/data-source";
import { summarizeVerifiedNominalVotes } from "@/lib/vote-publication-integrity";
import VotacionesHistorial from "@/components/VotacionesHistorial";
type Props = {
    params: Promise<{
        id: string;
    }>;
};
export function generateStaticParams() { return POLITICOS_SEED.map(person => ({ id: getPoliticoSlug(person) })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { id } = await params; const person = getPoliticoByIdOrSlug(id); return { title: "Cómo votó " + (person?.nombre_completo ?? "el legislador") + " — El Cambiómetro", alternates: person ? {canonical: "/votaciones/legisladores/" + getPoliticoSlug(person)} : undefined }; }
export default async function LegislatorVotes({ params }: Props) {
    const { id } = await params;
    const person = getPoliticoByIdOrSlug(id);
    if (!person)
        notFound();
    const party = PARTIDOS_SEED.find(p => p.id === person.partido_id);
    const entries = getVotacionesParaPolitico(person).filter(v => (v.votacion.fecha ?? "") >= "2026-01-01");
    const stats = summarizeVerifiedNominalVotes(entries.map(v => v.voto.opcion));
    const rows = entries.map(v => ({ id: v.votacion.id, fecha: v.votacion.fecha ?? "", descripcion: v.votacion.descripcion ?? v.votacion.nombre ?? "Votación de Sala", opcion: v.voto.opcion, quorum: v.votacion.quorum ?? null, tipo: v.votacion.tipo ?? null, resultado: v.votacion.resultado ?? null, boletin: typeof v.votacion.boletin === "string" ? v.votacion.boletin : null, url: v.votacion.url }));
    return <main className="container-main" style={{ paddingTop: "2rem", paddingBottom: "3rem" }}><Link href="/votaciones/legisladores/">← Legisladores</Link><header className="page-masthead" style={{ marginTop: "1rem" }}><span className="eyebrow">Expediente de votaciones · desde 2026</span><h1>Cómo votó {person.nombre_completo}</h1><p>{person.cargo} · {party?.sigla ?? "IND"} · {person.distrito_region}</p><p>Historial nominal incorporado para esta autoridad. Se conserva la opción publicada y se identifica lo que sigue en revisión; no se presenta la emisión de votos como asistencia.</p></header><dl className="page-fact-sheet" style={{ margin: "1.5rem 0" }}><div><dt>Registros incorporados</dt><dd>{rows.length}</dd></div><div><dt>Votos emitidos acreditados</dt><dd>{stats.emitted}</dd></div><div><dt>Opciones en revisión</dt><dd>{stats.excludedRecords}</dd></div></dl><VotacionesHistorial votaciones={rows} cargo={person.cargo}/><p><Link href="/votaciones/">Explorar el catálogo integral de 2026 →</Link> · <Link href="/fuentes/">Fuentes y alcances →</Link></p></main>;
}
