# Movimientos — control de frescura y procedencia

## Evidencia consultada

- Workflow maestro: `.github/workflows/etl-movimientos.yml`.
- Snapshot local: `transparencia-app/data/movimientos.json`.
- Snapshot productivo: `https://cambiometro.impulsacv.cl/data/movimientos.json`.
- Consulta realizada el 12 de septiembre de 2026.

## Estado actual

| Campo | Producción | Local | Evaluación |
|---|---|---|---|
| Última ejecución exitosa | `2026-09-11T17:17:35.908Z` | `2026-09-10T11:59:19.695Z` | Producción más fresca |
| Último evento | `2026-09-02` | `2026-09-02` | Coincide |
| Registros | 82 | 82 | Coincide |
| Checksum | `93cbc4c…54762a8` | snapshot local anterior | Comparar en el siguiente pull |
| Fuentes oficiales disponibles | 4 | 4 | Hay respaldo oficial |

## Conclusión

El desfase local/producción actual es de frescura, no una pérdida de registros.
Producción ya no está detenida en agosto: el último éxito es del 11 de
septiembre de 2026. El último evento publicado sigue siendo del 2 de
septiembre, que es distinto de la fecha de ejecución del ETL.

El workflow está separado de Cámara y publica sólo el grupo estático de
Movimientos desde R2. Recupera el snapshot anterior antes de ejecutar, valida
el payload, exige checksum y conserva los movimientos anteriores si una fuente
no responde.

## Pendiente de cierre

La interfaz debe mostrar por separado:

1. fecha del evento;
2. última publicación de la fuente;
3. última detección/ejecución del ETL;
4. última publicación en Pages;
5. fuentes que no actualizaron.

No se cambiará el contenido del snapshot hasta completar esa presentación y
una prueba incremental que confirme que un fallo de una fuente no elimina los
registros anteriores.
