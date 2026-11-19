# Navegación y alcance de páginas

## Áreas activas

| Menú | Ruta | Trabajo del módulo |
|---|---|---|
| Cámara | /politico | Selector Diputados/Senado, directorio y fichas parlamentarias |
| Partidos | /partidos | Composición, bancadas y registros de votaciones |
| Votaciones | /votaciones | Módulos de consulta desde 2026; /votaciones-destacadas conserva el análisis previo |
| Movimientos | /movimientos | Cambios de autoridades y estado de confirmación |
| Metodología | /como-funciona | Procedimiento y límites de interpretación |

## Áreas aplazadas

El catálogo único de las catorce áreas es transparencia-app/config/construction-modules.json. Header, footer, avisos de construcción y generadores SEO consumen ese catálogo. Las URL y sus rutas profundas permanecen seleccionables con aviso, noindex y acceso a las cinco áreas activas. No se borran sus datasets ni APIs publicadas.

Gastos y remuneraciones generales están aplazados como páginas independientes. Gastos, dieta y apoyo de cada parlamentario permanecen activos dentro de su ficha y mantienen sus ETL. El dashboard general y las investigaciones son entregas posteriores; no se anuncian como funcionalidades terminadas.

Buscar, Fuentes, Calidad, Cambios (alias), Privacidad y Donar son utilidades de las áreas activas: se conservan. Las fichas parlamentarias y de partidos siguen bajo sus rutas actuales.

## Diseño y pruebas

Preservar hero, fotos, tipografías, colores, composición y movimiento de la landing productiva. Cambiar sólo enlaces y textos necesarios para reflejar el alcance real. Las cuatro tarjetas de preguntas mantienen diseño y pasan a Partidos, Votaciones, Movimientos y Metodología; el acceso territorial identifica construcción.

Los filtros de Cámara viven en la URL (cargo y q), admiten tildes y combinan búsqueda y cámara; una búsqueda nueva reinicia paginación. El export estático conserva listado SSR y usa Suspense para los filtros cliente. No depende de D1.

Verificación: npm test; npm run lint; build; verify:browser; verify:static:browser. Revisar menú móvil/desktop, teclado/Escape, URLs profundas y noindex. La preview UI-only hidrata R2 y conserva los períodos de Bianchi/Kaiser. Revisar artefacto antes de promoción; no publicar desde un árbol local modificado.

## Aclaración de alcance — 19-11-2026

Por instrucción expresa de Jorge, En construcción muestra aviso sobre el contenido existente; los layouts no descartan children. Se conservan páginas y rutas profundas, noindex y datos publicados. Las fuentes pausadas siguen pausadas. No sustituir una página avanzada por una pantalla de espera. Esta aclaración prevalece sobre descripciones anteriores de pantallas de construcción.

## Alcance actualizado por Jorge — 19-11-2026

Datos se incorpora a En construcción y conserva contenido/URLs. Menú activo: Cámara, Partidos, Votaciones, Movimientos y Metodología. Prevalece sobre el listado previo de seis áreas. Votaciones adopta la herramienta editorial como referencia de interacción, elimina Asistencia y consulta votos/sesiones dentro de la web. Plan coordinado: tasks/votaciones/explorador-editorial-plan.md.
