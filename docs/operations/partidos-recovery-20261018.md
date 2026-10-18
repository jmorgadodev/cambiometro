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

## Integración y preview — cerrados

- PR #810 integrado: `7d1b77d74392559ae84e91bb4afe17e5cf000001`, 2026-10-18T20:11:49Z. Código verificado: `0cd952e405581abf061ec3bfa598575bca352aff`.
- Checks exactos del PR verdes (lint, tipos/unitarias, seguridad, CodeQL y build/E2E). El run inicial `39161178497` se canceló al corregir el caso de encabezado sin rendiciones; NO promoverlo.
- Preview definitivo: run `39161428201`, success; deployment `2b7aba12-c4b8-45cd-afd4-618720b3146f`, https://2b7aba12.cambiometro.pages.dev .
- Navegador real: RN julio $56.222.492, promedio $7.027.812, cobertura 8/20; ficha y gráfico nominal visibles, consola del preview sin errores. Cortes explícitos: Cámara 17 marzo–7 octubre, Senado 18 marzo–7 octubre; gastos marzo–julio 2026.
- Sólo tres entradas R2 hidratadas localmente (87.107.548 bytes combinados), con tamaño y checksum validados. El archivo de votos local hidratado NO se versionó.
- Manifest de entradas consultado: `d9b87ca8fb139e0d274763d3293e9e0c813959610def51ecf02c4d0355f2646e`. Ningún nuevo corte ETL publicado.

## Producción y cierre — cerrados

- Artefacto `39161428201` promovido: workflow `39162211644`, **success**. Se canceló el build automático redundante `39162199803` para liberar la cola; no publicó datos ni sitio.
- Rollback previo identificado ANTES de promover: `032eb674-9a5f-4050-804e-2fe87a327861`, producción 2026-10-18T12:18:25.65231Z, código `aad2521f8e4fd10e4f093720d596fd5648af8148`.
- Deployment productivo: `ecbcb281-9484-48a6-8940-62de33bda31f`, 2026-10-18T20:15:46.067719Z, código `0cd952e405581abf061ec3bfa598575bca352aff`.
- Home, Partidos, RN y REP: HTTP 200. En navegador productivo, tabla y filtro julio operativos; RN vuelve a mostrar $56.222.492, promedio $7.027.812 y 8/20. Navegación a `/partidos/rn/`, alcance y gráfico nominal visibles, consola sin errores.
- La búsqueda de texto del dashboard en HTML HTTP bruto no sirve como prueba de fallo: su contenido se hidrata en cliente. La comprobación en DOM real confirmó la ficha productiva.
- ReleaseSet preview/producción idéntico: `69b71300e939fa6e1bca4933cfe2f2be790061d56ba2814d968232bfd141b2e5`; checksum manifest `d9b87ca8fb139e0d274763d3293e9e0c813959610def51ecf02c4d0355f2646e`.
- Incidencia de retirada global de información: **cerrada**. No repetir diagnóstico, extracción ni checks ya cerrados salvo evidencia nueva de regresión. Cohesión y personal agregado no quedan certificados por este cierre: conservan su estado específico En revisión.

No modificar ni promover la actualización municipal/CPLT como parte de esta incidencia.
