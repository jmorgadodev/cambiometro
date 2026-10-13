# Asesorías externas Cámara — automatización mensual, 13-10-2026

## Referencia y alcance

- Worktree: `C:\Users\jorge\.codex\worktrees\advisory-ui-total\cambiometro-audit`.
- Rama: `codex/advisories-monthly-20261013`; base `origin/main` `b4b8ebbb388799116ba7bb56d7ef81202f396b66`.
- Punto 3 del [registro canónico](../../transparencia-app/docs/pendientes-verificados-2026-10-11.md). No es una auditoría nueva ni reapertura de enero–septiembre.
- Origen: [tabla nacional oficial de Cámara](https://www.camara.cl/transparencia/asesoriasexternasgral.aspx). Sólo asesorías externas 2026, meses nuevos y hasta dos por ejecución.

## Implementado y comprobado

1. Runner aislado existente con `--external-advisories`; hidrata y verifica R2 antes de importar. `--input` evita que el importador use un snapshot antiguo. Guardas de folio, monto, filas, vínculo único y período; conserva soporte, Senado e histórico.
2. Descargador existente incremental: postback confirmado, mes/año seleccionados comprobados, tabla comparada con XLS, recibo y checksum. Exportación vacía/incompleta o fallo externo no publica cero. Cache de un mes nuevo requiere recibo válido; una planilla manual sin recibo no se promueve automáticamente.
3. Publicación reutilizada: preflight de costes existente, sin D1, manifiesto comprobado otra vez antes de subir; bloqueo local compartido y no-op sin despliegue. Esto no certifica exclusión mutua con ETL remotos ni atomicidad adicional a las guardas existentes.
4. Tarea Windows creada: `Cambiometro - Asesorias externas Camara mensual`, estado `Ready`, próxima ejecución `2026-10-15T09:30:00` local; calendario día 15, `RestartOnFailure=P1D`, `Count=2`, sesión interactiva y permisos limitados. Se retiró únicamente la entrada recién creada con nombre mal codificado; el instalador la reproduce con nombre ASCII. No se tocó la tarea de personal de apoyo.
5. Cinco pruebas nuevas fallaron antes de implementar y pasaron después. La sexta prueba integra el importador con fixtures sintéticos aislados y comprueba preservación y monto cero; nunca publica datos de prueba. Total: 64 pruebas focales aprobadas, typecheck, ESLint, sintaxis Node/PowerShell y preparación aislada aprobados. CI del PR sigue siendo requisito para integrar a `main`.

## Ejecución real y bloqueo concreto

- Ejecutado `node scripts/etl-personal-apoyo-camara-runtime.mjs --external-advisories --ref=HEAD` a las `2026-10-13T08:56:33Z`, commit `973105433ce7da634b2d3107fd2e668c5d48cd66`.
- El primer `r2 object get` de `projections/personal-apoyo-v1/manifest.json` devolvió **403, código 10000, Authentication error**. Tener variables configuradas no acredita autorización para ese objeto. No se imprimieron secretos ni se pidieron credenciales nuevas.
- Por tanto no se descargó el dataset R2, no se consultaron meses con Chrome y no se generó candidato. **0 escrituras R2, 0 operaciones D1, 0 publicaciones Pages, 0 descargas XLS nuevas.** El checkout temporal y su bloqueo se limpiaron; el log persiste en `%USERPROFILE%\.cambiometro\personal-apoyo-camara\personal-apoyo-camara.log`.
- Una consulta HTTP acotada de la tabla oficial también devolvió 403. No prueba que Chrome vaya a fallar o funcionar: el runner no llegó a esa etapa. No se agregaron mecanismos de evasión.

## Cierres de acceso y canal, sin repetir lo anterior

1. **Acceso R2 restablecido el 13-10:** Jorge autorizó la renovación de Wrangler en su navegador. La sesión OAuth de la cuenta Jorge leyó el manifiesto correctamente; el token general de entorno era el que impedía el acceso. El runner de asesorías prioriza una credencial de datos explícita o la sesión OAuth, no ese token general. No se crearon tokens API ni se modificaron permisos automáticamente. Tres pruebas de selección de credenciales aprobadas; respuesta de autenticación capturada sólo en memoria, sin registro ni exportación de secretos.
2. **Canal aprobado:** Jorge autorizó la tarea mensual de Codex con el navegador normal. No volver a ejecutar el descargador de Chrome como requisito del cierre; su 403 se conserva como evidencia del canal descartado.
3. Para meses con filas, exigir tabla/exportación idénticos, validación y publicación con preflight; luego smoke de release/mes/subtotal. Sin filas observadas, conservar los releases y no certificar un corte cero. No publicar artificialmente un mes vacío para probar el publicador.

**Estado vigente:** acceso reparado, canal normal autorizado y automatización creada; ejecución real sin novedades exitosa. El primer corte nuevo no vacío debe cumplir las mismas guardas y smoke antes de publicarse; no se afirma haberlo extraído o publicado hoy. Enero–septiembre conserva su cierre independiente. No hubo despliegue de interfaz.

### Segunda ejecución real, 13-10-2026

- `2026-10-13T09:23:32Z`: con la sesión autorizada, el runner leyó manifiesto y proyección R2 y pasó la verificación canónica. Versión `2026-10-12T16-59-12-534Z`; checksum `adbccbd537e3c2126a8d649d6680395fda36d9a6a213cce58a4a2db9f1a016f4`. Los conteos del manifiesto son de personal de apoyo, no de asesorías externas.
- El descargador de Chrome se detuvo con `CAMARA_PAGE_HTTP_403:2026-10`; dejó enfriamiento hasta `2026-10-13T10:23:40.797Z`. No reintentar durante ese intervalo, evadir el bloqueo ni convertirlo en un mes vacío. **0 escrituras R2, 0 D1, 0 despliegues y 0 XLS nuevos.**
- La navegación normal en el navegador de Codex abrió la tabla oficial: mes seleccionado **octubre**, año **2026**, **0 filas observadas**. No se interpreta como cero asesorías ni como certificación de mes completo. No se redescargó enero–septiembre.
- El bloqueo era el canal de Chrome, no R2. Jorge autorizó después la tarea mensual de Codex con navegador normal y aceptó su consumo de cuota. El calendario Windows queda deshabilitado, no eliminado.

## Procedimiento mensual vigente — navegador normal

1. Trabajar sólo en `transparencia-app` del worktree indicado arriba, con `origin/main` actualizado y sin editar datos del checkout. Leer este procedimiento, no todo el historial del chat ni otros ETL.
2. Ejecutar `node scripts/etl-personal-apoyo-camara-runtime.mjs --external-advisories --advisory-plan`. Lee dos objetos R2, verifica checksum y muestra hasta dos meses nuevos de 2026. Si no hay períodos, terminar sin navegador, publicación ni alertas.
3. Abrir la tabla oficial con los controles normales del navegador de Codex. Seleccionar año/mes del plan y comprobar ambos tras el postback. No copiar cookies ni credenciales, usar stealth, sortear bloqueos o hacer solicitudes fuera de esa página. Si el mes no muestra filas, registrar sólo esa observación y no seguir a un mes posterior.
4. Para un mes con filas, obtener la tabla y exportar sólo su XLS. Conservar el original, comparar todas sus filas con el parser existente, validar conteo/folios/montos/vínculos y guardar el checksum. No sobrescribir exports previos. Pausa de cinco minutos entre descargas, nunca barrido del historial.
5. Guardar un JSON local, por ejemplo en un temporal único: `sourceUrl` exacto, `observedAt` ISO obtenido al observar, `observations: [{period: YYYY-MM, rows: número observado}]` e `imports: [{file: ruta absoluta, period, rows, checksumSha256}]`. Para tabla sin filas, `imports: []`; no crear XLS ni registros ficticios. El runner rechaza evidencia mayor de 24 horas, URL/período incorrectos, imports incompletos y checksums distintos.
6. Ejecutar `node scripts/etl-personal-apoyo-camara-runtime.mjs --external-advisories --advisory-observation=<ruta absoluta>`. Hidrata de nuevo el release vigente, aplica sólo imports validados y reutiliza preflight/publicación/promoción existentes. Sin cambios no escribe R2, consulta D1 ni dispara Pages. Si cambió el release mientras se capturaba, detener y recalcular el plan sin reimportar historia.
7. Si hubo publicación, verificar workflow y ficha/mes/subtotal/fuente contra el XLS. Registrar resultado breve aquí; notificar sólo publicación, fallo nuevo o acción humana necesaria. Guardas rojas conservan el último release.

### Calendario y prueba del canal

- Automatización app `asesor-as-externas-c-mara-mensual`, nombre **Asesorías externas Cámara mensual**, activa; día 15 a las 09:30 en el contexto local. Requiere equipo encendido y app abierta; usa cuota de Codex, no una nueva integración API pagada. [Funcionamiento local de tareas](https://learn.chatgpt.com/docs/automations?surface=app).
- Tarea Windows `Cambiometro - Asesorias externas Camara mensual`: **Disabled**, para evitar duplicar publicadores. No se eliminó ni modificó la tarea de Personal de Apoyo.
- Prueba manual del mismo procedimiento: el plan devolvió únicamente `2026-10`; tabla oficial con octubre/2026 seleccionado y cero filas observadas. Entrada local `C:\Users\jorge\AppData\Local\Temp\cambiometro-advisory-access-a0352084f63a42d79be2c17dbd8890eb\observation-2026-10.json`; observación fechada exactamente al leer el DOM.
- Ejecución con esa observación: `2026-10-13T09:42:38Z`, salida 0, `status=unchanged`, release R2 y checksum verificados iguales. **No se publicaron filas cero ni datos de prueba.** Esta prueba acredita el recorrido sin novedades; no acredita una publicación de octubre ni un corte futuro no vacío.
- 68 pruebas focales, typecheck y ESLint aprobados tras añadir el puente de observación normal. La integración requiere CI del PR #802; no reabrir enero–septiembre para probarla.

## Operación y reversión

- El calendario vigente es la automatización de la app y el procedimiento normal de arriba. El instalador Windows y el descargador anterior se conservan como alternativa **deshabilitada**, no se reinstalan ni ejecutan automáticamente.
- No reinstalar una tarea existente por leer una nota histórica. Comprobar `Get-ScheduledTask` y `Get-ScheduledTaskInfo` por su nombre exacto; fecha próxima no equivale a ejecución exitosa.
- Si el proceso termina abruptamente y queda `publication.lock`, confirmar primero que no existe otro runner activo. No quitarlo a ciegas; la contención del bloqueo es deliberada.
- Se puede pausar únicamente esta tarea con `Disable-ScheduledTask -TaskName 'Cambiometro - Asesorias externas Camara mensual'`. No eliminar históricos ni releases para revertir el calendario.
- Fuentes técnicas: [calendario mensual de Task Scheduler](https://learn.microsoft.com/en-us/windows/win32/taskschd/taskschedulerschema-schedulebymonth-calendartriggertype-element), [eventos de Playwright](https://playwright.dev/docs/api/class-page#page-wait-for-event), [descarga R2 con Wrangler](https://developers.cloudflare.com/r2/objects/download-objects/).
