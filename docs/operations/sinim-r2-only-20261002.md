# SINIM: ejecución R2-only, sin modificación de datos

Worktree `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`, rama `codex/sinim-r2-only-20261002` desde `origin/main`. Cambio acotado al workflow SINIM, guarda posterior y prueba contractual existente. No cambia diseño, períodos, registros ni el conector de origen.

## Cambio

Se retiran el preflight D1, la materialización opcional y el refresco de catálogo que sólo la alimentaba. El workflow mantiene ingesta, proyección y publicación R2/Pages; permiso GitHub reducido a `contents: read`. Calendario intacto: 1 de marzo/septiembre, 09:00 UTC.

`verify_release_only=true` recupera únicamente el release SINIM fijado por el manifiesto estático y verifica bytes, SHA-256 y calidad semántica mediante el hidratador existente. Omite preparación, extracción y ambos publicadores. La guarda posterior comprueba el resultado del paso de publicación: `skipped` no espera un despliegue inexistente. El no-op Pages reutiliza la comparación del pin estático ya existente.

El conector configura nueve indicadores y exige 345 municipios para la extracción real; eso no equivale a todos los indicadores de SINIM ni a las 346 comunas INE. Conserva valor original/unidad y monto no informado distinto de cero. Este cambio no audita cada indicador contra el portal ni publica un año nuevo.

## Evidencia

- Prueba roja antes del cambio; 28 pruebas dirigidas aprobadas (workflow, conector SINIM, decisión Pages). Calendario: 18 workflows. Tipos/lint dirigidos sin errores.
- Lectura real acotada del manifiesto y su proyección: 1.440.946 bytes, SHA-256 `ff6c62d9211e8c12cec8422f125b421799fcaf896c41bc79dd4ed87d5691c620`, checksum/bytes/calidad concordantes. Dos lecturas, cero escrituras R2 y cero datos D1. Se verifica el release publicado, no la frescura del origen.
- PR #699 fusionado con toda la CI verde en `b55855df64a6855d045836bef6a950cc8f02a7f9`.
- Ejecución remota `verify_release_only=true` 37062175649: success; hidratación y validación del objeto versionado publicadas, preparación/extracción/publicación omitidas. No hay pasos D1 ni PUT R2.
- Controles posteriores 37062412926 (Pages) y 37062412990 (guarda) success: build/promoción y espera de frescura omitidos correctamente. No hubo despliegue ni cambio de release.

La eliminación de dependencia D1 y su comprobación remota quedan cerradas al **100 % de esta guarda**. SINIM completo sigue abierto en O11: falta replay de origen y conciliación por año antes de cualquier promoción de datos. No modifica respaldo, retención ni facturación; O05 sigue apartado.

Registro de cierre en la misma ruta canónica, rama documental `codex/etl-closure-record-20261002`. No trabajar ni desplegar desde el checkout divergente en `Proyectos`.
