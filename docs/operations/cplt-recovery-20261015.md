# Recuperación municipal CPLT — ejecución autorizada 15-10-2026

## Estado vigente — 20-10-2026 (sustituye las esperas históricas de abajo)

- **Cambio de estado externo a las `2026-10-20T15:58:13.356Z`:** el mismo enlace oficial de Contrata volvió a responder HEAD **200**, ETag `"369c60d24-65e199149f340"`. El 404 de la mañana queda como evidencia histórica, no como estado vigente. Se inició únicamente `check_sources_only=true` en main `5483cd7f`, run `39453385404`; GitHub lo confirma pendiente en la cola global detrás de Pages `39451249229` activo. No cancelarlos, duplicarlos ni confundir espera con fallo. Todavía no acredita los cuatro validators ni un candidato completo; sin ingesta ni publicación.
- **Guarda interna cerrada:** PR #811 fusionado a las `2026-10-20T11:44:22Z`, main `c68f0ef6d532406a476a1ce1f93bc08617dbcae3`. Head validado `05363796b690c67e58c2031ae068f887e7e923bf`; Quality `39416330070`/`39416324667`, CodeQL `39416324676`, seguridad `39416330061` y build/E2E `39416330059` satisfactorios. No volver a implementar ni probar el alias por una orden de «continúa». Este recibo posterior al merge se conserva en la rama de trabajo; incorporarlo documentalmente al siguiente PR desde main, sin reintroducir el código ya fusionado.
- Recuperación `38847497098`, publicación Pages `38850409486` y guarda `38850409556`: **completed/success**. No están ejecutándose ni deben relanzarse. Últimas conclusiones contrastadas con GitHub; los pasos de preparación y espera de este documento son cronología histórica.
- Publicación, API, muestra original y Pages ya se verificaron el 16-10; el deploy `ui-only` de Partidos del 18-10 conservó los datos productivos. No repetir esos cotejos ni descargar otra vez las categorías.
- El alias del comprobador de frescura ya quedó integrado por #811: productor `cplt-personal-municipal-*` frente a comprobador histórico `cplt-personal-*`. No reabrirlo; el recibo superior acredita el cierre.
- Continuación: mismo worktree físico; rama `codex/cplt-freshness-close-20261020`, basada en `origin/main` `7d1b77d7`. Se conservó mediante cherry-pick únicamente el recibo documental de Partidos (`0f513a5d`), no se reintrodujo código previo al squash. Se preservan la copia local de votos hidratada y la observación semanal de apoyo; no forman parte de una nueva carga de datos.
- Validación local de la guarda: 5 pruebas focales aprobadas con Vitest del proyecto; comparación antes/después reproduce el falso cambio sin tocar entradas productivas. Revisión independiente sin bloqueos. Integración en PR #811; **prohibido lanzar ingesta como prueba**.
- Ejecución remota acotada `39415508196`, commit `9b94fe89`, con `check_sources_only=true`: terminó en fallo externo `CPLT_SOURCE_HEAD_FAILED`, no en un resultado «sin cambios». `TA_PersonalContrata.csv` devuelve **404** en ambas URLs oficiales configuradas (la segunda redirige a la primera). Un GET limitado a un byte también respondió 404 a las `2026-10-20T11:33:50.316Z`; no es sólo un rechazo de HEAD. No se encontró una URL oficial sustituta verificada. No atribuir el fallo a una migración de formato sin evidencia.
- Las otras tres categorías respondieron 200: Planta ETag `"20d861c27-65e1b0c6f1b80"` (18-10), Honorarios `"1fad6d59e-65e1a31819340"` (18-10) y Código del Trabajo `"17a7cffef-65e0695a99e80"` (17-10). Son versiones realmente distintas del release activo; no confundirlas con el falso positivo de identificadores. La comparación local contra el manifiesto actual recuperó los tres validators anteriores, con `changed=true` en cada caso. Esto no acredita disponibilidad de las cuatro categorías ni autoriza publicar sólo tres.
- Una lectura R2 de metadatos confirmó el release activo `2026-10-15T10-57-23-085Z`, **1.249.160** filas y SHA-256 `8f5233434a70bdcb7b98406d3867d91225e99f81217dff2b5aa26f7c6235f715`, igual al comprobado el 16-10. Evidencia local ignorada: `artifacts/cplt-freshness-20261020/manifest.json`. El control remoto no ejecutó ingesta, consolidación ni Pages; esta comprobación no escribió R2 ni consultó D1. Conservar el release anterior hasta recuperar y validar Contrata; no reintentar en bucle ni omitir la categoría.
- Conciliación municipal restante, separada de la recuperación ya publicada: clasificar los cambios de disponibilidad de Penco, Negrete y Macul. No declarar la auditoría nacional completa por cerrar esta guarda ni por los seis casos muestrales conciliados.
- **Siguiente acción acotada:** recuperar un enlace oficial verificado de Contrata o esperar su restablecimiento antes de un candidato de cuatro categorías. Para los tres municipios, falta evidencia original del mismo corte: el manifiesto anterior contiene filas y el de octubre declara `unavailable`; no acredita que se haya dejado de publicar, ni permite atribuir el cambio al filtro de nombres sin filas originales. No descargar universos ni cambiar filtros por hipótesis. ChileCompra permanece al final. La guarda integrada y el fallo externo no cierran esta conciliación.
- **Avance posterior 20-10:** muestras positivas de septiembre de Planta acreditan el rechazo de los tres nombres `I. Municipalidad…` por el clasificador; el punto no era admitido. Arreglo integrado por #812, main `a95982dd`, 22 pruebas focales y CI/build/E2E satisfactorios. No repetir ese diagnóstico: resta recuperación productiva completa tras disponibilidad de Contrata. [Originales, lecturas, cierre y límites](cplt-municipal-scope-20261020.md). El CSV actual no sustituye al original del corte anterior ni permite certificar conteos históricos.

## Referencia y motivo

- Worktree `C:\Users\jorge\.codex\worktrees\advisory-ui-total\cambiometro-audit`; rama documental `codex/cplt-recovery-20261015`, desde `origin/main` `7fd3e94f` (cierre de evidencia #807). No usar los checkouts divergentes ni reiniciar la auditoría del lote cerrado.
- El índice municipal activo sigue en `2026-09-15T08-08-44-566Z`, 1.243.761 registros. Manifiesto SHA-256 `9565ecd3d208e0f1dc48f0e05689aed3e7f1edd7456ab411b384d5abf7e99f04`.
- Las filas oficiales actuales y los validadores del release corresponden a cortes distintos. [Cotejo y casos precisos](municipal-source-lot-20261015.md). No cambiar meses históricos por inferencia.

## Causa operativa comprobada

- [Run programado del 05-10 `37351220112`](https://github.com/jmorgadodev/cambiometro/actions/runs/37351220112): job de frescura cancelado, sin pasos ejecutados; ingesta y consolidación omitidas. Anotación de GitHub: `The job was not acquired by Runner of type hosted even after multiple attempts`. No fue un CSV vacío ni un fallo de transformación acreditado.
- [Run del 10-10 `38087658657`](https://github.com/jmorgadodev/cambiometro/actions/runs/38087658657): comprobador satisfactorio con `changed=true`; ingesta y consolidación omitidas. Su estado verde no acredita datos actualizados ni publicación.
- Se reutiliza el workflow existente, sin modificar calendarios, permisos ni guardas, y sin crear un descargador alternativo.

## Autorización y coste antes de arrancar

Jorge autorizó explícitamente el 15-10 preparar y publicar la actualización municipal sólo con validaciones y margen gratuito, conservando el release anterior si falla. Esta autorización levanta para esa actualización la restricción de sólo lectura de la auditoría; no autoriza cobros, respaldos nuevos, eliminación del respaldo ni cargas de ChileCompra.

Panel R2 observado en Chrome autenticado antes del dispatch, ciclo **26 sep–26 oct**:

| Concepto | Lectura del panel (redondeada) |
| --- | ---: |
| Uso facturable | $0.00 |
| Operaciones Clase A | 8,53 mil |
| Operaciones Clase B | 70,14 mil |
| Almacenamiento total de cuenta | 8,72 GB |
| `transparencia-public-data` | 7,67 GB |
| `cambiometro-backups` | 1,05 GB |
| Otros buckets | 257,84 kB y un bucket vacío |

La franquicia se aplica a R2 Standard: 10 GB-mes, un millón de operaciones A y diez millones B por mes, según [precios oficiales consultados el 15-10](https://developers.cloudflare.com/r2/pricing/). El panel no predice el tamaño del candidato. No usar estas cifras redondeadas para saltarse el inventario exacto ni anunciar coste futuro garantizado.

El publicador vigente calcula inventario de todos los buckets, pico y tamaño proyectado antes de escribir; bloquea al 95% (9.500.000.000 bytes sobre el límite conservador configurado). El presupuesto de operaciones se estima por publicación. Se preservan el release activo y rollback; sólo se pueden retirar versiones de proyecciones obsoletas según el plan existente. No borrar el respaldo ni históricos protegidos para hacer pasar el presupuesto. Si el candidato no cabe, conservar producción y registrar el bloqueo, sin subir el umbral.

## Ejecución inicial terminada — publicación bloqueada de forma segura

- [Run `38711255292`](https://github.com/jmorgadodev/cambiometro/actions/runs/38711255292), creado `2026-10-15T09:12:39Z`, workflow `etl-cplt.yml`, commit `43e4e9a9eb2f46664a26d23593458201f1b5b43b` de `main`.
- Dispatch `check_sources_only=false`, categoría sin restringir: Planta, Contrata, Honorarios y Código del Trabajo. Se comprobó que no había otro run CPLT activo antes de iniciar.
- Primer job observado `in_progress`: esta vez GitHub sí asignó ejecución. No lanzar otro run por un timeout de observación o una espera de concurrencia; consultar este ID.
- Las extracciones y candidatos se preparan en GitHub, no se descarga el universo al equipo. Se reutiliza consolidación R2-only y publicación de agregados municipales; no se materializa D1 ni se hace backup nuevo.
- El bloqueo global de publicación se conserva. La reconstrucción de agregados no debe reemplazar otras fuentes por snapshots Git. Un fallo de una categoría impide finalizar el lote.

## Referencia de rollback y espera verificada

- Reconsulta del run el 15-10: frescura `success`; las cuatro ingestas siguen `in_progress`, paso `Procesar categoría oficial CPLT`. No reiniciar por ausencia de logs intermedios ni contar esta espera como fallo.
- Se conservaron sólo metadatos locales en `artifacts/cplt-recovery-20261015/` (no versionados y no subidos a R2): `baseline-manifest.json`, 542.237 bytes y SHA-256 `9565ecd3d208e0f1dc48f0e05689aed3e7f1edd7456ab411b384d5abf7e99f04`; `baseline-release-set.json`, 95.598 bytes y SHA-256 `7c375e4b9a46cf64a02438616c51905f76e4a88910cf9ed855aab4fbc1544750`. ReleaseSet `ea065664176746f276648cf07b432eb15dc412f2dec95811c99b828264cf1d98`. No se descargó una copia del universo ni se hizo un simulacro de restauración productiva.
- El manifiesto activo declara 1.880 assets / 1.784.671.811 bytes: 1.521.346.397 en proyecciones municipales y 263.103.536 en páginas/filtros de búsqueda, más otros metadatos. Es el tamaño anterior, no la medida del candidato en proceso.
- Lectura orientativa adicional de `catalog/v1/storage.json`: 4.990.586 bytes, SHA-256 `1eca13d19a456326b791a9479c43b3cb739bcd40bce96e86c6ca2adadcc51ebb`, 23.627 objetos / 7.657.161.852 bytes del bucket principal. Sólo registra una versión de `funcionarios-v1`, la activa de septiembre (1.881 objetos / 1.785.010.804 bytes). **Es inventario cacheado, no un preflight en vivo** y no incluye por sí solo todos los buckets.
- Con el almacenamiento redondeado del panel, otro release del tamaño anterior podría no caber bajo el 95%; no se presume que haya una versión municipal vieja que se pueda eliminar. Esperar el tamaño real y el inventario en vivo del publicador. Si bloquea, preservar el release y el respaldo, registrar bytes exactos y abordar la representación del candidato sin volver a extraer las fuentes.
- La ejecución exitosa anterior de septiembre tardó aproximadamente 1 h 46 min, incluida consolidación. Es antecedente de duración, no ETA ni razón para cancelar la ejecución actual.

## Criterio para cerrar la recuperación

### Categorías terminadas (no equivale a publicación)

| Categoría | Evidencia de preparación | Estado |
| --- | --- | --- |
| Código del Trabajo | Job `116343094515`, finalizado `2026-10-15T10:26:53Z`; ingesta informa 215.036 registros válidos y checksum `53a496207c925c7d8903f3fa56f29ac05209d374d1aa18ed151825371b58bc88`. Artefacto `11964528532`, 14.898.797 bytes, SHA-256 ZIP `6885388876a1af5befcd328bb8a6d2ab18e62ecf6bcf6eb963b79c9733a5a940`; retención del workflow 2 días. Consultado mediante API de logs del job, sin descargar el artefacto al equipo. | `success`, pendiente de consolidación y publicación del lote completo |
| Planta | Job `116343094481`, `success`; ingesta informa 259.096 registros válidos y checksum `e0ec835f25855d67d0dfb16c3a0f8ac9361ba42770e29b1a4c66eb2b145fbdb8`. Artefacto `11967095451`, subido `2026-10-15T10:39:10Z`, 20.303.926 bytes; SHA-256 ZIP `8fc78db5f1734911fc2eec4c3496805dfa4a9e1655da92758554efe0d2d187f9`. | `success`, pendiente del lote completo |
| Contrata | Job `116343094455`, `success`; ingesta informa 240.514 registros válidos y checksum `8565f7a39f4121bd2e1a0050d67cc05e9ffc1d3d3af0228d17a7ae63a0df6035`. Artefacto `11966733957`, subido `2026-10-15T10:57:27Z`, 18.774.072 bytes; SHA-256 ZIP `357927b47f8a548647df0846e6fe609d189ed7f2a3b704d9b3a43d506fdf9292`. | `success`, pendiente de publicación |
| Honorarios | Job `116343094637`, `success`; ingesta informa 534.514 registros válidos y checksum `3e49ccfd3f045499b8597502bc45fec31ac07c24632c2f6a50bbce7a76cabe34`. Artefacto `11964981469`, subido `2026-10-15T10:35:52Z`, 56.648.479 bytes; SHA-256 ZIP `6729a261808579b76f2d50f49de54ecd882d514dd854d522bc3e03841ed2ffe0`. | `success`, pendiente del lote completo |

Los registros válidos son la unidad declarada por el ETL de esa categoría, no personas únicas ni un porcentaje de cobertura nacional. El checksum informado por la ingesta y el del ZIP son evidencias distintas; no confundirlos con el checksum del manifiesto productivo, todavía anterior.

### Recuperación del bloqueo de tamaño — 16-10, aún sin promover

- Run `38711255292`: `completed/failure`. Las cuatro categorías terminaron; finalizador `116384972366` falló el `2026-10-15T11:02:50Z` antes de escrituras con `R2_WRITE_BLOCKED_AT_95_PERCENT`: pico **10.494.225.164 bytes**, proyectado **10.488.692.341**, límite configurado **10.000.000.000**, umbral efectivo **9.500.000.000**. No subir ese umbral ni borrar respaldos para continuar.
- Artefactos verificados por API como no vencidos el 16-10: vencen el **17-10 entre 10:26:49Z y 10:57:23Z**. Recuperarlos en GitHub; no descargar el universo al equipo ni repetir las cuatro extracciones mientras existan.
- Corrección en la misma rama `codex/cplt-recovery-20261015`: almacenar las proyecciones municipales nuevas como `.json.gz`, con checksum y tamaño tanto comprimidos como originales. No cambia campos, períodos, identidades ni montos; central conserva su representación. La hidratación materializa JSON verificado para los consumidores locales y repara el caché local; la API admite releases anteriores sin comprimir y nuevos comprimidos. No cambia diseño.
- El workflow existente recibe `resume_run_id`: omite frescura/extracción y valida productor del mismo repositorio, workflow oficial, `main`, evento permitido, run fallido terminado, cuatro jobs exitosos y cuatro artefactos no vencidos. Rechaza recuperar sobre un corte municipal publicado después de iniciar el productor. Se mantienen concurrencia global, preflight de todos los buckets y publicación de agregados existentes.
- Pruebas de regresión reprodujeron el rechazo de la API a la proyección comprimida y la ausencia del contrato de recuperación antes de corregir. Pruebas focales cubren bytes originales, cero/nulo, checksum corrupto, límite de descompresión, compatibilidad de búsqueda gzip anterior, reparación del caché, publicación local sintética sin red y rechazo de productor/categorías/artefactos inválidos. No son prueba de publicación real ni de cobertura nacional.
- **Orden obligatorio siguiente:** CI y revisión → integrar → comprobar/subir y promover la versión compatible del Worker → ejecutar `etl-cplt.yml` en `main` con `resume_run_id=38711255292` → confirmar preflight real, API, agregados, Pages y coste. Si vuelve a bloquear, conservar los releases, no reiniciar la extracción ni declarar cerrado el punto.

### Integración comprobada y continuación operativa — 16-10

- PR [#808](https://github.com/jmorgadodev/cambiometro/pull/808), integrado `2026-10-16T03:27:29Z`; `main` **`649c8de8082081bac42530831eb29bb67b3ed062`**. Todos los checks del head `b17e62acc52b158870642dffd6a56a35f3a0d5ec` completados satisfactoriamente; build/E2E [run `38844956902`](https://github.com/jmorgadodev/cambiometro/actions/runs/38844956902). Suite local: 295 archivos / 1.792 pruebas; auditoría de dependencias productivas sin vulnerabilidades. Revisión independiente sin hallazgos bloqueantes.
- Compatibilidad de ejecución corregida antes de integrar: `github-script@v7` usa Node 20; el subproceso Wrangler usa `node` del PATH instalado por `setup-node` 22, no el ejecutable interno de la acción.
- **Mismo worktree físico; rama de continuación tras squash: `codex/cplt-recovery-verify-20261016`, basada en ese `origin/main`.** La rama anterior contiene los commits previos al squash; no forzar fast-forward, resetearla ni utilizar el checkout divergente de Proyectos.
- Panel R2 autenticado consultado antes de recuperación (registro `2026-10-16T03:21:23Z`): ciclo 26 sep–26 oct, **$0.00**, Clase A **8,87 mil**, Clase B **71,1 mil**, cuenta **8,73 GB**, principal **7,68 GB**, respaldo **1,05 GB**. Cifras redondeadas; sigue siendo obligatorio el inventario exacto antes de publicar.
- Worker candidato [run `38845613009`](https://github.com/jmorgadodev/cambiometro/actions/runs/38845613009) iniciado automáticamente desde ese commit. Aún pendiente de resultado/promoción y de recuperación del lote: no equivale a datos municipales publicados.

### Worker compatible — candidato validado

- Run `38845613009`: `success`; versión **`3f3b2568-a7da-4f7e-80bd-6dfbf1dc4385`**, commit `649c8de8…`, 40,86 KiB gzip / arranque 3 ms. Evidencia de versión: artefacto GitHub `12022943222`, SHA-256 ZIP `2f60bc3dcd45a97651ed85f117a8db25f1a3ef58e01de354618c37376aaa275a`.
- Smoke del preview de esa versión: `/api/v1/funcionarios?scope=municipal&limit=1` devuelve 200, total anterior 1.243.761, `r2-search`; consulta acotada Adela Ananahat devuelve 2 registros/200; `/api/v1/sources` devuelve 200. No se descargó el universo ni se consultó D1.
- Rollback de código observado en el panel autenticado, fila activa al 100% y banner: **`8d2015f7-c10f-4d12-a5f9-2e0c771c8b24`**, candidato del commit `cd26c28a94ed2713fe00d911448433a7d94792af`. El OAuth local no tiene permiso para listar deployments Workers; se consultó el panel, sin cambiar permisos ni pedir tokens nuevos. La promoción se hace con el workflow existente y sus secretos ya autorizados.
- Promoción solicitada una sola vez mediante [run `38845892527`](https://github.com/jmorgadodev/cambiometro/actions/runs/38845892527), sobre `main` `649c8de8…`, ID exacto `3f3b2568-a7da-4f7e-80bd-6dfbf1dc4385`. Esperar su conclusión y smoke de Route, no confundir upload con promoción.
- Si tras activar proyecciones comprimidas fuera necesario volver al Worker anterior, **restaurar primero el manifiesto municipal anterior y los punteros/Pages correspondientes**, comprobar que sus assets originales siguen presentes y sólo entonces revertir el Worker. No mezclar lectores anteriores con un manifiesto nuevo incompatible. El JSON anterior conservado localmente es referencia pequeña de rollback, no respaldo nacional nuevo.
- Promoción `38845892527`: **success**, Route aplicada y health confirmado `2026-10-16T03:32:11.395Z`. Smoke productivo posterior: municipal 200 / 1.243.761 / corte septiembre y central 200 / 2.092.412 / corte septiembre, ambas `r2-search`; todavía sin actualización municipal. El mensaje automático del workflow que llama rollback al ID recién promovido **no es el rollback anterior**: usar el ID anterior documentado arriba y respetar el orden datos→código.

### Recuperación en curso — no reiniciar ni declarar publicada

- [Run `38846055739`](https://github.com/jmorgadodev/cambiometro/actions/runs/38846055739), dispatch `2026-10-16T03:32:49Z`, `main` `649c8de8082081bac42530831eb29bb67b3ed062`, `check_sources_only=false`, `resume_run_id=38711255292`.
- Se comprobó antes del dispatch que no existía otro run CPLT activo. Esta corrida recupera los cuatro artefactos; el resultado, presupuesto exacto y propagación siguen pendientes.

### Detención por regresión local identificada — sin activar manifiesto

- Durante `38846055739` se comprobó una omisión de #808: el reconstructor de agregados selecciona únicamente `muni-*.json` locales; dejar sólo gzip en el lake recién generado podía hacer ganar el snapshot Git anterior. La copia raw de entrada estaba en otra ruta, no considerada por ese selector.
- Se detuvo **sólo este run** por ese hallazgo concreto, no por timeout de observación. La cancelación normal no detuvo el job protegido con `always()`; se solicitó `force-cancel` y se comprobó estado terminal `cancelled` antes de cualquier reintento.
- Manifiesto R2 leído tras detener: **sigue `2026-09-15T08-08-44-566Z`, 1.243.761 registros, SHA-256 `9565ecd3d208e0f1dc48f0e05689aed3e7f1edd7456ab411b384d5abf7e99f04`**. No se alcanzó la publicación de agregados ni se activó el manifiesto nuevo. No afirmar cero objetos candidatos escritos hasta revisar el log; los objetos aislados no equivalen a activación.
- Corrección mínima en `codex/cplt-recovery-verify-20261016`: conservar JSON raw **sólo local**, con exactamente las filas publicables, fuera de los assets y del plan R2; sigue publicándose únicamente gzip. La prueba integrada reprodujo la selección errónea y después verificó que el selector elige el release nuevo y que la copia local no se sube.
- El job conserva `always()` para dependencias omitidas, pero añade `!cancelled()` para respetar cancelaciones explícitas. Mantener productor original **`38711255292`**; no usar el run de recuperación cancelado como productor, porque no tiene las cuatro ingestas. Reanudar únicamente tras integrar esta corrección y confirmar los cuatro artefactos vigentes.

### Recuperación corregida activa — referencia para continuar sin repetir

- PR [#809](https://github.com/jmorgadodev/cambiometro/pull/809) integrado `2026-10-16T03:50:08Z`, `main` **`aad2521f8e4fd10e4f093720d596fd5648af8148`**; todos los checks del head `350427d6f75e0ec9e0fdf802dd4db1898d33ad79` aprobados, incluido build/E2E `38846825552`. Revisión independiente y 36 pruebas focales aprobadas.
- Rama de cierre documental tras squash: **`codex/cplt-recovery-close-20261016`**, en el mismo worktree físico. Código productivo del Worker no cambió en #809: no volver a subirlo/promoverlo por esta corrección local.
- **Único run de recuperación vigente: [38847497098](https://github.com/jmorgadodev/cambiometro/actions/runs/38847497098)**, creado `2026-10-16T03:50:14Z`, basado en `aad2521f…`, `resume_run_id=38711255292`, sin nueva ingesta. Inicialmente pendiente del bloqueo global compartido con Pages. Consultar este ID; no reiniciar por timeout de observación ni usar `38846055739`, ya cancelado.
- Pendiente: conclusión real del run, bytes exactos del preflight, nuevo manifiesto, casos API, agregados, Pages/ReleaseSet, panel de coste y disponibilidad del rollback. El punto 6 sigue abierto; una publicación sólo del Worker no cierra la actualización municipal.

### Publicación municipal R2 comprobada — Pages aún pendiente

- Manifiesto activo **`2026-10-15T10-57-23-085Z`**, SHA-256 **`8f5233434a70bdcb7b98406d3867d91225e99f81217dff2b5aa26f7c6235f715`**; 1.249.160 registros de entrada/publicados, 0 exclusiones por período. Planta 259.096; Contrata 240.514; Honorarios 534.514; Código del Trabajo 215.036. API productiva municipal: 200, `r2-search`, mismo total y fecha del manifiesto. Central conserva 2.092.412 registros y su corte anterior; no se republicó.
- 1.872 assets / **359.116.087 bytes**. Las 320 proyecciones municipales comprimidas ocupan **109.772.225 bytes** y conservan **1.522.817.844 bytes originales** verificados. Metadatos pequeños guardados localmente en `artifacts/cplt-recovery-20261015/published-manifest-20261016.json`; no se descargó el universo.
- Lectura acotada de un gzip municipal, con validación de ambos checksums/tamaños y cotejo API por ID: Adela Ananahat `f96d3fc1a272750b`, octubre 2025, bruto 1.300.000 / líquido null; Adela Novoa `c2623ebc3fb90483`, julio 2025, 1.300.000 / null. El segundo caso ahora coincide con el período individualizado en el CSV actual, no se modificó por inferencia.
- Adelina `4c3371554b49f732`: R2/API actuales coinciden en abril 2025, bruto 700.146 / líquido **0**, distinto del null servido por el release anterior. Esto prueba coherencia de las capas actuales, **no individualiza por sí solo la celda CSV original** ni acredita una mensualidad completa. Mantener pendiente esa comprobación original, sin confundir 0 con null.
- Alcance real del manifiesto: **320 comunas con registros, 25 sin registros observados y 1 no aplicable**. Penco, Negrete y Macul cambian de `available` a `unavailable` respecto de septiembre. No afirmar cobertura nacional completa ni que esas municipalidades pagaron cero; falta explicar esos tres cambios mediante evidencia de origen antes de cerrar toda la conciliación municipal.
- El finalizador continúa con hidratación/reconstrucción de agregados. No declarar aún publicada la nueva versión de Pages, ni cerrado el punto 6.
- **Comprobación original posterior de Adelina cerrada:** lectura acotada del CSV Planta, mismo ETag del release, `2026-10-16T04:24:27.649Z`, 3 solicitudes / 2.008.192 bytes. ID exacto y abril 2025: bruto literal `700146,0`, líquido literal **`0,0`**, parser/R2/API 700.146 / 0. No era una celda vacía; no inferir mensualidad completa ni sueldo vigente. [Rango, checksum de ventana/línea y alcance](municipal-source-lot-20261015.md#continuación-cerrada-del-caso-plantaabril--16-10-2026). Este dato supera únicamente la limitación de procedencia de esa fila descrita arriba, no acredita exactitud nacional.

### ETL concluido y Pages automático activo

- **Run `38847497098`: `completed/success`**, incluido publicar agregados municipales. El log confirma que el reconstructor seleccionó el directorio de la versión nueva, **320 archivos no vacíos / 1.249.160 registros**, no el snapshot Git antiguo.
- Preflight de nóminas, inventario de toda la cuenta: **8.725.030.646 bytes antes; 9.084.762.151 proyectados; 9.090.295.187 de pico**. Preflight posterior de agregados: **9.084.762.151 antes; 9.132.019.699 proyectados; 9.132.112.123 de pico**. Ambos bajo 9.500.000.000; no se subió el umbral ni se escribió un respaldo nuevo.
- Referencia de rollback: el inventario publicado tras nóminas conserva los **1.880 assets anteriores con sus tamaños**; lectura directa del índice original de septiembre verifica su tamaño y SHA-256 contra el manifiesto guardado. El inventario cacheado no sustituye un listado en vivo ni acredita todos los checksums ni un simulacro completo de restauración. Se conserva el manifiesto anterior local pequeño y el procedimiento datos→código.
- **Pages activo: [run `38850409486`](https://github.com/jmorgadodev/cambiometro/actions/runs/38850409486)**, creado automáticamente `2026-10-16T04:23:56Z` tras el ETL; job de build `116810195767`, hidratando el CPLT nuevo. **Guarda posterior: [run `38850409556`](https://github.com/jmorgadodev/cambiometro/actions/runs/38850409556)**. No relanzar ETL ni Pages por un timeout de observación: consultar esos IDs y esperar sus resultados reales. Falta smoke de Pages/ReleaseSet y panel final de costes.

1. Comprobar resultado real de las cuatro categorías y consolidación; no basta con el primer job verde.
2. Registrar preflight exacto y versión/checksum/conteos del manifiesto efectivamente publicado. Si la guarda bloquea, registrar ese resultado y conservar el release anterior, sin llamarlo actualización completa.
3. Verificar el nuevo corte en API y páginas afectadas, incluidos los IDs del lote cero/no informado; comprobar que no se convirtieron vacíos en cero ni se fusionaron variantes nominales.
4. Comprobar propagación de los agregados y ReleaseSet de Pages con los flujos existentes; el éxito del ETL no equivale por sí solo a un build publicado.
5. Volver al panel de R2 al finalizar: almacenamiento, operaciones y uso facturable. Documentar rollback disponible y pendientes exactos.

Esta recuperación no equivale a conciliación nacional fila por fila. El punto 6 permanece abierto mientras falten sus verificaciones; ChileCompra sigue al final. No repetir los seis cotejos cerrados para llenar una espera del run.
