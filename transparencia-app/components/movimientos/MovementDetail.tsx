"use client";
import { useEffect, useRef } from 'react';
import { formatMovementDate, MOVEMENT_SOURCE_LABEL, type MovementEntry } from '@/lib/movement-register';
import { MovementState } from './MovementPrimitives';
import styles from './Movements.module.css';
function timestamp(value: string | null) { if (!value || !Number.isFinite(Date.parse(value)))
    return 'No informada'; return new Date(value).toLocaleString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' }); }
export default function MovementDetail({ entry, previous, next, onSelect }: {
    entry: MovementEntry;
    previous: MovementEntry | undefined;
    next: MovementEntry | undefined;
    onSelect: (id: string) => void;
}) {
    const heading = useRef<HTMLHeadingElement>(null);
    useEffect(() => { heading.current?.closest('dialog')?.scrollTo({ top: 0 }); heading.current?.focus({ preventScroll: true }); }, [entry.id]);
    return <article className={styles.detail}>
<p className={styles.eyebrow}>{entry.kind === 'signal' && entry.status==='pending' ? 'Anuncio documentado' : entry.typeLabel}</p>
<h2 ref={heading} tabIndex={-1}>{entry.name ?? 'Persona no identificada'}</h2>
<p className={styles.role}>{entry.role}<br />
<span>{entry.institution}{entry.region ? ' · ' + entry.region : ''}</span>
</p>
<div className={styles.detailState}>
<span>{entry.typeLabel}</span>
<MovementState entry={entry}/>
</div>
<section>
<h3>Qué se informó</h3>
<p>{entry.summary || 'El registro no incorpora una descripción adicional.'}</p>{entry.sources[0] && <p className={styles.meta}>Según {entry.sources[0].label}. {entry.status === 'pending' ? 'El anuncio no acredita por sí solo una salida efectiva.' : entry.pendingDocument ? 'El acto administrativo individualizado permanece pendiente.' : ''}</p>}{entry.review && <aside className={styles.review}>
<h3>Fecha en revisión</h3>
<p>{entry.review}</p>
</aside>}</section>
<section>
<h3>Fechas y antecedentes</h3>
<dl className={styles.facts}>
<div>
<dt>{entry.review ? 'Fecha original del registro (en revisión)' : 'Fecha del registro'}</dt>
<dd>{formatMovementDate(entry.originalDate)}</dd>
</div>
<div>
<dt>Primera publicación incorporada</dt>
<dd>{formatMovementDate(entry.publishedDate)}</dd>
</div>
<div>
<dt>{entry.effectiveDateOfficial?'Fecha efectiva según acto oficial':entry.kind === 'signal' ? 'Fecha efectiva reportada' : 'Fecha efectiva informada'}</dt>
<dd>{entry.effectiveDate ? formatMovementDate(entry.effectiveDate) : 'No acreditada en esta vista'}</dd>
</div>{entry.otherName && <div>
<dt>{entry.otherNameIsIncoming?'Autoridad posterior informada:':'Autoridad anterior informada:'}</dt>
<dd>{entry.otherName}{(entry.otherNameIsIncoming?entry.incomingDate:entry.outgoingDate)&&<small>{entry.otherNameIsIncoming?'Incorporación informada: ':'Salida informada: '}{formatMovementDate(entry.otherNameIsIncoming?entry.incomingDate:entry.outgoingDate)}</small>}</dd>
</div>}{entry.outgoingDate && entry.outgoingDate !== entry.effectiveDate && <div>
<dt>Salida informada</dt>
<dd>{formatMovementDate(entry.outgoingDate)}</dd>
</div>}</dl>
</section>
<section>
<h3>Fuentes del caso</h3>
<ul className={styles.sources}>{entry.sources.map((s, i) => <li key={s.url ?? i}>
<p className={styles.sourceKind}>{MOVEMENT_SOURCE_LABEL[s.kind]}{s.date ? ' · ' + formatMovementDate(s.date) : ''}</p>
<strong>{s.label}</strong>
<p>{s.title}</p>{s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer">Abrir respaldo ↗<span className={styles.srOnly}>: {s.label}</span>
</a> : <span className={styles.meta}>Enlace no disponible en el registro</span>}</li>)}</ul>{!entry.sources.length && <p>No hay un respaldo enlazado en este registro.</p>}{entry.reviewUrl && <p>
<a href={entry.reviewUrl} target="_blank" rel="noopener noreferrer">Fuente de la revisión de fechas ↗</a>
</p>}</section>
<details className={styles.history}>
<summary>Historial disponible y estado original</summary>
<dl className={styles.facts}>
<div>
<dt>Incorporación al sistema</dt>
<dd>{timestamp(entry.detectedAt)}</dd>
</div>{entry.lastSeenAt && <div>
<dt>Última observación registrada</dt>
<dd>{timestamp(entry.lastSeenAt)}</dd>
</div>}{entry.reviewedAt && <div>
<dt>Revisión registrada</dt>
<dd>{timestamp(entry.reviewedAt)}</dd>
</div>}{entry.evidenceReview&&<div><dt>Revisión del respaldo</dt><dd>{entry.evidenceReview}</dd></div>}<div>
<dt>Estado original del catálogo</dt>
<dd>{entry.originalStatus}</dd>
</div>
<div>
<dt>Identificador original</dt>
<dd>{entry.id}</dd>
</div>
</dl>
<p className={styles.meta}>Se muestran únicamente los hitos disponibles; las fuentes relacionadas no acreditan por sí solas un cambio de estado.</p>
</details>
<nav className={styles.recordNavigation} aria-label="Otros registros de la selección">
<button disabled={!previous} onClick={() => previous && onSelect(previous.id)}>← Anterior</button>
<button disabled={!next} onClick={() => next && onSelect(next.id)}>Siguiente →</button>
</nav>
</article>;
}
