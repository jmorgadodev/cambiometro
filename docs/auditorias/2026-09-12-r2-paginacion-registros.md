# Auditoría de paginación R2 — 12 de septiembre de 2026

## Hallazgo

Se verificó en producción:

`GET /api/v1/records?source=infolobby&offset=60522&limit=1`

La respuesta declaraba `total=60.523`, pero devolvía cero filas en el último
offset y mantenía un cursor que podía repetir la misma posición. El problema
estaba en la traducción entre el offset lógico de la API y los bloques físicos
del índice R2. También afectaba consultas que cruzaban el límite entre dos
bloques físicos.

## Corrección local

En `cambiometro-public` se corrigió `readIndexedRecords` para:

- cargar todos los bloques físicos necesarios para cubrir `offset + limit`;
- convertir el offset global a un offset relativo al primer bloque leído;
- devolver el último registro sin repetir el cursor;
- conservar la paginación filtrada existente.

Se agregó una prueba que cubre tanto el último bloque como una consulta que
cruza dos bloques. Commit local: `a8220af` (`fix: corregir paginacion de
indices r2`).

## Validación

La prueba dirigida pasó:

- 2 pruebas ejecutadas;
- 2 aprobadas;
- 53 omitidas por selección del filtro.

La dependencia local utilizada para la prueba fue retirada después de la
ejecución para no conservar `node_modules` en el proyecto.

## Estado de producción

La corrección aún no está desplegada. No se modificó R2, D1 ni Pages durante
esta intervención.

**Estado:** corrección local validada; requiere typecheck, suite completa,
preview y verificación de producción antes de promover.
