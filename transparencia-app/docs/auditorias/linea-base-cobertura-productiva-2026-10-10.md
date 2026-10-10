# Línea base de cobertura declarada en producción

**Fecha de consulta:** 10-10-2026  
**Endpoint:** `GET https://cambiometro.impulsacv.cl/api/v1/sources`

Esta tabla registra lo que declara el catálogo productivo; no es una auditoría de las filas ni certifica que una fuente esté completa. `recordCount` y `queryableCount` pueden representar unidades distintas entre fuentes y no se suman entre sí. El estado `partial` no lleva porcentaje porque el endpoint no aporta un denominador de universo oficial.

| Fuente | Estado declarado | Registros publicados / consultables | Última publicación reportada | Alcance y observación del catálogo |
| --- | --- | ---: | --- | --- |
| Cámara | Parcial | 60.697 / 60.697 | No informada | Sólo particiones verificadas; incluye componentes de asistencia, votaciones y autoridades. |
| ChileCompra OCDS | Parcial | 74.142 / 74.142 | 21-08-2026 | Sólo particiones verificadas. Mantener al final de la auditoría integral por volumen y por la decisión de no ampliar cargas todavía. |
| Contraloría | Parcial | 528 / 528 | No informada | Sólo particiones verificadas. |
| Transparencia Activa CPLT | Parcial | 1.243.761 / 1.243.761 | 15-09-2026 | El catálogo indica datos publicados en el lake; no equivale a cobertura completa de todas las nóminas. |
| DIPRES | Parcial | 279.014 / 0 | 01-10-2026 | Alcance `aggregate`: presupuesto y ejecución agregados; no es un buscador de personas. |
| INE Censo 2024 | Conectada | 346 / 346 | No informada | Datos publicados en el lake; el conteo no mide cobertura de otros indicadores o períodos. |
| InfoLobby | Parcial | 71.467 / 71.467 | No informada | Sólo particiones verificadas. |
| InfoProbidad | Parcial | 16.077 / 16.077 | No informada | Sólo particiones verificadas. |
| Registro Ley 19.862 | Parcial | 62.172 / 62.172 | 08-09-2026 | El explorador consulta ese release; la cobertura frente al catálogo general aún no está conciliada. |
| Senado | Parcial | 1.428 / 1.428 | No informada | Sólo particiones verificadas. Los gastos/votaciones requieren sus propios cortes y no se deducen de este conteo agregado. |
| SERVEL | Parcial | 23.894 / 23.894 | No informada | Sólo particiones verificadas. |
| SINIM | Parcial | 3.105 / 3.105 | 21-08-2026 | Sólo particiones verificadas. |

## Lectura correcta

- El catálogo declara **11 fuentes parciales y 1 conectada**. “Conectada” describe disponibilidad del release, no integridad de cada indicador.
- Siete fuentes no reportan `lastUpdated`; sus fechas no se completan por inferencia. Para Cámara, Senado, movimientos, remuneraciones y gastos se deben consultar los manifiestos propios de cada proyección antes de declarar atraso.
- DIPRES tiene 279.014 registros agregados, pero cero registros consultables individualmente; no presentar ese conteo como personas, pagos individuales ni registros buscables.
- Los porcentajes de universo quedan **sin medir** mientras no se conozca y valide el denominador correspondiente.
- Esta captura no demuestra igualdad entre fuente oficial, release R2, API y cada página. Esa reconciliación queda pendiente por dominio y por corte.

## Próxima secuencia de reconciliación

1. Remuneraciones municipales y centrales, separadas por organismo, mes, montos informados/nulos y versión del release.
2. Personal de apoyo de Cámara y Senado y gastos parlamentarios por período; el ETL local de Cámara pasó, pero Senado y gastos requieren validaciones oficiales propias y muestras en sus páginas.
3. Votaciones de Cámara y Senado por cámara y fecha; un estado de fuente no reemplaza la validación de sesión y padrón nominal.
4. InfoLobby y InfoProbidad por tipo de registro, organismo y período, sin inferir identidad o influencia.
5. INE, SINIM, transferencias, Contraloría y SERVEL por unidad, indicador/período y corte publicado.
6. ChileCompra, al final, conciliando primero meses, conteos y releases existentes antes de cargar o publicar una serie 2026.

**Reproducción:** consulta GET de lectura al endpoint indicado; no se descargaron universos ni se escribió en R2 o D1. Para una nueva captura, comparar la respuesta del endpoint y los manifiestos vigentes; no editar esta fecha como si la captura histórica fuera dinámica.
