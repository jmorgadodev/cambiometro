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
