# Cierre individual de ETL

## Actualización acotada del 7 de octubre de 2026

Complementa, no reemplaza, la evidencia histórica del 5 de octubre. Sólo
metadatos Actions y configuración de los flujos existentes; cero ingestas,
escrituras R2 o consultas D1. El registro de procedencia sigue en
[source-registry.md](source-registry.md), con sus fechas de corte originales.
Un resultado verde de Actions no demuestra actualización ni cobertura.

| Flujo | Última ejecución pertinente observada | Ventana configurada / resultado real |
| --- | --- | --- |
| Cámara | 37473771087, 6 oct, schedule, success | Tres días UTC hasta hoy; extracción incremental y recuperación de historia publicada |
| Votaciones Cámara | 37476518739, 6 oct, schedule, success | Siete días UTC hasta hoy; rango manual opcional |
| Apoyo Cámara | 37333599905, 5 oct, schedule, failure | Recupera baseline: 1.084 filas Cámara y 3.407 Senado, SHA `dc0e43f3218d38dded54229e614035574301156c43dd3150984c10b748edac5d`; origen bloqueado en diputado 1009; ambas publicaciones skipped |
| Apoyo Senado | 37339561783, 5 oct, schedule, success | Respuesta por oficina con año/mes de origen; no se inventa rango mensual ni cobertura anual por ser semanal |
| Movimientos | 37473396433, 6 oct, schedule, success | Recupera baseline, revisa novedades/pendientes y resume; no-op no crea release nuevo |
| InfoLobby | 37347406257, 5 oct, schedule, success | Ocho días UTC hasta hoy; entrada estática skipped, no acredita corte nuevo. Push 37566114083 sólo valida workflow |
| Contraloría | 37025325935, 2 oct, schedule, failure | Año solicitado, por defecto actual; listado oficial mediante navegador y documentos, no sólo API. Ingesta incompleta; publicación/confirmación skipped |
| CPLT | 37351220112, 5 oct, schedule, failure | Frescura cancelada, cuatro categorías y consolidación/publicación skipped. Logs de job no disponibles; causa de cancelación no determinada |
| Ley 19.862 | 37108164915, 3 oct, manual, success | Verify-only. Ejecución normal por año/mes; el replay verificado no acredita nueva extracción |
| InfoProbidad | 37106727934, 3 oct, manual, success | Verify-only; extracción normal de treinta días UTC, rango manual opcional |
| DIPRES | 37085144507, 3 oct, manual, success | Verify-only; año actual por defecto, calendario trimestral |
| SINIM | 37062175649, 2 oct, manual, success | Verify-only; año anterior por defecto, calendario semestral |
| Gastos Senado | 37044606324, 2 oct, manual, success | Ventana normal de sesenta días, baseline histórico obligatorio; full-history sólo manual |
| 38 bis | 37362307722, 5 oct, schedule, failure | Job cancelado, logs no disponibles; no se acredita extracción ni publicación. El no-op 37086353257 sigue siendo evidencia anterior, no estado actual |
| SERVEL | 32853028527, 25 ago, manual, success | Resultados configurados en conector; sin calendario remoto nuevo ni rango inferido |
| Reconciliación Cámara | 34608470964, 11 sep, manual, success | Rango explícito validado, full-history manual; no relanzado |
| CPLT central | 35056072805, 16 sep, manual, cancelled | Cuatro categorías; publish false por defecto, finalización exige éxito de todas; no se acredita publicación |
| Votaciones Senado | Local-only | Sin workflow remoto; ventana y ejecución se registran con la tarea local, no como cron sano |

Procedencia efectiva: las URLs ya registradas siguen vinculadas a cada
conector. Para Contraloría, el flujo vigente usa además
`scripts/ingest-contraloria.mjs` y el portal oficial
`https://www.contraloria.cl/SicaProd/SICAv3-BIFAPortalCGR/faces/newRegionesPrincipal`;
no se presenta el endpoint del catálogo como único origen de la ingesta.
El fallo ocurre antes de los comandos de publicación, igual que en apoyo
Cámara. En CPLT la consolidación no corrió; en 38 bis no hay logs disponibles
para atribuir causa. Ninguno de estos resultados permite anunciar nuevos
datos o certificar por sí solo conservación/coherencia de todos los objetos.

Pendientes ligados a O11/O13: recuperación del origen Cámara, determinar
cancelaciones CPLT/38 bis y validar sus siguientes candidatos con las guardas
existentes. No se cambian conectores ni cron, ni se desactivan guardas ni se
despachan cargas para cerrar esta actualización documental. ChileCompra
continúa al final. LM06 documental no equivale al cierre operativo de cada ETL.

## Comprobación operativa del 5 de octubre de 2026

Consulta de metadatos Actions, sin ejecutar ingestas ni consultar D1. La última ejecución no equivale al último corte publicado:

| Flujo | Última ejecución observada | Resultado y alcance comprobado |
| --- | --- | --- |
| Cámara | 37203950593, 4 oct, schedule | success; publicación/conteos aún por cotejar |
| Votaciones Cámara | 37204638954, 4 oct, schedule | success; publicación/conteos aún por cotejar |
| Movimientos | 37203847565, 4 oct, schedule | Recupera release, revisa novedades y resume; publicación omitida (no se acredita un release nuevo) |
| Apoyo Cámara | 36959078144, 2 oct, manual | success de workflow; no acredita recuperación del bloqueo externo |
| Apoyo Senado | 37048541225, 2 oct, manual | success; cierre anterior conserva su alcance documentado |
| InfoLobby | 37272047367, 5 oct, push | Sólo validación de workflow; ingesta omitida, no es actualización de datos |
| Contraloría | 37025325935, 2 oct, schedule | failure: espera del navegador agotada tras 9/27 áreas centrales; candidato incompleto, no anunciar actualización |
| CPLT | 37118857265, 3 oct, manual | check-sources-only; sin extracción |
| Ley 19.862 | 37108164915, 3 oct, manual | verify-only; sin extracción |
| InfoProbidad | 37106727934, 3 oct, manual | verify-only; sin extracción |
| DIPRES | 37085144507, 3 oct, manual | verify-only; sin extracción |
| SINIM | 37062175649, 2 oct, manual | verify-only; sin extracción |
| Gastos Senado | 37044606324, 2 oct, manual | success; alcance del replay documentado abajo |
| 38 bis | 37086353257, 3 oct, manual | no-op comprobado previamente; sin release nuevo |
| SERVEL | 32853028527, 25 ago, manual | success; no actualización automática posterior acreditada |
| Reconciliación Cámara | 34608470964, 11 sep, manual | success; no corte posterior acreditado |
| CPLT central | 35056072805, 16 sep, manual | cancelled; no acredita publicación |

ChileCompra excluido de este lote por prioridad explícita. Senado votaciones sigue local-only. Esta tabla es evidencia de operación observada, no certificación de datos, costes ni cobertura completa. Contraloría requiere comprobar preservación del release anterior antes de cerrar LM06; no se relanza el conector ni se amplía su recuperación en este lote.

Actualizado: 2026-10-03. Inventario preliminar obtenido del
[`etl-calendar.json`](../../.github/etl-calendar.json). El calendario prueba
intención de ejecución, **no** procedencia efectiva ni funcionamiento. Los
endpoints, documentos y destinos R2 se registrarán desde cada conector y su
última ejecución comprobada; no se completan por el nombre de la fuente.

Un ETL tiene cuatro puertas (25 % cada una):

1. Fuente efectiva: URL/API/documento, organismo, modalidad, ventana,
   identidad y restricciones verificadas en código y respuesta real.
2. Replay acotado: conteo y checksum, cero/no-op/caída externa/candidato
   parcial; estimación de operaciones y bytes bajo el margen gratuito.
3. Publicación: release anterior y nuevo, índices, checksum y conteos
   concordantes entre R2, API y página, con rollback disponible.
4. Operación: ejecución programada, manual o local según corresponda,
   smoke productivo y uso facturable de R2 verificado en $0.

No se marca una puerta sólo por un workflow verde. Cada cierre se documenta
con fecha, ejecución, release y prueba en [evidence.md](evidence.md). Si un
origen está bloqueado, conservar el último release válido y marcar
`degraded_external`; no convertir cero filas en corte nuevo. Un conector
manual o local-only puede quedar sano en su modalidad, pero nunca se anuncia
como automático.

| ETL / workflow | Modalidad según calendario | Fuente efectiva y destino R2 | Cierre |
| --- | --- | --- | ---: |
| Cámara · `etl-daily.yml` | Diario | Por verificar | 0/4 |
| Votaciones Cámara · `etl-camara-votaciones.yml` | Diario | Por verificar | 0/4 |
| Personal de apoyo Cámara · `etl-personal-apoyo.yml` | Semanal; origen bloqueado | `camara.cl/diputados/detalle/personaldepoyo.aspx`; `degraded_external`; R2 `projections/personal-apoyo-v1/`; conserva 1.084 filas | 1/4 (25 %); bloqueo externo |
| Personal de apoyo Senado · `etl-personal-apoyo-senado.yml` | Semanal activo; ejecución manual completa verificada | `web-back.senado.cl/api/transparency/senator-assignments/support-staff`; 3.407 filas, enero–agosto 2026; R2 `projections/personal-apoyo-v1/` | 4/4 (100 % del ciclo 2026; cuota confirmada por usuario, ver evidencia) |
| Movimientos · `etl-movimientos.yml` | Diario; ejecución remota comprobada | Prensa/RSS y fuentes oficiales configuradas en `scripts/movimientos-pipeline.mjs`; anuncios cuentan y confirmación conserva ID. R2 `data/movimientos.json`; replay, rollback, smoke y no-op 36854416777/36930661823 documentados | 3/4 (75 % operativo documentado); piloto O06 100 %; puerta de costes pendiente |
| ChileCompra · `etl-chilecompra.yml` | Semanal; cierre al final | Por verificar | 0/4 |
| InfoLobby · `etl-infolobby-scheduled.yml` | Semanal | Por verificar | 0/4 |
| Contraloría · `etl-contraloria.yml` | Mensual | Por verificar | 0/4 |
| CPLT · `etl-cplt.yml` | Mensual, R2-only | PR #709 y check-sources-only 37118857265: cuatro CSV responden por HEAD, sin ingesta/consolidación ni D1 automático; validadores previos nulos, no acredita corte nuevo ni replay masivo | 0/4 del ciclo completo; guarda R2-only 100 % |
| Ley 19.862 · `etl-ley-19862.yml` | Mensual, R2-only | Resumen/subset R2 verificados por bytes/SHA (4.907.481 bytes); PR #707 y verify-only 37108164915 cierran creación/materialización D1, no replay mensual ni manifiesto API externo | 0/4 del ciclo completo; guarda R2-only 100 % |
| InfoProbidad · `etl-infoprobidad.yml` | Mensual, R2-only | Proyección/subset R2 verificados por bytes/SHA (736.930 bytes); PR #705 y verify-only 37106727934 cierran dependencia D1, no replay mensual | 0/4 del ciclo completo; guarda R2-only 100 % |
| DIPRES · `etl-dipres.yml` | Trimestral, R2-only | Proyección/subset R2 verificados por bytes/SHA (1.127.842 bytes); PR #701 y verify-only 37085144507 cierran dependencia D1, no replay presupuestario | 0/4 del ciclo completo; guarda R2-only 100 % |
| SINIM · `etl-sinim.yml` | Semestral, R2-only | Nueve indicadores configurados, 345 municipios exigidos; release R2 verificado por bytes/SHA. PR #699 y verify-only 37062175649 cierran dependencia D1, no replay de origen | 0/4 del ciclo completo; guarda R2-only 100 % |
| Gastos Senado · `etl-expenses.yml` | Mensual; replay incremental comprobado | `web-back.senado.cl/api/transparency/expenses/senator-Operational-expenses`; 174 períodos publicados, 154.132 filas históricas; índice R2 conservado y API mensual comprobada | 4/4 del ciclo publicado; cuota confirmada por usuario, no facturación medida automáticamente |
| Remuneraciones 38 bis · `etl-remuneraciones-38bis.yml` | Mensual, día 5 a las 10:15 UTC; ejecución remota 37086353257 recuperada | CSV oficial/R2 concordantes; julio 2026, 1.595 filas, 18 históricos; no-op real sin PUT/Pages. Fallo previo preservado como evidencia, no estado actual | 4/4 (100 % del ciclo probado); cuota confirmada por usuario, observación O15 pendiente |
| SERVEL · `etl-servel.yml` | Manual | Por verificar | 0/4 |
| Cámara histórica · `etl-camara-reconciliation.yml` | Manual | Por verificar | 0/4 |
| Nóminas centrales CPLT · `etl-cplt-central.yml` | Manual | Por verificar | 0/4 |
| Votaciones Senado | Local-only; sin workflow remoto | Por verificar | 0/4 |

Orden inicial: terminar O05 antes de cualquier carga; luego documentar
procedencia de los ETL pequeños y sanos, cerrar Movimientos como piloto,
seguir gastos y remuneraciones por componente, y dejar ChileCompra al final.
La corrección de retroceso de Movimientos (O02) no equivale a cerrar sus cuatro
puertas operativas. Conciliación de su fila al 2026-10-03: las puertas 1–3
se respaldan en el [cierre O06](evidence.md)
y en [anuncios y revisión de pendientes](../../docs/operations/movimientos-announcements-20261001.md).
El piloto O06 está cerrado, pero esta matriz mantiene la cuarta puerta abierta
hasta acreditar operación y uso facturable según su definición. O05 no está
cerrado; el no-op evita escrituras, pero no demuestra por sí solo facturación
de toda la cuenta. O15 conserva la observación de siete días pendiente.

Personal de apoyo: [cierre y bloqueos](../../docs/operations/personal-apoyo-source-guards-20261002.md).
En Senado se aceptó la autorización expresa de Jorge y su confirmación de cuota disponible para la puerta de costes; el almacenamiento sí se midió sobre toda la cuenta. Analytics rechazó el token, por lo que no se presenta la facturación como medida automáticamente. La observación de siete días sigue perteneciendo a O15.
