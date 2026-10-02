# Personal de apoyo: guardas de recuperación

## Referencia de trabajo

Worktree: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.
Rama: `codex/support-source-response-20261001`, basada en main `419fc8b`.

## Cambio realizado

- Cámara y Senado recuperan manifiesto y datos R2 y reutilizan el verificador existente de checksum, esquema y conteos antes de extraer.
- Un error de recuperación o validación detiene el workflow. No se usa el snapshot Git como sustituto.
- `verify_release_only=true` permite verificar el release sin extracción, publicación ni artefacto de datos.
- Se mantienen calendario, cola compartida y publicación sin D1.

## Evidencia y límites

42 pruebas específicas aprobadas; TypeScript, ESLint del test modificado y diff check aprobados.
El manejo de HTML de Senado ya estaba implementado en main: no se duplicó.
La consulta local acotada de Senado respondió JSON válido (una fila; total reportado 3.407); no demuestra cobertura completa ni accesibilidad desde GitHub.
Cámara respondió HTTP 403 en la prueba acotada. No se eludió el bloqueo.

No se escribieron ni eliminaron objetos R2, ni se consultó D1.
Pendientes: CI, promoción de estas guardas, diagnóstico remoto de sólo lectura y ejecución completa de fuente cuando sea segura. O11 no está cerrado.
