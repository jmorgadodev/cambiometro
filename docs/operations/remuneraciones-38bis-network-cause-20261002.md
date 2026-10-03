# 38 bis: diagnóstico acotado de conexión remota

Ruta canónica: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`, rama `codex/38bis-network-cause-20261002` desde `origin/main`. No desplegar desde el checkout divergente en `Proyectos`.

## Evidencia y cambio mínimo

La ejecución 37059321643 falla en ambos intentos desde GitHub con `fetch failed`; el replay local del CSV oficial coincide con R2. El ETL reconstruía un `Error` sólo con el mensaje y descartaba `cause`, impidiendo distinguir DNS, TLS y timeout. No existe todavía evidencia para afirmar un bloqueo IP.

Una línea conserva `{ cause: lastError }` al agotar los mismos reintentos. No cambia URLs, red, timeout, parser, períodos, montos, guardas ni publicación. El diagnóstico queda en logs internos de Actions, no en el sitio público.

Prueba roja/verde sobre la función real, aislada en VM con fallo de red simulado: preserva error y causa anidada sin ejecutar el ETL ni consultar fuentes. 40 pruebas relacionadas, tipos aprobados y lint sin errores (advertencia preexistente `_periodo`). CI y una ejecución remota acotada pendientes; registrar aquí resultados antes de declarar una causa o solución de conectividad.

## Límite de cierre

Este cambio cierra la pérdida de diagnóstico, no la conexión remota. 38 bis permanece 3/4 (75 %) y conserva el último release válido. No reintentar en bucle ni desactivar TLS, no cambiar a local-only sin decisión expresa y no promover cero filas.
