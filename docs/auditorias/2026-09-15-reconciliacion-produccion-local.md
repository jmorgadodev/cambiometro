# Reconciliación de producción frente a snapshot local

**Fecha de ejecución:** 2026-09-15 01:49:51 UTC  
**Origen productivo:** `https://cambiometro.impulsacv.cl/api/v1/sources`  
**Método:** comparación de metadatos y conteos; no se descargaron universos ni se consultó D1 para búsquedas masivas.

## Resultado

| Clasificación | Fuentes |
| --- | ---: |
| Coincidencia de conteo | 3 |
| Producción más fresca que local | 5 |
| Diferencia de alcance o categorías | 7 |
| Diferencia inexplicada | 0 |
| Desajuste con `source-health` | 2 |

Una diferencia de conteo no se interpreta como pérdida mientras no se haya reconciliado el alcance y la fecha del release.

## Hallazgos relevantes

| Fuente | Producción | Local | Clasificación | Lectura correcta |
| --- | ---: | ---: | --- | --- |
| Cámara | 58.751 | 2.750 | Alcance | Producción incluye asistencia y votaciones; gastos queda como componente separado con 16.275 registros. |
| Senado | 1.428 | 7.002 | Alcance | El snapshot local combina categorías; producción mantiene votaciones y gastos como componentes separados. |
| ChileCompra | 74.142 | 1.915.039 | Alcance | Producción expone el corte vigente; local conserva histórico y cortes acumulados. No son universos equivalentes. |
| DIPRES | 247.287 | 92.286 | Alcance | Son datos agregados con distinto alcance; no deben compararse como fichas individuales. |
| InfoLobby | 71.467 | 60.523 | Frescura | Producción tiene un corte posterior al snapshot local. |
| Transparencia Activa | 1.226.913 | 1.218.136 | Frescura | Producción tiene una publicación posterior; no es una pérdida atribuible al sitio. |
| Contraloría | 310 | 291 | Frescura | Producción tiene una publicación posterior. |
| Ley 19.862 | 62.172 | 59.361 | Frescura | Producción tiene una publicación posterior. |

## Desajustes de calidad pendientes

- ChileCompra: `source-health` local declara 888.693 registros mientras el catálogo local conserva 1.915.039. Debe separarse explícitamente el corte vigente, el histórico y el universo del manifiesto antes de calcular cobertura.
- DIPRES: `source-health` local declara 476 registros frente a 92.286 en el catálogo local. La diferencia confirma que se mezclan resúmenes de salud con artefactos de distinto alcance.

## Decisiones de seguridad

- Producción es la referencia para el conteo vigente.
- El snapshot local se usa para auditoría histórica, no para reemplazar producción.
- No se calculan porcentajes de cobertura con estas cifras hasta separar categorías y períodos.
- No se modificó R2, D1 ni ningún release productivo durante esta auditoría.
- Las categorías de Cámara y Senado no se sumarán entre sí ni se mezclarán con remuneraciones.

## Próximo paso verificable

Reconciliar primero Cámara y Senado mediante una matriz por categoría, período y release. Después se podrá validar el histórico de ChileCompra y los resúmenes agregados de DIPRES sin alterar las rutas públicas actuales.
