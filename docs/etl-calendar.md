# Calendario operativo de ETL

Los schedules de GitHub Actions se declaran en UTC. El portal opera con la
zona horaria `America/Santiago`, que cambia entre horario de invierno y
verano. Por eso el mismo cron `0 7 * * *` se muestra como 04:00 en invierno y
03:00 en verano.

| ETL | Cron UTC | Hora local aproximada |
| --- | --- | --- |
| Parlamento y Diario Oficial | `0 7 * * *` | 04:00 invierno / 03:00 verano |
| Personal de apoyo parlamentario | `0 7 * * *` | 04:00 invierno / 03:00 verano |
| Movimientos de autoridades | `0 7 * * *` | 04:00 invierno / 03:00 verano |
| ChileCompra | `0 8 * * 1` | Lunes 05:00 invierno / 04:00 verano |
| InfoLobby | `30 8 * * 1` | Lunes 05:30 invierno / 04:30 verano |
| Contraloría | `0 9 2 * *` | Día 2, 06:00 invierno / 05:00 verano |
| CPLT | `0 9 5 * *` | Día 5, 06:00 invierno / 05:00 verano |
| Ley 19.862 | `0 9 8 * *` | Día 8, 06:00 invierno / 05:00 verano |
| InfoProbidad | `0 9 10 * *` | Día 10, 06:00 invierno / 05:00 verano |
| DIPRES | `0 9 1 1,4,7,10 *` | Día 1 del trimestre, 06:00 invierno / 05:00 verano |
| SINIM | `0 9 1 3,9 *` | Día 1 de marzo y septiembre, 06:00 invierno / 05:00 verano |
| Gastos operacionales rendidos | `30 8 2 * *` | Día 2, 05:30 invierno / 04:30 verano |
| SERVEL | Sin schedule | Sólo `workflow_dispatch` |

## Regla de publicación

Un ETL puede dejar su resultado en R2/D1, pero Pages sólo se refresca después
de que el workflow termina correctamente. Cada workflow debe publicar un
resumen de fuentes, conteos, checksum y fecha de publicación. Si una fuente
obligatoria está bloqueada, el job falla y se conserva el último snapshot
válido; no se publica un dataset parcial con apariencia de éxito.

Movimientos y personal de apoyo tienen workflows propios para que un bloqueo
de la página de personal de Cámara no impida actualizar el catálogo de
autoridades ni la actividad parlamentaria. Si Cámara bloquea personal, ese
workflow falla visiblemente y conserva su último snapshot válido; no se
publican datos parciales. La fecha de la última ejecución y la fecha del
último movimiento son metadatos distintos.

Las fuentes provisionales RSS autorizadas se configuran en la variable de
entorno `MOVIMIENTOS_PROVISIONAL_SOURCES` como una lista separada por comas.
No se guardan credenciales ni se agregan URLs de medios directamente al código:
si una fuente no está configurada, el pipeline la reporta como ausente y no
convierte titulares en hechos estructurados.
