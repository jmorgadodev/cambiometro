# InfoProbidad: guarda R2-only · 2026-10-03

## Alcance y ruta

Worktree canónico: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.
Rama de implementación: `codex/infoprobidad-r2-only-20261003`, basada en
`origin/main` (`66d47a3db77d53a1345ce0c1ec85419256258a0b`). No usar el
checkout divergente de Proyectos ni `cambiometro-editorial` para desplegar.

Se retiran preflight y materialización D1 del workflow InfoProbidad. Se
reutiliza el modo `verify_release_only` de SINIM/DIPRES y el hidratador
existente: valida sólo los dos archivos publicados por checksum. Extracción
y ambas publicaciones se omiten en este modo. El calendario mensual del
día 10 a las 09:00 UTC, el conector y los datos permanecen intactos.

La guarda posterior comprueba el resultado del paso de publicación estática:
si se omitió, no espera una actualización Pages que no ocurrió. Una publicación
real conserva la verificación habitual. Permiso GitHub reducido a lectura.

## Evidencia local

- Prueba de regresión roja ante la dependencia D1 original; después 26 pruebas
  dirigidas aprobadas (calendario/costes y decisión de actualización estática).
- TypeScript, lint sin errores y calendario de 18 workflows aprobados;
  CI pendiente antes de fusionar. Sin cambios frontend ni Worker.
- Preflight: un manifiesto y dos objetos, 736.930 bytes en total, por debajo
  del límite de lectura de 12 MB. Lectura en memoria, sin escrituras R2/D1.
- Proyección `data/lake/projections/v1/infoprobidad.json`: 675.448 bytes,
  SHA-256 `a7ea6a7e2e8cc07544d1657971fef97a18071e3c2df2cbaf6b101a0657f725c4`.
- Subset `data/lake-subsets/infoprobidad.subset.json`: 61.482 bytes,
  SHA-256 `0d8ec0bd2445a55c4a9930143e74725978681b1708d6c6fd064be1ea87bea6d3`.
- Ambos coinciden con el manifiesto estático, claves de release
  `f9778924cc57918ce3c5e061f9d6ac91f6bf916e0e002c9c9bafcd85125d4501`.

## Cierre pendiente de ejecución

Antes de declarar la guarda cerrada: CI verde, fusión, ejecución manual desde
`main` con `verify_release_only=true` y controles posteriores que omitan
build/promoción/espera de frescura. Registrar PR y ejecuciones aquí y en
`tasks/stability/evidence.md`.

Esto no prueba extracción mensual, cobertura completa de declaraciones,
frescura del origen ni las cuatro puertas del ETL. No se generan nuevos
datos ni backups; no se afirma facturación medida automáticamente. El
presupuesto O05 y la observación O15 continúan abiertos.
