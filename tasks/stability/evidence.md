# Evidencia de avance y cierre

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
