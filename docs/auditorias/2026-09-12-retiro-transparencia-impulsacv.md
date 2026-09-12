# Retiro operativo de `transparencia-impulsacv`

**Fecha:** 2026-09-12  
**Estado:** retirado del tráfico operativo

## Alcance revisado

Se auditó el repositorio histórico `transparencia.impulsacv.cl`, su Worker
`transparencia-impulsacv`, el dominio `transparencia.impulsacv.cl` y la
relación con D1/R2. Ese proyecto no es el maestro actual del Cambiómetro y no
debe participar en nuevos despliegues ni en procesos de datos.

## Estado comprobado

- El repositorio histórico está archivado y privado.
- Todos sus workflows ETL y de despliegue están deshabilitados; sólo queda
  Dependabot activo.
- No existe un checkout local del repositorio histórico dentro de
  `C:\Users\jorge\Proyectos`.
- El dominio histórico no resuelve por DNS.
- Se conservaron D1 y R2 históricos; no se borraron datos compartidos.
- Se conservaron respaldos locales recuperables del repositorio y de los
  worktrees retirados fuera de `Proyectos`.

La revisión del código histórico encontró una configuración `transparencia-etl-legacy`
con cron diario (`1 4 * * *`) y binding a `transparencia-db`. Esto prueba que el
repositorio antiguo tenía una vía potencial de consumo de D1, pero no prueba que
el Worker siga desplegado hoy. El archivo remoto es evidencia histórica; no se
ejecuta desde GitHub porque el repositorio está archivado y sus workflows están
deshabilitados.

La eliminación o permanencia del Worker histórico no puede afirmarse desde el
token de auditoría actual porque no incluye `Workers Scripts -> Read`. Por eso
queda como verificación pendiente de infraestructura, no como una acción
confirmada. Para desconexión definitiva se debe listar el Worker en Cloudflare
y, si existe, retirar su trigger o eliminarlo con autorización explícita; esa
acción no se ejecutó con un token de sólo lectura.
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
ese inventario, por lo que esa parte queda explícitamente pendiente de
infraestructura y no se declara eliminada sólo por la ausencia de carpetas
locales.

La comprobación del repositorio remoto sí quedó confirmada mediante GitHub:
`jmorgadodev/transparencia.impulsacv.cl` está archivado, privado, con último
push el 18 de agosto de 2026 y sin ejecuciones posteriores a esa fecha. Sus
últimas verificaciones fueron históricas; el repositorio no es una fuente
activa del proyecto maestro.

El inventario de workflows remoto muestra únicamente `Dependabot Updates`
activo; no hay workflows ETL ni de despliegue activos en ese repositorio.

## Revisión de cierre operativo — 09:38 UTC-3

Se repitió la comprobación sin escribir en Cloudflare, GitHub ni D1:

- `C:\Users\jorge\Proyectos` contiene sólo `cambiometro-public`,
  `cambiometro-audit` y `cambiometro-editorial` entre las carpetas del proyecto.
- `jmorgadodev/transparencia.impulsacv.cl` continúa archivado y privado; su
  inventario remoto conserva únicamente Dependabot y no tiene ETL ni despliegue
  activo.
- `transparencia.impulsacv.cl` no resuelve por DNS.
- El repositorio canónico es `jmorgadodev/cambiometro`, con producción
  configurada para `cambiometro-public-api`, Pages `cambiometro` y el dominio
  `cambiometro.impulsacv.cl`.
- La búsqueda de referencias ejecutables en el maestro no encontró URLs del
  repositorio o dominio retirados. Las menciones restantes están en auditoría,
  documentación histórica o el directorio ETL congelado; no hay workflow actual
  que invoque ese `wrangler.toml`.
- El health público observado vuelve a declarar `publicDataBackend: r2` y
  `publicD1Reads: false`.

El token de auditoría utilizado no tiene `Workers Scripts -> Read`, por lo que
la API de Cloudflare responde `10000 Authentication error` al intentar listar
las versiones del Worker `transparencia-impulsacv` y del Worker canónico. Esto
impide una confirmación independiente del inventario de Workers desde CLI,
pero no muestra una conexión operativa desde el repositorio antiguo.

Como control adicional, se revisó `origin/main` del repositorio canónico: los
ETL programados conservan R2/Pages como salida pública y sus pasos de
materialización remota D1 están condicionados a `workflow_dispatch`, preflight
de cuota y autorización explícita. El backup D1 semanal también requiere una
confirmación manual. Por tanto, los workflows activos no implican por sí solos
lecturas o escrituras remotas D1 en cada ejecución programada.

### Decisión operativa

Desde esta fecha sólo se trabaja en las tres raíces definidas en
`docs/OPERACION-WORKSPACE.md`. El repositorio antiguo queda fuera del flujo y no
se debe ejecutar, desplegar ni usar como fallback. No se elimina D1/R2 porque
son recursos compartidos del proyecto canónico y su eliminación sería una
acción distinta y destructiva.
