# Barras mensuales del resumen · entrega local

19-11-2026. Base d45a6829, rama codex/dashboard-parlamentario-local-20261119. Sin publicación ni cambios de datos o ETL.

Se incorporó «Gastos y apoyo por mes» bajo las tarjetas del Resumen de ambas cámaras. La página pasa mesesCosto, la misma proyección que consume Dieta y períodos; no se consulta otro dataset ni se calcula un costo conjunto. Dos barras agrupadas por mes, escala CLP común, leyenda con enlaces a Gastos/Personal, detalle exacto en tabla desplegable y desplazamiento horizontal en móvil. Sólo meses desde 2026 con al menos un importe de estas series; no se incorporan meses de dieta solamente. Se retienen ceros publicados y ajustes negativos; ausencia queda como guion/Sin registro.

Componentes propios AuthorityMonthlyOverview.tsx/CSS y helper authority-monthly-overview.ts; AuthorityProfileSummary recibe la proyección como prop opcional compatible. Sin estilos globales, dependencias, extracción, workflows o cambios de publicación.

Verificación:
- 14 pruebas del helper, navegación y períodos correctas: orden, ausencia/cero, negativos, límite 2026, mes de dieta excluido e inmutabilidad.
- Tipos, lint y guards de arquitectura/colores aprobados.
- 11 comprobaciones reales de navegador en Bianchi/Kaiser: dos series, meses únicos, último importe idéntico a las tarjetas, todas las barras iguales a la tabla, navegación hacia detalle y regreso sin cambios, móvil 390/320 sin desbordamiento, tres temas con Axe sin infracciones y cero errores JS.
- Render estático adicional con los meses del recibo publicado #848: Bianchi 9 meses/15 barras y Kaiser 7 meses/13 barras. Los 28 importes/períodos coinciden exactamente con ese recibo. Se preservan las diferencias de cobertura entre componentes.
- Compilación del componente mediante esbuild y renderToStaticMarkup, más compilación/hidratación de las rutas reales con Next dev. No se repitió el build global de 4.886 páginas para este incremento acotado; la próxima entrega agrupada hidratará el release vigente y construirá el artefacto completo.

El servidor local usa las entradas existentes de cada ficha, que pueden diferir del release productivo; no se reemplazaron snapshots Git ni se usó otro origen sólo para el gráfico. La prueba sobre el recibo publicado comprueba por separado que el gráfico conserva todos sus períodos e importes. No confundir la captura local con una actualización de datos.

Regresión desde transparencia-app con el servidor local activo:

```powershell
node scripts/verify-profile-summary-chart.mjs
```

Puerto por defecto 3017; CAMBIOMETRO_PROFILE_BASE_URL permite otro puerto local. Evidencia/capturas ignoradas: artifacts/profile-summary-chart/browser-receipt.json, published-parity.json y *-desktop/mobile.png.

Revisión: /politico/carlos-bianchi-chelech/#resumen-ficha y /politico/vanessa-kaiser-barents-von-hohenhagen/#resumen-ficha. Recuperación: retirar el componente y la prop months de AuthorityProfileSummary; no requiere cambios de datos. Publicación pendiente de autorización para la siguiente entrega agrupada.
