# Ficha parlamentaria

La entrega base está publicada en #848; los estados «no publicado» de los informes previos son históricos. Consultar [estado conciliado](../../../tasks/consolidacion/estado-fases-20261119.md).

## Contrato y responsabilidad

Resumen predeterminado, menú izquierdo, un apartado visible a la vez y selector móvil. Conservar fuentes y todos los períodos publicados. Agrupar antecedentes secundarios para no saturar el resumen.

## Origen, ejecución y artefactos

Ejecutores: Consume módulos existentes; no incorpora un ETL propio.

Artefactos: app/politico/[id], componentes politico y slices.

El calendario remoto canónico es .github/etl-calendar.json. Las rutas locales son relativas a cambiometro-public/transparencia-app; no instalar tareas desde worktrees. Verificar el corte del manifiesto publicado antes de usar copias locales.

## Verificación y recuperación

Desde transparencia-app: Comparar Bianchi y Kaiser contra el mismo release productivo; validar teclado, móvil y hashes de datos.

Si el origen falla o se reduce la cobertura sin justificación, detener la publicación y conservar el último release válido. Registrar fallo, período, checksum y próxima acción en tasks/fichas/evidence.md. No reactivar módulos secundarios como dependencia incidental. La recuperación de interfaz usa el artefacto previo; la de datos usa el release previamente validado.

## Archivos compartidos

Cualquier cambio de esquema, generador de slices, navegación global o release-set debe coordinarse con el integrador y sus consumidores. Consultar AGENTS.md antes de editar.

## Incremento local del 19-11-2026

Ver [evidencia](../../../tasks/fichas/evidence.md) y [plan](../../../tasks/fichas/plan.md). Navegación por paneles, hashes previos y estado mensual preservados. Preparado en local, pendiente de entrega agrupada.

## Renovación local — 19-11-2026

Antecedentes de identidad bajo nombre y partido: profesión/formación declarada, edad derivada, región, período y contacto/redes incorporados. La declaración tiene prioridad sobre la profesión biográfica; los campos sin respaldo no se inventan y se distingue procedencia. Antecedentes conserva timeline, militancias y declaración; Lobby y biografía duplicada dejan de ocupar ese panel. Gastos, dietas, apoyo y sus períodos se conservan. Children.toArray normaliza las claves de los bloques RSC sin desmontar paneles por cambiar el apartado.

Ver tasks/votaciones/explorador-editorial-evidence.md para alcance y pruebas. No publicado.

## Mejora móvil posterior — 19-11-2026, sólo local

Selector persistente bajo el encabezado, anterior/siguiente y posición entre apartados. Las medidas del encabezado y la barra determinan el margen de los saltos; un destino principal empieza en el título y los enlaces profundos conservan sus anclas. Se mantienen meses seleccionados, historial, teclado y navegación sin JS. Escritorio conserva el menú lateral. [Plan](../../../tasks/fichas/mobile-navigation-plan.md) y [evidencia de 17 comprobaciones](../../../tasks/fichas/mobile-navigation-evidence.md). No modifica ETL ni datos y todavía no está publicado.

## Resumen con barras mensuales — sólo local

Gastos operacionales y personal de apoyo por mes desde mesesCosto, sin otro origen ni suma de componentes. Meses desde 2026 con datos, ausencia diferenciada de cero, tabla exacta y gráfico desplazable en móvil. [Plan](../../../tasks/fichas/summary-chart-plan.md) y [evidencia](../../../tasks/fichas/summary-chart-evidence.md). No publicado.

## Años y detalle de barras — sólo local

2026 predeterminado y año completo visible; otros años sólo si contienen gastos/apoyo en la ficha. Tooltips por cursor, toque y teclado con estado «Aún no disponible» para el componente ausente. No se obtienen datos históricos nuevos. [Evidencia compartida](../../../tasks/dashboard/chart-interaction-evidence.md).

## Tamaño del gráfico del Resumen — incremento local

Una gráfica conjunta de gastos y apoyo, altura moderada de 240 px en escritorio y 220 px en móvil. Se adapta al ancho disponible y desplaza sólo su contenido cuando hace falta. Sin vistas separadas ni variación mensual. Conserva eje desde cero, importes, tooltips, años y tabla exacta. [Plan y evidencia](../../../tasks/dashboard/reference-total-navigation-plan.md).
