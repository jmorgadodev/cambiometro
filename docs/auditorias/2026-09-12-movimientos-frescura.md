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

## Control actualizado de producción — 2026-09-12

Se volvió a consultar sólo el artefacto público y los endpoints de salud. La
producción actualmente declara:

| Campo | Valor observado |
|---|---|
| Versión | `5.0.0` |
| Última ejecución exitosa | `2026-09-11T17:17:35.908Z` |
| Último evento | `2026-09-02` |
| Movimientos | 82 |
| Verificados | 74 |
| En confirmación | 8 |
| Señales en confirmación | 10 |
| Checksum | `93cbc4dc7556fa60aa157d3eab2cc3c13068103c7604cb5a959afa30854762a8` |

Los conectores oficiales Ley Chile, Diario Oficial, Presidencia y Ministerio
del Deporte respondieron HTTP 200. `gob.cl` continúa respondiendo HTTP 403 y se
mantiene como fuente bloqueada, no como ausencia de movimientos. Las fuentes
provisionales responden, pero sus señales conservan el estado
`en_confirmacion`.

El snapshot local del checkout consultado queda un día atrás (`2026-09-10`),
con el mismo total de 82 movimientos y el mismo último evento, pero con
checksum distinto y nueve señales pendientes. Esto confirma que producción es
la referencia operativa y que no corresponde reemplazarla con local.

También se detectó que `/api/v1/health` conserva `generatedAt` en
`2026-09-08T13:21:08.102Z`, mientras el artefacto de movimientos fue publicado
el 11 de septiembre. El health general no debe usarse como fecha global de
Movimientos: la interfaz debe mostrar la frescura del propio artefacto y de
cada conector.

No se ejecutó ETL, no se consultó D1 y no se modificó producción. El siguiente
control debe confirmar que una ejecución fallida de `gob.cl` no elimine datos
anteriores y que `last_run`, `last_success_at`, `last_event_date`, detección y
publicación permanezcan separados.
