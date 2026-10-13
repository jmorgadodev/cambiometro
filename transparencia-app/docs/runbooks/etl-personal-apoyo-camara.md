# ETL local de Personal de Apoyo de Cámara

## Estado operativo documentado — 13-10-2026

El [registro de pendientes](../pendientes-verificados-2026-10-11.md#orden-vigente--de-menor-a-mayor-dificultad) es la cola vigente. Las notas fechadas del 10–12 de octubre de este runbook conservan evidencia histórica; sus estados, releases y propuestas no prevalecen sobre estos cierres posteriores:

- **Personal de Apoyo enero–septiembre 2026: cerrado.** Nueve cortes, 10.669 filas del historial, verificados y publicados en PR #795. El cotejo de `Inicio` de septiembre también está cerrado mediante PR #786. [Recuperación y prevención](../../../docs/operations/personal-apoyo-month-history-20261012.md). No volver a descargar estos meses ni confundir filas históricas con personas únicas.
- **Asesorías externas enero–septiembre 2026: cerrado.** Nueve planillas, 378 filas vinculadas y publicadas. La tarea mensual está registrada y el acceso R2 se reparó con autorización de Jorge. La siguiente ejecución verificó el release, pero Chrome recibió 403 en el origen; no confundir programación con extracción/publicación exitosa. Ver el modo automático de abajo.
- **Pasajes aéreos, instancias internacionales y audiencias fuera de Ley del Lobby: descartados del producto por Jorge.** No son categorías pendientes, no requieren nuevos exports ni deben bloquear el cierre de asesorías o personal.
- **Extracción programada de Personal de Apoyo: abierta.** La tarea registrada y una recuperación manual no acreditan éxito de la siguiente ejecución; el acceso HTTP al origen continúa condicionado por sus bloqueos. Conservar el último release válido.
- **No depender de una solicitud de documentos a Cámara para continuar.** Esa propuesta histórica fue descartada por Jorge; usar las tablas y exports oficiales ya identificados, sin saltarse controles de acceso ni promover un candidato incompleto.

## Motivo y alcance

GitHub-hosted recibió HTTP 403 al consultar fichas de `camara.cl`; los reintentos HTTP locales también encontraron bloqueos. El flujo está previsto para ejecución local, pero no se acredita acceso automático estable. El workflow remoto conserva la verificación manual de releases y el calendario local registrado es semanal; su mera existencia no significa que la extracción funcione.

## Ejecución

- Tarea de Windows: el nombre solicitado es `Cambiometro - ETL Personal de Apoyo Cámara local`; Windows la almacena actualmente como `Cambiometro - ETL Personal de Apoyo CÃ¡mara local` por codificación del instalador. Consultar con `Get-ScheduledTask -TaskName 'Cambiometro*'` para no instalar una segunda copia.
- Calendario: lunes 09:30, con `StartWhenAvailable` y sin instancias concurrentes.
- Comando manual: `npm run etl:personal-apoyo-camara:local` desde `transparencia-app/`.
- Instalación: `npm run etl:personal-apoyo-camara:install-task`.
- Log local: `%USERPROFILE%\.cambiometro\personal-apoyo-camara\personal-apoyo-camara.log`.

## Guardas de publicación

1. Descarga manifest y dataset vigentes de R2 y verifica checksum, período, esquema y conteos.
2. Ejecuta sólo la extracción Cámara sobre el snapshot válido. Un fallo deja intacto el release actual.
3. Si el contenido no cambió, termina sin escribir R2 ni iniciar Pages.
4. Si cambió, valida el dataset y publica con el presupuesto account-wide de R2; el puntero del manifest se activa al final. D1 se omite explícitamente.
5. Publica la entrada estática desde el candidato verificado y dispara el workflow de Pages con los controles de refresco y promoción.
6. Un fallo de Pages deja el release R2 como fuente canónica y se registra en el mismo log para reintento.

## Recuperación

- No ejecutes la extracción Cámara desde GitHub-hosted mientras la fuente responda 403 allí.
- Para validar sin extraer ni escribir datos, usa `etl-personal-apoyo.yml` con `verify_release_only=true`.
- El último release activo y sus versiones permanecen en `projections/personal-apoyo-v1/`; no borres versiones ni alteres D1 para recuperar la fuente.
- La tarea usa la sesión interactiva del usuario: Windows debe tener red, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` y `gh auth` disponibles. No crear tokens nuevos para este flujo.

## Ejecución comprobada — 10-10-2026

**Evidencia histórica:** describe el flujo y release de ese día, no el estado actual ni la cobertura del historial recuperado después.

- Se volvió a ejecutar `npm run etl:personal-apoyo-camara:local` después de corregir el parser de la salida JSON de Wrangler.
- La extracción consultó las 155 fichas oficiales de diputadas y diputados: 155 correctas, 0 fallidas, todas correspondientes a septiembre de 2026.
- El candidato coincidió con el release vigente y terminó con `action: unchanged`; se conservaron 4.921 registros (1.094 de Cámara y 3.827 de Senado), checksum `e8f90b61b41b940235b09b5bda2cae431bbc2e949435317d5bbd41d8654c7f83`.
- El artefacto estático de personal de apoyo también coincidió con el release activo `7816d366e792c34d29bcdb750b8f68ed81486064d84469d29ae68f70a261d58d`, checksum `3cbb3e2463d020e04092336d2ea1373934ee2db26bd0fb74b45281f88491c883`; `updatedFiles: 0`. No se escribieron objetos nuevos en R2, no se abrió otro despliegue de Pages y D1 no se consultó ni modificó.
- El despliegue UI independiente que quedó vigente ese día usó el artefacto validado contra el `ReleaseSet`: Pages `d8e70a89-11ac-456f-8ac6-0c4bc1acb5f1` (`https://d8e70a89.cambiometro.pages.dev`), verificado contra `https://cambiometro.impulsacv.cl`. Rollback: `npm run pages:rollback -- d8e70a89-11ac-456f-8ac6-0c4bc1acb5f1`.
- La consulta exacta del 10-10 no encontró el nombre acentuado. El 11-10 se comprobó que la tarea sí existe con el nombre mal codificado indicado arriba: habilitada y en estado `Ready`, próxima ejecución 12-10-2026 a las 09:30, runner y directorio de trabajo correctos. No hay una ejecución programada previa registrada.

## Revalidación de datos de transparencia de Cámara — 10-10-2026

**Estado histórico superado para los cortes ya incorporados.** La ausencia de asesorías que se describe abajo correspondía al release inspeccionado entonces. No representa el release publicado después mediante PR #789/#795 ni convierte las otras tres categorías descartadas en pendientes.

- El 10-10 el código de las fichas y ETL para las cuatro categorías ya existía en la rama principal, pero su extracción productiva no estaba acreditada. Esa observación es histórica; las categorías mantenidas y sus cierres posteriores figuran en el estado operativo de arriba.
- Se descargó y verificó el release canónico R2: generado `2026-10-10T15:47:27.726Z`, 160 diputaciones, 1.094 filas de Cámara, 3.827 de Senado y checksum `e8f90b61b41b940235b09b5bda2cae431bbc2e949435317d5bbd41d8654c7f83`. Las cuatro categorías `transparencia_camara` están ausentes en las 160 fichas; por tanto, el despliegue de la interfaz por sí solo no puede mostrar sus filas.
- La fuente oficial publica registros de asesorías, por ejemplo en la [ficha de Cámara ID 1003](https://www.camara.cl/diputados/detalle/asesoriaexterna.aspx?prmId=1003). Esto confirma que “sin datos en R2” no equivale a “sin registros en la fuente”.
- Una prueba aislada de extracción del ID 1003, con el release actual como entrada y salida temporal, fue bloqueada antes de procesar al diputado: Cloudflare devolvió desafío en la página inicial `personaldepoyo.aspx?prmId=1009`. No se generó candidato ni se escribió en R2 o Pages. No reintentar repetidamente desde esa red; la guarda `PERSONAL_APOYO_SOURCE_BLOCKED` debe preservar el release válido.
- El historial de GitHub Actions confirma el mismo fallo en `main`: ejecución `38062846897` del 10-10-2026 (15:15 UTC), además de ejecuciones fallidas del 05-10 y 28-09. Todas fallan antes de extraer, con `PERSONAL_APOYO_SOURCE_BLOCKED` en `personaldepoyo.aspx?prmId=1009`; no son fallos de validación de R2.
- En esa revisión se registró que el workflow GitHub era manual y verificaba el release; `--prepare-only` terminó con código 0 el 11-10 sin extraer ni publicar. Se anotó una siguiente ejecución local para el 12-10; esa anotación no acredita que haya tenido éxito. La extracción programada permanece en el punto abierto nº 4, sin volver a instalar otra tarea por confundir el registro histórico con ausencia de programación.
- En ese momento, la extracción exitosa de 155 fichas sólo validaba el flujo anterior; las cuatro categorías se consideraban pendientes. **Ese alcance fue sustituido:** asesorías enero–septiembre se incorporó y las otras tres categorías se descartaron. Se mantiene la regla de no publicar `unavailable`/`unknown` como corte vacío.
- La inspección en navegador del portal oficial encontró una fuente más eficiente para **Asesorías Externas**: `https://www.camara.cl/transparencia/asesoriasexternasgral.aspx`, con filtros mes/año (2018–2026), tabla nacional (folio, asesor, monto, diputado y documentos) y botón de exportación. Preferir esta tabla/exportación como extracción primaria frente a pedir el mismo registro en cada ficha; conservar folio y asociar al ID oficial de diputado mediante el nombre publicado en el catálogo oficial, dejando sin asignación cualquier caso ambiguo.
- Las fichas oficiales individuales de pasajes nacionales y audiencias sí muestran selectores mes/año; la página de audiencias además separa oficina distrital, Valparaíso y Santiago. La fuente oficial de viajes internacionales tiene una ruta global propia (`/transparencia/ViajesextranjeroInstancia.aspx`) y una ruta de detalle individual distinta. No mezclar esas categorías ni presentar una página vacía del mes por defecto como historial completo.
- La implementación revisada entonces recorría los meses de 2026 en las cuatro categorías y unía períodos. Su prueba unitaria no acreditaba extracción productiva: las consultas HTTP se bloquearon y el release inspeccionado carecía de esas filas. **No aplicar esa ausencia al release posterior:** asesorías y el historial de personal fueron incorporados; las otras tres categorías se descartaron. No se acredita cobertura anterior a 2026.
- Para asesorías externas existe además el export global mensual `https://www.camara.cl/transparencia/asesoriasexternasgral.aspx`; sigue siendo preferible para un ETL nacional eficiente si puede descargarse desde un canal autorizado. Los viajes internacionales se mantienen como “participación en instancias internacionales”, no se renombran como pasajes aéreos, porque la página oficial expone misiones/instancias y sus montos, no necesariamente el valor del ticket.

## Asesorías externas — modo mensual local, 13-10-2026

- Ejecutar `npm run etl:camara-asesorias:local`. El runner usa un checkout temporal de `origin/main`, verifica el manifiesto y checksum de R2 y entrega ese dataset al importador con `--input`; nunca parte del snapshot Git. Conserva personal de apoyo, Senado y los meses anteriores.
- Instalar una sola vez con `npm run etl:camara-asesorias:install-task`. La tarea `Cambiometro - Asesorias externas Camara mensual` consulta el día 15 a las 09:30, con hasta dos reintentos separados por un día ante fallo. Requiere sesión iniciada, equipo/red disponibles y las credenciales R2 existentes con permisos; no se guardan secretos en el task XML. El instalador no reemplaza tareas existentes.
- Sólo consulta meses posteriores al último publicado, hasta el mes actual en Chile; alcance 2026 y máximo dos meses por ejecución. Los XLS se guardan en Downloads, con recibo de período, conteo y checksum. No repetir enero–septiembre ni ampliar a años anteriores. Una ausencia mensual no se publica como cero.
- Chrome se ejecuta sin ventana en el modo automático. Espera el postback, verifica mes/año seleccionados, compara tabla y exportación, valida folios/montos/IDs y respeta cinco minutos **entre** descargas. Un 403/429 conserva el release, registra enfriamiento y termina; no hace un bucle de reintentos ni elude bloqueos.
- Reutiliza publicación R2 con preflight de costes y `--skip-d1`; vuelve a comprobar el manifiesto antes de publicar y detiene el candidato si cambió. Un bloqueo local evita solapar los runners de asesorías y personal de apoyo. Sin cambios no escribe R2 ni dispara Pages; si hay candidato válido, usa la publicación y promoción `data-refresh` existentes.
- **Estado observado:** tarea `Ready`, próxima ejecución 15-10-2026 09:30. Tras renovar Wrangler se leyeron y verificaron manifiesto/proyección R2; Chrome se detuvo por HTTP 403 en el origen. El navegador normal abrió octubre/2026 sin filas observadas; no es un corte cero. No se certifica publicación automática ni cobertura de octubre. El runner utiliza una credencial de datos específica si existe o la sesión OAuth renovable de Wrangler; no el token general fallido. No imprime secretos. [Registro, evidencia y pendiente exacto](../../../docs/operations/advisories-monthly-20261013.md).

## Asesorías externas — procedimiento manual incremental 2026

Las planillas oficiales entregadas para enero–septiembre de 2026 se validaron e incorporaron al release personal-apoyo. No significan cobertura del año completo ni se deben copiar al repositorio. El origen puede bloquear automatización remota; las descargas se ejecutan en la sesión local de Chrome y se saltan meses que ya existen.

1. Guardar los XLS oficiales en `%USERPROFILE%\Downloads\Camara de diputados\Asesorias externas 2026`, con el manifiesto `imports-2026.json`; verificar que el período del nombre y del manifiesto coincidan.
2. Cuando la tabla oficial tenga un nuevo mes, ejecutar `npm run etl:camara-asesorias:download-2026`. El navegador queda visible, respeta una pausa de cinco minutos entre descargas y guarda reintentos con enfriamiento ante HTTP 403. No dejarlo reintentando en bucle.
3. Ejecutar `npm run etl:camara-asesorias:import-2026`. El importador asigna por nombre normalizado contra el padrón oficial/histórico, exige cero vínculos ambiguos o sin asignación y reemplaza sólo los meses reimportados. Una planilla vacía no borra el corte anterior.
4. Validar el candidato y publicar el release personal-apoyo sólo en R2, con preflight y sin D1: `npm run data:publish:personal-apoyo -- --input data/personal-apoyo.json --bucket transparencia-public-data --remote --skip-d1`.
5. Tras incorporar el código a `main`, refrescar Pages con `pages-ui-refresh.yml` en modo `ui-only`; confirmar el cutover sólo después de verificar release-set, la ficha del diputado y el mes/subtotal del XLS nuevo.

Este procedimiento manual se conserva como alternativa y evidencia del cierre anterior; la programación está en el modo mensual de arriba, todavía sin ejecución completa acreditada. El corte comprobado el 12-10-2026 contiene 378 filas de enero a septiembre; su checksum y alcance están en [pendientes verificados](../pendientes-verificados-2026-10-11.md). D1 productivo permanece fuera de este flujo. Para un candidato manual, indicar `--input=<release-verificado.json>` y `--output=<candidato.json>` en el importador; su valor por defecto es un archivo local y no acredita vigencia productiva.
- La inspección de la ficha oficial ID 1009 confirmó el `AutoPostBack` mensual; se corrigió el envío de `__EVENTTARGET` y la actualización de `ViewState`/`EventValidation`. Su prueba unitaria no acredita por sí sola una extracción automática completa. **No exigir las cuatro categorías antiguas:** sólo las categorías mantenidas y el mes nuevo deben generar un candidato validado; la publicación manual de enero–septiembre tiene su evidencia independiente.
- Guarda documentada: se comprueba HTTP y HTML, se limitan consultas de una categoría bloqueada y se conserva su corte previo; si falla la ficha principal, no se escribe candidato. La prueba focal registrada entonces pasó 23/23. Esto acredita protección ante bloqueo, no extracción automática completa; no vuelve pendientes las tres categorías descartadas ni los cortes manuales ya publicados.

## Reintento acotado de vía alternativa — 12-10-2026

**Antecedente, no cola de trabajo:** conserva el resultado del intento de acceso. La propuesta de incorporar las cuatro categorías y pedir documentos fue sustituida por las decisiones indicadas en «Estado operativo documentado».

- Se probó una sola ruta de navegador automatizado, sin ejecutar el ETL completo ni descargar archivos. `asesoriasexternasgral.aspx` respondió HTTP 200 y, al filtrar septiembre de 2026, mostró 54 filas; pasajes nacionales e instancias internacionales también respondieron 200 en una consulta puntual. Esto prueba que el contenido existe y que la tabla mensual global de asesorías es una ruta más eficiente que recorrer cada ficha.
- La vía no resultó estable para automatización: en las siguientes solicitudes el mismo portal devolvió una página de bloqueo de Cloudflare; `audiencia.aspx` devolvió HTTP 403 desde el primer intento. No se debe cambiar el ETL a Playwright basándose en una respuesta aislada ni aumentar la frecuencia de solicitudes: el barrido de 155 fichas podría quedar bloqueado a mitad de lote.
- En ese intento no se generó candidato ni se escribió R2/D1. El acceso automático no quedó acreditado; no interpretar ese resultado como ausencia de los cortes manuales publicados después.
- Se propuso solicitar una vía estable a Cámara. **Propuesta descartada por Jorge; no hacerla dependencia del cierre.** La tabla/export oficial de asesorías por mes/año permanece identificada en `https://www.camara.cl/transparencia/asesoriasexternasgral.aspx`. Los exports ya incorporados no se vuelven a solicitar ni descargar; sólo un corte nuevo podrá validarse como candidato.
