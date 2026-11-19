# Votaciones y Partidos

## Contrato y responsabilidad

La tarea Senado fallaba por configuración/ruta; comprobar ejecución real. No alterar la afiliación histórica de un voto según la nómina actual. Landing conserva diseño y muestra fechas reales de ambas cámaras.

## Origen, ejecución y artefactos

Ejecutores: etl-camara-votaciones.yml; tarea Windows etl-senado-votaciones-runtime.mjs; publish-senado-projection.yml manual.

Artefactos: data/politicos-votaciones.json y slices parlamentarios; cohesión de bancadas.

El calendario remoto canónico es .github/etl-calendar.json. Las rutas locales son relativas a cambiometro-public/transparencia-app; no instalar tareas desde worktrees. Verificar el corte del manifiesto publicado antes de usar copias locales.

## Verificación y recuperación

Desde transparencia-app: npm run check:votaciones-destacadas; node scripts/etl-senado-votaciones-runtime.mjs --prepare-only; --dry-run consulta origen sin publicar.

Si el origen falla o se reduce la cobertura sin justificación, detener la publicación y conservar el último release válido. Registrar fallo, período, checksum y próxima acción en tasks/votaciones/evidence.md. No reactivar módulos secundarios como dependencia incidental. La recuperación de interfaz usa el artefacto previo; la de datos usa el release previamente validado.

## Archivos compartidos

Cualquier cambio de esquema, generador de slices, navegación global o release-set debe coordinarse con el integrador y sus consumidores. Consultar AGENTS.md antes de editar.

## Estabilización local — 18-11-2026

[Plan coordinado](../../../tasks/votaciones/plan.md), [evidencia](../../../tasks/votaciones/evidence.md) y [pendientes](../../../tasks/votaciones/todo.md). Las afiliaciones históricas se resuelven por fecha; un dato desconocido no se etiqueta como independiente. Las muestras incompletas/ambiguas y los agregados sin cobertura permanecen fuera de cálculo o en revisión. No se reactivaron indicadores.

Las tarjetas conservan el corte ante respuestas antiguas y se validan con el resultado oficial. Guard y pruebas dirigidas son locales; no hace falta ejecutar ETL o construir Pages para cada ajuste. La captura publicada guardada no sustituye una verificación del release vigente en la futura entrega agrupada.

## Navegación modular desde 2026 — 19-11-2026

Ruta principal /votaciones; cinco módulos, /votaciones-destacadas conservado. Ver [plan](../../../tasks/votaciones/modulos-2026-plan.md), [evidencia](../../../tasks/votaciones/modulos-2026-evidence.md) y [tareas por módulo](../../../tasks/votaciones/modulos/). Cuatro vistas exploran registros incorporados y Comisiones muestra cobertura pendiente. Asistencia se retira. No confundir el campo sessions (votaciones) con sesiones parlamentarias. Preparado en local, sin ETL o publicación nueva.

## Renovación local — 19-11-2026

El explorador adapta la lectura de social/Publicaciones/Votaciones (proyectos, materias, contadores y detalle) al sitio. Usa /api/v1/records con source=votaciones_camara o votaciones_senado, kind=vote y fechas ISO completas; consulta 2026 entero mediante cursores. El parámetro component de la app editorial no acota el listado R2 general de Cámara: sin kind se mezclan asistencias. No copiar ese total ni convertirlo en votos. El adaptador rechaza cualquier registro kind distinto de vote.

Legisladores enlaza /votaciones/legisladores/[slug], expediente nominal dedicado; genera 205 rutas estáticas. Sesiones/jornadas despliega sus decisiones dentro del sitio. Un identificador de sesión exige respaldo del origen. Ambas cámaras concilian por registro nombres únicos, opciones conocidas y totales antes de mostrar nominales; no se atribuyen votos a partir del padrón. El catálogo integral de la API y el nominal estático de fichas son conjuntos distintos. La captura de referencia de 2026 informa 1.721 votos de Cámara y 504 del Senado, no 19.697 votos de Cámara. Son registros disponibles, no certificación de completitud nacional.

Ver tasks/votaciones/explorador-editorial-evidence.md para alcance y pruebas. No publicado.

En local y Pages preview, VotingExplorer reutiliza publicApiUrl para consultar el R2 publicado mediante la API; no intenta /api relativo en un Next estático sin Worker. Verificado sin mocks, incluyendo enero/febrero de 2026.

## Detalle lateral y nominales — 19-11-2026

Panel de altura completa anclado a la derecha, búsqueda y filtros por opción en ambas cámaras. La revisión de Cámara 91584 contra retornarVotacionDetalle corrigió el bloqueo general previo. Ver tasks/votaciones/panel-nominal-plan.md y panel-nominal-evidence.md. La conciliación verifica consistencia del registro publicado, no una validación biográfica de cada nombre ni completitud nacional. Sin ETL, reactivaciones o cambios de datos remotos.

## Resolución del nominal sin repetir ETL — 19-11-2026

La automatización existente ya resuelve las identidades de diputados por data/diputados-ids.json en ingest-votaciones-full.mjs. El nuevo explorador consumía nombres crudos del lake sin ese paso. Se reutiliza el mismo mapa DIPID en el consumidor; no se cambia el extractor, cron, votos, partidos históricos ni datos R2. El nominal de Cámara 91584 queda visible con 155 identidades únicas y 135 votos emitidos conciliados; esos 135 ID/opción y las identidades disponibles coinciden con el HTML oficial. La etiqueta Sin voto emitido no acredita ausencia ni descarta pareo. El bloqueo documentado antes queda resuelto en el consumidor; no iniciar un backfill por esa nota histórica. Ver tasks/votaciones/reparacion-publicacion-evidence.md.
