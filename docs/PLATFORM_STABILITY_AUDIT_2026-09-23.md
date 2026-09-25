# Auditoría de estabilidad de plataforma — 23-09-2026

## Alcance y criterio

Consulta de sólo lectura contra la API productiva, el catálogo R2 y artefactos estáticos publicados. No se descargaron universos completos, no se escribió en R2/D1 y no se promovieron datos. Producción/R2 es la referencia; un corte diferente no se clasifica como error sin comparar su alcance.

Catálogo consultado: `catalog/v1/manifest.json`, generado el `2026-09-23T12:44:29.586Z`, 149 particiones. La API `/api/v1/sources` respondió HTTP 200.

## Conteos productivos visibles por fuente

| Fuente/categoría | API o catálogo R2 | Estado y límite conocido |
|---|---:|---|
| Transparencia Activa CPLT | 1.243.761 | Parcial; corte visible hasta 15-09; el catálogo R2 agregado no incorpora sus filas como particiones ordinarias. |
| Cámara | 59.240 | Parcial; asistencia, votaciones y autoridades; gastos se reportan como componente aparte (16.275), no sumar dos veces. |
| Senado | 1.428 | Parcial; el padre excluye votaciones (218) y gastos (9.046), expuestos como componentes distintos. |
| Votaciones Senado | 218 en R2 | Parcial. Una prueba local aislada consultó 6 votaciones nuevas, IDs 11341–11346, del 20 al 23-09; no publicadas. |
| Gastos Cámara | 16.275 en catálogo/API; 19.530 en el artefacto estático | Desfase de alcance/corte por conciliar. El subconjunto estático cubre 03–08/2026. |
| Gastos Senado | 9.046 en API/R2; 9.021 en artefacto estático | Inconsistencia real: faltan 25 filas en el estático, todas de 03/2026 (R2/API 1.650; estático 1.625). El estático tiene enero–julio 2026, no el histórico 2012–2025. |
| ChileCompra OCDS | 74.142 | Parcial; último corte productivo conocido 21-08. La actualización de septiembre se detuvo por HTTP 403 en el archivo mensual y el guard rechazó 0 registros; release anterior conservado. |
| InfoLobby | 71.467 | Parcial; el total de registros está disponible para consulta R2. |
| InfoProbidad | 16.077 | Parcial. |
| Registro Ley 19.862 | 62.172 en API; 62.443 en catálogo R2 | Diferencia de 271; requiere conciliar proyección y catálogo. |
| DIPRES | 247.287 | Agregado/no individual; `queryableCount=0`, no tratar como nómina ni pago personal. |
| Contraloría | 310 | Parcial. |
| SERVEL | 23.894 | Parcial. |
| SINIM | 3.105 | Parcial; corte conocido 21-08. |
| INE Censo 2024 | 346 | Conectado; registros de contexto agregado. |
| Movimientos | 46 filas documentadas + 2 señales | Corte de 46 eventos al 14-09; Páez (17-09) y Bravo (15-09) se mantienen separados “En confirmación”. Checksum del release de 46 filas: `66cb8486aace545919e2bd4e779053862524bb554cc8986c4da1eaa812821ed2`. |

Los conteos de padres, componentes y fuentes agregadas tienen alcances distintos. No deben sumarse para anunciar un total único de “registros completos”. El manifiesto marca muchas fuentes `partial`; ello no significa cero filas ni demuestra por sí solo un fallo.

## Hallazgos que bloquean declarar todo reconciliado

1. El artefacto público de Gastos Senado contiene 9.021 filas frente a 9.046 en la API R2. La comparación paginada del período `2026-03` aisló 25 IDs ausentes en el estático y cero IDs extra. La causa aguas arriba aún no está probada. No publicar una reconstrucción hasta medir cuota R2, reconciliar el delta y conservar rollback.
2. La cobertura demostrable de Gastos Senado es enero–julio de 2026 (7 períodos), no 174 meses ni el histórico 2012–2025. Gastos Cámara estático cubre marzo–agosto de 2026. No afirmar que se muestran todos los meses históricos.
3. En la última ejecución semanal de ChileCompra (21-09), el archivo `https://ocds-lic-files.da.mercadopublico.cl/2026/202609.7z` respondió 403 en Actions y también respondió 403 a una comprobación HEAD local. El ETL rechazó correctamente el release vacío; no se reemplazó el anterior.
4. La última ejecución diaria de votaciones Senado desde GitHub recibió 403 para sesiones 10277 y 10278. La API oficial respondió localmente y el staging acotado obtuvo 6 filas con IDs únicos, pero eso no sustituye una revisión integral ni autoriza publicar.
5. Un workflow de Pages del 23-09 falló al compilar `next/font/google` (loader de Google Fonts); los pasos de hidratación sí se completaron. El error ocurrió en la fase de build, antes de publicar.
6. El token disponible permite listar/leer R2, pero `wrangler d1 list` responde `Authentication error [code:10000]` y Cloudflare Analytics GraphQL no autoriza. Por tanto no se puede certificar el consumo actual de D1 ni el uso agregado actual de R2. La última captura de consola compartida mostró 17,41 GB agregados, incluyendo 6,36 GB en `cambiometro-backups` y 11,08 GB en `transparencia-public-data`; es evidencia histórica, no una medición vigente.
7. No se eliminó ni redujo el backup. Su inventario/checksums completos y una restauración verificable siguen pendientes. El backup mostrado ocupa 6,36 GB y el espacio libre local observado es menor que su tamaño; no intentar una descarga íntegra en este equipo.

## Cambios seguros preparados en rama aislada

- La cronología/Home presenta las dos señales pendientes separadas de las 46 filas documentadas; total visible 48, con estado explícito y trazabilidad original.
- El workflow periódico de Gastos Operacionales deja de materializar datos en D1; R2 permanece como camino canónico y la validación impide publicar cortes vacíos.
- No se cambiaron rutas, nombres de menú ni fuente de datos de producción. No se desplegó Pages ni se escribió en Cloudflare.

## Validaciones

- `npm test`: 224 archivos y 1.173 pruebas aprobadas (incluye typecheck Front/API y guardas estáticas).
- `npm run lint`: exit 0; 141 warnings preexistentes, 0 errores.
- `git diff --check`: exit 0.
- Playwright local (390 px): Home y Movimientos sin desbordamiento horizontal ni errores de página; ambas señales son visibles.
- El build de datos productivos local se detuvo porque faltaba hidratar el release completo de Ley 19.862; no se descargó ese universo para forzarlo. `ALLOW_STATIC_SAMPLE=1 npm run pages:build` completó con exit 0 (4.674 páginas, verificaciones SEO/export y rutas); ese resultado valida código/UI, no la cobertura de datos productivos. Un workflow productivo del 23-09 hidrató los releases y luego falló en el loader remoto de Google Fonts; el build fixture local sí compiló las fuentes correctamente, por lo que el fallo remoto parece intermitente y requiere reintento en CI.
- Se añadió una protección a la ruta de despliegue UI-only para que la hidratación general de R2 no sobrescriba Movimientos cuando el commit contiene el release reconciliado validado.

## Siguiente paso seguro

Restaurar permisos de lectura de métricas R2/D1; reconciliar los 25 registros y las diferencias de conteo antes de una publicación de datos; ejecutar un preview Pages con hidratación controlada y repetir el build/font check. Mantener el backup intacto hasta probar una restauración y no volver a materializar gastos en D1.

## Verificación incremental adicional — 24-09-2026

Se consultó la API pública con `source=gastos_senado`, `limit=1` y filtros de
período, sin leer D1 ni descargar el conjunto completo. El resumen sin filtro
declara 154.132 filas esperadas y usa `r2-lake`; la primera página reporta
`partial` porque la paginación no escanea todas las particiones en una sola
petición. Esto no equivale a que falten datos ni demuestra cobertura completa.

| Período muestreado | Filas del período | Filas devueltas | Estado | Particiones/artefactos ausentes |
| --- | ---: | ---: | --- | --- |
| 2012-01 | 307 | 1 | complete | 0 / 0 |
| 2026-06 | 1.248 | 1 | complete | 0 / 0 |
| 2026-07 | 1.250 | 1 | complete | 0 / 0 |

La consulta de cada corte queda acotada al período; no se recorrieron los 174
meses en producción. Los resultados iniciales sólo confirmaban los períodos
muestreados; la reconciliación completa del corte marzo se documenta más abajo.

Como verificación complementaria de bajo costo, se contrastó el inventario local
de manifests/archivos sin imprimir ni exportar las filas: hay 174 manifests y
174 artefactos, los 174 SHA-256 coinciden y la suma de conteos da 154.132. El
resumen que alimenta la página productiva y el total esperado del API también
declaran 154.132. En el calendario entre enero de 2012 y julio de 2026 no está
el período `2020-12`; por eso existen 174 períodos publicados y no 175 meses
continuos. Esto refuerza la cobertura declarada, pero no demuestra que cada
objeto local sea byte a byte el mismo objeto productivo.

La discrepancia de marzo quedó reconciliada con la versión actual: se recorrieron
las 17 páginas del API productivo de `2026-03` (límite 100), se compararon sus
1.655 IDs con el artefacto estático local y la partición R2 local, y los tres
conjuntos coincidieron exactamente: 1.655 únicos, cero ausentes, cero extras y
cero duplicados. El API marcó el período `complete`, sin particiones ni
artefactos faltantes. Por tanto, el delta de 25 filas registrado en la captura
del 23-09 corresponde a una versión anterior y no está presente en el release
actual.

También se consultó directamente el endpoint oficial del Senado para
`2020-12`: HTTP 200, estado `ok`, `meta.pagination.total=0`. Ese período se
clasifica como **sin registros publicados por la fuente**, no como un mes
perdido por el ETL. La página productiva y el resumen del release actual declaran
154.132 registros; el API permite paginar las filas por fuente y período.
Resultado de cierre del alcance solicitado: los 174 períodos con registros están
incluidos; no hay carga adicional que hacer para cubrir `2020-12`.

No se escribió en R2 ni D1, no se promovió otro release ni se desplegó la web.

También se integró el PR #621: el ETL remoto programado de votaciones Senado
se retiró del workflow y del calendario versionado; se conserva la ejecución
local ya registrada y la reparación manual aislada. La integración no desplegó
la web ni escribió en R2/D1.

La API oficial del Senado se consultó localmente para `2026-09-20` a
`2026-09-24`. Devolvió 12 votaciones con IDs `11341–11349`, `11352–11354`
(sin asumir continuidad de IDs). Una consulta productiva acotada al mismo rango
devolvió exactamente esos 12 IDs y fechas; la partición pública de septiembre
declara 41 filas, `complete`, cero particiones ausentes y cero artefactos
ausentes. El lote ya está en R2; no se hizo una publicación adicional. Esto
cierra la comprobación de esos días, no una auditoría de todo el histórico ni
la validación de cada pantalla de detalle parlamentaria.

## Verificación de continuidad — 25-09-2026

### Movimientos

- `GET /api/v1/records?source=movimientos&limit=5&offset=0` respondió HTTP 200
  desde R2 y declaró `meta.total=46`, `sourceStatus=complete` y
  `publishedRows=46`. El evento más reciente del conjunto oficial es del
  2026-09-14 (Jorge Olivares).
- La Home productiva incluye las fichas de Fabián Páez y José Bravo separadas
  como **en confirmación**. No forman parte de las 46 filas oficiales de la API.
- El Ministerio de Salud publicó que solicitó la renuncia de José Bravo Burgos,
  pero el comunicado no fija fecha efectiva ni identifica a quien asumió. Se
  mantiene la señal pendiente hasta encontrar evidencia primaria de eficacia.
  [Comunicado del Minsal](https://www.minsal.cl/el-ministerio-de-salud-informa-que-solicito-la-renuncia-del-secretario-regional-ministerial-de-salud-de-la-region-de-la-araucania/)
- Para Fabián Páez, las notas de Emol y BioBioChile informan que la salida se
  materializó el 17-09, pero no se localizó en esta revisión un decreto o
  comunicado primario. Se conserva en confirmación y fuera del total oficial.
  [Emol](https://www.emol.com/noticias/Nacional/2026/09/17/1211717/renuncia-38-seremi-energia-coquimbo.html),
  [BioBioChile](https://www.biobiochile.cl/noticias/nacional/region-de-coquimbo/2026/09/17/baja-48-del-gobierno-renuncia-seremi-de-energia-coquimbo-por-no-acreditar-requisitos-academicos.shtml)
- Resultado: ambas señales están visibles en Home y no faltan en el tratamiento
  público; el flujo oficial no las incorpora al conteo hasta completar la
  comprobación primaria. Sin cambios en R2/D1 ni promoción.

### ChileCompra

- El workflow `35615467921` (21-09-2026) terminó en fallo durante “Ingerir y
  proyectar ChileCompra OCDS”. El respaldo masivo devolvió
  `CHILECOMPRA_BULK_HTTP_403` para septiembre de 2026.
- La guardia `assertChileCompraReleaseUsable` rechazó el lote con
  `CHILECOMPRA_RELEASE_EMPTY_OR_UNAVAILABLE` y resumen
  `listings=0, documents=0, records=0, projectedRecords=0`.
- Por `set -e`, los pasos de proyección/publicación se omitieron; también se
  omitieron todos los pasos de materialización D1. El release anterior se
  conservó. Es un bloqueo de disponibilidad del origen, no un fallo de R2
  demostrado.
- Decisión segura: no repetir el ETL completo ni publicar un mes vacío. El
  siguiente intento debe usar el origen alternativo oficial con alcance y
  paginación acotados, preflight de conteos y estimación de bytes antes de
  cualquier publicación. No hubo escritura remota en esta verificación.
