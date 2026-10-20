# ChileCompra — corte de registros normalizados — 20-10-2026

## Estado y ruta

Worktree `C:\Users\jorge\.codex\worktrees\advisory-ui-total\cambiometro-audit`, rama `codex/chilecompra-cutoff-20261020`. Cambio separado del arreglo municipal #812, sin reabrir los puntos cerrados. Se conserva el snapshot local de votos; no forma parte de este cambio.

**Diagnóstico reproducido y corrección local validada; pendiente CI/integración. No se publicó julio ni se ejecutó otra extracción mensual.**

## Qué falló realmente

El [run programado 39277188787](https://github.com/jmorgadodev/cambiometro/actions/runs/39277188787), del 19-10, terminó en `CHILECOMPRA_RELEASE_EMPTY_OR_UNAVAILABLE`: período `2026-07`, 34.729 listados, 38.671 documentos, 65.572 registros normalizados y **0 proyectados**. El masivo respondió 403, pero el fallback sí obtuvo documentos; no atribuir todo el fallo al bloqueo externo.

`normalizeOcdsPackage` y `fetchChileCompraMonth` entregan la fecha en `record.fecha`. Su único consumidor productivo del filtro, `ingest-chilecompra.mjs`, le pasa esos registros directamente. El filtro y su declaración de tipos esperaban incorrectamente `record.data.fecha`, por lo que descartaban también las fechas válidas. La prueba anterior usaba ese wrapper equivocado y no componía normalizador y filtro. La guarda de cero detuvo la publicación correctamente; no retirarla para hacer pasar el ETL.

## Original acotado y prueba antes/después

- Listado oficial `https://api.mercadopublico.cl/APISOCDS/OCDS/listaOCDSAgnoMes/2026/07/0/1`: HTTP 200, 309 bytes, un resultado y total declarado 8.004 licitaciones; observado `2026-10-20T11:57:54.770Z`. No sumar ese total parcial a otras unidades ni convertirlo en total de contratos.
- Su enlace oficial, normalizado a HTTPS: `https://api.mercadopublico.cl/APISOCDS/OCDS/tender/5839-3-LP26`. HTTP 200, 3.522 bytes, SHA-256 `18bf64f97aa57f396c2128b26e18fe15c58136f90d5454d0beb4f0ebc1d3034a`. Un registro `ocds-70d2nz-5839-3-LP26-tender`, fecha `2026-07-10T10:50:12Z`.
- Antes del arreglo (`2026-10-20T11:58:08.000Z`): normaliza 1, corte 31-07 devuelve 0. Después (`2026-10-20T12:00:05.683Z`), mismo documento/hash: corte 31-07 conserva 1, corte 09-07 devuelve 0. Son tres solicitudes oficiales / 7.353 bytes en total, incluidos listado y comprobación posterior; no es un replay mensual ni una prueba de todos los registros.
- RED: dos pruebas fallaron. GREEN: 22 pruebas en conector y selección de período; ESLint sin errores y typecheck sin diagnósticos. Revisión independiente sin bloqueos. Se reutiliza la fixture existente y se compone normalizador → filtro, sin inventar filas productivas.

## Conciliación acotada del release conservado

Lecturas de metadatos R2, 20-10: dos objetos, 236.179 bytes, sin archivos de registros ni escrituras. Guardados localmente en `artifacts/chilecompra-contract-20261020/` (ignorado).

| Capa | Evidencia |
| --- | --- |
| `catalog/v1/manifest.json` | 143.893 bytes, SHA-256 `0eee48a839aeffc848c61fee0e982e9620eef19f4c51fc9a50556c1274391728`, generado 19-10; ChileCompra `partial`, 74.142 registros; sólo partición publicada `chilecompra/2026/06`. |
| Partición declarada en catálogo | Junio 2026, 74.142 registros, checksum `82aedb1d0f6fd8e2b359f01e06b1ed39239ccbc504cdadfb35980d0ff28476e4`. Julio figura como descubierto, no publicado. No se descargó ni rehasheó su archivo completo. |
| `indexes/v1/chilecompra/manifest.json` | 92.286 bytes, SHA-256 del manifiesto `b91d5c6a1d2c0df4433c0cf20396f9071ebaa9a802135c7dd8a88691688fc630`; 74.142 filas, páginas de 50, 1.483 descriptores de rangos continuos. Los descriptores no tienen `count`: no interpretar una suma inexistente como cero filas. |
| API `/api/v1/records?source=chilecompra&limit=1` | HTTP 200, 3.242 bytes, observado `2026-10-20T12:00:31.720Z`; total/publicadas/esperadas 74.142, backend `r2-lake`, 0 particiones/artefactos faltantes. Una fila de junio servida. `sourceStatus=complete` se refiere al índice publicado (`totalScope=published-index`), no al año o fuente nacional completos. |
| API `/api/v1/sources` | ChileCompra `partial`, consultables 74.142. `periods=[]` no prueba ausencia de junio: la partición está documentada arriba. El `indexChecksumSha256` de inventario `1bce7de1ed00f321363f1a5e0e7a920d679f2e767264b2b327db6acb565f1bd8` no es el hash del manifiesto de búsqueda; no compararlos como el mismo objeto. |
| Pages ReleaseSet | Dominio ChileCompra `87f9b0b7bfa41d46ad1714c1ecab44f5c14685f455bc345e5f7deb3d8c98aa5b`; proyección SHA-256 declarado `9187f2ccbe46e87c65908112c4b57ab602079ea2433979625a04b48e099a019d`. Metadatos leídos, no descarga/reconteo de su universo. |

Esta conciliación verifica declaraciones y un acceso paginado, no el contenido entero de 74.142 filas. No presenta 888.693 filas locales antiguas como publicadas, ni promete cobertura anual 2026. No se consultó D1; no se guardaron respaldos nuevos ni se alteró el release público.

## Continuación y criterio restante

Integrar sólo el contrato corregido tras CI verde. Antes de una extracción/publicación mensual completa, exigir preflight actualizado de coste cero y guardas del workflow; conservar junio ante fallos. El run fallido no conserva artefactos de checkpoint reutilizables: no declarar reanudación de sus 38.671 documentos ni relanzarlo en bucle. El nuevo corte requiere sus conteos, períodos, checksums, índice, API y Pages concordantes antes de anunciar julio como publicado. Este cambio no elimina el 403 del masivo ni certifica meses posteriores.
