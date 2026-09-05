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

## Pendiente antes de promover el Worker

1. Ejecutar CI de la rama y verificar en un preview que el catálogo R2 contiene
   los índices de entidades publicados.
2. Promover el Worker únicamente después de comprobar `/api/v1/relations` y
   `/api/v1/crosses` con `X-Cambiometro-Cache` y `sourceBackend=r2-entity-index`.
3. Comparar el uso D1 después del próximo reset UTC. No ejecutar
   `materialize-d1` manualmente mientras el preflight esté sobre el umbral.

## Criterio de costo

No se recomienda actualizar el plan Workers para resolver esta alerta. La
operación permanece dentro del nivel gratuito si los ETL de baja frecuencia
materializan sólo cambios y las lecturas públicas siguen el camino R2-first.

