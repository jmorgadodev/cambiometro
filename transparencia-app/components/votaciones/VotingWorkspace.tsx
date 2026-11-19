"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { VOTING_MODULES, votingModuleHref, normalizeVotingSearch, type VotingModule, type VotingLegislator } from "@/lib/voting-workspace";
import type { ExplorerVote } from "@/lib/voting-explorer";
import VotingExplorer from "./VotingExplorer";
import styles from "./VotingWorkspace.module.css";
export default function VotingWorkspace({ mode, records = [], legislators, reviewedAt }: {
    mode: VotingModule;
    records?: ExplorerVote[];
    legislators: VotingLegislator[];
    reviewedAt: string | null;
}) {
    const [search, setSearch] = useState("");
    const [chamber, setChamber] = useState("Ambas");
    const currentModule = VOTING_MODULES.find(m => m.id === mode)!;
    const people = legislators.filter(p => (chamber === "Ambas" || p.chamber === chamber) && normalizeVotingSearch(p.name + " " + p.party + " " + p.territory).includes(normalizeVotingSearch(search)));
    return <div className={styles.workspace}><header className={styles.masthead}><div className="container-main"><span className="eyebrow">Así votó el Congreso · desde 2026</span><h1>{currentModule.label}</h1><p>{currentModule.description}</p><small>Corte del catálogo estático: {reviewedAt?.slice(0, 10) ?? "sin fecha informada"}. La consulta integral indica su propia cobertura.</small></div></header><div className="container-main" style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}>
 <nav className={styles.modules} aria-label="Módulos de votaciones">{VOTING_MODULES.map(m => <Link className={styles.module} href={votingModuleHref(m.id)} prefetch={false} aria-current={mode === m.id ? "page" : undefined} key={m.id}><strong>{m.label}</strong><span>{m.description}</span></Link>)}</nav>
 {mode === "legisladores" ? <><p className={styles.note}>Selecciona un legislador para explorar sus votos de 2026 dentro de este apartado. Las opciones no acreditadas se distinguen de los votos publicados.</p><div className={styles.filters}><label className={styles.search}>Buscar legislador<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre, partido o región"/></label><label>Cámara<select value={chamber} onChange={e => setChamber(e.target.value)}><option>Ambas</option><option>Cámara</option><option>Senado</option></select></label></div><p>{people.length} legisladores</p><div className={styles.grid}>{people.map(person => <article className={styles.card} key={person.id}><p className={styles.meta}>{person.chamber} · {person.party}</p><h2>{person.name}</h2><p>{person.territory}</p><Link href={"/votaciones/legisladores/" + person.slug + "/"} prefetch={false}>Explorar sus votaciones →</Link></article>)}</div></> : mode === "comisiones" ? <section className={styles.progress}><h2>Seguimiento de comisiones</h2><p>El catálogo validado de comisiones y sus decisiones todavía no está incorporado. No atribuimos una votación de Sala a una comisión por coincidencia de boletín.</p><Link href="/fuentes/">Fuentes y alcances →</Link></section> : <Suspense fallback={<p>Cargando explorador…</p>}><VotingExplorer mode={mode} initialRecords={records}/></Suspense>}
 </div></div>;
}
