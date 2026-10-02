# Tablero de puertas verificables

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

## O07 · Contrato ETL reutilizable · M · 100 %

- [x] Extraer guardas comunes sin duplicar la lógica existente de cada fuente.
- [x] Cubrir checksum, períodos, identidad, duplicados, descenso y presupuesto.
- [x] Pruebas contractuales: caída externa, cero, candidato parcial y rollback.
- [x] Migrar preflight Cámara y verificar catálogo candidato aislado mediante replay local, sin publicación R2. PR #679 integrado con CI verde.

## O08 · `ReleaseSet` R2 · M · 50 %

- [x] Contrato local de inputs estáticos: huellas por dominio, checksum y pin de manifiesto;
  conteos ausentes quedan nulos. Prueba de base concurrente obsoleta y candidato combinado.
- [ ] Implementar comparación y promoción atómica remota; el contrato local no la sustituye.
- [x] Añadir pin de inputs estáticos, verificación de bytes y metadatos al artefacto Pages.
- [x] Integración estática validada en CI, preview y producción (PR #683, promoción 36934573710).
- [ ] Validar integración en preview y abarcar manifiestos externos al conjunto estático.

- [ ] Definir esquema versionado de IDs/checksums/conteos por dominio y puntero atómico.
- [ ] Construirlo desde releases existentes, sin alterar historiales ni D1.
- [ ] Probar dos ETL concurrentes, checksum incorrecto y `ui-only` sin retroceso.
- [ ] Pages fija ese `ReleaseSet`; preview y producción concuerdan.

## O09 · Promoción Pages coherente · M · 50 %

- [x] Implementar bloqueo compartido para tres flujos Pages y publicadores estáticos,
  sin cancelación del activo y con `queue: max`; 19 pruebas de configuración.
- [x] Añadir rechazo de artefacto con pin estático distinto del manifiesto R2 actual.
- [x] Verificar estos cambios en CI/preview y producción; no equivalen a CAS remoto.

- [ ] Separar y documentar disparos `ui-only`, `data-refresh` y promoción.
- [ ] Un bloqueo global impide promociones solapadas; fallos/no-op no despliegan.
- [ ] Artefacto incluye evidencia de releases y smoke de rutas, búsqueda y conteos.
- [ ] Promover y registrar deployment, rollback y verificación productiva.

## O10 · Monitor diario · M · 50 %

- [x] Agrupación de incidentes del smoke existente, recordatorio semanal y
  recuperación sólo tras controles correctos; 11 pruebas, tipos y lint locales.
  PR #685 y ejecución real 36939508453 verdes: 12 rutas comprobadas, 42 alertas
  antiguas cerradas sólo tras recuperación. Runbook en `docs/operations/uptime-incidents-20261001.md`.
- [x] Control acotado de calendario mediante metadatos GitHub (33 lecturas),
  sin extracción ni datos R2/D1; 7 pruebas. CI y activación diaria pendientes.
  No equivale a frescura del release; evidencia en `docs/operations/etl-calendar-monitor-20261001.md`.

- [ ] Leer calendario, estado de candidato/release, R2/API/Pages y presupuesto sin extraer universos.
- [ ] Clasificar `healthy`, `degraded_external`, `stale`, `failed_internal`, `paused_local_only`.
- [ ] Alertar por transición/umbral; agrupar fallos repetidos y recordar semanalmente.
- [ ] Replay de estados, ejecución diaria verde y documentación de respuesta.

## O11 · Fuentes pequeñas y bloqueadas · M por fuente · 0 %

Subtareas comprobadas al 2026-10-02: personal de apoyo Senado, ciclo 2026 cerrado (4/4, cuota confirmada por Jorge); Cámara 1/4, `degraded_external`. Guardas compartidas cerradas en PR #687. El porcentaje de O11 completo permanece pendiente de las otras fuentes. Evidencia en `docs/operations/personal-apoyo-source-guards-20261002.md`.

- [ ] Dividir por fuente y registrar procedencia efectiva, ventana, modo/frescura; Senado votaciones es local-only.
- [ ] Migrar fuentes pequeñas con prueba de fallo externo y último release preservado.
- [ ] Tratar Cámara personal de apoyo y Senado sin convertir 403 en cero.
- [ ] Verificar API, página y rollbacks individuales antes de cerrar cada fuente.

## O12 · Gastos parlamentarios · M · 0 %

- [ ] Cotejar meses y checksums declarados por Cámara/Senado con navegación.
- [ ] Conservar nulo/no informado distinto de cero y seleccionar último corte.
- [ ] Probar replay mensual y reducción inesperada sin D1 masiva.
- [ ] Promoción y smoke de fichas, API y manifiesto.

## O13 · Remuneraciones · M por componente · 0 %

- [ ] Dividir municipal, central, 38 bis y apoyo parlamentario; fijar cortes/unidades.
- [ ] Probar guardas y búsquedas indexadas sin barridos D1 ni fusión nominal.
- [ ] Comparar conteos, checksum e índices por organismo/período en preview.
- [ ] Promover cada componente por separado y verificar fichas y búsqueda.

## O14 · Rollback sin nueva copia · M · 0 %

- [ ] Identificar release vigente y anterior con checksum; inventariar respaldo ya existente sin borrar ni copiar.
- [ ] Ensayar rollback del puntero de release en entorno aislado, sin escritura R2 productiva.
- [ ] Verificar muestra del respaldo existente de forma acotada y medir lecturas/coste proyectado.
- [ ] Documentar recuperación reproducible; nueva copia o cambio de retención requiere decisión aparte.

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
