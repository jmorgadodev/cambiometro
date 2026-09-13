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

La consulta directa al bucket confirmó que ninguno de los dos prefijos contiene objetos. La API productiva entrega `publishedRows=1300`, `expectedRows=1428`; al filtrar cada período devuelve `missingPartitions=1` y cero filas. La fuente oficial actual sí responde, pero el conector de dietas devuelve 50 filas para cada período y el endpoint de gastos devuelve 1.199/1.200; por tanto, no es seguro reconstruir 121/7 sin identificar el dataset y release original. Se mantiene el snapshot publicado y el pendiente queda correctamente clasificado como **partición histórica declarada pero no verificable**, no como ausencia de la fuente.

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

1. Senado: identificar el dataset original de las dos particiones faltantes y reconstruir sólo con checksum/procedencia equivalente.
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
