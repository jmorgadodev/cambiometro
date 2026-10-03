# 38 bis: diagnóstico acotado de conexión remota

Ruta canónica: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`, rama `codex/38bis-network-cause-20261002` desde `origin/main`. No desplegar desde el checkout divergente en `Proyectos`.

## Evidencia y cambio mínimo

La ejecución 37059321643 falla en ambos intentos desde GitHub con `fetch failed`; el replay local del CSV oficial coincide con R2. El ETL reconstruía un `Error` sólo con el mensaje y descartaba `cause`, impidiendo distinguir DNS, TLS y timeout. No existe todavía evidencia para afirmar un bloqueo IP.

Una línea conserva `{ cause: lastError }` al agotar los mismos reintentos. No cambia URLs, red, timeout, parser, períodos, montos, guardas ni publicación. El diagnóstico queda en logs internos de Actions, no en el sitio público.

Prueba roja/verde sobre la función real, aislada en VM con fallo de red simulado: preserva error y causa anidada sin ejecutar el ETL ni consultar fuentes. 40 pruebas relacionadas, tipos aprobados y lint sin errores (advertencia preexistente `_periodo`). PR #703 integrado con CI completa verde en `7dbe71c81e775b06a53f6f1dbbf01ad8fc2dee7b`.

Ejecución guardada única 37086353257 desde `main`: success. El CSV oficial respondió sin fallback HTML; julio 2026, 1.595 filas, checksum `a63a155ee295ebabf52db7f5aff76d144e42533cbbde5e981eb3bde0b19de350`, igual a R2; 18 históricos conservados. Detecta `unchanged`, omite manifiesto/preflight/PUT. Pages 37086505613 y guarda 37086505590 success con build/promoción/espera omitidos. Cero escrituras R2/datos D1 y ningún backup nuevo.

La conectividad se recuperó en esta ejecución sin cambiar red, URL ni TLS; no se atribuye la recuperación a conservar `cause`. El fallo anterior no se reprodujo, por lo que su causa de red concreta continúa indeterminada. El diagnóstico anidado queda disponible ante un fallo futuro. Sólo se canceló el build ui-only redundante de push 37086349045; no la CI ni una promoción productiva.

## Límite de cierre

La pérdida de diagnóstico queda cerrada; la operación remota actual fue verificada. 38 bis alcanza 4/4 (100 % del ciclo probado), no disponibilidad continua ni cobertura universal. Se conserva el último release válido y el calendario mensual del día 5, 10:15 UTC. No reintentar en bucle ni desactivar TLS, no cambiar a local-only sin decisión expresa y no promover cero filas. Facturación automática O05 y observación O15 siguen pendientes.

Registro final en la ruta canónica, rama `codex/38bis-network-result-20261002`.
