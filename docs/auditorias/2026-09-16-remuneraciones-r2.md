# Auditoría de remuneraciones CPLT en R2 — 2026-09-16

## Resultado

La búsqueda productiva de remuneraciones consulta dos proyecciones R2
separadas y no sólo municipalidades:

| Proyección | Release | Registros | Activos | Sin publicación | Último corte observado |
| --- | --- | ---: | ---: | ---: | --- |
| Municipalidades | `2026-09-15T08-08-44-566Z` | 1.243.761 | 323 de 346 | 23 de 346 | 2026-09-15 |
| Organismos centrales | `2026-09-14T03-51-42-634Z` | 2.110.434 | proyección por organismo | no aplica | 2026-09-14 |
| **Total CPLT consultable** | — | **3.354.195** | — | — | — |

La suma anterior es informativa: no fusiona personas ni reemplaza registros.
Cada fila mantiene su proyección, organismo, período, monto y procedencia.

## Evidencia de búsqueda productiva

Las consultas fueron acotadas a 20 filas y se realizaron contra el Worker
público, que responde desde R2:

| Consulta | Resultado | Procedencia observada |
| --- | ---: | --- |
| Sofía Pumpin | 1 | Organismos centrales |
| Lucy Depablos | 3 | Registros CPLT publicados |
| Valentina Andrea Latorre Rincon | 3 | Organismos centrales |
| Romer Angel Rubio Flores | 4 | Registros CPLT publicados |
| Río Sebastián Torrealba del Río | 1 | Organismos centrales |
| Torrealba, con `scope=all` | 1.547 coincidencias | Municipalidades y organismos centrales |

El parámetro `scope=all` es el camino combinado. Las rutas antiguas sin
`scope` mantienen por compatibilidad el alcance municipal; no debe usarse ese
resultado para afirmar que no existen registros centrales.

## Diferencia detectada en la interfaz y manifiestos

El manifiesto estático de `remuneraciones-unified` contiene 33.776 filas de
38 bis, Cámara y Senado. CPLT no se copia a esas páginas: se consulta de forma
remota mediante los índices R2. Sin embargo, la tarjeta estática de CPLT aún
declara 1.203.287 registros, valor de un release anterior. La comparación es:

| Valor | Registros |
| --- | ---: |
| Tarjeta/manifiesto estático antiguo | 1.203.287 |
| Proyección municipal productiva | 1.243.761 |
| Diferencia municipal | +40.474 |
| Proyección central productiva no declarada en esa tarjeta | 2.110.434 |

Por lo tanto, no corresponde presentar el valor estático antiguo como total
actual de Transparencia Activa. Antes de promover una corrección visual debe
decidirse si la tarjeta mostrará el total combinado consultable o dos cifras
separadas por alcance. La segunda opción es más trazable y evita mezclar
municipalidades con organismos centrales.

## Calidad y cobertura que quedan pendientes

- El release municipal tiene 23 municipalidades sin publicación en el corte
  observado. No se deben convertir en cero ni ocultar.
- El release central tiene 2.110.434 filas distribuidas por organismo, pero su
  manifiesto no usa la misma estructura `coverage` municipal. Su auditoría debe
  usar los assets y sus checksums por organismo.
- La tarjeta estática y el catálogo productivo no tienen todavía una fuente
  única de conteo. Esto es un problema de presentación/metadatos, no evidencia
  de que los registros R2 estén ausentes.
- Deben conciliarse duplicados aparentes por persona, organismo y período sin
  borrar filas de fuentes distintas.
- Los historiales de altas, bajas y cambios de monto deben construirse después
  de esta conciliación y por lotes pequeños.

## Decisión operativa

No se descargó el universo completo, no se escribió en R2, no se escribió en
D1 y no se modificó ningún release. La siguiente modificación segura es
corregir la presentación de cobertura para que no muestre el conteo antiguo y
separe explícitamente municipalidades de organismos centrales. Después se
validarán nombres, períodos, montos y duplicados con muestras acotadas.
