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
import { tituloVotacionLegible } from "@/lib/votaciones-format";
import {
  bancadaParticipacion,
  getVotacionBancadaShares,
  sortVotacionBancadas,
  type VotacionBancadaShare,
  type VotacionBancadaSort,
} from "@/lib/votaciones-bancada";

const OPTION_LABELS: Array<{ key: OpcionVotacion; label: string; color: string }> = [
  { key: "Afirmativo", label: "A favor", color: "var(--success)" },
  { key: "En Contra", label: "En contra", color: "var(--danger)" },
  { key: "Abstención", label: "Abstención", color: "var(--warning)" },
  { key: "No Vota", label: "No vota / sin emisión", color: "var(--text-3)" },
];

function formatNumber(value: number) { return value.toLocaleString("es-CL"); }

function formatPct(value: number) { return `${value.toFixed(1).replace(".", ",")} %`; }

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`));
}

function optionLabel(value: "Afirmativo" | "En Contra" | "Abstención" | null): string {
  if (value === "Afirmativo") return "A favor";
  if (value === "En Contra") return "En contra";
  if (value === "Abstención") return "Abstención";
  return "Sin mayoría";
}

function optionColor(value: "Afirmativo" | "En Contra" | "Abstención" | null): string {
  if (value === "Afirmativo") return "var(--success)";
  if (value === "En Contra") return "var(--danger)";
  if (value === "Abstención") return "var(--warning)";
  return "var(--text-3)";
}

function shareColor(share: VotacionBancadaShare): string {
  return optionColor(share.key === "No Vota" ? null : share.key);
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

function PartyRow({
  party,
  selected,
  canSelect,
  onToggle,
  onOpenNominal,
}: {
  party: VotacionBancadaDetalle;
  selected: boolean;
  canSelect: boolean;
  onToggle: (sigla: string) => void;
  onOpenNominal: (sigla: string) => void;
}) {
  const shares = getVotacionBancadaShares(party);
  return <div className={`featured-vote__party-row${selected ? " is-selected" : ""}`}>
    <div className="featured-vote__party-main">
      <div className="featured-vote__party-name"><strong>{party.sigla}</strong><span>{party.nombre} · {party.miembros} miembros en el padrón</span></div>
      <label className="featured-vote__party-select"><input type="checkbox" checked={selected} disabled={!selected && !canSelect} onChange={() => onToggle(party.sigla)} />Comparar</label>
      <div className="featured-vote__party-votes" aria-label={`Composición de votos de ${party.sigla}`}>
        <span style={{ color: "var(--success)" }}>A favor {formatNumber(party.afirmativo)}</span>
        <span style={{ color: "var(--danger)" }}>En contra {formatNumber(party.enContra)}</span>
        <span style={{ color: "var(--warning)" }}>Abstención {formatNumber(party.abstencion)}</span>
      </div>
      <div className="featured-vote__party-composition" role="img" aria-label={`Distribución de ${party.sigla}: ${shares.map((share) => `${share.label} ${share.pct.toFixed(1).replace(".", ",")} %`).join(", ")}`}>
        {shares.map((share) => <span key={share.key} style={{ width: `${share.pct}%`, background: shareColor(share) }} title={`${share.label}: ${share.pct.toFixed(1).replace(".", ",")} %`} />)}
      </div>
      <div className="featured-vote__party-legend" aria-label={`Porcentajes de ${party.sigla}`}>
        {shares.filter((share) => share.value > 0).map((share) => <span key={share.key}><i style={{ background: shareColor(share) }} />{share.label} {share.pct.toFixed(1).replace(".", ",")} %</span>)}
      </div>
      <small className="featured-vote__party-insight">
        {party.cuotaMayoria === null
          ? "Sin votos efectivos en esta sesión"
          : party.disenso === 0
            ? "Votación unánime entre sus votos efectivos"
            : `${formatNumber(party.disenso)} voto${party.disenso === 1 ? "" : "s"} distinto${party.disenso === 1 ? "" : "s"} de su mayoría`}
      </small>
    </div>
    <div className="featured-vote__party-stat">
      <strong>{party.cuotaMayoria === null ? "—" : `${party.cuotaMayoria.toFixed(1).replace(".", ",")} %`}</strong>
      <span>{formatNumber(party.efectivos)} efectivos</span>
      <span>{formatPct(bancadaParticipacion(party) * 100)} participación</span>
      <span>{optionLabel(party.opcionMayoritaria)}</span>
      <button type="button" className="featured-vote__party-link" onClick={() => onOpenNominal(party.sigla)}>Ver padrón →</button>
    </div>
  </div>;
}

function NominalRow({ vote }: { vote: VotacionNominalDetalle }) {
  const option = OPTION_LABELS.find((candidate) => candidate.key === vote.opcion) ?? OPTION_LABELS[3];
  return <li className="featured-vote__nominal-row"><Link href={`/politico/${vote.slug}`} prefetch={false}><strong>{vote.nombre}</strong><span>{vote.partido_sigla} · {vote.cargo}</span></Link><span className="featured-vote__option" style={{ color: option.color, borderColor: option.color }}>{option.label}</span></li>;
}

function DecisionMap({ detail }: { detail: VotacionDestacadaDetalle }) {
  const segments = OPTION_LABELS.map((option) => {
    const key = option.key === "Afirmativo" ? "afirmativo" : option.key === "En Contra" ? "enContra" : option.key === "Abstención" ? "abstencion" : "noVota";
    return { ...option, value: detail.totales[key] };
  });
  return <section className="featured-vote__decision-map" aria-labelledby="featured-vote-decision-map-title">
    <div className="featured-vote__section-title"><div><h3 id="featured-vote-decision-map-title">Mapa de decisión</h3><p>La barra usa el padrón completo: muestra qué proporción votó y qué parte no emitió una opción.</p></div><strong>{formatNumber(detail.totales.padron)} integrantes</strong></div>
    <div className="featured-vote__decision-track" role="img" aria-label={`Mapa de decisión: ${segments.map((segment) => `${segment.label} ${formatNumber(segment.value)}`).join(", ")}`}>
      {segments.map((segment) => <span key={segment.key} style={{ width: `${detail.totales.padron > 0 ? (segment.value / detail.totales.padron) * 100 : 0}%`, background: segment.color }} title={`${segment.label}: ${formatNumber(segment.value)}`} />)}
    </div>
    <div className="featured-vote__decision-legend">{segments.map((segment) => <span key={segment.key}><i style={{ background: segment.color }} /><strong>{formatNumber(segment.value)}</strong> {segment.label}</span>)}</div>
  </section>;
}

function ComparisonCard({ party }: { party: VotacionBancadaDetalle }) {
  const shares = getVotacionBancadaShares(party);
  return <article className="featured-vote__comparison-card">
    <div className="featured-vote__comparison-card-heading"><strong>{party.sigla}</strong><span>{party.nombre}</span></div>
    <div className="featured-vote__comparison-card-metrics"><strong>{party.cuotaMayoria === null ? "—" : formatPct(party.cuotaMayoria)}</strong><span>cohesión</span><strong>{formatPct(bancadaParticipacion(party) * 100)}</strong><span>participación</span></div>
    <div className="featured-vote__party-composition" role="img" aria-label={`Comparación ${party.sigla}: ${shares.map((share) => `${share.label} ${formatPct(share.pct)}`).join(", ")}`}>
      {shares.map((share) => <span key={share.key} style={{ width: `${share.pct}%`, background: shareColor(share) }} title={`${share.label}: ${formatPct(share.pct)}`} />)}
    </div>
    <div className="featured-vote__comparison-card-footer"><span>{formatNumber(party.efectivos)} efectivos de {formatNumber(party.miembros)}</span><span>{party.disenso === 0 ? "Sin disenso" : `${formatNumber(party.disenso)} distintos de la mayoría`}</span></div>
  </article>;
}

function VoteDetailDialog({ detail, onClose }: { detail: VotacionDestacadaDetalle; onClose: () => void }) {
  const [tab, setTab] = useState<"resumen" | "bancadas" | "nominal">("resumen");
  const [option, setOption] = useState<"Todas" | OpcionVotacion>("Todas");
  const [party, setParty] = useState("Todas");
  const [query, setQuery] = useState("");
  const [bancadaSort, setBancadaSort] = useState<VotacionBancadaSort>("representacion");
  const [selectedParties, setSelectedParties] = useState<string[]>([]);

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
  const sortedBancadas = useMemo(() => sortVotacionBancadas(detail.bancadas, bancadaSort), [detail.bancadas, bancadaSort]);
  const selectedBancadas = useMemo(() => detail.bancadas.filter((entry) => selectedParties.includes(entry.sigla)), [detail.bancadas, selectedParties]);
  const totalEffective = detail.totales.efectivos;
  const mostDividedParty = useMemo(() => detail.bancadas
    .filter((partyEntry) => partyEntry.efectivos > 0 && partyEntry.disenso > 0)
    .sort((a, b) => (b.disenso / b.efectivos) - (a.disenso / a.efectivos))[0], [detail.bancadas]);
  const alignedPct = detail.analisis.bancadasConMuestra > 0
    ? Math.round((detail.analisis.bancadasAlineadas / detail.analisis.bancadasConMuestra) * 1000) / 10
    : 0;
  const mostCohesiveParty = detail.bancadas.filter((entry) => entry.cuotaMayoria !== null).sort((left, right) => (right.cuotaMayoria ?? -1) - (left.cuotaMayoria ?? -1))[0];
  const mostPresentParty = detail.bancadas.slice().sort((left, right) => bancadaParticipacion(right) - bancadaParticipacion(left))[0];

  return <div className="featured-vote-dialog" role="dialog" aria-modal="true" aria-labelledby="featured-vote-detail-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="featured-vote-dialog__panel">
      <header className="featured-vote-dialog__header"><div><span className="eyebrow">{detail.camara} · Boletín {detail.boletin}</span><h2 id="featured-vote-detail-title">{detail.titulo}</h2><p>{formatDate(detail.fecha)} · {detail.tipo ?? "Votación de sala"} · {detail.quorum ?? "Quórum no publicado"}</p></div><button type="button" className="featured-vote-dialog__close" onClick={onClose} aria-label="Cerrar análisis">×</button></header>
      <div className="featured-vote__metrics" aria-label="Resumen cuantitativo de la votación"><div><strong>{formatNumber(detail.totales.padron)}</strong><span>padrón de la sala</span></div><div><strong>{formatNumber(detail.totales.efectivos)}</strong><span>votos efectivos</span></div><div><strong>{formatNumber(detail.totales.margenMayoria)}</strong><span>votos de margen</span></div><div><strong><ResultBadge result={detail.resultadoRecalculado} /></strong><span>resultado recalculado</span></div></div>
      <nav className="featured-vote-dialog__tabs" aria-label="Capas del análisis">{([["resumen", "Lectura rápida"], ["bancadas", "Bancadas"], ["nominal", "Padrón nominal"]] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} className={tab === value ? "is-active" : ""} onClick={() => setTab(value)}>{label}</button>)}</nav>
      <div className="featured-vote-dialog__body">
        {tab === "resumen" && <div>
          <div className="featured-vote__signal-grid" aria-label="Señales de lectura de la votación">
            <div className="featured-vote__signal"><span>Participación efectiva</span><strong>{detail.analisis.participacionPct.toFixed(1).replace(".", ",")} %</strong><small>{formatNumber(detail.totales.efectivos)} de {formatNumber(detail.totales.padron)} integrantes emitieron una opción</small></div>
            <div className="featured-vote__signal"><span>Opción mayoritaria</span><strong style={{ color: optionColor(detail.analisis.opcionMayoritaria) }}>{optionLabel(detail.analisis.opcionMayoritaria)}</strong><small>{detail.analisis.mayoriaPct.toFixed(1).replace(".", ",")} % de los votos efectivos</small></div>
            <div className="featured-vote__signal"><span>Alineamiento de bancadas</span><strong>{alignedPct.toFixed(1).replace(".", ",")} %</strong><small>{detail.analisis.bancadasAlineadas} de {detail.analisis.bancadasConMuestra} con la mayoría de sala</small></div>
          </div>
          <DecisionMap detail={detail} />
          <div className="featured-vote__insight-grid" aria-label="Comparaciones destacadas">
            <div className="featured-vote__insight"><span>Bancada más cohesionada</span><strong>{mostCohesiveParty?.sigla ?? "—"}</strong><small>{mostCohesiveParty?.cuotaMayoria == null ? "Sin muestra efectiva" : `${formatPct(mostCohesiveParty.cuotaMayoria)} de sus votos efectivos siguieron una opción`}</small></div>
            <div className="featured-vote__insight"><span>Mayor presencia en sala</span><strong>{mostPresentParty?.sigla ?? "—"}</strong><small>{mostPresentParty ? `${formatPct(bancadaParticipacion(mostPresentParty) * 100)} de su padrón emitió una opción` : "Sin muestra efectiva"}</small></div>
            <div className="featured-vote__insight"><span>Bancadas con disenso</span><strong>{detail.analisis.bancadasConDisenso}</strong><small>colectividades con al menos un voto distinto de su mayoría</small></div>
          </div>
          <div className="featured-vote__analysis-grid">
            <div>
              <h3>Qué ocurrió</h3>
              <p className="featured-vote__lead">{detail.resumen}</p>
              <p>El padrón produce un resultado <strong>{detail.resultadoRecalculado.toLowerCase()}</strong>: la opción mayoritaria fue <strong>{optionLabel(detail.analisis.opcionMayoritaria)}</strong>, con un margen de {formatNumber(detail.totales.margenMayoria)} voto{detail.totales.margenMayoria === 1 ? "" : "s"} sobre la siguiente alternativa.</p>
              {mostDividedParty && <p className="featured-vote__callout"><strong>Lectura de bancada:</strong> {mostDividedParty.sigla} fue la más dividida: {mostDividedParty.disenso} de sus {mostDividedParty.efectivos} votos efectivos no siguieron su opción mayoritaria.</p>}
              {detail.tramite && <p><strong>Tramitación:</strong> {detail.tramite}</p>}
              {detail.descripcionOficial && <details><summary>Descripción oficial completa</summary><p>{detail.descripcionOficial}</p></details>}
            </div>
            <div className="featured-vote__bars"><h3>Votos efectivos</h3><VoteBar label="A favor" value={detail.totales.afirmativo} total={totalEffective} color="var(--success)" /><VoteBar label="En contra" value={detail.totales.enContra} total={totalEffective} color="var(--danger)" /><VoteBar label="Abstención" value={detail.totales.abstencion} total={totalEffective} color="var(--warning)" /><VoteBar label="No vota / sin emisión" value={detail.totales.noVota} total={detail.totales.padron} color="var(--text-3)" /></div>
          </div>
        </div>}
        {tab === "bancadas" && <div>
          <div className="featured-vote-dialog__section-heading"><div><h3>Cómo votaron las bancadas</h3><p>Compara la composición completa del padrón, la participación y el disenso. La cohesión mide cuánto concentró cada bancada su voto efectivo en la opción más votada.</p></div><span>{detail.bancadas.length} colectividades</span></div>
          <div className="featured-vote__party-toolbar"><label>Ordenar por<select aria-label="Ordenar bancadas por" value={bancadaSort} onChange={(event) => setBancadaSort(event.target.value as VotacionBancadaSort)}><option value="representacion">Votos efectivos</option><option value="cohesion">Cohesión</option><option value="disenso">Disenso</option><option value="participacion">Participación</option></select></label><span>{selectedParties.length} de 3 bancadas comparadas</span></div>
          {selectedBancadas.length > 0 && <section className="featured-vote__comparison" aria-labelledby="featured-vote-comparison-title"><div className="featured-vote__section-title"><div><h3 id="featured-vote-comparison-title">Comparación seleccionada</h3><p>La misma escala permite leer diferencias de alineamiento y participación entre las bancadas elegidas.</p></div><button type="button" className="featured-vote__clear-comparison" onClick={() => setSelectedParties([])}>Limpiar</button></div><div className="featured-vote__comparison-grid">{selectedBancadas.map((partyEntry) => <ComparisonCard key={partyEntry.partido_id} party={partyEntry} />)}</div></section>}
          <div className="featured-vote__party-list">{sortedBancadas.map((partyEntry) => <PartyRow key={partyEntry.partido_id} party={partyEntry} selected={selectedParties.includes(partyEntry.sigla)} canSelect={selectedParties.length < 3} onToggle={(sigla) => setSelectedParties((current) => current.includes(sigla) ? current.filter((value) => value !== sigla) : current.length < 3 ? [...current, sigla] : current)} onOpenNominal={(sigla) => { setParty(sigla); setTab("nominal"); }} />)}</div>
        </div>}
        {tab === "nominal" && <div><div className="featured-vote-dialog__section-heading"><div><h3>Padrón nominal</h3><p>Busca una persona, filtra por bancada u opción y abre su ficha.</p></div><span>{formatNumber(filteredNominal.length)} resultados</span></div><div className="featured-vote__filters"><label>Buscar<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nombre o bancada" /></label><label>Opción<select value={option} onChange={(event) => setOption(event.target.value as "Todas" | OpcionVotacion)}><option>Todas</option>{OPTION_LABELS.map((entry) => <option key={entry.key}>{entry.key}</option>)}</select></label><label>Bancada<select value={party} onChange={(event) => setParty(event.target.value)}>{parties.map((value) => <option key={value}>{value}</option>)}</select></label></div><ul className="featured-vote__nominal-list">{filteredNominal.map((vote) => <NominalRow key={vote.politico_id} vote={vote} />)}</ul>{filteredNominal.length === 0 && <p className="featured-vote__empty" role="status">No hay integrantes que coincidan con estos filtros.</p>}</div>}
      </div>
      <footer className="featured-vote-dialog__footer"><span>Fuente: padrón nominal consolidado por El Cambiómetro.</span><a href={detail.fuente_url} target="_blank" rel="noreferrer">Abrir registro oficial ↗</a></footer>
    </section>
  </div>;
}

export default function VotacionesDestacadasClient({ entries, details }: { entries: VotacionDestacada[]; details: Record<string, VotacionDestacadaDetalle> }) {
  const [tag, setTag] = useState("Todas");
  const [camara, setCamara] = useState<"Cámara" | "Senado">("Senado");
  const [resultado, setResultado] = useState("Todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tags = ["Todas", ...new Set(entries.flatMap((entry) => entry.tags))];
  const filtered = useMemo(() => entries.filter((entry) => (tag === "Todas" || entry.tags.includes(tag)) && entry.camara === camara && (resultado === "Todos" || entry.resultado === resultado)).sort((a, b) => b.fecha.localeCompare(a.fecha)), [entries, tag, camara, resultado]);
  const selected = selectedId ? details[selectedId] : undefined;

  return <div className="page-shell featured-votes-page" style={{ minHeight: "100vh" }}>
    <header className="page-masthead"><div className="container-main"><span className="eyebrow">Congreso Nacional · análisis nominal</span><h1>Votaciones destacadas</h1><p>Lee cada votación en tres capas: qué decidió la sala, cómo se distribuyeron las bancadas y qué marcó cada integrante. Los resultados se recalculan desde el padrón publicado.</p></div></header>
    <main className="container-main featured-votes-page__main"><div className="featured-votes-page__intro"><div><span className="eyebrow">Explorador editorial</span><h2>Decisiones que merecen contexto</h2></div><p>{filtered.length} de {entries.length} votaciones visibles</p></div><div className="featured-votes-page__filters" role="group" aria-label="Filtros de votaciones destacadas"><label>Etiqueta<select value={tag} onChange={(event) => setTag(event.target.value)}>{tags.map((value) => <option key={value}>{value}</option>)}</select></label><div className="featured-vote-camera-filter"><span className="featured-vote-camera-filter__label">Cámara</span><div role="group" aria-label="Filtrar por cámara">{(["Senado", "Cámara"] as const).map((value) => <button key={value} type="button" aria-pressed={camara === value} className={camara === value ? "is-active" : ""} onClick={() => setCamara(value)}>{value}</button>)}</div><small>Senado se muestra primero para facilitar la lectura del detalle.</small></div><label>Resultado<select value={resultado} onChange={(event) => setResultado(event.target.value)}><option>Todos</option><option>Aprobado</option><option>Rechazado</option><option>En trámite</option><option>Retirado</option></select></label></div><div className="featured-votes-list">{filtered.map((entry) => { const detail = details[entry.votacion_id]; return <article key={entry.votacion_id} className="featured-vote-card"><div className="featured-vote-card__top"><div><span className="eyebrow">{entry.camara} · {formatDate(entry.fecha)}</span><h2>{tituloVotacionLegible(entry, detail?.tipo)}</h2><p className="featured-vote-card__boletin">Boletín {entry.boletin} · {entry.tags.join(" · ")}</p></div><ResultBadge result={entry.resultado} /></div><p className="featured-vote-card__summary">{entry.resumen}</p>{detail && <div className="featured-vote-card__evidence"><span><strong>{formatNumber(detail.totales.efectivos)}</strong> efectivos</span><span><strong>{formatNumber(detail.totales.padron)}</strong> en padrón</span><span><strong>{detail.bancadas.length}</strong> bancadas visibles</span></div>}<div className="featured-vote-card__actions"><button type="button" className="btn btn-primary" onClick={() => setSelectedId(entry.votacion_id)}>Abrir análisis</button><a href={entry.fuente_url} target="_blank" rel="noreferrer" className="btn btn-secondary">Fuente oficial ↗</a></div></article>; })}</div>{filtered.length === 0 && <p className="featured-vote__empty" role="status">No hay votaciones para estos filtros.</p>}</main>
    {selected && <VoteDetailDialog detail={selected} onClose={() => setSelectedId(null)} />}
  </div>;
}
