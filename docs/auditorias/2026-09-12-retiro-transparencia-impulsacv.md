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
