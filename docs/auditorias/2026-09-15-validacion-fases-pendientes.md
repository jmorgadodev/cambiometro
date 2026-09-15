# Validación de fases pendientes — 2026-09-15

## Alcance

Validación local, acotada y sin escrituras en R2 ni D1 de los bloques que siguen a la línea base: categorías parlamentarias, movimientos, historiales de remuneraciones y margen de almacenamiento.

## Resultados verificables

### Cámara y Senado

`npm run check:legislative-normalization` terminó correctamente.

- 27.793 registros auditados.
- 769 votaciones: 580 Cámara y 189 Senado.
- 22.796 gastos operacionales: 16.275 Cámara y 6.521 Senado.
- 4.073 registros de personal de apoyo: 1.084 Cámara y 2.989 Senado.
- 155 autoridades parlamentarias.
- 0 registros clasificados simultáneamente en categorías distintas.

La auditoría confirma que remuneraciones/personas, votaciones, gastos y personal de apoyo se mantienen separados. Los conteos son del artefacto local auditado; no se usan para sustituir el release productivo.

### Movimientos

`npm run check:movimientos-normalization` terminó correctamente.

- 80 registros en el release local.
- 74 verificados y 6 pendientes.
- 75 con fuente oficial.
- 6 con observaciones de calidad.
- Release: `movimientos-bbf092656ee6a637`.
- Checksum: `bbf092656ee6a637be1f3e9851f1dbd95d33f6f56aac5e891998934470f1e9bf`.

Los pendientes no se convierten en registros confirmados y el release anterior se conserva cuando una fuente no responde.

### Historiales desde R2

`npm run check:r2-history` terminó con 15 pruebas aprobadas.

`npm run check:remuneraciones-history` terminó correctamente:

- 4.473 entradas de historial verificadas.
- 0 cambios inválidos.
- 0 lecturas D1.
- 0 escrituras D1.
- Comparación vigente del artefacto local: 52 entradas, 50 salidas observadas y 438 cambios de monto.

### Almacenamiento

La auditoría remota mantiene el bloqueo de crecimiento:

- Uso: 9.016.336.751 bytes de 10.000.000.000.
- Ocupación: 90,16%.
- Margen libre: 983.663.249 bytes.
- No se eliminó ningún objeto porque existen referencias aún no clasificadas.
- La proyección central candidata de aproximadamente 4,48 GB no está autorizada para publicación.

### Acceso a métricas D1

La auditoría comprobó que la sesión actual puede autenticarse y listar bases D1, pero la consulta de Analytics GraphQL y `wrangler d1 insights` responden `not authorized`. La causa operativa comprobada es que el proceso de Codex conserva una credencial anterior a la renovación del token; por ello no se debe interpretar la ausencia de métricas como consumo cero. La lectura quedará habilitada cuando la nueva credencial se cargue en una sesión nueva y vuelva a pasar el preflight.

## Proceso central en curso

La ejecución manual de validación `34918549350` procesa la categoría Planta con `publish=false`. Los jobs restantes están en cola por diseño (`max-parallel: 1`). No ha publicado R2 ni modificado producción.

### Resultado Planta

La categoría Planta terminó correctamente antes de continuar con Contrata:

- 297.468 registros.
- 447 organismos con proyección.
- Checksum: `d9ddf00435b95755199711fcd48589b4dba5e0635843a1983f12e873485c3818`.
- 0 nombres faltantes.
- 0 montos negativos.
- 82.082 líquidos no informados, conservados como ausencia y no como cero.
- 25 filas del mes corriente `2026-09`; no se detectaron períodos con formato inválido.

El artefacto tiene estado `valid`, pero sigue siendo sólo un resultado de validación local porque el workflow fue ejecutado con `publish=false`.

## Siguiente puerta

1. Esperar el resultado terminal del job Planta.
2. Revisar el artefacto y sus conteos/checksum.
3. Ejecutar las otras tres categorías en el mismo ciclo secuencial.
4. Promover sólo si todas las categorías pasan calidad y existe margen de almacenamiento aprobado.

Hasta entonces, producción conserva su release vigente.

## Revalidación del historial R2

Se corrigió el parser de montos del historial para interpretar formatos monetarios publicados como `$1.250.000`, sin modificar el valor original de la fila. La comparación conserva la diferencia numérica y la procedencia de ambas versiones.

- Commit de auditoría: `7123ba2`.
- `npm run check:r2-history`: 16 pruebas aprobadas.
- Validación combinada de historiales, movimientos y contratos: 30 pruebas aprobadas.
- ESLint y `git diff --check`: aprobados.
- Sin escrituras en R2/D1 y sin promoción a producción.
