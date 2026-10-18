# Recuperación de Partidos — 18 octubre 2026

## Continuación y alcance

- Worktree: `C:\Users\jorge\.codex\worktrees\advisory-ui-total\cambiometro-audit`.
- App: `transparencia-app`; rama: `codex/partidos-published-recovery-20261018`.
- Rama anterior preservada: `codex/cplt-recovery-close-20261016`. Sus dos archivos CPLT sin commit no forman parte de esta corrección.
- Prioridad del usuario: recuperar información útil en `/partidos/` y sus fichas. No reiniciar auditorías ni modificar otros ETL.

## Causa acreditada — cerrada

Producción responde HTTP 200 y muestra el catálogo: no es una caída de API. El PR #719 (`be01ea8c`) puso `PARTY_AGGREGATES_REVIEWED=false` y retiró en bloque tabla, gráficos y dashboard. El motivo era válido para el agregado antiguo: `partidos-stats.subset.json` no pertenece al ReleaseSet, y el generador antiguo asignaba «No Vota» a miembros sin registro nominal. No volver a activar ese fixture ni revertir las guardas globalmente.

## Corrección implementada

- Calcular desde `data/politicos-votaciones.json` hidratado y `gastos` de los slices individuales generados por el build, nunca D1 ni el fixture de estadísticas antiguas.
- Reutilizar `unreconciledNominalSessions` y `resumirGastosAgregables`: excluir nominales discordantes; no fabricar ausencias; no duplicar fila total y componentes; preservar cero frente a nulo.
- Agrupar **integrantes del catálogo**, no afirmar militancia histórica. Separar cortes de Cámara/Senado y limitar la agregación de rendiciones a marzo 2026 en adelante. El histórico anterior permanece en las fichas individuales.
- Recuperar tabla, filtros, votos nominales, gráficos y rendiciones; mantener cohesión y personal de apoyo agregado «En revisión». No reactivar estadísticas electorales del fixture mediante el dashboard.
- Meses de gráficos y filtro salen de registros disponibles, no una lista fija enero–julio ni ceros inventados.
- Cobertura y promedio del mes consideran sólo integrantes con rendición observada en ese mes, incluido cero explícito. Ejemplo comprobado: RN julio 2026, $56.222.492, 8/20 integrantes, promedio $7.027.812. No mostrar 20/20 por tener datos en otros meses.

## Verificación local — cerrada

- Hidratación acotada: sólo votos y dos subsets de gastos; tamaño y SHA-256 comprobados por el hidratador existente. Sin escrituras R2 ni consultas D1.
- Slices: 205 integrantes, 125.557 registros nominales de entrada. Esto no significa que todos superen conciliación ni que sea cobertura oficial completa.
- Pruebas de regresión y suite: 296 archivos, 1.802 pruebas verdes; tipos de app/Worker, arquitectura, tokens, enlaces e inyección verdes.
- Revisión independiente: corregida cobertura mensual y denominador; sin bloqueos restantes del cambio.
- Navegador local: tabla, filtros y gráficos recuperados. No equivale todavía a producción corregida.

## Cierre pendiente (no repetir lo cerrado)

1. Build/E2E y checks del PR, exclusivamente código; no versionar la copia local de votos hidratada desde producción.
2. Preview hidratado con ReleaseSet productivo vigente; comprobar lista, RN julio y ficha con nominales.
3. Promoción del artefacto verificado y smoke productivo; registrar PR, SHA y ejecución. Hasta eso no declarar resuelto en producción.

No modificar ni promover la actualización municipal/CPLT como parte de esta incidencia.
