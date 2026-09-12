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

El repositorio local `transparencia.impulsacv.cl_` y el Worker Cloudflare
`transparencia-impulsacv` fueron retirados el 12 de septiembre de 2026. Se
quitó el dominio `transparencia.impulsacv.cl`, se eliminó el Worker y se
deshabilitaron sus workflows ETL. La base `transparencia-db` y el bucket R2
no fueron eliminados.

El repositorio remoto permanece archivado y sin ejecución ETL como respaldo frío
de releases históricos que el código maestro todavía puede consultar sólo si
un artefacto R2 no está disponible. No es una fuente de producción ni un
entorno de trabajo.

## Recuperación

Las referencias Git de los worktrees retirados quedaron respaldadas en:

`C:\Users\jorge\AppData\Local\Temp\cambiometro-retired-worktrees-20260912`

Ese directorio contiene bundles Git, no una segunda carpeta operativa.
