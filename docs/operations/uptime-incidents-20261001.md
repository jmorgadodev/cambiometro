# Incidentes del monitor existente

## Alcance

Continuación O10, sin nueva auditoría. Se reutilizan `uptime-smoke.yml` y
`uptime-smoke.mjs`: mismas rutas, frecuencia, token WAF y validaciones.
No se extraen universos, no se consulta D1 y no se escribe ni borra R2.
No se añaden backups, dependencias ni textos técnicos a la interfaz.

Preguntas operativas: ¿qué ruta falló?, ¿es un incidente ya abierto?,
¿superó después sus controles?, ¿lleva una semana sin resolverse?

## Regla de alertas

- Título estable `UPTIME: <ruta>`; también reconoce títulos anteriores con HTTP
  o TIMEOUT. Un cambio de HTTP no crea otra incidencia de la misma ruta.
- Consultar incidencias abiertas una vez por ejecución; si la consulta falla,
  devuelve un inventario inválido o alcanza 1.000 resultados, no crear a ciegas.
- Ante un fallo nuevo, crear una incidencia con URL, HTTP, duración, Ray ID y fecha.
- Repetición: silencio; recordatorio únicamente tras siete días sin actualización.
  Si había duplicados antiguos, recordar en uno solo, el actualizado más recientemente.
- Recuperación: cerrar incidencias coincidentes sólo si la ruta se comprobó y pasó
  todos sus controles (incluido JSON/conteo de Movimientos cuando corresponde).
  No declarar recuperadas rutas que no se probaron.
- Un error de sincronización de GitHub deja la ejecución fallida, sin ocultarlo.

## Respuesta

1. Revisar URL, fecha, HTTP, Ray ID y ejecución enlazada; no sustituir datos por cero.
2. Si es fallo externo, conservar el release válido. Si es un despliegue,
   revisar su pin y la evidencia de promoción antes de cualquier rollback.
3. El siguiente smoke correcto cierra la incidencia; una repetición no abre otra.

## Estado y límites

Pruebas locales cubren fallos repetidos, recordatorio semanal, recuperación,
rutas no comprobadas e inventario GitHub fallido/incompleto. Las mutaciones de
GitHub se ensayan con transporte simulado, sin abrir incidencias de prueba reales.

O10 no queda completo: falta el control diario por calendario/frescura,
coherencia entre manifiestos externos/API/Pages y presupuesto. Las guardas de
costes permanecen apartadas y la escritura condicional R2 no se activa.

Ruta de trabajo: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.
Rama: `codex/uptime-incident-grouping-20261001`, basada en `origin/main` después
de integrar la evidencia de producción del PR #684.
