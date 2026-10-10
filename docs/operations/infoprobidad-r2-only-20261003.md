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
  CI completo aprobado en PR #705, incluido build Pages/Worker, seguridad,
  CodeQL y navegación adaptable. Sin cambios frontend ni Worker.
- Preflight: un manifiesto y dos objetos, 736.930 bytes en total, por debajo
  del límite de lectura de 12 MB. Lectura en memoria, sin escrituras R2/D1.
- Proyección `data/lake/projections/v1/infoprobidad.json`: 675.448 bytes,
  SHA-256 `a7ea6a7e2e8cc07544d1657971fef97a18071e3c2df2cbaf6b101a0657f725c4`.
- Subset `data/lake-subsets/infoprobidad.subset.json`: 61.482 bytes,
  SHA-256 `0d8ec0bd2445a55c4a9930143e74725978681b1708d6c6fd064be1ea87bea6d3`.
- Ambos coinciden con el manifiesto estático, claves de release
  `f9778924cc57918ce3c5e061f9d6ac91f6bf916e0e002c9c9bafcd85125d4501`.

## Cierre comprobado · guarda R2-only 100 %

- PR #705 fusionado en `33bfacb0a17a53104217367fcf7440121f2aa334`, con todos
  los checks verdes. Rama documental: `codex/infoprobidad-closure-20261003`,
  basada nuevamente en `origin/main` dentro del mismo worktree.
- Ejecución `37106727934` desde `main`, `verify_release_only=true`: success;
  extracción, preparación y publicación estática omitidas. Sólo GET del
  catálogo, manifiesto y los dos objetos requeridos. Cero PUT y cero datos D1.
- Checksum del manifiesto estático validado por el hidratador:
  `55e5cd98b0270f398ecf59f344fe567c0692c9b38637413c0709b54b159a666a`.
  Su contador de 203 archivos corresponde a metadatos del manifiesto, no a
  203 descargas: `--only-files` limita la lectura a los dos archivos indicados.
- Pages `37106819129`: success en decisión, build/promoción y registro de
  deployment omitidos. Guarda `37106819187`: success, espera de frescura
  omitida. Release productivo intacto y almacenamiento sin crecimiento.
- Se canceló únicamente el build `ui-only` de push `37106727835` del mismo
  commit, redundante para este cambio de workflow. No se canceló ningún ETL
  ni publicación de datos; no se omitió CI del PR.

Esto no prueba extracción mensual, cobertura completa de declaraciones,
frescura del origen ni las cuatro puertas del ETL. No se generan nuevos
datos ni backups; no se afirma facturación medida automáticamente. El
presupuesto O05 y la observación O15 continúan abiertos.
