# Personal de apoyo Senado: septiembre y revisión diaria

## Referencia y alcance

Worktree canónico: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.
Rama puntual basada en `origin/main` `4cd5cf3e`:
`codex/senado-apoyo-septiembre-20261008`. No desplegar PR #719 ni sustituir
sus correcciones pendientes: permanece en `codex/confianza-evidencia-20261007`.

Autorización de Jorge: actualizar y publicar apoyo Senado, revisar diariamente
y publicar sólo cambios válidos. No habilita D1 remota ni un bypass de costes.
El diseño y las demás fuentes no cambian. Cámara conserva su release bloqueado.

## Causa comprobada

- ETL Senado `37339561783`, 05-10-2026: success; 3.407 filas, enero–agosto.
- API oficial filtrada por año 2026/mes 9: 420 filas. Muestra consultada publicada
  el 06-10-2026 (`publishedAt=2026-10-06T17:17:53.186Z`). No se generaliza esa
  hora a las 420 filas sin recorrerlas.
- Producción consultada el 08-10-2026: ficha Pedro Araya selecciona agosto;
  pin `data/personal-apoyo.json` SHA
  `da2f4319ea9a5b81f40bed4c97005281a5867abd9086c17641c78bc650a171a7`.
- Calendario anterior sólo lunes: la publicación oficial posterior a la última
  ejecución no podía aparecer antes del siguiente ciclo del 12-10-2026.
- Cámara `37333599905` falló con `PERSONAL_APOYO_SOURCE_BLOCKED`; no es la misma causa.

## Cambio y prevención

- Cron Senado diario a las 07:30 UTC (04:30 Chile en horario de verano).
- Se conserva el nombre histórico del workflow para no romper sus consumidores.
- Recuperar y verificar checksum del baseline R2 antes de extraer, como ya existía.
- Comparar candidato validado contra baseline, ignorando sólo `generado_en` y
  orden de claves/filas. Montos, períodos, duplicados, nulos y ceros permanecen
  distinguibles; ninguna fila se modifica para comparar.
- Contenido idéntico: cero PUT, release nuevo, despliegue Pages o espera de guardia
  de publicación. La consulta diaria al origen sí consume peticiones.
- Cambio: guardas existentes de tamaño a nivel de cuenta, publicación `--skip-d1`,
  puntero de activación al final y rollback anterior. No se agregan backups.
- `--skip-d1` se respeta también en la ruta de error de activación.

## Validación y cierre

Seis regresiones RED antes del cambio; 31 pruebas dirigidas GREEN después.
Tipos, lint de archivos modificados, arquitectura, enlaces y calendario aprobados.
La suite completa encontró únicamente el contrato de cron semanal antiguo
(1.590 pruebas aprobadas y una fallida); contrato actualizado y sus 22 pruebas
aprobadas. El CI limpio debe confirmar la suite completa antes de fusionar.
Calidad, CI, promoción, conteos de septiembre, preservación Cámara, estado
productivo y repetición sin cambios: pendientes de completar. No declarar cerrado
el ciclo ni funcionamiento diario hasta registrar esas evidencias aquí.

Este cierre puntual no certifica identidades o contratos de todas las filas,
otros años, la recuperación de Cámara ni el 100% de la auditoría global.
