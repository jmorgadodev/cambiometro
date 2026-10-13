# Depuración del registro operativo — 13-10-2026

## Referencia y alcance

- Worktree: `C:\Users\jorge\.codex\worktrees\advisory-ui-total\cambiometro-audit`.
- Rama documental: `codex/docs-closed-work-20261013`, desde `origin/main` `6d1810cf83e5d5b97ba615a01b8cd17fcdc7e5ee`.
- Próximas tareas: partir de `origin/main` actualizado en este worktree, preservando cambios ajenos. Las ramas de los incidentes son referencias históricas, no una instrucción de volver a un commit antiguo.
- Se modifican sólo `transparencia-app/docs/pendientes-verificados-2026-10-11.md` y `transparencia-app/docs/runbooks/etl-personal-apoyo-camara.md`, más este registro. No se revisa el resto del proyecto.

## Contradicciones corregidas

1. El cotejo de `Inicio` de septiembre seguía figurando pendiente pese al cierre de PR #786: corregido y enlazado a la evidencia existente.
2. El runbook trataba cuatro categorías como pendientes. Se separan asesorías publicadas de las tres categorías descartadas por Jorge; éstas no cuentan como cobertura faltante ni bloquean una publicación.
3. Una propuesta antigua de pedir documentos a Cámara podía volver a tratarse como dependencia: marcada explícitamente como descartada.
4. El orden del 11-10 podía llevar a repetir cierres o saltar las automatizaciones abiertas: queda como registro histórico y se establece una sola cola vigente, con primer punto abierto nº 3.
5. Releases, conteos y estado de la tarea de Windows observados en días anteriores podían confundirse con estado actual: se conservan como evidencia fechada, no como una nueva comprobación.

## Criterio y verificación

**Punto 2: cierre documental acotado**, efectivo después de revisión, CI y fusión de este cambio a `main`. La cola vigente distingue cerrados, abiertos, revisiones condicionadas a un release y categorías descartadas; el runbook remite a ella. Verificar enlaces locales de los tres MD y revisar el diff; no volver a ejecutar ETL, descargar fuentes ni revalidar producción para este cambio de documentación interna.

Verificación local realizada: 13 enlaces locales resolvieron a archivos existentes; `git diff --check` pasó y el diff conserva la evidencia fechada, separándola del estado operativo. Revisión documental sin cambios de código ni nuevas afirmaciones de cobertura.

No cambia código, datos, menú ni diseño; no publica Pages, no consulta ni escribe R2/D1 productivos. No acredita éxito de un ETL futuro ni resuelve los bloqueos externos. **No es una depuración de todos los documentos históricos del repositorio.**

Siguiente punto: incorporación mensual de asesorías externas. Reutilizar enero–septiembre, los imports y los procedimientos existentes; llevar únicamente el mes nuevo y su automatización hasta su criterio de cierre.
