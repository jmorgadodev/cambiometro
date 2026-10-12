# ETL local de Personal de Apoyo de Cámara

## Motivo y alcance

GitHub-hosted recibe HTTP 403 al consultar las fichas de `camara.cl`. El corte de Cámara se ejecuta desde la red local autorizada. El workflow remoto conserva sólo la opción manual de verificar el release vigente; el calendario de extracción es una tarea local semanal.

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

- Se volvió a ejecutar `npm run etl:personal-apoyo-camara:local` después de corregir el parser de la salida JSON de Wrangler.
- La extracción consultó las 155 fichas oficiales de diputadas y diputados: 155 correctas, 0 fallidas, todas correspondientes a septiembre de 2026.
- El candidato coincidió con el release vigente y terminó con `action: unchanged`; se conservaron 4.921 registros (1.094 de Cámara y 3.827 de Senado), checksum `e8f90b61b41b940235b09b5bda2cae431bbc2e949435317d5bbd41d8654c7f83`.
- El artefacto estático de personal de apoyo también coincidió con el release activo `7816d366e792c34d29bcdb750b8f68ed81486064d84469d29ae68f70a261d58d`, checksum `3cbb3e2463d020e04092336d2ea1373934ee2db26bd0fb74b45281f88491c883`; `updatedFiles: 0`. No se escribieron objetos nuevos en R2, no se abrió otro despliegue de Pages y D1 no se consultó ni modificó.
- El despliegue UI independiente que quedó vigente ese día usó el artefacto validado contra el `ReleaseSet`: Pages `d8e70a89-11ac-456f-8ac6-0c4bc1acb5f1` (`https://d8e70a89.cambiometro.pages.dev`), verificado contra `https://cambiometro.impulsacv.cl`. Rollback: `npm run pages:rollback -- d8e70a89-11ac-456f-8ac6-0c4bc1acb5f1`.
- La consulta exacta del 10-10 no encontró el nombre acentuado. El 11-10 se comprobó que la tarea sí existe con el nombre mal codificado indicado arriba: habilitada y en estado `Ready`, próxima ejecución 12-10-2026 a las 09:30, runner y directorio de trabajo correctos. No hay una ejecución programada previa registrada.

## Revalidación de datos de transparencia de Cámara — 10-10-2026

- El código de las fichas y ETL para asesorías externas, pasajes nacionales, instancias internacionales y audiencias no regidas por la Ley del Lobby ya existe en la rama principal. La extracción productiva de estas categorías sigue sin acreditarse.
- Se descargó y verificó el release canónico R2: generado `2026-10-10T15:47:27.726Z`, 160 diputaciones, 1.094 filas de Cámara, 3.827 de Senado y checksum `e8f90b61b41b940235b09b5bda2cae431bbc2e949435317d5bbd41d8654c7f83`. Las cuatro categorías `transparencia_camara` están ausentes en las 160 fichas; por tanto, el despliegue de la interfaz por sí solo no puede mostrar sus filas.
- La fuente oficial publica registros de asesorías, por ejemplo en la [ficha de Cámara ID 1003](https://www.camara.cl/diputados/detalle/asesoriaexterna.aspx?prmId=1003). Esto confirma que “sin datos en R2” no equivale a “sin registros en la fuente”.
- Una prueba aislada de extracción del ID 1003, con el release actual como entrada y salida temporal, fue bloqueada antes de procesar al diputado: Cloudflare devolvió desafío en la página inicial `personaldepoyo.aspx?prmId=1009`. No se generó candidato ni se escribió en R2 o Pages. No reintentar repetidamente desde esa red; la guarda `PERSONAL_APOYO_SOURCE_BLOCKED` debe preservar el release válido.
- El historial de GitHub Actions confirma el mismo fallo en `main`: ejecución `38062846897` del 10-10-2026 (15:15 UTC), además de ejecuciones fallidas del 05-10 y 28-09. Todas fallan antes de extraer, con `PERSONAL_APOYO_SOURCE_BLOCKED` en `personaldepoyo.aspx?prmId=1009`; no son fallos de validación de R2.
- El workflow GitHub `etl-personal-apoyo.yml` es manual (`workflow_dispatch`) y su opción por defecto sólo verifica el release; no constituye una programación automática de extracción. La tarea local semanal del lunes 09:30 sí está registrada; `--prepare-only` terminó con código 0 el 11-10 contra `origin/main` sin extraer ni publicar. Queda comprobar su primera ejecución programada el 12-10.
- En consecuencia, la extracción exitosa de 155 fichas registrada antes de incorporar estas cuatro páginas sólo valida el flujo anterior de personal de apoyo; no acredita la captura de las nuevas categorías. Mantenerlas como pendientes hasta obtener un candidato con estados `available` o `empty_confirmed`, verificar conteos/checksum y promoverlo con el control de presupuesto R2. No publicar `unavailable`/`unknown` como corte vacío.
- La inspección en navegador del portal oficial encontró una fuente más eficiente para **Asesorías Externas**: `https://www.camara.cl/transparencia/asesoriasexternasgral.aspx`, con filtros mes/año (2018–2026), tabla nacional (folio, asesor, monto, diputado y documentos) y botón de exportación. Preferir esta tabla/exportación como extracción primaria frente a pedir el mismo registro en cada ficha; conservar folio y asociar al ID oficial de diputado mediante el nombre publicado en el catálogo oficial, dejando sin asignación cualquier caso ambiguo.
- Las fichas oficiales individuales de pasajes nacionales y audiencias sí muestran selectores mes/año; la página de audiencias además separa oficina distrital, Valparaíso y Santiago. La fuente oficial de viajes internacionales tiene una ruta global propia (`/transparencia/ViajesextranjeroInstancia.aspx`) y una ruta de detalle individual distinta. No mezclar esas categorías ni presentar una página vacía del mes por defecto como historial completo.
- El ETL ahora recorre los meses disponibles del año configurado (por defecto, 2026) en las cuatro categorías y une cada período sin reemplazar los anteriores. La prueba unitaria confirma el parseo de selectores y la unión mensual; **la extracción productiva aún no está verificada**: GitHub/local reciben bloqueo al descargar el HTML y el release R2 sigue sin esas filas. Por ello, la ficha puede mostrar los campos y estados, pero no tiene todavía datos publicados de estas categorías. La cobertura histórica anterior a 2026 sigue sin acreditarse.
- Para asesorías externas existe además el export global mensual `https://www.camara.cl/transparencia/asesoriasexternasgral.aspx`; sigue siendo preferible para un ETL nacional eficiente si puede descargarse desde un canal autorizado. Los viajes internacionales se mantienen como “participación en instancias internacionales”, no se renombran como pasajes aéreos, porque la página oficial expone misiones/instancias y sus montos, no necesariamente el valor del ticket.

## Asesorías externas — flujo local incremental 2026

Las planillas oficiales entregadas para enero–septiembre de 2026 se validaron e incorporaron al release personal-apoyo. No significan cobertura del año completo ni se deben copiar al repositorio. El origen puede bloquear automatización remota; las descargas se ejecutan en la sesión local de Chrome y se saltan meses que ya existen.

1. Guardar los XLS oficiales en `%USERPROFILE%\Downloads\Camara de diputados\Asesorias externas 2026`, con el manifiesto `imports-2026.json`; verificar que el período del nombre y del manifiesto coincidan.
2. Cuando la tabla oficial tenga un nuevo mes, ejecutar `npm run etl:camara-asesorias:download-2026`. El navegador queda visible, respeta una pausa de cinco minutos entre descargas y guarda reintentos con enfriamiento ante HTTP 403. No dejarlo reintentando en bucle.
3. Ejecutar `npm run etl:camara-asesorias:import-2026`. El importador asigna por nombre normalizado contra el padrón oficial/histórico, exige cero vínculos ambiguos o sin asignación y reemplaza sólo los meses reimportados. Una planilla vacía no borra el corte anterior.
4. Validar el candidato y publicar el release personal-apoyo sólo en R2, con preflight y sin D1: `npm run data:publish:personal-apoyo -- --input data/personal-apoyo.json --bucket transparencia-public-data --remote --skip-d1`.
5. Tras incorporar el código a `main`, refrescar Pages con `pages-ui-refresh.yml` en modo `ui-only`; confirmar el cutover sólo después de verificar release-set, la ficha del diputado y el mes/subtotal del XLS nuevo.

Este flujo usa los XLS como extracción local oficial; no asegura que la página pública esté siempre accesible ni establece una programación automática mensual. El release vigente al 12-10-2026 contiene 378 filas de enero a septiembre; su checksum está registrado en [pendientes verificados](../pendientes-verificados-2026-10-11.md). D1 permanece fuera de este flujo.
- La inspección de la ficha oficial ID 1009 confirmó que los selectores de mes/año ejecutan `__doPostBack` (`AutoPostBack`). El ETL no enviaba `__EVENTTARGET` y reutilizaba el estado inicial en los meses siguientes; desde este cambio envía el control mensual y toma el `ViewState`/`EventValidation` de cada respuesta. El ETL también registra el motivo de cada categoría que no pueda consultar, en vez de ocultarlo. La corrección tiene prueba unitaria, pero aún no está verificada con una extracción completa: no promover ni afirmar que los datos ya aparecen hasta generar y validar un candidato oficial con las cuatro categorías.
- Guarda añadida: se comprueba el código HTTP además del HTML. Si una categoría adicional devuelve 403/429 o una página de bloqueo, se consulta una sola vez durante la ejecución y se conserva su corte previo; el personal de apoyo puede seguir. Si se bloquea la ficha principal, el ETL termina sin escribir candidato. Prueba focal: `npx vitest run lib/personal-apoyo-publication.test.ts` (23/23). Esto evita reintentos repetidos, **no** acredita ni publica las cuatro categorías faltantes.

## Reintento acotado de vía alternativa — 12-10-2026

- Se probó una sola ruta de navegador automatizado, sin ejecutar el ETL completo ni descargar archivos. `asesoriasexternasgral.aspx` respondió HTTP 200 y, al filtrar septiembre de 2026, mostró 54 filas; pasajes nacionales e instancias internacionales también respondieron 200 en una consulta puntual. Esto prueba que el contenido existe y que la tabla mensual global de asesorías es una ruta más eficiente que recorrer cada ficha.
- La vía no resultó estable para automatización: en las siguientes solicitudes el mismo portal devolvió una página de bloqueo de Cloudflare; `audiencia.aspx` devolvió HTTP 403 desde el primer intento. No se debe cambiar el ETL a Playwright basándose en una respuesta aislada ni aumentar la frecuencia de solicitudes: el barrido de 155 fichas podría quedar bloqueado a mitad de lote.
- No se generó candidato, no hubo escritura en R2 ni consulta/escritura en D1. La automatización de las cuatro categorías sigue **bloqueada externamente**.
- Siguiente paso seguro para destrabar: solicitar a la Cámara una vía estable para extracción automatizada (API, exportación periódica autorizada o allowlist del runner). Para asesorías, la alternativa manual oficial es exportar por mes/año desde `https://www.camara.cl/transparencia/asesoriasexternasgral.aspx`; el botón de exportación no se accionó para evitar descargar archivos sin confirmación. Un export recibido podrá validarse como candidato antes de cualquier promoción.
