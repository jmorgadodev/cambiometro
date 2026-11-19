# Tooltips, años y barras · entrega local

19-11-2026. Base 3ec96562; rama codex/dashboard-parlamentario-local-20261119. Sin publicación, extracción ni cambios de datos/ETL.

## Resumen parlamentario

Abre siempre en 2026 y muestra el año completo. El selector añade sólo años que ya tengan gastos o apoyo en la proyección existente; no ofrece años vacíos ni busca datos nuevos. Cada mes necesita al menos uno de los dos importes. Para el otro componente se indica «Aún no disponible», sin inventar un cero o completar registros. Se conservan negativos y ceros publicados.

Las barras presentan tooltips visibles con mes, montos y estado de ambas series: hover, clic/toque o foco/Enter/Espacio. Esc, tocar fuera o desplazar cierra el detalle. La tabla exacta permanece disponible. El tooltip se dibuja en una capa independiente para evitar recortes del gráfico y se invalida al cambiar filtros/año.

## Dashboard

Período predeterminado y mínimo: marzo de 2026; las URLs anteriores a ese corte se normalizan. No se eliminan enero/febrero de las entradas publicadas. Los puntos de evolución/comparación muestran mes, componente, importe, autoridad/grupo y cobertura donde corresponde. Los importes ausentes conservan su estado aunque el Dashboard los presente como $0.

Nuevo gráfico de barras mensuales agrupadas, con la misma selección y escala CLP, sin apilar o sumar componentes potencialmente solapados. Conserva valores exactos en tabla. Las líneas y barras aparecen mediante revelado suave al cargar/cambiar selección; no hay animación de cifras financieras. prefers-reduced-motion desactiva el movimiento. Los trazos no interceptan los eventos de los puntos.

## Archivos y contratos

Compartidos de interfaz: components/charts/ChartTooltip y FinancialBars, con CSS propio. Consumidores: AuthorityMonthlyOverview, DashboardTimeline/Comparison y DashboardMonthlyBars. Helpers de años/períodos actualizados y pruebas afectadas. Sin estilos globales, nuevas dependencias, workflows, API pública, snapshots o contratos remotos.

## Evidencia

- 54 pruebas correctas en ocho archivos: selección/agrupación, límite marzo, años con datos, ausencia/cero, períodos, integridad de entradas y publicación.
- Tipos y lint de los archivos afectados; guards de arquitectura/colores y diff aprobados.
- 13 nuevas comprobaciones de navegador: montos por hover/foco, Escape, toque, cierre externo, barras nuevas, puntos de ambas vistas, mínimo marzo, tres temas con Axe sin infracciones y movimiento reducido. Fixture histórica explícitamente sintética: 2026 predeterminado, 2025 elegible, 2024 vacío excluido, importe y ausencia exactos al cambiar de año.
- Regresiones anteriores: 19 recorridos del Dashboard y 11 del resumen pasan; sin errores JS ni desbordamiento móvil.
- Render estático de las dos muestras del recibo productivo: 28 importes conservados, Bianchi 9 meses/15 barras y Kaiser 7 meses/13 barras.
- Build completo Next/webpack aprobado, 4.886 páginas exportadas: artifacts/chart-interaction/build.log. El build local no se autoriza para producción; otros módulos conservan sus entradas locales. La próxima publicación hidratará el release vigente.

Regresiones desde transparencia-app con servidor local activo:

```powershell
node scripts/verify-chart-interactions.mjs
node scripts/verify-dashboard-local.mjs
node scripts/verify-profile-summary-chart.mjs
```

El primero usa CAMBIOMETRO_CHART_BASE_URL o http://127.0.0.1:3017. Recibos/capturas ignorados en artifacts/chart-interaction, artifacts/dashboard y artifacts/profile-summary-chart. La fixture histórica sólo existe para pruebas y no alimenta la web.

Recuperación: revertir este incremento; no requiere revertir datos ni ejecutores. Pendiente de la próxima publicación agrupada solicitada por Jorge.
