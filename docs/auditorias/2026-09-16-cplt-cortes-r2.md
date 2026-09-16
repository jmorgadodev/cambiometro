# Auditoría de cortes CPLT en producción/R2 — 2026-09-16

## Alcance

Auditoría de sólo lectura realizada contra los manifiestos y resúmenes de las proyecciones R2 productivas. No se descargaron universos completos, no se consultó D1 y no se modificó ningún release.

Referencia de producción:

- Municipal: `1.243.761` registros, corte `2026-09`, generado `2026-09-15T08:08:44.566Z`.
- Organismos centrales: `2.110.434` registros, corte `2026-09`, generado `2026-09-14T03:51:42.634Z`.
- Los conteos de la API productiva coinciden con sus respectivos manifiestos R2.

## Comparación mensual observada

Los valores siguientes son filas publicadas del corte, no contrataciones ni despidos. “Nuevos” y “ya no aparecen” son diferencias de presencia entre cortes; “cambios de monto” compara el monto bruto publicado.

### Municipalidades

| Corte | Filas | Personas | Organismos | Nuevos | Ya no aparecen | Cambios de monto | Estado |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 2025-12 | 85.614 | 81.590 | 317 | 76.311 | 21.306 | 3.288 | comparable |
| 2026-01 | 24.584 | 24.183 | 314 | 18.705 | 76.112 | 4.921 | comparable |
| 2026-02 | 40.104 | 39.163 | 316 | 33.631 | 18.651 | 5.101 | comparable |
| 2026-03 | 28.845 | 28.069 | 315 | 24.320 | 35.414 | 2.707 | comparable |
| 2026-04 | 25.096 | 24.390 | 313 | 21.308 | 24.987 | 2.013 | comparable |
| 2026-05 | 27.970 | 27.315 | 317 | 24.025 | 21.100 | 1.971 | comparable |
| 2026-06 | 42.047 | 40.902 | 318 | 35.430 | 21.843 | 4.099 | comparable |
| 2026-07 | 164.813 | 161.678 | 315 | 150.057 | 29.281 | 8.495 | comparable |
| 2026-08 | 156.646 | 154.144 | 217 | 147.029 | 154.563 | 5.671 | comparable |
| 2026-09 | 102 | 100 | 18 | 99 | 154.143 | 1 | revisar |

### Organismos centrales

| Corte | Filas | Personas | Organismos | Nuevos | Ya no aparecen | Cambios de monto |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2025-12 | 81.980 | 76.711 | 617 | 62.278 | 58.984 | 10.598 |
| 2026-01 | 43.127 | 41.029 | 518 | 35.154 | 70.836 | 5.346 |
| 2026-02 | 54.706 | 53.327 | 582 | 47.601 | 35.303 | 5.355 |
| 2026-03 | 47.904 | 46.654 | 626 | 41.662 | 48.335 | 4.463 |
| 2026-04 | 44.557 | 43.135 | 582 | 38.431 | 41.950 | 3.898 |
| 2026-05 | 55.136 | 53.426 | 573 | 47.601 | 37.310 | 4.444 |
| 2026-06 | 75.998 | 73.505 | 587 | 66.464 | 46.385 | 6.095 |
| 2026-07 | 578.446 | 568.239 | 645 | 543.128 | 48.394 | 22.405 |
| 2026-08 | 46.657 | 46.550 | 215 | 43.513 | 565.202 | 1.714 |
| 2026-09 | 123 | 123 | 9 | 115 | 46.542 | 8 |

## Hallazgos

1. La diferencia entre local y producción no es, por sí sola, un error: producción tiene un release posterior. El conteo productivo vigente debe ser la referencia.
2. El salto de julio es real en los resúmenes R2 actuales y afecta a ambos ámbitos, especialmente organismos centrales. No corresponde ocultarlo ni corregirlo automáticamente; requiere revisión de alcance y de las categorías que entraron en esos cortes.
3. La caída de agosto/septiembre y el conteo municipal de sólo 18 organismos en septiembre son señales de corte incompleto o parcial. El resumen municipal marca septiembre como `review` porque cambia más de cuatro veces respecto del corte anterior.
4. Las columnas de entradas, salidas y cambios sí tienen valores en R2. La interfaz 38 bis mantiene esos detalles comparables por ficha; la gráfica general se retiró porque no ayudaba a interpretar estas diferencias.
5. El release municipal declara 346 entidades en cobertura, 323 disponibles y 23 no disponibles en el corte vigente. La cobertura por organismo y período todavía no está disponible como índice productivo completo; no se debe inferir desde el conteo mensual general.
6. La calidad agregada del release central registra `563.221` filas con incidencias y `6.952` períodos inválidos. Esto debe auditarse por lotes antes de afirmar que todo el universo está normalizado.

## Decisión operativa

- No publicar aún porcentajes de cobertura ni presentar septiembre como corte completo.
- Mantener los releases originales y la búsqueda productiva R2 sin rehidratar D1.
- Priorizar un índice liviano por organismo/período y una matriz de calidad reproducible; debe generarse desde el ETL, con conteos y checksum, antes de ampliar la interfaz.
- La corrección visual de remuneraciones no cambia el universo ni elimina históricos.
