# Resumen proporcionado y Dashboard — 19-11-2026

Base 89f6b5cc, origin/main 39cc06d0 obtenido; rama codex/dashboard-parlamentario-local-20261119. Entrega sólo local.

## Alcance vigente

- Resumen: una gráfica conjunta de gastos y apoyo; escala común desde cero, altura 240 px en escritorio y 220 px en móvil, ancho adaptado al contenedor. Desplazamiento dentro del gráfico cuando sea necesario. Sin controles de separación o variación mensual. Mantiene 2026, años anteriores disponibles, tooltips y tabla exacta. Esta decisión sustituye las propuestas anteriores de vistas separadas/variación y la reducción a 150 px.
- Dieta: última referencia oficial positiva por persona, aplicada como estimación fija a cada mes del rango seleccionado. Tarjeta en CLP acumulados con referencia mensual, meses aplicados y mes oficial de origen. No inventar una referencia si está ausente o es ambigua.
- Total referencial: suma aritmética de las cuatro tarjetas de cohorte/período. Indicar estimación y posibles solapamientos; no presentarlo como gasto consolidado. Los filtros de componentes/categorías/ítems enfocan gráficos y detalle, sin ocultar las tarjetas de contexto.
- CSV identifica filas estimadas, importe y mes de referencia. Los registros oficiales y el bundle publicado permanecen intactos.
- Dashboard tras Metodología en navegación compartida, con catálogo de paneles en /dashboard y el panel parlamentario actual. No crear destinos ficticios para futuros dashboards.

## Aceptación

Pruebas de referencia mensual/total, duplicados, ambigüedad, ausencia, ajustes negativos, filtros y CSV; navegación desktop/móvil, tamaño y tooltips, accesibilidad y paridad de las dos fichas publicadas. Tipos, lint y build estático. [Evidencia](reference-total-navigation-evidence.md).

Publicación agrupada pendiente de autorización. No ejecuta ETL ni modifica datos remotos.
