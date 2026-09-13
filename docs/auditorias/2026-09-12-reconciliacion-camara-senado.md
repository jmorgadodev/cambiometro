# Reconciliación Cámara y Senado: producción, R2 y local

**Fecha del diagnóstico:** 2026-09-12  
**Alcance:** sólo lectura; no se ejecutó ETL, no se escribió D1/R2 y no se
modificó el repositorio maestro.

## Evidencia productiva

La referencia vigente es `GET /api/v1/sources` en producción. El catálogo
productivo declara `lastUpdated = 2026-09-12T11:42:20.330Z` para las fuentes
parlamentarias.

| Fuente/categoría | Conteo declarado | ¿Incluido en la fuente base? | Estado |
|---|---:|---|---|
| Cámara · asistencia | 54.538 | Sí, dentro de Cámara | Parcial |
| Cámara · votaciones | 4.058 | Sí, dentro de Cámara | Parcial |
| Cámara · base parlamentaria | 58.751 | Sí | Parcial |
| Cámara · gastos operacionales | 16.275 | No, separado | R2 |
| Senado · remuneraciones/registro base | 1.428 | Sí | Parcial |
| Senado · votaciones | 194 | No, separado | Parcial |
| Senado · gastos operacionales | 6.517 declarados por el catálogo | No, separado | R2 |

La suma de los componentes incluidos que expone el resumen de Cámara es
58.596. La revisión directa del catálogo R2 encontró además la partición
`partitions/camara/congreso_opendata/2026/09/manifest.json`, con 155 filas y
checksum
`603e395c63c63c737fb8eb45d5181cf985ef57d9121a7d5f34ce6ea4b18d7f9f`.
Por tanto, las 155 filas no son una pérdida: corresponden a la variante
`congreso_opendata` que el resumen de componentes de la API no enumera.
La clasificación productiva debe incorporar esa tercera categoría antes de
mostrar porcentajes o afirmar cobertura completa.

Las consultas públicas usan R2. Una consulta de una sola fila muestra sólo
cuántas filas se leyeron en esa página (`publishedRows`), no el universo total:

- Cámara: `total = 58.751`, `publishedRows = 49`.
- Senado: `total = 1.428`, `publishedRows = 50`.
- Votaciones del Senado: `total = 194`, `publishedRows = 5`.

Por tanto, `publishedRows` no debe presentarse como conteo de la fuente.

## Diferencia con los artefactos locales

`transparencia-app/data/data-quality-sources.json` y
`transparencia-app/data/etl/source-health.json` todavía reflejan un corte
anterior:

| Fuente local | Conteo local | Fecha/corte local | Conteo productivo actual |
|---|---:|---|---:|
| Cámara | 19.025 | 2026-08-21 en `source-health` | 58.751 |
| Senado | 8.138 | 2026-08-21 en `source-health` | 1.428 |
| Personal de apoyo derivado | 4.092 | 2026-07 en el manifiesto de calidad | No es la misma categoría que Cámara/Senado base |

Estas cifras no deben sumarse ni corregirse automáticamente. La diferencia
puede combinar corte, alcance y categoría; sin el inventario de particiones de
cada release no es válido llamarla “pérdida de datos”. Sí es una discrepancia
que debe resolverse antes de publicar cobertura.

## Hallazgos

1. Producción ya separa remuneraciones/actividad parlamentaria, votaciones y
   gastos mediante componentes y fuentes distintas.
2. El catálogo productivo es más nuevo que los manifiestos locales y debe ser
   la referencia para el estado vigente.
3. El catálogo R2 de `gastos_senado` declara 6.517 filas en cinco particiones,
   pero el release estático que consulta `/api/v1/records?source=gastos_senado`
   contiene 2.500 filas, con checksum
   `164c03a125439ac5c8a7edd420eeef5b9be2ac85bc70bc5f1ac4d3c13042c8ec`.
   Las cifras representan alcances publicados distintos; no deben mezclarse
   ni presentarse como un único universo consultable.
4. Cámara queda reconciliada a nivel de catálogo: 54.538 de asistencia +
   4.058 de votaciones + 155 de `congreso_opendata` = 58.751. Falta reflejar
   esa categoría en el resumen de la API.
5. No se detectó una lectura pública de D1: el health productivo declara
   `publicDataBackend = r2` y `publicD1Reads = false`.

## Decisión de fase

La fase 2 queda en **diagnóstico con una corrección de clasificación y una
discrepancia de release abiertas**. No se cambia el conteo local, no se
modifica el catálogo productivo y no se muestran porcentajes de cobertura
parlamentaria hasta obtener, para cada fuente:

- release y checksum;
- particiones y períodos;
- categoría de cada fila;
- conteo publicado y conteo consultable;
- reflejo de `congreso_opendata` en la clasificación de Cámara;
- decisión documentada sobre si el alcance público de gastos del Senado será
  2.500 o si se publicarán también las 4.017 filas catalogadas restantes.
