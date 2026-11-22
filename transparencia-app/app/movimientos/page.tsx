import { Suspense } from 'react';
import { MOVIMIENTOS, MOVIMIENTOS_PIPELINE_METADATA, MOVIMIENTOS_PUBLICATION_BLOCKED } from '@/lib/movimientos';
import { buildMovementRegister } from '@/lib/movement-register-source';
import MovementRegister from '@/components/movimientos/MovementRegister';
import styles from '@/components/movimientos/Movements.module.css';
export default function MovimientosPage() {
    if (MOVIMIENTOS_PUBLICATION_BLOCKED)
        return <section className={'container-main ' + styles.page}>
<header className={styles.header}>
<p className={styles.eyebrow}>Consulta documental</p>
<h1>Movimientos de autoridades</h1>
<h2>Validación documental en curso</h2>
<p>El registro volverá a estar disponible cuando el corte quede validado.</p>
</header>
</section>;
    const entries = buildMovementRegister(MOVIMIENTOS, MOVIMIENTOS_PIPELINE_METADATA.signals);
    const description = 'Consulta movimientos documentados y anuncios en confirmación, con sus fuentes públicas.';
    return <section className={'container-main ' + styles.page}>
<header className={styles.header}>
<p className={styles.eyebrow}>Autoridades · Registro público</p>
<h1>Movimientos de autoridades</h1>
<p>{description}</p>
</header>
<Suspense fallback={<p role="status">Preparando el registro de movimientos…</p>}>
<MovementRegister entries={entries} metadata={{ lastSuccess: MOVIMIENTOS_PIPELINE_METADATA.last_success_at ?? MOVIMIENTOS_PIPELINE_METADATA.last_run, lastAttempt: MOVIMIENTOS_PIPELINE_METADATA.last_attempt_at ?? null, frequency: MOVIMIENTOS_PIPELINE_METADATA.frecuencia }}/>
</Suspense>
</section>;
}
