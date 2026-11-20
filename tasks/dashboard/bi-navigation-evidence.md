# Dashboard BI · selección múltiple y comparación local

19-11-2026. Base 7bb0fc5a, rama codex/dashboard-parlamentario-local-20261119. Sin push, CI remoto, ETL ni publicación. La entrega base de fase 7 está documentada en evidence.md; este informe describe su renovación posterior solicitada por Jorge.

## Cambios

- Filtros a la izquierda, plegables, con botón persistente y selecciones activas visibles. Ocultar amplía el lienzo; volver conserva selecciones/búsquedas. En móvil mostrar lleva a los filtros y ocultar vuelve a las visualizaciones, con foco y espacio bajo el encabezado.
- Desde/Hasta juntos incluso a 320 px. Selector mensual nativo con presentación compacta que evita cortar el mes o el año.
- Listas de partidos y parlamentarios con búsqueda, casillas y selección múltiple sin Ctrl. La búsqueda admite nombre completo en orden natural aunque la lista muestre apellidos primero. Nombres ordenados por apellidos, conservando compuestos como Kaiser Barents-Von Hohenhagen y Cuello Peña y Lillo.
- Componentes mediante botones aditivos; tarjetas pulsables para enfocar un componente. Categoría e ítem permanecen como filtros secundarios.
- Comparación por partido o parlamentario: series independientes, importes por componente, cobertura y tabla mensual. Se pueden elegir tres o más; no se impone un límite silencioso ni se mezclan dietas con otros conceptos. Si un grupo tiene referencias de dieta de meses distintos, el resumen cuenta referencias en vez de presentar su suma como un pago mensual.
- Filtros dentro de una dimensión usan OR; partidos, personas, cámara y período se intersectan. Una persona fuera de la cámara/partido se descarta al normalizar la URL. Los IDs repetidos no duplican filas. Los enlaces singulares anteriores siguen funcionando.
- CSV incluye todas las filas filtradas, partido de nómina vigente y estado del importe.

## Cero de presentación solicitado

Los resúmenes, tablas y puntos vacíos muestran $0 en lugar de «Sin dato», con estado «Sin registros con importe»/«Sin importe publicado». Los puntos de ausencia son vacíos y no se conectan como observaciones reales. El dataset conserva null y los ceros oficiales; no se crean pagos ni se imputan dietas. CSV conserva importes ausentes vacíos con su estado, diferenciándolos de un 0 publicado. Esta política de presentación sustituye la anterior del Dashboard; no cambia el contrato de datos de los ETL o fichas.

## Datos y alcance

El bundle se regeneró únicamente desde las copias publicadas ya verificadas. Comparación profunda de sus 30.397 filas financieras antes/después: idénticas. Se añadieron partyId/partyLabel del catálogo parlamentario existente a los 205 miembros; 18 agrupaciones incluyendo Independientes/Sin partido. No hubo extracción, actualización de importes, cambios de release o escritura remota.

La comparación atribuye a la agrupación de la nómina vigente, sin reconstruir afiliación histórica. Mantiene los cortes publicados de Gastos, Personal, Asesorías y las referencias oficiales de dieta junio/julio. Recibo input-receipt.json y snapshots antes/después en transparencia-app/artifacts/dashboard, ignorados por Git.

## Verificación

- 44 pruebas aprobadas en seis archivos: selección múltiple, normalización/compatibilidad URL, grupos/denominadores, compuestos de apellidos, filtros, CSV, protección de null/cero/TOTAL, períodos, entradas fijadas y límites de publicación.
- Tipos, lint y guards de colores/arquitectura correctos. La compilación final usa Next/webpack; recibo/log local en artifacts/dashboard/build-bi-final.log: compilación completa y 4.886 páginas exportadas.
- 19 recorridos de navegador: tres partidos y tres personas, agrupación por partido, persistencia URL/recarga/historial, componentes aditivos, CSV completo, cero en período vacío, fechas juntas, ocultar/mostrar y ancho del lienzo, móvil 320/390, foco móvil y ausencia de desbordamiento.
- Axe sin infracciones en paper/dark/night, tanto en el Dashboard como en la comparación seleccionada; cero errores JS. La regresión reproducible está en scripts/verify-dashboard-local.mjs; usa el puerto local 3017 o CAMBIOMETRO_DASHBOARD_BASE_URL.
- La búsqueda final por nombre completo se verificó con las tres personas reales, tipos, lint y compilación del cliente Next en navegador. Un primer build detectó una condición TypeScript inalcanzable al retirar las líneas de tendencia de dietas; se eliminó y los tipos pasaron antes de repetir la compilación. No se contó ese intento fallido como validación.

Recibos/capturas: artifacts/dashboard/bi-browser-receipt.json, bi-final-desktop.png y bi-mobile-320/390.png. No son un artefacto autorizado para producción; el resto de páginas del build de revisión conserva sus entradas locales.

## Referencias de interacción

Se revisaron las guías oficiales: [Power BI: slicers](https://learn.microsoft.com/en-us/power-bi/visuals/power-bi-visualization-slicers) para listas, búsqueda, botones y selecciones visibles; [Tableau: dashboards](https://help.tableau.com/current/pro/desktop/en-us/dashboards_create.htm) para contenedores plegables y acciones que filtran visualizaciones. Se adaptaron los patrones a la web existente, sin incorporar esas plataformas ni nuevas dependencias.

## Revisión y recuperación

http://127.0.0.1:3017/dashboard/ ; recargar para ver el nuevo cliente. Los comandos de preparación guardados en evidence.md siguen vigentes y ahora añaden metadatos partidarios sin cambiar las filas financieras. Ejecutar node scripts/verify-dashboard-local.mjs desde transparencia-app para repetir la regresión con el servidor local activo.

Implementado y verificado en local. Publicación pendiente de la siguiente entrega agrupada autorizada. Revertir este incremento devuelve los filtros anteriores y su exportación; no requiere revertir datos ni ejecutores ETL. Reportajes continúa como fase 8 independiente.
