# Reconciliación Cámara y Senado — 12 de septiembre de 2026

## Alcance

Auditoría de sólo lectura entre:

- producción: `https://cambiometro.impulsacv.cl/api/v1/sources`;
- catálogo local R2: `data/lake/catalog/v1/manifest.json`;
- estado local: `data/etl/source-health.json`.

No se consultó D1 ni se ejecutó ETL.

Producción fue consultada a las `2026-09-12T05:47:42Z`; su catálogo de
fuentes declara publicaciones actualizadas a las `2026-09-12T00:13:38.399Z`.
El catálogo local disponible fue generado el `2026-08-24T13:52:22.514Z` y el
estado local el `2026-08-21T10:10:54.809Z`.

## Resultado

| Fuente | Producción | Local estado | Local catálogo principal | Componentes locales separados | Clasificación |
|---|---:|---:|---:|---:|---|
| Cámara | 58.751 | 19.025 | 13.286 | gastos: 16.275 | Alcance/categorías mezcladas |
| Senado | 1.428 | 8.138 | 1.428 | gastos: 6.543; votaciones: 189 | Alcance/categorías mezcladas |

### Cámara

Producción informa `58.751` registros y expone como componentes `54.538` de
asistencia y `4.058` de votaciones. La suma de esos componentes es `58.596`,
por lo que queda una diferencia interna de `155` registros que debe explicarse
en el manifiesto antes de calcular cobertura.

El catálogo local principal tiene `13.286` filas en siete períodos:
`2026-01`, `2026-03`, `2026-04`, `2026-05`, `2026-06`, `2026-07` y
`2026-08`. No hay una partición local `votaciones_camara`; las votaciones
aparecen declaradas como componente de Cámara en producción. Los gastos de
Cámara están separados en `gastos_camara` con `16.275` filas y períodos
`2026-03` a `2026-07`.

Por tanto, `19.025` no puede compararse directamente con `58.751`: representa
un agregado local de alcance distinto, no la cobertura de una sola categoría.

### Senado

Producción informa `1.428` registros del núcleo Senado. Sus componentes
separados declaran `205` votaciones y `6.517` gastos, pero ambos están marcados
como fuera del conteo principal.

El catálogo local principal también tiene `1.428` filas, en `2025-08`,
`2026-02`, `2026-05` y `2026-07`. Además, mantiene `votaciones_senado` con
`189` filas de marzo a agosto de 2026 y `gastos_senado` con `6.543` filas de
enero a mayo de 2026.

El estado local agregado de `8.138` mezcla esos componentes con el núcleo y no
debe presentarse como remuneraciones, asesorías, gastos o votaciones por sí
solo.

## Decisión de implementación

Esta fase queda en estado **auditada, separación pendiente**. No se modificarán
conteos ni se mostrarán porcentajes de cobertura hasta cumplir lo siguiente:

1. Cada registro de Cámara y Senado tendrá una categoría única:
   remuneración, asesoría, gasto, votación, asistencia u otra categoría
   explícita.
2. Los componentes se contarán aparte del núcleo y se indicará si están
   incluidos o excluidos del total.
3. Se explicará la diferencia interna de `155` registros de Cámara.
4. Se reconciliarán `205` votaciones de Senado en producción frente a `189`
   filas del catálogo local.
5. Se publicarán los períodos efectivos por categoría.
6. La interfaz nunca sumará núcleo y componentes como si fueran la misma
   nómina.

La diferencia local/producción queda clasificada como **alcance/categoría** y,
en segundo término, como **frescura**. No es evidencia de pérdida de datos en
producción.
