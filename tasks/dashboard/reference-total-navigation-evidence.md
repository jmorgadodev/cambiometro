# Evidencia local — resumen y Dashboard · 19-11-2026

Rama codex/dashboard-parlamentario-local-20261119. Base 89f6b5cc; origin/main 39cc06d0 obtenido antes de continuar. No publicado.

## Resultado

- Resumen conserva una sola gráfica conjunta; altura 240 px escritorio / 220 px móvil y ancho medido del contenedor. Dos series, eje desde cero, año, tooltips y tabla preservados. Sin vistas de separación ni variación mensual.
- Dashboard incorpora la última dieta oficial positiva como referencia fija en cada mes del rango. La tarjeta muestra acumulado y valor mensual; comparaciones, barras, línea y CSV usan la misma proyección. Los originales permanecen intactos. CSV identifica estimación y mes de origen.
- Total referencial suma las cuatro tarjetas, con alcance de estimación/solapamientos visible. Los filtros de componentes/ítems enfocan gráficos; tarjetas conservan cohorte y período.
- Encabezado y menú móvil incluyen Dashboard tras Metodología. /dashboard identifica el panel parlamentario actual y admite ampliar el catálogo.

## Verificación

Desde transparencia-app:

- Vitest: 65 pruebas en 8 archivos (dashboard-headline, parliamentary-dashboard-selection, parliamentary-dashboard, parliamentary-dashboard-data, authority-monthly-overview, parliamentary-cost-periods, month-periods, site-modules).
- `tsc --noEmit`, ESLint de archivos modificados, guardas de arquitectura estática/colores y `git diff --check`: correctos.
- `node scripts/verify-dashboard-headlines.mjs`: 11 comprobaciones, sin errores de página; referencias y totales, menú desktop/móvil, tamaño proporcionado y Axe en tres temas.
- `node scripts/verify-dashboard-local.mjs`: 19 comprobaciones BI, filtros múltiples, URL/historial, comparación, CSV, fechas juntas, 320/390 px y Axe en tres temas.
- `node scripts/verify-profile-summary-chart.mjs`: 11 comprobaciones, importes, tabla, ambas fichas y móvil sin desbordamiento de página.
- `node scripts/verify-chart-interactions.mjs`: 13 comprobaciones, cursor/teclado/toque, animación reducida y fixture de selección de año.
- Comprobación contra recibo financiero publicado: 28 barras preservadas; Bianchi 9 meses y Kaiser 7 meses, sin alterar importes.
- `CAMBIOMETRO_DASHBOARD_LOCAL_DATA=artifacts/dashboard/local-data.json node node_modules/next/dist/bin/next build --webpack`: correcto, 4.886 páginas; log en artifacts/headline-navigation/build-final.log. Es una compilación de desarrollo local, no un artefacto para publicar con slices Git.
- Revisión visual de capturas finales desktop/móvil: gráfica de altura moderada, anchura aprovechada y meses legibles. Capturas en artifacts/headline-navigation; recibos en artifacts/dashboard, profile-summary-chart y chart-interaction.

## Datos y recuperación

Bundle verificado: 30.397 registros originales; SHA256 interno 0724fd81e26a93a17bea093dab9a8691a3b6e3c59d2258df5f14a4da88a86559. Release 5cd0a3da19dddbbcccc9ef8a12215bc35e9f0cde00c239892b48ab25225cd9bf. La dieta mensual es una proyección de consulta: no modifica el bundle ni fuentes/ETL. Ausencia no crea una dieta; referencias ambiguas quedan excluidas. No reconstruye reajustes ni afiliaciones históricas.

La ficha local puede conservar cortes distintos de producción; la paridad financiera publicada se contrasta separadamente con el recibo guardado. No usar slices locales para publicar. La próxima entrega UI debe hidratar el release vigente y verificar preview antes de promoción.

Recuperación: revertir este incremento de interfaz/modelo conserva el dataset intacto. Publicación agrupada y revisión sobre release vigente pendientes de autorización.
