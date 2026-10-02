# Gastos Senado: guarda mensual — 2026-10-02

Trabajo: `codex/expense-release-closure-20261002`, worktree `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.

## Corrección

El workflow hidrata los subconjuntos vigentes desde R2 y ahora exige `--require-published-expense-baseline` antes de reconciliar Senado. La línea base valida el checksum con el lector existente. Un snapshot ETL local vacío no desactiva la comparación. La línea base sólo aporta conteos; no reemplaza registros originales ni sus identidades.

Cada mes refrescado debe conservar al menos su cantidad publicada de filas. Se rechazan candidatos vacíos, IDs duplicados y períodos inválidos. Una revisión oficial que reduzca filas requiere revisión explícita: no se promueve automáticamente. Los meses fuera de la ventana se conservan.

## Evidencia acotada

- La fuente y el índice publicado declaran 174 períodos Senado, enero 2012–julio 2026, sin diferencias de períodos.
- Replay de junio/julio 2026: 1.248/1.250 filas; coinciden con los totales API `r2-months`. No equivale a verificar todas las filas históricas.
- Cámara mantiene cuatro períodos públicos marzo–junio 2026; julio/agosto siguen excluidos por la política existente.
- 43 pruebas específicas aprobadas; TypeScript, ESLint y `git diff --check` sin errores.
- No se consultó D1 ni se publicó o eliminó contenido R2 en esta corrección local.

## Pendiente antes de cierre

CI del PR, promoción del código, ejecución incremental con preflight de almacenamiento y smoke de API/Pages. O12 no se declara completo hasta registrar estas evidencias.
