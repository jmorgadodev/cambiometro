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

## Qué falta para cerrar, sin repetir lo anterior

1. **Acceso R2 restablecido el 13-10:** Jorge autorizó la renovación de Wrangler en su navegador. La sesión OAuth de la cuenta Jorge leyó el manifiesto correctamente; el token general de entorno era el que impedía el acceso. El runner de asesorías prioriza una credencial de datos explícita o la sesión OAuth, no ese token general. No se crearon tokens API ni se modificaron permisos automáticamente. Tres pruebas de selección de credenciales aprobadas; respuesta de autenticación capturada sólo en memoria, sin registro ni exportación de secretos.
2. Reejecutar únicamente `npm run etl:camara-asesorias:local` después de integrar el PR; no reimportar ni descargar los nueve meses cerrados. Un mes no publicado conserva el release y no demuestra una extracción completa de un mes nuevo.
3. Acreditar extracción oficial, validación, publicación cuando cambie el contenido y smoke de release/mes/subtotal en la ficha. Si el origen bloquea Chrome, documentar ese bloqueo concreto; no marcar el punto como cerrado.

**Estado del punto:** implementación y calendario preparados; operación completa bloqueada. No asignar 100% a la automatización ni a la exactitud de los datos. El corte enero–septiembre conserva su cierre independiente. No hubo despliegue de interfaz.

### Segunda ejecución real, 13-10-2026

- `2026-10-13T09:23:32Z`: con la sesión autorizada, el runner leyó manifiesto y proyección R2 y pasó la verificación canónica. Versión `2026-10-12T16-59-12-534Z`; checksum `adbccbd537e3c2126a8d649d6680395fda36d9a6a213cce58a4a2db9f1a016f4`. Los conteos del manifiesto son de personal de apoyo, no de asesorías externas.
- El descargador de Chrome se detuvo con `CAMARA_PAGE_HTTP_403:2026-10`; dejó enfriamiento hasta `2026-10-13T10:23:40.797Z`. No reintentar durante ese intervalo, evadir el bloqueo ni convertirlo en un mes vacío. **0 escrituras R2, 0 D1, 0 despliegues y 0 XLS nuevos.**
- La navegación normal en el navegador de Codex abrió la tabla oficial: mes seleccionado **octubre**, año **2026**, **0 filas observadas**. No se interpreta como cero asesorías ni como certificación de mes completo. No se redescargó enero–septiembre.
- El bloqueo vigente ya no es la lectura R2: es el canal de extracción programada de Chrome. Se solicitó a Jorge decidir si autoriza una tarea mensual de Codex con el navegador normal (consume cuota de Codex), en lugar de certificar como operativo un descargador bloqueado. No crear ese calendario alternativo ni duplicar publicadores sin su respuesta.

## Operación y reversión

- Instalación: `npm run etl:camara-asesorias:install-task`; ejecución manual: `npm run etl:camara-asesorias:local`.
- No reinstalar una tarea existente por leer una nota histórica. Comprobar `Get-ScheduledTask` y `Get-ScheduledTaskInfo` por su nombre exacto; fecha próxima no equivale a ejecución exitosa.
- Si el proceso termina abruptamente y queda `publication.lock`, confirmar primero que no existe otro runner activo. No quitarlo a ciegas; la contención del bloqueo es deliberada.
- Se puede pausar únicamente esta tarea con `Disable-ScheduledTask -TaskName 'Cambiometro - Asesorias externas Camara mensual'`. No eliminar históricos ni releases para revertir el calendario.
- Fuentes técnicas: [calendario mensual de Task Scheduler](https://learn.microsoft.com/en-us/windows/win32/taskschd/taskschedulerschema-schedulebymonth-calendartriggertype-element), [eventos de Playwright](https://playwright.dev/docs/api/class-page#page-wait-for-event), [descarga R2 con Wrangler](https://developers.cloudflare.com/r2/objects/download-objects/).
