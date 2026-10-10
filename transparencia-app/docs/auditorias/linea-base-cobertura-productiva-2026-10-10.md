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

## Política de cobertura pública — verificación 10-10-2026

La ruta de metodología `/como-funciona` responde HTTP 200 en producción y publica los criterios acordados: fuente oficial no significa conjunto completo; los porcentajes de cobertura se dejan no medidos sin denominador verificable; y coincidencias de nombres o fechas no acreditan identidad, causalidad, influencia o irregularidad. También distingue cobertura limitada y explica que un dato ausente de la plataforma no prueba que la fuente no lo haya publicado. **Estado: política pública de alcance implementada y visible.** La matriz de fuentes de arriba mantiene sus coberturas no medidas donde no existe denominador defendible.

## Corte de votaciones parlamentarias — control acotado 10-10-2026

Las consultas de producción se acotaron por fuente y mes (`from=2026-08&to=2026-08`, etc.); una consulta de Cámara sin período devuelve `QUERY_SCOPE_REQUIRED`, evitando recorrer el historial masivo. Producción y el Worker R2-only coinciden en los conteos consultables:

| Fuente | Ago. 2026 | Sep. 2026 | Oct. 2026 | Último registro observado |
| --- | ---: | ---: | ---: | --- |
| Cámara (`votaciones_camara`) | 102 | 109 | 26 | 07-10-2026 |
| Senado (`votaciones_senado`) | — | — | 17 | 07-10-2026 |

La página oficial de votaciones de la Cámara muestra sus últimas 20 votaciones con fecha 7 de octubre. Se cotejó el registro `camara-vot-90324` con su XML oficial: 07-10-2026, asunto “1-Otros”, 63 a favor, 22 en contra y 0 abstenciones; coincide con la fila oficial del documento de solicitud de cierre del debate del boletín 18684-05.

Para Senado, el registro `votaciones_senado-sen-vot-11428` corresponde al 07-10-2026, sesión oficial 67, y al proyecto sobre normas de uso de la fuerza. La fuente oficial enlazada desde el registro confirma fecha, sesión y materia. El catálogo oficial de sesiones también lista una sesión del 09-10-2026 (N.º 991), pero sus columnas de tabla, cuenta, resumen, diario y asistencia aparecen sin enlaces. Se consultó además la vista oficial de votaciones para `sesiid=991`: HTTP 200 y tabla sin filas de resultados al 10-10-2026. Una noticia oficial del 09-10-2026 señala que el proyecto de artes marciales sería puesto a votación en una próxima sesión ordinaria, no ese día. **Cierre acotado:** no hay evidencia oficial publicada de resultados electrónicos para la sesión 991 en la consulta realizada; por ello, que el release llegue hasta el 07-10-2026 no demuestra una omisión del ETL. Esto no prueba que no se hayan realizado otras votaciones no publicadas o no disponibles en el portal; reabrir sólo si el Senado publica resultados de esa sesión.

**Conclusión acotada:** no se reprodujo la discrepancia anterior de fecha entre Home y el registro consultable: las dos cámaras tienen registros del 07-10-2026 y los conteos por mes coinciden entre producción y el preview R2-only. Para Senado, la consulta oficial de la sesión 991 tampoco muestra resultados publicados al 10-10-2026. Esto verifica el corte reciente y la disponibilidad observada, no la cobertura histórica completa ni todas las votaciones individuales.

**Fuentes oficiales:** [Cámara — últimas votaciones](https://camara.cl/legislacion/sala_sesiones/votaciones.aspx), [XML oficial Cámara, votación 90324](https://opendata.camara.cl/camaradiputados/WServices/WSLegislativo.asmx/retornarVotacionDetalle?prmVotacionId=90324), [Senado — sesión 67 del 7 de octubre](https://www.senado.cl/actividad-legislativa/sala-de-sesiones/sesiones-de-sala/10293), [Senado — listado de sesiones celebradas](https://tramitacion.senado.cl/appsenado/index.php?ac=sesiones&etc=&mo=tramitacion), [Senado — votaciones para sesión 991](https://tramitacion.senado.cl/appsenado/index.php?ac=votaciones&mo=tramitacion&sesiid=991), [Senado — noticia sobre artes marciales](https://www.senado.cl/comunicaciones/noticias/artes-marciales-seran-consideradas-deporte-sala-votara-proyecto). Las consultas fueron de lectura; sin escrituras R2/D1 ni descargas históricas masivas.

## InfoLobby — desfase de ventana trimestral detectado el 10-10-2026

El catálogo oficial de InfoLobby enumera el **3.º trimestre de 2026 (julio–septiembre)**. En producción, consultas R2 acotadas por período devolvieron cero filas para julio y agosto, ambas con una partición faltante; septiembre devolvió cero filas. No se infiere que el origen oficial no tenga datos: el catálogo confirma que el trimestre existe.

La causa probable está reproducida en el flujo: el workflow semanal fijaba por defecto sólo los últimos ocho días. Las ejecuciones programadas del 28-09 y 05-10 buscaron ventanas 20–28 y 27-09–05-10; ambas quedaron vacías y omitieron la publicación. Los logs no acreditan qué versión del catálogo vio cada ejecución, así que no se atribuye el faltante de Q3 a una ejecución específica. Sin embargo, ese rango estrecho no puede recuperar eventos antiguos cuando un CSV trimestral se publica con desfase: el ETL filtra por fecha de evento después de consultar los CSV.

Corrección preparada en el PR #771: sin `from` explícito, el ETL relee desde el primer día del trimestre anterior; el 10-10-2026 eso corresponde a `2026-07-01`. Se añadieron pruebas de cambio de año y trimestre. **Aún no está promovida ni ejecutada contra R2**; julio/agosto siguen pendientes de ingesta y verificación productiva. La publicación conserva el preflight de presupuesto de R2 y el schedule no materializa D1.
