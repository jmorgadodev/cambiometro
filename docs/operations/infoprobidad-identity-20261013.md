# InfoProbidad: evitar atribuciones por apellidos compartidos

## Referencia y alcance

- Worktree: `C:\Users\jorge\.codex\worktrees\advisory-ui-total\cambiometro-audit`.
- Rama de implementación: `codex/infoprobidad-identity-20261013`, desde `origin/main`.
- Caso: `/politico/jorge-alessandri-vergara/`, módulo `declaracion-probidad`.
- Cambio de selección en interfaz; no ejecutar ETL, modificar releases R2 ni consultar D1 productivo.

## Causa comprobada

El 13-10-2026 la página productiva atribuye a Jorge una declaración titulada a nombre de **FELIPE ALESSANDRI VERGARA**, fechada 20-08-2026. `lib/infoprobidad.ts` aceptaba dos palabras compartidas y luego escogía la fecha más reciente; ambos apellidos bastaban para enlazar personas diferentes. No es una regresión del historial de Personal de Apoyo.

El documento enlazado `https://datos.cplt.cl/datos/infoprobidad/declaracion_e74e690ffecb9aae56d5c197020ae445` respondió 403 en el navegador y no pudo contrastarse directamente. Este cambio no certifica ese documento ni añade una declaración de Jorge: impide la atribución indebida observada.

## Corrección y límites

- Exigir nombre completo normalizado: tildes, mayúsculas y espacios no alteran la comparación; nombres parciales, vacíos y apellidos compartidos no se aceptan.
- Mantener la búsqueda oficial existente cuando no haya coincidencia; no afirmar que la persona carece de declaración.
- No cambiar el catálogo, el bloque superior DIP, los importadores, el diseño ni otros dominios.
- Una coincidencia completa de nombre sigue siendo nominal: no certifica identidad ante homónimos ni vigencia jurídica. No presentar este cierre como auditoría integral de InfoProbidad.

## Verificación y criterio de cierre

- **Cerrado — reproducción y corrección local:** antes del cambio fallaron cuatro pruebas de atribución; la primera seleccionaba Felipe y Jorge juntos. Después, 14 pruebas relacionadas aprobaron, junto con typecheck y ESLint focal.
- **Cerrado — promoción:** PR [#798](https://github.com/jmorgadodev/cambiometro/pull/798), merge `2f0af0bd5677fa0b3f468c0dba4fd2ff6990dbed`. CI, seguridad, build y navegador aprobados; artefacto [run 38365313493](https://github.com/jmorgadodev/cambiometro/actions/runs/38365313493), promovido por [run 38366198102](https://github.com/jmorgadodev/cambiometro/actions/runs/38366198102). Deployment `579941f4-b87c-495b-bfbb-22d73fcd8070`, commit del artefacto `dbf066e85b6da1e68b911344e389b46c67d7a8d4`.
- **Cerrado — producción:** el 13-10-2026 el módulo de Jorge ya no menciona a Felipe ni enlaza `declaracion_e74e690ffecb9aae56d5c197020ae445`. Ambos enlaces del módulo llevan a `https://www.infoprobidad.cl/Resultados?busqueda=Jorge%20Alessandri%20Vergara`. No se encontró coincidencia completa en ese conjunto y no se afirma que Jorge carezca de DIP. Personal de Apoyo conserva enero–septiembre y abre septiembre. Home y ficha respondieron HTTP 200; el navegador no registró errores ni advertencias en la comprobación.
- **Cerrado — datos y rollback:** `release-set.json` conserva el checksum de manifiesto `cf08fd58c3b1facffebfda867c75ffb3ffd448eb8990052926db64fab82479c5`, idéntico al anterior al cambio. Sin escrituras R2 ni D1 productivo. Rollback al deployment anterior confirmado en la metadata de Cloudflare: `npm run pages:rollback -- 3c9ea67d-921e-46d1-8c9a-9903c42f03cb`.
- Captura: `C:\Users\jorge\AppData\Local\Temp\cambiometro-infoprobidad-20261013\produccion-corregida.png`. Metadata del deployment conservada en la misma carpeta, subcarpeta `pages-production-promotion-dbf066e85b6da1e68b911344e389b46c67d7a8d4`.

**Punto 1 — atribución incorrecta observada: 100% cerrado.** El 403 del documento CPLT no está solucionado; no bloquea retirar el vínculo indebido y no acredita una auditoría de los demás documentos.

Reutilizar `lib/infoprobidad.test.ts` para evitar recurrencia. No descargar ni recorrer el universo InfoProbidad para volver a reproducir este caso.
