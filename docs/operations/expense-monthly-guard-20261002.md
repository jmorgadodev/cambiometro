# Gastos Senado: guarda mensual — 2026-10-02

Trabajo: `codex/expense-release-closure-20261002`, worktree `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.

## Corrección

El workflow hidrata los subconjuntos vigentes desde R2 y exige `--require-published-expense-baseline` antes de reconciliar Senado. La línea base valida el checksum con el lector existente. Un snapshot ETL local vacío no desactiva la comparación. Desde PR #693 la línea base aporta también las filas históricas que quedan fuera de la ventana; no cambia sus identidades ni completa montos.

Cada mes refrescado debe conservar al menos su cantidad publicada de filas. Se rechazan candidatos vacíos, IDs duplicados y períodos inválidos. Una revisión oficial que reduzca filas requiere revisión explícita: no se promueve automáticamente. Los meses fuera de la ventana se conservan.

## Evidencia acotada

- La fuente y el índice publicado declaran 174 períodos Senado, enero 2012–julio 2026, sin diferencias de períodos.
- Replay de junio/julio 2026: 1.248/1.250 filas; coinciden con los totales API `r2-months`. No equivale a verificar todas las filas históricas.
- Cámara mantiene cuatro períodos públicos marzo–junio 2026; julio/agosto siguen excluidos por la política existente.
- 43 pruebas específicas aprobadas; TypeScript, ESLint y `git diff --check` sin errores.
- No se consultó D1 ni se publicó o eliminó contenido R2 en esta corrección local.

## Cierre del ciclo

PR #689 y #693 con CI verde, replay 37044606324, reparación y despliegue 37050448199 comprobados. El incidente del índice parcial y la validación de los 178 períodos están documentados en [expense-index-retention-20261002.md](expense-index-retention-20261002.md). O12 acredita consulta, conservación y actualización del alcance publicado, no cobertura de todos los gastos del Congreso ni todas las filas contra la fuente.
