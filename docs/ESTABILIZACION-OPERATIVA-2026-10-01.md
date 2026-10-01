# Estabilización operativa — estado y ruta canónica

Tablero vigente: [plan](../tasks/stability/plan.md),
[puertas y porcentajes](../tasks/stability/todo.md) y
[evidencia de cierre](../tasks/stability/evidence.md). La tabla resumida al
final sólo indica bloques; el porcentaje verificable está en el tablero.

## Dónde trabajar

El repositorio canónico es `C:\Users\jorge\Proyectos\cambiometro-public`.
Su checkout local puede estar atrasado o contener trabajo del usuario. La base
para cualquier cambio y despliegue es `origin/main`; se trabaja en una rama
`codex/` dentro de un worktree aislado bajo `C:\Users\jorge\.codex\worktrees`.
`cambiometro-audit` es para evidencia, no para desplegar la aplicación. Nunca
se copia el árbol del checkout divergente para crear un release.

## Incidente que inicia este cierre

El workflow `pages-ui-refresh.yml` restauraba `data/movimientos.json` desde el
commit después de hidratar los datos. Ese archivo podía ser anterior al release
R2 y hacer retroceder la cronología en un despliegue de interfaz. El workflow
`etl-movimientos.yml` tenía además una alternativa que retomaba el archivo de
Git si faltaba el manifiesto R2, y un modo manual que republicaba el release
reconciliado de 46 registros de septiembre. Ambas rutas son incompatibles con
R2 como fuente canónica y se retiraron. La copia anterior para el ETL se obtiene
ahora de una entrada R2 verificada por checksum.

## Contrato operativo inmediato

1. El ETL lee el release vigente y sólo publica un candidato validado. Si el
   origen o R2 no responde, conserva el release anterior.
2. Un cambio `ui-only` lee el manifiesto R2 y rehidrata Movimientos aunque haya
   caché; nunca privilegia archivos versionados. D1 productiva no participa.
3. Una publicación de datos se valida por grupo antes de reconstruir Pages. No
   se interpreta un corte sin filas como cero oficial sin certificación.
4. El rollback debe apuntar a un release R2 identificado y verificado. El
   respaldo no se borra ni compacta antes de una prueba de restauración.
5. Los avisos públicos expresan período, cobertura y estado de evidencia. Los
   errores de conectores y detalles de infraestructura quedan sólo en informes
   operativos.

## Pendientes para considerar estable el sistema

| Bloque | Estado | Criterio de cierre |
| --- | --- | --- |
| Impedir retroceso de Movimientos en `ui-only` y ETL | Cerrado en producción (PR #666) | Despliegue y comprobación productiva registrados en el tablero |
| Registro de fuentes y `ReleaseSet` R2 completo | Pendiente | IDs, checksum, conteos y períodos de cada dominio, con promoción atómica |
| Guardia ETL compartida y migración por fuente | Pendiente | Cero inesperado, reducción, duplicados, sin cambios y fallo externo probados |
| Monitoreo diario sin alertas repetidas | Pendiente | Estado por fuente y comparación R2/API/Pages sin extracción |
| Votaciones Senado local-only y conectores bloqueados | Pendiente de auditoría | Calendario y degradación documentados sin reemplazar release |
| Presupuesto R2 y restauración de respaldo | Pendiente | Margen calculado por cuenta y restauración verificada |
| Observación continua | No iniciada | Siete días sin regresión de releases |

No se declara la plataforma terminada por aprobar una prueba de código; el
criterio de siete días sólo empieza después de que los controles estén en
producción. ChileCompra sigue al final y conserva su último release válido.
