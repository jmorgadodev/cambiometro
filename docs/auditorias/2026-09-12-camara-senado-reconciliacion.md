# Reconciliación de Cámara y Senado

**Fecha:** 2026-09-12  
**Objetivo:** separar remuneraciones, dietas, asistencias, votaciones, gastos y
autoridades antes de calcular cobertura o comparar producción con local.

## Evidencia utilizada

Se comparó el catálogo local con el catálogo vigente descargado desde R2,
sin consultar D1:

| Catálogo | Generado | Particiones | Fuentes |
|---|---|---:|---:|
| Local `transparencia-app/data/lake/catalog/v1/manifest.json` | 2026-08-24T13:52:22Z | 90 | 14 |
| R2 `catalog/v1/manifest.json` | 2026-09-12T00:13:38Z | 147 | 14 |

La versión R2 es la referencia vigente. La versión local es histórica y no se
debe usar para reemplazar ni corregir producción.

## Conteos vigentes por alcance

### Cámara

El registro de fuente `camara` en R2 contiene **58.751 filas**, pero no es una
fuente de remuneraciones. La suma se explica completamente así:

| Componente | Filas | Períodos | Interpretación |
|---|---:|---|---|
| `asistencia_camara` | 54.538 | 2024-01 a 2026-09, con meses no publicados | Asistencia parlamentaria |
| `votaciones_camara` | 4.058 | 2024-01 a 2026-09, con meses no publicados | Votaciones |
| `congreso_opendata` | 155 | 2026-09 | Autoridades/diputados vigentes |
| **Total `camara`** | **58.751** | — | **No sumar como remuneraciones** |

Los gastos de Cámara están separados en `gastos_camara`: **16.275 filas**, de
marzo a julio de 2026. Las remuneraciones o asesorías de personal de apoyo no
están representadas por el total `camara` y deben conservar su fuente propia.

### Senado

| Componente | Filas | Períodos | Interpretación |
|---|---:|---|---|
| `senado` | 1.428 | 2025-08, 2026-02, 2026-05, 2026-07 | Registros de dietas/remuneraciones publicados por Senado |
| `votaciones_senado` | 205 | 2026-03 a 2026-09 | Votaciones |
| `gastos_senado` | 6.517 | 2026-01 a 2026-05 | Gastos operacionales |

El manifiesto de `senado/2026/07` identifica el original como
`senado-2026-07-diet-api.jsonl`, con fuente oficial de dietas. Por lo tanto,
la interfaz debe decir **dietas/remuneraciones del Senado**, no “personal de
apoyo” ni “nómina completa del Senado”.

## Diferencias local/R2 detectadas

| Alcance | Local | R2 | Diferencia | Causa comprobada |
|---|---:|---:|---:|---|
| Cámara compuesto | 13.286 | 58.751 | +45.465 | Local sólo tenía una parte del histórico; R2 incluye asistencia, votaciones y autoridades |
| Senado | 1.428 | 1.428 | 0 | Mismo conteo de este alcance |
| Gastos Cámara | 16.275 | 16.275 | 0 | Mismo release |
| Gastos Senado | 6.543 | 6.517 | -26 | Releases distintos; requiere conservar el corte R2 vigente |
| Votaciones Senado | 189 | 205 | +16 | R2 incorpora el período más reciente |

El snapshot local de salud del 21 de agosto declara Cámara `19.025` y Senado
`8.138`; esos números no tienen el mismo alcance que el catálogo R2 actual y
no se deben presentar como conteos de remuneraciones.

## Decisiones de presentación

1. No mostrar “cobertura de remuneraciones de Cámara” usando las 58.751 filas.
2. Mostrar módulos separados para asistencias, votaciones, autoridades,
   dietas/remuneraciones y gastos.
3. No sumar fuentes con alcances distintos.
4. Mostrar período y fecha de corte por módulo.
5. Mantener “personal de apoyo” como categoría derivada sólo cuando exista un
   release específico de esa categoría.
6. Si el catálogo no permite separar una categoría, mostrar “alcance no
   determinado” y no calcular porcentaje.

## Estado de implementación

El PR #490 ya incorpora la separación de componentes en `source-health` y la
protección para no calcular cobertura cuando el alcance no está conciliado.
La validación local y CI están verdes, pero el cambio aún no está promovido a
producción. No se modificaron datos ni se ejecutó materialización D1 durante
esta auditoría.

## Próximo paso seguro

Antes de fusionar o promover, verificar en preview que las tarjetas de Cámara
y Senado muestren estas categorías separadas y que ninguna etiqueta diga
“remuneraciones” para el total compuesto de Cámara. Después se puede continuar
con Movimientos usando el mismo criterio de corte por fuente.
