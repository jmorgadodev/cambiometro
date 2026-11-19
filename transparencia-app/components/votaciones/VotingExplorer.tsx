"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { publicApiUrl } from "@/lib/public-api-origin";
import {isVotingDate} from "@/lib/voting-workspace";
import type { EvidenceRecord } from "@/lib/data-contracts";
import { explorerRecord, groupExplorerVotes, readableVoteTitle, votingRecordUrl, type ExplorerVote, type VoteQuery } from "@/lib/voting-explorer";
import VoteDetail, { VoteCounts } from "./VoteDetail";
import styles from "./VotingExplorer.module.css";
type Chamber = "Cámara" | "Senado";
interface PageResult {
    chamber: Chamber;
    rows: ExplorerVote[];
    next: string | null;
    total: number | null;
    limited: boolean;
}
async function readPage(chamber: Chamber, query: VoteQuery, cursor: string | null, signal?: AbortSignal): Promise<PageResult> {
    const response = await fetch(publicApiUrl(votingRecordUrl(chamber, query, cursor)), { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000) });
    if (!response.ok)
        throw new Error("Consulta temporalmente no disponible (" + response.status + ")");
    const body = await response.json();
    if (!Array.isArray(body.data))
        throw new Error("Respuesta de catálogo no válida");
    return { chamber, rows: (body.data as EvidenceRecord[]).flatMap(r => { const row = explorerRecord(r); return row && row.date >= query.from && row.date <= query.to ? [row] : []; }), next: body.meta?.nextCursor ?? null, total: typeof body.meta?.total === "number" ? body.meta.total : null, limited: Boolean(body.meta?.missingArtifacts || body.meta?.missingPartitions || body.meta?.sourceStatus === "partial") };
}
const date = (value: string) => value.split("-").reverse().join("/");
export default function VotingExplorer({ initialRecords, mode }: {
    initialRecords: ExplorerVote[];
    mode: "votaciones" | "proyectos" | "sesiones";
}) {
    const params = useSearchParams();
    const router = useRouter();
    const rawChamber = params.get("camara");
    const chamber = rawChamber === "Cámara" || rawChamber === "Senado" ? rawChamber : "Ambas";
    const from = isVotingDate(params.get("desde") ?? "") ? params.get("desde")! : "2026-01-01";
    const to = isVotingDate(params.get("hasta") ?? "") ? params.get("hasta")! : "2026-12-31";
    const query: VoteQuery = { chamber, from, to, query: params.get("q") ?? "" };
    const key = JSON.stringify(query);
    const [retry, setRetry] = useState(0);
    const [state, setState] = useState<{
        key: string;
        pages: PageResult[];
        error: string | null;
        live: boolean;
        loading: boolean;
    }>({ key: "", pages: [], error: null, live: false, loading: false });
    const [selected, setSelected] = useState<ExplorerVote | null>(null);
    useEffect(() => {
        const controller = new AbortController();
        const q: VoteQuery = JSON.parse(key);
        const chambers: Chamber[] = q.chamber === "Ambas" ? ["Cámara", "Senado"] : [q.chamber];
        Promise.allSettled(chambers.map(c => readPage(c, q, null, controller.signal))).then(results => { if (controller.signal.aborted)
            return; const pages = results.flatMap(r => r.status === "fulfilled" ? [r.value] : []); const failures = results.filter(r => r.status === "rejected"); setState({ key, pages, error: failures.length ? "Parte del catálogo no pudo cargarse. Puedes reintentar; la cobertura está indicada abajo." : null, live: pages.length > 0, loading: false }); });
        return () => controller.abort();
    }, [key, retry]);
    const current = state.key === key;
    const loading = !current || state.loading;
    const live = current && state.live;
    const fallback = initialRecords.filter(r => r.date >= from && r.date <= to && (chamber === "Ambas" || r.chamber === chamber) && (!query.query || (r.title + " " + r.bulletin).toLocaleLowerCase("es").includes(query.query.toLocaleLowerCase("es"))));
    const rows = live ? [...new Map(state.pages.flatMap(p => p.rows).map(r => [r.chamber + ":" + r.id, r])).values()] : fallback;
    const groups = groupExplorerVotes(rows, mode);
    const more = live && state.pages.some(p => p.next);
    const total = live && state.pages.every(p => p.total !== null) ? state.pages.reduce((s, p) => s + p.total!, 0) : null;
    async function loadMore() { setState(s => ({ ...s, loading: true })); const results = await Promise.allSettled(state.pages.map(p => p.next ? readPage(p.chamber, query, p.next) : Promise.resolve(null))); setState(previous => { if (previous.key !== key)
        return previous; return { ...previous, loading: false, error: results.some(r => r.status === "rejected") ? "No se pudo cargar una página. Conservamos lo ya consultado; vuelve a intentarlo." : null, pages: previous.pages.map(p => { const result = results.find(r => r.status === "fulfilled" && r.value?.chamber === p.chamber); return result?.status === "fulfilled" && result.value ? { ...result.value, rows: [...p.rows, ...result.value.rows] } : p; }) }; }); }
    function submit(form: HTMLFormElement) { const data = new FormData(form); const next = new URLSearchParams(params.toString()); for (const name of ["q", "camara", "desde", "hasta"]) {
        const value = String(data.get(name) ?? "");
        if (value)
            next.set(name, value);
        else
            next.delete(name);
    } router.replace("?" + next, { scroll: false }); }
    return <div className={styles.explorer}>
  <p className={styles.intro}>Explora los proyectos y materias votadas, abre sus decisiones y consulta el resultado aquí. El rango inicial abarca todo 2026; cada consulta indica los registros incorporados y pendientes de cargar.</p>
  <form className={styles.filters} key={key} onSubmit={e => { e.preventDefault(); submit(e.currentTarget); }} aria-label="Filtros de votaciones">
   <label className={styles.search}>Buscar tema, materia o boletín<input name="q" type="search" maxLength={80} defaultValue={query.query} placeholder="Presupuesto, educación, 18279-10…"/></label>
   <label>Cámara<select name="camara" defaultValue={chamber}><option>Ambas</option><option>Cámara</option><option>Senado</option></select></label>
   <label>Desde<input name="desde" type="date" min="2026-01-01" defaultValue={from} required/></label><label>Hasta<input name="hasta" type="date" min={from} defaultValue={to} required/></label><button type="submit">Consultar</button>
  </form>
  <div className={styles.summary} role="status"><strong>{rows.length.toLocaleString("es-CL")} registros cargados</strong><span>{total === null ? "Corte de referencia disponible" : total.toLocaleString("es-CL") + " disponibles en las fuentes consultadas"}</span><span>{groups.length} {mode === "sesiones" ? "sesiones/jornadas cargadas" : "grupos de materias cargados"}</span></div>
  {loading && <p role="status">Consultando el catálogo publicado…</p>}
  {current && state.error && <p role="alert" className={styles.notice}>{state.error} <button onClick={() => setRetry(n => n + 1)}>Reintentar consulta</button></p>}
  {!live && !loading && <p className={styles.notice}>Mostramos el último corte incorporado en esta versión, que puede cubrir menos meses. No significa que no haya votaciones en los meses restantes.</p>}
  {live && state.pages.some(p => p.limited) && <p className={styles.notice}>La fuente integrada informa cobertura parcial. Los totales corresponden sólo a los registros disponibles.</p>}
  {from > to && <p role="alert">La fecha inicial debe ser anterior o igual a la final.</p>}
  {mode === "sesiones" && <p className={styles.note}>Una jornada agrupa decisiones del día cuando no consta un identificador de sesión; no equivale a una sesión acreditada. Abre el grupo para ver sus votaciones dentro del sitio.</p>}
  <div className={styles.groups}>{groups.map(group => <details className={styles.group} key={group.id}>
   <summary><span className={styles.groupMeta}>{group.rows[0].chamber} · {date(group.rows[0].date)}</span><strong>{group.title}</strong><span>{mode === "sesiones" ? group.subtitle : group.subtitle.slice(0, 220)}</span><span className={styles.count}>{group.rows.length} decisiones cargadas · Abrir materias ↓</span></summary>
   <div className={styles.matters}>{group.rows.map(row => <article className={styles.matter} key={row.id}><div><p>{date(row.date)} · {row.type || "Sala"}</p><h3>{readableVoteTitle(row.title)}</h3><span>{row.result}</span></div><div><VoteCounts row={row}/><button onClick={() => setSelected(row)} aria-label={"Ver votación " + row.id}>Ver votación →</button></div></article>)}</div>
  </details>)}</div>
  {!groups.length && !loading && <p>No hay registros cargados para estos filtros. Comprueba el estado de la consulta antes de interpretar una ausencia.</p>}
  {more && <button className={styles.loadMore} onClick={loadMore} disabled={loading}>{loading ? "Cargando…" : "Cargar más votaciones de este rango"}</button>}
  <p className={styles.note}>Las cantidades de grupos corresponden a lo cargado, no al universo completo. El resultado de una votación no acredita que un proyecto sea ley. No se calcula asistencia a partir de votos. <Link href="/fuentes/">Fuentes y alcances →</Link></p>
  <VoteDetail vote={selected} onClose={() => setSelected(null)}/>
 </div>;
}
