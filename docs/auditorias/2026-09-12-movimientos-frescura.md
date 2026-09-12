# Auditoría de frescura de Movimientos — 12 de septiembre de 2026

## Método

Se comparó el artefacto público `https://cambiometro.impulsacv.cl/data/movimientos.json`
con el snapshot local del proyecto maestro. No se consultó D1, no se ejecutó ETL
y no se reemplazó ningún archivo local.

## Resultado

| Métrica | Producción | Local | Lectura |
|---|---:|---:|---|
| Versión | 5.0.0 | 4.0.0 | Producción está adelantada |
| Última ejecución | 2026-09-11 17:17:35Z | 2026-08-17 03:00 CLT | Diferencia de frescura |
| Frecuencia declarada | Diario 03:00 CLT | Diario 03:00 CLT | El calendario coincide |
| Movimientos | 82 | 79 | +3 en producción |
| Verificados | 74 | 75 | No comparar como pérdida: cambiaron los estados |
| En confirmación | 8 | 4 | Producción conserva más casos pendientes |
| Últimos 7 días | 0 | 7 | La ventana se recalculó en otra fecha |
| Con CGR vinculado | 2 | 2 | Coincide |

## Conclusión

La diferencia local/producción es de frescura y de estado, no evidencia de que
producción haya perdido movimientos. Producción es la referencia operativa para
la fecha y el conteo vigente. El snapshot local no debe presentarse como si
fuera la versión actual ni usarse para reemplazar el artefacto público.

El proceso productivo sí está actualizado al 11 de septiembre y declara una
frecuencia diaria. Queda pendiente auditar el conector y la hora efectiva de la
siguiente ejecución, además de conservar por separado fecha del evento, fecha
de detección y última publicación. La interfaz debe seguir mostrando el estado
`verificado` o `en confirmación`, sin promover señales de prensa a hecho oficial.

## Siguiente control

Antes de modificar el ETL se debe comprobar en una nueva ejecución que:

1. el archivo cambia sólo cuando existe un evento nuevo o cambio de estado;
2. los movimientos anteriores se conservan si una fuente falla;
3. el número de filas, los estados y el `last_run` quedan registrados;
4. la publicación en Pages ocurre después de validar el artefacto.
