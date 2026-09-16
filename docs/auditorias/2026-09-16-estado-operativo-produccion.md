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
2. Reconciliar por período los componentes de Cámara y Senado que siguen
   marcados como parciales, sin interpretar un HTTP 429 o un timeout como
   ausencia de datos.
3. Auditar la cobertura de remuneraciones CPLT por período y organismo antes
   de incorporar nuevos pagos.
4. Completar la matriz de calidad de nombres, montos, períodos y duplicados
   desde manifiestos R2, sin cargar el universo en D1.
5. Recién después, mejorar historiales, altas, bajas y cambios de monto.

No se considera pendiente la corrección crítica de Movimientos ni la
verificación del release actual: ambas quedaron comprobadas en producción.

