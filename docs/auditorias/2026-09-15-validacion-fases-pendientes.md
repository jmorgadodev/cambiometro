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

### Resultado Código del Trabajo

El job `104221344396` terminó correctamente dentro del workflow `34918549350`, con `publish=false`.

- Registros: 329.897.
- Archivos del artefacto: 387.
- Tamaño local del artefacto: 414.181.523 bytes.
- Checksum: `4f31ce55b33a6dd4cc63e8fe1359d2e162cf12069cfc18517f179d87d9176f81`.
- Estado: `valid`.
- Fuente: archivo oficial de Personal Código del Trabajo.
- Líneas procesadas: 16.306.263.
- El artefacto incluye proyecciones por organismo y conserva la fuente original; su publicación permanece bloqueada por el margen de almacenamiento R2.

Con las cuatro categorías centrales validadas, el conteo local del ciclo es de `2.122.881` registros. Este total es una evidencia del artefacto candidato, no un reemplazo del conteo productivo: producción mantiene su release vigente hasta que se resuelva la puerta de almacenamiento.

### Control de calidad estructural del ciclo completo

Se recorrieron las proyecciones JSON locales de las cuatro categorías, sin escribir ni transformar los artefactos. El control verificó nombre, organismo, cargo, período `YYYY-MM`, montos negativos e identificadores repetidos:

| Categoría | Filas | Proyecciones | Nombre/organismo/cargo faltante | Período inválido | IDs duplicados | Bruto cero | Líquido cero |
|---|---:|---:|---:|---:|---:|---:|---:|
| Planta | 297.468 | 447 | 0 | 0 | 0 | 5.038 | 86.927 |
| Contrata | 874.404 | 444 | 0 | 0 | 0 | 22.612 | 243.550 |
| Honorarios | 621.112 | 658 | 0 | 0 | 0 | 5.328 | 184.092 |
| Código del Trabajo | 329.897 | 385 | 0 | 0 | 0 | 5.191 | 90.708 |

No se detectaron montos brutos o líquidos negativos. Los ceros se conservan como observación de calidad del dato de origen; no se reinterpretan como “sin información” ni se reemplazan por estimaciones.

### Estado secuencial del workflow

El workflow completó las cuatro ingestas de forma serializada:

- Planta: `success`.
- Contrata: `success`.
- Honorarios: `success`.
- Código del Trabajo: `success`.

El workflow conserva `publish=false`; por tanto, los artefactos se validan localmente y no alteran el release productivo.

### Consolidación central final

El job de finalización terminó con `success` el `2026-09-15T04:17:38Z`. Su salida verificable fue:

- Versión candidata: `2026-09-15T04-09-07-576Z`.
- Registros consolidados: `2.122.881`.
- Proyecciones generadas: `714`.
- Assets generados: `2.177`.
- Estado de publicación: `published: false`.

La consolidación se ejecutó únicamente en el runner de GitHub con los cuatro artefactos ya descargados; no escribió en R2, no materializó D1 y no reemplazó el release productivo. El conteo y la versión son candidatos de auditoría hasta reconciliar alcance y capacidad de almacenamiento.

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

1. Mantener el candidato consolidado fuera de producción mientras R2 siga en `growth-blocked`.
2. Comparar la cobertura del ciclo contra el release productivo por categoría, período y organismo; no sumar categorías que pertenezcan a otros dominios.
3. Promover sólo si todas las categorías pasan la reconciliación de alcance y existe margen de almacenamiento aprobado.

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

## Verificación posterior a la consolidación — 2026-09-15 01:19 UTC-3

Después de cerrar el candidato central se repitieron las comprobaciones de los dominios dependientes, sin escrituras en R2/D1:

- Historial R2: `16/16` pruebas aprobadas.
- Movimientos: `80` registros; `74` verificados, `6` pendientes; release `movimientos-bbf092656ee6a637`; checksum `bbf092656ee6a637be1f3e9851f1dbd95d33f6f56aac5e891998934470f1e9bf`.
- Historial de remuneraciones: `4.473` entradas, `0` cambios inválidos, `0` lecturas D1 y `0` escrituras D1.
- Cámara y Senado: `27.793` registros categorizados sin mezcla; `769` votaciones, `22.796` gastos y `4.073` personas de apoyo. El release local verificado no contiene asesorías (`0`), por lo que no se presenta esa categoría como cubierta.

Estas verificaciones dejan habilitada la siguiente etapa de reconciliación por fuente, pero no autorizan publicar el candidato central mientras la compuerta de almacenamiento R2 siga bloqueada.

## Revalidación local posterior — 2026-09-15 00:50 UTC-3

Esta sección conserva la fotografía tomada a las 00:50 UTC-3, antes de que terminara Código del Trabajo. La ejecución posterior del mismo workflow quedó documentada arriba.

- Cámara y Senado: `27.793` registros, con categorías separadas y sin mezcla entre autoridades, votaciones, gastos y personal de apoyo.
- Movimientos: `80` registros; `74` verificados, `6` pendientes y `75` con fuente oficial.
- Historial R2: `16/16` pruebas aprobadas.
- Historial de remuneraciones: `4.473` entradas, `0` cambios inválidos, `0` lecturas D1 y `0` escrituras D1.

Estas comprobaciones fueron locales y no alteraron releases, R2, D1 ni producción. En esa fotografía el bloque central estaba en `75%`; el resultado posterior verificó el `100%` de las cuatro categorías de ese bloque.

### Compuerta de publicación R2

La prueba local de `planR2Publication` terminó con `2/2` casos aprobados. El publicador central:

- bloquea el crecimiento cuando el uso proyectado alcanza el `90%` del límite configurado;
- conserva la versión activa anterior para rollback;
- elimina únicamente versiones frías no referenciadas;
- no se ejecuta durante esta validación porque el workflow usa `publish=false`.

Además, el workflow central quedó protegido para exigir dos decisiones separadas antes de una publicación: `publish=true` y `confirm_storage=true`. La segunda sólo debe activarse después de revisar el inventario y el margen R2 vigente. Commit del workflow: `049c855`.

## Control R2 posterior — 2026-09-15 01:20 UTC-3

La auditoría remota de almacenamiento confirmó:

- Uso: `9.016.336.751` bytes de `10.000.000.000` (`90,1633%`).
- Libre: `983.663.249` bytes.
- Objetos: `8.362`.
- Estado: `growth-blocked`; no se permite crecimiento.
- Duplicados por checksum: `3` grupos, `66.508` bytes potencialmente repetidos, con referencias desconocidas; no se elimina nada automáticamente.
- La versión `funcionarios-central-v1` de `2026-09-14T03-51-42-634Z` aparece almacenada pero con `retentionStatus: unclassified`; no se considera release público activo.
- La versión candidata generada el `2026-09-15` no aparece en el inventario R2, consistente con `published: false`.
