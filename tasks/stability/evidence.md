# Evidencia de avance y cierre

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
