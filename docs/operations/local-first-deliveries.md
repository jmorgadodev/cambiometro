# Trabajo local y entregas agrupadas

Decisión de Jorge, 18-11-2026: reducir consumo de cuota y trabajar las mejoras en local antes de subirlas juntas. Sustituye el patrón de abrir PR, compilar y desplegar cada ajuste pequeño.

## Flujo de trabajo

1. Al abrir un bloque, leer el módulo y comprobar una vez raíz, rama, estado y origin/main. Raíz web: C:/Users/jorge/Proyectos/cambiometro-public. Conservar los cambios ajenos y los prototipos.
2. Trabajar en una rama local codex/<modulo>-<tarea>. Registrar alcance, archivos, pendientes y aceptación en tasks/<modulo>/. Los commits locales no disparan CI.
3. Después de un cambio, ejecutar sólo las pruebas de la lógica afectada. Para ajustes visuales, revisar la pantalla modificada en escritorio/móvil. Documentación y cambios de texto no requieren builds completos.
4. Agrupar correcciones relacionadas. Ejecutar lint, tipos y pruebas del módulo una vez al cerrar el bloque, sobre el diff final. Repetir sólo el control afectado por un fallo o un cambio posterior.
5. Antes de una entrega amplia, hacer una sola validación integrada. No repetir ETL, descargas, suite completa ni build por cada detalle. Reutilizar candidatos, releases, cachés y evidencia ya verificados; comprobar su SHA y alcance.
6. Mantener el resultado en local para revisión. No hacer push, abrir PR, disparar workflows ni publicar por defecto. Subir cuando Jorge solicite la entrega agrupada.
7. En esa subida: un PR por entrega coherente, CI sobre el resultado final y un artefacto con SHA real y release-set vigente de R2. Comparar preview y producción y promover el mismo artefacto; guardar rollback. Si el diff exige dividir por riesgo o contratos, documentar el motivo antes de multiplicar los ciclos.

## Límites prácticos

- No mantener sesiones de vigilancia ni consultar estados repetidamente mientras se desarrolla otra parte. Revisar el resultado al necesitarlo.
- No lanzar workflows para averiguar si un cambio pequeño funciona: comprobarlo localmente primero.
- No reconstruir Pages por cambios en ETL o documentación hasta la entrega acordada. Las protecciones de publicación existentes se conservan.
- No reextraer datos oficiales que ya tienen una captura válida para revisar la misma interfaz. UI-only hidrata el release publicado de R2; no ejecuta ETL ni reemplaza datos por fixtures Git.
- Las programaciones ETL acordadas siguen activas. Detener una verificación manual no autoriza desactivar las tareas permanentes ni reactivar fuentes pausadas.
- Comunicar un resultado o bloqueo relevante, evitando repetir planes y estados sin cambios.

## Entrega pendiente de gastos

Código integrado: 915fe31ecba9a8ceb23a146352ef8bc723f56c7b. Datos corregidos y verificados en R2; la publicación web final se detuvo al cambiar a trabajo local. Ver [estado y evidencia](../../tasks/gastos/operational-evidence.md). En la futura entrega, consumir ese release junto con las mejoras locales; no repetir las extracciones completas por defecto.
