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

## Control posterior de la ruta pública — 10-10-2026

`npm run verify:prod:remuneraciones` terminó con código 0 contra `https://cambiometro.impulsacv.cl`. La ruta `/remuneraciones-publicas` respondió 200; el manifiesto unificado declaró 36.226 filas estáticas en 182 páginas y el índice de búsqueda estuvo disponible. Las búsquedas de control devolvieron Lucy Depablos (7), Sofía Pumpin (1), María Victoria Raimann Pumpin (1) e Independencia (9.493; 20 filas retornadas por el límite del control).

Este control confirma disponibilidad de rutas, contrato del manifiesto y ejemplos de búsqueda; no prueba que las 36.226 filas ni los índices municipales/centrales coincidan registro por registro con las planillas oficiales. No ejecutó escrituras ni despliegues.

## Personal de apoyo del Senado — contraste 2026

Consulta de sólo lectura al endpoint oficial del Senado (`/api/transparency/senator-assignments/support-staff`, filtro `ano=2026`), paginada en 8 solicitudes de 500 filas: el total declarado y recibido coincide en **3.827**. La distribución por mes también coincide con el candidato local: enero 355, febrero 422, marzo 555, abril 431, mayo 409, junio 412, julio 405, agosto 418 y septiembre **420**. No hay montos nulos; 13 registros tienen monto cero, que se conserva como cero y no se transforma en dato ausente.

La ficha productiva de Pedro Araya para septiembre muestra 9 personas y **$13.730.597**. El mismo filtro aplicado a la fuente oficial devuelve esos 9 registros y la misma suma; esto valida ese caso, no todas las fichas del Senado.

La consulta oficial completa también confirma la ficha de Vanessa Kaiser: agosto tiene 8 registros por **$15.930.000** y septiembre 8 por **$16.450.000**. La prueba de referencia quedó actualizada a septiembre; usa el total oficial del corte, no una cifra inferida.

Se actualizó el candidato local `data/personal-apoyo.json` con el ETL en modo `--source senado`, preservando Cámara. El validador existente confirmó checksum `c143e19987fb6723e7cf62f7add163806bf69243378a5c90c49dcc472fe947ee`, 70 oficinas del Senado y 3.827 filas senatoriales. El intento de regenerar `data/lake-subsets/personal-apoyo.subset.json` con todo el Senado produjo 807.584 bytes y falló la guarda de arquitectura (máximo 200 KB por JSON importado); ese subset grande se descartó y no se publica. El subset compacto anterior se conserva, pero sólo llega a julio de 2026; la separación del fallback requiere una estrategia que mantenga cobertura sin exceder el límite.

**Límite:** no se compararon las 3.827 filas del release productivo una por una con las filas oficiales; sólo se contrastó el total, los conteos mensuales del origen/candidato y el caso de Pedro Araya. La conciliación de Cámara y gastos parlamentarios sigue abierta. El candidato `data/personal-apoyo.json` es local: no se escribió en R2 o D1 ni se desplegó; cualquier promoción necesita preflight de almacenamiento y preview. La producción comprobada para Pedro ya ofrece septiembre; el respaldo estático compacto sigue siendo un riesgo de regresión si faltara también el dataset completo.

### Nombres reportados como ausentes — Natalia Pérez Cerda, septiembre

Se comprobó la planilla/API oficial del Senado con filtro `año=2026`, `mes=9`: declara 420 filas en una página. Contiene dos contratos de `PEREZ CERDA NATALIA MAGALY`, ambos como `ASESOR (A) LEGISLATIVO`, por **$1.000.000** cada uno: uno en la unidad laboral `OSSANDON IRARRAZABAL MANUEL JOSE` y otro en `BALLADARES LETELIER ANDREA PAZ`. Las fichas productivas de Manuel José Ossandón y Andrea Balladares responden 200 y muestran para septiembre el mismo nombre, cargo y monto en ambas.

El archivo local `data/personal-apoyo.json` de este worktree no contiene esos dos registros, aunque su metadata es del mismo día. Esto confirma que ese snapshot local no es una copia fiel del release vigente y no debe usarse para reconstruir o promover los datos senatoriales: producción está correcta para estos dos casos; la discrepancia está en el artefacto local. No se promovió ni escribió ningún dato.

**Evidencia de origen:** [API oficial Senado — apoyo 2026-09](https://web-back.senado.cl/api/transparency/senator-assignments/support-staff?filters%5Bano%5D%5B%24eq%5D=2026&filters%5Bmes%5D%5B%24eq%5D=9&pagination%5BpageSize%5D=500&pagination%5Bpage%5D=1). **Fichas productivas cotejadas:** [Manuel José Ossandón](https://cambiometro.impulsacv.cl/politico/manuel-jose-ossandon-irarrazabal), [Andrea Balladares](https://cambiometro.impulsacv.cl/politico/andrea-balladares-letelier).

## Consistencia del contador de gastos — control puntual 10-10-2026

La API productiva R2-only (`/api/v1/sources?r2Only=1`) informa 16.275 gastos de Cámara, mientras `/api/v1/records?source=gastos_camara&kind=expense&limit=1` devuelve 13.020. El índice mensual activo contiene marzo–junio de 2026 (4 × 3.255); el catálogo lake además conserva una partición de julio de 3.255 que no está en el índice consultable. Se corrigió el Worker para contar los períodos activos del índice, validando cada período contra el manifiesto estático; una prueba reproduce la partición obsoleta y espera 13.020. El control local pasa y el typecheck del Worker pasa. El cambio aún no está desplegado: producción conserva la discrepancia hasta que el PR supere CI y se promueva.
