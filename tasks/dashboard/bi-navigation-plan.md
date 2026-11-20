# Dashboard · navegación y comparación BI — 19-11-2026

Base local 7bb0fc5a; origin/main 39cc06d0 obtenido. Incremento local en codex/dashboard-parlamentario-local-20261119; sin despliegue, extracción o cambios de datos remotos.

Entrega: filtros laterales plegables y resumen de selección siempre accesible; fechas juntas; listas con búsqueda y selección múltiple de partidos/parlamentarios, orden por apellido; componentes mediante botones/selección directa. Comparar por grupo y mes sin sumar componentes incompatibles. URL e historial conservan selecciones repetidas y admiten enlaces singulares anteriores. Partido de nómina vigente, sin afirmar afiliación histórica.

Cero de presentación solicitado: los importes vacíos se ven como $0 con estado visible de ausencia; no se reemplazan null, se fabrican pagos o se imputan dietas. CSV conserva estado y ausencia subyacente. Las tarjetas y vistas usan el mismo filtro.

Archivos propios: lib/parliamentary-dashboard*, components/dashboard/ParliamentaryDashboard*, nuevos componentes de filtros/comparación/gráfico y verificadores. El adaptador añade metadatos de partido del catálogo actual; sólo se regenera el bundle local desde copias verificadas y se comprueba que las filas financieras sean idénticas. Sin globals.css, package.json, ETL, API o workflows.

Referencias oficiales: https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-slicers (listas, botones, búsqueda, selecciones visibles) y https://help.tableau.com/current/pro/desktop/en-us/dashboards_create.htm (contenedores plegables y acciones de filtro).

Aceptar con multiselección OR dentro de partidos/personas y AND entre dimensiones, sin duplicados ni fuga de filtros; comparación y CSV coherentes, estado vacío, ocultar/mostrar sin perder filtro, teclado, móvil, tres temas y paridad de las dos fichas publicadas.

Resultado: implementación local completada; ver bi-navigation-evidence.md.
