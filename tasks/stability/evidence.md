# Evidencia de avance y cierre

## Reenfoque defendible — candidato local 2026-10-07

Rama `codex/confianza-evidencia-20261007`, worktree canónico existente; base
`4cd5cf3e`. Referencia productiva y SHA de ReleaseSet en `../confianza/README.md`.
Las cuatro regresiones iniciales fallaron antes de corregir el código: dieta fija
sin registro, agregado mensual de bancada, enlace genérico etiquetado como
confirmación legal y fecha anterior al documento. Después pasaron 4/4, junto
con 37 pruebas existentes del bloque. Tipos front/Worker y cinco guardas pasaron
en la primera validación; las pruebas posteriores se registran por su resultado.

La suite completa inicial: 1.591 aprobadas, dos expectativas antiguas fallaron
porque exigían el número fijo 23.894 y un badge oficial sin acto individualizado.
Se actualizaron esos contratos a la regla aprobada, sin omitir ni deshabilitar pruebas.
Lint completo terminó 0, con 139 advertencias (no se certifica cero advertencias).

El GET público del nominal completo dio 404: el archivo es una entrada de build,
no un endpoint público acreditado. No demuestra pérdida de datos. Preflight
4 GET máximos/10.091.398 bytes bajo límite 12 MiB; ejecución interrumpida en esa
primera entrada. No se sustituyó por el fixture Git ni se descargó el universo.
La comprobación reutilizará en CI los tres archivos ya hidratados del ReleaseSet,
con SHA por archivo y cero lecturas adicionales R2; genera un informe local.
El agregado de Partidos no figura individualizado en el pin consultado y se
retira mientras se acredita su receta/entradas, no se declara corrupto.

Investigaciones: cuatro CSV inspeccionados (6, 10, 14 y 46 filas). INV-002 tiene
una fila mal formada; INV-003 incluye cinco identidades “Muestra”, componentes
omitidos y proyecciones discordantes. Revisiones/reescrituras neutrales aparte
en `cambiometro-editorial/social/investigaciones/REVISION_20261007.md`.
Originales preservados; ningún borrador publicado. Expediente y consulta de
elegibilidad preparados, no enviados, firmados ni adoptados por el agente.

## Acta de cierre LM01–LM09 — 2026-10-07

LM06 integrado mediante PR #717, merge
`e7ab8730fb2de23c6c0fe4cc218e927c7b7a0c87`, 04:18:56 UTC. Build/E2E
`37570303117` completo success; calidad `37570249223`/`37570303104`, CodeQL
`37570249246`, seguridad `37570303179` y validación de workflow verdes.
Después de fusionar se activó la acción Windows normal sin flags de prueba:
script/directorio existentes, estado Ready, próximo 7 oct 09:30 CL,
principal/triggers/settings idénticos a los anteriores. Último preflight
01:07:42 CL resultado 0 no se presenta como extracción exitosa.

El dry-run real y sus guardas ya están registrados abajo: sesiones de origen
incompletas, publicación bloqueada, release conservado y candidato eliminado.
LM06 cumple 4/4 de procedencia, calendario, fallos y arranque aislado; el
problema de asistencia de sesiones 10292/10291 continúa explícito en O11.
No se reintenta extracción ni se debilita el validador para cerrar este acta.

Los nueve puntos LM tienen evidencia específica, no un porcentaje global
de exactitud: LM01 ruta/tablero y #715; LM02–LM04 pruebas, preview final y
render productivo #715; LM05/LM07 snapshot/API/cronología/ciclo probado;
LM08 celdas originales e integración #716; LM09 preflight negativo fechado
integrado #715; LM06 reparación/activación #717. Los detalles y límites
permanecen en las actas anteriores. No quedan puertas de implementación LM
abiertas; esta actualización registra su cierre, sin cambiar aplicación,
datos públicos o cobertura. O05/O08/O10/O11/O13/O15/O16 siguen abiertos.

## Cierre LM08 y reparación LM06 — 2026-10-07

PR #716 integrado en `f88356bb9356d436fc26f74325d96f53d8286a4e`, 04:05:18 UTC.
Build/E2E `37568939730`, calidad/tipos, CodeQL y seguridad completos verdes.
LM08 alcanza 4/4: seis casos explícitos documentados contra origen, sin
extrapolar la muestra ni inferir causa del sueldo bajo. No se descargaron
otra vez CSV ni se desplegó presentación para integrar esta evidencia.

LM06: ejecutor aislado nuevo y runner/guarda existentes reutilizados. Seis
pruebas de runtime y tres de guarda, tipos, lint, arquitectura/enlaces verdes.
Preflight manual y Windows real con salida 0; último intento programado
7 oct 01:07:42 CL, próximo 09:30 CL, principal/horario/settings preservados.
Dry-run 4–7 oct llegó al origen y falló por esquema de asistencia de sesiones
10292/10291; guardas bloquearon publicación. Snapshot de 8.720.365 bytes
con SHA `3d4132710164df94ddd66b696b10f4f921c6fd67552ae5df8d8f79f46048ec8e`
sin cambio. Candidato/junction eliminados, frontend y dependencias intactos;
no PUT/DELETE R2, D1 ni copias nuevas. Detalle en `etl-closure.md`.
LM06 permanece 75 % hasta CI/fusión y acción normal; el fallo de asistencia
queda en O11, no escondido como éxito ni como 403 externo.

## Cola pendiente conciliada — 2026-10-07

A petición de Jorge se corrigió únicamente la cola de `todo.md`: todavía
enumeraba como pendientes LM01–LM05, LM07 y LM09, aunque el mismo tablero
ya acreditaba su cierre. Ahora comienza por la integración documental LM08
y el arranque aislado LM06, e incorpora las referencias operativas O sin
duplicarlas ni atribuirles los porcentajes de los cierres municipales.

Consulta puntual de PR #716, HEAD `e958483da45c931dca063aa0ecdcec0234980925`:
calidad, CodeQL, seguridad y validación de workflow aprobados; build/E2E
`37568939730` aún en curso. No se fusiona ni se declara LM08 al 100 % con
esa puerta pendiente. LM06 conserva su fallo de rutas documentado.
Este ajuste no ejecuta ETL, descarga CSV, modifica tareas Windows ni accede
a R2/D1; no cambia diseño o datos de producción.

## O11 · Personal de apoyo · cierre individual 2026-10-02

- Guardas: PR #687 / main `9f7204ed66c980ea03a5cd6a73181bbd5d5fd400`; 42 pruebas dirigidas, tipos, lint y CI aprobados. Se detiene la extracción si el release R2 no pasa checksum/conteos; no vuelve al snapshot Git.
- Senado: run `36963215218` completó siete páginas, 3.407 filas, 70 oficinas y publicación con `--skip-d1`. Conservó 1.084 filas de Cámara; total compartido 4.491. Alcance del endpoint: enero–agosto 2026.
- Release `2026-10-02T04-08-54-151Z`, checksum `dc0e43f3218d38dded54229e614035574301156c43dd3150984c10b748edac5d`. Rollback anterior conservado: SHA `75d73d4ca0e30adb64b0a3d73e48281aba2363cab4ecbf8831ec6f9470638f59`.
- Pages run `36963350688`, producción `b3dbf875.cambiometro.pages.dev`: success. Pin público concuerda con el nuevo checksum. Home, búsqueda Kaiser y fichas Pedro Araya/Vanessa Kaiser respondieron 200; ambas fichas muestran agosto 2026.
- R2: inventario de cuenta 8.425.652.239 bytes antes, proyección final 8.427.986.077; incremento 2.333.838 bytes. Cuota de operaciones confirmada expresamente por Jorge; consulta Analytics rechazada por permisos. Se registra esta autorización, no una medición de facturación inexistente. O05 automático sigue pendiente.
- Cámara: la consulta local oficial `personaldepoyo.aspx?prmId=1009` devolvió 403 y `PERSONAL_APOYO_SOURCE_BLOCKED`; la nómina general enlazada oficialmente `https://www.camara.cl/transparencia/personalapoyogral.aspx` también devolvió 403. No se encontró un método de personal de apoyo en el catálogo oficial de datos abiertos consultado. Conserva release; puerta de procedencia identificada 1/4, extracción operativa pendiente.
- Procedimiento de reanudación y límites: [registro detallado](../../docs/operations/personal-apoyo-source-guards-20261002.md). Senado 4/4 en su ciclo 2026; Cámara 1/4; O11 global y O15 no se declaran cerrados.

Este registro es interno; no se copia a textos públicos. Una puerta se marca
en `todo.md` sólo con una entrada aquí. Registrar `pendiente` cuando un campo
no aplique; nunca inventar un checksum o un porcentaje de cobertura.

## Plantilla para cada puerta nueva

```text
Fecha (America/Santiago):
Tarea y puerta:
Resultado / clasificación:
Base Git, rama y commit / PR:
Release R2, manifest, checksum, período y conteo (si aplica):
Pruebas / CI / preview:
URL y comprobación productiva (si aplica):
Rollback identificado:
R2 PUT/DELETE y D1 remoto ejecutados:
Riesgo o siguiente puerta:
```

## O01 — puertas 1–4 · 2026-10-01 · cerrado

- Base: repositorio `cambiometro-public`, `origin/main` en `da4c5304`;
  checkout principal divergente preservado. Rama documental
  `codex/stabilizacion-registro-20261001` en
  `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.
- Se revisaron `tasks/plan.md`, `tasks/todo.md`,
  `docs/ESTABILIZACION-OPERATIVA-2026-10-01.md` y el calendario de ETL.
  Los documentos antiguos no se borran; este directorio es el tablero nuevo.
- Fusión: [PR #667](https://github.com/jmorgadodev/cambiometro/pull/667),
  commit `35c2f3d6c430794b4a2fc936ce7c5351b49e60d9`. Lint, tipos,
  pruebas, seguridad y build/smoke CI `36814344681` verdes. Los enlaces
  relativos del tablero se comprobaron localmente tras la fusión.
- Porcentaje: 4 de 4 puertas = 100 %. Próxima tarea abierta: O05.
- Datos: ninguna escritura R2/D1; sin porcentajes de cobertura nuevos.

## O02 — puertas 1–4 · 2026-10-01 · cerrado

- Incidente: `pages-ui-refresh.yml` ponía un JSON versionado encima del
  movimiento hidratado de R2; `etl-movimientos.yml` permitía fallback a Git.
- Cambio: [PR #666](https://github.com/jmorgadodev/cambiometro/pull/666),
  commit fusionado `da4c5304b7fab1a1a007e745c2e9b21fb6637e63`.
- Pruebas: 24 unitarias locales; typecheck, arquitectura y YAML; CI de lint,
  unitarias, seguridad y build verificada. Run de build `36812188152` verde.
- Producción: promoción `36813102481` verde, deployment Pages
  `0712bb24-539b-4237-bcd3-d19ca9053631`. Consulta del archivo público:
  46 filas de movimientos, 5 señales en confirmación, 51 eventos publicados,
  `last_event_date=2026-09-30`, tres señales del 30-09 presentes. El
  manifiesto Pages declara 46 filas de movimientos y la misma fecha.
- Rollback: el deployment anterior de Pages debe identificarse desde la lista
  de Cloudflare antes de ejecutar una reversión; el ID del deployment nuevo
  quedó registrado. No se modificó R2/D1 en esta promoción.
- Límite: esto evita el retroceso conocido; no acredita aún un `ReleaseSet`
  completo ni siete días de estabilidad.

## O05 — puerta 1 · 2026-10-01 · comprobada

- `.github/workflows/backup-weekly.yml` programa la verificación semanal,
  pero asigna `BACKUP_LAKE_COPY=0` y `BACKUP_D1=0` en ejecución programada.
  La copia completa exige despacho manual con confirmación explícita.
- `transparencia-app/scripts/backup-weekly.mjs` sale sin copia cuando
  `BACKUP_LAKE_COPY` no es `1`; luego el workflow ejecuta
  `r2-compact-backups.mjs --mode=verify-remote`, una verificación del respaldo
  existente, no la creación de otro backup.
- Ejecución GitHub `36312112058` (2026-09-27): registró copia completa
  omitida y verificación remota `status=OK` de 4.940 objetos, 4.107 blobs y
  seis muestras restauradas. Esta evidencia **no** confirma coste mensual $0:
  las lecturas de verificación también cuentan como operaciones R2.
- Rama `codex/etl-cierre-costo-cero-20261001`, basada en `origin/main`
  `5041518d`; documentación pendiente de PR/CI. R2 PUT/DELETE y D1 remoto
  ejecutados en esta revisión: ninguno. Próxima puerta: medir uso de toda la
  cuenta, operaciones y facturación del ciclo actual.

## Incidente Home — contador de días · 2026-10-01

- Causa: el efecto del navegador recalculaba los días exclusivamente desde
  `ultimoCambioEfectivo` (14-09), ignorando señales publicadas el 30-09.
- Corrección: calcular desde la fecha más reciente entre cambio efectivo y
  señal publicada. Mantener el cálculo diario en zona America/Santiago y
  conservar ambas fechas y sus estados en la interfaz.
- Pruebas: 24 pruebas puntuales aprobadas (edad de movimientos, Home y
  política de backup); TypeScript sin errores. Casos: anuncio del 30-09 da
  cero ese día y un día el 01-10; una respuesta efectiva anterior no lo borra.
- [PR #669](https://github.com/jmorgadodev/cambiometro/pull/669) fusionado:
  `b0fd66269c0374a0619e7b1eaca6aa645bb2aaa2`. Calidad, seguridad, build y
  E2E aprobados. Preview verificado `36845324112`:
  `https://31bc05f2.cambiometro.pages.dev`, contador `01`.
- Promoción productiva `36846753798` aprobada. Deployment
  `fc0759f6-7642-4cdc-b6a4-e92c00cf98c8`. Navegador en
  `https://cambiometro.impulsacv.cl/`: tras cargar, contador `01`, 51
  movimientos, 35 renuncias, última señal 30-09 y revisión 01-10.
- Rollback anterior comprobado en metadata Pages:
  `0712bb24-539b-4237-bcd3-d19ca9053631` (commit `da4c5304`).
  Esta corrección no cierra O06 ni acredita siete días de estabilidad.
- R2 PUT/DELETE y D1 remoto: ninguno.

## O05 — puerta 2 · 2026-10-01 · comprobada

- Panel R2 de la cuenta Jorge, ciclo **26 septiembre–26 octubre**: 8,39 GB
  totales, 2,78 mil operaciones Clase A, 29,93 mil Clase B, **$0,00 facturable**.
  Son valores redondeados del panel; no equivalen a cifras exactas de objetos.
- Buckets: `transparencia-public-data`, 7,34 GB / 23,46 mil objetos;
  `cambiometro-backups`, 1,05 GB / 4,11 mil objetos;
  `mascotas-impulsacv-cl`, 257,84 kB / 3 objetos;
  `impulsacv-contexto-multas`, 0 B / 0 objetos.
- Frente al límite operativo de 10 GB: aproximadamente 83,9 %; advertencia
  del 80 % activa, aún bajo revisión al 90 % y bloqueo al 95 %. Margen hasta
  el bloqueo: aproximadamente 1,11 GB antes de nuevas cargas y su pico.
- Referencia vigente: https://developers.cloudflare.com/r2/pricing/ y
  https://developers.cloudflare.com/r2/platform/metrics-analytics/.
  Las operaciones gratuitas Standard son 1 millón A y 10 millones B por mes.
- Consulta GraphQL con el token local: acceso a analytics denegado; el panel
  autenticado permitió la lectura. No se cambiaron credenciales ni permisos.
  Próxima puerta: probar e integrar guardas de operaciones con telemetría
  autorizada; el control de almacenamiento existente no basta para esa puerta.
- R2 PUT/DELETE y D1 remoto: ninguno; sin creación de backup nuevo.

## ETL Remuneraciones 38 bis — puerta 1 · 2026-10-01

- Fuente efectiva: `https://comision38bis.gob.cl/registro-publico?csv-todo`;
  fallback HTML oficial en `https://comision38bis.gob.cl/registro-publico`.
  Constantes en `scripts/etl/remuneraciones-38bis-parser.mjs`; el conector
  `scripts/etl-remuneraciones-38bis.mjs` selecciona el último período presente
  en CSV y exige al menos 500 registros. No fija 2026 por inferencia.
- Consulta acotada HEAD al CSV: HTTP 200, `text/csv; charset=UTF-8`.
  No se descargó el CSV ni se ejecutó una publicación.
- Modalidad: cron `15 10 5 * *` y despacho manual. Destino:
  `transparencia-public-data/projections/remuneraciones-38bis-v1/`, releases
  identificados por checksum y punteros `current.json`, `current-history.json`
  y `manifest.json`.
- Ejecución previa verificada `36054022783` (24-09): 1.590 registros,
  período `2026-07`, 18 períodos históricos,
  checksum `c6fe851b6dc0b2de8ba0eb4d80fe699636165a7fe41b61f8b2411252d44101dc`.
  Su éxito acredita esa ejecución manual, no todas las futuras ejecuciones.
- Cierre: 1/4 = 25 %. Restan replay contractual, coherencia productiva y
  operación con guardas. La publicación actual usa PUT directos; antes de
  cerrar se debe conectar al preflight común de cuenta y comprobar no-op.
- R2 PUT/DELETE y D1 remoto en esta auditoría: ninguno.

## O06 — puertas 1–3 · 2026-10-01 · implementación independiente

- Rama `codex/movimientos-noop-20261001` desde `origin/main`, mismo worktree
  aislado de estabilización. #671 y su bloqueo Analytics se conservan aparte;
  sus cambios no se incluyen en esta rama.
- El ETL continúa recuperando y validando el snapshot R2 y escribiendo el
  candidato mediante archivo temporal y rename. Ahora compara únicamente
  movimientos/señales y su evidencia; una hora de revisión, salud técnica o
  `last_seen_at` no genera un release nuevo.
- Sin novedades: reporte `published=false`, motivo `NO_PUBLIC_CHANGES`,
  checksum anterior; no se sustituye el snapshot ni se ejecuta el publicador.
  Una señal periodística nueva, confirmación sobre el mismo ID o cambio de
  evidencia sí requieren publicación. Fallo externo conserva la guarda previa.
- Pages y el verificador posterior consultan el resultado del paso de
  publicación del ETL en GitHub Actions: success permite continuar, skipped
  evita build y comprobaciones de frescura falsas; resultado ausente/ambiguo
  bloquea. Otros ETL y despachos manuales conservan su comportamiento.
- Replay de dos cortes del fixture existente, sin red ni R2/D1: no hay cambio
  público en el segundo; cero y descenso de filas se rechazan antes de activar.
  41 pruebas dirigidas aprobadas, TypeScript y lint de archivos cambiados
  aprobados; YAML de ambos workflows parseado correctamente.
- O06 = 75 %; falta fusión con controles verdes y ejecución productiva que
  demuestre el camino completo. No se declara estabilidad de siete días ni
  cierre de otras fuentes. Sin modificación visual ni backup nuevo.

### O06 — validación real y corrección acotada · 2026-10-01

- #672 fusionado en `6a9d3648`, todos sus controles verdes. Ejecución real
  `36851576565`: el extractor propuso dos señales ajenas a una salida actual
  de autoridad chilena (noticia de Irán/Irak y crítica sobre continuidad de
  Zaliasnik). No son movimientos válidos ni confirmaciones oficiales.
- Se cancelaron el refresco Pages `36851751944` y el verificador
  `36851751872`; se restauró el manifiesto canónico anterior desde la copia
  local verificada. Antes de restaurar se comprobó que los demás archivos
  del manifiesto no habían cambiado. No se modificaron otras fuentes.
- Presupuesto de restauración: 8.391.468.869 bytes actuales, pico previsto
  8.391.561.292 bytes, umbral 9.500.000.000. Sólo se reemplazó el manifiesto;
  no se creó backup ni se eliminó histórico.
- Rollback leído y validado: objeto de 108.691 bytes,
  checksum `e3e6753b280f2535e080aa444c761ed5ea01b4103803284e6a0a55d8e3a372af`,
  46 movimientos + 5 señales. Evidencia local conservada en
  `C:\Users\jorge\Proyectos\cambiometro-audit\evidence\movimientos-closeout-20261001`.
- Corrección limitada al filtro: no combinar un titular sin anuncio de salida
  con referencias históricas en el cuerpo; excluir secciones internacionales
  y desmentidos. Los comunicados oficiales con anuncio en el resumen y cargo
  local siguen aceptándose. Prueba negativa reprodujo los falsos positivos
  antes de la corrección; 43 pruebas dirigidas, tipos y lint pasan después.
- La cola Pages no cancela una promoción válida cuando llega un no-op nuevo.
  O06 sigue en 75 % hasta repetir y comprobar la ejecución corregida.

### O06 — cierre verificado · 2026-10-01 · 100 %

- #673 fusionado en `b2a28d34` después de todos los controles verdes, incluidos
  build y navegación responsive. 59 pruebas dirigidas, tipos y lint aprobados.
- Se preserva la primera fecha de detección al releer una señal conocida;
  una revisión sin novedades no altera datos ni genera publicaciones.
- Ejecución real desde `main`: `36854416777`, exitosa;
  `published=false`, `reason=NO_PUBLIC_CHANGES`. Paso de subida omitido.
- Pages `36854519350`: decisión exitosa y `build-verify-publish` omitido.
  Guardia `36854519373`: exitosa y comprobación de publicación omitida, sin
  falsas alertas de frescura por un no-op.
- Smoke productivo posterior aprobado: HTTP 200, hidratación sin errores,
  cinco señales pendientes presentes y exautoridades excluidas. Checksum
  público conservado:
  `fa9aae700ec9fab351e40f1f90d9601c1bb79f79fdafa218e456cc2dd35d52cc`.
- Hay 51 eventos: 10 verificados, 35 corroborados y 6 pendientes; no se
  presenta el catálogo de 46 como 46 confirmaciones legales. Home comprobada
  con 51 eventos y 01 días sin cambios el 1 de octubre.
- Rollback existente validado por checksum y contenido (108.691 bytes), sin
  nueva copia de respaldo. Restauración acotada bajo guarda de almacenamiento:
  8.391.577.561 bytes, pico 8.391.669.984, inferior al umbral 9.500.000.000.
  No se realizaron operaciones D1 ni borrado de históricos.
- Este cierre acredita O06, no siete días de estabilidad ni el cierre global.
  #671 y las demás puertas permanecen con sus estados anteriores.

### O03 — registro reproducible de fuentes · 2026-10-01

- Rama `codex/source-registry-20261001`, mismo worktree canónico bajo
  `.codex/worktrees/codex-stabilizacion-20261001`; base `origin/main` 773dec2a.
  Checkout divergente y rama de costes #671 intactos.
- Se reutilizó `.github/etl-calendar.json`: 18 workflows contrastados con
  cron/dispatch reales y conectores existentes; Senado votaciones local-only
  se registra aparte, sin inventar workflow remoto. Calendario histórico
  marcado como contexto, no como autorización D1 ni prueba de salud.
- Sólo dos lecturas R2: `catalog/v1/manifest.json` y
  `projections/static-site-v1/manifest.json`. Catálogo de
  `2026-09-30T13:39:09.758Z`; manifiesto estático de
  `2026-10-01T02:00:29.670Z`, checksum
  `7c29abdf2542cb6a0d1f1b4fb5209f9c036caa16e7563602aa0a1212274f9c6d`.
  Sin consultas D1, extracción de universos, escritura R2 ni despliegue UI.
- Generador local `scripts/build-source-registry.mjs`: categorías separadas,
  origen configurado, ventana documentada por workflow, conteos y períodos
  de catálogo, checksum de índice, artefacto versionado y checksum estático.
  No suma catálogos compartidos. Ausencias y límites de frescura son no medidos.
  Conserva entradas de catálogo sin workflow asociado (Senado) sin inventarlo.
- Matriz en `source-registry.md`; JSON e inputs locales en
  `C:\Users\jorge\Proyectos\cambiometro-audit\evidence\source-registry-20261001.json`.
  Metadatos de índices específicos CPLT/38 bis/apoyo permanecen explícitamente
  no medidos; esto no declara cerradas sus puertas de operación.
- Siete pruebas dirigidas aprobadas: conteos y unidades, ausencias sin cero,
  duplicados, cron divergente, checksum inválido, manual/local-only y catálogo
  sin workflow. TypeScript, lint dirigido y calendario (18 workflows) aprobados.
  El generador se ejecutó contra ambos manifiestos productivos y produjo 19
  entradas. El 100 % del registro es efectivo tras CI verde y fusión de este
  cambio, no acredita estabilidad global ni salud de todos los conectores.

### O04 — contadores públicos por release · 2026-10-01 · 75 %

- Rama `codex/source-counters-20261001`, worktree canónico, base main 84d5d216.
- `/fuentes` deja de importar GLOBAL_KPIS: total sólo si conciliado por el
  resumen publicado, fuentes desde ese resumen, versión desde su checksum y
  cortes separados por fuente. Sin versión válida no expone cifras/períodos
  configurados como vigentes. Los nulos no se sustituyen por cero.
- Se conserva el estado parcial del resumen en su presentación; no se anuncia
  operativa una cobertura parcial. Se retira la explicación no demostrada de
  diferencias «por deduplicación». Sin cambios de diseño, menú, rutas o ETL.
- Cuatro pruebas de render reprodujeron el problema antes de corregirlo;
  19 pruebas dirigidas, tipos, lint, enlaces y arquitectura estática aprobados.
- Verificación acotada reproducible: `node scripts/verify-prod-fuentes.mjs`,
  con VERIFY_BASE_URL para preview. Compara `/fuentes` con su resumen JSON
  público, conteos, períodos, checksum, estados y móvil/escritorio.
- La cuarta puerta sigue abierta hasta preview, promoción ui-only y smoke
  productivo. No se escribe ni borra R2, no se ejecutan ETL ni D1 remoto;
  costes #671 permanecen apartados. Rollback: deployment anterior de Pages.

### O04 — cierre productivo · 2026-10-01 · 100 %

- PR #676 integrado en main: `76b8985e4d447f27170a0c663b3ccb9ea0ed28de`.
  Se actualizaron únicamente las expectativas antiguas de los controles de
  Fuentes: checksum del release en vez de fecha global y contadores conciliados
  en vez de GLOBAL_KPIS. 34 pruebas dirigidas y todos los checks del PR verdes.
- Preview: run 36910545533, `https://d7efd81b.cambiometro.pages.dev`.
  Producción ui-only: run 36912818623, resultado success; deployment
  `0154c7e6-d075-41f6-9097-362ce953b7d6`.
- `node scripts/verify-prod-fuentes.mjs` aprobado en preview y producción:
  13 fuentes, períodos y conteos por alcance, estados parciales, cero errores
  de página y cero desbordamiento a 320/1440 px. La comprobación de la insignia
  ignora mayúsculas porque el CSS transforma su presentación.
- Checksum idéntico del resumen en ambos destinos:
  `a316454f318bb2c3f11c170bbaa545e98cf5b8fab8003e0c2a77c5e2e17d6efc`.
  Total público: «Conteo conjunto no calculable», sin inventar un total global.
- Metadatos de deployment/rollback conservados en el artefacto del workflow;
  no se creó respaldo R2, no se escribieron/borraron datos R2, no se ejecutó ETL
  ni D1 remoto. #671 continúa apartado. Este cierre sólo acredita O04, no la
  estabilidad global de todos los ETL ni los siete días de observación.

### Ajuste solicitado — favicon del logo · 2026-10-01

- Rama `codex/site-favicon-20261001`, base main d52060f4, mismo worktree canónico.
- `app/favicon.ico` convertido desde `public/brand/el-cambiometro-mark.svg`,
  el mismo símbolo utilizado por SiteHeader, con imágenes de 16/32/48/64 px.
- Verificación binaria: cada imagen del ICO coincide exactamente con la
  conversión PNG del logo en su tamaño. Sin rediseño, dependencias nuevas,
  cambios de datos, ETL, D1 o R2.
- PR #678 integrado con todos los controles verdes; producción ui-only
  run 36921383037 terminó success. `/favicon.ico` devuelve 200 y 2.586 bytes,
  idénticos al archivo local; la Home referencia ese icono. SHA-256:
  `421bd981e5e7baf60f6c1c1902dc3d449242f8fbe05b8b4e95e13632ba2c2a14`.

### O07 — contrato ETL reutilizable · 2026-10-01 · 75 %

- Rama `codex/etl-contract-20261001`, mismo worktree canónico, base 2162d21c.
- `scripts/etl/release-candidate.mjs` valida identidad, períodos reales,
  checksum calculado, conteo, IDs únicos, completitud y reducción respecto al
  release previo. Candidato vacío o fuente caída no autoriza reemplazo.
- Una verificación de preparación no autoriza escribir: el modo publicación
  exige presupuesto y reutiliza `assertR2WriteBudget`; no duplica su cálculo
  ni modifica O05/#671, que continúa apartado. No sustituye la medición remota
  de cuenta ni acredita guardas de operaciones facturables.
- Movimientos conserva su validador de dominio y no-op; agrega comparación
  con el último candidato antes de reemplazar el archivo local. Cámara usa
  el mismo contrato en su preflight aislado: comprueba bytes y SHA de cada
  artefacto, filas reales descomprimidas y alcance exacto del mes/categoría.
- Tres pruebas fallaron antes de sus cambios: descenso de Movimientos, staging
  Cámara corrupto que antes se aceptaba y presupuesto sin inventario confundido
  con cuenta vacía. 55 pruebas dirigidas pasan, incluidas 19 contractuales.
  Tipos y lint dirigido aprobados. Revisión acotada de corrección, límites de
  rutas y conservación del rollback, sin dependencias ni cambios de workflows.
- Replay Cámara exclusivamente local: catálogo anterior intacto ante fallo;
  catálogo candidato conserva otra fuente byte a byte. No se extrajo la fuente,
  no se ejecutó workflow de reparación ni se promovieron objetos R2/D1.
  La adopción común se cierra sólo tras CI verde y fusión; el cierre operativo
  individual de conectores/publicaciones remotas pertenece a O11–O13/O05.

### O07 — cierre del contrato común · 2026-10-01 · 100 %

- PR #679 integrado en main: `d2824d02ba0004a70be8ff522155e256f005361d`.
  Lint, tipos, unitarias, arquitectura, tokens, enlaces, seguridad, build y
  verificación de rutas/API/UI aprobados. Build/E2E: run 36924265689, success.
- Segunda adopción comprobada con replay local Cámara, sin publicar: bytes
  alterados bloquean la salida; candidato válido genera catálogo aislado;
  el catálogo previo y la fuente ajena permanecen intactos. Movimientos usa
  el contrato en el ETL existente antes de reemplazar su snapshot local.
- El 100 % corresponde a la librería común y ambas adopciones verificadas,
  no a la operación remota de todas las fuentes. No se disparó extracción ni
  reparación remota, no hubo D1 remoto, objetos nuevos R2 ni respaldos nuevos.
  O05/#671 sigue apartado; O11–O13 mantienen sus puertas operativas propias.

### O12 — guarda mensual Senado · 2026-10-02 · 25 %

- Ejecución 37044606324 terminó correctamente, pero la comprobación de meses detectó un índice publicado parcial (Senado 2 períodos mientras el manifiesto conserva 174 archivos). O12 permanece abierto hasta corregir y repetir el smoke. Los objetos históricos no se perdieron. Reparación acotada en `docs/operations/expense-index-retention-20261002.md`; aumento proyectado de sólo 19.662 bytes.

- PR #689 integrado: `41e3655068768ad9e913f55e1e52f9d2ac6a2d77`, CI verde. 43 pruebas, replay junio/julio 1.248/1.250 filas, baseline publicado R2 obligatorio en workflow. Ejecución incremental 37044606324 pendiente de cola al registrar este hito.
- Detalle: `docs/operations/expense-monthly-guard-20261002.md`. Los períodos oficiales coinciden (174), pero esto no acredita todas las filas históricas.

### O08 — promoción condicional remota estática · 2026-10-02

- Publicador exige manifiesto/checksum/ETag fuertes y `If-Match` al activar el puntero. Dos ETL concurrentes probados: segunda base rechazada y candidato combinado conserva ambos dominios.
- Prueba real 412 bloqueó el ETag incorrecto sin alterar bytes. PUT idéntico con ETag válido aceptado; mismo checksum `db4998d03e583abb92b3b68d49f3e3495cf403235c5eed274887634284ef9dc5` y ETag tras lectura posterior. Preflight: 8.446.722.782 bytes, sin crecimiento ni objetos nuevos.
- Quince pruebas dirigidas, tipos y lint aprobados. Cierre al fusionar con CI verde; O08 sigue pendiente de manifiestos externos y O09 de disparos/no-op generales. Procedimiento en `docs/operations/r2-static-conditional-promotion-20261002.md`.

### O14 — restauración acotada y simulacro · 2026-10-02

- Inventario del respaldo: 4.108 objetos, 1.049.483.183 bytes; 4.107 blobs únicos. Seis muestras de distintos tamaños restauradas y verificadas por SHA-256: 22.345.237 bytes desde 1.645.633 bytes comprimidos; siete GET de datos, cero escrituras remotas.
- Puntero en memoria `1c9dc4bec22b4a096a29a76452dc8f8ad4debee12b8b6a5b2a9ea288c11bb8cf` → `95785d19c8b77178004618d4027b4fd8f3343fa372ed3e2fc3fe644bd0c9fd5c` → vigente, con contratos y dos archivos reales verificados.
- Once pruebas dirigidas aprobadas. Procedimiento: `docs/operations/rollback-existing-backup-20261002.md`. Cierre efectivo tras CI y fusión; el CAS remoto y los siete días siguen pendientes. No se restauró toda la copia ni se cambió producción.

### O10 — control diario de coherencia estática · 2026-10-02

- El monitor existente agrega dos lecturas R2/Pages y reutiliza `shouldRefreshStaticRelease`, sin ETL, filas, D1, escrituras R2, cambios de puntero ni backup. Pin distinto no es healthy; checksum/credenciales inválidos fallan de forma cerrada.
- Control real local y remoto: pin vigente R2/Pages concordante, estado `healthy` restringido a `static-release-consistency`, HTTP 200 y dos lecturas. PR #695 integrado con CI verde (`9f751b0a2a04dca645ece7f92135332d2fe3a517`); ejecución 37054632539 success, 33 consultas GitHub + dos de pin, 26 pruebas relacionadas aprobadas. O10: 75%; quedan controles por fuente/externos/costes.
- Incidentes reutilizan el agrupador Uptime: `/data/release-set.json`, recordatorio semanal y recuperación verificada. No se infiere estado externo/interno de un conector por un fallo de Actions; frescura por fuente, manifiestos externos y costes permanecen pendientes.

### O12 — cierre del alcance publicado · 2026-10-02 · 100 %

- PR #693 integrado `6d7993578c321e19088dcac3c3543880dde40e78`, CI verde. Conservación histórica del índice y de filas del candidato R2: 32 pruebas; filtros/último corte/nulos: otras 27.
- Índice reparado: Senado 174 períodos, Cámara cuatro; 19.660 bytes nuevos, cuenta proyectada 8.446.742.444 bytes. Manifiesto `55e5cd98b0270f398ecf59f344fe567c0692c9b38637413c0709b54b159a666a`; no backup ni D1 ni eliminación de histórico.
- 178/178 períodos con HTTP 200, backend `r2-months` y conteo igual al manifiesto. Una fila por período, 2,5 segundos entre llamadas. Evidencia local `C:\Users\jorge\Proyectos\cambiometro-audit\evidence\expense-month-smoke-20261002-postfix.json`; se conserva el informe fallido anterior.
- Run Pages 37050448199 success, deployment `https://a4a5369c.cambiometro.pages.dev`, ReleaseSet `92d5a447548effb98c334836c2392b419ff29961432ab7209d995b654090897e`. Pin productivo igual a R2; once páginas 200 y tres filtros anuales en fichas Pedro Araya/Vanessa Kaiser. No verifica cada fila histórica contra origen ni afirma cobertura total del Congreso.

### O09 — cierre estático y no-op general · 2026-10-02 · 100 %

- PR #692, ocho pruebas de decisión/contrato y CI verde. Run 37050531642: comparación R2/Pages sin cambios, build/publicación omitidos. Comprobación local posterior también devuelve `refresh=false`.
- Run 37048540901 rechazó pin desfasado antes de publicar. La reconstrucción 37050448199 pasó tipos/build/E2E y todas las guardas; deployment y rollback registrados. Búsquedas Kaiser/Torrealba responden 200 con `r2-catalog`.
- Modos, bloqueo compartido, promoción y límites documentados en `docs/operations/pages-coherent-promotion-20261002.md`. Manifiestos externos O08, monitor restante, remuneraciones, costes #671 y observación no se cierran por este hito.

### O13 — guardas de 38 bis, no promoción · 2026-10-02

- Candidato reutiliza contrato común y baseline R2 obligatorio; no-op no escribe ni espera despliegue y período ausente no se inventa. Clave con mes/checksum preserva meses distintos con filas idénticas. Preflight de almacenamiento antes de los PUT existentes, sin respaldo nuevo ni D1. Diecisiete pruebas del dominio más 27 relacionadas (44), tipos y lint aprobados; CI y verificación remota pendientes.
- Los dos builds Pages rehidratan snapshot/histórico/auditoría R2 incluso con caché; validan concordancia completa antes de reemplazar inputs locales. Verificación real local: tres GET, 8.859.421 bytes, auditoría concordante, sin escrituras. Una publicación real 38 bis dispara Pages; un no-op lo omite. El pin externo canónico sigue en O08.
- Release vigente: 1.590 filas, julio 2026, checksum `c6fe851b6dc0b2de8ba0eb4d80fe699636165a7fe41b61f8b2411252d44101dc`. Se verificaron 18 cortes históricos (29.703 filas) sin alterar sus ocho repeticiones aparentes. Replay contra sí mismo: unchanged.
- CSV oficial acotado detenido a 10 MB; HTML oficial julio produce 1.595 filas, diferencia aún no conciliada con R2. No se promovió ni se completó una fecha por inferencia. Detalle y pendientes en `docs/operations/remuneraciones-38bis-candidate-guards-20261002.md`; O13 y pin externo O08 siguen abiertos.

### O13 — 38 bis: conciliación y publicación guardada · 2026-10-02

- PR #696 integrado (`aaa40b38aaded5a3e40e90f3bea6fafedbcedc0c`), CI verde. Replay CSV con tope 25 MB: 17.192.134 bytes, julio 1.595 filas y checksum `a63a155ee295ebabf52db7f5aff76d144e42533cbbde5e981eb3bde0b19de350`. Diferencia exacta: 13 filas nuevas/modificadas y ocho reemplazadas; no se infieren identidades ni salidas jurídicas. Los 18 históricos se conservan.
- Verify-only 37057959135 y controles posteriores 37058216244/37058216228 success: no PUT, build Pages ni espera de frescura. Actualización real 37058336257 success; preflight cuenta 8.446.742.444 → 8.455.606.161 bytes, ocho PUT. Rollback previo: tres objetos HEAD 200. Sin backup nuevo ni datos D1.
- Pages 37058503076 y guarda 37058502868 en curso. API: regresión reproducida de nulo convertido a cero, corregida en una línea con pruebas para monto informado/cero/nulo. 92 pruebas, tipos Worker y lint sin errores. Promoción y smoke pendientes; 38 bis 2/4, O13 completo sigue abierto.

### O13 — 38 bis: smoke y límite externo · 2026-10-02 · 75 %

- Pages 37058503076 y guarda 37058502868 success; deployment `https://963686d7.cambiometro.pages.dev`. R2/Pages: mismo corte/fecha, 1.595 filas, 19 meses y 29.703 filas históricas. Dos filas corregidas coinciden con API; cuatro rutas públicas HTTP 200. Reporte de smoke en `cambiometro-audit/evidence/38bis-production-smoke-20261002.json`.
- PR #697 integrado con CI verde, preserva monto nulo en búsqueda. Preview `cf009e78-dac8-4502-90ff-c139f6164ee1` verifica siete registros reales nulos, sin datos D1. Promoción 37060149866 success al 100% con health. Smoke final: siete nulos concordantes con R2, dos montos publicados correctos, once HTTP 200. Corrección nulo/cero cerrada al 100%; no equivale a cerrar conectividad de origen.
- Run 37059321643 falla en conexión de origen en ambos intentos; cero PUT/Pages y release vigente intacto. Replay local oficial coincide con 1.595 filas/checksum R2 y devuelve `unchanged`, cero diferencias. Remoto `degraded_external`; no se afirma bloqueo IP ni se reintenta sin límite. Tres puertas cerradas; operación no se marca 100 %.

### O11 — SINIM: cierre de guarda R2-only · 2026-10-02

- PR #699 fusionado con CI verde en `b55855df64a6855d045836bef6a950cc8f02a7f9`; 28 pruebas dirigidas, tipos/lint y calendario (18 workflows) aprobados. Se eliminan preflight/materialización D1, sin tocar conector, datos ni calendario.
- Verify-only 37062175649 success: recupera y valida proyección SINIM publicada (1.440.946 bytes, SHA `ff6c62d9211e8c12cec8422f125b421799fcaf896c41bc79dd4ed87d5691c620`). Extracción y publicaciones omitidas; cero PUT y cero datos D1.
- Pages 37062412926 y guarda 37062412990 success: omiten build/promoción y espera de frescura. No cambian el release productivo. Guarda R2-only cerrada al 100 %, no el ciclo anual SINIM ni O11 completo.
- Procedimiento y límites en `docs/operations/sinim-r2-only-20261002.md`; ruta canónica conservada, cierre documental en `codex/etl-closure-record-20261002`.

### O11 — DIPRES: cierre de guarda R2-only · 2026-10-02

- PR #701 integrado con CI verde en `6955a3da1ee3d286df2c37f896863bed29134383`; 35 pruebas dirigidas, tipos/lint y calendario aprobados. D1 preflight/materialización retirados; calendario/conector/datos intactos.
- Dos objetos publicados cotejados por bytes/SHA: proyección 1.081.699 bytes, subset 46.143; total 1.127.842. Verify-only 37085144507 success desde `main`, sin extracción/PUT/datos D1. No hubo backup nuevo ni cambios de almacenamiento.
- Pages 37085281760 y guarda 37085281856 success con build/promoción/espera omitidos. Cierre 100 % de la guarda, no del ciclo presupuestario, cobertura ni O11 completo. Detalle en `docs/operations/dipres-r2-only-20261002.md`.

### O13 — 38 bis: recuperación remota comprobada · 2026-10-02 · 100 % del ciclo

- PR #703 integrado con CI verde en `7dbe71c81e775b06a53f6f1dbbf01ad8fc2dee7b`. Una línea conserva causa anidada del error; prueba roja/verde, 40 pruebas dirigidas y tipos/lint aprobados. No cambia origen/red/TLS/parser ni datos.
- Ejecución guardada única 37086353257 success: CSV oficial respondió sin fallback HTML; julio 2026, 1.595 filas, mismo SHA `a63a155ee295ebabf52db7f5aff76d144e42533cbbde5e981eb3bde0b19de350` que R2, 18 históricos conservados. `unchanged` omite PUT y no crece R2; cero datos D1/backup nuevo.
- Pages 37086505613 y guarda 37086505590 success, build/promoción/espera omitidos. El fallo anterior no se reproduce y su causa de red permanece indeterminada; conservar `cause` no se presenta como arreglo de red. 38 bis 4/4 del ciclo comprobado, no disponibilidad continua ni cobertura total; cuota confirmada por Jorge, métricas de facturación O05 y observación O15 pendientes.
- Registro en `docs/operations/remuneraciones-38bis-network-cause-20261002.md`, rama documental `codex/38bis-network-result-20261002` en la ruta canónica.

### O11 — InfoProbidad: cierre de guarda R2-only · 2026-10-03

- PR #705 integrado en `33bfacb0a17a53104217367fcf7440121f2aa334` con CI completo verde. Prueba roja/verde y 26 pruebas dirigidas; tipos, lint y calendario aprobados. Retirados preflight/materialización D1; calendario mensual, conector y datos intactos.
- Lectura acotada de manifiesto y dos objetos (736.930 bytes), con SHA/bytes concordantes. Verify-only 37106727934 success desde `main`: preparación, extracción y publicación omitidas; cero PUT, datos D1 o backup nuevo. El contador de 203 archivos es del manifiesto, no una descarga de 203 objetos.
- Pages 37106819129 y guarda 37106819187 success: build/promoción/espera omitidos. Guarda R2-only cerrada al 100 %, no el ciclo mensual, cobertura completa ni O11 conjunto. No se afirma facturación medida automáticamente.
- Cancelado sólo push `ui-only` redundante 37106727835 del mismo commit para liberar cola; CI obligatorio preservado. Procedimiento en `docs/operations/infoprobidad-r2-only-20261003.md`; rama documental `codex/infoprobidad-closure-20261003` en el worktree canónico.

### O11 — Ley 19.862: cierre de guarda R2-only · 2026-10-03

- PR #707 integrado en `d653c398c4fcedf45ee39a1b396fdab169e242d3` con CI completo verde. Dos regresiones rojas/verde; 30 pruebas dirigidas, tipos/lint y calendario aprobados. Se retiran creación/materialización D1 y su preflight/diagnóstico, sin borrar bases ni datos existentes.
- Lectura acotada de manifiesto y dos objetos estáticos, 4.907.481 bytes, con bytes/SHA concordantes. Verify-only 37108164915 success desde `main`: bridge/secret, preparación, histórico, extracción y publicaciones omitidos; cero PUT, datos D1 o backups nuevos. El contador de 203 es del manifiesto, no de objetos descargados.
- Pages 37108286931 y guarda 37108286936 success con build/promoción/espera omitidos; R2 no crece y el release no cambia. Guarda R2-only cerrada al 100 %, no ciclo mensual, cobertura, manifiesto API externo O08 ni O11 completo. No se afirma facturación medida automáticamente.
- Cancelado únicamente push `ui-only` redundante 37108150249 del mismo commit para liberar cola. Registro reproducible en `docs/operations/ley19862-r2-only-20261003.md`, rama documental `codex/ley19862-closure-20261003` en el worktree canónico.

### O11/O13 — CPLT: cierre de guarda R2-only · 2026-10-03

- PR #709 integrado en `51e11941167e6e2294bc0376b6b7b1918d2cc255` con CI completo verde. Cinco regresiones rojas antes del ajuste; 44 pruebas dirigidas, tipos, lint y calendario aprobados. Se retira el registro D1 automático del workflow y alias de finalización, sin borrar bases ni datos.
- Check-sources-only **37118857265 success** desde `main`: cuatro CSV oficiales responden; ingestas y consolidación/publicación omitidas. `changed=true` corresponde a validadores previos nulos, no a un nuevo corte demostrado. No se descargan cuerpos CSV, escriben objetos R2 ni generan backups.
- Pages **37118947771 success**: build/promoción/registro omitidos. Guarda **37118947696 success**: espera/verificación de frescura omitida. Cierre 100 % de esta guarda, no del ciclo municipal/central, cobertura ni O11/O13 conjuntos; O05, O08 y O15 permanecen separados.
- Cancelado sólo push `ui-only` redundante **37118830296** del mismo commit para liberar cola. Procedimiento en `docs/operations/cplt-r2-only-20261003.md`; rama documental `codex/cplt-closure-20261003`, worktree canónico. No se afirma facturación medida automáticamente.

### O06 — conciliación documental de matriz ETL · 2026-10-03

- Rama `codex/movimientos-matrix-20261003`, worktree canónico, desde `origin/main` (`815e60e10dd9b383108ed1f4ee4b97e44446aa67`). Se reemplaza la fila obsoleta `Por verificar / 0/4` por 3/4 (75 % operativo documentado), sin cambiar el cierre 100 % del piloto O06.
- Respaldo existente: cierre O06 del 2026-10-01, replay y 59 pruebas dirigidas, ejecución 36854416777 y controles no-op; smoke productivo y rollback por checksum. PR #681 y ejecución 36930661823 documentan anuncios contabilizados, revisión de seis enlaces pendientes, no-op y HTTP 200 de Home/Movimientos.
- No son nuevas verificaciones de producción ni garantizan cobertura retrospectiva o descubrimiento de todas las noticias. La cuarta puerta de esta matriz permanece abierta por operación/costes; O05 y O15 conservan sus pendientes. No se modifican sus porcentajes ni el avance global por esta corrección documental.
- Sólo se editan matriz, tablero y evidencia. No se despachan ETL ni cargas/auditorías R2/D1; no se cambian código, datos o diseño. La historia original se conserva.
## Orden de cierre actualizado — 2026-10-07

LM05/LM07, cotejo canónico acotado: pin público y archivo R2 exacto
concordantes por SHA256 `e3e6753b280f2535e080aa444c761ed5ea01b4103803284e6a0a55d8e3a372af`
y 108.691 bytes, dominio `2e3c65a371ffa818e5568f3dce92ef4b28e2f885aefa8b7b1e3e65a97d740965`.
Contiene 46 filas principales (10 verificadas, 35 corroboradas, una en
confirmación) y cinco señales adicionales en confirmación: 51 eventos, 45
respaldados, seis pendientes. API paginada anuncia 46 filas principales,
backend R2 completo; no dice 46 confirmaciones legales. No hay IDs duplicados
en ambos conjuntos. Home toma total/renuncias y cronología del mismo payload.
Fechas observadas en HTML: señal 30 sep, cambio efectivo 14 sep, revisión
publicada 1 oct. Una fecha de señal no sustituye la fecha efectiva ni una
ejecución no-op crea una revisión publicada nueva. El contador cliente usa
calendario de Chile y la fecha publicada más reciente, con actualización
automática; el cero inicial del HTML estático no acredita el contador tras
hidratación. Comprobación de navegador final pendiente.

LM07: ejecución programada `37473396433`, 6 oct 13:45 UTC, success; recuperó
el release R2, revisó/validó novedades y generó resumen. Sin release nuevo
acreditado; el pin observado permanece igual. Después de instalar el lock
corregido pasaron 87 pruebas en siete archivos, incluidos 34 casos del
pipeline, contadores/fechas, procedencia, finanzas y registro de fuentes.
La confirmación exacta/mismo ID se prueba con casos controlados; no se inventa
una confirmación legal real ni se garantiza descubrir toda noticia.

Control de seguridad: run `37565511264` bloqueó el PR por dos avisos de
producción. Corrección acotada del lockfile, dentro de rangos existentes:
sharp 0.35.4 → 0.35.5 (binarios/libvips asociados) y source-map-js 1.2.1 →
1.2.2. Sin `--force`, overrides ni cambios de Next/React/ETL. Avisos y notas
primarios contrastados:
https://github.com/advisories/GHSA-wq5f-xc86-pv6w y
https://github.com/advisories/GHSA-68fv-2mgg-jv7q.
Instalación congelada `npm ci --ignore-scripts`; prueba nativa WebP correcta.
`npm audit --omit=dev --audit-level=high`: cero vulnerabilidades. La auditoría
que incluye desarrollo aún informa dos moderadas y once altas; no se declara
cero para toda la cadena ni se ocultan resultados. CI/preview del lock final
pendientes antes de promover.

LM02/LM04, incremento de presentación: se distingue presupuesto inicial de
vigente y se conserva ausencia como null hasta el render; cero explícito y
per cápita cero calculable se muestran como $0. La tabla de Metodología usa
alcance, nota, estado y fecha del mismo resumen por fuente; explica que las
categorías de origen no acreditan cobertura completa ni personas únicas.
No se altera el resumen ni se agregan datos. Tres regresiones fallaron antes
del cambio; 13 pruebas dirigidas aprobaron después. Tipos front/Worker,
arquitectura estática, tokens, enlaces e innerHTML: código 0. Revisión puntual
del diff: sin consultas nuevas, dependencias, datos inventados ni cambios de
rutas/diseño. Preview del commit final pendiente; no se aumenta aún la puerta
de validación pública ni se afirma publicación productiva.

- Solicitud: añadir los pendientes del plan y cerrar primero los sencillos.
  Se desglosó la cola existente en `todo.md`, sin crear tareas nuevas ni
  reabrir los bloques cerrados. `plan.md` fija un solo preview final para el
  bloque rápido de documentación/presentación.
- Estado Git comprobado: rama `codex/low-medium-closeout-20261005`, worktree
  `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`, HEAD
  `9469da5c`; cuatro commits locales por delante del remoto. Se preserva
  `.ci-municipal-worker-candidate/`, sin seguimiento.
- GitHub: PR #715 abierto, `MERGEABLE`, head remoto
  `5d7e6833be8b08a7ad46621b9bab685808134746`. Preview 37272960580 completado
  con `success` para ese commit; no incluye los cuatro posteriores. No se
  certifica publicación productiva ni validación de esos cambios con este run.
- Por evidencia existente, LM02 pasa a 50% (cambios/pruebas locales, preview
  final pendiente), LM05 y LM06 a 25% (referencia documentada, conciliación
  completa pendiente). LM03 conserva 75% y se explicita que la cabecera sí
  fue revisada en preview escritorio/móvil. Las demás puertas no cambian.
- Sólo documentación en este incremento: sin consultas D1, cargas/borrados
  R2, despachos ETL, nuevos backups ni cambios de producción.
- Validación del incremento: `git diff --check` y todos los enlaces Markdown
  locales de los tres documentos aprobados; sólo esos tres archivos cambiados.

## Promoción y muestra original completadas — 2026-10-07

PR #715 integrado a las 03:33 UTC mediante
`a2b70c2e3d2f293f226e9d23f522ff2ff58a84bc`, con todas sus comprobaciones
verdes. Aplicación de `ef580bbf9832e7ea59a63229c8cbbd5b0057c111` idéntica
al merge; los últimos cambios sólo documentan estado/evidencia. Preview
`37566114254` success, URL inmutable `https://66f3421b.cambiometro.pages.dev`.
Build, navegador/temas/CSP y validación del export terminaron correctamente.

Promoción del mismo artefacto: `37567311188`, success; deployment
`d81c86ed-d45b-48e5-9c37-e3372d399e53`, creado 03:43:51 UTC. El inventario
del artefacto de promoción identifica el anterior productivo
`314114bc-5d69-4a91-bafc-8b871eb0d713` (6 oct, commit `de9de302`). Éste es
el rollback, no el ID nuevo que imprime la frase genérica del workflow.
La API Worker no se desplegó en este lote.

ReleaseSet público completo de preview y producción: SHA256
`619765926f22de4569ec94fba5481bb1245e9b1a07ebcf5bdd2e06d2e46c54c6` en
ambos. No se cambió un release de datos para publicar la presentación.
No hubo ingestas, nuevas copias, PUT/DELETE R2 ni consultas D1 productivas.

Render final: Tortel muestra Marisela Jiménez Cruces; O’Higgins muestra
Raquel Torres Cuevas y «Varios registros» de alcaldía agosto 2026. Cabeceras
independientes del pago, enlaces municipales y revisión documental 5 oct.
En preview a 320 px: ancho de documento 312 px, sin desborde; screenshot
de O’Higgins y escritorio Tortel revisados. Consolas warn/error vacías.
En producción se comprobaron ambos nombres, las etiquetas de alcance y
registros por período. Metodología tiene 13 filas con alcance/estado/corte y
la política de cobertura, así como selección real de últimas tres votaciones.
Home productiva muestra «Última revisión publicada» y 07 días desde la
señal del 30 sep; no se confunde con el cambio efectivo del 14 sep.

LM08: se completó el cotejo original que faltaba, sin corregir registros:

| Caso publicado | Período | Celda bruta original | Celda líquida original | Resultado del parser existente / producción |
| --- | --- | --- | --- | --- |
| Tortel, Pedro Molina Lineros, Código del Trabajo, idPagina 60749221 | 2024-06 | `0,0` | `0,0` | 0 / 0; ID `func-muni-tortel-codigotrabajo-e53749629e5a6a5f` coincide |
| Tortel, Constanza Gomez Jaramillo, Honorarios, idPagina 62406389 | 2026-05 | `781011,0` | Vacía | 781011 / null; ID `func-muni-tortel-honorarios-35747480aeefb549` coincide; incidencia `remuneracion_liquida_no_informada` |

Fuentes oficiales:
`https://consejotransparencia.cl/transparencia_activa/datoabierto/archivos/TA_PersonalCodigotrabajo.csv`
y `https://consejotransparencia.cl/transparencia_activa/datoabierto/archivos/TA_PersonalContratohonorarios.csv`.
Código oficial encontrado en las filas: MU326, Municipalidad de Tortel.
Se comprobó HTTP206 y ETag estable antes de leer cuerpos. Se rechazaron
respuestas 200 para evitar descargar el universo. Búsqueda inicial acotada
por orden de organismo, luego límites del grupo y preflight antes de leerlo.

Código Trabajo: ETag `"176d35f6c-65cecdd69ce40"`, bytes
6123282209–6124768496; 1.486.288 bytes, 4.138 filas del grupo. Honorarios:
ETag `"1f58822b1-65d008326b880"`, bytes 8006529503–8009868032;
3.338.530 bytes, 8.549 filas. Ambos segmentos incluyen límites MU325/MU327;
se filtró exclusivamente MU326 y el período/persona del caso. No se sumaron
filas ni se modificó la proyección. Incluyendo localización y una búsqueda
sin coincidencia, 100 peticiones Range / 6.445.026 bytes del origen; no son
operaciones R2 ni un barrido de los CSV de 6,29/8,41 GB. Lecturas de cabecera
incluidas. Límites por grupo: 2 MB Código Trabajo y 4 MB Honorarios.

Reproducción: solicitar cabecera 0–4095 y los dos rangos anteriores con
`Range` e `If-Range` del ETag correspondiente. **Cancelar el cuerpo antes
de leerlo si no es 206 o cambió el ETag**; no usar una descarga CSV completa.
Decodificar Windows-1252; usar `parseCpltHeader`, `getCpltCell` y
`parseCpltRecord` de `scripts/etl/cplt-personal.mjs`, filtrando MU326,
idPagina/período. Comparar los IDs y campos `remuneracion_*_mensual` del
archivo público `data/funcionarios/muni-tortel.json`. Los cuatro casos
positivos del 4 oct mantienen su fecha de comprobación histórica; esta
muestra nueva no certifica todos los pagos ni explica por qué se informó 0.
El líquido vacío no demuestra falta de pago ni permite calcular descuentos.

LM06: snapshot CGR de ReleaseSet conserva la clave/release `a8946f86...`
y SHA de proyección `eb655e75...` registrados en la matriz anterior al
fallo. API productiva confirma 528 registros disponibles, backend r2-lake,
estado parcial y cero artefactos/particiones faltantes. El candidato de
41 informes visto antes del timeout no se publicó como sustituto. CPLT
omitió ingestas/consolidación y Cámara omitió ambas publicaciones, según
pasos Actions. El job 38 bis cancelado tiene steps vacíos: no hay extracción
acreditada ni causa determinada. La consulta local inicial no encontró la
tarea por la tilde del nombre; comprobación corregida con ErrorAction Stop:
«Cambiómetro - ETL votaciones Senado», Ready, último intento 6 oct
13:27:46 CL, LastTaskResult 2147942667 (0x8007010B). Win32Exception 267:
directorio no válido. Script y working directory configurados no existen;
causa de arranque acreditada, no un rechazo externo del Senado. El script
canónico existe en el worktree vigente; no se ejecutó ni se copió al checkout
divergente. Reparación aislada/prueba sin publicación pendientes en LM06.
La tarea local de gastos Cámara tiene resultado 0 del 6 oct 06:30 CL; esto
no certifica datos nuevos. LM06 no cierra O11/O13. Diecinueve pruebas de
parser/finanzas/registro de fuentes aprobaron tras el cotejo original.

LM01–LM05, LM07 y LM09 cumplen sus cuatro puertas dentro de su alcance;
LM08 queda 75% hasta integrar esta evidencia. LM06 continúa con su
dependencia local y fusión documental. El cierre no certifica coste actual
$0, funcionamiento de todos los conectores ni cobertura universal.

## Actualización del tablero y dependencias — 2026-10-07

La cola LM01–LM09 incorpora explícitamente los pendientes O05/O08/O10/O11/
O13/O15/O16, sin duplicarlos ni volver a ejecutar bloques cerrados. Las
puertas locales nuevas elevan LM02/LM04 a 75%; snapshot SHA y navegador
productivo permiten LM05/LM07 a 75%. LM06 documental queda 50%: tabla
actualizada de ventanas y ejecuciones, no cierre operativo de todos los ETL.
LM08 permanece 50%, porque falta cotejo original de cero/faltante; no se
oculta esta dependencia para declarar 100%.

Actions consultados el 7 oct: Cámara 37473771087 y votos 37476518739
success; apoyo Senado 37339561783 success. Apoyo Cámara 37333599905
recuperó baseline validado de 4.491 filas y falló con
PERSONAL_APOYO_SOURCE_BLOCKED; publicaciones R2/estática skipped. CPLT
37351220112 canceló frescura y omitió ingestas/consolidación. 38 bis
37362307722 tiene job cancelled, conclusión failure; los logs no están
disponibles, por lo que no se atribuye causa ni publicación. InfoLobby
37347406257 schedule terminó success, pero publicación estática skipped:
no se acredita corte nuevo. Estos incidentes no invalidan una prueba
anterior, pero impiden presentarla como disponibilidad continua actual.

La guarda de seguridad del HEAD de aplicación ef580bbf pasó en CI
37566117628. CodeQL y pruebas/tipos también verdes. Preview 37566114254
en construcción; no se acredita promoción ni validación del artefacto final.
Navegador productivo: contador «7 días desde el último cambio» muestra 07,
con consola warn/error vacía. Sigue calculándose desde la última señal
publicada, no sólo desde un cese legal anterior.

Sin despachos ETL, nuevas copias, lecturas D1 ni escrituras/borrados R2.
Se conservan el checkout principal divergente y el artefacto local sin
seguimiento. Las fechas de inventario/facturación anteriores se mantienen:
no se inventa una medición de coste de hoy.

## Cierre baja/media — referencia 2026-10-05

LM03 móvil: mismo preview O’Higgins revisado a 320×760. Tras rechazar cookies opcionales, cabecera, nombre, enlace oficial y advertencia de períodos se leen en flujo vertical; viewport320/document.scrollWidth312, sin desborde horizontal. Consola warn/error vacía. Se restauró viewport original al finalizar. Verifica la cabecera compartida con el código final, no las etiquetas añadidas después. Sigue pendiente promoción productiva.

LM03 preview visual: navegador integrado abierto en `https://efc3560d.cambiometro.pages.dev/municipalidades/ohiggins/`. Cabecera muestra Raquel Torres Cuevas como autoridad documentada y enlace municipal; tarjeta salarial conserva «Varios registros» agosto 2026, sin unir remuneraciones. Screenshot de escritorio revisado y consola error/warn vacía. HTML Tortel y Metodología también HTTP200 con nombres/política esperados. Este artefacto no contiene las últimas etiquetas de lectura rápida ni selección cronológica documentada; no se utiliza para certificarlas. Verificación móvil y promoción aún pendientes.

LM04, coherencia de selección: `app/page.tsx` usa `buildLatestSenateVotes(annualVotes, 3)`. Metodología conservaba una explicación antigua de prioridad editorial por impacto/quórum. Se reemplaza por últimas tres votaciones Senado del corte disponible, énfasis central sólo visual y porcentajes fieles al registro. Prueba nueva falló antes; 16 pruebas dirigidas Metodología/Home/procedencia y tipos aprobaron después. No se cambia el selector, la votación ni su diseño. Requiere incluir en preview final junto a las últimas etiquetas municipales.

LM02, etiquetas rápidas restantes: población/presupuesto sin valor se describen «Sin dato integrado»; personal cuenta registros del período, no personas únicas. Presupuesto explícito cero se conserva en lectura rápida; ausencia permanece null antes de formatear. No se afirma que la fuente no publicó población. Prueba roja antes; ocho pruebas de procedencia/finanzas y tipos aprobaron después. Preview 37272050500 HTTP200 de Tortel/O’Higgins/Metodología contiene autoridades documentadas y política; ese artefacto no incluye esta modificación posterior, que necesitará validación final antes de promoción.

LM09, preflight real 2026-10-05 06:31 UTC: se enumeraron los cuatro buckets de la cuenta y se ejecutó el inventario existente de sólo lectura. Principal 7.432.570.998 bytes/23.536 objetos; backup 1.049.483.183/4.108; mascotas 257.752/3; multas 0. Cuenta total 8.482.311.933 bytes/27.647 objetos, 84,82311933% del techo operativo decimal de 10GB. Margen hasta 95%: 1.017.688.067 bytes; hasta 90%: 517.688.067. No es facturación mensual medida (GB-mes/picos diarios/operaciones), ni prueba de $0. Inventario cacheado principal omitía un objeto de 8.656.177 bytes; se usa el listado vivo para la decisión.

Histórico municipal sin comprimir no autorizado: sólo la proyección municipal de última fila ocupa 1.785.010.804 bytes, más que el margen a 95%; copiarla completa añadiría más que ese margen. El CSV Planta previamente medido de ~8,71GB tampoco cabe. Esto no estima el tamaño real de un histórico comprimido ni multiplica por meses una proyección de últimas filas. Una ampliación requerirá muestra de compresión/particiones, índices compactos y preflight de bytes/objetos/pico activo+rollback+staging, más cuota de operaciones/facturación del ciclo; no se ejecuta ahora. Preflight responde la viabilidad del almacenamiento bruto actual sin cargar datos ni borrar históricos. Tarifas oficiales consultadas: https://developers.cloudflare.com/r2/pricing/ (Standard: 10GB-mes, 1M Clase A y 10M Clase B gratuitos mensuales; no aplica a Infrequent Access). Listado paginado metadatos, sin cuerpos de registros, PUT, DELETE o D1. LM09 75%, pendiente fusión documental.

LM08: se reutiliza la revisión primaria de cuatro casos del 4 oct, no un nuevo cotejo universal. Consulta productiva acotada reconfirma Abel: `func-muni-tortel-planta-1c42f3a12d9a31b0`, enero 2025, bruto 468212, líquido 410021, URL CSV CPLT Planta. `completeMonthlyPayroll:false`, `countUnit:records`, `sueldoCompletoCount:null`, stats de página. Proyección inicial con nombres de propiedades incorrectos devolvió null al seleccionar; al inspeccionar el contrato real los campos `_mensual` contienen los importes anteriores: no es ausencia de dato. 16 pruebas parser/semántica/finanzas aprobadas. Los seis brutos cero y 276 líquidos nulos observados en tres archivos previos no acreditan por sí solos celdas originales; falta cotejo de esa parte de la muestra. LM08 50%, sin causas inventadas.

LM05: etiqueta Home ajustada a «Última revisión publicada», sin alterar el valor, diseño o lógica de días. La revisión publicada pertenece al release; una revisión diaria no-op posterior no se presenta como nueva publicación ni se inventa una fecha. Regresión Home roja antes del ajuste; 20 pruebas Home/movement-age aprobadas después. El preview 37272050500 ya terminó compilación y verifica navegador/temas/CSP, pero corresponde a 4f5240e4 y todavía no incluye este ajuste posterior. Se validará el commit final antes de promover.

LM05, producción observada: `/api/v1/records?source=movimientos&limit=1` responde backend R2/status complete, total/publicadas 46, última fila corroborada Jorge Olivares 2026-09-14. No incluye automáticamente las señales pendientes; no comparar ese total con total de anuncios como si fueran la misma unidad. HTML Home publica fechas 2026-09-30 (señal), 2026-09-14 (efectivo), 2026-10-01 (revisión). ReleaseSet público: dominio movimientos `2e3c65a371ffa818e5568f3dce92ef4b28e2f885aefa8b7b1e3e65a97d740965`, archivo SHA256 `e3e6753b280f2535e080aa444c761ed5ea01b4103803284e6a0a55d8e3a372af`, 108691 bytes. Ejecución sin cambios del 4 oct no equivale a nuevo release: pendiente aclarar alcance de «Última revisión» y cotejar snapshot canónico. Consultas públicas pequeñas, sin D1 ni escritura R2. No se certifica coherencia completa todavía.

LM06/CGR: inspeccionados workflow y pasos de 37025325935. El fallo ocurre en ingesta; publicación estática y confirmación quedan `skipped`. El script escribe su candidato en workspace local y prepara `publish-plan.json` sólo al final; la publicación R2 es un comando posterior al proceso que falló. Esta ejecución no alcanzó promoción. No se relanza ni modifica el conector bloqueado; cotejo productivo aún pendiente.

LM07: 34 pruebas de `scripts/movimientos-pipeline.test.mjs` y 37 de las librerías Movimientos/publicación/task-h aprobadas con Vitest. Cubren relectura diaria de pendientes, anuncio con oficial bloqueada, conservar detección, misma identidad al añadir evidencia y acto legal exacto, no confirmar mero nombre y preservar baseline. Primer intento erróneo usando `node --test` sobre suite Vitest falló por runner; se corrigió la invocación, no el código ni se omitieron pruebas. Ejecución remota diaria 37203847565 comprobada; publicación omitida. No demuestra descubrir toda noticia ni un nuevo evento real confirmado; cotejo público pendiente. LM07 50%.

LM06: consultada la última ejecución de cada flujo del calendario salvo ChileCompra; fecha/evento/resultado registrados en `etl-closure.md`. Se inspeccionaron pasos de Movimientos 37203847565 (schedule, publicación omitida) y fallo CGR 37025325935 (timeout 90 s, candidato incompleto). InfoLobby push 37272047367 sólo valida workflow: su ingesta está omitida. No se convierten estos éxitos en nuevos cortes. Pendientes: procedencia por conector, preservación ante fallo y cotejo de releases. Sin ingestas, D1 o escrituras R2.

Preview UI iniciado con commit 4f5240e4: Actions 37272050500, PR #715. Hasta la comprobación intermedia, pin/checksum del ReleaseSet, calidad semántica, agregados municipales, personal de apoyo y salud de fuentes aprobados. Build/E2E/promoción pendientes. Intento de adjuntar PR al chat rechazado por límite de 100 adjuntos; el PR sigue accesible por URL y no se eliminan adjuntos ajenos.

LM04: política pública añadida a Metodología junto a la tabla por fuente. Distingue procedencia/completitud, denominador verificable, cobertura parcial/no medida, ausencia en plataforma frente a ausencia en origen, cero/no informado y coincidencias sin identidad/causalidad/irregularidad inferidas. Regresión nueva roja antes del cambio; 20 pruebas dirigidas aprobadas después. Tipos front/Worker, enlaces, arquitectura estática, tokens e innerHTML aprobados. La política general no certifica coberturas particulares; falta revisar esos alcances y preview/promoción. LM04 50%. Compilación local iniciada, no se afirma exitosa hasta terminar.

LM02, ajuste puntual: la tarjeta «Compras y control» ya no atribuye a la fuente una ausencia que sólo se observa en nuestro conjunto integrado. Se conserva cero explícito; un contador ausente no se rellena con cero. La cifra CGR se identifica como informes integrados y no como universo completo. Regresión inicialmente roja; después 19 pruebas combinadas de procedencia/alcaldía y TypeScript aprobaron. LM02 permanece abierto para las demás etiquetas y preview; no hubo cargas R2 ni D1.

LM03: Tortel documenta a Marisela Jiménez Cruces en https://www.tortel.cl/alcaldesa/; O’Higgins documenta la elección de Raquel Torres Cuevas el 21 de agosto en https://www.municipalidadohiggins.cl/2026/08/21/concejo-municipal-de-ohiggins-elige-a-raquel-torres-cuevas-como-nueva-alcaldesa-para-completar-el-periodo-edilicio/. Consulta 2026-10-05. Se agrega autoridad documentada independiente de nómina, sin partido o remuneración inferidos. La cabecera prioriza esa evidencia y enlaza el documento; pagos históricos y selección mensual no cambian. Prueba nueva falló inicialmente; después 15/15 pruebas de `municipal-alcaldia.test.ts`, `npm run typecheck` y `npm run check:links` terminaron con código 0. Falta preview, revisión visual y promoción: 75%, no desplegado. Sin escrituras R2 ni consultas D1.

LM01: se preservó el checkout divergente y el artefacto local sin seguimiento. Se reutiliza el worktree operativo, con rama `codex/low-medium-closeout-20261005` basada en `origin/main` `de9de3023df9039849ef6ba6e6d23c6b2a13464a`. El tablero `todo.md` registra los nueve puntos autorizados y el plan define evidencia por puerta. Se añadió referencia vigente en `docs/OPERACION-WORKSPACE.md`; los documentos históricos siguen preservados. Enlaces Markdown locales y `git diff --check` aprobados. Fusión pendiente: 3/4 puertas, 75%, no 100% documental.

Línea base de corrección municipal: PR #714 fusionado; Pages `37269183824`, Worker `37269186871`, ambos exitosos. API municipal declara registros y alcance parcial, sin lecturas públicas D1. Se reutiliza como evidencia anterior, no como prueba de los nuevos puntos LM03–LM09. La ejecución CPLT `37118857265` fue `check-sources-only`: no acredita extracción/consolidación del 3 de octubre. No convertir esa ejecución verde en «nómina actualizada».

## 2026-10-07 — cierre local del reenfoque, preview aún pendiente

- Suite final: 274 archivos y 1.597 pruebas, salida 0. Tipos de frontend y Worker,
  arquitectura, tokens, enlaces e innerHTML: salida 0; ESLint de últimos cambios 0.
- Se agregaron dos expectativas primero fallidas: catálogo sin prometer una tabla
  retirada y workflow con modo sin D1; luego 12 pruebas de defendibilidad pasan.
- `audit_without_d1` conserva pruebas habituales y usa smoke de presentación con
  API interceptada. No permite afirmar que las búsquedas productivas fueron probadas.
- Sin commit promocionado, publicación editorial, consulta enviada ni R2 PUT/DELETE.
  Tablero específico: `tasks/confianza/README.md`, 71% provisional por puertas.
