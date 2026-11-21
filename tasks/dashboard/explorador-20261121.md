# Explorador parlamentario — 21-11-2026

Rama: codex/dashboard-explorador-20261121. Base origin/main 0cae8e73. Trabajo local; no push, PR, ETL ni despliegue.

## Alcance y contratos
Responsable: dashboard. Archivos propios: lib/parliamentary-explorer*, lib/parliamentary-explorer-data*, components/dashboard/explorer/*, app/dashboard/page.tsx, scripts/build-parliamentary-explorer.ts y pruebas del módulo. Compartidos: package.json (sólo conexión de generador al build), party-support (corregir semántica registros/personas con consumidores y pruebas), postprocesado estático sólo si se reproduce prefetch fallido.

Dependencias: release publicado verificado de gastos/personal, proyección 38 bis y catálogo de parlamentarios. Preservar Reportajes en rama previa, landing, ETL y RRSS.

## Ejecución
- [x] A: raíz, rama dedicada, remoto y auditoría comprobados.
- [x] B: dimensiones, evidencia, proyección compacta y detalle versionado.
- [x] C: navegación de cinco vistas, filtros, chips, panel contextual accesible.
- [x] D/E: exploración, territorio, ranking, comparación persistente.
- [x] F/G: personal, cargos, registros, CSV, fuentes y exportación gráfica.
- [ ] H: reconciliación, pruebas, build, navegador y capturas escritorio/móvil.

## Aceptación
Mismo conjunto filtrado para indicadores/gráficos/CSV; no suma de componentes solapados; dieta separada y explícita; ausente distinto de cero; registros nunca como personas. Región = representación. Identidad única no acreditada se informa como limitación. Detalles estáticos diferidos con checksum/release, cero API/D1/Worker por interacción. Compatibilidad URL antigua, paneles con Escape/foco/scroll preservado, exportación local. Sin archivos administrativos completos en apertura. Verificación de cinco vistas a 360/390/768/1366/gran pantalla y evidencia guardada en artifacts/dashboard-explorer (no versionada). Resultado local y documentación de publicación segura, sin publicar.

## Decisiones y límites comprobados
- La proyección compara 3.474 combinaciones persona/mes/componente con el modelo anterior; no compensa discrepancias entre parlamentarios. La construcción se detiene si difiere cualquier grupo.
- Resumen en diccionarios/tuplas; detalle por mes, cámara y componente, con SHA-256 y caché compartida. No se modifica R2 ni D1.
- Región: normalización de las denominaciones existentes, incluyendo «Bío Bío» de Cámara y «Biobío» del catálogo. No se atribuye ubicación física.
- Afiliación: 205 registros incluyen campos de militancia, 181 tienen algún intervalo fechado, pero ello no acredita una serie histórica completa y homogénea para cada mes/cámara. Se mantiene etiqueta «partido vigente» y se informa esta limitación.
- Mapa evaluado: se utiliza lista accesible de las 16 regiones y comparación/gráfica regional. No se incorpora GeoJSON sin verificar licencia/procedencia ni servicios de mapas con cobro.
- Personas: no se emiten claves personales ni se deduplican homónimos. Total combinado de parlamentarios/apoyo no acreditable. Asesorías no se convierten en empleados.
- Cargo: sólo normalización ortográfica. El original se conserva en registro/CSV. No se homologan funciones de distintas cámaras.
- Fotografía: reutilización del mapa validado existente; fuente/licencia enlazada a la ficha del archivo Commons cuando corresponde. Si no carga, iniciales neutras. No se generan rostros ni se reasignan fotografías.
- Librerías: SVG propios con tooltip reutilizado, exportación SVG y tablas nativas con búsqueda, columnas, agrupación, expansión y paginación. No se añaden ECharts/Recharts ni TanStack al bundle del dashboard sin necesidad demostrada.
- Dependencias: instalación desde lockfile detectó el aviso de seguridad de Next 16.4.3. Se verificó npm audit, licencia MIT y compatibilidad con React 19/Node 24; parche acotado Next/eslint-config-next 16.4.6, lockfile actualizado. Satori tiene aviso moderado preexistente, fuera de este dashboard; no se hace una actualización mayor incidental.

## Investigación operativa independiente (sin cambiar ETL)
El log local de Personal Cámara del 18-11 registra EEXIST en publication.lock y PERSONAL_APOYO_SOURCE_BLOCKED al consultar Cámara; las últimas tareas de Apoyo/Asesorías tienen código 1. No se elimina el bloqueo ni se relanzan extracciones por esta renovación. Revisar dueño/vigencia del lock, acceso al origen y próxima ejecución de cada tarea como trabajo operativo del módulo Personal. Las tareas de gastos pueden devolver 0 sin extraer si no corresponde el día.

## Verificación en curso
Pruebas iniciales: 31/31 de modelo financiero/entrada y nueva proyección; 7/7 de carga diferida (checksum, bytes, release, concurrencia, caché y recuperación). Navegador real verifica las cinco vistas, filtros, región Biobío, paneles, exportación y tamaños móviles. Evidencia definitiva se añade al informe de entrega al cerrar los controles integrados.
