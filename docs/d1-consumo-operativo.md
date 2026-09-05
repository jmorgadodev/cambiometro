# Control de consumo D1

## Correcciones verificadas el 5 de septiembre de 2026 UTC

El filtro de registros por entidad usa los índices de `record_subjects` y
`record_objects` para obtener primero los IDs. Query Insights mostró 5.252
filas leídas por el par COUNT/SELECT, frente a 547.062 con los EXISTS
correlacionados anteriores. Esta medición corresponde a una entidad con 750
registros; no es un presupuesto garantizado para todas las consultas.

Los listados de fuentes y el resumen compartido usan `source_state`, cuyos
conteos se generan durante el ETL. Una consulta de comprobación leyó 15 filas
y escribió cero. El total describe los conteos publicados, incluidos los
datasets servidos desde R2, y no un recuento nuevo de la tabla `records`.

Las respuestas públicas cacheadas, incluido el directorio, declaran
`X-Cambiometro-Cache: HIT`, `MISS` o `BYPASS`. Un HIT evita ejecutar el productor
de la respuesta y sus consultas D1. La copia almacenada usa una caducidad de
300 segundos compatible con Cache API. Los errores no se almacenan.
La caché es por centro de datos y URL; no equivale a una caché global.

Desde el 5 de septiembre de 2026, `GET /api/v1/records` exige al menos un
alcance (`source`, `kind`, `q`/`query`, `entity_id`, `from` o `to`). Una consulta
sin filtros ejecutaba `COUNT(*)` y una página sobre todo el histórico; ya no se
permite porque no la necesita la interfaz pública y podía consumir cientos de
miles de `rows_read` por solicitud automatizada. Las consultas paginadas por
fuente, incluidos los releases completos de R2 para ChileCompra, InfoLobby y
Contraloría, mantienen el contrato de datos y siguen disponibles.

## Vigilancia automática

`usage-watch.yml` consulta Analytics cada hora en el minuto 15 UTC, incluida
la comprobación de 00:15 UTC después del reinicio diario. Funciona en GitHub
Actions sin depender del equipo local. Los horarios de Actions pueden sufrir
demoras. Lee métricas, no filas SQL, y conserva un artefacto por ejecución.
El repositorio es público y usa un runner estándar gratuito de GitHub. La
ejecución horaria se deshabilita si el repositorio pasa a privado.
Alerta al 60% y falla al 80% de lecturas o escrituras para dejar visible el
riesgo antes del límite. El fallo del monitor no detiene automáticamente el
tráfico ni los ETL.

El secreto `WRANGLER_TOKEN` de Actions permitió consultar las métricas. El
token de la terminal local no permitió Analytics; no se debe interpretar ese
error como consumo cero. El OAuth local de Wrangler sí permitió consultar
Query Insights.

## Límites de esta corrección

`--skip-unchanged` evita materializar fuentes con checksum idéntico. Cuando
una fuente cambia, el materializador todavía reconstruye esa fuente completa.
Esto debe medirse y optimizarse antes de afirmar que toda materialización es
incremental por fila o partición. No se ejecutó un ETL remoto completo como
parte de estas pruebas de API.

Un smoke exitoso y dos métricas iguales con pocos minutos de diferencia no
prueban consumo cero: Analytics puede tener retraso. La comprobación debe
combinar respuestas funcionales, HIT de caché y Query Insights a lo largo del
tiempo. Mantener Workers Free; no activar servicios pagos para resolver una
cuota agotada.
