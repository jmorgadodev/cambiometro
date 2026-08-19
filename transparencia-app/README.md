# El Cambiómetro — aplicación

Aplicación Next.js y pipeline de datos para relacionar entidades y evidencia pública de Chile. Usa exclusivamente D1 `transparencia-db` para consultas/estado vigente y R2 `transparencia-public-data` para históricos y archivos grandes.

## Desarrollo y verificación

```bash
npm ci
npm run dev
npm test
npm run lint
npm run build
npm run cf:build
```

Con la aplicación levantada, `npm run verify:browser` comprueba rutas, contratos API, teclado, ausencia de overflow y vistas de 320, 768, 1024 y 1440 px.

## Datos

```bash
npm run etl -- --from 2026-08-01 --to 2026-08-31 --source infoprobidad,infolobby
npm run data:inventory
npm run data:lake
npm run data:lake:dry
```

El flujo es `descubrir → descargar → checksum → validar → normalizar → conciliar → publicar`. `data/etl/latest.json` conserva el snapshot actual y `data/etl/source-inventory.json` el inventario verificable de índices oficiales. Las particiones generadas en `data/lake/` son reproducibles y se excluyen de Git.

GitHub Actions publica el histórico en Releases (`data-{fuente}-{año}`) y el catálogo/períodos calientes en el bucket R2 `transparencia-public-data`. El publicador aplica un límite interno de 8 GiB: archiva objetos fríos al 80 % y bloquea crecimiento al 90 %.

El catálogo municipal se actualiza y verifica contra el CUT oficial de SUBDERE con `npm run data:communes:update` y `npm run data:communes:check`. El ETL CPLT mensual procesa Planta, Contrata, Honorarios y Código del Trabajo en paralelo; rechaza nombres municipales desconocidos, archivos vacíos y objetos que excedan el límite de R2.

## ETLs locales

```bash
npm run etl              # ETL completo diario
npm run ingest:cplt-personal  # 3 invocaciones:
                              # stream-remote-personal.mjs Contrata|Honorarios|CodigoTrabajo
```

## API v1

- `GET /api/v1/sources`
- `GET /api/v1/entities/:id`
- `GET /api/v1/records?entity_id=&kind=&source=&from=&to=&cursor=`
- `GET /api/v1/relations?from_id=&to_id=&predicate=&cursor=`
- `GET /api/v1/crosses?...`
- Compatibles: `/api/v1/politico/:id`, `/api/v1/search` y `/api/v1/export`.

Las respuestas nuevas usan `{data, meta, links}`, cursor y límite máximo de 100. No se publican RUT personales, domicilios, cuentas, firmas, patentes personales ni relaciones inferidas sólo por nombre.
