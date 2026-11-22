import Link from 'next/link';
import { formatMovementDate } from '@/lib/movement-register';
import styles from './Movements.module.css';
export type MovementMetadata = {
    lastSuccess: string | null;
    lastAttempt: string | null;
    frequency: string;
};
export default function MovementSources({ metadata }: {
    metadata: MovementMetadata;
}) { return <article className={styles.detail}>
<p className={styles.eyebrow}>Cómo leer este registro</p>
<h2>Fuentes y alcance</h2>
<p>El catálogo reúne movimientos de autoridades y anuncios documentados. No representa todos los cambios de cargos del país.</p>
<section>
<h3>Estado documental</h3>
<dl className={styles.definitions}>
<div>
<dt>Documento oficial verificado</dt>
<dd>Estado verificado y referencia a un acto individualizado, con revisión fechada. Una noticia o un directorio no equivalen a ese acto.</dd>
</div>
<div>
<dt>Respaldo institucional</dt>
<dd>El catálogo registra verificación y respaldo de una institución. Sin acto individualizado disponible, no se suma a las confirmaciones documentales oficiales.</dd>
</div>
<div>
<dt>Corroborado públicamente</dt>
<dd>Información respaldada por fuentes públicas identificadas, incluida la prensa. Puede seguir pendiente el documento administrativo.</dd>
</div>
<div>
<dt>En confirmación o detectado</dt>
<dd>Información preliminar o un anuncio. No acredita que una renuncia o un nombramiento se haya hecho efectivo.</dd>
</div>
</dl>
</section>
<section>
<h3>Las fechas se consultan por separado</h3>
<p>La fecha del registro conserva la referencia publicada. Para anuncios, se identifica como publicación o fecha efectiva reportada. En los casos con una fecha cuestionada se utiliza la publicación del respaldo y se señala la revisión.</p>
<p>El filtro permite consultar la fecha del registro, la primera publicación incorporada o la fecha efectiva informada. Una fecha de publicación no se convierte en fecha efectiva. Los registros sin una fecha para el criterio elegido siguen disponibles al consultar todos los períodos.</p>
</section>
<section>
<h3>Casos y fuentes relacionadas</h3>
<p>Un registro conserva su ID y los respaldos que el sistema ya relaciona con él. No se fusionan hechos por similitud de nombres. Una persona puede tener varios movimientos distintos.</p>
<p>El buscador consulta persona, cargo, institución, región, descripción e identificadores disponibles. Los filtros son locales; no generan una extracción ni una consulta adicional por interacción.</p>
</section>
<section aria-labelledby="freshness-heading">
<h3 id="freshness-heading">Estado de actualización</h3>
<dl className={styles.facts}>
<div>
<dt>Última actualización del catálogo</dt>
<dd>{formatMovementDate(metadata.lastSuccess)}</dd>
</div>
<div>
<dt>Último intento registrado</dt>
<dd>{formatMovementDate(metadata.lastAttempt)}</dd>
</div>
</dl>
<p>{metadata.frequency}</p>
<p className={styles.meta}>Estas fechas pertenecen al corte publicado. No son la fecha del movimiento ni certifican por sí solas que todas las fuentes estén disponibles.</p>
</section>
<p>
<Link href="/metodologia/">Metodología general →</Link>
</p>
</article>; }
