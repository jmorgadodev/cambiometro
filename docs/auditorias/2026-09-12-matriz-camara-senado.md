# Matriz de alcance: Cámara y Senado

Fecha de revisión: 12 de septiembre de 2026. Revisión de sólo lectura sobre
manifiestos locales, salud productiva y respuestas R2 acotadas. No se ejecutó
SQL, no se consultó D1 y no se publicó ningún release.

## Regla de lectura

Los conteos de `camara` y `senado` son fuentes base. Gastos, votaciones,
asesorías y personal de apoyo son componentes distintos y no deben sumarse a
la fuente base para anunciar cobertura de remuneraciones.

`localHealthCount` es un conteo operativo del snapshot local y puede contener
registros normalizados o componentes que también aparecen en el catálogo. No
se interpreta como suma aritmética de todos los componentes.

## Cámara

| Componente | Conteo local/catalogado | Períodos locales | Producción | Estado |
|---|---:|---|---:|---|
| Fuente base Cámara | 13.286 / 13.286 | 2026-01, 2026-03 a 2026-08 | 58.751 declarados; 49 publicados en página de smoke | Parcial |
| Conteo operativo de salud | 19.025 | 2026-08-21 | incluido en el total operativo local | No comparable directamente |
| Gastos Cámara | 16.275 | 2026-03 a 2026-07 | fuente separada | Parcial |
| Asesorías | incluido en el alcance local de Cámara | períodos no separados en el catálogo base | no debe mezclarse | Pendiente de desglose |
| Votaciones Cámara | componente separado del release parlamentario | histórico parlamentario; corte productivo 2026-09 | fuente separada de remuneraciones | Parcial |

### Conclusión Cámara

La diferencia entre 13.286 locales y 58.751 productivos no demuestra pérdida.
El local corresponde a un subconjunto de períodos y el productivo declara un
release de mayor alcance. El número 19.025 tampoco debe sumarse con 16.275,
porque ambos provienen de capas distintas del snapshot.

La cobertura pública debe mostrar por separado:

1. remuneraciones o personal base;
2. asesorías;
3. gastos operacionales;
4. votaciones;
5. asistencia, si el release la conserva.

## Senado

| Componente | Conteo local/catalogado | Períodos locales | Producción | Estado |
|---|---:|---|---:|---|
| Fuente base Senado | 1.428 / 1.428 | 2015, 2018, 2024, 2025, 2025-08, 2026, 2026-02, 2026-05, 2026-07 | 1.428 declarados; 50 publicados en página de smoke | Parcial |
| Conteo operativo de salud | 8.138 | 2026-08-21 | incluido en el total operativo local | No comparable directamente |
| Gastos Senado | 6.543 | 2026-01 a 2026-05 | fuente separada | Parcial |
| Votaciones Senado | 189 | 2026-03 a 2026-08 | fuente separada | Parcial |
| Asesorías y otros componentes | incluido en el alcance local de Senado | períodos no uniformes | no debe mezclarse | Pendiente de desglose |

### Conclusión Senado

La fuente base productiva conserva 1.428 registros, pero el snapshot local de
salud alcanza 8.138 porque incorpora componentes diferentes. Los 6.543 gastos
y 189 votos no deben presentarse como remuneraciones ni sumarse a 1.428 para
calcular personas pagadas.

## Diferencias que quedan explicadas

| Diferencia | Clasificación | Acción |
|---|---|---|
| Cámara local 13.286 vs productivo 58.751 | Alcance y períodos | Comparar por componente y período antes de cambiar datos |
| Senado local 8.138 vs productivo 1.428 | Categorías mezcladas | Mantener fuente base separada de gastos y votos |
| Gastos Cámara 16.275 | Fuente derivada/separada | Conservar como gastos operacionales |
| Gastos Senado 6.543 | Fuente derivada/separada | Conservar como gastos operacionales |
| Votaciones Senado 189 | Fuente parlamentaria separada | Auditar corte 2026-09 sin mezclar remuneraciones |
| Página productiva muestra 49/50 filas en smoke | Paginación, no total | Usar `meta.total` y `meta.publishedRows`, no la página individual |

## Criterio para la siguiente publicación

No se debe cambiar ningún conteo productivo hasta que exista, para cada
componente:

- archivo o clave R2;
- período inicial y final;
- filas del release;
- checksum;
- estado de completitud;
- categoría única;
- diferencia explícita frente al catálogo local.

La matriz queda lista para ser usada por los ETL separados. La siguiente
acción segura es revisar los manifiestos de votaciones de Cámara y Senado y
confirmar sus cortes, sin modificar la fuente base ni ejecutar D1.
