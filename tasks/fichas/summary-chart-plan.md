# Resumen: barras mensuales de gastos y apoyo — 19-11-2026

Base d45a6829, origin/main 39cc06d0 obtenido; rama codex/dashboard-parlamentario-local-20261119. Sólo local.

Añadir barras agrupadas por mes al Resumen de ambas cámaras. Consumir mesesCosto ya calculado por la ficha, sin lecturas adicionales, ETL ni totales nuevos. Dos series independientes (gastos/personas de apoyo), misma escala CLP, meses desde 2026 con al menos un importe. Conservar cero publicado, ausencia y ajustes negativos. Leyenda, importes exactos accesibles y acceso a los apartados existentes; vista móvil desplazable y sin ocultar la navegación sticky.

Archivos: componente/CSS propios AuthorityMonthlyOverview, helper puro y pruebas de períodos; AuthorityProfileSummary recibe los meses; page.tsx sólo pasa la proyección existente. Verificar ambas cámaras, escritorio/móvil, tres temas, importes de las fichas y ausencia de regresiones. Sin publicación.

Resultado: implementado y validado; ver summary-chart-evidence.md.
