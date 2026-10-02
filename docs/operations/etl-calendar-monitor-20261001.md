# Control diario del calendario ETL — O10 parcial

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

Scope `workflow-execution-only`: éxito de Actions no demuestra extracción,
release nuevo, frescura de datos, cobertura completa, checksum o coherencia API.
Un fallo no se clasifica como interno/externo sin revisar su evidencia.
Errores de lectura quedan `unknown`, nunca se convierten en `healthy`.

Desde la ampliación del 2 de octubre, `--release-check` agrega una lectura del manifiesto R2 y otra del pin Pages. Reutiliza el verificador de promoción, valida checksums y compara IDs. `healthy` sólo significa coherencia del **conjunto estático**, no salud de cada fuente; diferencia de pin queda `stale`, lectura/checksum inválidos `failed_internal`.

No lee D1, CSV, prensa ni fuentes originales. No escribe objetos,
no despacha ETL, no despliega ni cambia punteros. El workflow utiliza el secreto de lectura de datos Cloudflare ya existente; faltante o denegado no se considera saludable.
Sólo guarda un resumen pequeño de metadatos en Actions durante tres días;
no es un respaldo de datos. Se mantienen apartadas las guardas de costes.

El informe diario muestra estados en el resumen del job. `--sync-incidents` reutiliza el plan de incidentes Uptime para `/data/release-set.json`: un incidente abierto por causa/ruta, recordatorio semanal y cierre sólo al recuperar coherencia comprobada. Se concede `issues: write`, nunca `contents: write`; se guarda el reporte incluso cuando falla el control. Faltan integrar estados/frescura por fuente, manifiestos externos/API y presupuesto: O10 no está terminado.

## Reproducción

Desde `transparencia-app`, con GitHub CLI autenticado y `GITHUB_REPOSITORY`:
`node scripts/etl/calendar-monitor.mjs --output <informe-local.json>`.
Pruebas: `scripts/etl/connectors/calendar-monitor.test.mjs`.

Ampliación: `node scripts/etl/calendar-monitor.mjs --release-check --output <informe-local.json>`; Cloudflare account/token en entorno. Añadir `--sync-incidents` únicamente al ejecutar el control autorizado de incidencias. Son 33 consultas GitHub y dos de metadatos de releases, no barridos de objetos ni descarga de filas. El control real del 2 de octubre devolvió `healthy`, dos lecturas y HTTP 200. Cuatro pruebas nuevas fallaron antes de implementar el control; no se confunde un workflow exitoso con un release vigente.

Ensayo local del 1 de octubre de 2026: 33 lecturas; 12 ejecuciones `on_schedule`,
3 `failed` (personal de apoyo Cámara/Senado y ChileCompra), 3 `manual`,
1 `paused_local_only`. Evidencia reproducible:
`C:\Users\jorge\Proyectos\cambiometro-audit\evidence\calendar-monitor-20261001.json`.
37 pruebas relacionadas y ESLint verdes. Los fallos de extracción no se reparan
en este bloque; quedan en O11, y ChileCompra conserva prioridad final.

Worktree: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.
Rama: `codex/etl-calendar-monitor-20261001`, desde `origin/main` tras PR #685.
