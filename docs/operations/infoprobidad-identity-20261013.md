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
- **Pendiente — promoción:** CI y build sobre el ReleaseSet vigente; comprobar el artefacto antes de promover.
- **Pendiente — producción:** la ficha de Jorge no debe mencionar ni enlazar la declaración de Felipe; conservar el historial mensual publicado y los checksums de datos.
- Registrar PR, commit, run de promoción, deployment, rollback y evidencia productiva antes de marcar el punto cerrado.

Reutilizar `lib/infoprobidad.test.ts` para evitar recurrencia. No descargar ni recorrer el universo InfoProbidad para volver a reproducir este caso.
