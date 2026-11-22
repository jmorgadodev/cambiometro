import { formatMovementDate, movementDate, MOVEMENT_STATUS_LABEL, type MovementEntry, type MovementDateBasis } from '@/lib/movement-register';
import styles from './Movements.module.css';
export function MovementState({ entry }: {
    entry: MovementEntry;
}) { return <span className={styles.state} data-state={entry.status}>{MOVEMENT_STATUS_LABEL[entry.status]}</span>; }
export function MovementDate({ entry, basis }: {
    entry: MovementEntry;
    basis: MovementDateBasis;
}) { const date = movementDate(entry, basis); return <>
<time dateTime={date ?? undefined}>{formatMovementDate(date)}</time>
<small>{basis === 'registro' ? entry.dateLabel : basis === 'publicacion' ? 'Publicación' : entry.kind === 'signal' ? 'Efectiva reportada' : 'Efectiva informada'}{entry.review && basis !== 'registro' ? ' · hecho en revisión' : ''}</small>
</>; }
export function MovementIdentity({ entry }: {
    entry: MovementEntry;
}) { return <>
<strong>{entry.name ?? 'Persona no identificada'}</strong>{!entry.name && <small className={styles.excerpt}>{entry.summary}</small>}</>; }
export function MovementContext({ entry }: {
    entry: MovementEntry;
}) { return <>
<span>{entry.role || 'Cargo no informado'}</span>
<small>{entry.institution}{entry.region && entry.region !== 'Nacional' ? ' · ' + entry.region : ''}</small>
</>; }
