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
## Cierre de las guardas: 100 %

PR #687 fusionado en main como `9f7204ed66c980ea03a5cd6a73181bbd5d5fd400`, con CI aprobado.
Diagnóstico remoto Cámara `36959078144`: success. Verificó 160 diputados, 1.084 filas Cámara, 70 oficinas Senado y 3.407 filas Senado; total 4.491.
Checksum del snapshot compartido: `75d73d4ca0e30adb64b0a3d73e48281aba2363cab4ecbf8831ec6f9470638f59`.
Extracción, publicaciones y artefacto fueron omitidos explícitamente en modo diagnóstico.

La causa corregida es el fallback a un snapshot Git antiguo ante errores R2. Ahora se detiene antes de extraer si no valida el release vigente.

## Bloqueos operativos separados

- Cámara: fuente oficial responde 403; conservar el release vigente. Requiere una red permitida o alternativa oficial validada; no eludir WAF ni publicar vacío.
- Senado: GitHub informa `disabled_manually` para el workflow de personal de apoyo. No se encontró motivo documentado en el registro operativo. El despacho de diagnóstico fue rechazado; no se reactivó. Esta desactivación es distinta de votaciones Senado local-only.
- El mismo snapshot y verificador de ambos workflows se comprobó con el diagnóstico Cámara; esto no prueba extracción remota Senado.

Pendiente: decidir la modalidad de Senado y comprobar la extracción completa de cada fuente cuando sea segura. O11 no está cerrado. No ejecutar publicaciones mientras O05 no acredite margen de costes.
