# Publicación de preview Pages — revisión acotada 14-10-2026

## Alcance y referencia

- Punto 5 de `transparencia-app/docs/pendientes-verificados-2026-10-11.md`. No repetir cierres anteriores ni iniciar una auditoría de fuentes.
- Worktree: `C:\Users\jorge\.codex\worktrees\advisory-ui-total\cambiometro-audit`; rama `codex/pages-preview-health-20261014`, base `origin/main` `2ff98fe7`.
- Sólo publicación y comprobación de un preview del código vigente. No cambios de diseño, ETL, registros R2, D1 productivo, DNS ni promoción productiva.

## Fallo conservado como evidencia

- Workflow `38252856059`, 12-10-2026, deployments fallidos `a9b42d9f-604e-4698-92e4-5c96b040e8f3` y `662cb05a-a1a5-496e-ac95-8d8d84a049a7`.
- La carga de archivos terminaba; Cloudflare fallaba al activar el deployment con `Failed to publish your Function. Got error: Unknown internal error occurred`.
- Consulta acotada de los logs del último deployment: una sola línea con ese mismo error, sin explicación adicional. No se infiere una causa específica de código, datos, credenciales o bindings a partir de un error genérico.
- Fecha/opciones de compatibilidad coinciden en preview y producción: `2026-08-24`, sin flags. La API del proyecto no declara bindings en ninguno. El repositorio exporta el frontend estático; la API pública está separada. El término Function en el error no acredita por sí mismo un fallo en un componente del sitio.
- Deployment productivo de referencia al comenzar: `c7ba3df8-e9ea-4509-adc8-cfc0e7cee933`, publicado el 13-10-2026. No se reemplaza para probar preview.

## Prueba de recuperación

- Reutilizar `pages-ui-refresh.yml` desde `main`, modo `ui-only`, `publish_pages=false`, `preview_branch=preview-health-20261014`, guardas y pruebas habituales intactas.
- Ejecución iniciada: [38524431098](https://github.com/jmorgadodev/cambiometro/actions/runs/38524431098), commit `2ff98fe72960b609e2e5b2214402c4b7a9a6172a`.
- Respetar el bloqueo global de publicación. No cancelar otros releases ni publicar reintentos en paralelo.
- Hidratar los releases vigentes y fijar/verificar ReleaseSet con el flujo existente; no construir desde snapshots Git. La preparación de D1 de integración es local y no toca la base productiva.
- Si reaparece el fallo, conservar producción y registrar el deployment y los logs exactos. No retirar validaciones ni publicar producción como sustituto del preview fallido.

## Criterio de cierre

Workflow satisfactorio, deployment de entorno `preview` confirmado por API Cloudflare, respuesta HTTP y contenido verificados, ReleaseSet servido correspondiente al artefacto y comprobación de navegador. Cerrar sólo con esas evidencias. Una ejecución sin publicar, un artefacto local o una promoción productiva no cumplen este criterio.

## Resultado y cierre — comprobado 15-10-2026

- Run `38524431098`: `success`; publicación de preview aprobada y ambos pasos de publicación/registro productivo omitidos. Se conservaron pruebas, hidratación y bloqueo global. No fue necesario modificar código, configuración ni permisos.
- Deployment `f0a20877-0cef-4808-a8b8-ff898c51d3e0`, entorno `preview`, rama `preview-health-20261014`, activado el 14-10 a las `07:05:26 UTC`, commit `2ff98fe72960b609e2e5b2214402c4b7a9a6172a`.
- [Preview inmutable](https://f0a20877.cambiometro.pages.dev) y [alias de revisión](https://preview-health-20261014.cambiometro.pages.dev).
- HTTP 200 el 15-10 en `/`, `/buscar/?q=kaiser`, `/politico/vanessa-kaiser-barents-von-hohenhagen/` y `/data/release-set.json`.
- ReleaseSet servido: `bbabef2a06130de469da721213daeb1e3491497d3dba5f1a422a9b36b130fe85`; SHA-256 del JSON: `914edb38f943d1fa3dc7c56a4d782219961331e4cf027689c2dabe03cbe2f511`. Coincide con las verificaciones del build, pin y prepublicación del workflow.
- Navegador real: Home visible; “Ver todos los resultados” conserva `kaiser` y abre `/buscar?q=kaiser`; resultados cargados (30 fichas o entidades / 94 registros consultados en esta ejecución), paginación 1–15 y 16–30; Vanessa visible en segunda página y enlace abre su ficha. Es un smoke de navegación, no certificación de identidad o exhaustividad del índice.
- Vista móvil 390 × 844: ficha cargada, H1 correcto, ancho del documento 382 px, sin desbordamiento horizontal; override restablecido. No se observaron errores ni avisos de consola en la comprobación.
- La primera interacción con el aviso de cookies agotó el tiempo de espera del controlador; después el aviso ya no estaba presente y la navegación funcionó. No se usa esa interacción como evidencia de una prueba específica de consentimiento.

Producción avanzó **por otro flujo posterior**, no por esta prueba: `pages-static-refresh.yml`, run `38567649448` iniciado el 14-10 a las `12:56:04 UTC`, y deployment productivo `f82b9dbd-9910-4630-b2d0-7b7bde89ad37` creado a las `13:07:01 UTC`. ReleaseSet productivo observado el 15-10: `ea065664176746f276648cf07b432eb15dc412f2dec95811c99b828264cf1d98`, SHA-256 `7c375e4b9a46cf64a02438616c51905f76e4a88910cf9ed855aab4fbc1544750`. No promover este preview anterior sobre ese corte más nuevo ni interpretar la diferencia como regresión.

**Punto 5 cerrado: 100% del criterio acotado de publicación y comprobación de preview.** El error histórico no se reprodujo y el proveedor no expuso su causa interna. No afirmar que se corrigió una causa específica ni garantizar que nunca se repetirá. Ante recurrencia, conservar producción y registrar deployment/log exactos; no saltarse las guardas. Siguiente punto ejecutable: 6, conciliación municipal por lotes; punto 4 sigue en observación programada.
