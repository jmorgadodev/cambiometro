# Calendario operativo de ETL

Los schedules de GitHub Actions se declaran en UTC. El portal opera con la
zona horaria `America/Santiago`, que cambia entre horario de invierno y
verano. Por eso el mismo cron `0 7 * * *` se muestra como 04:00 en invierno y
03:00 en verano.

| ETL | Cron UTC | Hora local aproximada |
| --- | --- | --- |
| Parlamento y Diario Oficial | `0 7 * * *` | 04:00 invierno / 03:00 verano |
| Personal de apoyo parlamentario | `0 7 * * 1` | Lunes 04:00 invierno / 03:00 verano |
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

La configuración operativa actual incorpora fuentes oficiales y páginas de
prensa para detectar anuncios recientes que todavía no tienen decreto publicado:

- Ministerio de Vivienda y Urbanismo: renuncia de Alonso Velásquez, Seremi de
  Vivienda de Tarapacá, efectiva el 02-09-2026; Radio Paulina informó el caso
  el 03-09-2026. La ficha conserva ambas fechas separadas.
- Emol: salida de Patricio Löhr, Seremi de Transportes de Arica y Parinacota
  (02-09-2026; el evento se registra con fecha efectiva 01-09-2026).

Estos enlaces sólo alimentan señales `en_confirmacion`; no convierten una nota
de prensa en confirmación oficial ni reemplazan la consulta diaria de Ley
Chile y Diario Oficial.

## Política incremental y cuota D1

Los procesos diarios de votaciones consultan sólo una ventana reciente con
solapamiento de siete días. Ese solapamiento permite incorporar correcciones
oficiales sin volver a recorrer todo el período desde el inicio. Un backfill
deliberado puede usar el rango `--from`/`--to` y, para gastos de Senado,
`--full-history`.

Los gastos de Senado se ejecutan mensualmente y consultan el último release más
un mes de solapamiento. El lake conserva las particiones históricas; no se
eliminan registros por reducir la ventana de extracción.

La materialización D1 usa `--skip-unchanged`: primero compara el checksum de
cada fuente con `source_state` y termina sin reconstruir entidades, registros ni
relaciones cuando no hubo cambios. La consulta de control es acotada. Los
datasets de lectura masiva deben seguir sirviéndose desde R2/Pages o mediante
consultas D1 paginadas e indexadas.
