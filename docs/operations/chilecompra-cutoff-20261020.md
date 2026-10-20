# ChileCompra — corte de registros normalizados — 20-10-2026

## Estado y ruta

Worktree `C:\Users\jorge\.codex\worktrees\advisory-ui-total\cambiometro-audit`, rama `codex/chilecompra-cutoff-20261020`. Cambio separado del arreglo municipal #812, sin reabrir los puntos cerrados. Se conserva el snapshot local de votos; no forma parte de este cambio.

**Arreglo interno cerrado:** PR #813 fusionado `2026-10-20T12:10:50Z`, main `5483cd7f449a69f0727d388514f7d49604ab36ab`. Head validado `eb32fec9b7d6d74774d17db7c4ec31915c7c0bf8`: Quality `39419312569`/`39419319849`, seguridad `39419319778`, CodeQL `39419312729` y build/E2E `39419319922` satisfactorios. No repetir implementación ni reproducción por una nueva orden de «continúa».

**Ejecución terminada y publicación bloqueada por coste:** [39420315605](https://github.com/jmorgadodev/cambiometro/actions/runs/39420315605), main corregido, año 2026 / mes 07. Extracción y reconstrucción del índice satisfactorias; publicación R2 fallida por la guarda del 95% a las `2026-10-20T15:43:05Z`. **No está en curso, no esperar ni relanzar este run. Julio no está publicado en R2/Pages.** El seguimiento local `98119` y la espera `119` ya terminaron.

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

Jorge autorizó explícitamente el 20-10 **ejecutar y publicar julio sólo con guardas verdes y coste cero, sin D1**. No volver a pedir esa misma autorización para este run. Panel Cloudflare de cuenta observado el 20-10: $0 facturable, total 9,17 GB, principal 8,12 GB, respaldo 1,05 GB, otros 257,84 kB; Clase A 12,03k y B 74,94k, ciclo 26 sep–26 oct. Son cifras redondeadas, no el presupuesto exacto del candidato. La guarda debe inventariar/proyectar antes de subir y detenerse al límite acordado; no se levantó el 95% ni se autorizó borrar respaldos. `wrangler r2 bucket info` confirmó tamaños redondeados y 25.508/4.108 objetos principal/respaldo, no una suma exacta de bytes.

La acción `d1-preflight` no recibe opt-in y mantiene `proceed=false`; su consulta es sólo GraphQL de métricas Cloudflare, no SQL ni materialización. El paso de materialización D1 debe quedar omitido. No se modificó esa política.

## Resultado definitivo del run y recuperación sin reextracción

- Extracción/proyección: `12:11:30Z–15:25:15Z`, **success**, 65.609 registros normalizados y 65.609 proyectados. La diferencia con los 65.572 del run del 19-10 es un corte consultado en otra fecha, no una equivalencia asumida.
- Reconstrucción del índice: `15:25:15Z–15:41:47Z`, **success**: 74.142 base + 65.609 nuevos = **139.751**. Cada archivo de registros general/por fecha declara 291.692.298 bytes. La reconstrucción tardó unos 16 minutos; no repetirla para volver a demostrar el contrato corregido.
- Guarda R2: `R2_WRITE_BLOCKED_AT_95_PERCENT`, pico **9.799.482.720**, final proyectado **9.793.820.880**, presupuesto 10.000.000.000 y techo 95% = 9.500.000.000. El pico supera ese techo en **299.482.720 bytes**. Este cálculo ya considera la cuenta y el plan, no sólo un bucket ni el panel redondeado.
- `publish-data-lake.mjs` ejecuta `assertRemoteR2WriteBudget` antes de sus borrados, uploads y activaciones R2. La guarda lanzó antes de esas acciones. Los pasos de publicación de entradas estáticas, refresco del catálogo y D1 quedaron omitidos. No se borró respaldo ni se levantó el umbral.
- Comprobación posterior `2026-10-20T15:51:08.976Z`: manifiesto R2 de búsqueda sigue SHA-256 `b91d5c6a1d2c0df4433c0cf20396f9071ebaa9a802135c7dd8a88691688fc630`, 74.142 filas; catálogo ChileCompra conserva sólo junio y su checksum anterior. API paginada HTTP 200, 74.142, backend `r2-lake`; Pages conserva dominio `87f9b0b7bfa41d46ad1714c1ecab44f5c14685f455bc345e5f7deb3d8c98aa5b` y ambos checksums previos. Otras fuentes pueden publicar mientras tanto: no exigir que el catálogo global conserve su hash anterior.

**Importante: no se perdió el candidato mensual.** El publicador sube artefactos a GitHub Releases antes del preflight R2; no confundirlos con una activación pública del índice R2. Se comprobaron existencia/digests vía GitHub, sin descargar el archivo de registros completo:

| Artefacto preservado | Ubicación/digest |
| --- | --- |
| Julio, 65.609 filas, 12.080.577 bytes comprimidos | Release `data-chilecompra-2026-d39dd8ee32c5c073`, asset `chilecompra-2026-07-records.jsonl.gz`, SHA-256 `e500ac4d3d63f002a8b430e24485930628c04b4d732dbf5b91bc2e4372376deb`; SHA descomprimido declarado `2e528663a5bd18e5085c2639fbf43ddd98300e0f1d2bf4bb8ec0ad1c71ee6d97`. |
| Manifiesto de julio, 1.371 bytes | Mismo release, `chilecompra-2026-07-manifest.json`, SHA-256 `d39dd8ee32c5c0731088d37898ce176154c62c3713c78bdf016ff6f79937df4d`. Descargado acotadamente y hash comprobado. Estado **partial**, no mes/año completo acreditado. |
| Entidades candidatas, 353.374 bytes comprimidos | Release `data-chilecompra-2026-61e1405cc56b509f`, `chilecompra-2026-entities.jsonl.gz`, SHA-256 `970c6884188d05d3dd3a45f3801e2cd0b517b88aa7380510a9b111a8836aba61`. |
| Manifiesto de fuente, 1.165 bytes | Release `data-chilecompra-2026-manifest-da68b0c4cdfe07e1`, `chilecompra-2026-source-manifest.json`, SHA-256 `da68b0c4cdfe07e13b4d35e9a4835a4b2fe9e2b05d2ce13dbdcc762e7b0f2e74`. Descargado acotadamente y hash comprobado. |

El original OCDS comprimido de 25.908.050 bytes figura **no archivado**; no afirmar que todos los documentos brutos están recuperables. Sí están preservados los registros normalizados candidatos y el reporte de documentos rechazados de 1.052 bytes. Antes de retomar, verificar hashes, esquema, período, filas e IDs sobre el candidato guardado en GitHub; no volver a consultar todo julio a la API.

**Control de integridad pendiente antes de promover:** el manifiesto candidato declara 7.153 entidades frente a 9.430 del release conservado, mientras sus registros sí combinan junio y julio. Es una diferencia de alcance que requiere contrastar IDs y conservar referencias históricas; no afirmar pérdida de identidades sin ese cotejo ni presentar un conjunto mensual como índice histórico completo.

**Siguiente acción:** resolver el margen de almacenamiento sin borrar historial/respaldo ni superar 95%; se consultó a Jorge entre optimizar los índices/reanudar el candidato o posponer julio. La autorización de publicación con guardas verdes sigue vigente, pero no autoriza saltar una guarda roja. Si se retoma, partir del catálogo y ReleaseSet productivos frescos y modificar sólo ChileCompra: el catálogo candidato GitHub anterior puede haber quedado atrás de otras fuentes. No restaurar ese catálogo global ni reextraer el mes. Después verificar el `pages-static-refresh.yml` y `etl-publication-guard.yml` asociados sin duplicarlos, manifiestos, API y smoke. El punto 7 permanece abierto; esto no certifica meses posteriores.
