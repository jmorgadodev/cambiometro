# Partidos

Rutas activas: /partidos y /partidos/[sigla]. Fuentes y dependencias: nómina parlamentaria, afiliación publicada y votaciones nominales. No tiene un ETL adicional independiente.

Responsabilidad: composición de bancadas y comparaciones respaldadas por datos publicados. Una afiliación actual no acredita pertenencia histórica. No sumar montos de cortes distintos como mensualidad, ni reactivar cohesión o apoyo agregado sin evidencia validada.

Cierre: verificar integrantes, denominadores de votaciones, períodos y fuentes de cada comparación; pruebas de /partidos y fichas; validación desktop/móvil y mismo release de datos. Registrar evidencia en tasks/partidos. Mantener coordinación con Cámara y Votaciones antes de cambiar sus contratos compartidos.

## Estabilización local — 18-11-2026

[Plan coordinado](../../../tasks/votaciones/plan.md), [evidencia](../../../tasks/votaciones/evidence.md) y [pendientes](../../../tasks/votaciones/todo.md). Las afiliaciones históricas se resuelven por fecha; un dato desconocido no se etiqueta como independiente. Las muestras incompletas/ambiguas y los agregados sin cobertura permanecen fuera de cálculo o en revisión. No se reactivaron indicadores.

Las tarjetas conservan el corte ante respuestas antiguas y se validan con el resultado oficial. Guard y pruebas dirigidas son locales; no hace falta ejecutar ETL o construir Pages para cada ajuste. La captura publicada guardada no sustituye una verificación del release vigente en la futura entrega agrupada.
