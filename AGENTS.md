# Cambiómetro: instrucciones para agentes

## Identidad y base
- Único repositorio web: `C:\\Users\\jorge\\Proyectos\\cambiometro-public`, remoto `jmorgadodev/cambiometro`.
- Aplicación: `transparencia-app`. RRSS pertenece a `cambiometro-editorial`, repositorio separado.
- Antes de editar: leer `docs/OPERACION-WORKSPACE.md`, `docs/modules/README.md` y el módulo asignado; comprobar raíz Git, remoto, estado, rama y SHA de origin/main.
- Obtener origin/main antes de iniciar. No usar el nombre local main como prueba de vigencia. No editar desde detached HEAD.
- Worktrees temporales sólo fuera de Proyectos, vinculados a cambiometro-public; ramas `codex/<modulo>-<tarea>`. Conservar cambios ajenos y retirar el worktree al integrar y verificar su entrega.

## Trabajo independiente
- Una tarea especifica módulo, archivos propios, dependencia, aceptación y verificación en `tasks/<modulo>/`.
- Datos y sus contratos se resuelven antes que el componente consumidor. Ningún agente publica directamente desde su checkout.
- Cambios en navegación, globals.css, contratos de datos, manifests, package.json o workflows requieren coordinar su integración y actualizar las pruebas afectadas.
- Cada PR explica comportamiento, pruebas, límites de cobertura y recuperación. No mezclar snapshots antiguos ni un rediseño general con una corrección puntual.

## Publicación y datos
- La landing vigente en producción es la referencia: preservar hero, imágenes, tipografía y composición. Cambiar sólo el alcance acordado.
- UI-only hidrata datos publicados desde R2; no ejecuta ETL ni usa el JSON de Git como reemplazo silencioso.
- Preview y producción usan el mismo artefacto verificado, SHA real y release-set. No usar `wrangler pages deploy --branch main` desde un árbol local modificado.
- Ausente no equivale a cero; gasto, dieta y apoyo conservan su mes y unidad. No sumar períodos diferentes como un total mensual.
- Fuentes pausadas conservan sus datos y ejecución manual. Reactivar un cron requiere actualizar calendario, documentación y pruebas.
- No borrar ni sobrescribir datos remotos durante mantenimiento de interfaz.

## Verificación
- Consultar las guías Next instaladas antes de cambiar APIs del framework.
- Ejecutar pruebas del módulo, lint, tipos y build según el cambio. Revisar escritorio/móvil para cambios visuales.
- Cerrar sólo con evidencia del artefacto publicado, no con el éxito de un comando de despliegue.

## Modo vigente: local y cuota
- Por decisión de Jorge (18-11-2026), aplicar docs/operations/local-first-deliveries.md.
- Trabajar y revisar en local; agrupar mejoras. No hacer push, crear PR, disparar workflows o desplegar hasta que Jorge solicite la entrega. Los commits locales están permitidos.
- Validar sólo el módulo afectado durante el trabajo; reservar suite, build y CI integrados para el cierre de la entrega. Reutilizar evidencia y datos comprobados; no repetir extracciones ni vigilar workflows continuamente.
- Mantener las programaciones ETL acordadas y las fuentes pausadas. Esta regla cambia el flujo de desarrollo y publicación, no autoriza cambios automáticos de calendario.
