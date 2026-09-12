# Reconciliación de superficies públicas — 12 de septiembre de 2026

## Alcance

Auditoría de sólo lectura para comparar el catálogo de fuentes expuesto por producción con el resumen estático de calidad publicado por Pages. No se ejecutó ETL, no se escribió en D1/R2 y no se modificó producción.

## Evidencia observada

### API pública de fuentes

`GET https://cambiometro.impulsacv.cl/api/v1/sources` respondió correctamente y utiliza el catálogo R2 productivo. Los conteos relevantes fueron:

| Fuente | Conteo expuesto por API | Corte/alcance observado |
|---|---:|---|
| Transparencia Activa | 1.226.913 | catálogo productivo de nóminas |
| Cámara | 58.751 | componentes productivos de actividad parlamentaria |
| Senado | 1.428 | núcleo productivo de registros del Senado |
| ChileCompra | 74.142 | corte productivo vigente |
| InfoLobby | 60.615 | universo productivo informado |
| InfoProbidad | 16.058 | universo productivo informado |
| Ley 19.862 | 62.172 | release R2 vigente |

El endpoint respondió HTTP 200. Estos conteos corresponden al catálogo que usa la API; no deben sumarse sin clasificar sus componentes.

### Resumen estático de calidad

`GET https://cambiometro.impulsacv.cl/data/data-quality-summary.json` respondió correctamente, pero contiene otra proyección:

| Fuente | Conteo del resumen estático | Diferencia frente a API |
|---|---:|---:|
| Transparencia Activa | 1.203.287 | -23.626 |
| Cámara | 19.025 | -39.726 |
| Senado | 8.138 | +6.710 |
| ChileCompra | 74.142 | 0 |
| InfoLobby | 60.523 | -92 |
| InfoProbidad | 15.331 | -727 |
| Ley 19.862 | 62.172 | 0 |

El resumen declara `globalKpiRecords: 1.753.013` y fue generado el `2026-09-12T00:13:38.399Z`. La API y el resumen no son, por tanto, dos lecturas de la misma cifra: están construidos con alcances y proyecciones diferentes.

## Causa técnica preliminar

El script `scripts/build-data-quality-summary.mjs` toma sus cifras base desde `data/data-quality-sources.json` y sólo complementa período/estado/checksum desde los artefactos locales de salud y catálogo. El archivo versionado local conserva valores históricos para varias fuentes.

El catálogo local de `data/lake/catalog/v1/manifest.json` también tiene fecha `2026-08-24T13:52:22.514Z` y no representa por sí solo el catálogo R2 productivo del 12 de septiembre. Por eso la diferencia no puede clasificarse como simple error de frescura de navegador.

En Cámara y Senado, además, el catálogo productivo separa componentes —asistencia, votaciones, gastos y núcleo— mientras el resumen estático agrupa categorías históricas distintas. La reconciliación debe definir primero qué es remuneración, asesoría, gasto, votación y núcleo antes de publicar porcentajes.

## Decisión operativa

1. Producción/R2 sigue siendo la referencia vigente.
2. No se mostrarán porcentajes de cobertura basados en estos conteos hasta unificar el contrato de categorías.
3. No se reemplazarán datos productivos con los manifiestos locales antiguos.
4. La corrección debe hacerse en la generación del resumen y sus verificadores, tomando un manifiesto de release explícito y conservando el desglose por componentes.
5. La próxima implementación deberá incluir una prueba que falle si `/api/v1/sources` y `data-quality-summary.json` presentan conteos incompatibles sin una explicación de alcance.

## Resultado de la primera corrección local

La rama maestra incorpora ahora una reconciliación explícita de conteos antes de generar el resumen. Probada contra los manifiestos R2 descargados el 12 de septiembre:

- Transparencia Activa: `1.226.913` observado, histórico `1.218.136`; porcentaje bloqueado por alcance no reconciliado.
- Cámara: `58.751` observado, con componentes separados de asistencia `54.538`, votaciones `4.058` y gastos `16.275`; porcentaje bloqueado.
- Senado: núcleo `1.428`, votaciones `205` y gastos `6.517`; porcentaje bloqueado hasta separar categorías.
- ChileCompra: `74.142` canónicos sobre `888.693` históricos; comparación válida.
- Ley 19.862: `62.172` desde el release vigente; se acepta como denominador explícito del release.
- DIPRES, InfoLobby e InfoProbidad: se muestran con su conteo observado, pero sin porcentaje mientras se reconcilia el alcance con la referencia histórica.

La prueba completa quedó verde: 175 archivos y 951 pruebas. El build estático generó 4.674 páginas y verificó 346 municipalidades, 205 perfiles parlamentarios, SEO y tamaño del Worker sin despliegue.

## Estado

**Estado actualizado:** diagnóstico y corrección de reconciliación completados
en la rama `codex/r2-public-datasets-d1-closure`. La corrección separa los
componentes de Cámara y Senado antes de calcular conteos de salud y mantiene
bloqueados los porcentajes cuyo alcance aún no es comparable. La validación
local de esa rama pasó typecheck, lint y las pruebas específicas de
reconciliación; este cambio aún no se ha desplegado desde esta auditoría.
