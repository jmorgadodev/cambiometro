# Tablero de puertas verificables

## Prioridad vigente — defendibilidad, 2026-10-07

Nuevo encargo aprobado: [registro C01–C05](../confianza/README.md). Prevalece
en prioridad, sin borrar LM cerrados ni aumentar porcentajes O por inferencia.
Ruta/branch/base, evidencia productiva y consulta no enviada están documentadas.
Las tareas nuevas miden entregables, no porcentaje de datos correctos.

- C01: referencia y matriz inicial preparadas.
- C02: dietas sin registro, suma histórica mensual y agregados de bancada
  retirados localmente; aritmética del pin R2 comprobada. 152 sesiones nominales
  discordantes quedan en revisión. Faltan documentos/actas y afiliación temporal.
  Seis fechas de Movimientos contrastadas y retiradas en presentación
  ([acta](../confianza/movimientos-documentos-20261007.md)); 47 pruebas dirigidas
  y 24 render locales aprobados. Preview `af973bc0` del código `abf3fcf4`:
  96/96 generales, 24/24 específicos en vivo, 1.614 pruebas e integración verdes.
  Cierre de presentación/documentación, no seis ceses certificados ni promoción.
- C03: avisos SSR por dominio, política de tres estados y metadatos de
  Movimientos corregidos; preview `41b39145` validado (96/96), 75% de puertas.
  Integración del PR reejecutada con D1 local autorizada: todos los pasos de
  `37654539770`, intento 2, aprobaron. Pendientes: indicadores restantes y
  contraste productivo; fixture local no certifica datos reales. Avance C01–C05: 83%.
- C04: cuatro borradores clasificados NO PUBLICABLES y versiones neutrales
  preparadas en editorial, con originales intactos.
- C05: expediente preparado; elegibilidad, adopción, evidencia de prácticas,
  puntuación y firma pendientes de Jorge/RIEA. No se envía ni presenta automáticamente.

No hay autorización de nuevas cargas o borrados R2 ni acceso a D1 de Cloudflare.
Jorge autorizó únicamente D1 local efímera para completar el CI de integración,
sin consumo facturable de D1; no cambia los límites de datos productivos.

## Cierre solicitado — baja y media complejidad, 2026-10-05

Este es el listado activo LM01–LM09. Los bloques O01–O16 de abajo conservan su propio alcance y evidencia; no se vuelven a ejecutar ni se suman para fabricar un porcentaje global. Cada LM usa las cuatro puertas definidas en `plan.md`; una ejecución omitida o una muestra no certifica una fuente completa.

| ID | Tarea | Complejidad | Puertas comprobadas | Avance |
| --- | --- | --- | --- | ---: |
| LM01 | Tablero/documentación únicos y ruta vigente | Baja | PR #715 integrado; ruta, tablero y evidencias comprobados | 100 % |
| LM02 | Alcance, fuente y corte en cifras municipales | Baja | Pruebas, preview final y render productivo comprobados; cero/faltante y presupuesto inicial/vigente diferenciados | 100 % |
| LM03 | Titular documentado separado del pago histórico en dos comunas | Baja–media | Tortel/O’Higgins comprobados en preview 320 px/escritorio y producción; pagos conservan sus períodos | 100 % |
| LM04 | Metodología: alcance efectivo por fuente | Baja–media | Tabla de 13 fuentes y política comprobadas en preview/producción; no certifica cobertura universal | 100 % |
| LM05 | Fechas/contadores coherentes Home–API–release | Media | Snapshot, API y Home conciliados por unidad; etiqueta publicada y contador 07 comprobados; ReleaseSet preview/producción idéntico | 100 % |
| LM06 | Procedencia, frecuencia, ejecución y fallos por ETL | Media | PR #717 integrado con CI verde; acción diaria normal activada, horario/principal preservados. Preflight 0 y dry-run con rechazo de sesiones incompletas documentados; no certifica disponibilidad de O11 | 100 % |
| LM07 | Ciclo automático de anuncio y confirmación de Movimientos | Media | Pruebas de mismo ID, anuncio contado, ejecución diaria real y cronología productiva comprobadas; no garantiza detectar toda noticia | 100 % |
| LM08 | Muestra de montos bajos, cero y faltantes contra origen | Media | Cuatro casos positivos históricos y dos celdas originales de cero/faltante cotejados; acta integrada en PR #716, CI completo verde | 100 % |
| LM09 | Preflight de históricos y margen de cuenta sin cargar datos | Media | Diagnóstico fechado integrado en #715: bruto no cabe bajo 95%; no se cargó ni se certificó facturación actual | 100 % |

Fuera de este encargo: recuperar/ampliar históricos masivos, nuevos análisis dependientes de ellos y ChileCompra. No se modifican `cambiometro-editorial`, menú ni rutas.

### Cola de cierre — actualizada 2026-10-07

No son tareas nuevas ni una nueva auditoría. Se desglosa sólo lo que falta de
LM01–LM09 y del plan operativo anterior. Los porcentajes miden puertas de
trabajo, **no porcentaje de datos correctos ni cobertura de una fuente**.

| Orden | Pendiente concreto | Avance actual | Esfuerzo restante | Criterio de cierre / dependencia |
| --- | --- | ---: | --- | --- |
| 1 | O05: guardas de costes sin token Analytics | 100 % | Cerrado | Almacenamiento automático, tope de estimación por publicación y revisión manual del acumulado; #671 fusionado |
| 2 | O10: completar monitor de frescura y estado | 100 % | Cerrado | Monitor diario en main; calendario, pin, API R2-only, frescura por fuente, presupuesto e incidentes verificados en ejecución real |
| 3 | O11: cerrar ciclos por ETL, uno a uno | 0 % del conjunto | M por fuente | Empezar por fuentes pequeñas sin bloqueo; completar las cuatro puertas propias, conservando releases ante fallo externo |
| 4 | O13/O08: remuneraciones y manifiestos externos | 0 % / 75 % | M–alta | Municipal/central por separado, conteos/índices y coherencia externa; preflight antes de cualquier recorrido o publicación |
| 5 | O15: observación real de estabilidad | 0 % | S operativo, siete días | Iniciar sólo al cumplir O09–O14; registrar días reales, sin sustituirlos por replay |
| 6 | O16: ChileCompra | 0 % | Alta por volumen/origen | Último y diferido; mantener release válido, sin cargas ni rankings nuevos hasta conciliar cortes y margen |

**Bloque baja/media LM01–LM09 cerrado:** sus cuatro puertas están acreditadas
en el alcance del plan. No vuelven a la cola ni requieren otro preview.
Las referencias
O conservan sus criterios y porcentajes propios; las guardas automáticas y
la publicación de cada ETL siguen separadas del bloque rápido, como se pidió.
El orden expresa prioridad, no autoriza cargas ni elimina dependencias.

Estado actualizado el 7 de octubre: PR #715 integrado mediante `a2b70c2e`.
Preview final `37566114254` y promoción `37567311188` exitosos; aplicación
`ef580bbf`, idéntica al merge salvo documentación. Deployment productivo
`d81c86ed-d45b-48e5-9c37-e3372d399e53`; rollback anterior comprobado en el
inventario de deployments: `314114bc-5d69-4a91-bafc-8b871eb0d713`.
Las correcciones de municipios, Metodología y Home se verificaron en la URL
productiva. El ReleaseSet coincide por SHA entre preview y producción.
LM08 integrado mediante PR #716, merge `f88356bb`, tras build/E2E, calidad,
CodeQL y seguridad verdes. No requiere otro despliegue visual.
LM06: el error anterior 0x8007010B quedó reproducido y se reparó el arranque
en un candidato aislado. PR #717, merge `e7ab8730`, integrado con build/E2E
`37570303117`, calidad, CodeQL y seguridad verdes. Preflight Windows del
7 oct 01:07:42 CL terminó 0; acción normal activada después de la fusión,
estado Ready, próxima ejecución 09:30 CL, horario/principal/settings intactos.
Dry-run de tres días detectó sesiones incompletas y no publicó.
Validación de asistencia de sesiones 10292/10291 pendiente en
O11, no convertida en cero ni en fallo HTTP; ver `etl-closure.md`.

### Otros pendientes del plan operativo — conservar, no duplicar

| Referencia existente | Avance registrado | Qué falta | Prioridad / dificultad |
| --- | ---: | --- | --- |
| O05: costes | 100 % | PR #671 integrado; preflight CI y remoto de sólo lectura exitosos | Acumulado mensual se sigue revisando en el panel; no usa Analytics API |
| O10: monitoreo | 100 % | PR #752/#755/#756 integrados; ejecución #38058804274 exitosa. Incidente único #754 mantiene visibles las fuentes atrasadas | Cerrado como monitor; remediaciones permanecen en O11/O16 |
| O11: cierre operativo por ETL | 0 % del conjunto | Completar puertas por conector; reutilizar guardas ya cerradas, no rehacerlas | Media por fuente; bloqueos externos se registran como dependencias |
| O13: remuneraciones municipal/central | 0 % del conjunto | Ciclos, índices, conteos y publicación individual; 38 bis ya tiene su ciclo probado | Media–alta; después de aclarar LM02/LM08, sin barridos masivos |
| O08: ReleaseSet externo | 75 % del alcance registrado | Manifiestos externos al conjunto estático y prueba de coherencia completa | Alta; no reabrir lo estático ya validado |
| O15: observación | 0 % | Siete días reales tras cumplir sus condiciones de inicio | Depende de operación; no puede acelerarse con pruebas locales |
| O16: ChileCompra | 0 % | Conciliación por período y recuperación del origen con preflight | Último, expresamente diferido |

Actualización 38 bis (09-10-2026): la ejecución manual 37997957980 publicó
el corte 2026-07 (1.591 filas, 18 períodos históricos; delta 0; D1=0). Su
preflight de inventario estimó 8 PUT y un pico de 8.610.012.807 B frente al
límite configurado de 10.000.000.000 B; no mide facturación ni cierra O05.
El artefacto añadió `situacion_fuente` a 179 filas; la primera incorporación se
trata como enriquecimiento del esquema, por lo que delta 0 se conserva. PR #746
integró en `main` el comparador que cuenta transiciones posteriores al baseline
(merge `30f0ac86`); sus 19 pruebas unitarias y todos los checks de CI pasaron.
El preview `review-38bis-20261010` respondió 200 en Home y Remuneraciones y
sirvió el ReleaseSet fijado por checksum. No se ejecutó ETL ni se publicó en
Pages producción. El cambio de estado requiere comprobarse en una siguiente
ejecución real; el CSV bruto previo no se retuvo para revalidar los cinco
retiros y una entrada observados.
Detalle y límites en `etl-closure.md` y `evidence.md`.

Dependencias observadas el 7 de octubre, sin crear una nueva auditoría:
personal de apoyo Cámara `37333599905` bloqueado por el origen; CPLT
`37351220112` y 38 bis `37362307722` cancelados/fallidos, sin ejecución
de publicación acreditada. Sus cierres anteriores describen ciclos probados,
no garantizan disponibilidad continua. Registrar y resolver estas ejecuciones
en O11/O13 después del bloque rápido; no repetir ingestas masivas para
comprobarlas. Detalle y límites en `etl-closure.md`.

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

## O05 · Costes y respaldo existente · S · 100 %

- [x] Confirmar que el calendario no genera nueva copia completa ni backup D1; verificar sólo el respaldo existente.
- [x] Medir bytes, objetos, operaciones Clase A/B y uso facturable de **toda la cuenta**, incluidos backups, en el panel del ciclo actual.
- [x] Adaptar la guarda para no pedir permiso/token Analytics: almacenamiento automático y estimación/cap por publicación en PR #671.
- [x] Registrar el snapshot del panel, el respaldo existente y el límite de la estimación por ETL en `evidence.md`.
- [x] Pasar CI y el preflight remoto de sólo lectura con las credenciales R2 actuales; integrar #671 con controles verdes (merge `33e7cb4b`).

Límite operativo: el acumulado mensual de operaciones se verifica manualmente
en el panel antes de cargas grandes/históricas; la estimación no lo reemplaza.
No crear tokens, copias nuevas ni cargas históricas.

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

## O10 · Monitor diario · S · 90 %

- [x] Agrupación de incidentes del smoke existente, recordatorio semanal y
  recuperación sólo tras controles correctos; 11 pruebas, tipos y lint locales.
  PR #685 y ejecución real 36939508453 verdes: 12 rutas comprobadas, 42 alertas
  antiguas cerradas sólo tras recuperación. Runbook en `docs/operations/uptime-incidents-20261001.md`.
- [x] Control acotado de calendario mediante metadatos GitHub (33 lecturas),
  sin extracción ni datos R2/D1; 7 pruebas. CI y ejecución real 36956479341 aprobadas; calendario diario activo.
  No equivale a frescura del release; evidencia en `docs/operations/etl-calendar-monitor-20261001.md`.

- [x] Comparar pin estático R2/Pages por checksum y ID, sin filas; replay de errores y ejecución real 37054632539 verde. PR #695; 26 pruebas. Incidente por divergencia agrupado con recordatorio semanal y recuperación verificada.
- [x] Añadir frescura por fuente desde `/api/v1/sources?r2Only=1`, estado de API y paridad del release Ley 19.862 con `/api/v1/health`; cualquier metadato ausente queda `unknown`, nunca sano. Sin fallback D1.
- [x] Añadir presupuesto R2 de sólo lectura reutilizando la credencial existente; sin Analytics token, sin D1, ETL, escrituras ni cambios de release. Coste mensual acumulado sigue siendo comprobación manual en el panel.
- [x] Integrar el resumen diario y agrupación de incidentes por `/api/v1/sources` y presupuesto. 64 pruebas focales, typecheck front/Worker y lint aprobados; producción consultada en modo lectura. Ejecución del workflow tras el merge pendiente; los estados `stale`/`unknown` detectados no se disfrazan como salud.

## O11 · Fuentes pequeñas y bloqueadas · M por fuente · 0 %

Subtareas comprobadas al 2026-10-02: personal de apoyo Senado, ciclo 2026 cerrado (4/4, cuota confirmada por Jorge); Cámara 1/4, `degraded_external`. Guardas compartidas cerradas en PR #687. El porcentaje de O11 completo permanece pendiente de las otras fuentes. Evidencia en `docs/operations/personal-apoyo-source-guards-20261002.md`.

Votaciones Senado (local-only): ejecución programada del 10-10-2026 a las
10:07 CL, tarea `Ready`, resultado 0. Consultó sesiones 07–10 oct, hidrató el
snapshot vigente desde R2, encontró 0 votaciones nuevas/0 errores y no publicó
ni alteró R2/D1. Log y alcance de esta ejecución en `evidence.md` (10-10-2026).
Queda cerrado el funcionamiento del ejecutor local para este corte; no equivale
a que Senado haya publicado votaciones nuevas ni certifica cobertura histórica.
Próxima tarea: 11-10 a las 09:30 CL. O11 global sigue abierto hasta cerrar las
otras fuentes.

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
