# Cierre de auditoría física de particiones R2

**Fecha:** 2026-09-14  
**Alcance:** catálogo público R2, comparación con el checkout local y
verificación física de manifiestos por fuente.  
**Regla operativa:** producción/R2 es la referencia vigente; local sirve para
reproducir, comparar y probar, pero no reemplaza un release productivo más
reciente.

## Resultado ejecutivo

La comparación del catálogo remoto con el catálogo local encontró **14 fuentes**:

| Resultado | Fuentes |
| --- | ---: |
| Conteo/alcance coincidente | 4 |
| Diferencia de frescura o conteo | 9 |
| Diferencia de alcance | 1 |
| Sólo en remoto | 0 |
| Sólo en local | 0 |

La diferencia local/R2 no debe tratarse como un error único. Hay diferencias de
fecha, particionamiento y alcance. No se reemplazó ningún dato local con el
remoto ni se modificó R2 o D1.

## Validación seca de InfoLobby — 2026-09-14

Se agregó y ejecutó `node scripts/ingest-infolobby.mjs --from 2026-07-01
--to 2026-09-14 --dry-run`. El conector oficial respondió para los nueve
datasets del tercer trimestre y devolvió **25.559 registros**, distribuidos en
16.495 audiencias, 8.295 viajes y 769 donativos. Se identificaron 45.355
entidades y 6.212 identificadores jurídicos; el checksum del trimestre fue
`07fbb3a92a5842168644146cba38a70063f3bf93597fb478824505b0a45287fb`.

El modo seco no creó archivos, no escribió R2 ni D1 y queda como requisito
previo para una reconstrucción incremental. El release no se promueve todavía:
la auditoría física del catálogo y el límite de crecimiento de R2 siguen
bloqueando nuevas publicaciones masivas.

## Estado físico de particiones revisadas

La comprobación remota fue realizada contra los manifiestos declarados en el
catálogo. Los siguientes componentes tienen particiones declaradas cuyo
`manifest.json` no pudo encontrarse en la ruta catalogada:

| Fuente | Particiones con manifiesto faltante | Artefactos verificados |
| --- | --- | --- |
| Senado | 2025-08, 2026-02, 2026-05, 2026-07 | No concluyente: sin manifiesto no existe inventario de artefactos que verificar |
| Votaciones Senado | 2026-08, 2026-09 | No concluyente por la misma razón |
| Gastos Cámara | 2026-03 a 2026-07 | No concluyente por la misma razón |
| Gastos Senado | 2026-01 a 2026-05 | No concluyente por la misma razón |
| InfoLobby | 2026-07 y 2026-08 | No concluyente por la misma razón |

Esto no demuestra que los archivos de datos hayan sido eliminados: demuestra
que falta el manifiesto que permite comprobarlos. Por seguridad, estas fuentes
deben permanecer en estado **parcial/desfasado** y conservar el último release
válido. No corresponde publicar cero registros, borrar entradas del catálogo ni
reconstruir una fuente desde una muestra.

## Componentes de Cámara y Senado

La separación vigente queda documentada así:

| Fuente/componente | Registros remotos | Tratamiento |
| --- | ---: | --- |
| Cámara · asistencia | 54.538 | Actividad parlamentaria |
| Cámara · votaciones | 4.058 | Votaciones, separadas del total base |
| Cámara · datos abiertos Congreso | 155 | Componente separado; alcance pendiente de revisión |
| Cámara · gastos | 16.275 | Gastos operacionales, no remuneraciones |
| Senado · base | 1.428 | Registro propio del Senado |
| Senado · votaciones | 194 | Votaciones, separadas del total base |
| Senado · gastos | 6.517 | Gastos operacionales, no remuneraciones |

Las diferencias observadas con el checkout local corresponden principalmente a
particiones nuevas, cortes posteriores y alcance distinto. Los conteos no deben
sumarse entre categorías ni convertirse en porcentajes de cobertura sin un
denominador comparable.

## Otras diferencias remotas relevantes

- **ChileCompra:** el corte público remoto es 74.142; el histórico local de
  888.693 no equivale al corte vigente y no debe presentarse como tal.
- **InfoLobby:** el catálogo remoto declara 71.467 registros y períodos hasta
  2026-08; el checkout local contiene 60.523 hasta 2026-07. La diferencia debe
  resolverse reconstruyendo manifiestos, no mostrando la muestra local como
  universo.
- **DIPRES:** el remoto declara 247.287 registros y un alcance temporal mayor
  que el local. Es información agregada y no debe convertirse en fichas
  individuales.
- **Transparencia Activa, Servel y SINIM:** no presentaron diferencia de
  catálogo en esta comparación.

## Proyección central de Transparencia Activa: no promover todavía

Durante la revisión apareció en R2 una proyección adicional que no está
conectada al API público actual: `funcionarios-central-v1`. Su manifiesto fue
leído sólo en modo GET y declara:

| Métrica | Valor |
| --- | ---: |
| Registros | 2.110.434 |
| Períodos | 33 |
| Corte declarado | 2026-09 |
| Planta | 295.944 |
| Contrata | 869.005 |
| Honorarios | 615.255 |
| Código del Trabajo | 330.230 |

La producción continúa sirviendo `funcionarios-v1`, con 1.226.913 registros y
corte generado el 2026-09-02. Por tanto, la existencia del release central no
significa que ya esté disponible para el usuario ni autoriza a cambiar el
puntero productivo.

El resumen central también explica por qué no se debe mostrar una tabla
mensual incompleta como si fuera una serie comparable: julio de 2026 contiene
578.446 filas, frente a 75.998 en junio, 46.657 en agosto y sólo 123 en
septiembre. El salto coincide con un cambio de alcance/cobertura del release,
no con una conclusión sobre contrataciones. La inspección de evidencia remota
encontró filas con períodos futuros o imposibles dentro del mismo release; por
ejemplo, una fila de Hospital de Osorno conserva `p: 3538-04` y filas de
hospitales conservan `p: 2026-10` aunque el release fue generado en septiembre.
La fuente declarada es el CSV oficial de Transparencia Activa, por lo que el
problema debe resolverse en la interpretación del período de origen y no
ocultarse en la interfaz. Además, el release declara
563.221 registros con observaciones de calidad, principalmente remuneración
líquida no informada. La compuerta reproducible de calidad confirmó que las
212 páginas suman exactamente 2.110.434 filas y que el total del manifiesto
coincide con el índice, pero detectó 2.984 filtros de período en el índice
frente a sólo 33 períodos declarados por el resumen. Hay 6.952 filas en
2.951 filtros fuera del release declarado; la muestra incluye `2026-10`,
`2026-11`, `2026-12` y períodos futuros que llegan hasta `3538`. Esto bloquea
la promoción aunque los conteos generales cuadren.

Decisión: la interfaz no mostrará la evolución mensual ni la tabla de los
últimos 12 cortes de esta proyección hasta reconciliar alcance, períodos y
manifiestos. Los artefactos permanecen conservados para auditoría; la
producción sigue usando el release anterior mientras se prepara una
compatibilidad verificable. El generador también marcará como **parcial** un
corte que triplique filas u organismos respecto del anterior, tanto por caída
como por aumento abrupto. Así, julio no se presentará como una tendencia
normal mientras la fuente no confirme el cambio.

Se agregó al Worker un selector de lectura restringido,
`CPLT_PROJECTION_VARIANT=funcionarios-central-v1`, para pruebas controladas.
El valor por defecto sigue siendo `funcionarios-v1` y sólo se aceptan esas dos
variantes; no se habilitó ninguna variable en producción ni se cambió el
puntero de R2. La prueba automatizada confirmó que el release central puede
leerse por páginas, con búsqueda indexada y sin tocar D1. La nueva compuerta
`audit:cplt:projection` queda como requisito previo para cualquier promoción;
en el estado actual devuelve `blocked` y no realiza escrituras.

Además, el generador local de proyecciones fue ajustado para aplicar la misma
regla de período plausible al índice de filtros que ya usaba el resumen. Las
filas con período inválido no se borran ni se corrigen silenciosamente: quedan
en el release candidato, se contabilizan como observación y la compuerta impide
promover mientras no exista una decisión de origen. Esto evita que una tabla o
un filtro presente un universo distinto del archivo original.

## Decisiones y siguiente orden seguro

1. Mantener las rutas, los nombres del menú y los datos municipales y de
   remuneraciones sin cambios estructurales.
2. No promover correcciones basadas sólo en el checkout local.
3. Regenerar manifiestos por fuente desde el release autoritativo, comenzando
   por **Votaciones Senado**, porque el conector oficial respondió y existen
   registros de agosto/septiembre que aún no tienen manifiesto catalogado.
4. Continuar con gastos Cámara, gastos Senado e InfoLobby, uno por uno,
   verificando conteo, checksum y períodos antes de publicar.
5. Sólo después de cerrar manifiestos, recalcular índices, historiales y
   estados visibles de frescura.

## Prueba de reconstrucción: Votaciones Senado

El conector oficial respondió en modo `--dry-run` para `2026-08-01` a
`2026-09-14`:

- 52 votaciones válidas;
- 23 registros para 2026-08;
- 29 registros para 2026-09;
- primer evento: 2026-08-04;
- último evento: 2026-09-09;
- 0 errores;
- 0 archivos escritos.

El plan de lago generado en memoria produjo los siguientes checksums de
proyección:

| Partición | Registros | Checksum de proyección |
| --- | ---: | --- |
| `votaciones_senado/2026/08` | 23 | `169d5551c89edd28c6fa5b190fd3f9c2f6afc94e7e9dcac7b4cefabed2099b93` |
| `votaciones_senado/2026/09` | 29 | `9cd9423b142a6f3b837c4fa107c516050b0d1fe362e12d5733d937e7ae03caf8` |

El tamaño comprimido de ambas proyecciones, sus manifiestos y sus archivos de
checksum sería **20.002 bytes**. La prueba demuestra que esta fuente está lista
para una promoción aislada, pero no autoriza todavía la escritura en R2: antes
de eso se debe comparar el candidato con el release y cerrar el catálogo de
forma atómica.

La comprobación física posterior (`audit:r2:closure --source
votaciones_senado --verify-artifacts`) revisó 7 particiones y no encontró
artefactos faltantes en los manifiestos existentes, pero confirmó que siguen
faltando los manifiestos catalogados de `2026-08` y `2026-09`. Por tanto, el
estado correcto continúa siendo **incompleto/no promocionable**; no se debe
interpretar el HTTP 200 de la API ni el dry-run como publicación cerrada.

## Control de Gastos Cámara

El primer `--dry-run` de Gastos Cámara reveló un defecto del runner local:
`resumableCamaraIds` recibía un `Set` de marcas de progreso, pero sólo aceptaba
arrays. Eso producía `progressIds.map is not a function` antes de consultar la
fuente y podía confundirse con una fuente sin datos.

Se corrigió el normalizador para aceptar ambos tipos de colección y se agregó
una prueba específica. La prueba unitaria quedó en **4/4**. La extracción
completa no se volvió a ejecutar: este conector usa navegador y consultas
secuenciales por diputado, por lo que debe correr en su ventana programada para
evitar rate-limit de la Cámara. Hasta esa ejecución, Gastos Cámara permanece
pendiente y no se considera actualizado.

## Controles livianos de fuentes pendientes

- **Gastos Senado:** el ETL en modo seco respondió con 2.500 registros, sin
  errores y sin escribir archivos. El resultado corresponde a la ventana
  mensual configurada; no reemplaza los 6.517 registros del release remoto ni
  cierra por sí solo los manifiestos faltantes.
- **InfoLobby:** el catálogo oficial respondió HTTP 200, con 48 trimestres
  disponibles; 2026-T2 y 2026-T3 están publicados. El endpoint CSV de
  audiencias de 2026-T3 respondió HTTP 200 y `text/csv`. La fuente está
  disponible para una reconstrucción incremental, pero todavía no se descargó
  el universo ni se escribió un candidato local.

Estos controles son deliberadamente pequeños: prueban disponibilidad y esquema
sin convertir la auditoría en una descarga masiva ni consumir D1.

## Inventario de almacenamiento R2

El inventario remoto `catalog/v1/storage.json` fue leído sin modificar el
bucket:

| Métrica | Valor |
| --- | ---: |
| Límite declarado | 10.000.000.000 bytes |
| Uso declarado y calculado | 9.016.336.751 bytes |
| Uso | 90,16% |
| Margen libre | 983.663.249 bytes |
| Objetos | 8.362 |
| Duplicados potenciales por checksum | 66.508 bytes |

La distribución confirma que el problema no está en las particiones de datos:
`projections` ocupa 8.743.327.270 bytes en 8.151 objetos; `indexes` ocupa
258.501.254 bytes. Por lo tanto, el crecimiento queda bloqueado hasta revisar
versiones históricas de proyecciones. El preflight `npm run audit:r2:storage`
queda disponible para repetir esta comprobación y puede fallar explícitamente
con `--fail-on-growth-block`.

## Seguridad de operación

- No hubo escrituras en R2.
- No hubo escrituras ni consultas masivas en D1.
- No se ejecutó ETL durante el diagnóstico.
- No se eliminaron releases ni artefactos locales.
- No se debe declarar una fuente completa mientras falte su manifiesto de
  partición o no pueda comprobarse su checksum.

## Revalidación física posterior — 2026-09-14

Se volvió a ejecutar `audit:r2:closure` en modo de sólo lectura, con
`--verify-artifacts`, sobre dos fuentes que una nota anterior había descrito
como cerradas. Esta comprobación posterior es la referencia operativa actual:

| Fuente | Particiones revisadas | Objetos de datos faltantes | Manifiestos faltantes | Estado físico |
| --- | ---: | ---: | ---: | --- |
| Votaciones Senado | 7 | 2 | 2026-08, 2026-09 | Incompleto/no promocionable |
| InfoProbidad | 9 | 9 | 2026-01 a 2026-09 | Incompleto/no promocionable |

La ausencia de los manifiestos no prueba que las filas hayan desaparecido,
pero sí impide acreditar período, conteo y checksum de cada partición. Por
ello no se debe declarar ninguna de las dos fuentes como cerrada ni publicar
un nuevo resumen basado sólo en los objetos que responden. La acción siguiente
es reconstruir o recuperar los manifiestos desde el release autoritativo, sin
eliminar los objetos actuales y sin consultar D1.

La inspección del catálogo vigente agregó una comprobación física adicional:
las claves de registros derivadas del checksum declarado tampoco están
disponibles para las muestras probadas. En particular:

| Fuente/período | Filas declaradas | Checksum declarado | Clave de registros probada | Resultado |
| --- | ---: | --- | --- | --- |
| Votaciones Senado 2026-09 | 5 | `50a8db01…` | `partitions/votaciones_senado/2026/09/records-50a8db01….jsonl.gz` | No existe |
| InfoProbidad 2026-01 | 352 | `79f4448c…` | `partitions/infoprobidad/2026/01/records-79f4448c….jsonl.gz` | No existe |

Esto refuerza la clasificación **referencia catalogada sin artefacto
verificable**. No corresponde reconstruir un manifiesto sólo con el conteo y
el checksum del catálogo, porque seguiría sin probar el contenido real.

El auditor ahora expresa esta decisión en campos explícitos: para Senado el
estado es `catalogued_without_manifest` y `promotionAllowed=false`. Si todos
los manifiestos y artefactos responden, el estado pasa a `verifiable` y la
promoción queda permitida; si sólo se dispone del manifiesto sin poder
comprobar artefactos, queda `manifests_present_artifacts_unverified`.

El auditor quedó ampliado para realizar esta prueba automáticamente cuando se
usa `--verify-artifacts`: deriva la clave de proyección esperada desde el
checksum del catálogo y reporta por separado `missingManifestArtifacts` y
`presentWithoutManifest`. La derivación es sólo una pista de comprobación y no
autoriza a tratar el objeto como release válido sin su manifiesto.

## Validación del contrato normalizado por dominio — 2026-09-14

Se ejecutaron las pruebas del plan de lago y del API que cubren Cámara, Senado
y sus componentes separados. El resultado fue **86/86 pruebas aprobadas** en
`data-lake-plan`, `data-coherence-lake` y `api-v1`.

La evidencia confirma que el contrato mantiene separados, como mínimo:

- votaciones (`kind=vote`);
- asistencia (`kind=attendance`);
- gastos de Cámara y Senado (`kind=expense`);
- personal de apoyo y otros registros parlamentarios, sin sumarlos a gastos o
  votaciones;
- entidad/persona, organismo, fuente, período, procedencia y relaciones
  documentales.

Las pruebas también verifican que la API pueda servir esos componentes desde
R2 cuando D1 no está disponible y que los alias históricos no creen fuentes
duplicadas. Esto valida la estructura de normalización, pero no cierra la
completitud física de una fuente: los manifiestos faltantes de la sección
anterior siguen bloqueando la promoción de esos releases.

## Guardas operativas comprobadas — 2026-09-14

- El calendario independiente pasó: **18 workflows**, zona horaria
  `America/Santiago`.
- El typecheck del Worker público pasó sin errores.
- El bundle del Worker quedó en **174,61 KiB** sin comprimir y **33,60 KiB**
  comprimido, bajo el límite de 1 MiB.
- El Worker mantiene `ALLOW_PUBLIC_D1_READS=0` y `PREFER_TRANSFER_D1=0` en
  la configuración inspeccionada; las búsquedas públicas siguen encaminadas a
  R2.
- El preflight de almacenamiento R2 permanece en `growth-blocked`: uso
  9.016.336.751 de 10.000.000.000 bytes (90,16%), por lo que no se deben
  generar ni publicar nuevos índices masivos hasta resolver retención o
  compresión.

## Comprobación de las fuentes oficiales — 2026-09-14

Se probaron los conectores en lectura, sin escribir archivos, R2 ni D1:

- Senado: el endpoint oficial respondió HTTP 200, entregó 63 sesiones y los
  endpoints de votaciones y asistencia respondieron para sesiones de prueba.
  Las sesiones sin votaciones devuelven una respuesta válida sin votos; no se
  deben convertir en un release vacío que reemplace el anterior.
- InfoProbidad: el endpoint SPARQL respondió HTTP 200. La consulta del 1 al 14
  de septiembre devolvió 241 declaraciones con identificadores únicos, en 5
  páginas del conector.

La autenticación de GitHub también fue comprobada y los tags de release
referenciados por el catálogo (`data-infoprobidad-2026-1fe06400915edc62` y
`data-votaciones_senado-2026-812204e3cee8f2a8`) no existen como releases
publicados. La conclusión actual es que los conectores oficiales responden,
pero las referencias de publicación están incompletas o quedaron huérfanas.
No corresponde ejecutar ETL o publicar una reparación mientras R2 siga
bloqueado por crecimiento; primero se debe recuperar o reconstruir el release
completo y comprobar su cierre físico.

## Corrección de cortes abruptos de Transparencia Activa — 2026-09-14

El resumen precomputado conserva las métricas de comparación, pero ahora el
build vuelve a aplicar la guarda de cobertura antes de copiarlo a Pages. Con
los datos auditados se observa:

| Corte | Filas | Nuevos | Estado |
| --- | ---: | ---: | --- |
| 2026-06 | 75.136 | 65.164 | comparable |
| 2026-07 | 257.733 | 236.195 | parcial: aumento abrupto |
| 2026-08 | 93 | 90 | parcial: caída abrupta |

Julio no se elimina ni se transforma en cero: mantiene sus filas, altas,
bajas y cambios de monto, pero queda advertido como un cambio de alcance o
una publicación excepcional que debe confirmarse en la fuente oficial.

## Reconciliación Cámara y Senado: remoto contra local — 2026-09-14

Se comparó el catálogo remoto descargado en lectura con el catálogo local,
sin sustituir ninguno. La diferencia debe interpretarse por componente y
período:

| Componente | Producción | Local | Clasificación | Lectura |
| --- | ---: | ---: | --- | --- |
| Cámara, total catalogado | 58.751 | 2.750 | alcance | Producción suma asistencia, votaciones y el componente parlamentario; local conserva sólo el subconjunto base. |
| Gastos Cámara | 16.275 | 16.275 | coincide | Conteo y períodos coinciden. |
| Gastos Senado | 6.517 | 6.521 | frescura/conteo | Misma cobertura temporal; diferencia acotada de 4 filas. |
| Senado, total catalogado | 1.428 | 7.002 | frescura/conteo | El local conserva más meses históricos; producción expone un subconjunto distinto. |
| Votaciones Senado | 194 | 189 | frescura/conteo | Producción agrega septiembre de 2026 con 5 registros. |

Conclusión: no se debe copiar el catálogo local sobre producción. El bloque
pendiente es separar explícitamente las variantes de Cámara y recuperar o
reconstruir los manifiestos productivos ausentes de Senado sin borrar la
historia local. Los conteos de gastos no requieren una corrección de alcance
inmediata; Senado votaciones sí requiere un ciclo incremental por fuente.

La comparación quedó operable sin preparar un archivo remoto manual:

```bash
npm run audit:r2:catalog -- --remote-r2
```

La matriz completa de reconciliación producción/local quedó guardada en
[`2026-09-14-reconciliacion-fuentes.json`](./2026-09-14-reconciliacion-fuentes.json)
y se puede regenerar sin D1 con:

```bash
npm run audit:sources -- --output ../docs/auditorias/2026-09-14-reconciliacion-fuentes.json
```

El modo remoto descarga únicamente `catalog/v1/manifest.json` a un directorio
temporal, lo compara con `data/lake/catalog/v1/manifest.json` y lo elimina al
terminar. No consulta D1 ni descarga las particiones de datos.

## Desglose de almacenamiento por versión — 2026-09-14

El preflight remoto se amplió para desglosar las versiones de proyección sin
marcarlas automáticamente como eliminables. El resultado actual es:

| Dataset | Versión | Objetos | Tamaño aproximado |
| --- | --- | ---: | ---: |
| `funcionarios-central-v1` | `2026-09-14T03-51-42-634Z` | 5.121 | 4,48 GB |
| `funcionarios-v1` | `2026-09-02T03-28-30-598Z` | 1.514 | 2,13 GB |
| `funcionarios-v1` | `2026-08-30T08-05-27-795Z` | 1.514 | 2,12 GB |

Estas tres versiones explican prácticamente todo el prefijo `projections`.
La política conserva la versión activa y una versión de rollback; por eso no
se ejecutó ninguna eliminación. Antes de retirar una versión será necesario
confirmar qué manifiesto la referencia y cuánto tiempo de rollback se desea
mantener.

## Remuneraciones: comparación e historial verificados — 2026-09-14

La interfaz de Remuneraciones conserva la búsqueda paginada y la ficha
individual, pero ya no renderiza el bloque global de “Evolución mensual” ni
“Ver detalle mensual de los últimos 12 cortes”. El detalle útil queda en la
comparación del corte seleccionado.

Para el corte 2026-06 frente a 2026-05, los contadores y las tablas físicas
coinciden:

| Categoría | Contador publicado | Filas verificadas |
| --- | ---: | ---: |
| Nuevos registros | 52 | 52 |
| Registros que ya no aparecen | 50 | 50 |
| Cambios de monto | 438 | 438 |

Las 438 filas de cambio contienen monto anterior y actual; no se convierten
valores ausentes en cero. El índice de historial tiene 4.473 entradas y sus
meses están ordenados. La auditoría se ejecuta con:

```bash
npm run check:remuneraciones-history
```

Esta guarda sólo revisa artefactos públicos ya construidos: no ejecuta ETL,
no consulta D1 y no descarga el universo desde R2. Si un próximo build deja un
contador sin su tabla, una fila de cambio sin ambos montos o un historial
desordenado, la verificación falla antes de promoverlo.

## Gastos operacionales: cobertura estática corregida — 2026-09-14

La auditoría del release estático detectó una pérdida local de filas en Senado:
el snapshot ETL completo tenía 6.521 registros, pero
`data/lake-subsets/gastos-senado.subset.json` sólo contenía 2.500. Cámara no
tenía esa pérdida: sus 16.275 registros coincidían.

Se reconstruyeron ambos subconjuntos exclusivamente desde
`data/etl/latest.json`, sin consultar D1, escribir R2 ni ejecutar ETL. El
resultado local queda en 16.275 filas de Cámara y 6.521 de Senado. El verificador
ahora compara cada subconjunto contra el snapshot completo y bloquea el release
si faltan o sobran identificadores.

Comandos de control:

```bash
npm run data:rebuild:expenses:local
node scripts/verify-expense-release.mjs --required
```

El catálogo R2 sigue reportando 6.517 filas para Senado; esa diferencia de
cuatro filas respecto del snapshot local queda documentada como diferencia de
release/frescura y no se corrige copiando datos locales sobre producción.

## Bloqueo de promoción de interfaz por `ley-19862` — 2026-09-14

La promoción `ui-only` de Pages se ejecutó sobre un branch basado en `main`
(`a200fb2`) para aislar la retirada del gráfico mensual y corregir la búsqueda
inicial de la home. Las pruebas locales pasaron, pero el workflow productivo se
detuvo antes del build al hidratar las particiones de `ley-19862`.

El catálogo remoto referencia los manifiestos de enero a agosto de 2026, pero
R2 responde `The specified key does not exist` para esas ocho claves y para los
artefactos derivados que el catálogo permite comprobar. Los ocho manifiestos y
sus artefactos todavía existen localmente y sus checksums coinciden con los
nombres esperados; no se publicó ninguna
reparación porque el token de auditoría es de sólo lectura. Producción conserva
la versión anterior, sin cambio parcial.

Run detenido: `34895600630`.

Para reanudar la promoción se necesita una reparación explícita y reversible de
esas referencias R2 con un token de escritura autorizado, seguida de una nueva
ejecución completa de `pages-ui-refresh`. No se debe omitir la hidratación ni
usar snapshots locales para reemplazar datos productivos.

Se agregó un planificador local no mutante para preparar esa reparación:

```bash
npm run audit:r2:repair-plan -- --source ley-19862
```

El resultado actual verifica las 8 particiones locales, 16 objetos entre
manifiestos y artefactos, 5.104.859 bytes y cero faltantes o discrepancias de
checksum. El plan declara `writesPerformed: false`; no llama a Wrangler ni
modifica R2. Antes de ejecutar una restauración futura habrá que intersectar
esas operaciones con las claves faltantes comprobadas por
`audit:r2:closure -- --source ley-19862 --verify-artifacts` y usar una
credencial de escritura autorizada.

## ChileCompra: separación de corte, histórico y archivo local — 2026-09-14

La reconciliación detectó que el catálogo local de R2 contiene 1.915.039 filas
de archivo y variantes de ChileCompra. Ese número no corresponde al corte
canónico que debe mostrar la experiencia pública. Se ajustó
`listPublishedSourceManifests` para conservar como referencias públicas:

- corte canónico: 74.142 registros;
- histórico declarado: 888.693 registros;
- archivo local observado: 1.915.039 registros, sólo para auditoría.

El archivo no se eliminó ni se reemplazó. La prueba de pre-lanzamiento y la
batería completa quedan verdes después del ajuste: 193 archivos y 1.031
pruebas aprobadas.

## Estado de consumo y almacenamiento — 2026-09-14

La consulta de Analytics D1 se ejecutó desde el workflow de vigilancia, sin
SQL ni escrituras adicionales. El reporte de hoy registra 3.844 filas leídas
(0,08% de 5.000.000), 5 filas escritas (0,01% de 100.000) y nivel `ok`.

La auditoría remota de R2 informa 9.016.336.751 bytes de 10.000.000.000
(90,16%), 8.362 objetos y 66.508 bytes duplicados detectados. El estado es
`growth-blocked`: no se deben publicar nuevos releases ni reparar objetos
faltantes hasta revisar el margen, el versionado y la retención. La reparación
de `ley-19862` queda separada de cualquier crecimiento no esencial.

## Reproceso de fuente Ley 19.862 en aislamiento — 2026-09-14

Se probó el origen oficial por los ocho meses de 2026 en una carpeta temporal,
sin R2, D1 ni cambios en el repositorio. Los ocho requests respondieron y
generaron un candidato local de 70.891 registros y 89.972.735 bytes.

| Mes | Candidato oficial | Catálogo productivo | Diferencia |
| --- | ---: | ---: | ---: |
| 2026-01 | 14.000 | 13.844 | +156 |
| 2026-02 | 9.436 | 9.248 | +188 |
| 2026-03 | 7.769 | 7.318 | +451 |
| 2026-04 | 7.650 | 7.448 | +202 |
| 2026-05 | 9.828 | 7.609 | +2.219 |
| 2026-06 | 7.036 | 6.149 | +887 |
| 2026-07 | 8.558 | 6.921 | +1.637 |
| 2026-08 | 6.614 | 3.906 | +2.708 |

Los ocho checksums del candidato son distintos de los del catálogo productivo.
Por tanto, no se debe subir el snapshot local antiguo ni tratar la reparación
como una simple restauración de objetos: se requiere un nuevo release oficial,
con validación de conteos, checksum y margen de almacenamiento antes de
publicarlo.

## Historiales desde páginas R2 y protección de crecimiento — 2026-09-14

Se agregó el módulo local `scripts/etl/r2-history.mjs` para construir
historiales desde páginas declaradas por manifiestos R2. El lector:

- solicita únicamente las claves listadas en `pages[]`;
- verifica `releaseId`/`version`, checksum, conteo de cada página y total del
  manifiesto;
- rechaza páginas duplicadas o incompletas;
- conserva cada fila original;
- calcula altas, salidas observadas, cambios de monto y cambios de organismo;
- no consulta D1 ni se ejecuta en el navegador.

La protección de almacenamiento quedó cubierta por pruebas: una proyección que
eleva el inventario sobre 90% del límite se rechaza con
`R2_GROWTH_BLOCKED_AT_90_PERCENT`. Los duplicados de checksum sólo se reportan
como oportunidad de auditoría; no autorizan eliminaciones automáticas.

Estado de validación del checkout después de estos cambios:

- `npm test`: 197 archivos y 1.056 pruebas aprobadas;
- `npm run check:r2-history`: 9 pruebas aprobadas;
- `npm run check:movimientos-normalization`: aprobado;
- `npm run check:legislative-normalization`: aprobado;
- typecheck, API typecheck y arquitectura estática: aprobados.

Commits reversibles de este bloque: `6522887` y `0c20084`. No se publicó ningún
release nuevo en R2 ni se modificó D1.

La implementación también admite el formato físico actualmente observado en
R2: manifiestos con `artifacts[]` y archivos JSONL comprimidos. La lectura de
un artefacto remoto de Cámara (`camara/asistencia_camara/2026/09`) fue
verificada en modo GET: 775 filas, checksum
`0228f8037f8ee9e6b6b08a9b14618fbffc5466188f7a97b3a8fcffc75ea697fc` y
identidad anidada de diputado resuelta mediante identificador explícito.
Los manifiestos históricos faltantes siguen siendo un bloqueo de evidencia; no
se rellenan con un snapshot local ni se publican como cero.

## Cierre físico de Cámara — 2026-09-14

La comprobación `audit-r2-remote-closure.mjs --source camara
--verify-artifacts` revisó 61 particiones catalogadas. Encontró 15 manifiestos
históricos ausentes y un artefacto ausente (`votaciones_camara/2024/10`). El
resultado fue:

- `status`: `catalogued_without_manifest`;
- `promotionAllowed`: `false`;
- `complete`: `false`;
- `inventoryAvailable`: `false` en esta ejecución física.

La fuente conserva su último release verificable; no se reemplaza el catálogo,
no se carga el snapshot local y no se transforma el faltante en cero registros.

La misma comprobación sobre Servel revisó una partición y encontró ausente su
manifiesto `2025/11` y el artefacto derivado. También queda en
`catalogued_without_manifest`; el conteo local coincidente no es suficiente
para promoverlo mientras falte la evidencia física del release.

## Cierre físico de InfoLobby — 2026-09-14

InfoLobby tiene 8 períodos catalogados. Se verificaron físicamente 6
manifiestos y sus artefactos; faltan los manifiestos y artefactos de julio y
agosto de 2026. El resultado es `catalogued_without_manifest` y
`promotionAllowed: false`. El release público no debe reducirse a la muestra
local de 40 filas ni presentarse como completo hasta reconstruir esas dos
particiones.

InfoProbidad presenta un caso distinto: existe un índice R2 consultable, pero
sus 9 manifiestos de partición de enero a septiembre de 2026 y los artefactos
derivados no están disponibles físicamente. El índice no se interpreta como
prueba de un historial completo; la fuente queda en
`catalogued_without_manifest` para fines de promoción histórica.

## Proyección productiva de Transparencia Activa — 2026-09-14

Se leyó el manifiesto y el índice remoto de `funcionarios-v1`, sin descargar
ninguna página de datos. Los conteos estructurales coinciden: 1.226.913 filas,
123 páginas y suma de páginas de 1.226.913. Sin embargo, el release no declara
períodos ni métricas de calidad suficientes para auditar la evolución mensual.
La compuerta `auditCpltProjection` devuelve:

- `status`: `blocked`;
- `promotionAllowed`: `false`;
- incidencias: `declared_periods_missing` y `period_filter_sum_mismatch`.

La búsqueda nacional vigente puede continuar usando el índice R2, pero no se
debe promover una serie histórica mensual ni afirmar cobertura temporal hasta
publicar un resumen de períodos y calidad que coincida con el mismo release.

La misma auditoría ahora valida la cobertura territorial declarada por el
manifiesto: 346 comunas, 320 con registros disponibles y 25 sin publicación;
la suma de sus conteos (`1.226.913`) coincide con el total del release y no se
detectan entidades duplicadas. Esto permite auditar la cobertura municipal sin
descargar las páginas de nómina. La ausencia de una comuna sigue siendo un
estado de fuente, no un sueldo cero ni una inferencia de que la municipalidad
no tenga personal.

## Reconciliación R2 de ChileCompra y DIPRES — 2026-09-14

La auditoría del catálogo R2 separa la diferencia de los dos conteos que el
reconciliador productivo/local no podía explicar por sí solo:

- **ChileCompra:** R2 declara 74.142 registros en un corte vigente con una
  partición base para `2026-06`/`2026-07`; el catálogo local conserva 1.915.039
  filas en nueve particiones de enero a julio. La diferencia corresponde a
  alcance/corte del artefacto, no permite afirmar pérdida y no autoriza a
  reemplazar el release público por el local.
- **DIPRES:** R2 declara 247.287 registros en 18 particiones, incluyendo
  `2021-01` a `2021-12` y `2026-01` a `2026-06`; el catálogo local contiene
  92.286 filas en seis particiones de 2026. El contador `source-health` de 476
  es un conteo de entidades, no un conteo de filas, por lo que no debe
  compararse directamente con el release de registros.

Ambos casos quedan clasificados por el catálogo R2 como `frescura_o_conteo`.
La presentación pública debe mantener separado el corte vigente del histórico
y mostrar DIPRES como información agregada, no como fichas individuales.

## Cierre físico para historiales — 2026-09-14

La compuerta de historial se ejecutó con lectura física de R2, sin recorrer el
universo de registros:

- **ChileCompra:** la partición `2026/06` está catalogada, pero su manifiesto y
  artefacto no están disponibles físicamente.
- **InfoLobby:** las particiones `2026/07` y `2026/08` están catalogadas, pero
  sus manifiestos y artefactos no están disponibles físicamente.

Ambas fuentes quedan en `catalogued_without_manifest` y
`promotionAllowed: false`. El historial no se genera desde el snapshot local
ni se publica con ceros; se conserva el último release válido hasta que la
evidencia R2 esté completa.

## Validación posterior — 2026-09-14

La suite completa se ejecutó con un margen de timeout adecuado para las
pruebas de lectura por bloques: 197 archivos y 1.057 pruebas aprobadas. Las
pruebas específicas de la nueva cobertura CPLT quedaron en 5/5 y el comando
reutilizable para repetir la auditoría remota es `npm run audit:cplt:remote`.

## Inventario de duplicados R2 — 2026-09-14

El inventario remoto identifica tres grupos de checksum repetido, con 66.508
bytes potencialmente recuperables. Los dos grupos relevantes son:

- índices de entidades de Cámara: 42.666 bytes potencialmente recuperables;
- índices de entidades de Contraloría: 23.794 bytes potencialmente
  recuperables.

Los 48 bytes restantes corresponden a filtros pequeños repetidos entre
versiones. El reporte sólo identifica candidatos; no autoriza borrar objetos,
porque una clave aparentemente duplicada puede seguir siendo una referencia
canónica o histórica.

La revisión del catálogo R2 vigente muestra que las claves actuales de índices
de entidades de Cámara y Contraloría son otras claves checksum (`0403f006…` y
`a32683c3…` respectivamente); ninguno de los cuatro objetos duplicados aparece
referenciado por ese catálogo vigente. Se mantienen como **candidatos no
referenciados por el catálogo actual**, pendientes de comprobar retención y
referencias históricas antes de cualquier eliminación.

El auditor incorpora ahora `--references <archivo.json>` para pasarle un
conjunto explícito de claves referenciadas. Cada grupo queda marcado como
`referenced`, `unreferenced-by-supplied-set` o `unknown`; sólo el segundo puede
pasar a una revisión manual de retención.

## Normalización parlamentaria — corrección de identificadores técnicos

La verificación local de Cámara y Senado confirmó 27.793 registros separados
por categoría: 155 autoridades, 769 votaciones, 22.796 gastos operacionales y
4.073 filas de personal de apoyo. Las filas de apoyo que no publican un `id`
oficial reciben un identificador técnico determinista y conservan
`recordIdOrigin: technical` junto con la fila original. Se corrigió el
verificador para no marcarlas falsamente como `id_ausente`; no se presenta el
identificador técnico como si proviniera de la fuente. El control pasó 9/9
pruebas unitarias y la ejecución real quedó sin observaciones de calidad de
identidad.

La ejecución contra el inventario remoto y el catálogo vigente encontró 21
claves referenciadas y mantuvo los tres grupos duplicados como
`unreferenced-by-supplied-set`. Esto es evidencia suficiente para abrir una
revisión de retención, pero no para eliminar objetos durante esta fase.

La comprobación adicional de los manifiestos de fuente vigentes de Cámara y
Contraloría tampoco encontró referencias a las cuatro claves duplicadas. La
revisión se hizo sobre los manifiestos descargados en modo lectura y también
contra el catálogo vigente: cada clave obtuvo `references: 0`. El resultado
refuerza la clasificación de candidato no referenciado, pero se mantiene la
regla de no borrar durante esta auditoría; todavía falta comprobar la política
de retención histórica y conservar un inventario reproducible antes de una
limpieza explícita.

El auditor quedó preparado para repetir esta comprobación con múltiples
`--source-manifest <archivo.json>`. La ejecución conjunta con el catálogo
vigente encontró 21 claves referenciadas en total y 2 referencias aportadas
por los manifiestos de fuente; los tres grupos duplicados conservaron el
estado `unreferenced-by-supplied-set`. Esto deja la revisión automatizada y
no cambia la regla de retención: identificar no equivale a eliminar.

## Revalidación remota agrupada — 2026-09-14

La revisión completa del catálogo remoto comprobó 147 particiones. El estado
continúa siendo `catalogued_without_manifest` y `promotionAllowed: false`.
Las brechas principales quedaron agrupadas así:

- manifiestos faltantes: Contraloría 18, DIPRES 18, Cámara 15,
  InfoProbidad 9, Ley 19.862 8, gastos Cámara 5, gastos Senado 5, Senado 4,
  InfoLobby 2, votaciones Senado 2, ChileCompra 1, Servel 1 y SINIM 1;
- artefactos que el inventario de almacenamiento no permite verificar:
  Cámara 43, InfoLobby 6, votaciones Senado 5 y Contraloría 1;
- artefactos presentes sin manifiesto y artefactos faltantes comprobados por
  descarga física: ninguno en esta ejecución.

La diferencia entre “manifiesto faltante” y “artefacto no verificable en el
inventario” se conserva separada. No se interpreta como pérdida de filas ni
se publica como cero; requiere reconstruir o volver a registrar el cierre
físico de cada fuente antes de promover historiales.

La matriz por `sourceId` quedó así en la misma ejecución: Cámara 61
particiones (46 manifiestos presentes, 15 faltantes y 43 artefactos no
verificables); Contraloría 19 (1, 18 y 1); DIPRES 18 (0, 18 y 0);
InfoProbidad 9 (0, 9 y 0); InfoLobby 8 (6, 2 y 6); Ley 19.862 8 (0, 8 y 0);
votaciones Senado 7 (5, 2 y 5); gastos Cámara 5 (0, 5 y 0); gastos Senado 5
(0, 5 y 0); Senado 4 (0, 4 y 0); y ChileCompra, Servel y SINIM 1 cada uno,
sin manifiesto presente. Ninguna fuente alcanzó `promotionAllowed=true`.

El constructor de historiales R2 incorpora ahora una compuerta explícita de
promoción. Cuando se solicita `requirePromotionAllowed`, exige que el cierre
recibido tenga simultáneamente `complete=true` y `promotionAllowed=true`; un
catálogo parcial puede seguir siendo auditado localmente, pero no puede
presentarse como historial público completo. La prueba específica de historial
quedó en 13/13.

El filtro por fuente también fue corregido para resolver los nombres físicos
anidados del catálogo. Por ejemplo, `votaciones_camara` se declara bajo
`sourceId=camara`, pero su `manifestKey` contiene el segmento
`votaciones_camara`. La auditoría específica ahora revisa 30 particiones de
esa fuente y la mantiene bloqueada por 13 manifiestos faltantes y 16
artefactos no verificables, en vez de reportarla erróneamente como completa
por haber encontrado cero coincidencias de `sourceId`.

La comprobación física focalizada, ejecutada sin inventario, confirmó además:

- **ChileCompra:** el manifiesto `2026/06` y su artefacto derivado no están
  disponibles; no es un simple desfase del inventario.
- **Votaciones Senado:** los cinco artefactos de períodos anteriores
  respondieron, pero `2026/08` y `2026/09` siguen sin manifiesto ni artefacto
  derivado. La fuente continúa bloqueada por esos dos períodos.

La matriz ahora queda limitada a la fuente solicitada y distingue entre
`missingManifestArtifacts`, artefactos que fallan en descarga física y objetos
que sólo faltan del inventario de almacenamiento.

El plan local de reparación fue alineado con la misma regla de selección:
puede resolver `votaciones_camara` aunque el catálogo declare `sourceId=camara`
cuando el `manifestKey` contiene ese conjunto anidado. La prueba conjunta de
auditoría y reparación quedó en 11/11; sigue siendo un plan de lectura local y
no ejecuta escrituras.

## Validación del camino público sin D1 masivo — 2026-09-14

La API pública pasó 63 pruebas específicas y `api:typecheck`. Las pruebas
confirman que las búsquedas, índices R2, paginación, exportaciones y releases
publicados prefieren R2 y no consultan D1 cuando el índice está disponible o
la cuota de D1 está agotada. La configuración pública mantiene
`ALLOW_PUBLIC_D1_READS=0` y `PREFER_TRANSFER_D1=0`; D1 queda como operación
explícita de emergencia o metadatos acotados, no como camino masivo.

## Paquetes locales listos, promoción remota bloqueada — 2026-09-14

El plan local de reparación encontró paquetes íntegros, con manifiestos y
checksums correctos, para ChileCompra (9 particiones, 146.293.757 bytes),
votaciones Senado (6, 66.506 bytes), Servel (1, 1.367.392 bytes), SINIM (1,
122.886 bytes), gastos Cámara (5, 232.119 bytes) y gastos Senado (5, 119.399
bytes). Todos quedaron `ready=true`, `writesPerformed=false`.

Esto no autoriza subirlos automáticamente: R2 permanece sobre el umbral de
crecimiento y el cierre remoto no acredita todavía las referencias completas.
La próxima promoción deberá usar estos paquetes como candidatos, validar el
inventario final y conservar el rollback antes de cualquier escritura.

## Variante CPLT activa frente a candidata — 2026-09-14

La API pública confirma que producción usa `funcionarios-v1`, con 1.226.913
registros y fecha `2026-09-02T03:28:30.598Z`. La variante más nueva
`funcionarios-central-v1` contiene 2.110.434 registros y fecha
`2026-09-14T03:51:42.634Z`, pero no se debe activar todavía:

- `funcionarios-v1`: cobertura declarada para 346 comunas (320 disponibles,
  25 sin publicación), sin duplicados; queda bloqueada sólo por falta de
  metadatos de períodos para auditar historia.
- `funcionarios-central-v1`: sin cobertura ni períodos declarados, 2.984
  filtros de período fuera del release declarado y 563.221 filas con
  observaciones de calidad, principalmente remuneración líquida no informada.

Ambas auditorías devuelven `promotionAllowed=false`. Se conserva la variante
antigua como referencia pública estable y la central como candidata de
auditoría; no se cambia el selector ni se elimina la versión anterior.

## Hallazgo adicional en el índice central candidato — 2026-09-14

La inspección acotada del índice de `funcionarios-central-v1` confirmó que sus
2.984 filtros `periodo:*` no representan sólo meses reales del release. El
índice comienza en `periodo:2024-01`, pero termina en `periodo:3538-04` y
contiene años futuros con períodos parciales. Esto explica por qué la auditoría
detecta 2.984 períodos fuera del release declarado: el problema está en la
construcción o normalización de períodos del candidato, no en una diferencia
válida de frescura entre local y producción.

La compuerta ahora separa además el formato/rango inválido del simple desfase:
la auditoría reproducible del manifiesto e índice local detectó 2.951 filtros
inválidos que representan 6.952 filas, incluyendo períodos posteriores al corte
`2026-09`. El índice queda bloqueado aunque esos valores aparezcan declarados
por el propio candidato.

El hallazgo mantiene bloqueada la variante central. No se modifica el índice
remoto, no se cambia la variante pública y no se ejecutan escrituras en R2 o
D1. Antes de cualquier promoción habrá que corregir localmente la validación de
período, reconstruir el candidato desde sus filas originales y comprobar que
los filtros queden limitados a períodos `AAAA-MM` realmente presentes en el
release.

Como prevención para la siguiente reconstrucción, el parser CPLT ahora procesa
las filas CSV respetando celdas entre comillas y delimitadores internos, y el
streamer reutiliza esa fila ya parseada para leer año, organismo y registro.
La prueba del parser quedó en 6/6 y la compuerta de proyección en 6/6. Esto
queda sólo en la rama de auditoría: todavía no reconstruye ni publica el
candidato remoto.

Además, el publicador CPLT quedó protegido para que cualquier ejecución con
`--r2` o `--releases` falle antes de activar un release si quedan filas con
períodos inválidos. El modo `--local-only` sigue disponible para diagnosticar y
reconstruir sin tocar R2.

El origen del candidato central quedó localizado en el flujo manual
`.github/workflows/etl-cplt-central.yml`, rama
`codex/normalize-remuneraciones-contract`. Allí se aplicó la misma corrección
del parser y la compuerta de publicación en el commit `8dd44e5`; las pruebas
del flujo central quedaron en 17/17 y 12/12. El workflow continúa siendo manual
y no se ejecutó ni se publicó ningún release central.
