# Evidencia de navegación · 18 noviembre 2026

## Código y artefacto

- PR funcional: https://github.com/jmorgadodev/cambiometro/pull/842
- SHA del artefacto: 5727a2ad3e2acfcb84e4433d6e2b4eb640168562.
- Integración main: 4111ea26f4627f9b773eb4781392be716458a2c2. `git diff 5727a2ad 4111ea26` está vacío: mismo árbol.
- Build UI-only con R2, navegador, temas y CSP: https://github.com/jmorgadodev/cambiometro/actions/runs/44297656269
- Preview inmutable: https://595275e6.cambiometro.pages.dev
- ReleaseSet: 83e1e161525a201c92c7db03d3bc084b39615b06bf3a15950c8e57e196fcd3ac; idéntico al dominio productivo previo.
- La promoción descarga el artefacto `pages-ui-5727a2ad3e2acfcb84e4433d6e2b4eb640168562`; no reconstruye ni ejecuta ETL.

## Verificaciones

- 306 archivos / 1.919 pruebas aprobadas, tipos app/API y lint sin errores (142 advertencias preexistentes).
- Universo de 205 fichas parlamentarias con identidad/datos y 346 URL municipales preservadas con aviso/noindex; sitemap excluye construcción.
- Navegador de integración, doce capturas de los tres temas, axe y CSP aprobados.
- `STATIC_VERIFY_BASE_URL=https://595275e6.cambiometro.pages.dev node scripts/verify-static-browser.mjs`: 23 rutas con HTTP 200, sin spinners, errores JavaScript ni recursos fallidos; menús/filtros a 320, 768 y 1440 px.
- Revisión adicional a 390 px: foco del drawer recorre sus controles, Shift+Tab/Tab no salen del diálogo y Escape cierra y devuelve el foco. Menú desktop revisado a 1024 px; sin desbordamientos horizontales.
- Rutas municipales profundas y remuneraciones generales devuelven aviso y `X-Robots-Tag: noindex, follow`.
- Hero: mismos título, clases, estructura e imágenes. Se conservaron composición, tipografías y fotografías; cambiaron textos de alcance y destinos.

## Regresión de fichas

El texto de `main` coincide byte por byte entre producción previa y preview. Ambas conservan agosto y septiembre.

| Ficha | Gastos mostrados CLP | Apoyo mostrado CLP | SHA-256 del texto principal |
|---|---:|---:|---|
| Carlos Bianchi | 36.828.692 | 7.890.000 | b00e3b7928429e8c8a782edec2b60e810e88a750059593f7c4ebde6976a7837b |
| Vanessa Kaiser | 31.445.139 | 16.450.000 | 78f2d2b7e5990f810f620d0fa2d3330458d50d092c65ac437be48b5e66299176 |

Esta tabla verifica cifras ya publicadas; no las suma ni afirma que sean del mismo mes. Los meses, unidades y conceptos permanecen en cada ficha.

## Recuperación y siguiente entrega

Promoción aprobada: https://github.com/jmorgadodev/cambiometro/actions/runs/44300785061. Deployment productivo: 9363083d-3220-4c89-b724-f61354dd48d6, https://9363083d.cambiometro.pages.dev. Se promovió el artefacto de la preview sin reconstrucción.

Comprobación posterior en https://cambiometro.impulsacv.cl: menú con las seis áreas, mismo release-set, misma estructura del hero y los mismos hashes de contenido Bianchi/Kaiser que la referencia previa. Landing, salud de datos, ficha Bianchi y URL municipal profunda responden 200. La ficha activa y la landing no llevan noindex HTTP; la URL municipal sí mantiene noindex/follow. Sin errores JavaScript en landing y las dos fichas.

Destino de rollback anterior: ff87d925-d5f9-46ca-bf1b-ee8a81cf5d8f (https://ff87d925.cambiometro.pages.dev). Usar `npm run pages:rollback -- <deployment-id>` desde la raíz app canónica con las credenciales operativas. No requiere restauración de datos.

El cierre funcional cubre navegación y selector del directorio. La estabilización de gastos/personas de apoyo/dietas, el menú lateral dentro de la ficha, dashboard e investigaciones siguen el orden del plan general; no se presentan como terminados.
