# Operación vigente — 18 de noviembre de 2026

## Raíces

| Responsabilidad | Ubicación |
|---|---|
| Web, API, ETL y documentación | C:\\Users\\jorge\\Proyectos\\cambiometro-public |
| Aplicación | transparencia-app dentro del repositorio web |
| RRSS | C:\\Users\\jorge\\Proyectos\\cambiometro-editorial |
| Respaldo de consolidación | C:\\Users\\jorge\\Backups\\Cambiometro\\20261118-consolidacion |

El remoto web es https://github.com/jmorgadodev/cambiometro. La base verificada al iniciar fue `7624b8ea`; comprobar el remoto actual antes de cualquier tarea. Los repositorios audit y las carpetas de fases se retiran como fuentes operativas después de verificar respaldos y migrar sus ejecutores. Las instrucciones anteriores están en [histórico](operations/workspace-history-through-202610.md), sin vigencia operativa.

## Procedimiento de trabajo

1. Desde la raíz canónica: comprobar status, remoto y rama; obtener origin/main.
2. Tomar una tarea del [tablero](../tasks/consolidacion/todo.md) o de un módulo. Crear rama codex y, si hace falta, un worktree temporal fuera de Proyectos.
3. Registrar alcance y archivos compartidos. Implementar una entrega verificable, revisar diff y abrir PR.
4. Integrar con CI verde. Actualizar main canónico sin reemplazar trabajo local.
5. UI-only recupera el release vigente de R2 mediante pages-ui-refresh. No construir para producción con datos Git antiguos.
6. Verificar preview, SHA, release-set, períodos, importes y referencia visual. Promover el mismo artefacto con pages-promote-artifact; conservar rollback.

## Automatización

El inventario remoto vigente está en [.github/etl-calendar.json](../.github/etl-calendar.json). Las fuentes pausadas tienen cronUtc nulo y status paused. Sólo las fuentes parlamentarias y Movimientos mantienen extracción automática. Salud, backup y seguridad continúan activos. Un refresco de UI no extrae datos.

Las tareas Windows deben ejecutar exclusivamente scripts de `cambiometro-public/transparencia-app/scripts`, con working directory canónico, mismos horarios/principal/settings y ejecutores que aíslan candidatos cuando corresponda. Las rutas de worktrees no son estables y no deben instalarse como tareas permanentes.

Consultar [catálogo por módulos](modules/README.md), [modo UI/datos](deploy-modes.md) y [contrato del release](operations/release-set-contract-20261001.md).

## Recuperación

El respaldo contiene dos bundles de historia completa, inventarios SHA256, cambios pendientes por worktree y XML de tareas. Para rescatar código: clonar el bundle en un directorio de recuperación, localizar source.txt del worktree y restaurar sus archivos/patch. Revisar el cambio sobre main actual; nunca desplegar el árbol rescatado completo. No publicar el respaldo: puede contener configuración local privada.

Para rollback web: elegir el despliegue previamente verificado y comprobar dominio, home, fichas y release-set. Para datos: conservar el último release válido si falla el origen; no sustituirlo por fixtures versionadas.
