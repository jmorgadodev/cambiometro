# Calendario operativo de ETL

Este documento describe cuándo se ejecuta cada ETL y cómo se publica el release.
Los cron de GitHub Actions se interpretan en UTC. La columna local está expresada
en `America/Santiago`: durante el horario de invierno corresponde a UTC−4 y
durante el horario de verano a UTC−3. Los cambios oficiales de hora de Chile se
aplican automáticamente por la zona horaria; no se cambian los cron UTC.

La fuente de verdad ejecutable es `.github/etl-calendar.json`. La guardia
`npm run check:etl-calendar` compara ese manifiesto con los workflows y falla si
aparece un desfase, un workflow programado sin documentar o si se omite
`etl-expenses.yml`.

| ETL | Cron UTC | Hora local aproximada |
|---|---:|---|
| Parlamento, movimientos y Diario Oficial | `0 7 * * *` | 04:00 invierno / 03:00 verano |
| ChileCompra | `0 8 * * 1` | Lunes 05:00 invierno / 04:00 verano |
| InfoLobby | `30 8 * * 1` | Lunes 05:30 invierno / 04:30 verano |
| Contraloría | `0 9 2 * *` | Día 2, 06:00 invierno / 05:00 verano |
| CPLT | `0 9 5 * *` | Día 5, 06:00 invierno / 05:00 verano |
| Ley 19.862 | `0 9 8 * *` | Día 8, 06:00 invierno / 05:00 verano |
| InfoProbidad | `0 9 10 * *` | Día 10, 06:00 invierno / 05:00 verano |
| DIPRES | `0 9 1 1,4,7,10 *` | Día 1, 06:00 invierno / 05:00 verano |
| SINIM | `0 9 1 3,9 *` | Día 1, 06:00 invierno / 05:00 verano |
| Gastos operacionales rendidos | `30 8 2 * *` | Día 2, 05:30 invierno / 04:30 verano |
| SERVEL | — | Sólo `workflow_dispatch` |

## Publicación y frescura

Cada ETL debe terminar después de validar el lote completo y publicar sus
artefactos en R2/D1. El workflow `pages-static-refresh.yml` escucha los ETL
publicables y reconstruye/verifica el artefacto Pages desde el manifiesto R2,
sin reutilizar datos parciales del checkout. La promoción productiva queda
protegida por confirmación manual. `etl-publication-guard.yml` comprueba,
tras un ETL verde, que el release está visible tanto en el manifest estático
como en el health del Worker; un ETL verde sin publicación queda rojo y genera
una alerta.

El bloqueo conocido de `camara.cl` para runners de GitHub Actions sigue siendo
un incidente operativo, no se oculta con un fallback incompleto. Si el origen
oficial bloquea al runner, el ETL debe fallar y no publicar un lote parcial; la
resolución requiere permitir el runner oficial o habilitar una ingesta
autorizada.

## Higiene del repositorio

El checkout contiene código, workflows, documentación, semillas canónicas y
fixtures necesarios para reproducir CI. Se mantienen fuera de Git los
artefactos reproducibles (`out/`, `.next/`, `public/data/`, slices, lake de
trabajo, logs y bundles). Los snapshots grandes versionados sólo se conservan
cuando un test limpio o el fallback local los lee directamente; antes de
eliminarlos debe existir un workflow de hidratación equivalente y pasar un
checkout limpio completo.

## Rollback

```bash
npm run pages:rollback -- <pages-deployment-id>
npx wrangler rollback <worker-version-id> \
  --name cambiometro-public-api
```
