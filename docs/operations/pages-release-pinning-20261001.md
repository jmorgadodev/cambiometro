# O08/O09: pin estático y serialización de publicaciones

Worktree: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.
App: `transparencia-app`. Rama: `codex/pages-release-pinning-20261001`,
desde `origin/main` con #681 y #682 integrados. No usar el checkout divergente.

## Implementación

- `hydrate-static-site-inputs.mjs --release-set-file ...` valida checksum del
  manifiesto y bytes de cada input; no permite emitir un pin desde hidratación parcial.
- Pages hidrata el manifiesto fijado al inicio, incluso con caché exacta. Si el
  archivo local coincide, no descarga nuevamente el objeto; un snapshot Git
  o caché antiguo no sustituye esos bytes.
- El artefacto contiene `out/data/release-set.json`, con alcance expresamente
  `static-site-inputs`; no representa todo el lago ni cobertura de cada fuente.
- Antes de promover se lee nuevamente el manifiesto R2 y se rechaza un pin
  diferente. Artefactos viejos sin pin requieren reconstrucción; no se omite el gate.
- Los tres flujos Pages comparten la cola de los publicadores estáticos;
  `cancel-in-progress: false` protege el activo, y `queue: max` conserva pendientes.
  El cambio de ChileCompra es únicamente esa línea de cola: no se ejecuta ni
  modifica su conector, datos, cobertura o prioridad final.

GitHub documenta que la cola predeterminada sustituye un pendiente y que
`queue: max` admite más pendientes:
https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax

## Validación local

77 pruebas relacionadas aprobadas, ESLint, Node syntax y diff sin errores.
Incluye anuncio/confirmación de Movimientos, checksum/bytes/pin, candidato
concurrente obsoleto, guardas de 19 workflows y tres gates de Pages.
No se han escrito ni borrado objetos R2 ni consultado D1 en esta implementación.

## No cerrar aún

La serialización de GitHub y la segunda lectura NO son compare-and-swap nativo.
La promoción remota de un nuevo puntero necesita escritura condicional mediante
S3 o un binding Worker permitido; no se introduce una petición REST no documentada
con `If-Match` suponiendo que el servidor la respetará.
Referencia: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/

Faltan validar CI/preview/producción y fijar los manifiestos externos (por ejemplo,
releases de apoyo, remuneraciones y transferencias) bajo el ReleaseSet completo.
No activar un nuevo puntero R2 sin presupuesto comprobado.
O08: 40 %, O09: 30 %; estimación por hitos, no porcentaje de cobertura de datos.

Rollback de código: revertir los commits de esta rama; no se reemplazó ni eliminó
un release público. Continúan pendientes O10–O15; ChileCompra queda al final,
y O05/#671 permanece apartado por decisión del usuario.
