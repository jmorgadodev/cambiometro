# Auditoría de consumo D1 — 5 de septiembre de 2026

## Estado observado

El workflow `Watch GitHub Actions Usage & Billing` (`33980663597`) reportó:

- `rows_read`: `4.676.009 / 5.000.000` (`93,52%`).
- `rows_written`: `488 / 100.000` (`0,49%`).
- Base principal `3731487c-ed6b-401e-a33d-7ecf15bfd229`: `4.611.041` filas leídas.
- Base secundaria `ac3f2912-8e25-4b58-82c6-ec14a27825c7`: `64.968` filas leídas y `488` escritas.

La alerta es una métrica de uso de Cloudflare, no una consulta ejecutada por
el propio monitor. El workflow consulta GraphQL Analytics y no ejecuta SQL en
D1.

## Medidas activas

- Transferencias, funcionarios, entidades, búsqueda y registros grandes usan
  R2 como camino público principal.
- El preflight del ETL omite materialización D1 cuando la cuota alcanza el
  umbral de seguridad (`60%`); R2/Pages continúan sin publicar datos parciales.
- Las consultas de relaciones y cruces ancladas a una entidad ya tienen una
  ruta R2-first en la rama `codex/d1-r2-relations`; D1 queda sólo como
  respaldo si el índice R2 no está disponible.
- El bundle del Worker después del cambio mide `165,29 KiB` (`30,31 KiB` gzip),
  por debajo del límite de `1 MiB`.

## Pendiente antes de cerrar el consumo D1

1. Comparar el uso D1 después del próximo reset UTC. No ejecutar
   `materialize-d1` manualmente mientras el preflight esté sobre el umbral.
2. Confirmar que las rutas globales `/api/v1/relations` y `/api/v1/crosses`
   rechazan consultas sin alcance con HTTP 400, y que las consultas ancladas
   continúan respondiendo desde el índice R2.

## Criterio de costo

No se recomienda actualizar el plan Workers para resolver esta alerta. La
operación permanece dentro del nivel gratuito si los ETL de baja frecuencia
materializan sólo cambios y las lecturas públicas siguen el camino R2-first.

## Actualización posterior — Worker promovido y guardia por fuente

El PR que evitó el `COUNT(*)` completo para consultas paginadas por una sola
fuente pasó todos los checks y se integró en `main` como `c5e27d1`. La versión
`ec5d1cce-d02b-4ff4-8f69-3c6a6f66a8b0` se promovió al 100% mediante el workflow
`33993243005`; rollback exacto:

```bash
npx wrangler rollback ec5d1cce-d02b-4ff4-8f69-3c6a6f66a8b0 \
  --name cambiometro-public-api
```

La nueva ruta usa `source_state.record_count` y una sola página de `records`
para `source=...`, sin cambiar la respuesta pública. El bundle medido es de
166,21 KiB (30,69 KiB gzip), frente al límite de 1 MiB.

La medición posterior (`usage-watch`, run `33993326516`) quedó en 5.877.827
rows_read (117,56%) y 488 rows_written (0,49%). El exceso pertenece al ciclo
ya consumido; no se puede corregir retroactivamente. La prueba de capacidad
queda para el siguiente reinicio UTC: se debe repetir la consulta de fuente y
observar que el crecimiento corresponda a la página solicitada, no al
histórico completo.

La auditoría productiva adicional confirmó 12 fuentes en estado `connected`
desde el inventario R2. El endpoint de `records` para Cámara devolvió 200,
pero mientras dura el agotamiento D1 declara `temporarily-unavailable`; no es
un 5xx ni una pérdida del release. ChileCompra continuó respondiendo desde R2.

## Actualización 6 de septiembre — protección contra scans globales

El monitor de cuota observó `53.544.561` filas leídas frente a `5.000.000`
(`1070,89%`) en el ciclo ya consumido. El origen operativo identificado fueron
consultas globales de relaciones/cruces que podían ejecutar `COUNT(*)` y
ordenamiento sobre el universo completo. El Worker productivo
`362fd90a-ab0a-4303-9d75-c617ad47d271` ahora devuelve `400
RELATION_SCOPE_REQUIRED` antes de tocar D1 cuando falta `entity_id` o `from_id`.
Las consultas ancladas siguen respondiendo desde R2; el bundle queda en
`166,21 KiB`.

El exceso del ciclo anterior no puede revertirse. La prueba definitiva de
normalización queda después del próximo reinicio UTC, observando una consulta
global rechazada y una consulta anclada atendida por R2 sin crecimiento masivo
de `rows_read`.

## Resultado del probe posterior al reinicio — 6 de septiembre

El workflow `d1-post-reset-probe` (`34011982954`) terminó `success` después del
reinicio UTC:

- Rows read: `1.211.650 / 5.000.000` (`24,23%`).
- Rows written: `18 / 100.000` (`0,02%`).
- Consulta de Cámara: una sola fila, `limit=1`, total `13.441`, sin degradación.
- No se ejecutó SQL desde el monitor; sólo se consultó Analytics D1 y luego una
  página acotada de la API.

La protección contra scans globales quedó validada operativamente. El último
ETL de Movimientos publicó R2 y Pages consumió automáticamente el release
`d854bf4717b54374dc2c08262c85db18f1a56ea7e3171905fa46a697ef15161e`.

