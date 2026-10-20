# Personal de Apoyo Cámara: ejecución semanal incremental

## Referencia y causa

- Worktree de operación: `C:\Users\jorge\.codex\worktrees\advisory-ui-total\cambiometro-audit`, aplicación `transparencia-app`.
- Rama del cambio: `codex/camara-support-schedule-20261013`, base `93126c08`; código probado `fd913e5e`.
- Cambio y controles de integración: [PR #804](https://github.com/jmorgadodev/cambiometro/pull/804). No omitir controles rojos ni promover datos para simular el cierre.
- La tarea Windows `Cambiometro - ETL Personal de Apoyo CÃ¡mara local` apuntaba al worktree de estabilización antiguo y tenía `LastTaskResult=1`. El descargador HTTP encuentra bloqueos del origen. No reinstalarlo ni repetir 155 fichas.
- Jorge autorizó sustituirla por navegador normal en Codex, lunes 09:30, zona America/Santiago. Se usa cuota Codex; no se crean tokens API. El equipo y la aplicación deben estar encendidos: [documentación oficial](https://learn.chatgpt.com/docs/automations?surface=app).
- Automatización creada y comprobada: `personal-de-apoyo-c-mara-semanal`, `ACTIVE`, lunes 09:30. Tarea Windows comprobada `Disabled`, conservada para trazabilidad. Asesorías externas no se modificó.

## Procedimiento único para cada ejecución

1. Desde la aplicación del worktree indicado, ejecutar `node scripts/etl-personal-apoyo-camara-runtime.mjs --support-plan`. El ejecutor recupera `origin/main`, crea un worktree temporal aislado, lee sólo los dos objetos canónicos de Personal de Apoyo y verifica sus conteos/checksum. No toma Git como datos productivos. Si la sesión Wrangler vence, solicitar renovación; no usar el token general fallido.
2. El plan contiene como máximo dos meses posteriores al último mes disponible, únicamente 2026 y nunca futuros. Si está vacío, terminar sin cambios. Tras completar diciembre, pausar esta tarea; no ampliar a otro año sin autorización.
3. Abrir únicamente la [tabla general oficial](https://www.camara.cl/transparencia/personalapoyogral.aspx) con navegador normal. Seleccionar el año/mes del plan y verificar los valores seleccionados después del postback. Comprobar tabla y encabezados: Distrito, Diputado, Nombre, Cargo, Sueldo, Inicio, Tipo (conservar también Cese, SERVEL y Trabaja además para).
4. Si la tabla correcta tiene cero filas de datos, registrar **sin filas observadas**, no un período certificado vacío. Detener el lote; no probar el siguiente mes ni reemplazar el último corte.
5. Si hay filas, guardar sólo la tabla renderizada completa del mes nuevo, sin scripts ni estado de autenticación, como HTML UTF-8 terminado en `</table>`. Usar un directorio nuevo dentro de `C:\Users\jorge\Downloads\Camara de diputados\Personal de apoyo 2026`, sin sobrescribir originales. Si la herramienta limita la respuesta, obtener fragmentos por rango de filas de la misma tabla y exigir coincidencia con el total DOM: nunca importar `[Truncated]`. No descargar meses ya incorporados ni eludir bloqueos.
6. Guardar una observación JSON en ese mismo directorio con `sourceUrl`, `observedAt` ISO real, `observations: [{period, rows, headers}]`, `imports: [{period, rows, file, checksumSha256, source, captureFormat: "rendered-table-rows", retrievedAt}]`. `file` es sólo el nombre del HTML dentro del directorio; `source` es la URL oficial exacta. `imports` queda vacío si no hay filas. No reutilizar observaciones de más de 24 horas.
7. Ejecutar `node scripts/etl-personal-apoyo-camara-runtime.mjs --support-observation=<ruta-absoluta-observacion.json>`. Los imports se generan sólo desde entradas validadas. El importador existente verifica captura, checksum, filas/montos, duplicados y vínculos inequívocos contra Open Data Cámara; preserva todos los meses/metadatos, asesorías y Senado. Obtiene el catálogo oficial si no existe en ese directorio; ante fallo conserva el release. No inventar aliases ni atribuciones.
8. Sólo candidatos válidos distintos pasan por la publicación existente, su preflight de coste R2, `--skip-d1`, comprobación de que el release no cambió durante la captura, publicación estática y Pages. Si una guarda falla, no forzarla. El lock compartido evita superposición con asesorías. Un error de Pages conserva el marcador de reintento; no extraer de nuevo el histórico.
9. Si publicó, comprobar el workflow y la ficha (mes, filas, subtotal y enlace fuente), así como checksum/release servido. Registrar aquí resultado y evidencia exacta. Avisar sólo una publicación, fallo nuevo o acción humana necesaria; sin novedades, silencio.

## Evidencia del 14-10-2026

- Plan real `fd913e5e`, 06:25:50 UTC: `support-plan` con `2026-10`, salida 0.
- Tabla seleccionada octubre/2026 observada a `2026-10-14T06:26:34.658Z`: encabezados correctos y cero filas de datos. No se descargó histórico ni se afirmó corte cero.
- Observación local: `C:\Users\jorge\AppData\Local\Temp\camara-support-20261014-observation.json`.
- Ejecución real 06:26:59 UTC: salida 0, `unchanged`, fuente `camara-support`.
- Release preservado: checksum `adbccbd537e3c2126a8d649d6680395fda36d9a6a213cce58a4a2db9f1a016f4`; 244 IDs, 1.645 filas actuales Cámara y 3.827 Senado. No son personas únicas ni el total del histórico.
- Cero escrituras R2, cero D1 y cero despliegues en esta ejecución. Las lecturas fueron dos objetos por invocación, no un inventario masivo.
- Pruebas: planificación incremental, observación vacía/malformada, fuente/fecha/encabezados incorrectos, captura truncada e importador real con 500 filas sintéticas. Se preservan meses, metadatos, asesorías y Senado. Los fixtures no son datos oficiales ni se publican.
- 47 pruebas focalizadas aprobadas; typecheck, arquitectura estática, enlaces y sintaxis de scripts aprobados. Integración remota del PR requerida antes de considerar entregado el código.

## Estado y criterio pendiente

No confundir implementación con operación futura acreditada. El punto 4 no llega al 100% sólo por crear un calendario o probar manualmente `unchanged`. Resta una ejecución programada observada y una promoción válida de un mes oficial nuevo, con smoke y sin pérdida de meses. La ausencia actual de filas de octubre es condición externa; no se fabrica un candidato ni se republica septiembre para simular ese cierre.

La recuperación enero–septiembre (#795) sigue cerrada y no se repite. Preview público (#5), municipalidades y ChileCompra están fuera de este cambio. Rollback operativo: pausar sólo esta automatización; conservar el release activo. No reactivar el descargador HTTP antiguo como si estuviera reparado.

**Continuación sin bucles:** esta espera externa queda a cargo del calendario, no de nuevas auditorías manuales. Ante «continúa», avanzar al punto 5 de la cola, salvo que exista un corte oficial nuevo, una ejecución programada por registrar o una regresión identificada. No repetir la consulta de octubre ni las verificaciones de enero–septiembre sólo para producir otro informe igual.

## Ejecución programada observada — 19-10-2026

- Automatización `personal-de-apoyo-c-mara-semanal`; runner desde la app canónica, base aislada `origin/main` `7d1b77d74392559ae84e91bb4afe17e5cf000001`. Plan real 2026-10-19T12:30:47.683Z: sólo `2026-10`, salida 0.
- Navegador normal, fuente general oficial: tras el postback se verificaron mes `10` / octubre y año `2026`. A `2026-10-19T12:32:11.024Z`, encabezados oficiales presentes y **sin filas observadas**. No se certifica un corte cero ni se consulta noviembre.
- Observación: `C:\Users\jorge\AppData\Local\Temp\camara-support-20261019T123211024Z-observation.json`, `imports: []`. Sin descarga de HTML ni repetición del histórico.
- Runner de observación: salida 0 a `2026-10-19T12:32:34.590Z`, `status: unchanged`, fuente `camara-support`. Release verificado y preservado: checksum `adbccbd537e3c2126a8d649d6680395fda36d9a6a213cce58a4a2db9f1a016f4`, 244 IDs, 1.645 filas actuales Cámara y 3.827 Senado (5.472 filas, no personas únicas).
- Cuatro lecturas de objetos R2 entre plan y observación, sin inventario masivo; sin escrituras R2, D1 ni despliegue Pages. Sin fallo nuevo ni intervención requerida: ejecución silenciosa.
- Queda acreditada una ejecución programada; el punto 4 **sigue abierto** hasta promover y verificar un corte oficial nuevo. Mantener el calendario y no repetir manualmente este resultado para simular avance.
