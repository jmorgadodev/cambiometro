# Auditoría de calidad de remuneraciones en R2 — 2026-09-16

## Alcance

Auditoría de solo lectura sobre los manifiestos y resúmenes de calidad publicados en R2 para los releases productivos de remuneraciones municipales y de organismos centrales. No se descargaron universos de filas, no se consultó D1 y no se modificaron objetos en R2.

La producción sigue siendo la referencia vigente. Los snapshots locales no se usan para reemplazar los conteos productivos.

## Releases revisados

| Alcance | Registros | Release | Generado | Estado |
| --- | ---: | --- | --- | --- |
| Municipal | 1.243.761 | 2026-09 | 2026-09-15 08:08:44 UTC | Consultable en R2 |
| Organismos centrales | 2.110.434 | 2026-09 | 2026-09-14 03:51:42 UTC | Consultable en R2 |

El índice productivo declara el mismo total que el manifiesto en ambos alcances. La búsqueda pública respondió desde R2 en consultas acotadas de nombre y organismo.

## Calidad observada

| Alcance | Filas con incidencia | Porcentaje | Principal incidencia | Períodos inválidos | Monto cero |
| --- | ---: | ---: | --- | ---: | ---: |
| Municipal | 159.705 | 12,84% | Líquido no informado: 159.679 | 0 | 4.848 (0,39%) |
| Organismos centrales | 563.221 | 26,69% | Líquido no informado: 563.169 | 6.952 | 37.531 (1,78%) |

Las incidencias no significan que el bruto esté ausente. El release conserva el valor publicado y la observación correspondiente; el líquido no informado no se completa con una estimación.

Incidencias de nombre reportadas por el release:

- Municipal: 24 prefijos numéricos, 7 prefijos inválidos y 5 nombres incompletos.
- Organismos centrales: 16 prefijos numéricos, 65 prefijos inválidos y 17 nombres incompletos.

El release central identifica 89.079 personas presentes en más de un organismo y el municipal 15.195. Esto requiere una regla de relación por organismo, período y contrato; no debe fusionarse sólo por nombre.

## Cortes que requieren revisión

Los resúmenes productivos sí contienen `newRecords`, `removedRecords`, `amountChanges`, cambios de organismo y cambios de cargo. La ausencia de esos valores en la gráfica anterior era un problema de interfaz y de fuente de datos de la visualización, no una prueba de que el release careciera de ellos.

| Alcance / corte | Registros | Nuevos | Ya no aparecen | Cambios de monto | Organismo | Cargo |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Municipal 2026-06 | 42.047 | 35.430 | 21.843 | 4.099 | 32 | 5.359 |
| Municipal 2026-07 | 164.813 | 150.057 | 29.281 | 8.495 | 172 | 11.589 |
| Municipal 2026-08 | 156.646 | 147.029 | 154.563 | 5.671 | 307 | 7.190 |
| Municipal 2026-09 | 102 | 99 | 154.143 | 1 | 0 | 1 |
| Central 2026-06 | 75.998 | 66.464 | 46.385 | 6.095 | 307 | 7.222 |
| Central 2026-07 | 578.446 | 543.128 | 48.394 | 22.405 | 1.352 | 25.698 |
| Central 2026-08 | 46.657 | 43.513 | 565.202 | 1.714 | 122 | 2.867 |
| Central 2026-09 | 123 | 115 | 46.542 | 8 | 0 | 8 |

### Interpretación prudente

1. El salto de julio no es exclusivo de una vista local: aparece en ambos releases productivos. Debe auditarse por organismo, categoría contractual y archivos de origen antes de presentarlo como crecimiento de empleo.
2. La caída de agosto y septiembre coincide con releases parciales en cantidad de organismos. No se debe mostrar como una baja masiva de personas sin verificar cobertura y período de publicación.
3. “Nuevos”, “ya no aparecen” y “cambios de monto” son diferencias entre cortes publicados. No equivalen por sí solos a contratación, despido o aumento efectivo.
4. Septiembre contiene sólo 102 filas municipales y 123 centrales en el release revisado; se trata como corte parcial hasta que el manifiesto productivo indique cobertura completa.

## Índices y alcance actual

El publicador ahora genera un `coverage-index.json` liviano por organismo y período. Contiene conteos, montos positivos, ceros, montos no clasificables, incidencias y distribución contractual; no copia nombres ni filas completas. Su checksum queda dentro del manifiesto de cada release. Esto permite auditar la cobertura sin descargar el universo ni consultar D1.

El índice no reemplaza las filas originales: sólo agrega una vista de control reproducible. Los períodos inválidos quedan fuera de las entradas y se contabilizan por separado.

### Duplicados exactos revisados

En el snapshot local de proyecciones centrales disponible para esta auditoría se revisaron 2.110.434 filas en 716 archivos, usando una huella semántica que excluye el identificador técnico y considera fuente, organismo, persona, cargo, período, montos, contrato y fechas. El resultado fue:

- 2.110.434 huellas únicas.
- 0 grupos de duplicados exactos.
- 0 filas duplicadas exactas.
- 2 artefactos de metadatos (`search_index.json` y `transparency-summary.json`) excluidos del conteo de filas.

Este resultado sólo aplica al snapshot central local; no se extrapola al alcance municipal ni reemplaza la auditoría productiva.

## Decisiones de implementación

- Mantener R2 como origen público y D1 fuera de búsquedas masivas.
- Mantener separados los alcances municipal y central.
- Conservar las filas originales y los montos publicados.
- Mantener el historial individual que sí tiene registros, sin volver a mostrar la gráfica general retirada.
- Generar un índice liviano por organismo y período, con conteos y checksum, sin duplicar filas completas; el cambio quedó preparado en el publicador y aún requiere validación CI antes de promoción.
- Revisar julio, agosto y septiembre por lotes pequeños antes de ampliar la interfaz o incorporar nuevos pagos.
- Auditar duplicados exactos y relaciones de personas como una etapa separada; los manifiestos actuales no entregan por sí solos un conteo confiable de duplicados exactos.

## Evidencia técnica

- `projections/funcionarios-v1/manifest.json`
- `projections/funcionarios-v1/.../transparency-summary.json`
- `projections/funcionarios-central-v1/manifest.json`
- `projections/funcionarios-central-v1/.../transparency-summary.json`
- Consultas públicas acotadas a `limit=1` y `limit=5`, todas respondidas con `sourceStatus` R2.
