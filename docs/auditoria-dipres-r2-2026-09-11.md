# Auditoría DIPRES: catálogo, release público y proyección agregada

Fecha de revisión: 11 de septiembre de 2026 (America/Santiago)

## Resultado ejecutivo

DIPRES se mantiene como fuente de contexto presupuestario agregado. No se incorpora como buscador de remuneraciones individuales ni se presentan sus cifras como pagos de personas.

La producción expone una diferencia de cobertura que ahora queda declarada en la interfaz:

| Medición | Filas | Interpretación |
| --- | ---: | --- |
| Catálogo declarado por DIPRES | 247.287 | Universo que declara el catálogo oficial |
| Release público consultable | 15.689 | Filas disponibles para consulta paginada |
| Diferencia pendiente | 231.598 | Catálogo aún no reconciliado con el release público |

La API productiva informó `sourceStatus=partial`, `missingPartitions=17` y `missingArtifacts=0`. Por lo tanto, la diferencia no se convierte en una estimación ni se presenta como cobertura completa.

## Evidencia de producción

- `GET https://cambiometro.impulsacv.cl/api/v1/sources`
  - `id=dipres`
  - `recordCount=247287`
  - `status=partial`
  - `assetCount=34`
  - `lastUpdated=2026-08-21T02:44:54.415Z`
  - `indexChecksumSha256=278287bce57ebbe4cc1759a016a04ff375df7035eb209ef40a716e45d00cfe1d`
- `GET https://cambiometro.impulsacv.cl/api/v1/records?source=dipres&limit=1&cursor=v1_0`
  - `meta.total=15689`
  - `publishedRows=15689`
  - `expectedRows=247287`
  - `missingPartitions=17`
  - `missingArtifacts=0`
  - `sourceBackend=r2-lake`
  - `sourceStatus=partial`

Estas comprobaciones no requieren ni ejecutan consultas masivas en D1.

## Proyección local de presupuesto

El artefacto `data/lake/projections/v1/presupuesto.json` contiene una proyección agregada de:

- 476 programas presupuestarios;
- año 2026;
- meses disponibles desde `2026-01` hasta `2026-06`;
- `generatedAt=2026-08-21T02:44:54.415Z`;
- SHA-256 local: `4c8318fe2efbafc65f380f17009c7d334628bbaf05a069cee99ad443a74d25b6`.

El checksum anterior se conserva como evidencia del artefacto local; la consulta pública se valida contra el manifiesto y el release publicado, no contra una copia local más antigua.

## Regla de presentación

La página de Servicios Públicos mantiene el directorio institucional separado del bloque `DIPRES · datos agregados`. El bloque explica que DIPRES sirve para revisar partidas, capítulos, programas y ejecución mensual. No se usa para afirmar que una persona recibió una remuneración ni para completar fichas individuales.

Mientras exista la diferencia entre catálogo y release, el estado se muestra como parcial y se informa la cobertura pendiente. No se usa D1 como fallback para completar el universo.
