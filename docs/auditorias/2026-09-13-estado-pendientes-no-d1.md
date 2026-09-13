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
| Senado, fuente base | 1.428 declarados / 1.300 publicados | 2026-09-13 | Parcial | Resolver las particiones declaradas `2025-08` (121) y `2026-02` (7), cuyos objetos R2 no existen.
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
| 38 bis | 1.634 en prueba aislada | 2026-09-13 | Código corregido, runner bloqueado | El workflow manual volvió a fallar porque el runner no pudo consultar la fuente oficial; R2 conserva el último release válido. No publicar cero ni reemplazar el snapshot.
| SERVEL / SINIM / INE | 23.894 / 3.105 / 346 | 2026-09-13 | Operativos | Mantener actualización bajo demanda, semestral y censal respectivamente.

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
2. ChileCompra: recuperar o validar el origen después del HTTP 403 y conservar separados vigente/histórico.
3. 38 bis: resolver la diferencia entre acceso local y runner; mantener el último corte mientras la fuente no sea reproducible en CI.
4. CPLT: reconciliar el release productivo de 1.226.913 con los snapshots locales y cerrar observaciones de calidad por período.
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

## Estado consolidado al 13 de septiembre de 2026 — revisión posterior

Esta sección prevalece sobre las notas históricas anteriores cuando describen un
estado que ya cambió. La producción y el release R2 son la referencia vigente;
el checkout local se conserva sólo para reproducir auditorías y pruebas.

### Cerrado o estable

- **D1:** el health productivo mantiene `publicDataBackend=r2`,
  `publicD1Reads=false`, `transferSource=r2`, `d1TransferRows=0` y
  `transferRows=62172`. No se ejecutó ninguna consulta D1 en esta revisión.
- **Senado:** las particiones `2025/08` y `2026/02` fueron publicadas de forma
  incremental, sin eliminaciones. El catálogo productivo declara 1.428 filas.
  El pendiente de reconstrucción quedó cerrado; sólo queda regresión rutinaria.
- **ChileCompra:** el guard contra releases vacíos quedó integrado. Un HTTP 200
  de la página de descargas no se considera una descarga de datos; el corte
  vigente se mantiene hasta validar el enlace OCDS real.
- **InfoProbidad:** el índice R2 paginado responde el universo de 16.077 filas,
  incluida la página final, sin fallback D1.
- **Movimientos y rutas principales:** smoke HTTP 200 confirmado para home,
  municipalidades, San Fernando, movimientos, remuneraciones, servicios,
  cruces, personas, votaciones, health y sources. Movimientos informa última
  ejecución `2026-09-13T12:28:47.590Z`, último evento `2026-09-02` y checksum
  `ea2dd566...`.
- **Verificadores:** el chequeo de la dieta parlamentaria ya no fija un monto
  histórico; valida el concepto, período y monto publicado. El PR #514 quedó
  integrado.
- **ETL separados:** los workflows de Cámara, ChileCompra, CPLT, Contraloría,
  gastos, InfoLobby, InfoProbidad, Ley 19.862, DIPRES, SERVEL y SINIM tienen
  calendario independiente. La acción `d1-preflight` conserva
  `allow-remote-materialization=false` por defecto; el workflow diario también
  exige un input manual para habilitarlo. Mientras ese input no se active, el
  ETL puede publicar R2/Pages pero no materializa D1.
- **Espacio local:** las carpetas temporales y artefactos generados retirables
  fueron limpiados. Permanecen sólo `cambiometro-public`, `cambiometro-audit`,
  `cambiometro-editorial` y worktrees de cambios aún sucios para no borrar
  trabajo del usuario.

### Pendientes reales, en orden de prioridad

1. **CPLT / Transparencia Activa:** reconciliar el conteo productivo de
   `1.226.913` con el snapshot local/manifiesto que declara `1.203.287`,
   clasificando diferencia de fecha, alcance o release. El caso reproducible
   `LATORRE RINCON, VALENTINA ANDREA` demuestra que el conteo agregado no basta:
   la persona aparece en la fuente oficial de Planta, pero no en la búsqueda
   pública actual. La causa estructural identificada es que el ETL general
   filtra sólo municipalidades y el flujo central separado cubre sólo
   Honorarios. Ver `docs/auditorias/2026-09-13-cplt-gap-latorre-rincon.md`.
   Después cerrar la auditoría de historial mensual, altas, bajas, cambios de
   sueldo, cambios de organismo y montos proporcionales sin alterar filas
   originales.
2. **Búsqueda transversal del home:** el índice estático de remuneraciones sí
   contiene `RÍO SEBASTIÁN TORREALBA DEL` y la búsqueda interna tolera tildes y
   mayúsculas; la prueba directa del índice devolvió sus cuatro filas históricas.
   El endpoint `/api/v1/search` todavía no devuelve por sí mismo el universo de
   38 bis porque el catálogo de entidades no lo contiene. Debe definirse si el
   API general también debe exponer ese índice, sin duplicar lecturas ni usar
   D1; la interfaz de home ya tiene el camino estático de remuneraciones.
3. **Cámara y Senado:** mantener la separación entre asistencia, votaciones,
   remuneraciones, personal de apoyo y gastos. Cámara conserva un alcance
   parcial y el personal de apoyo oficial sigue condicionado por HTTP 403.
   Senado debe conservar sus períodos por dataset y no usar una fecha global.
4. **ChileCompra:** validar el origen OCDS por período y documentar dos capas:
   corte vigente `74.142` e histórico local `888.693`. No publicar un corte
   vacío ni presentar el histórico como vigente.
5. **38 bis:** el último release válido queda protegido mientras GitHub no
   pueda reproducir la descarga oficial. Resolver la diferencia entre acceso
   local y runner, sin publicar cero ni reemplazar el snapshot.
6. **Contraloría:** explicar `310` declarados frente a `291` verificables y
   ajustar sólo metadata/procedencia, nunca inventar filas.
7. **Ley 19.862:** reconciliar catálogo, release R2 y baselines locales antes
   de mostrar porcentajes. Producción/R2 vigente: `62.172` filas.
8. **InfoLobby:** mantener el universo productivo `71.467` y mejorar el texto
   de corte parcial para que no se interprete como muestra de 40 filas.
9. **DIPRES:** mantenerla agregada; actualizar su corte según calendario y
   separar presupuesto, ejecución y series históricas sin convertirla en ficha
   salarial individual.
10. **Votaciones:** Cámara y Senado tienen cortes distintos; comprobar que la
    interfaz muestre el último período por cámara y conservar las votaciones
    destacadas sólo en la home.
11. **Validación final:** ejecutar el doble `verify-prod-full`, smoke de rutas,
    crawl frío, revisión móvil de remuneraciones, CSP/GA4 y comprobación de
    checksums después de cada bloque publicado.

### Cola histórica que no debe mezclarse con el cierre

Los PR abiertos antiguos (`#175`, `#83`, `#73`, `#33`, `#19`, `#12` y varios
Dependabot) no forman parte automáticamente de este cierre. Sólo se revisarán
si afectan una ruta actual, seguridad o dependencia reproducible; no se
fusionarán por antigüedad ni para “limpiar” la lista de GitHub.

### Resultado de la revisión

El proyecto no está totalmente cerrado todavía. D1 y los bloques de Senado,
InfoProbidad, movimientos, ChileCompra-guard y verificadores están estabilizados.
El trabajo pendiente sustantivo es reconciliar fuentes y frescura —CPLT,
ChileCompra, 38 bis, Cámara/Senado, Contraloría, Ley 19.862, InfoLobby, DIPRES
y votaciones— y luego ejecutar la validación final. Ninguna de esas tareas
requiere reactivar D1 para datos públicos.
