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

## Experiencia ciudadana — 22-11-2026

Renovación local sobre el mismo catálogo y API, sin cambios en ETL, calendario, almacenamiento o publicación. [Especificación](../../../tasks/votaciones/especificacion-renovacion-20261122.md), [tarea y aceptación](../../../tasks/votaciones/renovacion-ciudadana-20261122.md). Cinco accesos principales: Inicio, Proyectos y votaciones, Parlamentarios, Comisiones, Aprende. Sesiones conserva /votaciones/sesiones como contexto. Legisladores conserva su URL y 205 expedientes dedicados; las fichas de proyecto se exportan por boletín existente.

El adaptador de presentación agrupa exclusivamente por boletín válido o conserva una decisión independiente. Reutiliza título explícito, contexto oficial verificado y materia descriptiva publicada del mismo proyecto, antes de recurrir a un identificador neutral. Nunca convierte un resultado en estado del proyecto. Los campos opcionales de título/estado/trámite/documentos se leen si están publicados; no se fabrican estados o relaciones. La búsqueda distingue texto, boletín, persona y fecha. Los alias públicos se comparan por cámara y prefijos conocidos sin cambiar IDs originales.

VotingPanel es un diálogo nativo reutilizable para proyecto, decisión, nominal, sesión, comisión y guía; conserva filtro/scroll/foco, Escape y cierre exterior. El móvil utiliza panel inferior. VotingPerson reutiliza fotos y logos, con iniciales neutras ante ausencia/error. La foto se asocia sólo por ID de la misma institución o nombre completo único; no por coincidencia parcial. La militancia fechada requiere fechas válidas; de lo contrario se identifica la referencia actual.

El lector mantiene /api/v1/records, source, kind=vote, fechas y cursores existentes. Las páginas remotas usan lotes de 48 y carga progresiva explícita; no se elimina ningún resultado. Los filtros de detalle son locales. La caché de consulta es acotada a cuatro selecciones y expira al minuto, sin temporizador ni consultas nuevas en reposo. No hay endpoints nuevos, D1 nuevo ni procesos por interacción. La captura estática usada en revisión es la proyección publicada ya verificada; una consulta remota fallida identifica la copia de referencia.

### Contexto adicional de comisiones

No había una proyección de comisiones incorporada. Se añadieron directorio, integrantes y sesiones de Cámara mediante GET de WSComision, sin extraer nuevamente votos. La captura del 22-11 contiene 41 comisiones, 583 pertenencias publicadas (no personas únicas) y 1.135 registros de sesiones de 2026. Se conserva el estado literal; no se usa para asistencia/productividad ni se da por celebrada una citación. No se publican RUT, correos, teléfonos ni asistencias.

La respuesta no incorpora materias, acuerdos, informes ni relaciones explícitas con proyectos. El directorio del Senado respondió 403; su cobertura permanece pendiente y el acceso oficial está en Fuentes. Estas limitaciones no impiden navegar el resto de Votaciones. No se atribuyen comisiones por similitud de nombres o por una votación de Sala.

Actualización de ese contexto adicional: desde transparencia-app, `python scripts/capture-voting-commissions.py --year 2026 --reviewed-at AAAA-MM-DD`. Produce candidato y recibo en artifacts/voting-commissions/2026/AAAA-MM-DD; conserva las demás referencias del catálogo. Revisar candidato/fechas/diferencias antes de repetir con --write. Se puede indicar --cache-dir para reproducir respuestas ya verificadas, conservando su fecha real; una fecha nueva usa otra carpeta para no rotular datos antiguos como una captura nueva. Es una herramienta manual, sin cron; las actualizaciones automáticas de votos conservan su mecanismo. Si falla, mantener el último contexto revisado. No añadir un cron incidental.

Aprende utiliza explicaciones breves basadas en BCN y Formación de la Ley de Cámara, citadas en su panel documental; es un esquema general que distingue etapas, decisiones y vigencia. No representa predicciones ni porcentajes de tramitación.

Pruebas adicionales: voting-presentation.test.ts, voting-context.test.ts, verify-voting-experience.mjs. Recuperación de interfaz/contexto: revertir los commits de esta entrega conservando el release publicado; no repetir ETL. Publicación futura mediante el flujo existente, con R2 vigente y artefacto verificado; no desde el árbol de desarrollo.
