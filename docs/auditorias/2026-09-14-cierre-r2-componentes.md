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

## Seguridad de operación

- No hubo escrituras en R2.
- No hubo escrituras ni consultas masivas en D1.
- No se ejecutó ETL durante el diagnóstico.
- No se eliminaron releases ni artefactos locales.
- No se debe declarar una fuente completa mientras falte su manifiesto de
  partición o no pueda comprobarse su checksum.
