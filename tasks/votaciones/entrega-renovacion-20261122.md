# Votaciones — entrega local del 22-11-2026

## Resultado

Se implementó la experiencia sobre las conexiones y datos existentes. La landing general y el dashboard parlamentario conservan su diseño. Rama `codex/votaciones-experiencia-20261122`, base local `74ac325d`, origin/main obtenido `0cae8e73`. No se realizó push, PR, despliegue o activación de automatizaciones.

- Portada «¿Qué se votó en el Congreso?», buscador principal y tres accesos claros.
- Navegación: Inicio, Proyectos y votaciones, Parlamentarios, Comisiones y Aprende. Sesiones permanece accesible como contexto en su URL anterior.
- Listas compactas, superficies marfil, cabecera petróleo, turquesa, detalle ocre y resultados con salvia/arcilla. Sin cambios globales de estilos.
- Búsqueda por proyecto/título recuperado, materia, boletín, parlamentario y fecha; institución y rango desde 2026. Las fechas permanecen juntas en móvil.
- Un proyecto agrupa sus decisiones sólo por boletín acreditado. Sin boletín válido, cada decisión conserva su identidad; no se agrupa por semejanza textual. La recuperación de un boletín desde texto requiere su denominación explícita.
- Títulos expresos, materia descriptiva publicada del mismo proyecto y referencia oficial verificada tienen prioridad sobre el identificador neutral. El título oficial de Presupuestos 2027 se vincula expresamente al Boletín 18702-05. No se inventan títulos para los demás casos.
- Proyecto: decisiones, instituciones, último registro y estado/etapa cuando estén expresamente publicados. Se distingue el resultado de una decisión del estado del proyecto. No se infiere que una indicación rechazada rechace todo el proyecto ni que una aprobación produzca automáticamente una ley.
- «¿Qué pasó y qué sigue?» ofrece hechos fechados y explicación general condicional de la etapa; sin porcentaje de avance o predicciones. Los estados ausentes permanecen sin completar.
- Fichas permanentes e indexables de proyectos por boletín, con título, metadescripción y canonical; los expedientes de los 205 parlamentarios conservan sus URLs.
- Nominales: búsqueda por nombre/apellido, opciones publicadas y páginas de 24 registros, fotos/logos existentes y acceso a historial. Los textos largos se abrevian con elipsis para la lectura inicial y conservan su descripción original consultable.
- Fichas permanentes e historial individual consultan el nominal cuando el usuario abre una decisión, mediante la misma API de registros y sólo el día/institución correspondiente. Se comparan alias públicos sin alterar IDs originales. No se atribuyen votos desde el padrón.
- El detalle seleccionado se actualiza cuando llega la consulta publicada, también si se abre antes de terminar la carga. No conserva indefinidamente un objeto de la copia inicial.
- Panel derecho reutilizable, cierre visible/exterior/Escape, foco y posición preservados. En móvil se convierte en panel inferior. Fuentes y documentos originales se abren desde su contexto, en otra pestaña con noopener; los listados conservan la pantalla y los filtros.
- Decisiones de un proyecto: búsqueda local y páginas de 20, tanto en el panel como en la ficha permanente. Cronología y lista de decisiones se consultan por separado para evitar duplicación visual.
- Guía progresiva «Entiende cómo vota el Congreso»: cinco etapas y diez conceptos; fuentes BCN/Cámara disponibles en el panel documental.

## Datos reutilizados e integraciones puntuales

Votos: /api/v1/records con los mismos source, kind=vote, fechas y cursores, el mismo resolvedor DIPID y validación nominal existente. Proyección estática publicada ya verificada: `artifacts/votaciones-modulos/published-votes.json`, 1.981 decisiones; checksum registrado en el recibo de esta entrega. La consulta integral añade el alcance de 2026 disponible en la API, incluidos períodos fuera de la proyección estática. No se volvió a extraer ni publicar una votación. En esas 1.981 decisiones hay 1.536 referencias de boletín y 1.068 enlaces de tramitación; no hay campos poblados de título oficial de proyecto, estado, etapa o informe. La proyección recupera también materias descriptivas publicadas bajo el tipo genérico «Votación en sala» y las identifica como materia, sin convertirlas en títulos oficiales. Los documentos se buscan en todas las decisiones del mismo proyecto, no únicamente en la más reciente.

Nombres, fotografías y partidos: catálogo parlamentario existente y fotografías verificadas de la web. La asociación visual exige ID de la misma institución o nombre completo único; no se usa coincidencia parcial. Las identidades fuera del catálogo conservan nombre y reemplazo neutro. La revisión visual detectó un archivo de fachada entre los recursos heredados: se excluye ese activo únicamente en la proyección de Votaciones y se utiliza un marcador neutro. No se reasigna un rostro ni se cambia el catálogo global o la identidad. Una imagen que falla también usa reemplazo neutro. Las militancias requieren fechas válidas; si no hay afiliación acreditada para el voto, se identifica la referencia actual del catálogo.

Contexto y presupuesto: no se modifican datos financieros ni contratos del dashboard. El build reutiliza los mismos cuatro insumos financieros publicados y regenera offline sus particiones mensuales para conservar los períodos. Los cinco insumos temporales y los archivos mensuales originales se restauran por checksum al terminar. El artefacto local conserva los insumos publicados.

### Comisiones

No había una proyección incorporada. La adición está limitada a GET de WSComision de Cámara: retornarComisionesVigentes, retornarComision y retornarSesionesXComisionYAnno. Se incorporaron **41 comisiones, 583 pertenencias publicadas y 1.135 registros de sesiones de 2026**. Las pertenencias no representan personas únicas. No se publican RUT, correos, teléfonos ni asistencias.

La proyección se reprodujo exactamente desde las **83 respuestas oficiales conservadas**, sin nuevas solicitudes de extracción. El script manual genera candidato y recibo; no escribe el contexto salvo --write. Si una consulta falla, mantiene los datos anteriores y evita escribir un candidato parcial. El caché predeterminado se separa por año y fecha para no marcar datos antiguos como una consulta nueva. No tiene cron ni altera la actualización de votos.

Limitaciones concretas:

- Senado: el directorio oficial respondió 403; no se incorporaron integrantes sin respaldo.
- La respuesta de comisiones consultada no incorpora materias, acuerdos, informes ni relaciones proyecto-comisión. Esos campos permanecen limitados; no se inventan vínculos por nombre, tema o votación de Sala.
- Se conserva el estado original de cada registro de sesión. No se confunde una citación con una sesión celebrada o con una votación; no hay indicadores de productividad/asistencia.
- Muchos registros de voto no traen título oficial completo, estado de proyecto o etapa. Se presenta la materia disponible o un identificador neutral. Esto no se resuelve reconstruyendo los ETL durante una renovación de interfaz.
- Las fichas permanentes corresponden al corte estático incorporado. Un boletín adicional de la API se abre en el panel sin enlazar a una ficha estática inexistente.
- Los nominales incompletos, repetidos o incompatibles con los totales conservan la condición de revisión; una ausencia de registro no se transforma en inasistencia.

## Archivos y componentes principales

| Archivo / componente | Función |
|---|---|
| app/votaciones/ | Portada, módulos, expedientes y nuevas fichas de proyecto con SEO |
| lib/voting-workspace-source.ts | Lectura server-only y caché por versión de archivo; proyección de los campos existentes |
| lib/voting-presentation.ts | Grupos exactos, búsqueda, alias, contexto de etapas y referencia temporal de afiliación |
| components/votaciones/VotingWorkspace.tsx | Contenedor, cabecera y navegación del apartado |
| components/votaciones/VotingExplorer.tsx | Consulta, filtros compartibles, asuntos, sesiones y selección contextual |
| components/votaciones/useVotingCatalog.ts | Lectura API existente, cursores, cancelación, reintento y caché acotada |
| VotingPanel / VotingOfficialSource | Panel nativo reutilizable y documentos originales dentro del contexto solicitado |
| VotingPerson / VotingPeople / VotingHistory | Identidad visual, directorio e historial dedicado |
| VoteDetail / VotingProjectDetail / VotingProjectArticle | Decisión, nominal, cronología y ficha permanente |
| VotingCommissions / VotingLearn | Directorio y guía progresiva |
| data/voting-context.json | Contexto oficial adicional, fechado y revisado |
| scripts/capture-voting-commissions.py | Actualización manual del contexto, sin cron ni escritura remota |
| scripts/verify-voting-experience.mjs | Recorridos reales de navegador y accesibilidad |
| scripts/measure-voting-performance.mjs | Comparación local reproducible mediante CDP |

No se cambiaron package.json, globals.css, almacenamiento, API de producción, conectores, normalizadores ETL ni workflows. Los cambios de contrato son campos auxiliares opcionales de presentación; se conservan identificadores, opciones y valores originales.

## Rendimiento y costo operacional

La portada recibe sólo el contexto que utiliza; el directorio de comisiones se envía en su apartado. Las fotos se cargan de forma diferida. Los listados nominales y de decisiones se paginan. La API conserva su endpoint y consulta por cursores, con lotes de 48; no se descarga todo 2026 automáticamente. La navegación del panel y sus filtros son locales. La caché conserva hasta cuatro selecciones y vence al minuto, sin consultas periódicas en reposo. Un detalle estático obtiene el nominal al solicitarlo, no de forma anticipada.

No se añadieron Workers, bases de datos, almacenamiento contratado o servicios de pago. Comparación reproducible de la carga inicial del inicio (bytes transferidos, incluidas cabeceras):

| Medida | Base anterior | Entrega local |
|---|---:|---:|
| Artefacto local | 462,817 | 532,925 |
| API publicada | 110,571 | 49,477 |
| Total | 573,388 | 582,402 |
| Consultas API iniciales | 2 | 2 |

La transferencia total aumenta **1.57%** con los nuevos módulos. La carga API baja **55.3%** al usar lotes más pequeños. No se presenta como una reducción global de transferencia. El catálogo remoto puede cambiar entre capturas. Los resultados y las solicitudes están en el recibo final. Las medidas usan el mismo servidor estático, CSP, navegador nuevo y Brotli 4; no son una medición de CDN, facturación o usuarios reales.

## Actualizaciones existentes: comprobación de lectura

- Cámara: [última ejecución consultada](https://github.com/jmorgadodev/cambiometro/actions/runs/45037205535), creada el 22-11-2026 a las 15:14 UTC, completed/success.
- Senado: tarea Windows activa/Ready, carpeta canónica, última ejecución **22-11-2026 09:30 -03:00**, **resultado 1**. Próxima: 23-11-2026 09:30 -03:00. La incidencia no se presenta como ejecución sana.
- No se encontró un registro de detalle accesible en la ubicación del ejecutor durante esta comprobación acotada. La causa queda sin confirmar. No se relanzó ETL, modificó programación, renovó credenciales o publicó datos.
- Los ejecutores/configuraciones se comparan contra la base de la entrega; permanecen intactos. La interfaz sigue consultando el último catálogo publicado. El fallo operativo de Senado requiere un diagnóstico separado y no se da por resuelto por el éxito de la web.

## Verificación, revisión y publicación

Suite final sobre los insumos originales restaurados: **342 archivos / 2.197 pruebas aprobadas**. Regresión del módulo: **39 pruebas**. Lint global: cero errores y 189 advertencias heredadas; lint de los últimos archivos modificados: cero errores. Tipos y build Pages aprobados: **5.104 páginas**, incluidas **217 fichas de proyecto** y **205 expedientes parlamentarios**. El artefacto del código `e63c0113` pasó **54 comprobaciones reales de navegador**, sin excepciones JavaScript ni fallos de API, incluyendo accesibilidad, nominales de ambas cámaras, búsquedas, URL compartible, panel/foco/scroll y tamaños 320/390/768 px. Los checksums verifican los cinco insumos temporales restaurados, 179 archivos mensuales, el bootstrap financiero y sus 41 particiones sin cambios.

Servidor local levantado para revisión: http://127.0.0.1:3201/votaciones/; proyectos, legisladores, comisiones, sesiones y Aprende cuelgan de esa ruta. Datos del proyecto de ejemplo: /votaciones/proyectos/18702-05/.

Commits: `16794948` contexto de comisiones; `3da6c2dc` nueva experiencia; `3fe3bc27` nominal en fichas permanentes, paginación y relación textual explícita. `902d2cdf` conserva los documentos al combinar decisiones; `d8d7cf97` recupera materias bajo el tipo genérico. `10f0c699` sustituye el activo no retrato por un marcador neutro. `e63c0113` actualiza la selección cuando llega la consulta publicada y comparte la recuperación nominal en todos los accesos al detalle. Los commits documentales posteriores no alteran el código del artefacto.

Recuperación local: revertir los commits de esta entrega conservando los releases; no repetir ETL ni sobrescribir R2. Para publicación posterior, usar el flujo UI-only ya documentado con release vigente de R2, preview y SHA/release-set verificables; promover el mismo artefacto y conservar rollback. Esta entrega no autoriza publicar ni promueve el directorio de desarrollo.

**Validación final:** [recibo con checksums, comprobaciones y fuentes](renovacion-validacion-20261122.json). Diez capturas del artefacto final en `transparencia-app/artifacts/voting-renewal/screenshots/`: inicio escritorio/móvil, proyecto/tramitación, nominal diputados/móvil/Senado, búsqueda parlamentaria, historial, comisión y Aprende. No contienen la interfaz de desarrollo de Next. Revisión visual del artefacto y marcador neutro comprobados.
