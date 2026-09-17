# Reconciliación del catálogo R2 — 2026-09-17

## Resultado

La revisión se ejecutó contra la lista remota del bucket público y contra los
manifiestos de índices. No se descargaron universos, no se ejecutó ETL y no se
realizó ningún `PUT` o `DELETE`.

| Medición | Resultado |
| --- | ---: |
| Particiones declaradas por `catalog/v1/manifest.json` | 147 |
| Particiones con manifiesto físico presente | 65 |
| Particiones declaradas sin manifiesto físico | 82 |
| Filas declaradas en esas particiones ausentes | 471.536 |

El resultado no permite afirmar por sí solo que falten 471.536 registros de la
experiencia pública. El catálogo mezcla particiones históricas con fuentes que
actualmente se sirven mediante índices R2 independientes.

## Clasificación por fuente

| Fuente | Particiones declaradas | Presentes | Ausentes | Situación comprobada |
| --- | ---: | ---: | ---: | --- |
| Cámara | 61 | 46 | 15 | Componentes históricos incompletos; requiere reconciliación por período. |
| ChileCompra | 1 | 0 | 1 | Índice R2 alternativo presente con 74.142 filas. |
| Contraloría | 19 | 1 | 18 | No debe restaurarse sin definir el alcance histórico. |
| DIPRES | 18 | 0 | 18 | No hay índice individual equivalente; se mantiene como dato agregado. |
| Gastos Cámara | 5 | 0 | 5 | Requiere verificar la proyección de gastos vigente. |
| Gastos Senado | 5 | 5 | 0 | Particiones físicas presentes. |
| InfoLobby | 8 | 6 | 2 | Índice R2 alternativo presente con 71.467 filas. |
| InfoProbidad | 9 | 0 | 9 | Índice R2 alternativo presente con 16.077 filas. |
| Ley 19.862 | 8 | 0 | 8 | No se encontró índice R2 equivalente; revisar antes de prometer histórico. |
| Senado | 4 | 0 | 4 | Requiere reconciliación de sus cortes declarados. |
| SERVEL | 1 | 0 | 1 | Revisar si el dato vigente se sirve desde otra proyección. |
| SINIM | 1 | 0 | 1 | Revisar catálogo municipal vigente antes de restaurar. |
| Votaciones Senado | 7 | 7 | 0 | Particiones físicas presentes. |

## Decisión operativa

1. No restaurar las 82 particiones de manera masiva: podría duplicar datos,
   sobrepasar R2 y mezclar histórico declarado con corte vigente.
2. No corregir el catálogo eliminando referencias hasta clasificar cada fuente
   como `partición física`, `índice alternativo` o `histórico no publicado`.
3. Mantener separadas las métricas de datos declarados, físicamente
   consultables y consultables mediante índice alternativo.
4. Priorizar Cámara/Senado y las fuentes sin índice alternativo antes de
   ampliar datos históricos.

## Siguiente paso verificable

Construir una matriz por fuente con `releaseId`, checksum, período, clave
física, clave de índice alternativo, filas y estado de consultabilidad. Sólo
las filas cuya procedencia y tamaño estén conciliados podrán entrar en una
nueva publicación.
