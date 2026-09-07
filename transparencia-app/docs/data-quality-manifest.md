# Manifiesto público de calidad y cobertura

El build genera `data/generated/data-quality-summary.json` y copia el mismo
contenido a `public/data/data-quality-summary.json`. Las páginas `/`,
`/fuentes`, `/datos/calidad`, `/como-funciona` y `/cruces` usan este manifiesto
para no mantener conteos de fuentes en varios componentes.

## Qué significa cada métrica

- **Publicado:** registros canónicos del release frente al universo histórico
  consolidado.
- **Consultable:** registros cuyo release tiene una ruta o índice paginado
  comprobado. No significa que el navegador descargue el universo completo.
- **Relacionado:** registros que participan en relaciones documentales con
  evidencia. Si no existe un índice por fuente que permita demostrarlo, se
  muestra `No calculable`.

Cuando el denominador no está disponible o no existe evidencia suficiente, el
build publica `count: null`, `percent: null` y la etiqueta `No calculable`.
Nunca se estima una cobertura a partir de una muestra.

## Conteos globales y por fuente

El campo `totalCanonicalRecords` suma los releases por fuente. El campo
`globalKpiRecords` conserva el corte canónico global usado por los KPIs de la
plataforma. No se deben sumar entre sí: una misma entidad o registro puede
participar en más de una fuente y módulo. La interfaz muestra esta diferencia
explícitamente para evitar una falsa precisión.

## Trazabilidad

Cada fila conserva organismo, URL oficial, período, cadencia, última
publicación, checksum cuando el catálogo lo entrega, estado del release y
módulo de exploración. Las observaciones de calidad se expresan como
“observaciones de la fuente”: se conserva el valor original y no se recalculan
montos, fechas o nombres de forma silenciosa.

El guard `npm run check:data-quality-summary` comprueba que el artefacto público
sea idéntico al generado, que no existan fuentes duplicadas, que los
porcentajes estén entre 0 y 100 y que las métricas no calculables permanezcan
explícitamente nulas.
