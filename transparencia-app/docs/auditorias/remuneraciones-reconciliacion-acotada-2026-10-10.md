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

## ETL de personal de apoyo de Cámara — bloqueo externo

Se revisaron las 13 ejecuciones del workflow entre 30-08 y 10-10-2026: 12 terminaron en fallo y la única ejecución exitosa (02-10) fue `verify_release_only`; sus pasos de extracción y publicación estuvieron omitidos. La ejecución más reciente (10-10, run `38062846897`) falla al cargar la página oficial de personal del diputado ID 1009 con `PERSONAL_APOYO_SOURCE_BLOCKED`/HTTP 403. La etapa posterior de publicar en R2 y la entrada estática para Pages quedó `skipped`, por lo que ese fallo no reemplazó el release válido ni publicó cero filas.

El catálogo oficial mantiene una ficha por diputado y también una vista general de Personal de Apoyo. Ambas rutas consultadas directamente desde este entorno respondieron 403. La documentación pública del servicio `WSDiputado` enumera operaciones de diputados y períodos, pero no describe una operación de personal de apoyo; no se encontró en esa documentación una API alternativa para sustituir el scraper. Como control de producto, la ficha pública de Felipe Camaño responde 200 y selecciona septiembre de 2026, lo que demuestra que existe al menos ese corte en producción, no que las 160 fichas estén reconciliadas ni que el ETL se haya actualizado desde la fuente.

**Estado operativo:** `degraded_external`; mantener el último release R2, no reconstruirlo desde `data/personal-apoyo.json` local y no volver a ejecutar publicaciones vacías. El ETL no puede declararse autónomo/actualizado hasta que el origen permita extracción o se habilite y valide un canal oficial alternativo. Hace falta repetir el preflight de acceso desde la red que ejecutará el ETL y comparar una muestra por diputado y mes antes de reactivar la promoción automática.

**Evidencia:** [Cámara — Personal de Apoyo general](https://www.camara.cl/transparencia/personalapoyogral.aspx), [Cámara — ficha oficial de Felipe Camaño (ID 1116)](https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId=1116), [WSDiputado — operaciones documentadas](https://opendata.camara.cl/camaradiputados/WServices/WSDiputado.asmx), [ejecución fallida 10-10](https://github.com/jmorgadodev/cambiometro/actions/runs/38062846897).

### Revisión de alternativa oficial de Cámara — 10-10-2026

La página oficial general de Personal de Apoyo entrega una tabla con distrito, diputado, persona, cargo, monto, fechas y modalidad; su versión indexada hoy contiene filas con fechas de 2026. El catálogo oficial de Datos Abiertos Legislativos enumera operaciones de diputados, sesiones, votaciones y proyectos, pero no documenta una operación para este conjunto. La vista indexada confirma que la fuente pública contiene filas, pero no es un endpoint reproducible para reemplazar el ETL. Se mantiene `degraded_external`: no se detectó una vía automática alternativa verificable al scraping bloqueado con HTTP 403.

**Evidencia:** [Cámara — Personal de Apoyo general](https://www.camara.cl/transparencia/personalapoyogral.aspx), [Cámara — catálogo de Datos Abiertos Legislativos](https://www.camara.cl/transparencia/datosAbiertos.aspx).

## Consistencia del contador de gastos — control puntual 10-10-2026

La API productiva R2-only (`/api/v1/sources?r2Only=1`) informa 16.275 gastos de Cámara, mientras `/api/v1/records?source=gastos_camara&kind=expense&limit=1` devuelve 13.020. El índice mensual activo contiene marzo–junio de 2026 (4 × 3.255); el catálogo lake además conserva una partición de julio de 3.255 que no está en el índice consultable. Se corrigió el Worker para contar los períodos activos del índice, validando cada período contra el manifiesto estático; una prueba reproduce la partición obsoleta y espera 13.020. El control local pasa y el typecheck del Worker pasa. El cambio aún no está desplegado: producción conserva la discrepancia hasta que el PR supere CI y se promueva.

## Renderizado de dieta en fichas parlamentarias — control puntual 10-10-2026

Se recorrieron las 205 rutas parlamentarias listadas en el sitemap productivo y se comprobó el HTML de cada ficha. **205/205** contienen el bloque `Sueldo (dieta bruta)` con un monto renderizado; no se detectaron fichas sin bloque, monto vacío ni error HTTP. Esto verifica presentación, no vuelve a conciliar cada monto con la fuente oficial.

Se añadió una protección en el frontend para fichas que lleguen sin períodos: el panel ya no desaparece completo y conserva la etiqueta de dieta, muestra `—` y explica que no hay período publicado. No se crea un monto ni una fecha sintéticos. La prueba de regresión cubre ese estado. El PR #771 terminó con todos los controles requeridos en verde en el head `348e6b32`; sigue abierto y no está promovido a producción.

## Conteos mensuales de remuneraciones — consulta R2 acotada 10-10-2026

La API pública consultada con `limit=1` confirma que `periodo` filtra registros del índice R2 (las cinco filas muestreadas de cada universo para julio llevaban `periodo=2026-07`). Conteos declarados:

| Universo | Junio 2026 | Julio 2026 | Agosto 2026 | `updatedAt` del índice |
| --- | ---: | ---: | ---: | --- |
| Municipal | 42.047 | 164.813 | 156.646 | 15-09-2026 08:08:44 |
| Central | 75.646 | 575.676 | 46.494 | 14-09-2026 03:51:42 |

El corte central de julio es una señal de control: su conteo es muy superior a junio y agosto. **No se clasifica como error ni como cobertura completa** sin conciliarlo con los archivos oficiales de los organismos. El campo `meta.calidadDatos` de estas respuestas declara alcance `universo_publicado` y repite los totales globales (159.705 municipal; 563.221 central); no sirve para calcular incidencias mensuales. La consulta es un conteo del índice publicado, no una comparación registro por registro con el origen.

La normativa/instrucción del Consejo para la Transparencia indica publicación mensual por organismo y funcionario del monto bruto efectivamente recibido en el mes informado. Por tanto, el siguiente control debe comparar meses y organismos concretos con sus planillas oficiales; no se extrapola desde los seis conteos anteriores. [Guía oficial CPLT de publicación de personal y remuneraciones](https://www.consejotransparencia.cl/portal-de-transparencia/guia-pte-publicacion-remuneraciones/).
