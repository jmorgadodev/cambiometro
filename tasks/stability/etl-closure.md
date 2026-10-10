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
| Votaciones Senado | Tarea local «Cambiómetro - ETL votaciones Senado» | PR #717 integrado; tarea diaria local habilitada a las 09:30 CL. Fallo del 09-10 antes de publicar; el registro sólo conservó el código de salida. Replay `--dry-run` del 10-10 sobre `origin/main` `416e68c6`, ventana 06–10 oct: 0 errores y 0 filas nuevas; 2 lecturas R2, sin escrituras R2 ni D1. PR #744 (`727bab14`) mejora el registro de stdout/stderr y el código de salida; `--prepare-only` confirmó que la tarea prepara ese commit sin ejecutar ETL. Al corte de esta revisión, el horario 10-10 09:30 CL aún está pendiente; O11 sigue abierto. |

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

Comprobación local con `Get-ScheduledTask -ErrorAction Stop`: la tarea de
votaciones Senado está registrada y habilitada, pero su acción apunta a
`C:\Users\jorge\Proyectos\cambiometro-public\transparencia-app\scripts\etl-senado-votaciones-local.ps1`
(archivo ausente) y al working directory
`C:\Users\jorge\AppData\Local\Temp\cambiometro-senado-etl-runtime\transparencia-app`
(directorio ausente). La consulta inicial no la encontró porque el nombre
contiene «Cambiómetro» con tilde; se repitió con ese nombre real, sin ocultar
errores. Win32Exception 267 confirma «El nombre del directorio no es válido».
Es un fallo de arranque interno, no evidencia de un 403 del Senado.
Falta restaurar un ejecutor local aislado desde `origin/main` y corregir la
acción sin usar el checkout divergente ni ejecutar una publicación para
probar el arranque. No se cambió la tarea ni se lanzó una extracción en este
lote. Este defecto mantiene abierto LM06; el último release válido sigue
activo. No se exige esperar al cron: la reparación debe probarse en modo
sin publicación antes de cerrar.

### Reparación de arranque aislado — 2026-10-07

El diagnóstico de rutas ausentes anterior se conserva como incidente fechado.
El nuevo `scripts/etl-senado-votaciones-runtime.mjs` reutiliza el runner y la
guarda de worktree existentes; no modifica conector, parser, ETL ni guardas
de publicación. Cada intento fija `origin/main`, materializa sólo código y
datos acotados de Git (excluye lake, nómina nacional y raw), enlaza dependencias
sin copiarlas y prepara un candidato limpio fuera del frontend. Retira la
junction antes de eliminar exclusivamente ese candidato. Así el segundo
intento no falla por datos generados por el primero ni los sobrescribe en
el frontend. Un lockfile distinto requiere actualizar dependencias, no
continuar con versiones desconocidas.

Pruebas: seis casos con repositorios Git reales aislados aprobaron — dos
intentos limpios sucesivos, frontend/dependencias intactos, fallo/exception
del runner con limpieza acotada, raíz insegura, ventana extensa y preflight
sin ejecutar extracción. La prueba se escribió antes del ejecutor y falló
por módulo inexistente; un fallo inicial de finales de línea se corrigió
en la configuración del fixture, no debilitando la guarda. Tres pruebas
existentes de `local-worktree-guard` también aprobaron. Typecheck, lint
dirigido, arquitectura estática y enlaces aprobados.

Preflight real manual: `origin/main` `f88356bb9356d436fc26f74325d96f53d8286a4e`,
salida 0; candidato eliminado. Misma preparación desde el Programador de
tareas: último intento **7 oct 01:07:42 CL, resultado 0, estado Ready**.
Se preservaron por comparación principal, triggers y settings; próxima
ejecución 09:30 CL. Cuenta/token persistentes del usuario presentes, sin
imprimirlos. Acción de prueba usó `--prepare-only`. Tras integrar #717 en
`e7ab8730fb2de23c6c0fe4cc218e927c7b7a0c87` con CI verde, se activó la
acción normal sin flags de prueba; estado Ready y ruta/cadencia comprobados.

Dry-run real **2026-10-04..2026-10-07**: leyó catálogo y snapshot canónico,
recuperó las sesiones **10292 y 10291, 6 oct**, y ambas fallaron con
`SENADO_ATTENDANCE_SCHEMA`; finalizó 1 por `SENADO_SESSION_INCOMPLETE`.
Esto no es HTTP 403 ni una ejecución sin novedades. La causa del esquema
debe resolverse en O11; no se inventan asistencias ni se acepta cero como
corte válido. Log: `%ProgramData%\Cambiometro\votaciones-senado\logs\run-20261007-010602.log`.
No alcanzó ningún comando de publicación. Proyección antes/después:
release `6f793aff89be509eba711536449ccc564b72d86106e94ebb8aa0bd524568f620`,
SHA `3d4132710164df94ddd66b696b10f4f921c6fd67552ae5df8d8f79f46048ec8e`,
8.720.365 bytes. El resumen de hidratación menciona 203 entradas del
manifiesto, pero `--only-files` seleccionó sólo la proyección de votaciones;
no se descargó ese universo de 203 archivos. No hubo PUT/DELETE R2, D1 ni
cambios en `data`/`public/data` del frontend; candidato y junction retirados.

Esto cierra la prueba de arranque/preservación y documentación de LM06;
**no cierra disponibilidad ni cobertura de votaciones Senado O11**.
No se relanza otra extracción para obtener artificialmente un verde.

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
| Remuneraciones 38 bis · `etl-remuneraciones-38bis.yml` | Mensual, día 5 a las 10:15 UTC | Runs `37894789585` y `37997957980`: julio 2026, 1.591 filas, 18 períodos. La transición desde 1.595 fue 1 entrada/5 salidas; los 1.590 “cambios” iniciales reflejaron sobre todo etiquetas nuevas del esquema. El segundo run añadió `situacion_fuente` a 179 filas; no se cuenta su primera incorporación como delta. PR #746 integró en `main` el comparador de transiciones posteriores (`30f0ac86`), con 19 pruebas unitarias y CI verde; preview validado. No se ejecutó ETL en esta promoción, así que falta verificación con una transición real posterior. El run previo publicó 8 PUT; el inventario no acredita facturación ni sustituye Analytics. | 4/4 del ciclo probado; los retiros/entrada observados requieren el CSV bruto para revalidación independiente; O05 y O15 siguen pendientes |
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
