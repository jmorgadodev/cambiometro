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

La suma de los componentes incluidos de Cámara es 58.596. Quedan 155 filas
del conteo base sin una categoría explícita en el resumen productivo; deben
reconciliarse antes de mostrar porcentajes o afirmar cobertura completa.

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
3. El conteo de Senado requiere aclarar por qué el resumen declara 6.517 gastos
   mientras la consulta pública de `gastos_senado` expone 2.500 filas; ambas
   cifras no deben mezclarse hasta validar el release y sus particiones.
4. El conteo de Cámara requiere clasificar las 155 filas no explicadas por los
   componentes publicados.
5. No se detectó una lectura pública de D1: el health productivo declara
   `publicDataBackend = r2` y `publicD1Reads = false`.

## Decisión de fase

La fase 2 queda en **diagnóstico con discrepancias abiertas**. No se cambia el
conteo local, no se modifica el catálogo productivo y no se muestran
porcentajes de cobertura parlamentaria hasta obtener, para cada fuente:

- release y checksum;
- particiones y períodos;
- categoría de cada fila;
- conteo publicado y conteo consultable;
- explicación de las 155 filas de Cámara y de la diferencia de gastos del
  Senado.

