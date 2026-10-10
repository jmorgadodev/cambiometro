# DIPRES: guarda R2-only sin actualización de datos

Ruta canónica: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`, rama `codex/dipres-r2-only-20261002` desde `origin/main`. Se conserva el checkout divergente de `Proyectos`.

## Alcance

Se elimina del workflow DIPRES el preflight y la materialización D1, incluido el refresco de catálogo destinado sólo a esa materialización. Permiso GitHub `contents: read`. No cambia conector, registros, años, interfaz ni calendario trimestral (1 de enero/abril/julio/octubre, 09:00 UTC).

`verify_release_only=true` omite preparación, ingesta y ambos publicadores. Reutiliza el hidratador estricto para comprobar proyección `data/lake/projections/v1/presupuesto.json` y subset `data/lake-subsets/presupuesto.subset.json`, con bytes/SHA/calidad y sin fallback Git. Sólo escribe archivos temporales del runner, no R2 ni D1.

La guarda posterior reutiliza la decisión de SINIM: exige un único paso de publicación estática con resultado `success` o `skipped`. Verificación sin publicación no espera Pages. El no-op Pages existente evita reconstruir el mismo pin.

## Verificación y límites

Prueba contractual roja antes del cambio; 35 pruebas dirigidas (workflows, conector DIPRES, decisión Pages), tipos/lint y calendario (18 workflows) aprobados. PR #701 fusionado con toda la CI verde en `6955a3da1ee3d286df2c37f896863bed29134383`.

- Preflight acotado: dos archivos, 1.127.842 bytes. Proyección: 1.081.699 bytes, SHA `f5f28775d8efedddd9bb8f2b07defe0404e00124112003ede8b41a65a091a4fc`. Subset: 46.143 bytes, SHA `dadf614b5a95b7f8fc735e310d6a317f1a7a4762a60205468dc85bc076fd8705`. Lectura posterior de ambos coincide por bytes/SHA; no modifica archivos locales ni remotos.
- Verify-only desde `main` 37085144507: success. Catálogo e hidratación validados; preparación, ingesta y publicación omitidas. Cero PUT R2 y cero datos D1.
- Controles posteriores 37085281760 (Pages) y 37085281856 (guarda): success, sin build/promoción ni espera de frescura. Se canceló sólo el build ui-only redundante de push 37085141758, no una promoción productiva ni CI del PR.

Guarda R2-only cerrada al **100 % de este alcance**. Registro de cierre en la misma ruta, rama `codex/dipres-closure-record-20261002`. No ejecutar una extracción presupuestaria completa para comprobar esta guarda.

Esto no acredita frescura, cobertura completa, continuidad histórica ni replay de origen DIPRES. El ciclo integral O11 y las guardas de datos propias permanecen abiertos. No se altera respaldo, retención ni facturación; O05/#671 sigue apartado.
