# Movimientos: registro documental — 22-11-2026

Base: `8fcb53b1`, Votaciones validado y cerrado. Rama: `codex/movimientos-registro-20261122`. origin/main obtenido: `0cae8e73`. Trabajo exclusivamente local.

## Alcance y archivos propios

- `app/movimientos/`: página y alcance contextual; navegación global intacta.
- `components/movimientos/`: registro, filtros, detalle, cronología y estilos por módulo.
- `lib/movement-register*.ts`: proyección de presentación y consultas locales; contratos originales intactos.
- Pruebas del módulo y recorrido de navegador; documentación en `tasks/movimientos/` y `docs/modules/movimientos/`.
- Reutilizar el diálogo nativo de Votaciones sin editarlo. No cargar componentes de análisis financiero.

## Incrementos y aceptación

1. Proyectar campos existentes: identidad, institución, tipo, estado original, fechas diferenciadas y fuentes. Mantener las revisiones documentales y no fusionar identidades por semejanza.
2. Registro compacto predeterminado: búsqueda local, filtros combinables/múltiples, fechas juntas, orden, paginación y URL compatibles. Mostrar casos y anuncios sin presentarlos como confirmaciones oficiales.
3. Detalle contextual con fuentes clasificadas, fechas e historial disponible; Escape, foco, scroll y móvil mediante el panel existente.
4. Cronología alternativa por mes, con idénticos filtros y paginación. Revisión de claro/oscuro y cinco anchos solicitados.
5. Cierre: pruebas integradas, build estático, navegador y capturas antes/después, recibo de datos y configuración sin cambios; sin publicación.

## Datos y dependencias

Se recuperó mediante GET el snapshot público de Movimientos del 22-11-2026. El recibo y copia están en `transparencia-app/artifacts/movimientos-renovacion/`. Los insumos originales se respaldan y restauran por SHA tras generar el artefacto. La consulta y filtros no requieren API ni Worker. No se ejecutan ETL, reextracciones o cambios remotos.

## Recuperación

Revertir únicamente los commits de esta rama relativos a Movimientos. Conservar releases y automatizaciones. Votaciones y dashboard permanecen en la base y no se revierten.

## Cierre local

Implementados registro, búsqueda/filtros, panel, cronología y navegación móvil. Código en `237cb44f`, `6e57fa9c` y `ba7bf255`; la revisión de navegador y la suite integrada se registran en [entrega](entrega-registro-20261122.md) y [recibo](validacion-registro-20261122.json). La integración y publicación permanecen pendientes de autorización; no son parte del cierre local.
