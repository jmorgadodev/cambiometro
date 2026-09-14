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
