# Gráficos interactivos — 19-11-2026

Base 3ec96562; origin/main 39cc06d0 obtenido; rama local vigente. Sin publicación ni ETL.

Resumen: año 2026 predeterminado y visible, años anteriores sólo si ya hay importes en la ficha; meses con al menos gastos o apoyo, ausencias explícitas. Tooltips visibles con montos de ambas series por hover, toque y foco. Dashboard: período mínimo/default marzo 2026, detalles en puntos, animaciones con movimiento reducido y barras mensuales adicionales coherentes con filtros. Compartir tooltip/barras entre consumidores; preservar importes, estados y CSV.

Archivos: helpers de períodos, componentes propios charts, AuthorityMonthlyOverview, DashboardTimeline/Comparison, nuevo DashboardMonthlyBars y pruebas/documentación. Sin globals.css, dependencias, datos versionados, extracción o workflows. Validar ambos contextos, tres temas, teclado/tacto/móvil, años sintéticos y datos reales preservados.

Implementación local completada; evidencia en chart-interaction-evidence.md.
