# Fase 5: incremento local preparado

> Actualización 19-11-2026: los estados de publicación pendiente de este informe son históricos. La entrega #848 ya fue publicada y verificada; consultar [estado conciliado y recibo](../consolidacion/estado-fases-20261119.md). Conservar esta evidencia sin repetir extracciones o comprobaciones ya aprobadas. Los seguimientos operativos se registran en el tablero vigente.

Fecha: 18-11-2026, America/Santiago. Rama codex/movimientos-datos-local-20261118; base local d0790b5d68ef28d32e51007ee1399d87d4651e42. origin/main obtenido una vez: 915fe31ecba9a8ceb23a146352ef8bc723f56c7b. Raíz canónica comprobada y árbol inicial limpio. Hereda Personal, Dietas y Votaciones locales; no reemplaza sus cambios.

## Resultado

- Movimientos conserva un estado revisado explícitamente; añadir una URL de decreto a una fila provisional no la convierte en verificada. La clasificación corroborado se conserva como tal. La disponibilidad de un enlace y la revisión del contenido siguen siendo conceptos distintos.
- El guard de publicación conserva cada ID del corte anterior: ni siquiera reemplazar una fila por otra manteniendo el total supera la validación. Una corrección de identidad requiere reconciliación documental revisada, fuera del extractor automático; ante rechazo se mantiene el último release válido. El guard previo de descenso de conteo sigue vigente.
- La última publicación ignora fechas imposibles, sin reemplazar la fecha efectiva del evento por la fecha del documento.
- Fuentes, Datos, Calidad y Metodología distinguen automatización, cobertura y fecha publicada. Las ocho fuentes pausadas conservan sus datos y ejecución manual. El calendario .github/etl-calendar.json se consume en el servidor; no se copian sus workflow names al navegador. El monitor recibe sólo textos/estados públicos por sourceId. La cadencia antigua queda identificada como referencia.
- Senado se explica por componente: el calendario documenta los gastos y la ejecución local de votaciones debe verificarse por separado. Censo sin entrada en el calendario queda con programación no documentada; no se inventa un cron. Tener una programación no equivale a ejecución sana ni a dato reciente.
- Datos identifica las líneas pausadas como históricas a partir del mismo estado. Búsqueda con nombre accesible, categoría seleccionada con aria-pressed y campo adaptable al ancho móvil.
- Metodología documenta afiliación a la fecha del voto, resultado oficial y conservación de la última dieta oficial válida con su mes, sin imputar cero ni un pago de otro período.

## Evidencia reutilizada

Se validaron bytes y SHA256 de la captura R2 de Movimientos contra el manifiesto guardado el 2026-11-19T00:42:02.813Z. Archivo: 143126 bytes, SHA256 cb43dc1eee263d790577a377cb622913b1ebc388a9f9d30864c4755790206a17. Contiene 46 movimientos y 16 señales; última ejecución informada 2026-11-12T15:41:19.337Z, último evento 2026-11-11. El replay offline conserva identidades y no cambia evidencia pública. Esta captura no es una consulta en vivo ni acredita la siguiente ejecución.

La fixture versionada de Movimientos es anterior y no coincide con ese release. No se reemplazó ni se promovió como dato actual. Las páginas aisladas usan fixtures locales para comprobar comportamiento y disposición, no para certificar cifras actuales. Fuente de datos, período e importes de producción se hidratarán desde R2 en la entrega agrupada.

## Verificación

Tres regresiones de Movimientos fallaron antes de corregir: promoción por URL, sustitución de identidad a igual conteo y fecha imposible. Después pasan.

144 pruebas distintas en 14 archivos del módulo y sus consumidores: dos bloques de 138 y 27 pruebas con 21 compartidas; la prueba de automatización se repitió tras cambios en Senado y en la lectura del calendario. Lint de los archivos modificados, tsc --noEmit y calendario (18 workflows) correctos. No se ejecutó suite global, build completo, extracción oficial ni CI remoto.

Navegador: páginas reales renderizadas /datos, /fuentes, /datos/calidad y /como-funciona; monitor Datos hidratado con las mismas props del servidor. Escritorio 1280 y móvil 390 px; búsqueda ChileCompra, filtros de categorías y etiquetas de pausa comprobados, sin errores de ejecución ni desbordamiento horizontal de página. Next Link se sustituye por un ancla; CSS existente sin directivas Tailwind y fuentes de layout Next. Es comprobación aislada, no una preview Next completa ni regresión tipográfica de producción. Capturas y recibo: transparencia-app/artifacts/fase5/pages-verification/. El servidor y navegador se cierran al terminar.

## Pendiente de la entrega agrupada

- Actualizar los resúmenes de cobertura desde el release R2, sin confundir fixtures Git con producción. El monitor de conectores y catálogo de fuentes tienen alcances distintos; no sumar sus conteos como un universo ni afirmar actualización conjunta.
- Comprobar datos actuales y siguiente ejecución de Movimientos y votaciones locales; no habilitar crons ni cambiar calendario en este ajuste.
- Validación integrada, preview con datos de producción, PR y publicación del mismo artefacto verificado sólo cuando Jorge solicite la entrega.

Estado: preparado en local, pendiente de integración/publicación. No se declara cierre operativo.

## Comandos locales reproducibles

Desde transparencia-app: node node_modules/vitest/vitest.mjs run lib/movimientos-estabilizacion.test.ts lib/source-automation.test.ts lib/movimientos-publication.test.ts lib/movimientos.test.ts lib/movimientos-public-copy.test.ts lib/movimientos-documentary-review.test.ts scripts/movimientos-pipeline.test.mjs lib/source-registry.test.ts lib/data-quality-dashboard.test.ts lib/data-quality-summary.test.ts lib/methodology-coverage.test.ts lib/fuentes-page.test.ts lib/data-observatory.test.ts scripts/etl/connectors/release-adapters.test.mjs --configLoader native --no-cache.

Comprobación aislada opcional: node artifacts/fase5/verify-pages.mjs desde transparencia-app. Replay guardado opcional: node transparencia-app/artifacts/fase5/check-captured-release.mjs desde la raíz. Scripts, recibos y copia de la captura quedan en artifacts/fase5 (ignorados por Git), independientes del worktree anterior. No son fuentes para una publicación UI-only; ésta hidrata R2. No volver a ejecutar comprobaciones ya correctas sin cambios relevantes.

El calendario se lee sólo en el servidor por ruta de repositorio, sin importación de archivos fuera de la raíz Turbopack ni cambio de configuración Next. Si no está disponible, se declara programación no documentada.
