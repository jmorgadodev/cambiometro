# Reconciliación de componentes de Cámara y Senado

**Fecha de diagnóstico:** 2026-09-12  
**Referencia vigente:** catálogo y `source-health` publicados en R2, generados
el 2026-09-12  
**Regla:** producción/R2 es la referencia vigente; el checkout local sólo se
usa para explicar diferencias de frescura o alcance.

## Cámara

El release productivo no representa una sola categoría homogénea. El catálogo
R2 contiene:

| Componente | Registros | Períodos observados | Tratamiento |
| --- | ---: | --- | --- |
| Asistencia | 54.538 | 2024-01 a 2026-09, con meses no publicados | actividad parlamentaria |
| Votaciones | 4.058 | 2024-01 a 2026-09, con meses no publicados | votaciones; no sumar como remuneración |
| Datos abiertos de Congreso | 155 | 2026-09 | registro separado; revisar alcance |
| Gastos operacionales | 16.275 | 2026-03 a 2026-07 | fuente `gastos_camara`, fuera del total base |

El `source-health` productivo informa `camara = 58.751`, que corresponde al
conjunto base del catálogo (54.538 + 4.058 + 155). Los gastos se informan
aparte como `gastos_camara = 16.275`; no deben incorporarse al total base ni
presentarse como remuneraciones.

## Senado

| Componente | Registros | Períodos observados | Tratamiento |
| --- | ---: | --- | --- |
| Registro base Senado | 1.428 | 2025-08 y 2026-02/05/07 | actividad y registros propios del Senado |
| Votaciones | 205 | 2026-03 a 2026-09 | fuente `votaciones_senado` |
| Gastos operacionales | 6.517 | 2026-01 a 2026-05 | fuente `gastos_senado` |

El total principal productivo es `senado = 1.428`. Votaciones y gastos deben
mantenerse como componentes separados, aun cuando se muestren en la ficha del
parlamentario.

## Diferencia con el checkout local

El catálogo local anterior contenía, entre otros:

- Cámara: 13.286 registros agregados, sin las particiones actuales de
  asistencia y votaciones.
- Gastos Cámara: 16.275 registros.
- Senado: 1.428 registros.
- Votaciones Senado: 189 registros.
- Gastos Senado: 6.543 registros.

La diferencia no se interpreta automáticamente como pérdida de datos: el
catálogo R2 es posterior y usa particiones separadas. Sí evidencia que el
generador local de `source-health` no podía reproducir todavía el desglose
productivo de las particiones nuevas. Hasta que se regenere desde un catálogo
actual, no deben publicarse porcentajes de cobertura basados en el checkout
local.

## Decisión operativa

1. Mantener Cámara, Senado, votaciones y gastos como identificadores de fuente
   distintos.
2. Usar el total principal de cada fuente sólo para su propio alcance.
3. Mostrar los componentes con sus propios conteos, períodos y enlaces.
4. No sumar gastos o votaciones dentro de remuneraciones ni dentro del total
   base de la fuente.
5. Mantener los porcentajes como “No calculable” cuando el denominador histórico
   no tenga el mismo alcance.
