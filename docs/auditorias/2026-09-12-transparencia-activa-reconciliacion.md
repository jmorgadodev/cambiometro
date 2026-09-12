# Reconciliación de Transparencia Activa — 12 de septiembre de 2026

## Alcance

Comparación de sólo lectura entre el manifiesto local de funcionarios de
Transparencia Activa y el manifiesto público vigente de Pages/R2. No se
ejecutó ETL, no se escribió en D1/R2 y no se modificó producción.

## Fuentes comparadas

| Superficie | Archivo | Generado | Registros | Corte declarado |
|---|---|---:|---:|---|
| Local | `transparencia-app/data/lake-cplt/projections/funcionarios-v1/manifest.json` | `2026-08-30T08:05:27.795Z` | 1.220.960 | snapshot local |
| Producción | `/data/funcionarios/manifest.json` | `2026-09-12T03:45:20.560Z` | 1.226.913 | `2026-09` |

El release productivo es `cplt-funcionarios-static-fallback`. Su manifiesto
tiene checksum `0271dfd181ca06abdfedce0ec85ba97a4b6d2d701bf2d7e0ca85ef938f055f1d`.
El resumen de registros apunta a
`/data/funcionarios/transparency-summary.json`, con checksum
`2d9d8d630de282353f37473a6f4fcc9198e5f53657feb18073d9be52b58b9d60`.

El archivo local `data/generated/data-quality-summary.json` fue generado el
`2026-08-21T10:10:54.809Z`; no debe utilizarse como conteo vigente. Incluso
es anterior al manifiesto local del 30 de agosto. El resumen de calidad debe
regenerarse sólo después de seleccionar y validar un release explícito, para
no volver a mezclar cifras históricas con el corte público.

## Cobertura municipal

| Estado | Local | Producción |
|---|---:|---:|
| Disponible | 320 | 320 |
| Sin nómina publicada | 25 | 25 |
| No aplicable | 1 | 1 |
| Total esperado | 346 | 346 |

La lista de 25 municipalidades sin nómina coincide exactamente entre ambos
manifiestos:

`Alto Hospicio, Ancud, Antofagasta, Cabrero, Calama, Carahue, Chonchi,
Concón, Contulmo, Copiapó, Curacaví, Curepto, Hualañé, Las Condes, Lota,
Macul, Negrete, Nueva Imperial, Penco, Providencia, Purén, Quinta de Tilcoco,
Recoleta, San Pedro de Atacama y Temuco.`

Antártica se mantiene como territorio `not_applicable`; no debe presentarse
como una municipalidad con fuente faltante.

## Desglose por categoría

| Categoría | Local | Producción | Diferencia |
|---|---:|---:|---:|
| Planta | 255.904 | 256.019 | +115 |
| Contrata | 234.137 | 236.706 | +2.569 |
| Honorarios | 517.840 | 521.109 | +3.269 |
| Código del Trabajo | 213.079 | 213.079 | 0 |
| **Total** | **1.220.960** | **1.226.913** | **+5.953** |

La diferencia se concentra en los cortes posteriores de contrata y honorarios.
No hay evidencia de que se hayan perdido comunas ni de que el release local y
el productivo tengan alcances municipales distintos.

## Conclusión operativa

1. Producción/R2 es la referencia vigente para conteos y períodos.
2. El snapshot local es una versión anterior, útil para pruebas reproducibles,
   pero no debe utilizarse para afirmar el estado actual de la cobertura.
3. La diferencia de 5.953 filas es una diferencia de frescura, no una
   discrepancia de cobertura.
4. Las ausencias deben seguir mostrándose como “sin nómina publicada” y
   separadas de Antártica (“no aplicable”).
5. El trabajo local no necesita descargar nuevamente todo el universo para
   mantenerse alineado: la ruta recomendada es hidratar sólo los manifiestos,
   índices y particiones necesarias desde R2, conservando el snapshot local
   como fixture o respaldo de pruebas.

La implementación ya dispone de `npm run data:hydrate:cplt-static --
--pages-only`, que descarga desde el bucket productivo únicamente los assets
necesarios para Pages y valida tamaño y SHA-256 antes de reemplazar el
manifiesto local. No se ejecutó durante esta auditoría porque agregaría una
nueva copia local de aproximadamente 1,29 GiB; debe ejecutarse en una ventana
de mantenimiento con espacio y respaldo confirmados.

## Decisión para la siguiente fase

Antes de ampliar vistas de historial, altas, bajas o cambios de remuneración,
el build debe aceptar explícitamente un `releaseId`/manifiesto de R2 y dejar
registrados su fecha, checksum y conteo. Si se prueba con un snapshot local,
la interfaz y los informes deben rotularlo como local y no mezclarlo con los
conteos productivos.

**Estado:** reconciliación completada; implementación de vistas derivadas
pendiente.
