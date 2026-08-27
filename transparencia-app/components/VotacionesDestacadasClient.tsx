"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  OpcionVotacion,
  VotacionBancadaDetalle,
  VotacionDestacada,
  VotacionDestacadaDetalle,
  VotacionNominalDetalle,
} from "@/lib/votaciones-destacadas";

const OPTION_LABELS: Array<{ key: OpcionVotacion; label: string; color: string }> = [
  { key: "Afirmativo", label: "A favor", color: "var(--success)" },
  { key: "En Contra", label: "En contra", color: "var(--danger)" },
  { key: "Abstención", label: "Abstención", color: "var(--warning)" },
  { key: "No Vota", label: "No vota / sin emisión", color: "var(--text-3)" },
];

function formatNumber(value: number) { return value.toLocaleString("es-CL"); }

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function resultStyle(result: VotacionDestacada["resultado"]) {
  if (result === "Aprobado") return { color: "var(--success)", background: "color-mix(in srgb, var(--success) 12%, transparent)" };
  if (result === "Rechazado") return { color: "var(--danger)", background: "color-mix(in srgb, var(--danger) 12%, transparent)" };
  if (result === "En trámite") return { color: "var(--warning)", background: "color-mix(in srgb, var(--warning) 12%, transparent)" };
  return { color: "var(--text-2)", background: "var(--surface-2)" };
}

function ResultBadge({ result }: { result: VotacionDestacada["resultado"] }) {
  const style = resultStyle(result);
  return <span className="featured-vote__result" style={{ color: style.color, background: style.background }}>{result}</span>;
}

function VoteBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return <div className="featured-vote__bar-row"><div className="featured-vote__bar-label"><span>{label}</span><strong>{formatNumber(value)}</strong></div><div className="featured-vote__bar-track" aria-hidden="true"><span style={{ width: `${percentage}%`, background: color }} /></div><small>{percentage.toFixed(1).replace(".", ",")} %</small></div>;
}

function PartyRow({ party }: { party: VotacionBancadaDetalle }) {
  return <div className="featured-vote__party-row"><div><strong>{party.sigla}</strong><span>{party.nombre} · {party.miembros} miembros en el padrón</span></div><div className="featured-vote__party-stat"><strong>{party.cuotaMayoria === null ? "—" : `${party.cuotaMayoria.toFixed(1).replace(".", ",")} %`}</strong><span>{formatNumber(party.efectivos)} efectivos</span></div></div>;
}

function NominalRow({ vote }: { vote: VotacionNominalDetalle }) {
  const option = OPTION_LABELS.find((candidate) => candidate.key === vote.opcion) ?? OPTION_LABELS[3];
  return <li className="featured-vote__nominal-row"><Link href={`/politico/${vote.slug}`} prefetch={false}><strong>{vote.nombre}</strong><span>{vote.partido_sigla} · {vote.cargo}</span></Link><span className="featured-vote__option" style={{ color: option.color, borderColor: option.color }}>{option.label}</span></li>;
}

function VoteDetailDialog({ detail, onClose }: { detail: VotacionDestacadaDetalle; onClose: () => void }) {
  const [tab, setTab] = useState<"resumen" | "bancadas" | "nominal">("resumen");
  const [option, setOption] = useState<"Todas" | OpcionVotacion>("Todas");
  const [party, setParty] = useState("Todas");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; };
  }, [onClose]);

  const parties = useMemo(() => ["Todas", ...detail.bancadas.map((entry) => entry.sigla)], [detail.bancadas]);
  const filteredNominal = useMemo(() => detail.nominales.filter((vote) => {
    const matchesOption = option === "Todas" || vote.opcion === option;
    const matchesParty = party === "Todas" || vote.partido_sigla === party;
    const haystack = `${vote.nombre} ${vote.partido_sigla} ${vote.partido_nombre}`.toLocaleLowerCase("es");
    return matchesOption && matchesParty && haystack.includes(query.trim().toLocaleLowerCase("es"));
  }), [detail.nominales, option, party, query]);
  const totalEffective = detail.totales.efectivos;
  const majority = detail.totales.afirmativo >= detail.totales.enContra && detail.totales.afirmativo >= detail.totales.abstencion ? "A favor" : detail.totales.enContra >= detail.totales.abstencion ? "En contra" : "Abstención";

  return <div className="featured-vote-dialog" role="dialog" aria-modal="true" aria-labelledby="featured-vote-detail-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="featured-vote-dialog__panel">
      <header className="featured-vote-dialog__header"><div><span className="eyebrow">{detail.camara} · Boletín {detail.boletin}</span><h2 id="featured-vote-detail-title">{detail.titulo}</h2><p>{formatDate(detail.fecha)} · {detail.tipo ?? "Votación de sala"} · {detail.quorum ?? "Quórum no publicado"}</p></div><button type="button" className="featured-vote-dialog__close" onClick={onClose} aria-label="Cerrar análisis">×</button></header>
      <div className="featured-vote__metrics" aria-label="Resumen cuantitativo de la votación"><div><strong>{formatNumber(detail.totales.padron)}</strong><span>padrón de la sala</span></div><div><strong>{formatNumber(detail.totales.efectivos)}</strong><span>votos efectivos</span></div><div><strong>{formatNumber(detail.totales.margenMayoria)}</strong><span>votos de margen</span></div><div><strong><ResultBadge result={detail.resultadoRecalculado} /></strong><span>resultado recalculado</span></div></div>
      <nav className="featured-vote-dialog__tabs" aria-label="Capas del análisis">{([["resumen", "Lectura rápida"], ["bancadas", "Bancadas"], ["nominal", "Padrón nominal"]] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? "is-active" : ""} onClick={() => setTab(value)}>{label}</button>)}</nav>
      <div className="featured-vote-dialog__body">
        {tab === "resumen" && <div className="featured-vote__analysis-grid"><div><h3>Qué ocurrió</h3><p className="featured-vote__lead">{detail.resumen}</p><p>El padrón produce un resultado <strong>{detail.resultadoRecalculado.toLowerCase()}</strong>: la opción mayoritaria fue <strong>{majority}</strong>, con un margen de {formatNumber(detail.totales.margenMayoria)} voto{detail.totales.margenMayoria === 1 ? "" : "s"} sobre la siguiente alternativa.</p>{detail.descripcionOficial && <details><summary>Descripción oficial completa</summary><p>{detail.descripcionOficial}</p></details>}</div><div className="featured-vote__bars"><h3>Votos efectivos</h3><VoteBar label="A favor" value={detail.totales.afirmativo} total={totalEffective} color="var(--success)" /><VoteBar label="En contra" value={detail.totales.enContra} total={totalEffective} color="var(--danger)" /><VoteBar label="Abstención" value={detail.totales.abstencion} total={totalEffective} color="var(--warning)" /><VoteBar label="No vota / sin emisión" value={detail.totales.noVota} total={detail.totales.padron} color="var(--text-3)" /></div></div>}
        {tab === "bancadas" && <div><div className="featured-vote-dialog__section-heading"><div><h3>Cómo votaron las bancadas</h3><p>Cuota de la opción mayoritaria sobre sus votos efectivos en esta sesión.</p></div><span>{detail.bancadas.length} colectividades</span></div><div className="featured-vote__party-list">{detail.bancadas.map((partyEntry) => <PartyRow key={partyEntry.partido_id} party={partyEntry} />)}</div></div>}
        {tab === "nominal" && <div><div className="featured-vote-dialog__section-heading"><div><h3>Padrón nominal</h3><p>Busca una persona, filtra por bancada u opción y abre su ficha.</p></div><span>{formatNumber(filteredNominal.length)} resultados</span></div><div className="featured-vote__filters"><label>Buscar<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o bancada" /></label><label>Opción<select value={option} onChange={(event) => setOption(event.target.value as "Todas" | OpcionVotacion)}><option>Todas</option>{OPTION_LABELS.map((entry) => <option key={entry.key}>{entry.key}</option>)}</select></label><label>Bancada<select value={party} onChange={(event) => setParty(event.target.value)}>{parties.map((value) => <option key={value}>{value}</option>)}</select></label></div><ul className="featured-vote__nominal-list">{filteredNominal.map((vote) => <NominalRow key={vote.politico_id} vote={vote} />)}</ul>{filteredNominal.length === 0 && <p className="featured-vote__empty" role="status">No hay integrantes que coincidan con estos filtros.</p>}</div>}
      </div>
      <footer className="featured-vote-dialog__footer"><span>Fuente: padrón nominal consolidado por El Cambiómetro.</span><a href={detail.fuente_url} target="_blank" rel="noreferrer">Abrir registro oficial ↗</a></footer>
    </section>
  </div>;
}

export default function VotacionesDestacadasClient({ entries, details }: { entries: VotacionDestacada[]; details: Record<string, VotacionDestacadaDetalle> }) {
  const [tag, setTag] = useState("Todas");
  const [camara, setCamara] = useState("Todas");
  const [resultado, setResultado] = useState("Todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tags = ["Todas", ...new Set(entries.flatMap((entry) => entry.tags))];
  const filtered = useMemo(() => entries.filter((entry) => (tag === "Todas" || entry.tags.includes(tag)) && (camara === "Todas" || entry.camara === camara) && (resultado === "Todos" || entry.resultado === resultado)).sort((a, b) => b.fecha.localeCompare(a.fecha)), [entries, tag, camara, resultado]);
  const selected = selectedId ? details[selectedId] : undefined;

  return <div className="page-shell featured-votes-page" style={{ minHeight: "100vh" }}>
    <header className="page-masthead"><div className="container-main"><span className="eyebrow">Congreso Nacional · análisis nominal</span><h1>Votaciones destacadas</h1><p>Lee cada votación en tres capas: qué decidió la sala, cómo se distribuyeron las bancadas y qué marcó cada integrante. Los resultados se recalculan desde el padrón publicado.</p></div></header>
    <main className="container-main featured-votes-page__main"><div className="featured-votes-page__intro"><div><span className="eyebrow">Explorador editorial</span><h2>Decisiones que merecen contexto</h2></div><p>{filtered.length} de {entries.length} votaciones visibles</p></div><div className="featured-votes-page__filters" role="group" aria-label="Filtros de votaciones destacadas"><label>Etiqueta<select value={tag} onChange={(event) => setTag(event.target.value)}>{tags.map((value) => <option key={value}>{value}</option>)}</select></label><label>Cámara<select value={camara} onChange={(event) => setCamara(event.target.value)}><option>Todas</option><option>Cámara</option><option>Senado</option></select></label><label>Resultado<select value={resultado} onChange={(event) => setResultado(event.target.value)}><option>Todos</option><option>Aprobado</option><option>Rechazado</option><option>En trámite</option><option>Retirado</option></select></label></div><div className="featured-votes-list">{filtered.map((entry) => { const detail = details[entry.votacion_id]; return <article key={entry.votacion_id} className="featured-vote-card"><div className="featured-vote-card__top"><div><span className="eyebrow">{entry.camara} · {formatDate(entry.fecha)}</span><h2>{entry.titulo}</h2><p className="featured-vote-card__boletin">Boletín {entry.boletin} · {entry.tags.join(" · ")}</p></div><ResultBadge result={entry.resultado} /></div><p className="featured-vote-card__summary">{entry.resumen}</p>{detail && <div className="featured-vote-card__evidence"><span><strong>{formatNumber(detail.totales.efectivos)}</strong> efectivos</span><span><strong>{formatNumber(detail.totales.padron)}</strong> en padrón</span><span><strong>{detail.bancadas.length}</strong> bancadas visibles</span></div>}<div className="featured-vote-card__actions"><button type="button" className="btn btn-primary" onClick={() => setSelectedId(entry.votacion_id)}>Abrir análisis</button><a href={entry.fuente_url} target="_blank" rel="noreferrer" className="btn btn-secondary">Fuente oficial ↗</a></div></article>; })}</div>{filtered.length === 0 && <p className="featured-vote__empty" role="status">No hay votaciones para estos filtros.</p>}</main>
    {selected && <VoteDetailDialog detail={selected} onClose={() => setSelectedId(null)} />}
  </div>;
}
