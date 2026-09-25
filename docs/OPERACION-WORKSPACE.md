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

### Checkout vigente y promoción de cambios

- El repositorio maestro es `C:\Users\jorge\Proyectos\cambiometro-public` y
  la aplicación está en `transparencia-app\`. Esta ruta identifica el
  repositorio, no garantiza que su checkout local sea la versión vigente.
- Antes de editar o desplegar, comprobar `git status --short --branch`,
  `git fetch origin`, `git log -1 --oneline HEAD` y
  `git log -1 --oneline origin/main`. Si hay cambios locales, preservarlos; no
  cambiar de rama, actualizar ni desplegar desde ese checkout hasta aislarlos.
- El código de producción se toma de `origin/main`, no de una rama local llamada
  `main` por su nombre. Si el checkout está atrasado, trabajar desde una rama
  basada en `origin/main` en el worktree de tarea ya existente; no crear copias
  dentro de `Proyectos` ni acumular worktrees innecesarios.
- Una corrección visual sólo se considera terminada cuando: tiene una prueba de
  regresión, pasa sus validaciones, entra en `main`, el artefacto exacto de ese
  commit se promueve y la URL productiva muestra el resultado esperado.
- Antes de afirmar que se publicó, inspeccionar la respuesta/render productivo
  para el elemento solicitado. Un despliegue de otra tarea (por ejemplo SEO)
  no acredita que un cambio de footer, menú o diseño haya sido incluido.

### Incidente de footer — 25-09-2026

En esta revisión, el checkout de `cambiometro-public` en `Proyectos` estaba en
`8fb1fe9`, con dos archivos de interfaz modificados localmente y divergencia
respecto de `origin/main` (6 commits locales y 508 commits por detrás, según
`git status`). Esos cambios se preservaron sin sincronizarlos ni usarlos para
la publicación. La corrección se preparó en una rama limpia basada en el
`origin/main` actualizado (`b751308`), en el worktree ya existente bajo
`C:\Users\jorge\.codex\worktrees`.

El footer productivo seguía mostrando “Estado del catálogo” y “Sostenibilidad
Ciudadana”, aunque se había solicitado retirarlos. El rastreo de Git atribuyó
ambos bloques al rediseño compartido incorporado el 22-09-2026; la solicitud
posterior de quitarlos no llegó a `origin/main`. La publicación SEO del
25-09-2026 no los reintrodujo: simplemente no contenía esa corrección. La
prueba anterior incluso exigía que el bloque de estado continuara, por lo que
no protegía la decisión más reciente.

La regresión se corrige retirando ambos bloques y sus estilos del footer,
conservando la misión y el enlace “Donar y apoyar” hacia `/donar`. La prueba
debe exigir que los dos bloques estén ausentes. No copiar el footer ni el
proyecto desde `cambiometro-audit` al repositorio maestro.

El cierre productivo se confirmó el 25-09-2026: PR #627, commit de producción
`ada43535ed46c4513ca019bb6d3e992dd0c3f875`, artefacto verificado del run
`36093610766` y deployment `bfff1571-61e6-446a-9723-cfb20f6c04c8`. La página
productiva devolvió HTTP 200; el HTML y la revisión en navegador confirmaron
ausentes ambos bloques, presente la misión y conservado el enlace a `/donar`.

El 25-09-2026 se promovieron además los metadatos SEO de fichas parlamentarias
del PR #628 usando el artefacto del run `36094686045`. Deployment
`cdf08329-34eb-4283-bccb-3a6495b492f8`; se verificó en producción el título,
la descripción y la canonical de Javiera Morales, sin el cargo masculino
genérico ni la descripción duplicada. Los pendientes de Search Console
(URLs 404, canónicas y medición de CTR) continúan abiertos; no se infieren
redirecciones a partir de conteos agregados.

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
