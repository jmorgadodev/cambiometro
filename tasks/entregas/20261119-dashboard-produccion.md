# Entrega Dashboard y navegación móvil — 19-11-2026

Jorge autoriza corregir el salto de filtros móvil y subir a producción las mejoras acumuladas. Rama codex/dashboard-parlamentario-local-20261119; base origin/main 39cc06d0 (#848). Incluye fase 7, filtros BI, selección múltiple, referencias de dieta mensuales, total referencial, menú Dashboard, barras/tooltips/años en Resumen y navegación persistente de fichas en móvil.

## Procedimiento

1. Verificaciones de módulos ya registradas; cierre integrado con lint y npm test.
2. Un PR agrupado, revisión del diff y puertas CI antes de integrar.
3. pages-ui-refresh ui-only con preview, hidratando release R2 vigente sin ETL ni datos locales.
4. Verificar preview, /dashboard y fichas con el mismo release, luego pages-promote-artifact con el run verde. La solicitud actual autoriza el cutover.
5. Confirmar dominio, SHA y release publicado, filtros móviles y períodos/importes preservados; registrar evidencia y rollback.

## Recuperación

Previo: producción #848, código 39cc06d05e110ecd795e56d4d3726ff16f01a13a, despliegue inmutable https://ddbe1173.cambiometro.pages.dev/; promoción previa run 44520016808. Reutilizar ese artefacto o rollback de Pages al deployment previo si la entrega falla. No revertir datos ni reactivar fuentes.

## Estado

Corrección móvil verificada en local: 6 recorridos sin salto y 19 comprobaciones BI correctas. Publicación en preparación; completar identificadores y evidencia al terminar.
