# Estado operativo de producción — 2026-09-16

## Alcance

Esta auditoría registra el estado observado en producción después del release
`eb4a5b6dd5eb7c5ba6d90e6b92c805ef7aaa90e6`. No modifica datos de R2 ni D1 y
no reemplaza ningún release.

## Evidencia de ejecución

| Control | Resultado | Evidencia |
| --- | --- | --- |
| Quality, lint, tipos y pruebas | Correcto | GitHub Actions `35135233580` |
| Security scan | Correcto | GitHub Actions `35135233458` |
| Build y E2E | Correcto | GitHub Actions `35135233413` |
| Pages, navegador, temas y CSP | Correcto | GitHub Actions `35135233296` |
| Smoke productivo | Correcto | GitHub Actions `35135260876` |
| Movimientos | 46 registros desde R2 | `sourceBackend=r2`, `sourceStatus=complete` |
| D1 post-reinicio | Nivel `ok` | GitHub Actions `35136580370` |

La sonda D1 sólo hizo una consulta de uso y una página de Cámara. Reportó
5.192 filas leídas y 57 escritas en la métrica observada. No ejecutó SQL
masivo ni materialización.

## Inventario público observado

Los conteos siguientes provienen de `/api/v1/sources` en producción y deben
tratarse como el estado vigente del catálogo, no como una suma global de filas.

| Fuente | Registros declarados | Consultables | Estado publicado | Última actualización observada |
| --- | ---: | ---: | --- | --- |
| Cámara | 58.751 | 58.751 | Parcial por particiones verificadas | 2026-09-16 |
| Senado | 1.428 | 1.428 | Parcial por particiones verificadas | 2026-09-16 |
| Transparencia Activa CPLT | 1.243.761 | 1.243.761 | Parcial según release | 2026-09-15 |
| ChileCompra OCDS | 74.142 | 74.142 | Parcial; corte vigente separado del histórico | 2026-08-21 |
| InfoLobby | 71.467 | 71.467 | Parcial según corte publicado | 2026-09-16 |
| InfoProbidad | 16.077 | 16.077 | Parcial según corte publicado | 2026-09-16 |
| Registro Ley 19.862 | 62.172 | 62.172 | Parcial | 2026-09-08 |
| DIPRES | 247.287 | 0 individuales | Agregado | 2026-08-21 |
| Contraloría | 310 | 310 | Parcial | 2026-09-16 |
| SERVEL | 23.894 | 23.894 | Parcial | 2026-09-16 |
| SINIM | 3.105 | 3.105 | Parcial | 2026-08-21 |
| INE Censo 2024 | 346 | 346 | Conectado | 2026-09-16 |

`Parcial` no significa que el endpoint esté roto: indica que el catálogo
declara un universo mayor o un corte temporal, y que la consulta pública debe
usar particiones verificadas. DIPRES permanece correctamente fuera del
buscador individual.

## Reconciliación vigente del manifiesto R2

El manifiesto `catalog/v1/manifest.json` recuperado directamente desde R2 fue
generado el 2026-09-16 a las 12:45:42 y contiene 147 particiones. El desglose
que debe usarse para Cámara y Senado es el siguiente:

| Componente | Particiones | Filas en R2 | Período publicado |
| --- | ---: | ---: | --- |
| Cámara · asistencia | 30 | 54.538 | 2024-01 a 2026-09 |
| Cámara · votaciones | 30 | 4.058 | 2024-01 a 2026-09 |
| Cámara · autoridades vigentes | 1 | 155 | 2026-09 |
| Cámara · gastos | 5 | 16.275 | 2026-03 a 2026-07 |
| Senado · registro base | 4 | 1.428 | 2025-08 a 2026-07 |
| Senado · votaciones | 7 | 218 | 2026-03 a 2026-09 |
| Senado · gastos | 5 | 6.520 | 2026-01 a 2026-05 |

Las particiones de Cámara no existen para febrero de 2024, 2025 y 2026. Esto
es una ausencia de publicación que debe comprobarse contra la fuente original;
no se convierte automáticamente en cero ni en una eliminación. El estado
`partial` del catálogo es un estado de publicación de la partición, no prueba
por sí solo que sus filas sean incorrectas.

Las consultas exploratorias masivas al endpoint público produjeron respuestas
429 en algunos períodos. Esas respuestas no se consideran evidencia de datos
faltantes y no se volverán a usar como método de auditoría. La fuente de
verdad para esta reconciliación es el manifiesto R2 y sus checksums.

### Comprobación de febrero en la fuente original

Se consultó de forma directa y acotada el servicio oficial WSSala de la
Cámara, sin publicar ni modificar datos. La respuesta fue `200` para los tres
años y no incluyó sesiones en febrero:

| Año | Sesiones oficiales devueltas | Meses con sesiones |
| --- | ---: | --- |
| 2024 | 142 | enero, marzo a diciembre |
| 2025 | 124 | enero, marzo a diciembre |
| 2026 | 91 | enero, marzo a septiembre |

Esto confirma que la ausencia de febrero en las particiones de **asistencia**
corresponde al calendario publicado por la fuente original. Las votaciones
usan un conector distinto y permanecen como control separado; no se infiere su
ausencia sólo a partir del calendario de sesiones.

### Reconciliación de votaciones de marzo de 2026

La fuente oficial `WSLegislativo` devolvió 107 votaciones para `2026-03`,
mientras que la partición R2 vigente contiene 39 filas. La diferencia quedó
explicada por el alcance temporal fijado para el período actual:

| Alcance | Filas oficiales |
| --- | ---: |
| 2–10 de marzo de 2026, período anterior al corte | 68 |
| 11–25 de marzo de 2026, período vigente | 39 |
| Total devuelto por la fuente | 107 |
| R2 `camara/votaciones_camara/2026/03` | 39 |

El ETL ejecutado en `--dry-run --full-history` obtuvo las 107 votaciones y 0
errores. La comparación por fecha confirma que R2 conserva exactamente las 39
del período vigente desde el 11 de marzo. No hay una pérdida de datos dentro
del alcance actual y no se publicará un release adicional que mezcle el
período anterior con el gobierno vigente.

## Estado de D1 y R2

- El health productivo declara `publicDataBackend=r2`, `publicD1Reads=false` y
  `transferSource=r2`.
- El binding D1 todavía existe como compatibilidad operativa; por eso el health
  también informa que D1 está configurada. Eso no equivale a que las búsquedas
  públicas la estén leyendo.
- Las compuertas de materialización programada exigen ejecución manual y la
  confirmación explícita definida en el repositorio.
- La auditoría de retención R2 del 16 de septiembre no encontró snapshots
  vencidos ni bytes candidatos a borrar; no se ejecutaron eliminaciones.

## Pendientes reales, en orden

1. Identificar el consumidor externo que explica la actividad histórica de
   `transparencia-db`; la sonda actual sólo permite atribuirla por base de
   datos, no por proyecto.
2. Mantener documentado el corte de Cámara del 11 de marzo; si en el futuro se
   requiere el histórico completo, publicarlo como variante histórica separada.
3. Auditar la cobertura de remuneraciones CPLT por período y organismo antes
   de incorporar nuevos pagos.
4. Completar la matriz de calidad de nombres, montos, períodos y duplicados
   desde manifiestos R2, sin cargar el universo en D1.
5. Recién después, mejorar historiales, altas, bajas y cambios de monto.

No se considera pendiente la corrección crítica de Movimientos ni la
verificación del release actual: ambas quedaron comprobadas en producción.
