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

## Transparencia Activa CPLT

La fuente tiene un camino distinto al de `api/v1/records`: su proyección de
funcionarios se publica en:

`projections/funcionarios-v1/manifest.json`

La revisión de producción y R2 del 12 de septiembre observó:

| Capa | Filas | Corte/versión | Estado |
|---|---:|---|---|
| Resumen productivo `/api/v1/sources` | 1.226.913 | 2026-09-02 03:28:30 UTC | metadato, parcial |
| Manifiesto R2 productivo | 1.226.913 | `2026-09-02T03-28-30-598Z` | publicado |
| Proyección local `data/lake-cplt` | 1.220.960 | 2026-08-30 08:05:27 UTC | anterior |
| `data-quality-sources.json` local | 1.203.287 | conteo canónico antiguo | anterior |
| Auditoría local del snapshot | 1.220.960 | 2026-09-06 | observación, no release |

La diferencia entre el manifiesto R2 y la proyección local es de **5.953
filas** (0,49 %). La diferencia entre R2 y el conteo canónico local es de
**23.626 filas** (1,92 %). No es correcto utilizar cualquiera de los dos
conteos locales para describir la cobertura vigente.

La consulta productiva específica de funcionarios sí funciona desde R2:

`/api/v1/funcionarios?q=torrealba&limit=3` respondió `sourceStatus=r2-search`,
`totalHeadcount=1.226.913` y resultados paginados. En cambio,
`/api/v1/records?source=cplt` devuelve `temporarily-unavailable` porque esa
ruta consulta el lake de registros genéricos, no la proyección de nóminas CPLT;
no debe usarse como prueba de que la nómina de funcionarios esté caída.

La proyección local ocupa aproximadamente **4.085 MiB** y contiene 1.774
archivos. Esto confirma que no conviene tratarla como copia operativa
permanente: producción/R2 debe ser la referencia y local debe hidratar sólo el
release necesario para probar. Antes de eliminar ese material local se debe
verificar que el build pueda hidratar el mismo manifiesto R2 y conservar un
respaldo fuera de `Proyectos`.

Observaciones de calidad del último snapshot local (no deben presentarse como
conteo del release R2): 156.507 filas con bruto positivo y líquido cero,
9.649 con líquido mayor que bruto, 314.945 sin fecha de término, 656 cargos
con signo inicial y 30 nombres con prefijos aislados. Los valores originales
deben conservarse; la normalización sólo puede aplicarse para lectura y debe
quedar auditada.

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
6. CPLT debe consumirse mediante su manifiesto/proyección R2, no mediante
   `api/v1/records` ni D1. El conteo vigente es 1.226.913 hasta que otro
   manifiesto productivo lo reemplace.

**Estado:** auditoría completada; implementación de índices y vistas derivadas
pendiente.

## Revalidación productiva — 09:45 UTC-3

Se repitieron las consultas contra producción y los manifiestos R2 sin leer ni
escribir D1:

| Fuente | Resumen `/api/v1/sources` | Consulta paginada | Resultado |
|---|---:|---:|---|
| ChileCompra | 74.142 | 74.142 | R2, completo |
| InfoLobby | 60.615 | 60.523 | R2, discrepancia de índice de 92 |
| DIPRES | 247.287 | 247.287 | R2, parcial por alcance de particiones verificadas |

El catálogo R2 vigente suma correctamente 60.615 filas de InfoLobby en ocho
particiones mensuales, pero `indexes/v1/infolobby/manifest.json` y la consulta
pública siguen declarando 60.523. La interfaz no debe presentar ambas cifras
como si fueran la misma métrica; la corrección debe reconciliar el índice con
el catálogo antes de declarar completitud.

El catálogo R2 vigente suma 247.287 filas DIPRES en 18 particiones, mientras
que el release caliente sólo expone la partición de junio de 2026 como
consulta verificable. Por tanto, el estado `partial` es correcto y el número
247.287 sólo puede mostrarse como universo catalogado, no como filas
inmediatamente descargables.

## Reconciliación InfoLobby — 09:58 UTC-3

La diferencia de 92 filas quedó aislada sin modificar R2, D1 ni el código
productivo:

- El catálogo `catalog/v1/manifest.json` registra la partición
  `infolobby/2026/08` con 92 filas, release
  `data-infolobby-2026-680f61c72bfcf3c8` y checksum
  `aa735e90ce646472c0c8e2ebdfb5eb46afd76d7ac1b78ec86d12373b2cbc1278`.
- El índice público `indexes/v1/infolobby/manifest.json` sólo suma las
  particiones enero–julio y declara 60.523 filas.
- La descarga remota de
  `partitions/infolobby/2026/08/manifest.json` respondió `The specified key
  does not exist`; el archivo local de comprobación quedó vacío (0 bytes).
- El releaseTag no existe como GitHub Release ni como tag remoto recuperable
  en el repositorio auditado, y no hay una partición local operativa que
  contenga esas 92 filas.

Conclusión: las 92 filas están catalogadas como una expectativa histórica,
pero no existe evidencia del artefacto publicado que permita reconstruirlas.
No se deben inventar, completar desde D1 ni marcar como consultables. Hasta
que el ETL obtenga nuevamente el período agosto y publique sus objetos con
checksum verificable, el alcance honesto de InfoLobby es **60.523 filas
consultables, más 92 filas catalogadas pendientes de recuperación**. El
estado debe continuar `partial`.

Acción segura pendiente: recuperar agosto mediante una ejecución controlada
del ETL de InfoLobby, validar conteo/checksum y sólo después regenerar el
índice y publicar el release. Si la fuente no entrega esas 92 filas, debe
corregirse el catálogo para dejar de prometerlas, mediante un cambio de
release auditado; ninguna de esas acciones se ejecutó en esta revisión.

La fuente oficial sí está disponible para una recuperación controlada: el
catálogo `VirtuosoLobby/trimestres` respondió HTTP 200 y declara el tercer
trimestre de 2026 (julio–septiembre); los endpoints CSV de `audiencias`,
`viajes` y `donativos` para 2026/Q3 también respondieron HTTP 200. Esto no
autoriza todavía una publicación: primero debe ejecutarse el ETL aislado de
InfoLobby, comparar sus IDs con los 60.523 consultables, verificar si las 92
filas reaparecen y conservar los checksums de cada dataset original.

## Prueba incremental sin escritura — 07:04 UTC-3

Se ejecutó únicamente:

```text
node scripts/etl.mjs --source infolobby --from 2026-08-01 --to 2026-08-31 --dry-run
```

Resultado: **10.944 registros de lobby, 0 errores, 0 archivos escritos**.
Tampoco se consultó D1 ni se publicó R2. Por tanto, las 92 filas del catálogo
no son el universo de agosto; corresponden a un release o partición incompleta
que quedó catalogada. La fuente oficial entrega un volumen sustancialmente
mayor y puede recuperarse.

La corrección requiere una ejecución de publicación aislada de InfoLobby que
genere el manifiesto, partición e índice desde esta fuente, compare IDs contra
el release anterior y conserve los objetos válidos de enero–julio. Hasta
completar esa validación, producción debe seguir declarando el alcance actual
como parcial y no mezclar 10.944 filas nuevas con el índice público existente.

La comprobación en memoria confirmó además:

- 10.944 registros proyectados;
- 10.944 IDs únicos;
- rango de fechas 2026-08-01 a 2026-08-31;
- checksum del paquete trimestral descargado:
  `a6a974a53869816782fcd3b3abac4a2085e0cc4c25d922f50a291ea1aff5a2c4`;
- la descarga de los nueve datasets auxiliares terminó sin errores.

Esto permite preparar un release aislado reproducible, pero todavía no lo
publica ni reemplaza el índice vigente.
