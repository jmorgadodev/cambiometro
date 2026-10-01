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

## O03 · Registro de fuentes · S · 0 %

- [ ] Reconciliar calendario con workflows, modo, frecuencia y fuente efectiva (URL/API/documento); incluir Senado local-only.
- [ ] Asociar por fuente ventana extraída, manifiesto R2, release, checksum, períodos y alcance o marcar «no medido».
- [ ] Generar matriz reproducible y probar faltantes/duplicados sin descargar universos.
- [ ] Validar contra manifiestos productivos y fusionar sin alterar datos públicos.

## O04 · Contadores públicos por release · S · 0 %

- [ ] Identificar todos los literales de conteo/frescura en Fuentes y su unidad.
- [ ] Sustituirlos por metadatos verificados, con estados «parcial»/«no medido».
- [ ] Probar discrepancias de corte, nulos y ausencia de manifiesto.
- [ ] Preview, promoción y comparación con API/manifiesto productivo.

## O05 · Costo cero y respaldo existente · S · 50 %

- [x] Confirmar que el calendario no genera nueva copia completa ni backup D1; verificar sólo el respaldo existente.
- [x] Medir bytes, objetos, operaciones Clase A/B y uso facturable de **toda la cuenta**, incluidos backups, en el ciclo actual.
- [ ] Probar sin escrituras un preflight que bloquee si falta telemetría o hay riesgo de superar cualquier margen gratuito.
- [ ] Publicar informe fechado de costo cero verificable, protección existente y presupuesto por publicación.

## O06 · Piloto ETL Movimientos · M · 0 %

- [ ] Preparar candidato aislado desde release R2; distinguir sin cambios y fallo externo.
- [ ] Probar cero inesperado, descenso, anuncio contabilizado y confirmación sobre el mismo ID.
- [ ] Ensayar replay acotado; ningún no-op dispara publicación Pages.
- [ ] Promover sólo con pruebas verdes y verificar cronología/rollback.

## O07 · Contrato ETL reutilizable · M · 0 %

- [ ] Extraer guardas comunes sin duplicar la lógica existente de cada fuente.
- [ ] Cubrir checksum, períodos, identidad, duplicados, descenso y presupuesto.
- [ ] Pruebas contractuales: caída externa, cero, candidato parcial y rollback.
- [ ] Migrar una segunda fuente pequeña y verificar promoción aislada.

## O08 · `ReleaseSet` R2 · M · 0 %

- [ ] Definir esquema versionado de IDs/checksums/conteos por dominio y puntero atómico.
- [ ] Construirlo desde releases existentes, sin alterar historiales ni D1.
- [ ] Probar dos ETL concurrentes, checksum incorrecto y `ui-only` sin retroceso.
- [ ] Pages fija ese `ReleaseSet`; preview y producción concuerdan.

## O09 · Promoción Pages coherente · M · 0 %

- [ ] Separar y documentar disparos `ui-only`, `data-refresh` y promoción.
- [ ] Un bloqueo global impide promociones solapadas; fallos/no-op no despliegan.
- [ ] Artefacto incluye evidencia de releases y smoke de rutas, búsqueda y conteos.
- [ ] Promover y registrar deployment, rollback y verificación productiva.

## O10 · Monitor diario · M · 0 %

- [ ] Leer calendario, estado de candidato/release, R2/API/Pages y presupuesto sin extraer universos.
- [ ] Clasificar `healthy`, `degraded_external`, `stale`, `failed_internal`, `paused_local_only`.
- [ ] Alertar por transición/umbral; agrupar fallos repetidos y recordar semanalmente.
- [ ] Replay de estados, ejecución diaria verde y documentación de respuesta.

## O11 · Fuentes pequeñas y bloqueadas · M por fuente · 0 %

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
