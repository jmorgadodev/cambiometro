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

## Build estático y fuentes de datos

La variante Pages se construye sólo después de hidratar las fuentes oficiales;
no se deben commitear `out/`, `.pages-static/`, chunks ni slices derivados:

```bash
npm run data:hydrate:cplt
npm run data:hydrate:ley19862
npm run data:verify:full:ley19862
$env:CPLT_ALLOW_UNAVAILABLE='1'; npm run pages:build
$env:CPLT_ALLOW_UNAVAILABLE='1'; npm run pages:verify
npm run verify:pages-browser
VERIFY_BASE_URL=http://127.0.0.1:8788 npm run pages:crawl
```

`CPLT_ALLOW_UNAVAILABLE=1` significa que el censo de 346 municipalidades está
completo y que una municipalidad sin archivo oficial queda marcada como
`unavailable`; nunca rellena filas. La verificación de la fuente viva de Ley
19.862 se calcula desde las particiones descargadas, no desde el fixture
histórico de 59.361 filas. La auditoría del límite de GitHub es:
`npm run audit:repo-boundary`.

`pages:crawl` requiere un servidor estático sobre `out/` y verifica todas las
rutas HTML derivadas del export y del sitemap; falla ante cualquier 404/5xx,
1102 o listado principal por sobre 700 ms.

El estado, las decisiones de rollback y la evidencia local quedan en
`../docs/estado-migracion-pages-worker.md`. El checkout OpenNext sigue siendo
el rollback conocido-bueno hasta que el Worker tenga paridad contractual y se
complete la verificación de producción.

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
