# Tablero de puertas verificables

## Cierre solicitado — baja y media complejidad, 2026-10-05

Este es el listado activo LM01–LM09. Los bloques O01–O16 de abajo conservan su propio alcance y evidencia; no se vuelven a ejecutar ni se suman para fabricar un porcentaje global. Cada LM usa las cuatro puertas definidas en `plan.md`; una ejecución omitida o una muestra no certifica una fuente completa.

| ID | Tarea | Complejidad | Puertas comprobadas | Avance |
| --- | --- | --- | --- | ---: |
| LM01 | Tablero/documentación únicos y ruta vigente | Baja | Referencia, actualización y enlaces/diff validados; fusión pendiente | 75 % |
| LM02 | Alcance, fuente y corte en cifras municipales | Baja | Etiquetas de compras, población, presupuesto y personal corregidas con pruebas; faltan comprobación final de etiquetas restantes y preview del commit final | 50 % |
| LM03 | Titular documentado separado del pago histórico en dos comunas | Baja–media | Fuentes municipales, implementación, pruebas y cabecera en preview escritorio/móvil comprobadas; promoción productiva pendiente | 75 % |
| LM04 | Metodología: alcance efectivo por fuente | Baja–media | Política general implementada y probada; falta validar alcances particulares y preview | 50 % |
| LM05 | Fechas/contadores coherentes Home–API–release | Media | Unidades y fechas productivas identificadas; etiqueta de revisión publicada probada, pero falta conciliación completa con snapshot canónico | 25 % |
| LM06 | Procedencia, frecuencia, ejecución y fallos por ETL | Media | Ejecuciones y pasos relevantes documentados; falta completar procedencia efectiva y preservación por conector en el registro existente | 25 % |
| LM07 | Ciclo automático de anuncio y confirmación de Movimientos | Media | Piloto/pruebas reutilizados y 71 pruebas actuales aprobadas; falta cotejo productivo y cierre documental | 50 % |
| LM08 | Muestra de montos bajos, cero y faltantes contra origen | Media | Cuatro casos positivos cotejados previamente; Abel reconfirmado y 16 pruebas semánticas aprobadas; falta evidencia original de cero/faltante | 50 % |
| LM09 | Preflight de históricos y margen de cuenta sin cargar datos | Media | Inventario de cuatro buckets medido; histórico sin comprimir no cabe bajo 95%; diagnóstico validado, fusión pendiente | 75 % |

Fuera de este encargo: recuperar/ampliar históricos masivos, nuevos análisis dependientes de ellos y ChileCompra. No se modifican `cambiometro-editorial`, menú ni rutas.

### Cola de cierre — actualizada 2026-10-07

No son tareas nuevas ni una nueva auditoría. Se desglosa sólo lo que falta de
LM01–LM09 y del plan operativo anterior. Los porcentajes miden puertas de
trabajo, **no porcentaje de datos correctos ni cobertura de una fuente**.

| Orden | Pendiente concreto | Esfuerzo restante | Criterio de cierre / dependencia |
| --- | --- | --- | --- |
| 1 | LM01: dejar tablero, ruta y evidencias integrados | XS, documental | Enlaces válidos y PR fusionado; no requiere extracción |
| 2 | LM02–LM03: finalizar etiquetas municipales y publicar separación autoridad/pago | S, presentación | Commit final en preview; Tortel/O’Higgins y cero/faltante probados; promoción y comprobación pública |
| 3 | LM04: completar alcances particulares y publicar Metodología | S, metadatos existentes | Cada limitación corresponde al release integrado; validar en el mismo preview del punto 2 |
| 4 | LM09: integrar diagnóstico de capacidad ya medido | XS, documental | Fusión del informe fechado; no cargar históricos ni repetir inventario para cerrar el diagnóstico |
| 5 | LM05–LM07: cerrar fechas, unidades y ciclo de Movimientos | M, comprobación acotada | Snapshot, API y Home comparados por la misma unidad; anuncio contado y confirmación sobre el mismo ID; evidencia de modalidad diaria |
| 6 | LM06: completar ficha operativa de cada ETL existente | M, documental por conector | URL efectiva, ventana, frecuencia, última ejecución real y conservación del release; distinguir `verify-only` y pasos omitidos |
| 7 | LM08: completar muestra de cero y faltante contra celdas originales | M, origen externo | Lectura acotada y evidencia de las celdas; causa desconocida queda explícita; no extrapolar a todos los municipios |

**Siguiente entrega concreta:** cerrar el bloque de documentación y
presentación (órdenes 1–4) con un único preview final, sin esperar a una
carga histórica ni mezclarlo con ChileCompra. Antes de promover se ejecutan
las validaciones del commit exacto; no se usa un preview anterior como prueba
de cambios posteriores.

Estado comprobado el 7 de octubre: PR #715 abierto y fusionable; preview
`37272960580` exitoso para `5d7e6833`. El checkout contiene cuatro commits
posteriores (`a14cc769`, `e4de1624`, `45241b7c`, `9469da5c`) aún no enviados
al remoto. Por tanto, las últimas etiquetas y explicación de votaciones
**no están acreditadas en ese preview ni en producción**. Esta anotación es
un punto de control fechado, no una instrucción para volver a ramas antiguas.

### Otros pendientes del plan operativo — conservar, no duplicar

| Referencia existente | Avance registrado | Qué falta | Prioridad / dificultad |
| --- | ---: | --- | --- |
| O05: costes automáticos | 50 % | Preflight sin escrituras con telemetría de almacenamiento y operaciones; informe de uso facturable y presupuesto | Separado del bloque rápido; bloquea nuevas cargas sin margen comprobado |
| O10: monitoreo | 75 % | Frescura/estado por fuente, manifiestos externos/API y presupuesto; no sólo pin estático | Media, después de LM06 y según dependencias O05/O08 |
| O11: cierre operativo por ETL | 0 % del conjunto | Completar puertas por conector; reutilizar guardas ya cerradas, no rehacerlas | Media por fuente; bloqueos externos se registran como dependencias |
| O13: remuneraciones municipal/central | 0 % del conjunto | Ciclos, índices, conteos y publicación individual; 38 bis ya tiene su ciclo probado | Media–alta; después de aclarar LM02/LM08, sin barridos masivos |
| O08: ReleaseSet externo | 75 % del alcance registrado | Manifiestos externos al conjunto estático y prueba de coherencia completa | Alta; no reabrir lo estático ya validado |
| O15: observación | 0 % | Siete días reales tras cumplir sus condiciones de inicio | Depende de operación; no puede acelerarse con pruebas locales |
| O16: ChileCompra | 0 % | Conciliación por período y recuperación del origen con preflight | Último, expresamente diferido |

O05, la publicación operativa de cada ETL y sus controles no se consideran
terminados por fusionar documentación o desplegar cambios visuales. No se
calcula un porcentaje global mezclando estas tareas con los LM ni se vuelven
a ejecutar los bloques O ya cerrados.

Actualizar este archivo y `evidence.md` en el mismo PR que completa una
puerta. `0/4 = 0 %`, `1/4 = 25 %`, `2/4 = 50 %`, `3/4 = 75 %`, `4/4 = 100 %`.
Para cada tarea, la cuarta puerta es la verificación externa o la fusión
documental; no marcarla por una prueba local. Orden y dependencias en
[plan.md](plan.md).

## O01 · Tablero y ruta canónica · XS · 100 %

- [x] Revisar `origin/main`, checkout divergente y documentos existentes.
- [x] Crear plan ordenado, tablero y registro de evidencia sin borrar historia.
- [x] Definir fórmula de porcentaje y protocolo de cierre/reapertura.
- [x] Fusionar la documentación en `main` y comprobar sus enlaces/rutas.

## O02 · Evitar retroceso de Movimientos · S · 100 %

- [x] Identificar las rutas que restauraban el JSON de Git.
- [x] Exigir manifiesto y checksum R2 en UI y ETL; eliminar reparación obsoleta.
- [x] Pasar pruebas, tipos, build y smoke de CI.
- [x] Promover el artefacto y verificar release/eventos productivos.

## O03 · Registro de fuentes · S · 100 %

- [x] Reconciliar calendario con workflows, modo, frecuencia y fuente configurada (URL/API/documento); incluir Senado local-only.
- [x] Asociar por fuente ventana extraída, manifiesto R2, release, checksum, períodos y alcance o marcar «no medido».
- [x] Generar matriz reproducible y probar faltantes/duplicados sin descargar universos.
- [x] Validar contra manifiestos productivos y fusionar sin alterar datos públicos.

Registro en [source-registry.md](source-registry.md). Cierre efectivo al fusionar
este cambio con CI verde. Registra configuración y metadatos, no declara sanos
los ETL ni completa las puertas operativas O11–O13.

## O04 · Contadores públicos por release · S · 100 %

- [x] Identificar los literales de conteo/frescura en Fuentes y su unidad.
- [x] Sustituirlos por metadatos verificados, con estados «parcial»/«no medido».
- [x] Probar discrepancias de corte, nulos y ausencia de manifiesto.
- [x] Preview, promoción ui-only y comparación con el resumen del release productivo (run 36912818623; 13 fuentes; 320/1440 px).

## O05 · Costo cero y respaldo existente · S · 50 %

- [x] Confirmar que el calendario no genera nueva copia completa ni backup D1; verificar sólo el respaldo existente.
- [x] Medir bytes, objetos, operaciones Clase A/B y uso facturable de **toda la cuenta**, incluidos backups, en el ciclo actual.
- [ ] Probar sin escrituras un preflight que bloquee si falta telemetría o hay riesgo de superar cualquier margen gratuito.
- [ ] Publicar informe fechado de costo cero verificable, protección existente y presupuesto por publicación.

## O06 · Piloto ETL Movimientos · M · 100 %

- [x] Preparar candidato aislado desde release R2; distinguir sin cambios y fallo externo.
- [x] Probar cero inesperado, descenso, anuncio contabilizado y confirmación sobre el mismo ID.
- [x] Ensayar replay acotado; ningún no-op dispara publicación Pages.
- [x] Promover sólo con pruebas verdes y verificar cronología/rollback.

Además del replay local, la ejecución real desde `main` 36854416777 y sus
controles posteriores pasaron: no-op sin subida R2 ni build Pages. Cronología
productiva y rollback comprobados; evidencia abajo. Costes (#671) siguen apartados.

Conciliación documental 2026-10-03: O06 sigue al 100 % del piloto, mientras
`etl-closure.md` reconoce 3/4 puertas operativas (75 %) respaldadas por las
ejecuciones 36854416777 y 36930661823. Su cuarta puerta requiere acreditar
operación y uso facturable; no se cierra O05 ni O15 ni se afirma cobertura
completa. La fila antigua 0/4 no describía las evidencias existentes.

## O07 · Contrato ETL reutilizable · M · 100 %

- [x] Extraer guardas comunes sin duplicar la lógica existente de cada fuente.
- [x] Cubrir checksum, períodos, identidad, duplicados, descenso y presupuesto.
- [x] Pruebas contractuales: caída externa, cero, candidato parcial y rollback.
- [x] Migrar preflight Cámara y verificar catálogo candidato aislado mediante replay local, sin publicación R2. PR #679 integrado con CI verde.

## O08 · `ReleaseSet` R2 · M · 75 % tras fusión de la guarda remota

- [x] Contrato local de inputs estáticos: huellas por dominio, checksum y pin de manifiesto;
  conteos ausentes quedan nulos. Prueba de base concurrente obsoleta y candidato combinado.
- [x] Implementar comparación/promoción condicional del puntero estático R2 con `If-Match`; rechazo 412 real y escritura idéntica válida comprobados. Cierre efectivo tras CI y fusión; detalle en `docs/operations/r2-static-conditional-promotion-20261002.md`.
- [x] Añadir pin de inputs estáticos, verificación de bytes y metadatos al artefacto Pages.
- [x] Integración estática validada en CI, preview y producción (PR #683, promoción 36934573710).
- [ ] Validar integración en preview y abarcar manifiestos externos al conjunto estático.

- [ ] Definir esquema versionado de IDs/checksums/conteos por dominio y puntero atómico.
- [ ] Construirlo desde releases existentes, sin alterar historiales ni D1.
- [ ] Probar dos ETL concurrentes, checksum incorrecto y `ui-only` sin retroceso.
- [ ] Pages fija ese `ReleaseSet`; preview y producción concuerdan.

## O09 · Promoción Pages coherente · M · 100 % del conjunto estático

- [x] Implementar bloqueo compartido para tres flujos Pages y publicadores estáticos,
  sin cancelación del activo y con `queue: max`; 19 pruebas de configuración.
- [x] Añadir rechazo de artefacto con pin estático distinto del manifiesto R2 actual.
- [x] Verificar estos cambios en CI/preview y producción; no equivalen a CAS remoto.

- [x] Separar y documentar disparos `ui-only`, `data-refresh` y promoción.
- [x] Un bloqueo global impide promociones solapadas; fallos/no-op no despliegan (37050531642 omite build; 37048540901 bloquea pin desfasado).
- [x] Artefacto incluye evidencia de releases y smoke de rutas, búsqueda y conteos.
- [x] Promover y registrar deployment, rollback y verificación productiva (37050448199). Alcance y límites en `docs/operations/pages-coherent-promotion-20261002.md`; manifiestos externos siguen en O08.

## O10 · Monitor diario · M · 75 %

- [x] Agrupación de incidentes del smoke existente, recordatorio semanal y
  recuperación sólo tras controles correctos; 11 pruebas, tipos y lint locales.
  PR #685 y ejecución real 36939508453 verdes: 12 rutas comprobadas, 42 alertas
  antiguas cerradas sólo tras recuperación. Runbook en `docs/operations/uptime-incidents-20261001.md`.
- [x] Control acotado de calendario mediante metadatos GitHub (33 lecturas),
  sin extracción ni datos R2/D1; 7 pruebas. CI y ejecución real 36956479341 aprobadas; calendario diario activo.
  No equivale a frescura del release; evidencia en `docs/operations/etl-calendar-monitor-20261001.md`.

- [x] Comparar pin estático R2/Pages por checksum y ID, sin filas; replay de errores y ejecución real 37054632539 verde. PR #695; 26 pruebas. Incidente por divergencia agrupado con recordatorio semanal y recuperación verificada.
- [ ] Completar estado/frescura de cada candidato y release, manifiestos externos/API y presupuesto automático; distinguir degradación externa con evidencia, no por la conclusión de Actions. No se declara sana una fuente porque el pin estático coincida.

## O11 · Fuentes pequeñas y bloqueadas · M por fuente · 0 %

Subtareas comprobadas al 2026-10-02: personal de apoyo Senado, ciclo 2026 cerrado (4/4, cuota confirmada por Jorge); Cámara 1/4, `degraded_external`. Guardas compartidas cerradas en PR #687. El porcentaje de O11 completo permanece pendiente de las otras fuentes. Evidencia en `docs/operations/personal-apoyo-source-guards-20261002.md`.

SINIM: dependencia D1 eliminada y guarda R2-only cerrada al 100 % (PR #699, verify-only 37062175649 y controles posteriores sin despliegue). No cierra replay anual ni cobertura de origen: `docs/operations/sinim-r2-only-20261002.md`.

DIPRES: guarda R2-only cerrada al 100 % (PR #701, verify-only 37085144507 y controles posteriores sin despliegue). Proyección/subset verificados, sin actualización presupuestaria ni cierre de cobertura: `docs/operations/dipres-r2-only-20261002.md`.

InfoProbidad: guarda R2-only cerrada al 100 % (PR #705, verify-only 37106727934 y controles 37106819129/37106819187 sin despliegue). Dos objetos verificados, 736.930 bytes; sin extracción mensual, datos nuevos ni D1. No cierra las cuatro puertas ni cobertura de origen: `docs/operations/infoprobidad-r2-only-20261003.md`.

Ley 19.862: guarda R2-only cerrada al 100 % (PR #707, verify-only 37108164915 y controles 37108286931/37108286936 sin despliegue). Creación/materialización D1 retiradas; bridge, extracción y publicaciones omitidos en verificación. Dos objetos estáticos verificados, 4.907.481 bytes; sin datos nuevos, crecimiento R2 ni cierre del replay mensual/manifiesto API externo: `docs/operations/ley19862-r2-only-20261003.md`.

CPLT: guarda R2-only cerrada al 100 % (PR #709, check-sources-only 37118857265 y controles 37118947771/37118947696 sin despliegue). Registro automático D1 retirado, incluido alias de finalización; cuatro categorías oficiales responden. Validadores previos nulos: no acredita corte nuevo ni cobertura. Ingestas/consolidación omitidas, sin cuerpos CSV, escrituras R2 ni cierre del ciclo municipal/central: `docs/operations/cplt-r2-only-20261003.md`.

- [ ] Dividir por fuente y registrar procedencia efectiva, ventana, modo/frescura; Senado votaciones es local-only.
- [ ] Migrar fuentes pequeñas con prueba de fallo externo y último release preservado.
- [ ] Tratar Cámara personal de apoyo y Senado sin convertir 403 en cero.
- [ ] Verificar API, página y rollbacks individuales antes de cerrar cada fuente.

## O12 · Gastos parlamentarios · M · 100 % del alcance publicado

- [x] Cotejar meses y checksums declarados por Cámara/Senado con navegación: 178/178 períodos coinciden por conteo con API R2; tres archivos antiguos/recientes verificados por bytes y SHA.
- [x] Conservar nulo/no informado distinto de cero y seleccionar último corte: 27 pruebas específicas y fichas productivas con los tres filtros.
- [x] Probar replay mensual y reducción inesperada sin D1 masiva: PR #689 integrado, 43 pruebas; junio/julio Senado 1.248/1.250 filas. Workflow exige línea base R2 validada por checksum.
- [x] Promoción y smoke de fichas, API y manifiesto: PR #693, índice histórico reparado, deployment 37050448199 y pin R2/Pages idénticos. No acredita cobertura total del Congreso ni cada fila histórica contra origen.

## O13 · Remuneraciones · M por componente · 0 %

Avance por componente: **38 bis 100 % del ciclo probado (4/4)**; ejecución remota 37086353257 recuperada, CSV/R2 concordantes y no-op sin PUT/Pages. No demuestra disponibilidad continua; O15 pendiente. Corrección nulo/cero de búsqueda publicada y comprobada al 100%. Municipal y central pendientes, por lo que no se atribuye el porcentaje de 38 bis al conjunto. Evidencia y ruta de trabajo en `docs/operations/remuneraciones-38bis-candidate-guards-20261002.md`.

- [ ] Dividir municipal, central, 38 bis y apoyo parlamentario; fijar cortes/unidades.
- [ ] Probar guardas y búsquedas indexadas sin barridos D1 ni fusión nominal.
- [ ] Comparar conteos, checksum e índices por organismo/período en preview.
- [ ] Promover cada componente por separado y verificar fichas y búsqueda.

## O14 · Rollback sin nueva copia · M · 100 % tras fusión con CI verde

- [x] Identificar release vigente y anterior con checksum; inventariar respaldo ya existente sin borrar ni copiar.
- [x] Ensayar rollback del puntero de release en entorno aislado, sin escritura R2 productiva.
- [x] Verificar muestra acotada: seis tamaños distribuidos, 22,3 MB restaurados, siete GET de datos, cero escrituras.
- [x] Documentar recuperación en `docs/operations/rollback-existing-backup-20261002.md`; cierre efectivo tras CI verde y fusión. No acredita CAS remoto O08 ni restauración completa de todos los blobs.

## O15 · Observación · S operativo / 7 días · 0 %

- [ ] Iniciar ventana sólo tras O09–O14 con línea base de release IDs.
- [ ] Verificar días 1–3 sin retroceso ni divergencias.
- [ ] Verificar días 4–7 y alertas sin duplicación.
- [ ] Publicar acta con siete días completos y declarar estable sólo el alcance probado.

## O16 · ChileCompra al final · M por período · 0 %

- [ ] Conservar último release válido; medir alcance 2026 y bloqueo externo.
- [ ] Preflight de páginas, bytes, operaciones y margen R2 antes de extraer.
- [ ] Candidato por período con conteos, IDs y checksums sin cero ficticio.
- [ ] Preview, promoción individual y aviso de cobertura comprobada.
