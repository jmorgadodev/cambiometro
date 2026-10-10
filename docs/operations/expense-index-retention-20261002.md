# Conservación del índice histórico de gastos — 2026-10-02

Rama: `codex/expense-period-index-retention-20261002`; worktree canónico `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.

## Incidente y causa

El replay incremental 37044606324 conservó los archivos históricos en el manifiesto estático, pero regeneró el índice mensual sólo desde el snapshot refrescado: cuatro meses Cámara y dos meses Senado. El manifiesto seguía referenciando 174 archivos mensuales Senado. La API sigue el índice y por ello meses históricos devolvían cero aunque sus archivos existieran. No se perdieron los objetos históricos.

El publicador ahora combina los períodos del candidato con los archivos mensuales del manifiesto R2 validado. El candidato actualiza su mes; los meses fuera de la ventana mantienen sus referencias y conteos. El ETL conserva también las filas históricas de la línea base R2 ya hidratada al reconciliar, para que el subset completo usado por las fichas incluya futuras revisiones y meses nuevos. No reconstruye ese histórico desde un snapshot Git parcial.

La reparación inmediata sólo sube un índice completo nuevo, con clave derivada de su SHA-256, y conserva el puntero mediante CAS; no descarga ni copia las filas históricas. El ciclo mensual reutiliza el subset canónico que ya descargaba su workflow.

## Reparación acotada

`node scripts/repair-expense-period-index.mjs` lee y verifica el manifiesto y su índice, reconstruye referencias y calcula el presupuesto sin escribir. Añadir `--publish` activa el índice reparado con el ETag vigente después del preflight. Un conflicto detiene la activación y requiere repetir desde la base actual. El índice anterior queda disponible para rollback.

Preflight comprobado: Senado 2 → 174 períodos, Cámara permanece en 4; 19.660 bytes de índice nuevo. Cuenta 8.446.722.782 → 8.446.742.444 bytes, bajo 9.500.000.000. No se consulta D1 ni se genera un respaldo.

Treinta y dos pruebas dirigidas, TypeScript, ESLint y scanner de activos privados aprobados. La regresión reproduce un candidato de un mes junto a un mes histórico publicado y comprueba conservación, actualización y separación de fuentes. Otras 27 pruebas de filtros/coste/gastos comprueban último período y separación entre nulo y cero.

## Cierre productivo

PR #693 integrado con CI verde en `6d7993578c321e19088dcac3c3543880dde40e78`. Reparación ejecutada con CAS y preflight: índice de 19.660 bytes; manifiesto `55e5cd98b0270f398ecf59f344fe567c0692c9b38637413c0709b54b159a666a`. Se conservaron los archivos históricos y el índice anterior, sin backup nuevo ni consultas D1.

Smoke posterior: **178/178 períodos** con HTTP 200, backend `r2-months` y conteo igual al manifiesto. Una fila por período, peticiones separadas 2,5 segundos: no descarga los universos ni acredita cada fila contra el origen. Senado tiene 174 períodos publicados (2012-01 a 2026-07), no se inventan meses ausentes; Cámara mantiene cuatro (2026-03 a 2026-06). Evidencia: `C:\Users\jorge\Proyectos\cambiometro-audit\evidence\expense-month-smoke-20261002-postfix.json`.

Pages: ejecución 37050448199 aprobada; deployment `https://a4a5369c.cambiometro.pages.dev`; ReleaseSet `92d5a447548effb98c334836c2392b419ff29961432ab7209d995b654090897e`, idéntico al manifiesto R2 vigente. Once páginas comprobadas HTTP 200, incluidas gastos y fichas de Pedro Araya/Vanessa Kaiser; ambas conservan los tres filtros anuales. Búsquedas API Kaiser/Torrealba responden con backend `r2-catalog`.

La comprobación inicial fallida se conserva en `C:\Users\jorge\Proyectos\cambiometro-audit\evidence\expense-month-smoke-20261002.json`; no se sustituye ni presenta como aprobada. Rollback: índice/puntero anterior conservados; cualquier restauración debe validar checksum y usar CAS, seguida de un data-refresh coherente, no borrar históricos.
