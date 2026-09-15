# Reconciliación de producción frente a snapshot local

**Fecha de ejecución:** 2026-09-15 01:49:51 UTC  
**Origen productivo:** `https://cambiometro.impulsacv.cl/api/v1/sources`  
**Método:** comparación de metadatos y conteos; no se descargaron universos ni se consultó D1 para búsquedas masivas.

## Resultado

| Clasificación | Fuentes |
| --- | ---: |
| Coincidencia de conteo | 3 |
| Producción más fresca que local | 5 |
| Diferencia de alcance o categorías | 7 |
| Diferencia inexplicada | 0 |
| Desajuste con `source-health` | 2 |

Una diferencia de conteo no se interpreta como pérdida mientras no se haya reconciliado el alcance y la fecha del release.

## Hallazgos relevantes

| Fuente | Producción | Local | Clasificación | Lectura correcta |
| --- | ---: | ---: | --- | --- |
| Cámara | 58.751 | 2.750 | Alcance | Producción incluye asistencia y votaciones; gastos queda como componente separado con 16.275 registros. |
| Senado | 1.428 | 7.002 | Alcance | El snapshot local combina categorías; producción mantiene votaciones y gastos como componentes separados. |
| ChileCompra | 74.142 | 1.915.039 | Alcance | Producción expone el corte vigente; local conserva histórico y cortes acumulados. No son universos equivalentes. |
| DIPRES | 247.287 | 92.286 | Alcance | Son datos agregados con distinto alcance; no deben compararse como fichas individuales. |
| InfoLobby | 71.467 | 60.523 | Frescura | Producción tiene un corte posterior al snapshot local. |
| Transparencia Activa | 1.226.913 | 1.218.136 | Frescura | Producción tiene una publicación posterior; no es una pérdida atribuible al sitio. |
| Contraloría | 310 | 291 | Frescura | Producción tiene una publicación posterior. |
| Ley 19.862 | 62.172 | 59.361 | Frescura | Producción tiene una publicación posterior. |

## Desajustes de calidad pendientes

- ChileCompra: `source-health` local declara 888.693 registros mientras el catálogo local conserva 1.915.039. Debe separarse explícitamente el corte vigente, el histórico y el universo del manifiesto antes de calcular cobertura.
- DIPRES: `source-health` local declara 476 registros frente a 92.286 en el catálogo local. La diferencia confirma que se mezclan resúmenes de salud con artefactos de distinto alcance.

## Decisiones de seguridad

- Producción es la referencia para el conteo vigente.
- El snapshot local se usa para auditoría histórica, no para reemplazar producción.
- No se calculan porcentajes de cobertura con estas cifras hasta separar categorías y períodos.
- No se modificó R2, D1 ni ningún release productivo durante esta auditoría.
- Las categorías de Cámara y Senado no se sumarán entre sí ni se mezclarán con remuneraciones.

## Estado de almacenamiento R2

La auditoría remota del mismo ciclo informa:

- Uso: `9.016.336.751` de `10.000.000.000` bytes (`90,16%`).
- Estado: `growth-blocked`; no se permiten nuevas publicaciones grandes.
- Objetos: `8.362`.
- Proyección central candidata: aproximadamente `4,48 GB` y `5.121` objetos; permanece sin publicar.
- Duplicados detectados: aproximadamente `66 KB` recuperables potenciales; quedan sin borrar porque el inventario no prueba que sus claves sean prescindibles.

Esta capacidad impide promover una nueva proyección central hasta contar con una decisión explícita de retención/archivo y una validación de que el release no contiene períodos futuros.

## Próximo paso verificable

Reconciliar primero Cámara y Senado mediante una matriz por categoría, período y release. Después se podrá validar el histórico de ChileCompra y los resúmenes agregados de DIPRES sin alterar las rutas públicas actuales.

## Prueba de historial acotado desde R2

Se ejecutó una lectura de prueba para **Alejandro Fernandez Troncoso** entre los releases `2026-08-30T08-05-27-795Z` y `2026-09-02T03-28-30-598Z` de `funcionarios-v1`.

- Se encontraron 1 fila en cada release.
- La identidad, organismo y período permanecieron iguales.
- El monto bruto cambió de `$1.614.067` a `$60.000`.
- La clasificación resultante fue `source-correction`.
- Se leyeron 10 objetos R2 en total, sin escaneo masivo ni consulta D1.

La muestra confirma el mecanismo de historial, pero no constituye todavía una validación global de todas las personas o períodos.

## Frescura de las fuentes CPLT

La comprobación de validadores remotos detectó cambios en las cuatro nóminas frente al snapshot anterior:

- Planta: validador cambiado.
- Contrata: validador cambiado.
- Honorarios: validador cambiado.
- Código del Trabajo: validador cambiado.

Por tanto, la ejecución central en curso está justificada por cambios reales de fuente. El validador sólo demuestra que el archivo cambió; no sustituye la validación de períodos, conteos, cobertura y calidad antes de publicar.

## Tamaño de las fuentes remotas

La inspección `HEAD` del mismo ciclo confirmó que las fuentes se sirven con rangos HTTP:

| Nómina | Tamaño remoto aproximado | Rangos |
| --- | ---: | --- |
| Planta | 8,66 GB | Sí |
| Contrata | 14,40 GB | Sí |
| Honorarios | 8,36 GB | Sí |
| Código del Trabajo | 6,25 GB | Sí |

El ETL no debe descargar estas fuentes completas a R2 ni mantenerlas completas en memoria. La ejecución actual procesa sólo una categoría a la vez y materializa únicamente el resultado validado. La duración de Planta es compatible con su tamaño; el criterio de fallo sigue siendo el timeout, el error del job o el límite de 300 minutos, no el paso de unos pocos minutos sin artefacto.

## Prueba acotada de respuesta y esquema

Se leyó únicamente el primer bloque de 4 MiB de cada fuente, sin guardar el universo. Las cuatro respondieron `HTTP 206` con `Content-Range` válido y encabezados separados por `;` que el parser reconoce. Los primeros registros observados correspondieron a períodos recientes de 2026 (Agosto en Planta, Contrata y Código del Trabajo; Julio en Honorarios). Esta prueba confirma disponibilidad y esquema inicial, pero no reemplaza el recorrido completo requerido para detectar anomalías en cualquier posición del archivo.

## Revalidación del ciclo de normalización — 15-09-2026 23:35

- Las pruebas específicas de reconciliación, R2 y plan de datos quedaron en `4 archivos / 39 pruebas aprobadas`.
- Las pruebas específicas de contrato, movimientos y verificación de producción quedaron en `3 archivos / 16 pruebas aprobadas`.
- El artefacto local de Planta fue validado: `297.468` registros, `d9ddf00435b95755199711fcd48589b4dba5e0635843a1983f12e873485c3818`, sin períodos inválidos y sin montos negativos.
- El job de Contrata continúa en estado `in_progress`, dentro de la etapa de procesamiento central; no se reinició.
- Los jobs de Honorarios y Código del Trabajo aún no deben considerarse validados porque permanecen pendientes de ejecución.
- La auditoría pública de `funcionarios-v1` mantiene `1.226.913` filas indexadas, `123` páginas, `0` identificadores duplicados y `25` organismos sin archivo disponible en el release. El estado sigue bloqueado sólo por ausencia de metadatos de períodos declarados.
- La auditoría de almacenamiento mantiene `9.016.336.751` bytes usados (`90,16%`) y `growth-blocked`; no hubo escrituras, eliminaciones ni publicaciones R2 en esta revalidación.

El avance del bloque ETL central queda en `25%` (Planta validada de 4 nóminas). El avance global del plan se mantiene en `84%` hasta validar Contrata, Honorarios y Código del Trabajo.

## Actualización del ciclo central — workflow 34918549350

La ejecución secuencial terminó sus cuatro ingestas sin publicación (`publish=false`). Todas las categorías terminaron con artefactos `valid`. Los resultados verificados del ciclo son:

- Planta: `297.468` registros; checksum `d9ddf00435b95755199711fcd48589b4dba5e0635843a1983f12e873485c3818`.
- Contrata: `874.404` registros; checksum `634a217c20e711a0bc737ff2a008c9c32679f80094c43a1c20325f94feca4362`.

- Honorarios: `621.112` registros, `658` organismos/proyecciones, `660` archivos locales y `978.310.741` bytes.
- Checksum de Honorarios: `2bd624225706837d47636a9ee53d0aea3e262dc4e6852a582075584efaa1bd8d`.
- Código del Trabajo: `329.897` registros, `387` archivos y `414.181.523` bytes.
- Checksum de Código del Trabajo: `4f31ce55b33a6dd4cc63e8fe1359d2e162cf12069cfc18517f179d87d9176f81`.
- El artefacto de Honorarios conserva los campos originales y separa los líquidos no informados de los valores cero.
- No hubo escrituras, eliminaciones ni publicaciones en R2 o D1.

Las cuatro nóminas centrales están validadas localmente (`100%` del bloque ETL central). El conteo candidato conjunto es `2.122.881` registros. Esta validación no autoriza promoción porque R2 mantiene `growth-blocked`; además, aún falta reconciliar el alcance de cada categoría con el release productivo antes de presentar coberturas.
