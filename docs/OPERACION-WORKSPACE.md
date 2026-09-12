# Espacio operativo único de El Cambiómetro

Desde el 12 de septiembre de 2026, las únicas carpetas de trabajo activas son:

| Carpeta | Responsabilidad |
|---|---|
| `C:\Users\jorge\Proyectos\cambiometro-public` | Proyecto maestro, Pages, API pública, ETL y configuración R2/D1 |
| `C:\Users\jorge\Proyectos\cambiometro-audit` | Auditorías, diagnósticos, manifiestos y evidencia de operación |
| `C:\Users\jorge\Proyectos\cambiometro-editorial` | Imágenes, borradores y herramientas editoriales de redes sociales |

## Regla operativa

No se deben crear clones, worktrees ni carpetas de fases adicionales dentro de
`C:\Users\jorge\Proyectos` sin registrarlos primero en esta bitácora y sin
confirmar que no duplican el proyecto maestro.

## Producción vigente

- Sitio: `https://cambiometro.impulsacv.cl`
- API pública: Worker `cambiometro-public-api`
- Datos públicos: R2 `transparencia-public-data`
- D1 compartida: `transparencia-db`, sólo como proyección operativa acotada
- Lecturas públicas de D1: desactivadas (`ALLOW_PUBLIC_D1_READS=0`)

## Proyecto retirado

El repositorio local `transparencia.impulsacv.cl_` y el flujo operativo del
proyecto histórico quedaron retirados el 12 de septiembre de 2026. El dominio
`transparencia.impulsacv.cl` no resuelve y sus workflows ETL están
deshabilitados. La base `transparencia-db` y el bucket R2 no fueron eliminados.

El repositorio histórico contiene una configuración congelada de un Worker
`transparencia-etl-legacy` que declaraba un cron diario y binding a D1. Eso es
evidencia histórica. El panel autenticado de Cloudflare confirmó que
`transparencia-impulsacv` y `transparencia-etl-legacy` no existen actualmente,
por lo que no hay un cron desplegado de ese proyecto. La CLI aún no puede
enumerar todos los Workers por falta de `Workers Scripts -> Read`; cualquier
consumo actual de D1 debe auditarse contra los servicios vigentes, no contra
este repositorio retirado.

El repositorio remoto permanece archivado y sin ejecución ETL como respaldo
histórico fuera del flujo operativo. El código maestro no lo consulta: si falta
un artefacto en R2, la respuesta conserva el estado de partición incompleta y
no intenta recuperar datos desde el repositorio retirado. No es una fuente de
producción ni un entorno de trabajo.

## Recuperación

Las referencias Git de los worktrees retirados quedaron respaldadas en:

`C:\Users\jorge\AppData\Local\Temp\cambiometro-retired-worktrees-20260912`

Ese directorio contiene bundles Git, no una segunda carpeta operativa.
