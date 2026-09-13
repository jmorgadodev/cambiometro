# Estado operativo y pendientes sin D1 — 2026-09-13

## Línea base verificada

- `main` quedó en el commit `05870f234409ceb203c65e1cc5eaca7e82b6ff15` después de integrar el PR #506.
- El PR #506 corrige `coverage-sweep`: un universo no verificado ahora deja el resultado general en rojo; antes podía terminar en verde por error.
- Build, lint, tipos, seguridad, browser E2E y refresco de Pages terminaron correctamente.
- `verify-prod-full` pasó 132/132 controles después del despliegue.
- Producción responde desde R2, sin lecturas públicas D1. D1 queda fuera de este trabajo por instrucción expresa.

## Fuentes y estado actual

| Fuente | Producción/R2 | Última evidencia | Estado operativo | Pendiente no-D1 |
|---|---:|---|---|---|
| Cámara, fuente base | 58.751 | 2026-09-13 | Operativa, parcial por alcance | Mantener separado personal, asistencia, votaciones y gastos; personal de apoyo sigue bloqueado por HTTP 403.
| Senado, fuente base | 1.428 publicados | 2026-09-13 | Operativa | Mantener la verificación rutinaria de las dos particiones recuperadas.
| Votaciones Cámara | 580 | 2026-09-13 | Operativa | Continuar actualización diaria y vigilar que el corte no retroceda.
| Votaciones Senado | 189 | 2026-09-13 | Operativa | Continuar actualización diaria y conservar el histórico.
| Movimientos | 82 | 2026-09-13 | Operativa | Seguir monitorizando frescura, estados y fuentes 403; no borrar el snapshot anterior si falla un conector.
| Transparencia Activa | 1.226.913 | 2026-09-02 | Operativa, parcial por publicación | Reconciliar el release productivo con el snapshot local y cerrar el historial mensual/anomalías sin alterar originales.
| ChileCompra | 74.142 vigentes | 2026-08-21 | Parcial; origen HTTP 403 | Separar definitivamente corte vigente e histórico 888.693 y recuperar el origen sin publicar un corte vacío.
| InfoLobby | 71.467 | 2026-09-13 | Operativa | Mantener el universo productivo y evitar que una corrida no verificada aparezca como verde.
| DIPRES | 247.287 | 2026-08-21 | Parcial/agregada | Actualizar según calendario trimestral y mantenerla como contexto agregado, no como remuneración individual.
| Contraloría | 310 declarados / 291 verificados | 2026-09-13 | Parcial | Revisar la diferencia de catálogo frente a informes efectivamente publicados; el ETL histórico falló por un flujo antiguo, sin reemplazar snapshot.
| InfoProbidad | 16.077 | 2026-09-13 | Operativa para el corte ene-sep 2026 | Histórico completo del corte publicado en R2; índice paginado activo. La fuente conserva su etiqueta de cobertura parcial si el catálogo no representa períodos fuera de este corte.
| Ley 19.862 | 62.172 | 2026-09-08 | Operativa | Reconciliar la diferencia con los baselines locales 59.361/59.544 antes de mostrar cobertura porcentual.
| 38 bis | 1.634 publicados en R2; Pages pendiente de rehidratación | 2026-09-13 | ETL correcto, refresco Pages bloqueado por secreto | Integrar PR #518 y repetir el refresco controlado; no reemplazar el snapshot con cero.
| SERVEL / SINIM / INE | 23.894 / 3.105 / 346 | 2026-09-13 | Operativos | Mantener actualización bajo demanda, semestral y censal respectivamente.

## Hallazgo adicional: honorarios de organismos centrales en Transparencia Activa

La fila mostrada para **ROMER ANGEL RUBIO FLORES** proviene de la nómina mensual oficial de personas naturales contratadas a honorarios de Transparencia Activa/CPLT, no de una convocatoria. La fuente publica, entre otros campos, período, nombre, función, calificación, región, moneda, bruto, líquido, modalidad de pago, fechas de inicio y término, observaciones y estado de publicación.

La comprobación directa del archivo oficial `TA_PersonalContratohonorarios.csv` respondió HTTP 200, `Content-Type: text/csv`, tamaño aproximado de **8.314.320.073 bytes (8,31 GB)** y fecha de modificación **2026-09-06**. El encabezado confirma que la fuente contiene `organismo_nombre`, `anyo`, `Mes`, `Nombres`, `Paterno`, `Materno`, `descripcion_funcion`, `tipo_calificacionp`, `region`, remuneración bruta y líquida, `tipo_pago`, cuotas, fechas de ingreso y término, observaciones y enlace documental. El primer bloque observado ya corresponde a julio de 2026, por lo que la fuente es más reciente que el corte CPLT municipal actualmente publicado.

La comprobación local dejó esta diferencia:

| Campo | Disponible en el release actual |
|---|---|
| Nombre, organismo, cargo y período | Sí, mediante 38 bis |
| Sueldo bruto mensual | Sí: marzo `$1.900.000`; abril-mayo-junio `$2.850.000` |
| Sueldo líquido | No en 38 bis |
| Función detallada, formación, región, fechas y modalidad de pago | No en 38 bis |
| Fila original CPLT de honorarios centrales | No forma parte del release público CPLT actual |

Una lectura acotada de los primeros 20 MiB del archivo confirmó las filas de **ROMER ANGEL RUBIO FLORES** en marzo, abril, mayo, junio y julio de 2026. La fila de junio coincide con la captura: bruto `$2.850.000`, líquido `$2.415.375`, pago mensual, ingreso `2026-03-11`, término `2026-12-31`, función de seguimiento de compromisos ministeriales y presidenciales, formación de abogado con magíster y región Metropolitana. La fuente también entrega un enlace al informe documental mensual.

El parser de Transparencia Activa reconoce esos campos, pero el flujo público vigente filtra el archivo masivo para conservar registros municipales. Por eso el dato no debe marcarse como inexistente: está publicado por la fuente, pero aún no está incorporado en la proyección pública. La siguiente incorporación debe ser una proyección separada de **honorarios de organismos centrales**, sólo con pagos/remuneraciones publicadas y con paginación R2; no se deben incorporar convocatorias ni usar D1.

Por el tamaño del archivo, la solución segura no es descargarlo completo al navegador ni guardarlo íntegro en el repositorio local: debe procesarse por rangos/stream, seleccionar sólo registros con remuneración y período válidos, particionar por organismo y mes, generar índices R2 y conservar el checksum del original. Antes de publicar se requiere una corrida de conteo y muestra; si la fuente no puede leerse íntegramente, se mantiene el release anterior.

La preparación local quedó implementada y probada, sin ejecutarse sobre la fuente masiva: `ingest:cplt-central-honorarios` lee por rangos, usa SQLite temporal y genera particiones mensuales con conteo, tamaño y SHA-256. Los tests del parser, particionador y stream pasan 6/6. Esta capacidad no modifica el release municipal, no habilita D1 y todavía no conecta esos archivos a la búsqueda pública.

Fuente de procedencia: [Portal de Transparencia](https://www.portaltransparencia.cl/) y [archivo masivo CPLT de honorarios](https://consejotransparencia.cl/transparencia_activa/datoabierto/archivos/TA_PersonalContratohonorarios.csv). El registro 38 bis utilizado para la comparación queda en `data/remuneraciones-38bis-publico-historico.json`.

## Hallazgo Senado: evidencia y decisión

El catálogo R2 declara estas dos particiones:

- `partitions/senado/2025/08/manifest.json`: 121 filas.
- `partitions/senado/2026/02/manifest.json`: 7 filas.

La consulta directa al bucket confirmó inicialmente que ninguno de los dos prefijos contenía objetos. La revisión del conector y una consulta de sólo lectura a la API oficial del Senado identificaron el dataset exacto de cada faltante: `2025-08` corresponde a 121 pasajes nacionales y `2026-02` a 7 misiones al extranjero. Los resultados son reproducibles: `2025-08` pasajes checksum `69cd86a5fcb6f1911520757bc0e5496272cb6e985437f6b3ea535735af0dca97` y `2026-02` misiones checksum `339c7bd5e3c5fa06771ccb58f580ac08c546c3b9d97540a630bea9ed7695ef97`. Se ejecutó después una publicación incremental controlada, sin D1 ni eliminaciones: el catálogo R2 ahora declara 1.428 filas de Senado y los manifiestos recuperados entregan 121 y 7 filas respectivamente. El pendiente de reconstrucción queda **resuelto**; permanece sólo la verificación rutinaria de que una siguiente corrida no las vuelva a perder.

## Auditoría completa de claves R2

Se listaron los objetos del bucket `transparencia-public-data` y se compararon con las 147 particiones del catálogo `catalog/v1/manifest.json`. Hay 66 manifiestos declarados sin objeto correspondiente. El resultado por fuente es:

| Fuente | Particiones sin manifiesto | Filas declaradas en esas particiones | Lectura productiva sin alcance |
|---|---:|---:|---|
| Cámara, variante histórica de votaciones | 13 | 2.110 | No usar este subtotal para declarar cobertura; el release vigente usa otro camino/variante.
| Contraloría | 17 | 213 | 65 publicadas de 310 declaradas; requiere reconciliación real.
| DIPRES | 17 | 231.598 | 15.689 publicadas de 247.287 declaradas; requiere distinguir histórico y corte vigente.
| Gastos Cámara | 4 | 13.020 | La ruta productiva usa el release de gastos y debe auditarse por separado.
| Gastos Senado | 4 | 5.267 | La ruta productiva usa el release de gastos y debe auditarse por separado.
| InfoLobby | 1 | 10.944 | El índice productivo independiente responde 71.467/71.467; no mezclar con este artefacto histórico.
| InfoProbidad | 0 | 0 | Las 9 particiones del corte ene-sep 2026 están publicadas y verificadas; el índice paginado permite consultar el histórico sin escaneo masivo.
| Senado | 2 | 128 | 1.300 publicadas de 1.428; coincide con las dos particiones faltantes descritas arriba.

Esta comprobación cambia el orden de trabajo: primero se debe reconciliar catálogo, manifiesto y camino público por fuente; sólo después se deben reconstruir particiones. En particular, no se debe subir un archivo vacío ni sumar el catálogo histórico al corte vigente. Los módulos indexados de InfoLobby y ChileCompra quedan separados porque sus índices sí responden con el universo que la interfaz declara.

## Pendientes ordenados

1. Senado: resuelto. Las dos particiones fueron publicadas incrementalmente y verificadas en R2/API; mantenerlas en el control de regresión.
2. ChileCompra: origen masivo identificado y validado por cabeceras para enero-julio 2026; probar un mes disponible en modo controlado, mantener vigente/histórico separados y no catalogar agosto/septiembre mientras respondan 403.
3. 38 bis: el ETL ya terminó correctamente en CI y publicó el release en R2; integrar PR #518 para que Pages use el secreto correcto y rehidratar producción.
4. CPLT: reconciliar el release productivo de 1.226.913 con los snapshots locales y cerrar observaciones de calidad por período.
   - Auditoría de honorarios centrales: **conteo y muestra verificados** (4.529.483 pagos positivos; 976 organismos; campos completos para el caso Romer Rubio).
   - Pendiente restante: conciliar solapamiento municipal/central, filtrar periodos observados y decidir el tamaño de una proyección R2 separada antes de conectarla a la búsqueda pública.
5. Contraloría: explicar 310 declarados frente a 291 verificables y corregir sólo metadata, no filas.
6. Ley 19.862: reconciliar catálogo, release y filas sin presentar el baseline local como producción.
7. InfoProbidad: resuelto en R2; mantener la corrida mensual y confirmar que el índice se conserva en las siguientes publicaciones.
8. DIPRES: verificar frescura del corte y documentar claramente su naturaleza agregada.
9. Cámara: reintentar personal de apoyo sólo cuando el endpoint oficial responda; conservar el snapshot actual ante 403.
10. Auditoría final: actualizar la matriz de fuentes, ejecutar el barrido de cobertura con todos los conteos verificables y confirmar que las rutas y nombres del menú no cambien.
11. Auditoría de claves R2: clasificar los 66 manifiestos ausentes como obsoletos, históricos, alternativos o realmente faltantes; no eliminar ni publicar hasta tener la procedencia.

## Fuera de alcance en esta ronda

- No se consulta, materializa, mide ni modifica D1.
- No se toca `cambiometro-editorial` ni sus publicaciones.
- No se descargan universos completos al navegador.
- No se reemplazan datos productivos por snapshots locales antiguos.
- No se convierten faltantes en cero ni se reconstruyen montos por inferencia.

## Actualización de matriz productiva — 13:18 UTC-3

Se volvió a consultar la API pública con `limit=1` por fuente, sin acceder a D1. El resultado confirma que el código HTTP 200 sólo demuestra que el endpoint está disponible; la cobertura se debe leer con `total`, `publishedRows`, `expectedRows`, `sourceStatus` y `missingPartitions`.

| Fuente consultada | HTTP | Total declarado | Filas publicadas en la ruta consultada | Esperadas | Estado | Lectura operativa |
|---|---:|---:|---:|---:|---|---|
| Cámara | 200 | 58.751 | 49 en la primera página | 58.751 | parcial | El endpoint responde; el número de la página no es el universo publicado.
| Senado | 200 | 1.428 | 50 en la primera página | 1.428 | parcial | Mantiene las dos particiones históricas no verificables descritas arriba.
| Votaciones Senado | 200 | 194 | 5 en la primera página | 194 | parcial | La consulta debe usar la fuente canónica de votaciones, no `votaciones_camara` como fuente genérica.
| Contraloría | 200 | 310 | 3 en la primera página | 310 | parcial | Responde, pero no prueba que las 310 filas estén disponibles.
| DIPRES | 200 | 247.287 | 15.689 | 247.287 | parcial | El release público es acotado y agregado; no debe presentarse como histórico completo.
| InfoLobby | 200 | 71.467 | 71.467 | 71.467 | completo | Es el único universo masivo auditado como completo en esta consulta.
| InfoProbidad | 200 | 16.077 | 100 en la primera página | 16.077 | completo en la ruta | Las 9 particiones están publicadas; el índice R2 permite paginar el histórico y evita el 1102 en páginas avanzadas.
| Ley 19.862 | 200 | 62.443 | 1.645 en la primera página | 62.443 | parcial | El total vigente difiere del baseline anterior; requiere reconciliación antes de publicar porcentajes.
| SERVEL | 200 | 23.894 | 23.894 | 23.894 | completo | Universo consultable completo.
| SINIM | 200 | 3.105 | 3.105 | 3.105 | completo | Universo consultable completo.
| 38 bis | 200 | 0 en la ruta genérica | — | — | temporalmente no disponible | Usa una ruta/proyección específica; el último release válido no se debe reemplazar.

La prueba de `votaciones_camara` con ese identificador devolvió 422 por parámetro de fuente no válido; no se clasifica como caída de Cámara. La fuente canónica debe verificarse mediante la ruta de votaciones existente.

La consulta directa local a `https://comision38bis.gob.cl/registro-publico` devolvió HTTP 200 y aproximadamente 1,3 MB, mientras que el runner de GitHub falló al consultar tanto CSV como HTML. Esto deja el problema clasificado como **alcance de red del runner**, no como error de parser ni como permiso D1.

## Resolución InfoProbidad — 13 de septiembre de 2026

La auditoría detectó que el catálogo declaraba 16.058 registros, pero sólo había 2 filas accesibles desde la ruta pública. La fuente oficial respondió correctamente al repetir la consulta histórica local: se obtuvieron 16.077 declaraciones entre enero y septiembre de 2026, en 9 particiones, con checksum por página y sin identificadores personales prohibidos en la proyección pública.

Se publicó en R2 el histórico completo del corte y se creó `indexes/v1/infoprobidad/` con archivo JSONL paginado, índice de búsqueda, conteos e índice de páginas. La API productiva quedó verificada así:

- página inicial: 100 filas, total 16.077;
- página final (`offset=16000`): 77 filas, total 16.077;
- backend: `r2-lake`;
- particiones faltantes: 0;
- lecturas D1 públicas: 0;
- 1102 en página avanzada: resuelto.

El uso R2 posterior a la publicación quedó en aproximadamente 4,6 GB de 8 GB (53,6%). El PR #508 integró la retención histórica de InfoProbidad y habilitó su índice paginado; sus checks de lint, tipos, tests, seguridad y E2E quedaron verdes.

## Verificación operativa adicional — 13 de septiembre de 2026

La lectura directa de producción se repitió después de integrar el PR #508 y sin consultar D1 para datos públicos:

- `/api/v1/health`: HTTP 200.
- `publicDataBackend`: `r2`.
- `publicD1Reads`: `false`.
- `transferSource`: `r2`.
- `transferRows`: `62172`.
- `d1TransferRows`: `0`.
- Home, Municipalidades, Maipú, Movimientos y Remuneraciones: HTTP 200.

El inventario público expone 12 fuentes canónicas. Los conteos vigentes observados fueron: Cámara 58.751, Senado 1.428 declarados, ChileCompra 74.142, Contraloría 310 declarados, CPLT 1.226.913, DIPRES 247.287, InfoLobby 71.467, InfoProbidad 16.077, Ley 19.862 62.443 en la API vigente, SERVEL 23.894 y SINIM 3.105. Estos números no deben sumarse ni convertirse en porcentajes de cobertura hasta resolver las diferencias de alcance indicadas en esta auditoría.

En InfoProbidad, la ruta paginada ya entrega el universo publicado del corte enero-septiembre 2026: 16.077 registros, 100 en la primera página y 77 en `offset=16000`, con cero particiones faltantes. Su etiqueta `partial` en el inventario debe interpretarse como cobertura temporal del corte publicado, no como pérdida de filas. Queda pendiente mejorar ese texto para que el usuario no confunda “corte parcial” con “release incompleto”.

## Verificación 38 bis y ChileCompra — 13 de septiembre de 2026

### 38 bis

La fuente oficial respondió localmente con HTTP 200 y el ETL produjo 1.634 filas del período `2026-06`, con checksum `42dd9a7d2d544bc059c40b8a7d320de4ee40729bd8ed13866ffecb9366521348`. El resultado separa 205 filas parlamentarias y 1.429 filas fuera de Congreso, conserva el histórico y registra `rowsRead=0` y `rowsWritten=0` para D1.

El workflow de GitHub no logró consultar la fuente oficial en su entorno, por lo que no se publicó el nuevo corte automáticamente. El PR #510 contiene sólo la actualización validada y la adaptación de pruebas para aceptar los valores oficiales observados en cortes distintos; su build, E2E, seguridad, lint, tipos y tests terminaron en verde. El PR queda listo para revisión, pero el snapshot productivo anterior se mantiene hasta que el runner pueda reproducir la descarga oficial.

### ChileCompra

Se comprobó que `https://datos-abiertos.chilecompra.cl/descargas/procesos-ocds` responde HTTP 200, pero devuelve una aplicación web de 1.051 bytes, no el archivo de datos. El endpoint OCDS oficial sí responde para períodos concretos: por ejemplo, `2026-07` declara 8.004 procesos en su primera consulta; `2026-08` devuelve `404 No se encontraron resultados` en la misma consulta. Por ello, el HTTP 200 de la página de descargas no puede tratarse como una descarga exitosa del ETL.

Producción expone actualmente 74.142 registros de ChileCompra y el catálogo histórico local declara 888.693. La diferencia queda clasificada como **corte vigente frente a histórico**, no como pérdida automática. La API respondió para `2026-06` con 9.302 licitaciones, 9.278 tratos directos y 17.565 convenios marco; para `2026-07`, con 8.004, 9.361 y 17.364 respectivamente. Para `2026-08` y `2026-09` respondió `404 No se encontraron resultados` en los tres tipos. El conector admite esos tres tipos y el flujo incluye archivos OCDS masivos por mes; falta obtener y validar el enlace real que la aplicación web entrega para cada período antes de ejecutar otra ingesta.

No se usó D1 en estas comprobaciones. El workflow todavía conserva un paso opcional de materialización D1 condicionado por preflight; la publicación pública continúa en R2/Pages y la cuota alta debe impedir esa materialización. Esto debe confirmarse en el próximo run antes de considerar cerrado el aislamiento de D1.

## Smoke de rutas — 13 de septiembre de 2026

El barrido HTTP acotado confirmó HTTP 200 para home, municipalidades, movimientos, remuneraciones, servicios públicos, cruces, personas, salud y fuentes. San Fernando también responde correctamente en la ruta canónica `/entidades/municipality-cl-06301/` (y en `/municipalidades/muni-sanfernando/`); la prueba contra `/municipalidades/municipality-cl-06301/` fue un falso negativo porque esa combinación de prefijo e identificador no es una ruta válida.

La ruta canónica de votaciones es `/votaciones-destacadas/`; `/votaciones/` no existe y no debe usarse como prueba de disponibilidad. No se detectó una regresión en esos módulos por este barrido.

## Cierre de bloque D1 y publicación 38 bis — 13 de septiembre de 2026

- PR #505 quedó integrado en `main` con merge `908ee9983c3db7ba66b47405d18b863016abbc21`; la materialización remota D1 requiere ahora doble opt-in explícito.
- PR #510 quedó integrado con merge `59dbf4c1830b28d9114d16650be741a29d90f8d7`; Remuneraciones públicas expone el corte 38 bis `2026-06` con 1.634 registros.
- PR #509 quedó integrado con merge `2d79b357e45f47c2ecb090dc9fa9bbefd7be69db`; la auditoría de InfoProbidad queda versionada en el repositorio maestro.
- Las verificaciones post-merge de Pages estático y del guard de publicación terminaron `success`.
- El health productivo continúa con `publicDataBackend=r2`, `publicD1Reads=false`, `d1TransferRows=0` y `transferSource=r2`.
- Los PR #490 y #492 fueron cerrados como supersedidos; no se borraron sus ramas ni su historial.

El E2E antiguo iniciado por el primer merge quedó reemplazado por la corrida consolidada posterior; los resultados verdes de Pages, guard, seguridad, calidad y ETL son los que se consideran válidos para este cierre.

## Reconciliación adicional Senado — 15:16 UTC-3

Se ejecutó una consulta de sólo lectura contra `web-back.senado.cl`, sin D1 y sin publicar cambios. La respuesta confirma la procedencia de las dos particiones ausentes:

| Período | Dataset oficial | Filas | Checksum del original consultado | Acción siguiente |
|---|---|---:|---|---|
| 2025-08 | Pasajes aéreos nacionales | 121 | `69cd86a5fcb6f1911520757bc0e5496272cb6e985437f6b3ea535735af0dca97` | Reconstruir y publicar sólo `senado/2025/08` |
| 2026-02 | Misiones al extranjero | 7 | `339c7bd5e3c5fa06771ccb58f580ac08c546c3b9d97540a630bea9ed7695ef97` | Reconstruir y publicar sólo `senado/2026/02` |

También se verificó que el API actual ofrece períodos más recientes por dataset, por lo que no corresponde usar una única fecha global para Senado: dietas llega a 2026-08, misiones al extranjero a 2026-08, pasajes nacionales a 2026-03 y gastos operacionales a 2026-05. La interfaz y los manifiestos deben conservar esa granularidad.

La publicación quedó comprobada el mismo día:

- `partitions/senado/2025/08/manifest.json`: 121 filas, proyección `187f71fb8023172413e4bd50216205a528bc7bdbe7967580300ea7ed5b9661f5`.
- `partitions/senado/2026/02/manifest.json`: 7 filas, proyección `3b006adbefbb1fab803c43d861f4f87aa964849a5128d74e517f773cbd4bc472`.
- Catálogo R2: Senado `1.428` filas declaradas/publicadas.
- Operación R2: 4 objetos por reparación, 0 eliminaciones, sin lecturas ni escrituras D1.

## Verificación posterior de producción — 13 de septiembre de 2026

Se repitió el smoke directamente contra producción, sin consulta ni medición de D1:

- `/api/v1/health`: HTTP 200; `publicDataBackend=r2`, `publicD1Reads=false`, `d1TransferRows=0`, `transferSource=r2`, `transferRows=62172`.
- `/api/v1/sources`: HTTP 200; inventario de 12 fuentes canónicas. Se confirmaron los conteos publicados de Cámara (58.751), CPLT (1.226.913), ChileCompra (74.142), InfoLobby (71.467), InfoProbidad (16.077), Ley 19.862 (62.172), Senado (1.428) y las demás fuentes del catálogo.
- `/api/v1/search?q=Romer+Angel+Rubio+Flores`: HTTP 200; el resultado incluye la remuneración 38 bis de junio de 2026 por `$2.850.000`, Presidencia, Coordinador de asesores.
- Rutas `/`, `/remuneraciones-publicas/`, `/municipalidades/`, `/movimientos/` y `/votaciones-destacadas/`: HTTP 200.

La búsqueda confirma que la incorporación 38 bis permanece operativa. La ficha completa de honorarios CPLT centrales sigue siendo un pendiente separado y no se debe resolver mezclándola con el release municipal ni con 38 bis.

## Auditoría de honorarios centrales CPLT — 13 de septiembre de 2026

Se ejecutó una lectura completa, por rangos HTTP y sin almacenar el CSV original localmente, del archivo oficial `TA_PersonalContratohonorarios.csv`. La fuente respondió con `Content-Length=8.314.320.073` bytes, `Last-Modified=2026-09-06T09:36:22Z` y ETag `"1ef9274c9-65acd3c04b180"`.

Resultado de la auditoría:

| Métrica | Resultado |
|---|---:|
| Filas procesadas | 15.527.940 |
| Filas con datos | 15.527.940 |
| Registros con pago bruto o líquido positivo | 4.529.483 |
| Filas excluidas por no tener pago positivo | 10.998.457 |
| Organismos identificados | 976 |
| Periodos 2024-01 a 2026-07 | 4.524.674 pagos |
| Periodos posteriores a 2026-07 | 4.809 pagos |

La fuente sí contiene organismos centrales y servicios públicos. Entre los organismos con más registros aparecen INE (150.230), Municipalidad de Maipú (88.681), Fundación Integra (87.684), IND (86.399), Municipalidad de Talca (71.742) y Hospital de Urgencia Asistencia Pública (48.317). Esto confirma que el archivo no es equivalente al release municipal actual: es un universo transversal de honorarios y no se puede añadir directamente sobre el catálogo CPLT vigente sin duplicar municipalidades.

El caso de Romer Ángel Rubio Flores quedó comprobado en el archivo oficial con las columnas de organismo, cargo/función, formación, región, monto bruto, monto líquido, tipo de pago, fechas de ingreso y término, observaciones y enlace al respaldo. Por tanto, la ausencia de esos campos en la ficha pública actual se explica por alcance del release, no por falta de datos en la fuente oficial.

También apareció una observación de calidad que impide publicar el universo sin una regla adicional: 4.809 pagos quedan después de `2026-07`, incluyendo periodos futuros hasta años extremos. Esos valores deben conservarse en una auditoría de fuente, pero quedar fuera de la vista pública hasta confirmar si corresponden a fechas mal formateadas o registros realmente futuros. No se debe inferir ni corregir el periodo automáticamente.

Decisión operativa:

- No se ejecutó la ingesta completa ni se modificó R2/Pages.
- No se consultó ni se modificó D1.
- El reporte técnico queda en `transparencia-app/data/auditorias/cplt-central-honorarios-audit.json`.
- La incorporación correcta será una proyección separada de honorarios pagados, particionada por mes, con deduplicación y exclusión explícita de periodos observados; no se mezclará con el release municipal ni con 38 bis.
- Antes de publicar se debe conciliar el solapamiento de organismos, estimar el tamaño de la proyección y validar un corte histórico y uno vigente en preview.

## Verificación integral posterior — 13 de septiembre de 2026

Se ejecutó `node scripts/verify-prod-full.mjs` contra producción sin ETL ni
materialización D1. El resultado fue **132 verificaciones pasadas y 0 fallidas**,
versión productiva `v1.0-a3a9ec59`. Pasaron home y footer, fichas, gastos,
cruces, movimientos, transferencias, fuentes, calidad, donaciones, layout,
votaciones, personal de apoyo, InfoLobby, ChileCompra, Contraloría y las fichas
parlamentarias estáticas. El health mantuvo `transferSource=r2` y `d1Rows=0`.

La comprobación no cierra por sí sola los pendientes de frescura de fuentes ni
autoriza publicar el universo central de honorarios; confirma que los cambios
locales documentales y de ETL no regresaron sobre la producción vigente.

## Corrida 38 bis y diagnóstico del refresco de Pages — 20:34 UTC-3

La corrida manual del workflow `ETL Mensual - Remuneraciones 38 bis` terminó
correctamente en GitHub Actions:

- Run `34781210062`: `success`.
- Período publicado: `2026-07`.
- Filas: `1.634`.
- Períodos históricos conservados: `17`.
- Checksum del release: `42dd9a7d2d544bc059c40b8a7d320de4ee40729bd8ed13866ffecb9366521348`.
- Auditoría del ETL: `rowsRead=0`, `rowsWritten=0`.
- R2 recibió `current.json`, `current-history.json`, `current-audit.json` y el
  manifiesto del release.

El workflow automático de Pages (`34781298373`) falló después de esa publicación,
antes de compilar, porque el paso de rehidratación 38 bis referenciaba el secreto
`CLOUDFLARE_API_TOKEN`, que no existe en ese entorno. El resto de los pasos de
lectura R2 usa `CLOUDFLARE_DATA_API_TOKEN`. No fue una falla del archivo 38 bis,
de la fuente ni de D1.

Se corrigió únicamente esa referencia en el PR #518. Hasta integrar el PR y
repetir el refresco de Pages, producción puede seguir mostrando el release
anterior aunque el release nuevo ya esté sano y disponible en R2.
