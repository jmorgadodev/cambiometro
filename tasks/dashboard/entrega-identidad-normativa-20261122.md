# Entrega local: identidad financiera y catálogo normativo — 22-11-2026

## Cambios

Se conserva el explorador de cinco vistas, sus filtros, fotografías, cálculos por componente, exportaciones y diseño. La corrección se aplica en una capa compartida de identidad financiera del Senado; se integra un catálogo normativo versionado y una explicación discreta bajo demanda en las vistas financieras. No se reconstruyeron ETL/API/almacenamiento ni se modificaron Votaciones o Movimientos.

Código: `36a3367a` (identidad/consumidores), `419b0cef` (catálogo/contexto/monitor) y `a2803c8a` (integridad del caché mensual publicado), rama `codex/dashboard-explorador-20261121`, raíz canónica cambiometro-public. No hay push, PR, ejecución remota ni despliegue.

## Identidad oficial y alcance

`sen-030` corresponde a Paulina Vodanovic Rojas, identificador oficial Senado **1450**. Se acredita la variante original `VODANOVIC PAULINA` mediante la [ficha oficial](https://tramitacion.senado.cl/appsenado/index.php?ac=fichasenador&id=1450&mo=senadores), el [listado de transparencia](https://tramitacion.senado.cl/appsenado/index.php?ac=informeTransparencia&mo=transparencia&tipo=16) y el [documento de asignación de personal](https://tramitacion.senado.cl/appsenado/index.php?ac=doctoInformeAsesoria&id=23587&mo=transparencia). El documento y el catálogo oficial contienen el nombre completo; el encabezado de transparencia utiliza la variante abreviada.

`lib/senate-financial-identity.ts` conserva la equivalencia explícita y sus fuentes. Normaliza sólo formato (orden de palabras, puntuación, mayúsculas y tildes); admite el nombre canónico completo aunque la fuente incluya un nombre adicional. Abreviaciones requieren equivalencia acreditada. Una oficina o reclamante ambiguo devuelve ausencia de asociación, no una mejor coincidencia. No se crean personas ni identificadores personales nuevos. Se conserva la clave original de oficina y se exporta en CSV. Nuevos meses con la misma variante utilizan la misma regla sin intervención mensual.

El índice se calcula una vez por conjunto de nombres distintos y catálogo; no se recorre toda la nómina por cada fila. Consumidores: fichas y evidencia, precálculo de fichas de gastos y personal, Partidos, modelo financiero, proyección del explorador, agregados, gráficos, paneles, series y CSV. Las consultas históricas fuera del catálogo actual sólo conservan su recuperación por nombre completo exacto; no se les inventa identidad canónica.

Antes, la ficha de Paulina podía incluir el personal por una búsqueda parcial, pero Partidos/dashboard/evidencia estricta lo omitían. No se afirma una omisión universal ni se mantiene el total anterior para forzar conciliación.

## Registros y montos recuperados

Rango del dashboard marzo–septiembre 2026:

| Mes | Registros | Monto original recuperado |
|---|---:|---:|
| 2026-03 | 9 | $ 16.129.228 |
| 2026-04 | 9 | $ 15.833.335 |
| 2026-05 | 8 | $ 13.820.000 |
| 2026-06 | 8 | $ 13.820.000 |
| 2026-07 | 9 | $ 14.420.000 |
| 2026-08 | 10 | $ 14.720.000 |
| 2026-09 | 10 | $ 14.720.000 |
| **Total** | **63** | **$ 103.462.563** |

El archivo contiene 73 observaciones enero–septiembre: enero aporta 3/$4.375.893 y febrero 7/$12.209.228; total anual incorporado $120.047.684. Se conservan sus períodos; no se trasladan al rango marzo–septiembre.

Agregados de **personal de apoyo** del rango, comprobados desde las filas originales y contra detalle/CSV; PS y Maule incluyen ambas cámaras:

| Selección | Antes | Corregido | Diferencia |
|---|---:|---:|---:|
| congreso | $ 14.213.208.658 | $ 14.316.671.221 | $ 103.462.563 |
| ps | $ 1.221.509.864 | $ 1.324.972.427 | $ 103.462.563 |
| maule | $ 999.728.427 | $ 1.103.190.990 | $ 103.462.563 |
| senado | $ 4.604.528.296 | $ 4.707.990.859 | $ 103.462.563 |

El aporte antes omitido de Paulina era una ausencia de asociación, no un sueldo cero. Las 63 observaciones se comparan con multiplicidad, nombre, cargo, mes e importe; no se deduplican por nombre ni se suman nuevamente contratos. Las medidas financieras del explorador de los otros 204 parlamentarios permanecen iguales. El informe distingue este hecho de la corrección adicional de fichas siguiente.

## Otra atribución incorrecta en los precálculos

La revisión puntual encontró que el preparador de fichas usaba otra búsqueda difusa por dos palabras. Asociaba `JUAN ENRIQUE CASTRO PRIETO` a `sen-025`, Juan Luis Castro González. El modelo del dashboard ya excluía esas filas, pero los slices/fichas podían incluirlas. Ahora ambos utilizan el mismo índice determinístico.

| Ficha de Juan Luis Castro González: gastos operacionales | Antes | Corregido | Diferencia |
|---|---:|---:|---:|
| Marzo–septiembre 2026 | $54.320.570 | $52.662.768 | −$1.657.802 |
| Enero–septiembre 2026 | $81.242.386 | $66.497.092 | −$14.745.294 |

Se dejan de atribuir 73 filas ajenas de 2026: enero −$8.047.195, febrero −$5.040.297 y marzo −$1.657.802 (25 filas en marzo). El cálculo utiliza `procesarGastosPolitico` para no sumar TOTAL y desglose. No se borra fuente: queda fuera de esa ficha y conservada en el conjunto histórico/no asociado al catálogo actual.

El mismo archivo histórico reveló atribuciones Ignacio/Patricio Walker→Matías Walker y Jacqueline van Rysselberghe→Enrique, fuera de 2026. No se amplió la auditoría a otras fuentes ni se reasignaron esas identidades sin respaldo.

## Cobertura técnica

Personal Senado marzo–septiembre: de 49 a 50 oficinas del catálogo actual; de 2.768 a 2.831 filas asociadas. Quedan 219 filas: 12 de una oficina institucional de fuero laboral y 207 de 19 oficinas fuera de los 50 senadores actuales. Su exclusión del agregado individual actual no significa inexistencia del registro. No se convierten oficinas institucionales en parlamentarios.

Gastos Senado, comparación del modelo estricto: 7.497 filas asociadas de 7.972 del rango, sin otra abreviatura equivalente omitida; 475 filas/19 nombres fuera del catálogo actual. La comparación del precálculo difuso anterior se documenta por separado porque no utilizaba ese modelo.

Evidencia completa local: `artifacts/identity-normative/correction-report.json`, `identity-baseline.json`, `old-slice-ownership-audit.json`. [Conciliación resumida versionada](identidad-normativa-validacion-20261122.json). Las fuentes publicadas conservan checksums originales; se corrige su asociación/proyección, no su contenido.

## Catálogo normativo

[Catálogo y operación](../../docs/modules/normativa/README.md). Diez conceptos y veinte definiciones versionadas: reglas generales, personal, asesorías, actividades territoriales, oficinas, telefonía móvil, vehículos, desplazamientos, alojamiento/alimentación y comunicación. Cada entrada tiene ID estable, resumen, conceptos incluidos, exclusiones expresas, condiciones, institución, sección/página, vigencia, versión y fecha de verificación. Los originales de ambas resoluciones se conservan con SHA-256.

Fuentes: [Resolución N.º 12, 4 de marzo de 2026](https://www.consejoresolutivo.cl/wp-content/uploads/2026/03/Resolucion-N%C2%B012-2026-final.pdf), [Resolución N.º 11, 14 de agosto de 2024](https://www.consejoresolutivo.cl/wp-content/uploads/2024/08/Resolucion-N%C2%B0-11-de-14-agosto-2024-final.pdf), [índice normativo oficial](https://www.consejoresolutivo.cl/regulacion-de-asignaciones/) y [comunicación](https://www.consejoresolutivo.cl/tipos_de_asig/comunicacion/). Se consultaron los documentos, no sólo la síntesis de la web. La síntesis selecciona disposiciones concretas y no afirma reproducir toda instrucción complementaria.

Res11 rige desde 01-09-2024; Res12 desde **11-03-2026**. Marzo cruza dos versiones: un registro mensual sin día no se atribuye entero a la posterior. Fechas anteriores a la cobertura acreditada no reciben una norma nueva; las fechas inválidas no producen vigencia inventada. Las versiones históricas no se sobrescriben.

La relación glosa original→concepto está centralizada. «Actividad y comunicación» no se mapea directamente a Comunicación: se consultan los ítems que realmente contiene. Glosas genéricas o anómalas, como telefonía sin precisar móvil o TRASLACION VEHICULO9, no heredan restricciones específicas por aproximación; puede mostrarse alcance general. La dieta no se trata como asignación parlamentaria.

El ícono abre un panel con Qué contempla, Qué no permite, Restricciones y fuente. Disponible en gastos/personal/asesorías de fichas, dashboard, categorías/ítems, comparación, registros y catálogo en Metodología. Los detalles técnicos y reglas generales son secundarios. No se agregan advertencias permanentes, compras supuestas ni alertas de irregularidad.

## Actualización y costos

El detector semanal reutiliza `source-calendar-monitor.yml` sin cambiar su cron ni las programaciones ETL. Guarda PDF/hash/informe y conceptos potencialmente afectados; el alcance queda incierto cuando no puede determinarse por metadatos. Todo contenido nuevo o modificado queda `pending-validation`; la herramienta no interpreta ni modifica las explicaciones públicas.

La primera consulta de lectura examinó 12 documentos y dejó 10 no incluidos en el inventario inicial pendientes de revisión, incluidos documentos históricos/complementarios. No se afirma que todos sean nuevas resoluciones. La programación queda preparada **sólo en esta rama local**; no se activó remotamente.

Para aprobar: contrastar disposiciones y vigencia, conservar original, crear snapshot nuevo, revisar conceptos afectados, probar y aprobar por PR. No hay promoción automática por IA. Catálogo y explicación se distribuyen estáticamente; abrir el panel no consulta API/D1/Workers. Sin nuevas dependencias o infraestructura de pago.

## Pruebas y revisión

Suite integrada: **337 archivos / 2.168 tests**, tipos de aplicación/API y guardas estáticos aprobados. Se ejecuta con las entradas congeladas de pruebas; los datos publicados se verifican independientemente por checksum, conciliación raw y navegador. Lint del código afectado: cero errores, dos advertencias existentes por variables `id` no utilizadas. Pruebas de identidad incluyen ambigüedad, variantes, meses futuros, 63/73 registros y los otros 49 senadores. Las pruebas del catálogo verifican mapping exacto, transición temporal, fechas inválidas, originales por hash y detección sin publicación.

Export estático con CSP real: **71 comprobaciones aprobadas** (52 del explorador, 11 del contexto normativo y 8 de identidad en navegador). Sin excepciones, errores de consola, respuestas HTTP fallidas ni llamadas API/D1 en los recorridos del explorador. Las cinco vistas muestran a Paulina y el importe conciliado; el CSV descargado contiene 63 filas, oficina original, release y los montos exactos de cada mes. La ficha muestra septiembre y $14.720.000. Build completo, tipos y guardas aprobados: 4.886 páginas; artefacto de código `a2803c8a`. No se presenta axe como auditoría WCAG manual completa ni como ensayo en un teléfono físico.

Capturas reales del export final: [dashboard y normativa](../../transparencia-app/artifacts/identity-normative/screenshots/dashboard-normativa.png), [catálogo y versiones históricas](../../transparencia-app/artifacts/identity-normative/screenshots/metodologia-normativa.png), [ficha y normativa](../../transparencia-app/artifacts/identity-normative/screenshots/ficha-personal-normativa.png), [móvil](../../transparencia-app/artifacts/identity-normative/screenshots/movil-normativa.png). La captura de ficha también contiene componentes previos de la ficha que esta tarea no modifica; el nuevo panel no genera alertas de irregularidad. Capturas específicas de Paulina en `artifacts/identity-normative/screenshots/paulina-*.png`. Las cinco vistas del explorador y paneles se conservan en `artifacts/dashboard-refinement/screenshots/`. Las capturas finales se toman del artefacto estático, sin maquetas.

## Rendimiento y revisión visual

Se revisaron capturas reales de escritorio y móvil: panel derecho, contenido desplazable, pestañas, foco, cierre y fuente oficial legibles, sin recortes. El diseño del explorador y sus cinco vistas se conservan. Axe no detectó problemas graves/críticos en las cinco vistas ni en el panel probado; no sustituye una auditoría manual completa.

Mismo servidor estático local, Brotli 4: HTML 37.054 bytes (antes 36.762); hidratación 1.065.206 bytes decodificados / 146.148 comprimidos (antes 1.063.179 / 145.716). Captura inicial local completada, mismo origen: 604.897 bytes transferidos frente a 597.519, **+7.378 bytes / 1,23 %**; incluye el catálogo compartido y registros recuperados. Cero particiones de detalle solicitadas inicialmente; siguen bajo demanda. No hay dependencias nuevas ni consultas dinámicas para abrir normativa. No se extrapolan los tiempos de laboratorio a CDN/RUM ni a costos facturados.

## Caché mensual y recuperación de entradas

La verificación de las fichas detectó un índice mensual local anterior que terminaba en julio aunque el subconjunto verificado contenía agosto. Era válido estructuralmente y tenía precedencia sobre el subconjunto, por lo que el primer export omitía agosto en las fichas. El dashboard, construido directamente desde el release verificado, sí lo tenía. Se corrigió la preparación local reutilizando `writeExpensePeriodArtifacts`, **sin extraer datos ni ejecutar ETL**. Los shards reconstruidos de agosto coinciden byte a byte con los hashes del release. El índice derivado de laboratorio tiene su propio timestamp/hash y no se presenta como el índice publicado.

En modo publicado (`CAMBIOMETRO_PUBLISHED_RELEASE_ONLY=1`), el lector ahora exige el release-set fijado y verifica tamaño/SHA del índice mensual y de cada shard antes de utilizarlos. Falta de pin o mezcla de releases produce error explícito. Se conserva la prioridad del mensual, que puede legítimamente estar más actualizado que un subconjunto. Cinco regresiones cubren ausencia de pin, índice obsoleto, shard alterado y lectura válida.

Antes de construir se respaldaron/verificaron cuatro entradas y los 179 archivos mensuales originales. Tras aprobar el export se restauraron sus bytes originales y checksums, sin borrar archivos ni tocar `out/`. Los nuevos shards ignorados no referenciados por el índice restaurado se conservan. Recibo: `artifacts/identity-normative/restoration-receipt.json`; backups y hashes en `artifacts/dashboard-explorer/original-build-inputs/inventory.json` y `artifacts/identity-normative/original-expense-periods/inventory.json`. Se retiraron únicamente los cambios generados de headers/redirects/manifiesto; el export conserva los correctos.

Para reproducir la preparación local: verificar caché contra `source-receipt.json`, respaldar originales con hashes, hidratar las cuatro entradas publicadas y ejecutar desde `transparencia-app`:

```powershell
node --input-type=module -e "import {writeExpensePeriodArtifacts} from './scripts/expense-release.mjs'; writeExpensePeriodArtifacts(process.cwd())"
$env:CAMBIOMETRO_DASHBOARD_LOCAL_DATA='artifacts/dashboard/local-data.json'
$env:CAMBIOMETRO_DASHBOARD_SOURCE_RECEIPT='artifacts/dashboard-explorer/input/source-receipt.json'
npm run pages:build
node scripts/verify-financial-identity.mjs --projection public/data/parliamentary-explorer/bootstrap.json
npx tsx scripts/verify-generated-financial-profiles.mjs
```

Con el servidor `preview-parliamentary-explorer.mjs` activo en 3201, ejecutar `verify-explorer-refinement.mjs`, `verify-normative-context.mjs` con `EXPLORER_QA_BASE=http://127.0.0.1:3201` y `verify-financial-identity-browser.mjs`. Finalmente restaurar las entradas respaldadas verificando sus hashes, sin cambiar `out/`. El verificador de fichas utiliza `tsx` por las importaciones TypeScript/alias; no ejecutarlo con Node puro. El nuevo verificador de navegador compila su propio adaptador QA y no depende del recorrido anterior.

## Preparación de publicación

Revisión local en http://127.0.0.1:3201/dashboard/. El artefacto es de laboratorio, con fuentes financieras publicadas hidratadas reversiblemente desde caché verificable; otros módulos no se hidratan integralmente. No promoverlo directamente a producción. La publicación futura exige autorización, integración revisada, hidratación completa del release con sus guardas, preview, comprobación de SHA/proyección/catálogo y promoción del mismo artefacto. Conservar despliegue anterior y versión normativa previa para rollback. No desplegar desde un árbol modificado ni modificar R2 durante esta tarea.
