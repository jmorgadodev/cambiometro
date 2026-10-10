# Promoción condicional de entradas estáticas — 2026-10-02

Worktree: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`; rama `codex/r2-static-cas-20261002`.

El publicador existente lee el manifiesto canónico mediante S3, valida su contrato/checksum con `buildReleaseSet` y conserva su ETag fuerte. Después de validar presupuesto y subir archivos inmutables, publica el mismo puntero mediante `If-Match` contra ese ETag. Una base modificada devuelve 412 y bloquea la promoción; no hay escritura sin condición ni fallback a un manifiesto vacío ante 403/404. El operador debe reejecutar desde el manifiesto vigente para combinar ambos cambios.

La lectura pide `Accept-Encoding: identity`: la compresión de transporte podía producir un ETag débil, inválido para esta comprobación. Se reutiliza `aws4fetch` y la derivación de credenciales ya usada por la restauración R2, sin dependencia nueva.

Si todos los archivos candidatos tienen el mismo tamaño y SHA-256 que los publicados, conserva sus referencias y manifiesto, devuelve `action: unchanged` y no realiza PUT ni crea otro release. El control de disparos Pages para todas las fuentes sigue siendo O09.

## Verificación

- Quince pruebas dirigidas cubren dos candidatos concurrentes, bloqueo de la base atrasada, reconstrucción del candidato combinado, lecturas denegadas, ETag ausente, contenido idéntico y contrato del ReleaseSet. TypeScript y ESLint aprobados.
- Prueba real de R2 con presupuesto previo: ETag deliberadamente incorrecto rechazado (412), manifiesto intacto. Una condición válida aceptó el cuerpo byte a byte idéntico; lectura posterior confirmó los mismos bytes y ETag. No se creó objeto nuevo ni se alteró un dato público.
- Cuenta: 8.446.722.782 bytes, proyección idéntica, bajo el umbral de 9.500.000.000 bytes. La cuota de operaciones sigue respaldada por la autorización previa de Jorge; no se afirma disponer de métricas Analytics que el token no permite leer.
- Checksum probado: `db4998d03e583abb92b3b68d49f3e3495cf403235c5eed274887634284ef9dc5`.

R2 admite `If-Match` en `PutObject`: [documentación oficial](https://developers.cloudflare.com/r2/api/s3/api/).

El cierre de esta guarda requiere CI y fusión. No completa O08: falta incorporar los manifiestos externos al conjunto estático y validar ese alcance en Pages. El CAS protege el puntero estático compartido; los demás punteros conservan sus validadores existentes.
