# DIPRES: guarda R2-only sin actualización de datos

Ruta canónica: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`, rama `codex/dipres-r2-only-20261002` desde `origin/main`. Se conserva el checkout divergente de `Proyectos`.

## Alcance

Se elimina del workflow DIPRES el preflight y la materialización D1, incluido el refresco de catálogo destinado sólo a esa materialización. Permiso GitHub `contents: read`. No cambia conector, registros, años, interfaz ni calendario trimestral (1 de enero/abril/julio/octubre, 09:00 UTC).

`verify_release_only=true` omite preparación, ingesta y ambos publicadores. Reutiliza el hidratador estricto para comprobar proyección `data/lake/projections/v1/presupuesto.json` y subset `data/lake-subsets/presupuesto.subset.json`, con bytes/SHA/calidad y sin fallback Git. Sólo escribe archivos temporales del runner, no R2 ni D1.

La guarda posterior reutiliza la decisión de SINIM: exige un único paso de publicación estática con resultado `success` o `skipped`. Verificación sin publicación no espera Pages. El no-op Pages existente evita reconstruir el mismo pin.

## Verificación y límites

Prueba contractual roja antes del cambio; 35 pruebas dirigidas (workflows, conector DIPRES, decisión Pages), tipos/lint y calendario (18 workflows) aprobados. CI y verificación remota pendientes al crear este registro; completar aquí IDs y resultados antes de cerrar la guarda. No ejecutar una extracción presupuestaria completa para probarla.

Esto no acredita frescura, cobertura completa, continuidad histórica ni replay de origen DIPRES. El ciclo integral O11 y las guardas de datos propias permanecen abiertos. No se altera respaldo, retención ni facturación; O05/#671 sigue apartado.
