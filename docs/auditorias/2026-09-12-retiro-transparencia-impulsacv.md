# Retiro operativo de `transparencia-impulsacv`

**Fecha:** 2026-09-12  
**Estado:** retirado del tráfico operativo

## Alcance revisado

Se auditó el repositorio histórico `transparencia.impulsacv.cl`, su Worker
`transparencia-impulsacv`, el dominio `transparencia.impulsacv.cl` y la
relación con D1/R2. Ese proyecto no es el maestro actual del Cambiómetro y no
debe participar en nuevos despliegues ni en procesos de datos.

## Acciones realizadas

- Se retiró el dominio histórico del Worker antiguo.
- Se eliminó el Worker antiguo de Cloudflare.
- Se conservaron D1 y R2 históricos; no se borraron datos compartidos.
- Se deshabilitaron los workflows del repositorio histórico.
- Se conservaron respaldos locales recuperables del repositorio y de los
  worktrees retirados fuera de `Proyectos`.
- Se mantuvieron como únicas raíces operativas locales:
  - `C:\Users\jorge\Proyectos\cambiometro-public`
  - `C:\Users\jorge\Proyectos\cambiometro-audit`
  - `C:\Users\jorge\Proyectos\cambiometro-editorial`

## Verificación posterior

Producción respondió correctamente en:

- `/`
- `/municipalidades/`
- `/remuneraciones-publicas/`
- `/movimientos/`
- `/api/v1/health`
- `/api/v1/sources`

El health productivo observado mantiene:

- backend público: `r2`;
- lecturas públicas D1: `false`;
- fuente de transferencias: `r2`;
- estado HTTP de los endpoints revisados: `200`.

## Regla operativa permanente

`transparencia-impulsacv` queda archivado únicamente como referencia histórica.
No se debe volver a ejecutar, publicar, vincular a un dominio, habilitar sus
workflows ni usarlo como fuente de datos. Los cambios del sitio deben partir de
`cambiometro-public`, las auditorías deben registrarse en `cambiometro-audit`
y los assets editoriales deben permanecer en `cambiometro-editorial`.

La existencia de D1 o R2 históricos no autoriza a reactivar el Worker antiguo:
son recursos compartidos que deben permanecer bajo control del proyecto
canónico y sin consultas masivas desde superficies públicas.

## Comprobación de la estructura local

La revisión del 12 de septiembre confirmó que dentro de
`C:\Users\jorge\Proyectos` sólo permanecen estas tres raíces relacionadas con
el proyecto:

- `cambiometro-public` — maestro y producción;
- `cambiometro-audit` — auditoría y evidencia;
- `cambiometro-editorial` — publicaciones e imágenes.

El antiguo directorio `transparencia.impulsacv.cl_` no existe, el dominio
`transparencia.impulsacv.cl` no resuelve por DNS y la producción vigente
continúa declarando `publicDataBackend: r2` y `publicD1Reads: false`.

Las menciones restantes al nombre antiguo están en documentación histórica y
en una configuración ETL congelada dentro del repositorio de auditoría; no son
una dependencia del maestro ni se ejecutan automáticamente. No se eliminaron
porque forman parte de la evidencia de retiro y del rollback histórico.

La verificación definitiva de que no existe ningún Worker Cloudflare antiguo
con binding a `transparencia-db` sigue requiriendo el permiso **Workers
Scripts → Read** en el token de auditoría. El token actual devuelve `403` para
ese inventario, por lo que no se debe declarar esa parte como comprobada sólo
por la ausencia de carpetas locales.

La comprobación del repositorio remoto sí quedó confirmada mediante GitHub:
`jmorgadodev/transparencia.impulsacv.cl` está archivado, privado, con último
push el 18 de agosto de 2026 y sin ejecuciones posteriores a esa fecha. Sus
últimas verificaciones fueron históricas; el repositorio no es una fuente
activa del proyecto maestro.

El inventario de workflows remoto muestra únicamente `Dependabot Updates`
activo; no hay workflows ETL ni de despliegue activos en ese repositorio.
