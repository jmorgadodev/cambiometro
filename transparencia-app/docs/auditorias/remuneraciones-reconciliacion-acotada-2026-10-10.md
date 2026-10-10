# Reconciliación acotada de remuneraciones — 10-10-2026

**Ejecución:** `npm run audit:remuneraciones`  
**Consulta:** 2026-10-10 17:45 UTC  
**Resultado:** proceso exitoso; `findings: []`; `releaseMutation: none`.

La comprobación leyó el manifiesto unificado, el catálogo de fuentes y dos consultas de alcance con límite 1, más cinco búsquedas acotadas. No descargó los universos ni leyó masivamente D1. El resultado compara metadatos y búsquedas; no certifica cada fila frente a la fuente original.

## Conteos y alcances que no se deben mezclar

| Capa/categoría | Filas declaradas | Período/corte informado | Interpretación |
| --- | ---: | --- | --- |
| Páginas del manifiesto estático | 36.226 en 182 páginas de 200 | Build 10-10-2026 | Conteo de páginas estáticas; no equivale al universo de índices de búsqueda. |
| CPLT / Transparencia Activa | 1.243.761 | Manifiesto: 2026-06 / 2026-07; índice productivo actualizado 15-09 | Release parcial; conteo del índice municipal consultable. El número coincide entre manifiesto y catálogo productivo. |
| Personal de apoyo Cámara | 1.094 | 2026-09 | Release parcial, por separado de remuneraciones personales. |
| Personal de apoyo Senado | 3.827 | 2026-01 / 2026-09 | Release parcial, por separado de remuneraciones personales. |
| Registro 38 bis | 31.305 | 2025-01 / 2026-07 | El manifiesto lo declara completo para ese corte; eso no extiende el período disponible. |
| DIPRES / manifiesto unificado estático | 15.689 | El conteo corresponde a la partición 2026-06; el manifiesto lo etiqueta 2026-07 | Sólo agregado; cero filas consultables como personas. El período declarado y el mes al que corresponde el conteo no están alineados. |
| DIPRES / catálogo productivo | 279.014 | actualizado 01-10-2026 | Conteo agregado de observaciones distribuidas en particiones mensuales; no es un universo de personas ni un buscador individual. |
| Índice municipal de remuneraciones | 1.243.761 | actualizado 15-09-2026 | `scope=municipal`, estado `r2-search`, universo publicado del índice. |
| Índice central de remuneraciones | 2.092.412 | actualizado 14-09-2026 | `scope=central`, estado `r2-search-central`, universo publicado del índice. |

Los conteos `totalRows` del manifiesto, los índices CPLT y central, los asesores y DIPRES tienen alcances distintos. No se suman ni se presentan como personas únicas o como un universo nacional homogéneo.

### Reconciliación de DIPRES

La consulta productiva `GET /api/v1/sources` declara **279.014** registros agregados, checksum `278287bce57ebbe4cc1759a016a04ff375df7035eb209ef40a716e45d00cfe1d`, 34 activos y actualización 01-10-2026. El manifiesto local del lake suma exactamente 279.014 filas en **20 particiones mensuales**: 12 de 2021 y 8 de 2026 (enero–agosto). La partición más reciente es **2026-08**, con 15.901 filas.

Por tanto, la diferencia principal es de alcance: 279.014 suma observaciones de los meses disponibles, mientras 15.689 es un conteo mensual. Además, 15.689 coincide con la partición **2026-06**, no con 2026-07; julio tiene 15.826 filas y agosto 15.901. El valor fijo de 15.689 en el manifiesto unificado está desfasado respecto del último corte disponible. La reconciliación explica los conteos, pero no convierte la cobertura discontinua de 2021 y 2026 en una serie anual completa. No se verificó cada fila contra el CSV de origen ni se modificaron datos.

## Calidad de campos reportada por la API

- Municipal: 159.705 registros únicos tienen al menos una incidencia; 159.679 presentan líquido no informado. Eso corresponde a **12,84%** de los 1.243.761 registros consultables.
- Central: 563.221 registros únicos tienen al menos una incidencia; 563.169 presentan líquido no informado. Eso corresponde a **26,91%** de los 2.092.412 registros consultables.
- Los porcentajes describen la presencia del campo líquido, no cobertura de la fuente ni exactitud del monto bruto. Un valor no informado no se convierte en cero.
- Las categorías de incidencia pueden solaparse; no sumar sus conteos para reconstruir el total de registros afectados.
- El índice reporta además anomalías de prefijo o nombre incompleto. Esta comprobación no examinó las filas una a una ni determinó su causa.

## Búsquedas de control

Las cinco probes devolvieron resultados: Lucy Depablos (7), Sofía Pumpin (1), María Victoria Raimann Pumpin (1), Río Sebastián Torrealba del Río (1) e Independencia (8.161 total, 20 devueltos por el límite solicitado). Confirman rutas de consulta concretas; no son una prueba de exhaustividad para otros nombres, meses u organismos.

## Pendiente para poder declarar exactitud integral

1. Conciliar cada período con la planilla oficial correspondiente, separando municipal y central.
2. Muestrear montos originales, cero, nulo y no informado sin completar campos por inferencia.
3. Revisar duplicados mediante identificadores oficiales; no deduplicar sólo por nombre.
4. Comprobar páginas concretas y filtros contra el índice para cada categoría.
5. Medir cobertura sólo si se consigue un denominador oficial comparable.

Esta ejecución no corrige ni publica datos. No hubo escrituras en R2, lecturas masivas ni materialización en D1.
