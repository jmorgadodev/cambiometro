"use client";

import { useEffect, useRef, useState } from "react";
import SourceLink from "@/components/data/SourceLink";
import { NOMINAL_OPTIONS, nominalOption, type ExplorerVote, type NominalOption } from "@/lib/voting-explorer";
import { normalizeVotingSearch } from "@/lib/voting-workspace";
import styles from "./VotingExplorer.module.css";

export default function VoteDetail({ vote, onClose }: { vote: ExplorerVote | null; onClose: () => void }) {
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const element = dialog.current;
        if (!vote || !element) return;
        const overflow = document.body.style.overflow;
        element.showModal();
        document.body.style.overflow = "hidden";
        return () => { element.close(); document.body.style.overflow = overflow; };
    }, [vote]);
    return <dialog ref={dialog} className={styles.dialog} aria-labelledby="vote-detail-title"
        onClose={onClose} onKeyDown={e => {
            if (e.key !== "Tab") return;
            const controls = e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], select:not(:disabled), [tabindex="0"]');
            const first = controls[0], last = controls[controls.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
        }} onClick={e => {
            if (e.target !== e.currentTarget) return;
            const box = e.currentTarget.getBoundingClientRect();
            if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) e.currentTarget.close();
        }}>
        {vote && <>
            <header className={styles.detailHeader}>
                <p>{vote.chamber} · {vote.date.split("-").reverse().join("/")}{vote.bulletin ? " · Boletín " + vote.bulletin : ""}</p>
                <button onClick={() => dialog.current?.close()} autoFocus aria-label="Cerrar detalle de votación">Cerrar detalle ×</button>
            </header>
            <div className={styles.detailBody}>
                <h2 id="vote-detail-title">{vote.title}</h2>
                <p className={styles.result}>{vote.result}</p><VoteCounts row={vote}/>
                <section><h3>Qué se votó</h3><p>{vote.description || "Descripción no incorporada en este registro."}</p>
                    <p>Quórum: {vote.quorum ?? "No informado"}</p><p>Identificador: {vote.id}</p></section>
                <section><h3>Quiénes votaron</h3>{vote.nominalStatus === "validated"
                    ? <NominalVotes key={vote.chamber + vote.id} vote={vote}/>
                    : <p>{vote.nominalStatus === "unavailable"
                        ? "Este registro no incluye una nómina individual. Conservamos los totales publicados."
                        : "La nómina publicada requiere conciliación: contiene datos incompletos, repetidos u opciones que no coinciden con los totales. No atribuimos votos individuales hasta validarla."}</p>}</section>
                <SourceLink href={vote.sourceUrl}>Fuentes y alcance</SourceLink>
            </div>
        </>}
    </dialog>;
}

function NominalVotes({ vote }: { vote: ExplorerVote }) {
    const [search, setSearch] = useState("");
    const [option, setOption] = useState<NominalOption | "todos">("todos");
    const counts = new Map<NominalOption, number>();
    for (const row of vote.nominal) {
        const key = nominalOption(row.option);
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const needle = normalizeVotingSearch(search).replace(/\s+/g, " ");
    const filtered = vote.nominal.filter(row => (!needle || normalizeVotingSearch(row.name).replace(/\s+/g, " ").includes(needle))
        && (option === "todos" || nominalOption(row.option) === option));
    return <>
        <p>Opciones individuales publicadas por {vote.chamber === "Cámara" ? "la Cámara" : "el Senado"}, conciliadas con los totales de esta votación. «No vota», pareos y dispensas sólo aparecen si constan en la nómina; no equivalen a asistencia.</p>
        <label className={styles.nominalSearch}>Buscar parlamentario<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre o apellido"/></label>
        <div className={styles.nominalFilters} role="group" aria-label="Filtrar por opción de voto">
            <button aria-pressed={option === "todos"} onClick={() => setOption("todos")}>Todos ({vote.nominal.length})</button>
            {(Object.keys(NOMINAL_OPTIONS) as NominalOption[]).filter(key => counts.has(key)).map(key => <button key={key} data-option={key} aria-pressed={option === key} onClick={() => setOption(key)}>{NOMINAL_OPTIONS[key]} ({counts.get(key)})</button>)}
        </div>
        <p role="status">{filtered.length} de {vote.nominal.length} registros nominales</p>
        <ul className={styles.nominal}>{filtered.map(row => <li key={row.id || row.name} data-option={nominalOption(row.option)}><strong>{row.name}</strong><span>{NOMINAL_OPTIONS[nominalOption(row.option)!]}</span></li>)}</ul>
        {!filtered.length && <p>No hay nombres con estos filtros.</p>}
    </>;
}

export function VoteCounts({ row }: { row: ExplorerVote }) {
    return <dl className={styles.counts}>{([["favor", "A favor"], ["contra", "En contra"], ["abstencion", "Abstención"]] as const).map(([key, label]) => <div key={key} data-option={key}><dt>{label}</dt><dd>{row.counts[key] === null ? "No informado" : row.counts[key]!.toLocaleString("es-CL")}</dd></div>)}</dl>;
}
