# Conciliación municipal — lote MU001/Planta/agosto 2026

## Alcance cerrado, no auditoría nacional

Comprobación del 15-10-2026 a las `08:41:05 UTC`, desde el worktree `C:\Users\jorge\.codex\worktrees\advisory-ui-total\cambiometro-audit`. Reutiliza `parseCpltHeader`, `getCpltCell` y `parseCpltRecord` de `transparencia-app/scripts/etl/cplt-personal.mjs`, sin modificar el parser ni publicar datos.

Cinco filas completas, seleccionadas por posición en una ventana del original, no por su importe. Organismo oficial `MU001`, Municipalidad de Algarrobo; modalidad Planta; período `2026-08`; página oficial `62624230`. No representan todas las filas del mes, todos los cargos de la persona, ni personas únicas. El caso Abel Becerra/Tortel no se repitió.

## Original y presupuesto de lectura

- [CSV oficial de Planta CPLT](https://consejotransparencia.cl/transparencia_activa/datoabierto/archivos/TA_PersonalPlanta.csv), tamaño declarado `8.734.918.943` bytes.
- ETag observado y estable entre solicitudes: `"208a4491f-65d8e2d3d5f80"`. Si cambia, los offsets y hashes de esta evidencia no deben reutilizarse como si fueran el mismo original.
- Lectura inicial de cabecera: 1 solicitud, 8.192 bytes. Localización por organismo mediante rangos: 23 solicitudes, 1.180.224 bytes. Comprobación de las cinco filas: 2 solicitudes, 136.192 bytes. Inspección acotada posterior de cero/nulo: 2 solicitudes, 1.008.192 bytes. **Total CSV leído: 28 solicitudes, 2.332.800 bytes**, sin descargar el archivo completo.
- Se exigió HTTP 206; respuesta sin rangos o cambio de ETag detiene la comprobación. La búsqueda de localización tuvo topes de 28 solicitudes y 1.500.000 bytes. No presupone que el CSV esté ordenado por mes: la ventana contiene períodos mezclados.
- Ventana de cotejo: bytes `4345230377–4345358376`, longitud `128000`, SHA-256 de bytes originales `46838ea779f3dbec39c58f3d7ae276a7d2a7e7dc72b0540af25978174d9924b2`; decodificación `windows-1252`. Cabecera: bytes `0–8191`. Se descartan las líneas incompletas de ambos extremos y se filtran `MU001`, año `2026`, mes `Agosto`, tomando las primeras cinco filas completas.
- API: cinco búsquedas nominales acotadas, `scope=municipal`, `include_zero=true`, `limit=20`. Todas terminaron en una sola página; vínculo exacto por ID de registro, organismo y período, **no por nombre solamente**. Una consulta exploratoria anterior de Ollagüe con límite 2 no forma parte del lote ni acredita sus montos.
- Una lectura directa adicional de R2: `projections/funcionarios-v1/manifest.json`, 542.237 bytes, SHA-256 `9565ecd3d208e0f1dc48f0e05689aed3e7f1edd7456ab411b384d5abf7e99f04`, versión `2026-09-15T08-08-44-566Z`, generado `2026-09-15T08:08:44.566Z`. Declara índice `projections/funcionarios-v1/versions/2026-09-15T08-08-44-566Z/search_index.json`, 1.243.761 filas, páginas de 10.000. No se descargaron sus páginas ni el universo del índice. La fecha coincide con `updatedAt` de la API; no se presenta esa coincidencia como cotejo de todos los objetos R2.
- Sin escrituras R2, ETL, despliegues ni consultas directas a D1. La API declaró `r2-search`; este diagnóstico no mide las operaciones R2 internas por petición ni sustituye el panel de facturación. El catálogo `/api/v1/sources` informa el mismo conteo/fecha, estado parcial y checksum nulo; no se inventa un checksum del catálogo.

## Resultado fuente → parser → API

El bruto y líquido del CSV (decimales `,0`) se convirtieron a los mismos enteros servidos por la API. Una coincidencia exacta por ID/organismo/período en cada caso, sin diferencias en estos dos campos.

| Nombre publicado, normalizado sólo para lectura | Sufijo ID `func-muni-algarrobo-planta-…` | Bruto fuente = parser = API | Líquido fuente = parser = API |
| --- | --- | ---: | ---: |
| Lujbica Jeannette Acuña Alvarez | `f3ef87d06c4e2349` | 1.536.823 | 1.120.794 |
| Nizy Alarcon Barra | `2ae9250cbdc147d9` | 2.046.877 | 1.221.097 |
| Cristobal Andres Albornoz Ruiz | `217f283939b7890e` | 1.068.313 | 646.385 |
| Zara Alvarez Gallardo | `f8cf274796908cc0` | 2.181.766 | 1.718.509 |
| Francisca Pamela Aranda Muga | `7e7b86cf1938ddab` | 1.188.552 | 832.531 |

Hashes SHA-256 de cada línea decodificada, sin cambiar su terminador `\r` conservado por la separación en `\n`:

| Sufijo ID | SHA-256 |
| --- | --- |
| `f3ef87d06c4e2349` | `d408999b606eaa158bab416451f6153822be2ad413d353696b16238d0916a0b1` |
| `2ae9250cbdc147d9` | `334e8a7ae093d47934c66fa91aec11f16735cf4c257192d91688fbffd303877c` |
| `217f283939b7890e` | `6515d251fa68eb69fb55a688b7bf142a1af59d51ace453702c82e3c075386b19` |
| `f8cf274796908cc0` | `c48f349a50e0c5196e5c428a9d4cf36912482e7824ecfeeefd096ad61ea8c70e` |
| `7e7b86cf1938ddab` | `50ce4437302bd9dab0b319c01e6a4f479fd66e8436db253f00234c4591a413ab` |

API observada: índice municipal actualizado `2026-09-15T08:08:44.566Z`. Totales por consulta nominal: 3, 4, 3, 5 y 4 respectivamente; se cotejó sólo la fila exacta de este lote, no todos los resultados de cada nombre. `fuente_periodo=2026-08` no significa que todo el índice tenga ese corte.

## Pantalla productiva

En navegador real, [búsqueda de Nizy Alarcon Barra](https://cambiometro.impulsacv.cl/remuneraciones-publicas/?q=Nizy%20Alarcon%20Barra): cuatro registros; al expandir la ficha, fila Municipalidad de Algarrobo / Prevencionista de Riesgos / `2026-08` / **$2.046.877**, igual al original. Se preservan por separado los otros cargos/períodos publicados. Sin errores ni avisos de consola observados. Esto comprueba la presentación de un registro, no las cinco fichas ni todos los campos líquidos en pantalla.

## Cierre y continuación exacta

- **Lote cerrado: 5/5 importes brutos y 5/5 líquidos coincidentes; 0 diferencias observadas.** No requiere corrección de datos ni de interfaz. No volver a leerlo mientras no cambie su original/índice ni exista una regresión identificada.
- Inspección posterior `08:45:38 UTC`: ventana de 1.000.000 bytes desde el mismo offset, SHA-256 `d25e3fd5cbb9572f7d3d53105ecfab24a49f9ede113d9807bed8ac34b4fd1136`, mismo ETag. Contiene 240 filas de MU001/Planta/agosto 2026: cero brutos cero, cero brutos nulos, cero líquidos cero y cero líquidos nulos. **No hay casos cero/nulo observados para cotejar en esta ventana**; no se amplió el barrido ni se fabricaron casos. Sólo cinco de esas 240 filas fueron contrastadas con la API. Las otras 235 no se consideran conciliadas.
- **Punto 6 nacional sigue abierto.** Este lote tiene sólo valores positivos; no acredita nulos, cero, duplicados, integridad de toda la nómina ni explicación sustantiva de los pagos. No convertir 5/5 en un porcentaje de exactitud nacional. La ventana original también contenía otros meses, incluido septiembre de 2026: no se afirma que agosto sea el último período del original ni que el índice de septiembre 15 esté actualizado a todos los datos observados hoy.
- Siguiente lote: seleccionar desde el índice un caso cero/no informado con organismo, modalidad y período exactos, preflight de su original y cotejo acotado por ID. No repetir las 240 filas de esta ventana para volver a buscar esos casos. ChileCompra permanece al final; no reabrir puntos 1–5 cerrados ni la extracción de apoyo en seguimiento automático.

## Selección del lote siguiente — todavía no conciliado

Una consulta posterior `query=Algarrobo&scope=municipal&include_zero=true&limit=100` devolvió 100 de 4.440 registros y cuatro filas con bruto o líquido cero/nulo en esa página. No es un conteo de todos esos casos en el organismo. Entre ellas:

| ID | Período/modalidad | Bruto API | Líquido API | Estado |
| --- | --- | ---: | --- | --- |
| `func-muni-algarrobo-honorarios-f96d3fc1a272750b` | 2025-10 / Honorarios | 1.300.000 | `null`, original almacenado `0` | Conciliado con líquido vacío; actualización de abajo |
| `func-muni-algarrobo-honorarios-c2623ebc3fb90483` | 2025-09 / Honorarios | 1.300.000 | `null`, original almacenado `0` | Diferencia temporal con el CSV actual; actualización de abajo |
| `func-muni-algarrobo-planta-4c3371554b49f732` | 2025-04 / Planta | 700.146 | `null`, original almacenado `0` | Original pendiente de individualizar |

**El `0` almacenado en el campo original de una proyección antigua no demuestra que el CSV oficial tenga cero.** Tampoco autoriza sustituir el `null` de la API. Primero debe localizarse la fila oficial exacta y comprobar el campo; no se corrigió ni se afirmó un error de importe sin esa prueba.

Se hizo una exploración acotada sin individualizar esas filas: dos rangos adicionales de Planta (1.008.192 bytes), y 22 rangos de [Honorarios CPLT](https://consejotransparencia.cl/transparencia_activa/datoabierto/archivos/TA_PersonalContratohonorarios.csv) (2.172.032 bytes; tamaño total 8.427.304.167; ETag `"1f64e74e7-65d8d56112500"`). Ventana Honorarios: offset `3805461931`, 2.000.000 bytes, SHA-256 `ba09ca09290dd69a54cb156787390b367f31820f25b1859403c398aec128a4f1`. No encontrar un nombre en una ventana y con un filtro textual no acredita ausencia del registro en el archivo. No recorrer el archivo completo ni interpretar esa búsqueda como prueba negativa.

Sumando la exploración no concluyente: **52 solicitudes y 5.513.024 bytes de originales** en esta sesión, una lectura directa de manifiesto R2, sin descargas completas ni escrituras. Para continuar, conservar los IDs anteriores y cambiar la estrategia de localización (identidad del parser y período, no coincidencia textual rígida); no volver a empezar por las cinco filas positivas cerradas. No se asigna porcentaje nacional mientras falte un alcance y denominador verificables.

## Continuación — 15-10-2026, 09:03 UTC

Se reutilizó el parser y se buscó por su ID estable, no por texto en mayúsculas. El CSV de Honorarios contiene nombres con capitalización mixta; el filtro anterior, sensible a mayúsculas, no permitía concluir ausencia. Se conservaron las ventanas en memoria para consultar los mismos bytes sin otra petición.

### Caso octubre 2025: conciliado

- ID `func-muni-algarrobo-honorarios-f96d3fc1a272750b`, nombre publicado Adela Ananahat Novoa Balladares, cargo Profesional Psicólogo para Oficina Local de la Niñez.
- Página original `61890240`, año 2025, mes Octubre, bruto literal `1300000,0`, **celda de líquido vacía**. Parser: bruto 1.300.000 y líquido `null`. Nueva consulta API: mismo ID, organismo, cargo, mes y valores. SHA-256 de la línea decodificada: `9ee67d26058af9f6dc3ce15ec4a999242157f0f028fe6c05412a6dc41fd155d4`.
- **Cerrado el cotejo de bruto/líquido y período de este registro.** No hay un pago líquido de cero acreditado ni un monto que corregir. El `0` auxiliar almacenado en la proyección no es evidencia del contenido literal del CSV actual; no mostrarlo como importe oficial ni reemplazar `null` por `0`. No se fusionan las variantes de nombre con otros IDs.

### Caso septiembre 2025: diferencia temporal, no conciliado

- API actual: ID `func-muni-algarrobo-honorarios-c2623ebc3fb90483`, Adela Novoa Balladares, `2025-09`, bruto 1.300.000, líquido `null`.
- En las ventanas actuales se localizó ese mismo ID/cargo con página `61703530`, **julio de 2025**, bruto `1300000,0`, líquido vacío. SHA-256 de esa línea: `f6f417eb55a3fd98f9c00b9347d23bf6724e0c0a6792b1c85e56fad4699c3c38`. No se usa julio como validación de septiembre ni se cambia el mes productivo a julio.
- Manifiesto R2 vigente: versión y SHA-256 idénticos al lote anterior (`2026-09-15T08-08-44-566Z`, `9565ecd3d208e0f1dc48f0e05689aed3e7f1edd7456ab411b384d5abf7e99f04`). Para Honorarios declara `sourceValidator="1f22bc5f5-65b5a02e4d780"`; el CSV consultado hoy tiene ETag `"1f64e74e7-65d8d56112500"`. Para Planta, el manifiesto registra `"20445bc33-65b5ad260afc0"`, distinto del CSV actual `"208a4491f-65d8e2d3d5f80"`.
- **Se comparan cortes originales distintos.** Esto no demuestra corrupción del índice ni acredita que septiembre estuviera ausente en el archivo anterior. `sources` y `assets` del manifiesto no ofrecen una referencia al CSV original archivado de aquel corte; no se afirma que no exista en otro lugar. Resolver con la evidencia de ese corte o con un refresh validado que declare su alcance; no corregir filas históricas por inferencia a partir del CSV actual.

### Lecturas y límite

- Honorarios, mismo ETag durante la lectura: cinco solicitudes HTTP 206, **6.016.384 bytes**, bajo el preflight de 36 solicitudes / 6.500.000 bytes. Las dos ventanas usadas para el cotejo empiezan en `3805461931` y `3807461931`, cada una de 2.000.000 bytes. La primera conserva SHA-256 `ba09ca09290dd69a54cb156787390b367f31820f25b1859403c398aec128a4f1`; la segunda `a60ba0a9d8e8bb381edea8679b70e4863664e8c73be7e13e5e4a57bdc80e43d8`. Se conservaron límites de línea entre ventanas.
- Un intento de cambiar a Planta conservó por error el lector enlazado a Honorarios. Se detectó por URL/ETag y código de organismo, y **se descartó como evidencia de Planta**; sus 2.000.000 bytes están incluidos en el total anterior, no ocultos. No modificar la URL de un lector/caché ya creado: usar parámetros explícitos o un lector independiente y verificar URL/ETag antes de interpretar datos de otra fuente.
- Una lectura directa de manifiesto R2 (542.237 bytes) y una consulta API acotada a Adela Novoa Balladares (3 resultados, una página, estado `r2-search`, actualización del índice sin cambios). No se escribió R2/D1 ni se ejecutó ETL o despliegue. No se midió facturación desde el panel.
- El caso Planta/abril 2025 sigue pendiente: no se obtuvo una nueva fila original válida en esta continuación. No se repite la búsqueda nacional ni se supera el presupuesto para aparentar cierre. El límite de bytes es una guarda de esta comprobación, no un error del sitio oficial.

### Próxima acción exacta

No repetir octubre de 2025 ni los cinco registros positivos cerrados. Primero resolver la procedencia del corte de septiembre (archivo de aquel corte o candidato nuevo validado, sin sobrescribir el release durante la auditoría); después localizar la fila Planta/abril mediante lector específico. El punto 6 sigue abierto; estas comprobaciones no acreditan toda la nómina municipal ni un porcentaje de exactitud nacional.

## Continuación cerrada del caso Planta/abril — 16-10-2026

- Observado `2026-10-16T04:24:27.649Z`. Sólo este caso pendiente, no repetición del lote de cinco filas: HEAD y dos rangos de Planta (cabecera 8.192 bytes + ventana 2.000.000), **3 solicitudes / 2.008.192 bytes**, sin archivo completo, escrituras R2 ni D1. Cada rango exigió HTTP 206, longitud/Content-Range y ETag idéntico al manifiesto nuevo: `"208a4491f-65d8e2d3d5f80"`.
- Ventana desde `4345230377`, longitud `2000000`, SHA-256 de bytes `3a34a85f4131fe71a865e9e4c09f2d628ec8137978e714286150de195d203fa7`; decodificación windows-1252 y descarte de extremos incompletos. Parser existente, organismo MU001 / Municipalidad de Algarrobo.
- Fila exacta **`func-muni-algarrobo-planta-4c3371554b49f732` / Adelina Elizabeth Mella Plaza / abril 2025**: bruto literal **`700146,0`**, líquido literal **`0,0`**; parser **700.146 / 0**, iguales a la nueva proyección R2 y API por ID y período. SHA-256 de línea decodificada con su CR: **`a8dc2d1d4ca0be3c1763cbccd0fae79e0ed838cd75ae79811b4904a1e0bac603`**.
- **Caso conciliado: el CSV sí publica cero explícito, no celda vacía.** El null servido antes no describía ese literal del original actual; no usarlo como motivo para transformar todos los ceros ni para cambiar otras filas. Tampoco afirmar que la persona no recibió sueldo o que el monto es una mensualidad completa/vigente.
- La misma ventana contiene el mismo ID para marzo 2025 (1.251.091 / 27.855), febrero 2025 (1.169.059 / 339.508) y diciembre 2024 (1.767.339 / 883.669). No se sustituyen meses entre sí ni se presenta el corte de última fila publicado como historial completo.
- Con el refresh autorizado, Adela Novoa `c2623ebc3fb90483` ya sirve **julio 2025 / 1.300.000 / null**, igual al original individualizado anteriormente. Se cierra la discrepancia del **corte vigente**; no se afirma que septiembre nunca existiera en el original anterior, que no se conservó aquí.
- La recuperación y su alcance se registran en [CPLT recuperación](cplt-recovery-20261015.md). Estos casos cerrados no certifican todas las comunas: quedan por clasificar los cambios de disponibilidad de Penco, Negrete y Macul en el nuevo manifiesto. No reabrir los seis cotejos cerrados sin cambio de original o regresión concreta.
