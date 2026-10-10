# O08: contrato local de ReleaseSet (20 %)

Worktree canónico: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.
Rama: `codex/release-set-contract-20261001`, desde `origin/main` con #681 integrado.

`scripts/release-set.mjs` reutiliza el contrato del manifiesto estático.
Deriva referencias y huellas por dominio, verifica checksum del manifiesto y
fija su identidad. No inventa conteos: si el manifiesto no los declara, son nulos.
El alcance es exclusivamente `static-site-inputs`, no todo el universo público.

La guarda de promoción local rechaza una base obsoleta. La prueba simula dos
candidatos concurrentes y exige reconstruir el segundo con ambos cambios.
Esto NO implementa compare-and-swap en R2; aún no modifica ningún publicador.

Validación: 3 pruebas nuevas y 8 existentes del manifiesto aprobadas; ESLint y
`git diff --check` correctos. No hay llamadas R2 ni D1 en el módulo.

Pendiente: promoción atómica real, incorporar todos los manifiestos públicos
necesarios, pin de Pages y comparación del artefacto en preview/producción.
No publicar el contrato como puntero productivo ni afirmar O08 terminado.
