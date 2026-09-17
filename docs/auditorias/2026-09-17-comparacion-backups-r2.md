# Comparación de snapshots de backup R2 — 2026-09-17

## Método

Se compararon los inventarios remotos de `cambiometro-backups` por nombre
relativo, tamaño y ETag. La revisión no descargó objetos y no ejecutó
eliminaciones.

## Resultado

| Snapshot | Objetos | Bytes |
| --- | ---: | ---: |
| `2026-08-20` | 613 | 1.878.360.452 |
| `2026-09-13` | 2.587 | 4.310.789.809 |

Entre ambos snapshots sólo coinciden 171 claves relativas. De ellas:

- 166 tienen el mismo tamaño;
- 155 tienen el mismo ETag;
- 442 objetos del snapshot del 20 de agosto no tienen equivalente en el del
  13 de septiembre.

## Decisión

El snapshot del 20 de agosto no puede eliminarse completo como si fuera un
duplicado: conserva objetos que no están en el snapshot más reciente. Tampoco
se debe eliminar sólo por fecha, porque algunos objetos pueden ser el único
rollback de una proyección o dump.

La limpieza segura requiere una lista por objeto que indique:

1. si está referenciado por un manifiesto o catálogo;
2. si existe una copia posterior con el mismo contenido;
3. si pertenece a un release activo, rollback o fuente crítica;
4. cuánto espacio libera;
5. cómo se restaura antes de borrarlo.

Hasta completar esa lista, el backup queda intacto. El bloqueo de publicación
R2 se mantiene y no se relaja para forzar una nueva versión.

