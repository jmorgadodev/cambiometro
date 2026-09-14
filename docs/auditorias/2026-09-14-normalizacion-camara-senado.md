# Normalización parlamentaria por categoría — 2026-09-14

## Alcance

Auditoría local y no mutante del snapshot `transparencia-app/data/etl/latest.json`
y del archivo `data/personal-apoyo.json`. No consulta D1, no escribe R2 y no
promueve cambios a producción.

El snapshot analizado declara fecha de generación `2026-08-21T02:14:26.038Z`.
Sus conteos no se presentan como conteos productivos vigentes; producción sigue
siendo la referencia para frescura.

## Clasificación comprobada

| Fuente | Cámara | Registros | Categoría | Períodos observados |
|---|---:|---:|---|---|
| `congreso_opendata` | Cámara | 155 | Autoridades | sin período |
| `votaciones_camara` | Cámara | 580 | Votaciones | 2026-03 a 2026-08 |
| `votaciones_senado` | Senado | 189 | Votaciones | 2026-03 a 2026-08 |
| `gastos_camara` | Cámara | 16.275 | Gastos operacionales | 2026-03 a 2026-07 |
| `gastos_senado` | Senado | 6.521 | Gastos operacionales | 2026-01 a 2026-05 |
| `personal-apoyo` | Cámara | 1.084 | Personal de apoyo | 2026-07 |

Total auditado: **24.804 registros**.

No se detectaron filas explícitas de asesorías en el snapshot. La regla sólo
clasifica como `asesorias` una fila que lo declara en su categoría, tipo o ítem;
no convierte gastos ni personal de apoyo en asesorías por inferencia.

## Observaciones de calidad

- Las 1.084 filas de personal de apoyo no traen `id` propio. El auditor genera
  un identificador técnico determinista sólo para validación; conserva la fila
  original sin agregarle ni cambiarle campos.
- En esas filas, el período, sueldo y URL se obtienen del contexto oficial del
  registro de la persona; no se rellenan con estimaciones.
- Las demás fuentes revisadas tienen `id`, período cuando corresponde, monto en
  gastos y URL oficial en todas las filas auditadas.
- Cada fila recibe exactamente una categoría, por lo que votaciones, gastos,
  asesorías y personal de apoyo no se suman entre sí.

## Verificación reproducible

```text
npm run check:legislative-normalization
```

Resultado actual: verde. La prueba unitaria específica cubre 8 casos, incluida
la preservación de la fila original, la separación de categorías, la conversión
`julio 2026` → `2026-07` y el rechazo de identificadores duplicados.
