# Muestra de historial desde R2 — 2026-09-15

## Alcance

Auditoría seca de una muestra de `funcionarios-v1` usando exclusivamente los
índices y páginas paginadas de R2. No se consultó D1, no se descargó el
universo completo y no se escribió en R2 ni en producción.

Se compararon los releases:

- `2026-08-30T08-05-27-795Z`
- `2026-09-02T03-28-30-598Z`

Para la prueba se leyó sólo `search_index/p-0003.json` de cada release y una
posición concreta del índice por release.

## Hallazgo

El registro `func-muni-curarrehue-honorarios-9c56c2196a460e51`, correspondiente
a Alejandro Fernandez Troncoso, aparece en ambos releases con período de fuente
`2026-05`, pero con estos montos brutos:

| Release | Monto bruto | Período del registro |
| --- | ---: | --- |
| 2026-08-30 | $1.614.067 | 2026-05 |
| 2026-09-02 | $60.000 | 2026-05 |

La diferencia es de `$-1.554.067`. El comparador la clasifica como
`source-correction`, no como entrada, salida ni cambio mensual, porque el
período publicado por la fuente es el mismo en ambos releases.

## Regla incorporada

El lector `readR2SearchIndexRowsAtPositions` sólo carga las páginas que
contienen las posiciones solicitadas. El comparador conserva el registro
original y distingue:

- `source-correction`: cambia el monto del mismo período de fuente.
- `period-shift`: cambia el período de fuente entre releases.
- `unclassified`: no hay período suficiente para clasificar.

Prueba automatizada: `15/15` en `scripts/etl/r2-history.test.mjs`.

## Interpretación operativa

Este resultado no autoriza a afirmar que el sueldo mensual de la persona haya
caído en esa proporción. Primero se debe revisar el documento de origen y
determinar si el release posterior corrigió un valor anterior. Las diferencias
de release deben conservarse como evidencia, pero no deben presentarse como
movimientos mensuales sin esa verificación.
