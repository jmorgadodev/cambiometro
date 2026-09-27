# Auditoría de fuentes productivas — 27-09-2026

## Alcance y cautelas

Se contrastaron `GET /api/v1/sources`, el manifiesto público de remuneraciones,
cinco búsquedas acotadas de remuneraciones, páginas públicas y el historial de
GitHub Actions hasta el 27-09-2026. No se hizo un barrido masivo, no se
consultó D1 masivamente y no se escribió ni eliminó información de R2.

El checkout no tiene el catálogo local `data/lake/catalog/v1/manifest.json`; la
comparación local disponible fue sólo con `data/etl/source-health.json`, cuyo
corte es 21-08-2026. Por eso las clases `match` (4 fuentes), `freshness` (5) y
`scope` (3) describen diferencias entre producción y ese snapshot local
antiguo; **no** miden cobertura del universo oficial. No hubo diferencias
`unexplained` ni `healthMismatch`. Ningún porcentaje de cobertura es defendible
sin un denominador oficial por fuente.

Los `recordCount` y `updatedAt` de la API son unidades y metadatos de estado;
no siempre representan filas únicas ni la fecha del último período fuente. Un
estado `partial` no equivale a un porcentaje conocido.

## Inventario visible en producción

| Fuente API | Conteo publicado | Estado API | `updatedAt` API |
| --- | ---: | --- | --- |
| Cámara | 59.405 | partial | 27-09-2026 12:58 UTC |
| ChileCompra OCDS | 74.142 | partial | 21-08-2026 10:10 UTC |
| Contraloría | 310 | partial | 27-09-2026 12:58 UTC |
| DIPRES | 247.287 | partial | 21-08-2026 02:44 UTC |
| INE Censo 2024 | 346 | connected | 27-09-2026 12:58 UTC |
| InfoLobby | 71.467 | partial | 27-09-2026 12:58 UTC |
| InfoProbidad | 16.077 | partial | 27-09-2026 12:58 UTC |
| Ley 19.862 | 62.172 | partial | 08-09-2026 13:21 UTC |
| Senado | 1.428 | partial | 27-09-2026 12:58 UTC |
| SERVEL | 23.894 | partial | 27-09-2026 12:58 UTC |
| SINIM | 3.105 | partial | 21-08-2026 03:50 UTC |
| Transparencia Activa CPLT | 1.243.761 | partial | 15-09-2026 08:08 UTC |

Los componentes que no entran en el contador principal deben permanecer
separados: Cámara publica además 16.275 gastos operacionales; Senado publica
154.132 gastos y 313 votaciones. No se deben sumar esos componentes al
`recordCount` de Cámara o Senado ni presentar el resultado como personas únicas.

## Remuneraciones: unidades y cobertura observada

El endpoint de remuneraciones responde a universos distintos de los del
manifiesto estático. No se deben sumar o comparar como si contaran lo mismo.

| Componente | Publicado/consultable | Alcance informado |
| --- | ---: | --- |
| CPLT — municipalidades | 1.243.761 consultables | 2026-06 / 2026-07; status partial |
| CPLT — organismos centrales | 2.092.412 consultables | snapshot actualizado 14-09; status partial |
| Registro 38 bis | 29.703 filas | 2025-01 a 2026-06; release complete |
| Personal de apoyo Cámara | 1.084 filas | 2026-08; status partial |
| Personal de apoyo Senado | 2.989 filas | 2026-08; status partial |
| DIPRES agregado | 15.689 filas; 0 consultables como personas | 2026-07; sólo agregado |
| Manifiesto estático unificado | 33.776 filas en 169 páginas | suma las páginas estáticas; no sustituye los índices externos CPLT |

La API entregó 200 y cinco consultas de verificación pasaron: Lucy Depablos (7),
Sofía Pumpin (1), María Victoria Raimann Pumpin (1), Río Sebastián Torrealba del
Río (1) e Independencia municipal (8.161 totales; 20 devueltos en la muestra).
En la primera ejecución paralela hubo un 503 transitorio; las consultas
serializadas siguientes y la auditoría completa terminaron correctamente.

La auditoría de calidad registra 159.705 filas municipales con incidencias
(159.679 con líquido no informado) y 563.221 centrales (563.169 con líquido no
informado). No son 722.926 montos erróneos: la principal incidencia es un dato
líquido ausente. Se mantiene separado de cero y del monto bruto, y no se
completa por inferencia.

## Estado de los ETL

| Flujo | Evidencia más reciente | Resultado/acción segura |
| --- | --- | --- |
| Cámara diario, Movimientos, Votaciones Cámara | 27-09 | Última ejecución listada exitosa |
| InfoLobby semanal | 27-09 | Exitosa |
| Remuneraciones 38 bis | 24-09 | Exitosa; corte hasta 2026-06 |
| Gastos Senado | 22-09 | Exitosa; la interfaz inicia en el último mes de cada fuente |
| Personal de apoyo Senado | 21-09 | Exitosa; corte publicado 2026-08 |
| Votaciones Senado remoto | sin workflow programado activo | Se respeta la decisión de mantenerlo local; el workflow de reparación aislada es manual y no se ejecuta aquí |
| ChileCompra OCDS | 07, 14 y 21-09 | El 07-09 publicó el catálogo/lago en R2 antes de fallar Pages; el 14 y 21-09 se detuvo antes de publicar por release vacío |
| Personal de apoyo Cámara | 30-08 a 21-09, fallidos | La fuente oficial devuelve 403 incluso en navegador; conserva el último release válido, de 2026-08 |
| Contraloría | 02-09 | Falló el paso de materialización D1. La API sigue exponiendo 310 registros; ese fallo por sí solo no demuestra que R2/Pages haya perdido el release |
| InfoProbidad / Ley 19.862 / SINIM / DIPRES / CPLT | 10-09 / 08-09 / 01-09 / 25-08 / 15-09 | Últimas ejecuciones listadas exitosas, de acuerdo con sus frecuencias mensual, semestral, trimestral o mensual |

### ChileCompra: comprobación de sólo lectura

La página oficial vigente documenta las consultas OCDS por año, mes y rango de
hasta 1.000 elementos:
[Datos Abiertos — procesos OCDS](https://datos-abiertos.chilecompra.cl/descargas/procesos-ocds).
Consultas de primera página con ese rango devolvieron 1.000 elementos para
2026-06 y 2026-07, pero el cuerpo de respuesta indicó “No se encontraron
resultados” para 2026-08 y 2026-09. En el run 34130670889 (07-09), el ETL
reportó 0 listados, documentos y registros para 2026-09 tras HTTP 403 en la
descarga masiva. Pese a ello, el workflow ejecutó `data:publish` antes de
comprobar la calidad del subset: el log confirma `action=publish`, 4.397.899.199
bytes proyectados según el plan R2 frente al límite configurado de
8.589.934.592, tres PUT y cero DELETE. Luego Pages rechazó `buyers=0`. Los releases listados por el
run fueron el catálogo, el manifiesto de Cámara y el de Contraloría; no aparece
un release de partición ChileCompra, pero el catálogo R2 sí se reescribió y su
checksum productivo no se ha cotejado directamente. La API productiva responde
74.142 registros; una consulta de muestra devolvió un registro de junio de
2026. La consulta de API filtrada por período produjo error 1102, por lo que
esta auditoría no confirma el corte mensual más reciente ni conteos por mes.
La lectura puntual de R2 el 27-09 muestra que el catálogo lista los períodos
2026-06 y 2026-07, declara 74.142 filas, pero contiene sólo una partición:
2026-06 con esas 74.142 filas. El objeto exacto de manifiesto que esa partición
referencia (`partitions/chilecompra/2026/06/manifest.json`) no existe en R2.
El índice independiente `indexes/v1/chilecompra/manifest.json` sí existe y
declara 74.142 filas en 1.483 páginas; por eso la búsqueda pública todavía
responde, aunque no prueba la disponibilidad de la partición ni resuelve el
corte de julio. El índice no declara `generatedAt`. No se pudo cotejar el
checksum del release de partición. Este hallazgo confirma una referencia rota
en el catálogo, pero no permite atribuir cuándo o qué ejecución la causó. No
hay prueba de pérdida del índice consultable; sí queda pendiente reconciliar o
reparar la referencia con un backup íntegro y una estimación segura de tamaño.

Los runs 14 y 21-09 se detuvieron en el guard de corte vacío antes de
`data:publish`. Se añadió al workflow una validación de todos los artefactos
estáticos locales inmediatamente antes de la publicación del lago; esto evita
repetir la secuencia del 07-09 si la ingesta o la proyección quedan incompletas.
No se reejecutó ni publicó ningún ETL durante esta auditoría.

### Movimientos

El verificador productivo pasó: el release mantiene 46 salidas verificadas con
corte al 14-09-2026 y las señales de José Bravo (15-09) y Fabián Páez (17-09)
separadas como pendientes; no se agregan al total de salidas efectivas. La
página responde 200, hidrata sin spinner ni errores de navegador, y el snapshot
conserva su checksum. La última ejecución diaria listada del ETL fue exitosa el
27-09.

## Pendientes ordenados por riesgo y posibilidad de resolver

1. **ChileCompra:** conciliar la referencia de partición R2 rota con el backup,
   recuperar checksum/tamaño y medir el espacio de cualquier reparación antes
   de escribir; confirmar si existe endpoint/descarga oficial vigente para
   julio-septiembre. No promover un “cero” como actualización.
2. **Personal de apoyo Cámara:** conseguir o identificar un mecanismo oficial
   accesible que sustituya la página bloqueada. No sortear el 403 ni usar datos
   de terceros como reemplazo; conservar agosto de 2026 hasta obtener evidencia.
3. **Contraloría:** inspeccionar el error concreto del paso D1 y decidir si esa
   materialización es necesaria para el producto. No alterar D1 ni hacer un
   barrido sin preflight; el estado de R2/Pages se verifica por separado.
4. **Cobertura general:** recuperar un catálogo R2 vigente y reconciliar fuente
   → release → API → página con cortes y checksums por fuente. Hasta entonces,
   presentar cobertura como “no medida” donde no haya denominador oficial.
5. **Análisis posteriores:** empezar por series y faltantes de cada fuente
   individual; dejar cruces nominales o causales fuera hasta tener
   identificadores fiables y cortes reconciliados.

## Procedencia y reproducibilidad

- `npm run audit:sources`: 1 consulta al endpoint público de fuentes; usó el
  `source-health.json` local, no un catálogo R2 vigente.
- `npm run audit:remuneraciones`: manifiesto y consultas paginadas pequeñas;
  `releaseMutation: none`, sin lecturas masivas de D1 y sin escrituras de
  releases.
- `npm run verify:prod:movimientos`: página pública y snapshot de movimientos;
  resultado `ok`, 46 salidas y checksum
  `d13f5601a427e26784dc923d23ebe27e9c691dfc41a216303e96e070eba5323b`.
- GitHub Actions fue consultado en modo lectura. En esta auditoría no se
  dispararon ETL ni se hicieron publicaciones en R2/D1.
