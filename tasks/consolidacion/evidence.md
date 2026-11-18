# Evidencia de consolidación — 18 de noviembre de 2026

- Base remota comprobada: 7624b8ea. Referencia visual: dominio productivo recuperado; el despliegue 2c685403 provenía de b7ca701 con modificaciones locales.
- Respaldo: C:\Users\jorge\Backups\Cambiometro\20261118-consolidacion. Dos bundles completos verificados y 647 archivos con SHA256. XML de tareas conservados. Los archivos ignorados de las carpetas retiradas permanecen en su archivo completo.
- Main antiguo de public preservado en archive/public-main-20261118; cambios de interfaz preservados en stash consolidacion-20261118-public-local-preserved y snapshot del respaldo. Main canónico preparado desde origin/main.
- Ocho workflows secundarios deshabilitados temporalmente vía GitHub mientras se integra su configuración manual. Ningún run estaba en progreso. Después de integrar deben habilitarse sin cron/push y sin encadenamiento automático a Pages.
- Calendario de 18 workflows aprobado; 39 pruebas iniciales y 43 pruebas ampliadas de calendario/monitor/registro aprobadas. Lint sin errores (142 advertencias preexistentes). La primera suite general pasó 1894 pruebas y detectó una expectativa antigua de calendario; se corrigió y verificó por separado.
- Cuatro tareas Windows migradas a scripts de cambiometro-public, preservando horarios, principal y estado. Prepare-only correcto de Senado, personal Cámara y asesorías Cámara.
- Senado dry-run desde la raíz canónica: ventana 2026-11-15..2026-11-18, 71 registros y cero errores; sin publicación.
- Personal Cámara support-plan desde la raíz canónica: manifiesto R2 y datos verificados (5472 filas), períodos pendientes octubre y noviembre. No se modificaron datos remotos en esas comprobaciones.

## Cierre operativo de la primera entrega

- PR #840 integrada como 5bcc0934. Los ocho workflows secundarios están habilitados únicamente para ejecución manual, sin cron/push ni encadenamiento automático.
- Suite completa desde el repositorio canónico: 302 archivos y 1896 pruebas aprobadas; tipos de app/API, arquitectura estática, tokens, enlaces y DOM aprobados. CI también aprobó seguridad, construcción Pages/API y navegador.
- En Proyectos sólo permanecen cambiometro-public y cambiometro-editorial. Las cuatro carpetas retiradas están bajo Backups/Cambiometro/20261118-consolidacion/retired, con enlaces Git reparados y 171 archivos pendientes verificados después del traslado. Se movieron todos sus datos ignorados; sólo se retiraron directorios originales vacíos.
- Las ramas locales del clon audit se importaron en el repositorio canónico bajo refs/archive/audit-20261118. Su historia completa también permanece en el bundle. El worktree antiguo del chat se archivó; el temporal actual depende de cambiometro-public.
- Otros 45 artefactos temporales y el sandbox antiguo de la raíz canónica se trasladaron a canonical-local-artifacts dentro del respaldo, con inventario. Ningún dato remoto fue eliminado.
- Las cuatro tareas Windows tienen working directory canónico y horarios activos: gastos Cámara diario 06:30 (extracción día 2), Senado diario 09:30, apoyo Cámara lunes 09:30 y asesorías Cámara día 15 09:30.
- Se ejecutó la acción real de la tarea Senado después de migrarla: terminó 18-11-2026 07:54 con LastTaskResult 0, publicó lake validado y solicitó la proyección mediante run 44289697855. La siguiente ejecución ordinaria figura para 09:30 del mismo día.
- Apoyo y asesorías verificaron manifiesto, checksum y períodos pendientes con support-plan/advisory-plan. Su extracción completa y siguiente ejecución corresponden al cierre del módulo Personal.

Esta evidencia acredita las acciones indicadas, no certifica fuentes completas ni ejecuciones futuras. Las entregas de módulos conservan su propio cierre. La landing y las fichas no fueron rediseñadas en esta entrega.
