# Auditoría R2 de ChileCompra, InfoLobby y DIPRES — 12 de septiembre de 2026

## Alcance

Inspección de sólo lectura de los objetos productivos del bucket
`transparencia-public-data`. No se leyó ni escribió D1, no se modificaron
objetos y no se ejecutó ETL.

## ChileCompra

El índice público vigente es:

`indexes/v1/chilecompra/manifest.json`

Sus datos declaran:

- `totalRows`: **74.142**;
- `pageSize`: 50;
- archivo de registros: `indexes/v1/chilecompra/records.jsonl`;
- índice de búsqueda: `indexes/v1/chilecompra/search.json`;
- una sola partición publicada: `partitions/chilecompra/2026/06/`.

No se encontró en R2 una partición pública que contenga el histórico de
888.693 registros mencionado en los manifiestos locales. Por tanto, ese número
no puede mostrarse hoy como histórico consultable en producción. La interfaz
debe seguir diferenciando:

| Alcance | Estado |
|---|---|
| Corte público consultable | 74.142, junio de 2026 |
| Histórico local observado | 888.693 |
| Histórico público en R2 | No acreditado |

La mejora de ChileCompra requiere publicar el histórico en particiones R2
versionadas o retirar esa cifra de la experiencia pública hasta que exista un
manifiesto verificable.

La API productiva confirmó `sourceBackend=r2-lake`, `sourceStatus=complete`,
`publishedRows=74.142` y `expectedRows=74.142`.

## InfoLobby

El índice público vigente es:

`indexes/v1/infolobby/manifest.json`

Declara **60.523** filas, paginadas en bloques de 50, con archivos de archivo,
búsqueda y conteos de búsqueda. Las particiones mensuales publicadas son
enero a julio de 2026 y sus manifiestos suman **60.615** filas:

| Mes | Filas |
|---|---:|
| 2026-01 | 12.102 |
| 2026-02 | 8.081 |
| 2026-03 | 11.867 |
| 2026-04 | 6.184 |
| 2026-05 | 5.770 |
| 2026-06 | 5.870 |
| 2026-07 | 10.649 |
| **Total de particiones** | **60.615** |

La diferencia de **92** filas entre el índice público y las particiones debe
reconciliarse antes de mostrar “universo completo”. Es una diferencia de
release/alcance, no evidencia suficiente para eliminar registros.

La cobertura temporal sí es recorrible por particiones mensuales; el siguiente
trabajo debe hacer que índice, paginación y resumen usen el mismo manifiesto.

La API productiva confirma `sourceBackend=r2-lake`, `sourceStatus=complete` y
`total=60.523`. El offset final expuso un error adicional de paginación: el
último bloque devolvía cero filas aunque el total lo incluía. Ese defecto quedó
corregido localmente en `cambiometro-public` y está documentado por separado;
requiere preview antes de llegar a producción.

## DIPRES

Se observaron dos alcances distintos:

- `partitions/dipres/2026/06/manifest.json`: **15.689** registros de la
  partición presupuestaria de junio de 2026;
- `source-health.json`: **247.287** registros para DIPRES;
- objetos derivados `entities/v1` e `indexes/v1` asociados a DIPRES, pero sin
  un manifiesto público de paginación equivalente al de ChileCompra o
  InfoLobby.

El conteo 247.287 no debe presentarse como si fuera el conteo de la partición
presupuestaria de 15.689. Hasta definir el contrato, DIPRES debe permanecer
como datos agregados de presupuesto/ejecución, no como un buscador de pagos
individuales.

La API productiva informa `total=247.287`, `publishedRows=15.689`,
`expectedRows=247.287` y `sourceStatus=partial`. El catálogo R2 contiene 18
particiones históricas (2021 y 2026) que suman 247.287, pero sólo la partición
2026-06 está disponible en el bucket caliente; las demás dependen del fallback
archivado. Una consulta acotada a 2021-01 devolvió `missingPartitions=1` y cero
filas, por lo que no debe presentarse el histórico como completamente
consultable hasta recuperar/publicar esas particiones.

Una consulta nacional con `offset=15689` confirmó que el API devuelve cero
filas y marca `missingPartitions=17`; el usuario no debe recibir un paginador
que prometa 247.287 filas cuando sólo hay 15.689 disponibles en el release
caliente. La UI debe presentar “15.689 publicados; 231.598 pendientes de
publicación” o limitar la paginación al alcance publicado.

## Decisiones

1. Producción sólo puede declarar como consultable aquello que tenga un
   manifiesto R2 verificable.
2. ChileCompra queda con corte público 74.142; el histórico 888.693 queda
   pendiente de publicación real.
3. InfoLobby requiere reconciliar 60.523 frente a 60.615 antes de declarar
   completitud.
4. DIPRES debe separar partición fuente, índice derivado y contexto agregado.
5. Ninguna de estas discrepancias se resolverá usando D1 ni mezclando datos
   locales con producción.

**Estado:** auditoría completada; implementación de índices y vistas derivadas
pendiente.
