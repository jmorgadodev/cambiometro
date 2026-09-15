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

### Resultado Contrata

El job `104221344580` terminó correctamente dentro del workflow `34918549350`, también con `publish=false`.

- Registros: 874.404.
- Proyecciones locales: 444.
- Archivos del artefacto: 446.
- Tamaño local del artefacto: 1.085.731.080 bytes.
- Checksum: `634a217c20e711a0bc737ff2a008c9c32679f80094c43a1c20325f94feca4362`.
- Estado: `valid`.
- Fuente: archivo oficial de Personal Contrata.
- La muestra revisada conserva remuneración bruta/líquida, contrato, período y organismo municipal.

El resultado queda validado localmente, pero no se publica porque el almacenamiento R2 está en estado `growth-blocked` y aún faltan Honorarios y Código del Trabajo.

### Resultado Honorarios

El job `104221344600` terminó correctamente dentro del workflow `34918549350`, con `publish=false`.

- Registros: 621.112.
- Proyecciones/organismos: 658.
- Archivos del artefacto: 660.
- Tamaño local del artefacto: 978.310.741 bytes (aprox. 932,99 MiB).
- Checksum: `2bd624225706837d47636a9ee53d0aea3e262dc4e6852a582075584efaa1bd8d`.
- Estado: `valid`.
- Fuente: archivo oficial de Personal a honorarios.
- El artefacto mantiene el valor original de los campos monetarios y conserva los líquidos no informados como ausencia, no como cero.

El resultado queda validado localmente y no modifica R2, D1 ni el release productivo.

### Estado secuencial del workflow

Tras finalizar Contrata, el workflow continuó de forma serializada:

- Planta: `success`.
- Contrata: `success`.
- Honorarios: `success`.
- Código del Trabajo: `in_progress`, procesando organismos centrales.

El workflow conserva `publish=false`; por tanto, los artefactos se validan localmente y no alteran el release productivo.

La validación técnica posterior corrigió tres incompatibilidades de tipado en pruebas de cierre R2 y en la firma del parser CPLT:

- `npm run typecheck`: aprobado.
- `npm run api:typecheck`: aprobado.
- Pruebas específicas de cierre R2 y parser CPLT: 15/15 aprobadas.
- ESLint y `git diff --check`: aprobados.
- Commit: `b260193`.

La suite completa quedó estable con ejecución serializada para evitar timeouts por concurrencia de artefactos grandes y SQLite temporal:

- 198 archivos de prueba aprobados.
- 1.080 pruebas aprobadas.
- Commit de estabilización: `d268f62`.

## Siguiente puerta

1. Esperar el resultado terminal del job Código del Trabajo.
2. Revisar su artefacto, conteo, checksum y calidad antes de considerar completo el bloque central.
3. Mantener los cuatro resultados como validación local mientras R2 siga en `growth-blocked`.
4. Promover sólo si todas las categorías pasan calidad y existe margen de almacenamiento aprobado.

Hasta entonces, producción conserva su release vigente.

## Revalidación del historial R2

Se corrigió el parser de montos del historial para interpretar formatos monetarios publicados como `$1.250.000`, sin modificar el valor original de la fila. La comparación conserva la diferencia numérica y la procedencia de ambas versiones.

- Commit de auditoría: `7123ba2`.
- `npm run check:r2-history`: 16 pruebas aprobadas.
- Validación combinada de historiales, movimientos y contratos: 30 pruebas aprobadas.
- ESLint y `git diff --check`: aprobados.
- Sin escrituras en R2/D1 y sin promoción a producción.

La batería consolidada posterior cubrió 11 archivos y 96 pruebas, incluyendo auditoría R2, almacenamiento, historiales, movimientos, categorías legislativas y contratos de normalización; todas terminaron correctamente.

La validación adicional de `lib/api-v1.test.ts` y `lib/api-cache.test.ts` terminó con 63/63 pruebas aprobadas: el camino público prioriza R2 y evita D1 para búsquedas masivas, índices, fuentes, Cámara, transferencias y registros cuando existe un release publicado.

## Revalidación local posterior — 2026-09-15 00:50 UTC-3

Se repitieron las validaciones acotadas mientras el workflow remoto continúa procesando Código del Trabajo:

- Cámara y Senado: `27.793` registros, con categorías separadas y sin mezcla entre autoridades, votaciones, gastos y personal de apoyo.
- Movimientos: `80` registros; `74` verificados, `6` pendientes y `75` con fuente oficial.
- Historial R2: `16/16` pruebas aprobadas.
- Historial de remuneraciones: `4.473` entradas, `0` cambios inválidos, `0` lecturas D1 y `0` escrituras D1.

Estas comprobaciones son locales y no alteran releases, R2, D1 ni producción. El bloque central permanece en `75%` hasta que Código del Trabajo termine y su artefacto pase la misma validación por fuente.

### Compuerta de publicación R2

La prueba local de `planR2Publication` terminó con `2/2` casos aprobados. El publicador central:

- bloquea el crecimiento cuando el uso proyectado alcanza el `95%` del límite configurado;
- conserva la versión activa anterior para rollback;
- elimina únicamente versiones frías no referenciadas;
- no se ejecuta durante esta validación porque el workflow usa `publish=false`.
