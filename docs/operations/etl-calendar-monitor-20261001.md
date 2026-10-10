# Monitor operativo diario de ETL, releases y presupuesto — O10

## Qué comprueba

Reutiliza `.github/etl-calendar.json`, sin otro calendario paralelo. Consulta
ejecuciones `schedule` y `workflow_dispatch`, no validaciones de PR. Distingue
`on_schedule`, `pending`, `failed`, `missed`, `manual` y `unknown`.
Senado votaciones sigue `paused_local_only`, sin ejecutar su conector remoto.

El cron del monitor es `0 15 * * *` UTC. La hora local varía con el horario de
America/Santiago. Se admite una gracia operativa explícita de 180 minutos para
el arranque programado; no altera las frecuencias ni autoriza datos atrasados.
Workflow `source-calendar-monitor.yml`: no usa el prefijo reservado `etl-`
porque no es una extracción. Se mantiene intacta la guarda del calendario ETL.

El parser acepta únicamente los formatos presentes en el calendario actual;
una expresión no soportada no se interpreta por aproximación. Lee como máximo
20 ejecuciones por evento y workflow: 33 peticiones GitHub para las 18 entradas
actuales. Si no encuentra ejecución reciente, no busca indefinidamente.

## Límites

El scope incorpora ejecuciones, pin estático, frescura del metadato de cada
fuente publicado por la API R2-only, salud y paridad de la API de transferencias,
y presupuesto de almacenamiento R2. No demuestra cobertura completa ni que la
fuente original esté disponible. Un release fresco sólo describe su fecha; no
certifica que incluya todos los registros del origen. Metadatos ausentes quedan
`unknown`; incoherencias internas quedan `failed_internal`.

`--release-check` consulta manifiesto R2 y pin Pages; valida checksums e IDs.
`--source-check` consulta `/api/v1/sources?r2Only=1` y `/api/v1/health`, sin
fallback a D1, y compara cantidad/fecha del manifiesto de transferencias. Cada
fuente se compara con la periodicidad del calendario canónico, con umbrales
conservadores. Fuentes sin periodicidad automática quedan `not_scheduled`;
fuentes con fecha ausente quedan `unknown`; antiguas, `stale`.

`--budget-check` reutiliza la guarda `assertRemoteR2WriteBudget` y el secreto
existente `CLOUDFLARE_DATA_API_TOKEN` con permisos de lectura. Lista metadatos de
objetos para estimar el uso total de la cuenta; no usa Cloudflare Analytics ni
solicita otro token. Bloquea al 95 % y aplica el tope operativo existente por
publicación. El total mensual acumulado de operaciones de clase A/B no está
disponible mediante esta lectura y sigue requiriendo revisión manual del panel.

No lee D1, CSV, prensa ni fuentes originales. No escribe objetos,
no despacha ETL, no despliega ni cambia punteros. Faltante/denegación de
credenciales o errores de lectura no se consideran saludables.
Sólo guarda un resumen pequeño de metadatos en Actions durante tres días;
no es un respaldo de datos. La lectura presupuestaria reutiliza la guarda de
costes sin ejecutar publicación ni eliminar objetos.

El informe diario muestra calendario, pin, estado y frescura por fuente y
presupuesto. `--sync-incidents` reutiliza el agrupador Uptime para el pin,
`/api/v1/sources` y presupuesto: un incidente agrupado por causa/ruta,
recordatorio semanal y cierre sólo tras recuperación. Tiene `issues: write`, no
`contents: write`; guarda el reporte aunque fallen controles. Sincronización
de incidentes no afirma si un error proviene del origen o del ETL: muestra el
estado comprobado y requiere diagnóstico separado.

## Reproducción

Desde `transparencia-app`, con GitHub CLI autenticado y `GITHUB_REPOSITORY`:
`node scripts/etl/calendar-monitor.mjs --release-check --source-check --budget-check --sync-incidents --output <informe-local.json>`.
Pruebas: `scripts/etl/connectors/calendar-monitor.test.mjs` y
`workers/public-api/index.test.ts`.

El modo completo hace 33 consultas GitHub, dos consultas API y las lecturas
acotadas necesarias para el inventario R2; no descarga filas ni universos. La
comprobación local de producción del 10 de octubre confirmó API R2 y paridad de
transferencias (62.172 filas y misma fecha entre fuentes y health), pero marcó
ChileCompra `stale` y cuatro fuentes con fecha `unknown`. Por eso el monitor
debe alertar; no es evidencia de que todas las fuentes estén sanas. La ejecución
productiva del nuevo workflow queda registrada una vez integrado.

PR #695 integrado en `9f751b0a2a04dca645ece7f92135332d2fe3a517`; extensión integrada mediante PR #752 (`30a5e014`), #755 (`1e12924a`) y #756 (`3587bfe8`), todos con CI verde. Ejecución final #38058804274 terminó `success`: pin estático saludable, API transferencias R2 concordante (62.172 filas), R2 86,37 % y sin duplicar incidentes. La fuente sigue marcada `stale/unknown` cuando corresponde; issue #754 lo conserva agrupado. O10 está cerrado como monitor; O11/O16 mantienen las reparaciones de las fuentes.

Ensayo local del 1 de octubre de 2026: 33 lecturas; 12 ejecuciones `on_schedule`,
3 `failed` (personal de apoyo Cámara/Senado y ChileCompra), 3 `manual`,
1 `paused_local_only`. Evidencia reproducible:
`C:\Users\jorge\Proyectos\cambiometro-audit\evidence\calendar-monitor-20261001.json`.
37 pruebas relacionadas y ESLint verdes. Los fallos de extracción no se reparan
en este bloque; quedan en O11, y ChileCompra conserva prioridad final.

Worktree: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.
Rama: `codex/etl-calendar-monitor-20261001`, desde `origin/main` tras PR #685.
