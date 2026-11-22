"use client";
import { useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import VotingPanel from '@/components/votaciones/VotingPanel';
import { filterMovementEntries, parseMovementQuery, movementPage, movementDate, movementMonthLabel, formatMovementDate, summarizeMovementEntries, MOVEMENT_STATUS_LABEL, MOVEMENT_DATE_LABEL, type MovementEntry, type MovementStatus } from '@/lib/movement-register';
import { MovementDate, MovementState, MovementIdentity, MovementContext } from './MovementPrimitives';
import { MovementFilter, MovementPeriod } from './MovementFilters';
import MovementDetail from './MovementDetail';
import MovementSources, { type MovementMetadata } from './MovementSources';
import styles from './Movements.module.css';
export default function MovementRegister({ entries, metadata }: {
    entries: MovementEntry[];
    metadata: MovementMetadata;
}) {
    const params = useSearchParams(), pathname = usePathname();
    const query = parseMovementQuery(new URLSearchParams(params.toString()));
    const [sources, setSources] = useState(false), [copy, setCopy] = useState(''), [showFilters,setShowFilters]=useState(false);
    const filtered = filterMovementEntries(entries, query), page = movementPage(filtered, query.page), summary = summarizeMovementEntries(filtered);
    const selected = entries.find(e => e.id === params.get('movimiento'));
    const selectedIndex = filtered.findIndex(e => e.id === selected?.id);
    function update(values: Record<string, string | string[] | null>, keepPage = false) { const p = new URLSearchParams(params.toString()); if (!keepPage) {
        p.delete('pagina');
        p.delete('movimiento');
    } for (const [key, value] of Object.entries(values)) {
        p.delete(key);
        if (Array.isArray(value))
            value.forEach(v => p.append(key, v));
        else if (value)
            p.set(key, value);
    } window.history.replaceState(null, '', pathname + (p.size ? '?' + p.toString() : '')); }
    function reset() { window.history.replaceState(null, '', pathname); }
    const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es-CL'));
    const types = unique(entries.map(e => e.type)).map(value => ({ value, label: entries.find(e => e.type === value)!.typeLabel }));
    const institutions = unique(entries.flatMap(e => [e.institution, e.ministry])).map(value => ({ value, label: value }));
    const regions = unique(entries.map(e => e.region)).map(value => ({ value, label: value }));
    const states = unique(entries.map(e => e.status)).map(value => ({ value: value === 'pending' ? 'en_confirmacion' : value, label: MOVEMENT_STATUS_LABEL[value as MovementStatus] }));
    const reasons = unique(entries.map(e => e.reason)).map(value => ({ value, label: value }));
    const selectedStates = query.states;
    const selectedId = params.get('movimiento');
    const groups = new Map<string, MovementEntry[]>();
    for (const e of page.rows) {
        const month = movementDate(e, query.basis)?.slice(0, 7) ?? 'sin-fecha';
        groups.set(month, [...(groups.get(month) ?? []), e]);
    }
    const chips = [...query.types.map(v => ({ key: 'tipo', value: v, label: types.find(t => t.value === v)?.label ?? v })), ...query.institutions.map(v => ({ key: 'institucion', value: v, label: v })), ...query.regions.map(v => ({ key: 'region', value: v, label: v })), ...query.states.map(v => ({ key: 'estado', value: v, label: v === 'verificado' ? 'Con respaldo · enlace anterior' : v === 'en_confirmacion' ? 'En confirmación' : MOVEMENT_STATUS_LABEL[v as MovementStatus] ?? v })), ...query.reasons.map(v => ({ key: 'motivo', value: v, label: v }))];
    async function copyLink() { try {
        await navigator.clipboard.writeText(window.location.href);
        setCopy('Enlace copiado');
    }
    catch {
        setCopy('Puedes copiar el enlace desde la barra del navegador.');
    } }
    const select = (id: string) => update({ movimiento: id }, true);
    return <div className={styles.register} data-movement-register="ready" data-query={params.toString()}>
<dl className={styles.summary}>
<div>
<dt>Registros en la selección</dt>
<dd>{summary.total}<small>Casos y anuncios · {summary.pending} en confirmación o detectados</small></dd>
</div>
<div>
<dt>Con acto oficial individualizado</dt>
<dd>{summary.official}<small>Sin incluir noticias ni comunicados</small></dd>
</div>
<div>
<dt>Última publicación en la selección</dt>
<dd className={styles.summaryDate}>{summary.publication ? formatMovementDate(summary.publication) : 'Sin fecha informada'}<small>Fecha de la fuente, no del hecho</small></dd>
</div>
</dl>
<div className={styles.searchRow}>
<label className={styles.search}>Buscar movimientos<input type="search" value={query.q} placeholder="Nombre, institución, cargo o región" onChange={e => update({ q: e.target.value })}/>
</label>
<button className={styles.linkButton} onClick={() => setSources(true)}>Fuentes y alcance ↗</button>
</div>
<button className={styles.mobileFilterToggle} aria-expanded={showFilters} aria-controls="movement-filters" onClick={()=>setShowFilters(v=>!v)}>Filtros {chips.length>0?`(${chips.length})`:query.month||query.from||query.to?'(1)':''} <span aria-hidden="true">{showFilters?'−':'+'}</span></button>
<div id="movement-filters" className={styles.filters} data-mobile-open={showFilters} aria-label="Filtros del registro">
<MovementFilter title="Tipo" options={types} selected={query.types} onChange={v => update({ tipo: v })}/>
<MovementFilter title="Institución" options={institutions} selected={query.institutions} onChange={v => update({ institucion: v, ministerio: null })}/>{regions.length > 0 && <MovementFilter title="Región" options={regions} selected={query.regions} onChange={v => update({ region: v })}/>}<MovementFilter title="Estado" options={states} selected={selectedStates} onChange={v => update({ estado: v, verificado: null })}/>
<MovementPeriod query={query} onChange={update}/>{reasons.length > 0 && <MovementFilter title="Motivo informado" options={reasons} selected={query.reasons} onChange={v => update({ motivo: v })}/>}</div>
<div className={styles.activeFilters}>{query.q && <button onClick={() => update({ q: null })}>Búsqueda: {query.q} ×</button>}{chips.map(c => <button key={c.key + c.value} onClick={() => c.key === 'institucion' ? update({ institucion: query.institutions.filter(v => v !== c.value), ministerio: null }) : update({ [c.key]: new URLSearchParams(params.toString()).getAll(c.key).filter(v => v !== c.value), ...(c.key === 'estado' ? { verificado: null } : {}) })}>{c.label} ×</button>)}{(query.month || query.from || query.to) && <button onClick={() => update({ mes: null, desde: null, hasta: null })}>{query.month || `${query.from || 'Inicio'} → ${query.to || 'Actualidad'}`} ×</button>}{query.basis !== 'registro' && <button onClick={() => update({ fecha: null })}>{MOVEMENT_DATE_LABEL[query.basis]} ×</button>}{(chips.length || query.q || query.month || query.from || query.to || query.basis !== 'registro') ? <button className={styles.linkButton} onClick={reset}>Restablecer filtros</button> : null}</div>
<div className={styles.toolbar}>
<div className={styles.views} role="group" aria-label="Vista del registro">
<button aria-pressed={query.view === 'registro'} onClick={() => update({ vista: 'tabla' })}>Registro completo</button>
<button aria-pressed={query.view === 'cronologia'} onClick={() => update({ vista: 'cronologia' })}>Cronología</button>
</div>
<label>Orden<select value={query.sort} onChange={e => update({ orden: e.target.value })}>
<option value="reciente">Más recientes primero</option>
<option value="antiguo">Más antiguos primero</option>
{query.view==='registro'&&<option value="nombre">Nombre A–Z</option>}
</select>
</label>
</div>
<div className={styles.resultHeading}>
<h2>{query.view === 'cronologia' ? 'Cronología' : 'Registro de movimientos'}</h2>
<p role="status">{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}{filtered.length > 0 ? ` · ${((page.page - 1) * 20) + 1}–${Math.min(page.page * 20, filtered.length)}` : ''}</p>
</div>{query.from && query.to && query.from > query.to && <p role="alert" className={styles.empty}>La fecha Desde debe ser anterior o igual a Hasta.</p>}{query.view === 'registro' ? <table className={styles.table} role="table">
<caption className={styles.srOnly}>Movimientos y anuncios documentados de la selección</caption>
<thead>
<tr>
<th scope="col">Fecha</th>
<th scope="col">Persona</th>
<th scope="col">Movimiento</th>
<th scope="col">Cargo / institución</th>
<th scope="col">Estado</th>
<th scope="col">
<span className={styles.srOnly}>Detalle</span>
</th>
</tr>
</thead>
<tbody>{page.rows.map(e => <tr key={e.id} data-movement-id={e.id}>
<td className={styles.dateCell}>
<MovementDate entry={e} basis={query.basis}/>
</td>
<td className={styles.personCell}>
<MovementIdentity entry={e}/>
</td>
<td className={styles.typeCell}>{e.kind === 'signal' && <small>Anuncio</small>}{e.typeLabel}</td>
<td className={styles.contextCell}>
<MovementContext entry={e}/>
</td>
<td className={styles.stateCell}>
<MovementState entry={e}/>
</td>
<td className={styles.actionCell}>
<button onClick={() => select(e.id)} aria-label={'Ver detalle de ' + (e.name ?? e.id)}>Ver <span aria-hidden="true">→</span>
</button>
</td>
</tr>)}</tbody>
</table> : <div className={styles.chronology}>{[...groups].map(([month, rows]) => <section key={month}>
<h3>{movementMonthLabel(month)}</h3>
<ol>{rows.map(e => <li key={e.id} data-movement-id={e.id}>
<div className={styles.chronoDate}>
<MovementDate entry={e} basis={query.basis}/>
</div>
<div>
<MovementIdentity entry={e}/>
<p>{e.role} · {e.institution}</p>
<small>{e.kind === 'signal' ? 'Anuncio · ' : ''}{e.typeLabel}</small>
</div>
<MovementState entry={e}/>
<button onClick={() => select(e.id)} aria-label={'Ver detalle de ' + (e.name ?? e.id)}>Ver →</button>
</li>)}</ol>
</section>)}</div>}{!filtered.length && <div className={styles.empty}>
<h3>No encontramos registros con esta selección</h3>
<p>Prueba otro nombre o amplía los filtros y el período.</p>
<button onClick={reset}>Restablecer filtros</button>
</div>}{page.pages > 1 && <nav className={styles.pagination} aria-label="Páginas de movimientos">
<button disabled={page.page === 1} onClick={() => update({ pagina: String(page.page - 1) }, true)}>Anterior</button>
<span>Página {page.page} de {page.pages}</span>
<button disabled={page.page === page.pages} onClick={() => update({ pagina: String(page.page + 1) }, true)}>Siguiente</button>
</nav>}<footer className={styles.registerFooter}>
<p>Un anuncio no acredita una salida efectiva. El estado y las fechas se conservan por caso.</p>
<button className={styles.linkButton} onClick={copyLink}>Copiar enlace</button>
<span role="status">{copy}</span>
</footer>{selectedId && !selected && <p role="alert">El registro solicitado no está en este corte. Los demás resultados siguen disponibles.</p>}<VotingPanel open={!!selected || sources} title={selected ? 'Detalle del movimiento' : 'Fuentes y alcance'} onClose={() => { setSources(false); update({ movimiento: null }, true); }}>{selected ? <MovementDetail key={selected.id} entry={selected} previous={selectedIndex > 0 ? filtered[selectedIndex - 1] : undefined} next={selectedIndex >= 0 ? filtered[selectedIndex + 1] : undefined} onSelect={select}/> : sources ? <MovementSources metadata={metadata}/> : null}</VotingPanel>
</div>;
}
