# Movimientos: anuncios antes de confirmación legal

Fecha: 2026-10-01.
Worktree: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.
Rama: `codex/movimientos-press-announcements-20261001`.

## Cambio y validación

- Los anuncios fechados detectados por fuentes de prensa configuradas permiten
  preparar un candidato aunque todas las fuentes oficiales estén bloqueadas.
- La falta de fuentes oficiales no convierte un anuncio en verificado: permanece
  `en_confirmacion`. Se mantienen las validaciones de candidato y presupuesto.
- Una página de prensa sin anuncios válidos no habilita esta excepción.
- Se incorpora el RSS regional de Desierto FM, comprobado HTTP 200 y XML RSS.
- La confirmación legal conserva el ID del anuncio y no incrementa el total.
- Cada ejecución relee enlaces pendientes y sus evidencias relacionadas en
  los orígenes HTTPS ya configurados; no sigue hosts desconocidos ni credenciales
  en URLs. Hasta 50 enlaces extra por día; los excesos rotan y quedan registrados
  como diferidos. Se mantienen consultas diarias a las fuentes legales existentes.
- Pruebas: `npx vitest run scripts/movimientos-pipeline.test.mjs
  scripts/etl/connectors/release-adapters.test.mjs`: 37 aprobadas.

## Límites y pendiente concreto

- No se utiliza el agregador comparado como fuente ni se publica su nombre.
- El RSS cubre su ventana reciente, no garantiza descubrir retrospectivamente
  todos los casos desde marzo. No se declara cobertura completa.
- Cristian Bravo Echeverría: se localizó el anuncio inicial y evidencia del
  sucesor; no una noticia independiente que afirme explícitamente la salida o
  el nombramiento fallido. No se añade una renuncia por inferencia.
- No hubo escrituras R2, consultas D1 ni modificación del snapshot público.
- La validación local no equivale a despliegue. Revisar CI antes de promover.
