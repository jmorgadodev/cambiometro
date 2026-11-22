# Votaciones: experiencia ciudadana — 22-11-2026

Base local 74ac325d, origin/main 0cae8e73 obtenido; rama codex/votaciones-experiencia-20261122. Dashboard terminado. Sin publicación remota.

Alcance: proyección y presentación puntual de los campos existentes; portada/buscador, lista agrupada por boletín acreditado, detalle/proyecto y tramitación, parlamentarios con fotos/logos e historial, panel derecho compartido, comisiones con cobertura explícita y Aprende. Conservar URLs, identificadores, resultados, votos, cron/ETL/API/almacenamiento/publicación. No inferir ley aprobada, ausencia o afiliación histórica de datos actuales.

Archivos: components/votaciones/, lib/voting-*, app/votaciones/, pruebas y documentación del módulo. Mantener globals/package/workflows sin cambios. Contratos nuevos son auxiliares de presentación, compatibles con ExplorerVote. Integración coordinada en esta rama y pruebas de consumidores existentes.

Entregas: (1) títulos/relaciones y pruebas; (2) listas, navegación e identidades; (3) panel, historial y nominal; (4) comisiones verificadas sin bloquear Senado; (5) educación; (6) validación integrada, rendimiento/SEO/accesibilidad, capturas y guía de revisión. No repetir extracción de votos ni auditoría general.

Fuentes: reutilizar cachés publicadas fijadas por checksums y API existente. Comisiones no cuenta con proyección incorporada: consultar el servicio oficial sólo para incorporar contexto ausente, sin cron nuevo. Si un campo/estado no existe, mostrar alcance breve en el contexto documental, sin inventarlo.

Aceptación: búsqueda por título/boletín/persona/fecha; agrupación exacta y conservación de decisiones; panel con Escape/exterior/foco/scroll/filtros; fotos y afiliación temporal correctas; estados sin inferencias; rutas antiguas; cobertura de ambas cámaras; pruebas del módulo, lint/tipos/suite/build al cierre; navegador real escritorio/móvil con capturas y solicitudes registradas. Comprobar invariantes de ETL/actualización por diff y hashes, sin ejecutar extracción ni afirmar una ejecución remota nueva.
