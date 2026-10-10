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

## Evidencia de integración

- PR #683 integrado en `main`: `7c72f77797799d53ffba992c605e6deabfeabf68`.
- Se actualizó la prueba de calendario/coste que todavía exigía cancelar Pages:
  19 pruebas aprobadas; conserva las comprobaciones de los demás workflows.
- Los seis controles CI del head `89f3344e953bdedf6ce33214bf488b321ebc0a41`
  terminaron correctamente, incluidos build/E2E y ambos jobs de calidad.
- Preview `36933142755` completado correctamente, con hidratación R2,
  verificación de bytes, build, navegador/temas/CSP y comprobación final del pin.
- Preview: https://release-pin-20261001.cambiometro.pages.dev
- Pin de inputs: `95785d19c8b77178004618d4027b4fd8f3343fa372ed3e2fc3fe644bd0c9fd5c`.
- Promoción `36934573710` completada correctamente; deployment
  `dc92888a-cd23-41ee-8a00-85f9821823f6`, https://dc92888a.cambiometro.pages.dev.
- Producción sirve el mismo `releaseSetId` del preview. HTTP 200 en Home,
  `/buscar?q=Kaiser`, `/movimientos/`, remuneraciones con Torrealba,
  `/fuentes/` y Metodología en su ruta existente `/como-funciona/`.
  `/metodologia/` no es la ruta del menú: no se crea ni cambia una ruta.
- Este smoke HTTP no declara cobertura completa ni sustituye una auditoría de
  resultados de búsqueda. Build/E2E y controles posteriores del workflow verdes.
- Continuación documental: rama `codex/pages-release-evidence-20261001`,
  mismo worktree canónico `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.

## Límites pendientes

La serialización de GitHub y la segunda lectura NO son compare-and-swap nativo.
La promoción remota de un nuevo puntero necesita escritura condicional mediante
S3 o un binding Worker permitido; no se introduce una petición REST no documentada
con `If-Match` suponiendo que el servidor la respetará.
Referencia: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/

Faltan fijar los manifiestos externos (por ejemplo,
releases de apoyo, remuneraciones y transferencias) bajo el ReleaseSet completo.
No activar un nuevo puntero R2 sin presupuesto comprobado.
O08: 50 %, O09: 50 %; estimación por hitos, no porcentaje de cobertura de datos.

Rollback de código: revertir los commits de esta rama; no se reemplazó ni eliminó
un release público. Continúan pendientes O10–O15; ChileCompra queda al final,
y O05/#671 permanece apartado por decisión del usuario.
