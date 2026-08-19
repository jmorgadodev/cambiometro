# workers/etl — FROZEN (congelado)

> **Estado: SUPERSEDIDO por `transparencia-app/scripts/etl.mjs`** (fase 7, agosto 2026).

Este directorio era el pipeline ETL como **Cloudflare Worker cron nocturno** con D1/KV/R2.
La arquitectura final del proyecto prescinde de infraestructura de runtime:

| Antes (fase 4-5) | Ahora (fase 7) |
|---|---|
| Worker cron `1 4 * * *` en Cloudflare | Cron **GitHub Actions** (`.github/workflows/etl.yml`, domingo 06:00 UTC) — costo $0 |
| Escribe a D1 / KV / R2 | Escribe `transparencia-app/data/etl/latest.json` (snapshot auditable en git) |
| Requiere bindings + secrets de Cloudflare | Node puro (`node scripts/etl.mjs`), sin secretos |
| Redeploy manual del worker | Commit del snapshot → dispara el deploy OpenNext a Cloudflare Workers |

## Reglas (heredadas de las fases 2-6 — NO romper)

1. **Sin fuente real NO se persiste NADA.** Los scrapers devuelven `[]` ante error o
   ausencia de datos; el frontend muestra "Sin datos verificados". Bajo ninguna
   circunstancia se genera un `Math.random()` o dato simulado.
2. Los algoritmos de este directorio (`algorithms/score.ts`, `nepotismo.ts`, `territorio.ts`)
   son referencias puras; solo deben ejecutarse sobre datos que ya traen `fuente`.

## Qué contiene

- `cron.ts` — orquestador del worker (retirado de producción; conservado como referencia).
- `wrangler.toml` — configuración histórica aislada; la app usa `wrangler.jsonc` en su raíz.
- `scrapers/` — módulos de ingesta (infoprobidad, congreso-gastos, infolobby,
  mercadopublico, cplt-transparencia). Sus endpoints reales son la referencia canónica
  que `scripts/etl.mjs` replicó en Node puro.
- `seed/` — semilla D1 (sin datos inventados).
- `algorithms/` — score, nepotismo, territorio (puros, testeados con vitest).

## ¿Borrar o mantener?

Quédelo en el repo como referencia de arquitectura + como base para volver a
implementar un API en línea cuando exista un consumidor (p. ej. `/api/v1/export`
con `latest.json` como origen). El próximo cambio de diseño ETL se hace en
`transparencia-app/scripts/etl.mjs`, NO aquí.
