# Revalidación productiva de R2 y gastos operacionales — 27 de septiembre de 2026

## Alcance

Comprobación de sólo lectura contra `transparencia-public-data`,
`cambiometro-backups` y la API pública. Las consultas productivas se limitaron
a una fila por prueba; además se navegó la ficha pública para verificar meses
concretos. No se consultó D1 ni se escribió/eliminó R2. Se hizo una
reproducción local del conector para un diputado, no una ejecución ETL completa
ni una publicación; tampoco se desplegó código.

## Hallazgo prioritario: Gastos Operacionales de Cámara

La API productiva responde desde el índice mensual R2:

| Corte | Filas consultables | Resultado |
|---|---:|---|
| 2026-03 | 3.255 | API responde |
| 2026-04 | 3.255 | API responde |
| 2026-05 | 3.255 | API responde |
| 2026-06 | 3.255 | API responde |
| 2026-07 | 0 | No aparece en el índice mensual vigente |
| **Total publicado** | **13.020** | Cuatro cortes, marzo–junio de 2026 |

El catálogo canónico aún declara cinco particiones (marzo–julio) y 16.275
filas, incluida la referencia de julio con 3.255 filas. La discrepancia de
julio está confirmada: el manifiesto mensual productivo no lo incluye. No es
un problema del filtro de fecha; los cuatro cortes vecinos devuelven filas.

### Recuperabilidad y validación del corte de julio

El respaldo compacto tiene una copia del snapshot `2026-09-13` para
`gastos_camara/2026/07`. Se recuperaron en memoria sus objetos y se verificó:

- checksum SHA-256 y tamaño de cada objeto contra el manifiesto del respaldo;
- checksum del artefacto de registros contra el manifiesto de partición;
- descompresión gzip válida;
- 3.255 filas, igual al conteo de la partición.

El manifiesto de partición marca el corte como **partial**. La copia es
íntegra y recuperable, pero eso por sí solo no demuestra que sea un corte
completo de la fuente oficial.

La revisión del 28 de septiembre en la ficha oficial de Ignacio Achurra
(`prmId=1186`) mostró 21 categorías para junio; cinco tienen montos positivos
y suman $5.519.755. La reproducción local del conector devolvió el mismo
conteo y total para junio.

Se ejecutó una reproducción local acotada del conector con ese único diputado
(sin D1 ni escrituras R2). Devolvió 126 filas para marzo–agosto: 21 por mes.
Julio y agosto salieron con 21 montos cero cada uno para Achurra. El 28 de
septiembre se confirmó el estado después de esperar la finalización del
postback nativo de la propia página y se amplió la muestra:

| Diputado/a | Julio 2026 en fuente oficial | Agosto 2026 |
|---|---|---|
| Ignacio Achurra | Tabla publicada, 21 categorías, todas en $0 | Tabla publicada, 21 categorías, todas en $0 |
| Pamela Jiles | “Los datos ... no han sido publicados” | “Los datos ... no han sido publicados” |
| Gustavo Gatica | “Los datos ... no han sido publicados” | No consultado |
| Álvaro Carter | “Los datos ... no han sido publicados” | No consultado |

Para elegir esa muestra con actividad previa, se hicieron consultas acotadas por
persona al corte publicado de junio en la API de producción. Las cuatro
respondieron desde `r2-months` con 21 conceptos; registraron respectivamente
5, 6, 7 y 9 conceptos con monto positivo (Achurra, Jiles, Gatica y Carter).
Así, las tres fichas que declaran julio no publicado no son casos sin actividad
en el corte previo observado.

Esto confirma que la salida de 3.255 filas (155 × 21 conceptos) por mes no se
puede presentar como 155 rendiciones de cero: al menos tres fichas oficiales
declaran que julio no está publicado, mientras otra sí entrega una tabla de
ceros. El ETL debe conservar esa distinción: cero sólo cuando existe una tabla
publicada; sin tabla publicada no debe crear 21 filas cero. El parser local
ahora reconoce el mensaje explícito y los tests cubren ambos estados. La
reproducción de Achurra no cambió sus 21 ceros.

No está demostrado que haya montos positivos perdidos en julio/agosto ni que el
cero de Achurra sea incorrecto. Sí está demostrado que el artefacto amplio
mezcla estados distintos o no permite distinguirlos, por lo que es inseguro
promoverlo como corte general. Julio sigue sin índice mensual productivo y se
mantiene retenido; agosto también queda retenido hasta completar su muestra.

No se promovieron cortes ni se escribió en el bucket público. El conector se
cambió localmente para usar el selector y el postback nativo de WebForms, en
lugar de construir un `fetch` manual; las pruebas unitarias dirigidas pasan y la
reproducción de Achurra conserva sus conteos. No se reconstruirá ni promoverá
el subset hasta que el ETL produzca un corte con los estados publicados/no
publicados diferenciados y se valide una muestra mayor.

## Ley 19.862: dos releases con conteos distintos

La ruta especializada `/api/v1/transferencias?page=1&limit=1` responde 200 y
declara un release paginado de **62.172** filas, con checksum
`9615b9e0453a3dcbb849114295d3803a3aaeec84c336669efb0e2afe6f800825`, generado
el **8 de septiembre de 2026**. El manifiesto de transferencia valida sus
páginas y declara ese release completo.

Por separado, el catálogo y `sources/ley-19862/manifest.json` suman **62.443**
filas en ocho cortes de enero a agosto de 2026; todas las particiones constan
como parciales y sus objetos canónicos de lake no están presentes en el bucket
público. Quedan **271 filas de diferencia** entre el manifiesto de fuente y la
proyección paginada. No se puede atribuir aún a deduplicación, filtro,
actualización o pérdida: el release API no conserva en su manifiesto el
recuento de filas excluidas/duplicadas. Además, la ruta genérica
`/api/v1/records?source=ley-19862` no es el contrato de consulta de esta fuente
y devuelve cero desde las particiones ausentes; la ruta válida es
`/api/v1/transferencias`.

El 28 de septiembre se consultó una vez el manifiesto público
`/data/transferencias/manifest.json`: confirma `totalRows: 62172`, 1.244 páginas
y la fecha `2026-09-08`, pero no incluye `sourceRows`, `duplicateExactRows` ni
`duplicateConflictingRows`. Aunque el generador local sí puede calcular y
escribir esos campos, en este checkout faltan las particiones fuente necesarias
para reproducir el release. Por tanto, las 271 filas siguen sin explicación;
el hecho de que el pipeline deduplique por ID no prueba que esa sea la causa
exacta.

**Acción pendiente:** reconciliar esas 271 filas desde un insumo fuente
verificable antes de cambiar el conteo o el estado público. No corregir la
diferencia borrando catálogo ni infiriendo que son duplicados.

Se encontró además una pérdida de metadatos en el publicador: el generador de
transferencias calcula las filas fuente, duplicados exactos/conflictivos y
exclusiones por fecha de corte, pero al armar el manifiesto API el script
`publish-transferencias-api-release.mjs` omitía esos campos. El publicador ahora
los conserva; la hidratación estática y la comparación local/R2 también los
preservan y verifican. Los contadores ausentes quedan como `null`, no como cero.
Esto hará auditables los próximos releases, pero **no explica retroactivamente
las 271 filas del release productivo actual**: sus particiones fuente siguen
ausentes en este checkout y no se publicó un release nuevo.

## Interpretación del inventario R2

El inventario actual registra 23.391 objetos, 317 referencias de partición,
267 manifiestos presentes y 50 ausentes. Las 50 referencias suman 466.279
filas declaradas, pero ese valor **no significa 466.279 filas perdidas**:
mezcla particiones que tienen una proyección alternativa, fuentes agregadas y
casos que sí necesitan recuperación. Debe leerse como el tamaño declarado de
referencias a manifiestos de partición ausentes, no como cobertura ni como
pérdida comprobada.

Las consultas productivas corroboraron:

| Fuente/ruta | Resultado observado | Lectura correcta |
|---|---|---|
| ChileCompra, `/api/v1/records` | 74.142; `r2-lake`, `complete` | Índice consultable para el corte de junio de 2026; no prueba histórico anual completo. |
| InfoLobby, `/api/v1/records` | 71.467; `r2-lake`, `complete` | Índice consultable; no debe confundirse con cobertura oficial total sin denominador. |
| InfoProbidad, `/api/v1/records` | 16.077; `r2-lake`, `complete` | Índice consultable; cobertura de origen no medida aquí. |
| Contraloría, `/api/v1/records` | Conteo inestable (62–211 según offset); `expectedRows: 310`, `partial`, 1 partición ausente | La respuesta actual no permite afirmar cuántas filas son consultables: `total` depende del límite/offset hasta que se valide el cambio de paginación. |
| DIPRES | El Worker lo define `aggregate-only` | Datos agregados, no buscador de registros de personas. |
| Gastos del Senado | 154.132; 174 períodos, 2012-01 a 2026-07 | Julio 2026 responde 1.250 filas desde R2. |

El estado `complete` de una proyección significa que su paginación coincide
con el manifiesto de esa proyección; **no equivale automáticamente a cobertura
completa del universo oficial**.

### Rutas que requieren contrato específico

`/api/v1/records` no es por sí sola una prueba adecuada para cada fuente:

- Ley 19.862 se consulta por `/api/v1/transferencias`; la ruta genérica devuelve
  cero porque las particiones de lake no están en el bucket público.
- Gastos del Senado y de Cámara usan el índice mensual R2; no deben validarse
  sólo con los manifiestos de partición del lake.
- El identificador genérico `senado` devuelve cero aunque el catálogo declare
  1.428; votaciones y gastos tienen IDs/rutas propios.
- SERVEL y SINIM devuelven cero en la ruta genérica, mientras el catálogo
  declara 23.894 y 3.105 respectivamente. Sus páginas usan proyecciones o
  artefactos especializados; queda pendiente cotejar esos datos con su
  endpoint/página y no presentar el cero genérico como ausencia total.

Estas diferencias necesitan una matriz de contratos por fuente. El campo
`queryableCount` de `/api/v1/sources` no debe interpretarse como resultado
probado de `/api/v1/records` cuando el dominio usa otra ruta.

## Salud de rutas revisadas

Respondieron HTTP 200: `/api/v1/sources`, `/api/v1/transferencias`, el
catálogo de entidades municipales, `/municipalidades`, `/partidos` y
`/transferencias`. Esto verifica conectividad y render de esas rutas, no toda
la navegación ni todas las búsquedas de la plataforma.

## Seguimiento de rutas especializadas — 28 de septiembre de 2026

Comprobación de sólo lectura en producción:

- `/api/v1/records?source=servel&limit=1`, `source=sinim` y `source=senado`
  responden cero filas. El catálogo de `/api/v1/sources` declara, en cambio,
  23.894, 3.105 y 1.428 registros respectivamente; por tanto, esos ceros no
  prueban ausencia de datos y confirman que la ruta genérica no es un contrato
  válido para esos tres IDs.
- `/rankings` responde HTTP 200 y renderiza 1.229 candidaturas agregadas (1.096
  en la sección de diputaciones y 22 pactos). El catálogo SERVEL declara
  23.894 registros. No son cifras reconciliadas: la página presenta candidatos
  agregados y el catálogo cuenta otra unidad; falta relacionarlas con el
  manifiesto/proyección antes de describir cobertura o el significado del
  conteo. El checkout de auditoría no contiene las particiones ni la proyección
  SERVEL, así que esa conciliación no se puede hacer desde los artefactos
  locales actuales.
- `/municipalidades/maipu` responde HTTP 200 y muestra SINIM 2025, presupuesto
  vigente y una cobertura declarada de 345/346 comunas. Esto confirma que la
  ficha consume una proyección específica aunque la ruta genérica de registros
  SINIM devuelva cero. El archivo local `data/lake/projections/v1/sinim.json`
  declara 345 municipios distintos, 3.105 valores (9 indicadores por municipio)
  para 2025. En Maipú, su BPVIM es $219.402.160.000, que coincide con los
  $219,4 mil millones renderizados en producción. La cobertura 345/346 coincide
  con el conteo de la proyección, aunque la razón de la comuna faltante requiere
  documentar el alcance oficial de SINIM.
- Las rutas `/api/v1/records?source=votaciones_senado&limit=1` y
  `source=gastos_senado` sí devuelven registros, con totales de 313 y 154.132.
  El ID genérico `senado` no sustituye esos dominios.

Conclusión: la discrepancia observada es de **contrato/unidad de consulta**, no
evidencia suficiente de pérdida. La proyección SINIM y un valor municipal
quedaron cotejados; aún falta explicar el límite 345/346 con referencia de
alcance oficial. La unidad SERVEL sigue pendiente porque las particiones y la
proyección no están en este checkout. No hubo lecturas D1, escrituras R2 ni
cambios de producción.

El comando de solo lectura `npm run audit:sources` consultó el catálogo
productivo el 28 de septiembre y comparó con el snapshot local de salud. Como
este checkout no tiene `data/lake/catalog/v1/manifest.json`, el modo reportado
fue `health-only`, no una conciliación completa de manifiestos. Clasificó 4
fuentes como conteo coincidente, 5 como publicación productiva más reciente, 3
como diferencias de alcance/categoría y 0 como diferencias sin explicación en
esa comparación preliminar. Esto **no significa que las 12 fuentes estén
auditadas ni que su cobertura esté completa**. Ejemplos del resultado:

- SERVEL: 23.894/23.894 y SINIM: 3.105/3.105 coinciden entre el catálogo
  productivo y el snapshot de salud local; ambos siguen con estado `partial`.
- Cámara: 59.405 en catálogo productivo frente a 19.025 en el snapshot local;
  se clasifica como frescura y los componentes (asistencia, votaciones,
  autoridades y gastos) tienen contratos/conteos separados.
- Senado: 1.428 en la categoría agregada; votaciones (313) y gastos (154.132)
  se excluyen explícitamente de ese total y deben auditarse aparte.
- ChileCompra: 74.142 productivos frente a 888.693 locales se clasifica como
  diferencia de alcance (release vigente por períodos frente a histórico
  local), no como pérdida demostrada.
- Transparencia Activa: 1.243.761 en producción frente a 1.218.136 local,
  ambos conteos parciales y de fechas distintas.

El snapshot local observado se generó mayoritariamente el 21 de agosto, por lo
que no debe usarse para reconstruir ni reemplazar los releases productivos.

## Próximas acciones, en orden

1. Ampliar la muestra oficial de julio/agosto a diputados con actividad alta,
   media y baja en los meses ya publicados; la primera muestra confirmó una
   tabla legítima de ceros y tres fichas con el mes no publicado. Mantener
   ambos cortes excluidos hasta medir cuántos registros de cada estado hay.
2. Generar un preview local de ambos cortes sólo después de reconstruirlos
   desde una extracción validada; cotejar montos, cardinalidad, totales y
   navegación mensual. No desplegar ni escribir R2 durante esta auditoría.
3. Reconciliar las 271 filas de Ley 19.862, distinguiendo filas crudas,
   deduplicadas y publicadas; actualizar el manifiesto sólo con evidencia.
4. Conciliar Contraloría: el total de producción no es estable entre páginas
   (revalidación del 28 de septiembre abajo). Primero corregir/prometer el
   contrato de paginación; después inventariar particiones y conciliar 310
   esperadas con los registros efectivamente recuperables.
5. Inspeccionar los manifiestos/proyecciones SERVEL y contrastar sus 23.894
   registros con 1.229 candidatos agregados de Rankings; documentar la unidad
   contada. Para SINIM, documentar por qué el universo publicado es 345/346 y
   confirmar continuidad del corte 2025. Mantener la conclusión de que la ruta
   genérica no mide esos dominios.
6. Continuar la matriz fuente → artefacto → API → página y validar el resto de
   los dominios; los porcentajes de cobertura siguen “no medidos” si no hay un
   denominador defendible.

**Estado:** auditoría parcial. En Gastos de Cámara, junio de Ignacio Achurra
coincide entre ficha y ETL ($5.519.755). La muestra oficial de julio/agosto
confirmó que el mismo corte puede ser una tabla de ceros o “no publicado” según
la ficha; ambos meses siguen retenidos porque el artefacto amplio no distingue
esa cobertura por persona. El conector local usa postback nativo y evita crear
ceros ante el mensaje explícito de no publicación. No hubo promoción ni
escritura R2. En Ley 19.862 continúan sin explicar 271 filas. No hay cambios de
producción en esta nota.

## Revalidación de Contraloría y paginación — 28 de septiembre de 2026

La cifra de 62 de la consulta anterior no es un total fiable del universo. Se
repitieron lecturas pequeñas de `/api/v1/records?source=contraloria` con
`limit=50` y offsets 0, 50, 100 y 125. Cada solicitud entregó 50 filas únicas,
pero `meta.total` cambió respectivamente a 62, 127, 167 y 211. Una consulta
adicional en offset 0 confirmó `expectedRows: 310`, `missingPartitions: 1` y
`sourceStatus: partial`; `publishedRows` también reflejó las filas leídas para
esa página, no un conteo global. La API usa offset/cursor correctamente para
seleccionar filas, pero su metadata cambia según cuánto del archivo haya
recorrido esa solicitud.

La causa está en `lib/r2-records.ts`: para una fuente no filtrada, la lectura
se detiene al tener la página solicitada. Si el catálogo marca particiones
faltantes, el código publicaba ese subtotal recorrido como `total`; por eso el
total crecía al avanzar el cursor. Se añadió una prueba de regresión con una
partición ausente y conteos de catálogo conocidos. La implementación local
conserva el total esperado (310 en el caso productivo), lo identifica con
`totalScope: "catalog-expected"` y mantiene `sourceStatus: "partial"` junto a
`missingPartitions`, sin afirmar que las filas esperadas están todas
disponibles. El cursor reserva las posiciones de particiones faltantes para no
repetir filas al avanzar. Las suites dirigidas de registros, fallback y API
pasan (88 pruebas).

Esto **no resuelve aún la diferencia de contenido**: una fila esperada puede
estar en la partición ausente, y hace falta verificar los artefactos recuperables
y la paginación completa desde un preview/despliegue autorizado. La deducción
anterior de “62 servidas, 35 en una referencia ausente y 213 sin explicar” queda
retirada como conteo actual: 62 era sólo el subtotal alcanzado en la primera
lectura limitada. No se escribió R2 ni D1, ni se desplegó el arreglo. El contrato
local está corregido; producción aún conserva el comportamiento anterior hasta
que se promueva. La suite global, los dos typechecks y las verificaciones
estáticas están verdes, y el build completo de Pages pasó al hidratar de forma
verificada los datos productivos que faltaban. Falta validar el artefacto en
preview y volver a medir producción después de promocionar con autorización.

## Build completo con artefactos productivos — 28 de septiembre de 2026

El primer build local se detuvo porque el worktree no contenía los dos subsets
de gastos y el release canónico de transferencias. Se comprobó que no existían
localmente y que las rutas de destino están ignoradas por Git; había 73 GB
libres. Se hidrató únicamente el manifiesto de gastos y sus dos subsets, y el
release de Transferencias Ley 19.862 vigente en producción. El manifiesto de
transferencias (62.172 filas, 1.244 páginas) coincidió con el endpoint público
por checksum. El verificador de hidratación comprobó las páginas, los 62.172
registros y el checksum agregado; se guardaron unos 33,6 MB locales. Fueron
1.249 lecturas directas de objetos R2 en esta preparación (incluye manifiestos
y subsets), sin escrituras ni borrados en R2/D1.

Con esos insumos reales, `npm run build` terminó con código 0: generó 4.675
páginas estáticas, verificó 4.670 rutas canónicas de SEO/sitemap, comprobó el
release de transferencias y pasó el verificador de gastos. Confirmó que Cámara
incluye marzo–junio 2026 (13.020 filas); julio sigue excluido por matriz amplia
de ceros no fiable y agosto por no publicado. Senado declara 154.132 filas en
174 períodos, desde 2012-01 hasta 2026-07. No se usaron datos de muestra, no se
desplegó y no hubo escrituras de almacenamiento remoto.

## Reconciliación de remuneraciones — 28 de septiembre de 2026

`npm run audit:remuneraciones` terminó sin diferencias en su matriz y ejecutó
consultas acotadas a R2 (`sourceStatus: r2-search` y
`r2-search-central`), sin lecturas masivas de D1 ni escrituras de releases.
El universo publicado/consultable observado es de 1.243.761 filas municipales
y 2.092.412 centrales (3.336.173 filas en total; no equivale a personas únicas).
Los cortes reportados son 15 y 14 de septiembre, respectivamente.

El chequeo de calidad halló incidencias de campos en 159.705 filas municipales
y 563.221 centrales (722.926 filas; 21,67% combinado). La incidencia dominante
es `remuneracion_liquida_no_informada`: 159.679 municipales y 563.169
centrales. Esto no invalida los montos brutos; indica que el dato líquido falta
en esas filas y no debe completarse como cero. Los otros avisos son prefijos de
nombre numéricos/ inválidos o nombres incompletos; la normalización declarada
conserva el valor de origen y no infiere datos.

Las búsquedas acotadas de Lucy Depablos, Sofía Pumpin, María Victoria Raimann
Pumpin y Río Sebastián Torrealba del Río devolvieron coincidencias en ambos
alcances según corresponde; Independencia devolvió 8.161 filas municipales
(20 solicitadas). Estos son smoke tests, no una prueba exhaustiva de todas las
fichas ni de identidad única.

## Inventario actual de almacenamiento R2 — 28 de septiembre de 2026

`npm run audit:r2:storage` enumeró sólo metadatos de ambos buckets. El bucket
público contiene 23.391 objetos y 7.131.123.983 bytes; `cambiometro-backups`
contiene 4.108 objetos y 1.049.483.183 bytes. En conjunto son 8.180.607.166
bytes de un umbral local configurado de 10.000.000.000 bytes: 81,81%, dentro
del umbral de observación (80%) pero por debajo de revisión al 90% y bloqueo al
95%. Este inventario de objetos no confirma por sí solo el cobro del ciclo; ese
importe sólo se confirma en el panel de facturación.

El inventario materializado `catalog/v1/storage.json` está atrasado: declara
7.041.350.049 bytes y 23.208 objetos, mientras el listado vivo encuentra 183
objetos adicionales (89.689.856 bytes), todos bajo `projections/static-site-v1`,
y un objeto cuyo tamaño cambió. No hubo objetos que existieran sólo en el
inventario cacheado. No se regeneró ni publicó el inventario, porque eso sería
una escritura R2 fuera del alcance de sólo lectura.

Los mayores grupos vivos son las proyecciones municipales y centrales
(3.350.012.291 y 1.785.010.804 bytes), seguidas de `indexes/v1`
(868.850.812 bytes) y `projections/static-site-v1` (532.835.240 bytes). El
respaldo actual es de ~1,05 GB, no los 6,36 GB de la captura anterior. La
auditoría read-only del manifiesto `compact/v1` confirma 4.940 referencias a
4.107 blobs, todos presentes; el manifiesto los marca verificados y registra
9.101.563.059 bytes originales representados frente a 1.044.729.646
comprimidos. No hay blobs huérfanos, faltantes, referencias inválidas ni
diferencias de tamaño. No se encontraron snapshots candidatos vencidos bajo la
retención de ocho semanas. Esto reconcilia manifiesto, inventario y tamaños,
pero no sustituye una restauración de prueba que descomprima y valide una
muestra de contenido; no se autoriza borrar ni reducir retención.

## Revalidación operativa — 28 de septiembre de 2026

El smoke del build estático local comprobó HTTP 200 y título/H1 principal en
Home, `/buscar?q=Torrealba`, `/movimientos`, una ficha parlamentaria,
`/municipalidades`, `/remuneraciones-publicas`, `/gastos-operacionales` y
`/transferencias`. La Home no tuvo desbordamiento horizontal a 390 px después
de cargar el DOM. Es una comprobación del HTML estático/rutas; no equivale a
una prueba exhaustiva de las interacciones cliente de búsqueda.

`npm run verify:prod:movimientos` pasó contra producción: la página hidrató sin
spinner ni errores de navegador y el asset coincide con el release
`kast-2026-succession-reconciled-2026-09-14`, 46 movimientos y checksum
`d13f5601a427e26784dc923d23ebe27e9c691dfc41a216303e96e070eba5323b`. Fabián
Páez (17-09) y José Bravo (15-09) permanecen como las dos señales en
confirmación, separadas de las salidas verificadas; las exclusiones históricas
y el cargo de Rafael Araos también pasaron sus aserciones.

No se pudo listar el proyecto Pages con el token Cloudflare local: el API
respondió error de autenticación/permisos `10000` en la lectura de
`pages/projects`. La publicación de preview se completó de forma alternativa
mediante GitHub Actions, run `36378158323`, URL
`https://3f407566.cambiometro.pages.dev` (alias de rama
`https://codex-r2-catalog-reference-a.cambiometro.pages.dev`). Fue sólo un
deployment de preview; no se promovió producción ni se hicieron escrituras en
R2/D1. Las ocho rutas respondieron HTTP 200 y el preview incluyó `noindex`.

Durante la revisión previa a promoción se encontró y corrigió otra falla local
en `publish-transferencias-api-release.mjs`: tras extraer el manifiesto a un
helper, el resumen final seguía referenciando una variable `releasePrefix` fuera
de ámbito. Si se ejecutaba, podía fallar al imprimir el resultado después de
haber completado las escrituras del release. El resumen ahora toma la ruta del
manifiesto construido y una prueba reproduce su contenido. Los valores usados
por esa prueba son un fixture pequeño sintético; no afirman que las 271 filas
pendientes de reconciliación sean duplicadas.

La suite completa de ese estado pasó con 1.298 pruebas; typechecks, arquitectura,
tokens, enlaces y scanner de HTML también pasaron. `eslint` de los archivos
tocados terminó con cero errores y cuatro advertencias. El workflow
`pages-ui-refresh` ofrece una entrada manual `preview_branch`: su paso de
preview despliega a Pages sólo esa rama y los pasos de producción requieren
`publish_pages=true` junto a `confirm_cutover=CAMBIOMETRO_CONFIRM_CUTOVER`.
La prueba interactiva posterior detectó que las tres llamadas del buscador
global (`/api/v1/search`, `/api/v1/funcionarios` y `/api/v1/entities`)
respondían HTTP 404 desde el host `pages.dev`; sólo cargaban las coincidencias
del índice estático de remuneraciones. Por eso el smoke de rutas anterior no
demostraba que el buscador funcionara. Se añadió una prueba de regresión y se
ajustó `publicApiUrl` para usar la API pública en localhost y `*.pages.dev`,
manteniendo rutas relativas en producción y permitiendo un origen explícito de
preview. La nueva prueba falló antes del cambio y pasa después. `npm test`
terminó con 1.299 pruebas aprobadas tras la corrección.

El build completo local no se pudo validar: faltan el lago completo de Ley
19.862 y el release paginado canónico, por lo que `build-static-site-data.mjs`
detuvo el proceso antes de exportar. El workflow `pages-ui-refresh` sí pudo
recuperar el snapshot validado por checksum y completar el build y verificadores.
El run `36379778139` terminó exitosamente; publicó sólo el preview
`https://1a54a9d3.cambiometro.pages.dev` y el alias
`https://codex-r2-catalog-reference-a.cambiometro.pages.dev`. La opción de
publicación productiva estaba desactivada y sus pasos quedaron omitidos.

La verificación interactiva posterior confirmó que las tres llamadas del
buscador reciben HTTP 200 desde la API pública: `/api/v1/search`,
`/api/v1/funcionarios` y `/api/v1/entities`. Para Kaiser, la interfaz presenta
30 fichas agrupadas en páginas de 15; Johannes aparece en la primera página y
Vanessa en la segunda. Torrealba también devuelve fichas agrupadas y paginadas,
en lugar de limitarse a las pocas coincidencias del índice estático. El alias
de preview continúa con `X-Robots-Tag: noindex`. Esto valida el buscador en
preview, pero no prueba que la misma corrección esté en producción: no se ha
promovido ningún cambio productivo.

## Revalidación de Contraloría y preview aislado (28-09-2026)

Dos lecturas pequeñas a la API productiva, con `limit=2` y offsets 0 y 2,
confirmaron que Contraloría responde desde `r2-lake` y que el cursor avanza sin
repetir los cuatro IDs. Sin embargo, el Worker productivo entrega `total=62`,
`publishedRows=62`, `expectedRows=310`, `sourceStatus=partial` y una partición
faltante; por eso informa 31 páginas aunque el catálogo espera 155 páginas de
dos filas. El cambio local de paginación declara `totalScope=catalog-expected`
y conserva los huecos esperados; esa versión aún requiere prueba remota.

La configuración estándar `env.preview` no es adecuada para esta prueba: enlaza
D1 productiva y el job de staging ejecuta `ensure-transfer-d1.mjs --create`.
Se añadió `wrangler.audit-preview.jsonc`, un validador que prohíbe bindings de
D1, rutas de dominio y correo, y un smoke que compara dos páginas, total,
expectedRows y cursores. `wrangler deploy --dry-run` confirmó que sólo enlaza
`PUBLIC_DATA` (R2) y las tres guardas de lectura. El despliegue local fue
rechazado antes de publicar por permisos del token de Cloudflare en el endpoint
de secrets (`No access to the specified resource`). Para no recurrir al job
existente, que crea/binda D1, se agregó una opción manual y separada de GitHub
Actions (`deploy_r2_audit_preview`), que desplegó el Worker
`https://cambiometro-public-api-r2-audit-preview.koooke.workers.dev` (versión
`a7d87df1-d574-46d6-83a6-8c23652b9870`, run `36381743537`). El primer smoke fue
demasiado permisivo y aceptó páginas vacías, así que no se toma como validación.
Una lectura R2 directa y acotada confirmó que falta
`partitions/contraloria/2026/08/manifest.json`; el catálogo aún espera 35 filas
para agosto. Julio sí está disponible: 62 filas, paginables y con checksums
válidos. El preview nuevo informa el total esperado de 310 pero mantiene el
estado parcial; el endpoint sin filtro reserva las 35 posiciones ausentes, por
lo que las primeras páginas quedan vacías y la primera página legible comienza
en offset 35. Se endureció el smoke para validar explícitamente el total
esperado y la paginación de julio con IDs reales. La segunda ejecución
(`36382131945`) pasó: total esperado 310 estable, 62 filas publicadas en julio,
estado parcial y cuatro IDs distintos entre dos páginas reales; preview versión
`7427aa94-2c02-4fe8-baa2-bed8a8a8ff9b`. No se escribieron objetos R2 ni filas
D1, ni se promovió producción. La restauración del release de agosto sólo debe
intentarse después de comprobar una copia exacta y el margen de almacenamiento
de R2; la página pública debe seguir indicando que los registros consultables
son parciales hasta resolverlo.

### Diferencia de universo del release

La revisión del respaldo no encontró la versión productiva de agosto: los
snapshots `backup/2026-08-20` y `backup/2026-09-13` contienen el mismo manifiesto
antiguo, SHA-256
`8c683a7bb06ac30f5d3415000a066378eaa323528d9cf6732ad09e7cd596d722`, cuyo
`recordCount` es 3. Su objeto JSONL comprimido también se validó contra el hash
archivado. No sirve para restaurar la partición que el catálogo actual declara
con 35 filas y checksum `83ffe5a6…`.

El run ETL de Contraloría `33633187407` (02-09) sí publicó el lago R2 antes de
fallar después en la materialización D1. Su manifiesto de fuente está en el
release `data-contraloria-2026-manifest-c3b10aa8e943de2b` y declara 284 filas.
El catálogo productivo del 27-09 declara 310; la distribución mensual también
difiere en enero–julio de 2026 (la cifra de agosto coincide en 35). La suma
consultable por período del catálogo es 275 filas en períodos con artefactos
legibles y 35 esperadas en agosto sin su manifiesto. Las diferencias de
checksum entre los manifiestos de fuente y catálogo no se interpretan por sí
solas como corrupción porque sus alcances podrían ser distintos; los conteos
sí requieren reconciliación antes de afirmar completitud.

El release de GitHub contiene sólo el manifiesto JSON de 6,6 KB, no las filas
ni el artefacto recuperable; el checkout local tampoco conserva la partición.
Por tanto, no se puede reconstruir la versión de 35 filas desde el backup
verificado. Queda pendiente determinar qué versión es la autoridad para cada
período y, si el origen oficial aún la ofrece, regenerar únicamente los
artefactos faltantes con preflight de tamaño/checksum. Hasta entonces
Contraloría sigue parcial, la promoción productiva no está autorizada y la
paginación sin filtro puede empezar con páginas vacías al reservar el hueco de
agosto.

### Reconsulta del origen oficial y límite de cobertura observado — 28-09-2026

Se consultó en modo lectura la aplicación oficial de Contraloría, recorriendo
las 27 áreas centrales y las 16 regiones (43 listados). La vista actual muestra
informes de agosto de 2026; 33 filas de agosto quedaron visibles en los listados
consultados. Ese 33 es un **mínimo observado**, no el universo mensual: varias
vistas entregan como máximo diez filas, ordenadas desde las más recientes, y
no se encontró paginación en el listado. Una inspección de Bio-Bío mostró seis
filas de septiembre seguidas por cuatro de agosto, para diez en total.

El scraper vigente (`scripts/ingest-contraloria.mjs`) lee sólo las filas que
están cargadas en cada listado mediante `tr:has(td)` y no navega páginas
adicionales. Por tanto, no puede asumirse que su conteo represente todos los
informes del área/año. El dato del catálogo de 35 para agosto coincide con un
conteo declarado en un manifiesto anterior, pero no se pudo comprobar aún
contra los 43 listados actuales ni recuperar las 35 filas exactas. Esta
reconsulta acredita que el origen todavía ofrece registros de agosto, pero no
que permita reconstruir íntegramente el corte faltante desde la interfaz
actual. No se descargaron PDFs, no se ejecutó el ETL y no se escribió en R2 o
D1. Además, se consultó una sola vez la clave canónica
`partitions/contraloria/2026/08/records.jsonl.gz`; Wrangler confirmó que el
objeto tampoco existe en R2 (404), por lo que no queda un payload huérfano en
esa ruta.

Antes de regenerar o publicar, queda pendiente identificar una interfaz oficial
que permita recorrer el listado completo (paginación, filtros por período o
endpoint con alcance verificable) y reconciliar sus IDs con catálogo/manifiesto.
Hasta entonces, los conteos deben describirse como subconjunto disponible; no
como cobertura anual completa. No se debe volver a ejecutar y promover el ETL
actual como si cubriera el universo completo.

También se revisó el catálogo de [Datos Abiertos CGR](https://www.contraloria.cl/multisite/datos-abiertos/auditorias-y-fiscalizaciones.html).
Sus archivos abiertos aportan una ruta oficial para histórico, pero la página
declara alcances anteriores al año requerido: la base no municipal cubre
2020–2025 y la municipal 2020–2024; la base general termina en 2025. Sólo se
consultaron los encabezados HTTP, no se descargaron los ZIP (aprox. 4,86 MB,
4,02 MB y 9,03 MB respectivamente). Por eso esas bases no prueban ni reparan
el corte de agosto de 2026 y no se han incorporado al sitio.

Como protección local, `buildLakePlan` ahora permite exigir que una fuente no
reemplace una partición existente con un conteo menor. `ingest-contraloria`
activa esta regla para sus períodos: si el siguiente intento vuelve a producir
33 ante 35 filas catalogadas en agosto, fallará antes de emitir un plan de
publicación. Las pruebas reproducen 33<35 y verifican que 35=35 sigue pasando.
El guard sólo compara conteos —no prueba igualdad de IDs ni repara agosto— y
quedó guardado en el commit `cf7716b` de la rama de trabajo; no se ejecutó el
ETL ni se desplegó.

### Respuesta degradada de la API

El fallback `recordsUnavailable` del Worker mantenía totales literales por
fuente; Contraloría reportaba 291 aunque el catálogo R2 vigente declara 310 y
el manifiesto ETL revisado declara 284. Al ocurrir una indisponibilidad, esos
valores no se podían respaldar con un catálogo accesible. Se eliminó esa
afirmación del código de trabajo: el fallback ahora devuelve `expectedTotal:
null` si no hay manifiesto disponible. La prueba de regresión falló primero al
recibir 291 y pasó después del cambio; los 24 tests de `index.test.ts` y
`api:typecheck` pasan. La versión se desplegó sólo al Worker aislado
`cambiometro-public-api-r2-audit-preview` (versión
`20446794-73d6-4ebb-95df-2cbeaa64fe45`, workflow `36383543138`). Su smoke
remoto volvió a confirmar `expectedRows=310`, `publishedRows=62`, estado
`partial`, una partición faltante y paginación de julio con cuatro IDs
distintos. Esa prueba mantiene visible el hueco real; no pudo activar el
fallback porque R2 estaba disponible. No se desplegó a producción ni se
escribió en R2/D1.

También se eliminó del generador local de subsets de Contraloría el uso de
`|| 275/261/248`: los conteos se derivan de los arrays reales si faltan y se
rechaza un metadato declarado que no coincida con sus filas. La proyección
local actual tiene 275 registros, 210 entidades y 248 relaciones, y esos
valores sí coinciden con sus arrays; por tanto, esta protección no altera el
artefacto actual. Tres pruebas cubren cero real, conteo derivado y discrepancia.
El generador no se ejecutó contra los demás subsets ni se publicó; la
protección requiere integrarse antes de una próxima generación ETL.

### Contraste DIPRES en el release estático productivo

El manifiesto `projections/static-site-v1/manifest.json` vigente al
27-09-2026 contiene tanto la proyección completa como el subset. Se leyeron
ambos artefactos pequeños desde R2 y se verificaron sus SHA-256 contra el
manifiesto. La proyección completa declara 476 filas, contiene 476 IDs de
programa distintos y coincide con su checksum. El subset contiene 60 filas,
declara `totalPrograms: 320` y no incluye `count`; el proyecto de origen
confirma que ese `count` correcto es 476. Es, por tanto, metadato errado del
subset, no evidencia de que falten 156 filas en la proyección completa.

La página y el workflow prefieren/hidratan la proyección completa, por lo que
el número 320 no se considera el conteo productivo activo de la vista normal.
Sin embargo, el subset de fallback no respeta el contrato de `count` y su
total declarado es incorrecto. Se cambió localmente el generador para
establecer `count` como las 60 filas incluidas y `totalPrograms` como el
conteo completo verificado; se añadieron tres pruebas para cero, derivación y
discrepancia. Las pruebas pasan, pero no se re-generó ni publicó el artefacto
estático existente. El release de proyección DIPRES fue generado el
21-08-2026; su frescura y últimos períodos requieren auditoría aparte.

### API oficial del Geoportal municipal, validación acotada — 28-09-2026

Se inspeccionó la aplicación oficial del [Geoportal de Auditorías de la
Contraloría](https://www.contraloria.cl/opencgrapp/geoportal/auditoria) y se
identificaron sus endpoints JSON same-origin. En lectura acotada, el resumen
global de 2026 declara 22 informes. Los resúmenes por comuna de las nueve
regiones con actividad 2026 también suman 22, distribuidos en 20 comunas; al
consultar sólo esas 20 listas comunales, sus filas `ANOINFORME=2026` sumaron
igualmente 22. La distribución por `FECHAINFORME` fue abril 6, mayo 1, junio
2, julio 3, agosto 3 y septiembre 7. La igualdad entre agregados y detalle
verifica este alcance municipal del Geoportal; no mide toda la base de
Contraloría ni sus informes centrales.

Entre los tres informes de agosto aparecen los registros oficiales
`IDACTIVIDAD` 117834 (Concepción, 03-08-2026), 115060 (Navidad, 11-08-2026) y
119648 (Putre, 31-08-2026), cada uno con enlace de detalle SICA devuelto por
el Geoportal. Son candidatos para cotejo por identificador y documento, no
filas que se puedan sumar automáticamente al ETL: el catálogo R2 espera 35
filas en la partición de agosto y su payload/manifiesto canónico no está
disponible. Una consulta productiva acotada a `source=contraloria`,
`period=2026-08` devolvió HTTP 200 con `publishedRows=0`, `expectedRows=35`,
`missingPartitions=1` y estado `partial`. Por tanto, todavía no se ha probado
si alguno de esos informes forma parte de las 35 filas esperadas del release.

Esta interfaz resuelve una limitación de los listados HTML para el
subconjunto municipal: permite verificar fechas, IDs y enlaces oficiales sin
descargar el universo. No reconstruye por sí sola las 35 filas esperadas ni
el universo central/regional del ETL. Antes de incorporar registros hay que
identificar cómo el ETL define períodos e IDs, cotejar estos candidatos con
manifiestos/filas originales disponibles y localizar una fuente oficial
verificable para el resto de agosto. No se ejecutó el ETL, no se descargaron
informes/documentos y no se escribieron objetos R2 o filas D1.
