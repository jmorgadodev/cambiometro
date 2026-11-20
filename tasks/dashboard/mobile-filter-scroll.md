# Filtros móviles sin salto — 19-11-2026

Solicitud: conservar la posición del dashboard al abrir/cerrar filtros y publicar las mejoras acumuladas. Módulo Dashboard; depende de los modelos y datos ya validados, sin cambiar ETL ni dataset.

## Cambio

ParliamentaryDashboard elimina scrollIntoView de las acciones del filtro. En móvil el panel se posiciona sobre el lienzo debajo de la barra, con desplazamiento propio y overscroll contenido. No inserta/elimina altura de la página. La posición se calcula desde la barra real y responde a scroll/resize; escritorio conserva la columna lateral. El lienzo queda inerte mientras el panel lo cubre. Foco con preventScroll, Escape para cerrar y retorno al botón; selección y URL conservadas.

Archivos: ParliamentaryDashboard.tsx/.module.css, verify-dashboard-mobile-scroll.mjs y ajuste de foco esperado en verify-dashboard-local.mjs. La revisión del artefacto incorpora /dashboard a verify-defensible-browser.mjs.

## Aceptación y evidencia

- verify-dashboard-mobile-scroll: 6 recorridos correctos, 320/390 px, misma posición y altura al abrir/cerrar desde barra/panel/Escape; scroll interno y foco conservados, sin overflow de página.
- verify-dashboard-local: 19 comprobaciones correctas, comparación, filtros, exportación e historial; Axe en tres temas.
- Entrega agrupada: [referencias y gráfico](reference-total-navigation-evidence.md), [navegación BI](bi-navigation-evidence.md), [navegación móvil de ficha](../fichas/mobile-navigation-evidence.md).

Publicación: UI-only desde R2 mediante preview y promoción del mismo artefacto. Conservar rollback del despliegue previo; no desplegar los out locales de desarrollo.

Cierre integrado: lint del código sin errores (avisos preexistentes; artifacts locales excluidos). La suite encontró una guarda FS en el adaptador nuevo y un timeout aislado de fixture Windows. El adaptador ahora muestra indisponibilidad sólo en desarrollo ante ENOENT/ENOSYS, y falla cerrado en publicación/entrada local explícita. Checksum y divergencias siguen siendo fatales. Los 30 tests de los tres archivos afectados pasan, incluido el ejecutor simulado de Senado sin extracción. La suite completa restante registró 2.098 pruebas correctas; CI repetirá la suite sobre checkout limpio. Tipos correctos.
