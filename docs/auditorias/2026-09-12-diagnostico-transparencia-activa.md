# Diagnóstico de Transparencia Activa (CPLT)

**Fecha del diagnóstico:** 2026-09-12  
**Alcance:** sólo lectura; no se ejecutó ETL ni se modificó producción.

## Conteos y cortes

| Artefacto | Registros | Corte/generación | Observación |
|---|---:|---|---|
| Manifiesto local `funcionarios-v1` | 1.220.960 | 2026-08-30 08:05:27 | Suma de cuatro nóminas de personal |
| `source-health` local | 1.218.136 | 2026-08-21 03:35:33 | Corte anterior al manifiesto |
| Catálogo productivo | 1.226.913 | 2026-09-02 03:28:30 | Resumen publicado |

La diferencia entre el manifiesto local y el catálogo productivo es de 5.953
registros. Es compatible con un corte productivo más nuevo, pero no debe
presentarse como una pérdida o ganancia definitiva sin comparar release y
checksum del artefacto R2 correspondiente.

## Cobertura municipal clasificada

El manifiesto local contiene las 346 comunas y las distribuye así:

| Estado | Comunas |
|---|---:|
| Nómina disponible | 320 |
| Sin nómina publicada | 25 |
| No aplicable | 1 |

La clasificación incluye el motivo operativo correcto: los 25 casos no deben
convertirse en cero y Antártica debe permanecer separada como no aplicable.

## Disponibilidad productiva actual

Se consultó el endpoint de registros con `source=cplt`,
`source=transparencia-activa` y `source=cplt-personal-planta`. Los tres
respondieron HTTP 200, pero con:

```text
total: 0
sourceBackend: none
sourceStatus: temporarily-unavailable
availability: summary-only-or-d1-quota
reason: r2-unavailable
```

Esto significa que producción entrega el resumen del catálogo, pero no puede
entregar filas detalladas de CPLT por R2 en este momento. La ruta no usa D1 como
respaldo masivo, lo que protege la cuota pero deja inhabilitada la búsqueda
detallada de remuneraciones CPLT mientras R2 no esté disponible.

## Hallazgos

1. La cobertura municipal local está estructurada y distingue disponibles,
   ausentes y no aplicable.
2. Los conteos locales están desfasados respecto de producción; no deben
   reemplazar al catálogo productivo.
3. El problema actual no es sólo de interfaz: el backend público declara R2 no
   disponible para CPLT.
4. El resumen de 1.226.913 no prueba que las 1.226.913 filas sean consultables
   ahora; la API debe informar esta diferencia explícitamente.
5. No se debe reactivar un fallback global a D1 para resolverlo, porque
   volvería a poner en riesgo la cuota compartida.

## Decisión de fase

La fase de Transparencia Activa queda en **diagnóstico con disponibilidad R2
pendiente**. Antes de nuevas mejoras de historial, altas, bajas o cambios de
remuneración hay que verificar el objeto/manifiesto R2 productivo y restaurar
la lectura paginada del release, sin modificar los originales ni usar D1 para
escaneos masivos.

