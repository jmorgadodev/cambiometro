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

## Senado: verificación adicional autorizada

El usuario autorizó reactivar personal de apoyo Senado. Workflow activo; diagnóstico remoto `36962215053` aprobado con extracción y publicaciones omitidas. No se modificó votaciones Senado.

Lectura local acotada del endpoint oficial 2026: siete páginas, 3.407 IDs únicos, 70 oficinas y períodos enero a agosto de 2026. Validación de esquema, páginas, total estable y duplicados aprobada; aproximadamente 2,11 MB de JSON de filas procesado en memoria. No se guardó un universo local ni se publicó.

Esto acredita extracción local del conjunto 2026 reportado por ese endpoint, no otros años ni ejecución completa desde la red GitHub. Los conteos coinciden con el release vigente, pero igualdad de conteos no acredita igualdad de contenido. La promoción sigue condicionada a presupuesto y candidato validado.

## Cierre operativo Senado 2026: 100 %

Con cuota de operaciones confirmada expresamente por el usuario (Analytics rechazó el token), run `36963215218` completó extracción de siete páginas, validación y publicación R2 con `--skip-d1`. Se preservó Cámara: 1.084 filas; Senado: 3.407; total: 4.491.
Release: `2026-10-02T04-08-54-151Z`; SHA: `dc0e43f3218d38dded54229e614035574301156c43dd3150984c10b748edac5d`.
Inventario previo de toda la cuenta: 8.425.652.239 bytes; proyectado tras ambas publicaciones: 8.427.986.077 bytes. Aumento neto: 2.333.838 bytes; pico estimado: 8.428.078.501, por debajo de 9.500.000.000. No se afirma medición de facturación.

Pages `36963350688`: success, despliegue productivo `b3dbf875.cambiometro.pages.dev`. Pin público contiene el SHA nuevo de personal de apoyo. Home, búsqueda Kaiser y fichas Pedro Araya/Vanessa Kaiser respondieron HTTP 200; ambas fichas muestran personal de apoyo y agosto de 2026.
Rollback: release anterior conservado, SHA `75d73d4ca0e30adb64b0a3d73e48281aba2363cab4ecbf8831ec6f9470638f59`; metadata de rollback registrada por Pages. No se borró histórico.

El 100 % es sólo este ciclo operativo Senado 2026, no Cámara, cobertura de otros años, O11 completo ni siete días de estabilidad. Cámara sigue con bloqueo externo.
