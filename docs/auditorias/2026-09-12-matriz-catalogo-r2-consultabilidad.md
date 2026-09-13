# Matriz de catálogo R2 y consultabilidad — 12 de septiembre de 2026

## Alcance

Auditoría sólo de lectura contra producción después de promover el Worker
`8fffd277-d5b5-4330-bdd8-7abc04c18f3a`. No ejecuta ETL, no consulta SQL y no
lee masivamente D1. Cada prueba pidió como máximo una fila por fuente.

La columna `catálogo` es el conteo declarado por `/api/v1/sources`. No debe
presentarse automáticamente como universo consultable. `publicados` y
`esperados` provienen de la respuesta paginada de `/api/v1/records` cuando la
fuente tiene ese camino público.

| Fuente | Catálogo | Resultado de consulta | Publicados | Esperados | Estado | Interpretación |
|---|---:|---:|---:|---:|---|---|
| ChileCompra | 74.142 | 74.142 | 74.142 | 74.142 | completo | Corte actual completo en R2; histórico declarado de 888.693 no es consultable todavía. |
| InfoLobby | 71.467 | 71.467 | 71.467 | 71.467 | completo | Índice R2 acumulado activado y paginable contra el catálogo vigente. |
| Movimientos | 82 | 82 | 82 | — | parcial | Snapshot histórico vigente; no se interpreta como universo total. |
| Ley 19.862 | 62.172 en catálogo | 62.443 | 1.645 | 62.443 | parcial | El catálogo y las particiones publicadas no tienen el mismo alcance; requiere reconciliación antes de mostrar cobertura. |
| Cámara | 58.751 | 58.751 | 49 | 58.751 | parcial | El catálogo agrega componentes; asistencia, votaciones y gastos deben seguir separados. |
| Senado | 1.428 | 1.428 | 50 | 1.428 | parcial | El conteo principal excluye componentes como votaciones y gastos; no debe compararse con el agregado local 8.138. |
| DIPRES | 247.287 | 247.287 | 15.689 | 247.287 | parcial | El catálogo incluye material agregado y el release consultable es menor; no es un buscador individual. |
| CPLT | 1.226.913 | 0 | — | — | temporalmente no disponible | El catálogo existe, pero el endpoint público no entregó filas durante esta comprobación; no convertir a cero ni reemplazar el release anterior. |

## Evidencia transversal

- Health productivo: HTTP 200, `publicDataBackend=r2` y
  `publicD1Reads=false`.
- Home, Movimientos, Municipalidades, Remuneraciones y Personas: HTTP 200.
- La promoción del Worker terminó verde en el workflow `34702718700`.
- ChileCompra e InfoLobby devolvieron `sourceBackend=r2-lake` y
  `missingPartitions=0`.
- Los conteos locales antiguos de InfoLobby (60.523) y ChileCompra histórico
  (888.693) no deben mezclarse con el corte público actual.

## Decisiones operativas

1. Mostrar siempre por separado: catálogo declarado, filas consultables,
   filas publicadas y período.
2. Mantener ChileCompra en 74.142 filas consultables; no presentar 888.693
   como histórico disponible hasta publicar sus particiones verificadas.
3. Mantener InfoLobby en 71.467 filas consultables en R2.
4. No corregir Cámara, Senado, DIPRES, Ley 19.862 ni CPLT mediante una carga
   masiva mientras no exista una matriz de componentes y releases.
5. Mantener R2 como camino público y D1 fuera de la consulta masiva.

## Próximo bloque seguro

Separar en la interfaz el estado de catálogo y consultabilidad, empezando por
ChileCompra. Después reconciliar los componentes de Cámara/Senado y el alcance
de Ley 19.862. La medición de cuota D1 queda reservada para después del reset.
