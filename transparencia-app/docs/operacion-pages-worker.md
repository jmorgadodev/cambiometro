# Operación de Pages + Worker

## Alcance y punto de partida

El repositorio que se sube es `C:\Users\jorge\Proyectos\cambiometro-public`. El repositorio `cambiometro-audit` no forma parte del producto.

La rama de trabajo de esta corrección nace de `origin/main` (`0632de2`, agosto de 2026). La rama histórica de la migración estática quedó desfasada respecto de `main`; no debe mergearse a ciegas.

## Diagnóstico del falso verde

El ETL estaba verde porque validaba y publicaba sus artefactos en R2. Eso no probaba que:

- Pages estuviera conectado al dominio público.
- el Worker tuviera todos los bindings y tablas disponibles;
- la UI estática cargara sus chunks sin API de Next;
- el contrato de `/api/funcionarios` leyera la proyección CPLT;
- D1 y R2 representaran el mismo release de transferencias.

La producción observada antes del cutover todavía servía OpenNext en `cambiometro.impulsacv.cl`. Pages respondía como sitio estático en `cambiometro.pages.dev`, pero no atiende `/api/*`; esa ruta requiere el Worker y el mismo dominio después del cutover.

## Contratos de datos

Las transferencias se generan desde `data/lake/partitions/ley-19862`. El build exige ese lake completo y falla si sólo existe la proyección/sample; nunca publica un sitio parcial. Crea `public/data/transferencias/` con páginas de 50 filas, índice de búsqueda, resumen y manifest con checksum. El único bypass es `ALLOW_STATIC_SAMPLE=1`, reservado al workflow E2E de PR para levantar fixtures locales; nunca se define en Pages producción.

Hay dos snapshots que no deben mezclarse:

- snapshot canónico fijado en el repositorio: 59.361 filas y `$5.011.094.170.302`;
- release R2 local observado durante la auditoría: 59.544 filas y `$5.013.581.357.467`, checksum `13b9de4b9d4c07ad4a46afb9b4b4a9fdc9def947f0839544ce12def1b83e5c35`.

La discrepancia es de versión, no se corrige recortando filas. El guard `npm run check:transfer-release` verifica que las páginas, el resumen, el índice de búsqueda y `static-site-manifest.json` tengan exactamente el mismo conteo, monto y SHA-256. El release que genere el ETL pasa a ser la fuente de verdad; los fixtures 59.361 sirven como regresión histórica, no como límite artificial para impedir actualizaciones válidas.

La página estática y el manifest deben leer el mismo resumen generado. El selector de `data/generated/transferencias/summary.json` no debe descartarlo por conservar sólo una muestra compacta. Los `loading.tsx` de segmentos se retiraron del export estático porque producían límites RSC incompletos y React #419 durante hidratación; los loaders de datos de cliente conservan estados visibles de carga, vacío, error y reintento.

El export App Router también genera metadatos internos (`index.txt`, `__PAGE__` y `__next._*`). Para mantener el sitio bajo el límite de 20.000 archivos de Pages y conservar la navegación real, el build conserva sólo `index.txt`, elimina los metadatos de árbol/página y desactiva el prefetch de los enlaces internos estáticos. El resultado esperado es aproximadamente 16.363 archivos, cero metadatos de árbol y transiciones que cargan el `index.html` de la ruta destino.

La nómina CPLT se publica en R2 bajo `projections/funcionarios-v1/manifest.json` y una proyección por organismo. El Worker lee la proyección solicitada, filtra, ordena y pagina; no embebe el dataset en el bundle.

## Flujo local

Desde `transparencia-app`:

```bash
npm ci
npm run pages:build
npm run pages:verify
npm run api:typecheck
npm run api:size
npm test
npm run verify:static:browser
npm run check:transfer-release
```

El build genera `out/`, `public/data/` y artefactos de Worker. Son salidas reproducibles y no deben commitearse. La publicación de datos requiere credenciales de Cloudflare y sólo se ejecuta desde CI o con autorización explícita.

`npm run verify:static:browser` levanta un servidor local del directorio `out/`, abre un contexto nuevo por ruta y espera 5,2 segundos. Comprueba `/`, listados, `/cruces`, `/transferencias`, `/funcionarios`, `/entidades`, las fichas Kaiser/Bianchi/Maipú, dos navegaciones internas, el redirect `/municipalidades/muni-maipu` y la ausencia de errores, recursos 4xx/5xx, overlays o spinners permanentes. El criterio general es HTTP 200, cero errores de React/CSP, cero overlay activo y ausencia de textos de carga permanentes.

`verify-prod-full.mjs` toma por defecto conteo, monto y páginas desde el manifest publicado. Para auditar el snapshot histórico fijo se pueden pasar `EXPECTED_TRANSFER_ROWS=59361`, `EXPECTED_TRANSFER_AMOUNT=5011094170302` y `EXPECTED_TRANSFER_PAGES=1188`; así las invariantes de regresión no bloquean releases nuevos que pasen la coherencia criptográfica.

### Última verificación local auditada

Ejecutada desde `C:\Users\jorge\Proyectos\cambiometro-public\transparencia-app` en la rama de trabajo de la migración estática:

- `npm test`: 125 archivos y 693 tests aprobados.
- `npm run lint`: 0 errores; quedan 156 warnings preexistentes que no bloquean el build.
- `npm run coverage:sweep`: todas las métricas canónicas aprobadas, incluyendo 769 votaciones, 155 diputados, 50 senadores, 79 movimientos, 59.361 filas de fixture, 74.142 ChileCompra, 60.523 InfoLobby y 291 informes CGR.
- `npm run api:size`: Worker de 82.186 bytes, límite 1.000.000.
- `npm run pages:build`: 5.016 HTML, 3.881 parámetros de entidades, cero rutas dinámicas `ƒ`, 16.363 archivos y 517.450.820 bytes.
- Release local generado: 59.544 filas, 1.191 páginas, monto `5.013.581.357.467`, checksum `13b9de4b9d4c07ad4a46afb9b4b4a9fdc9def947f0839544ce12def1b83e5c35`.
- `npm run check:transfer-release`: conteo, monto, páginas, índice y checksum coherentes.
- `npm run verify:static:browser`: 75/75 verificaciones aprobadas; cero spinners, overlays, errores de navegador o recursos 4xx/5xx en las rutas críticas. También validó Kaiser, Bianchi, Maipú y el redirect 301.
- El fixture de PR (`ALLOW_STATIC_SAMPLE=1`) también usa el mismo esquema de manifest que producción: build validado con 5.016 HTML, 15.192 archivos y 1.000 filas de muestra coherentes. Nunca se permite ese bypass en Pages producción.
- El Worker expone `/api/v1/health` y `/api/v1/health/data`; ambos devuelven 200 sólo cuando D1, el manifest completo de transferencias en R2 y el conteo del mismo universo están disponibles, y 503 con el diagnóstico si falta alguno o difieren.
- La auditoría del lake local encontró una diferencia de frescura, no IDs duplicados: el snapshot versionado `source-health.json` (21-ago) registra 59.361 filas y `$5.011.094.170.302`, mientras el lake completo regenerado el 24-ago contiene 59.544 IDs únicos y `$5.013.581.357.467` (183 filas nuevas, `$2.487.187.165`). El workflow de Pages hidrata el lake completo y regenera la proyección antes de construir; no se debe mezclar el snapshot antiguo con el release nuevo. El health del Worker además compara el conteo D1 contra el manifest R2 y devuelve 503 si difieren.
- Los workflows ETL que publican el lake deben ejecutar `data:lake` después de generar proyecciones/subsets y antes de `data:publish`; sin `data/lake/publish-plan.json`, la ingestión puede terminar bien pero la publicación falla antes de R2.
- Los workflows que usan `data:publish --releases --r2` necesitan `contents: write` acotado al job para crear releases versionados; eso no autoriza commits y el ETL no ejecuta comandos de escritura Git.
- `uptime-smoke.mjs` prueba home, listados, ficha Kaiser, transferencias, cruces, health y búsqueda. En Actions exige `CAMBIOMETRO_UPTIME_TOKEN` y lo envía como `X-Cambiometro-Uptime-Token` a todas las rutas monitoreadas; la excepción WAF debe cubrir como mínimo la raíz `/` y los endpoints API.

El consolidado municipal CPLT se escribe en `data/lake-cplt/projections/funcionarios-v1`; el rebuild municipal busca esa ruta antes de la compatibilidad histórica `current`. Los directorios `out/`, `.next/`, `dist/`, `public/data/` y los índices/slices generados se limpian después de verificar y están excluidos de Git. Antes de continuar, `git status --short` debe permanecer vacío.

La auditoría de higiene del checkout confirmó que no hay salidas de build, `out/`, `.next/`, `dist/`, chunks, slices ni manifests generados rastreados por Git. Sí permanecen algunos snapshots grandes versionados de referencia (por ejemplo, votaciones y proyecciones base) porque tests, desarrollo local y el fallback E2E todavía los leen directamente. No deben eliminarse con `git rm` hasta que el workflow de fixtures/hydration los reemplace; hacerlo ahora rompería builds limpios y pruebas aunque producción use R2. La reducción segura ya aplicada es que los ETL diarios dejaron de hacer commits automáticos de datasets: los nuevos releases viven en R2 y el repositorio sólo recibe código, workflows y documentación.

## Flujo automático

- `etl-cplt.yml` publica la proyección CPLT en R2.
- `etl-ley-19862.yml` publica las fuentes y el release completo de transferencias.
- Los ETL que alimentan páginas estáticas construyen su proyección y publican sólo las entradas autorizadas por `scripts/static-site-inputs.mjs`. El script `data:publish:static` crea releases inmutables bajo `projections/static-site-v1/releases/<sha256>/` y actualiza el puntero `projections/static-site-v1/manifest.json` después de subir todos los archivos.
- El ETL diario publica el grupo `parlamento`: votaciones completas, personal de apoyo, movimientos y sus subsets. El ETL CPLT reconstruye `municipalidades-data.json` y `municipalidades-list.json` a partir de la nómina recién consolidada y de las proyecciones SINIM, ChileCompra y CGR hidratadas desde R2; publica el grupo `municipalidades` sin hacer commit de esos artefactos generados. El workflow diario ya no hace commits automáticos de datasets.
- `etl-expenses.yml` ejecuta por separado los conectores oficiales de gastos de Cámara y Senado, genera ambos subsets completos, materializa `gastos_camara`/`gastos_senado` en D1, valida el release y publica el grupo estático `gastos`. Se mantiene separado porque el conector WebForms de Cámara es lento y puede activar rate limiting.
- `pages-static-refresh.yml` descarga ese puntero con `data:hydrate:static -- --required --required-all`, exige las 22 entradas autorizadas, valida tamaño y SHA-256 de cada archivo y recién después ejecuta el build. Si falta el manifiesto o está incompleto, el workflow falla; no compila Pages silenciosamente con JSON antiguo del checkout. Los ETL parciales usan `--required-files` porque sólo reconstruyen su grupo.
- `pages-static-refresh.yml` recupera el release desde R2, construye Pages, verifica rutas y tamaño del Worker y publica Pages sólo cuando el disparador se ejecuta sobre `main` o se solicita manualmente.
- `public-api-worker.yml` valida el Worker en cada cambio relevante; en `main` sube una versión candidata sin promover tráfico y guarda el listado/version ID como artefacto. La promoción requiere `workflow_dispatch`, `promote_version=true` y el version ID exacto.
- `uptime-smoke.yml` verifica las rutas Pages y el origen API separado.

La automatización no cambia DNS, no promueve una versión de Worker y no debe hacerlo hasta completar el crawl frío, E2E, invariantes y rollback.

Los ETL automáticos usan `contents: read`; ya no escriben datasets ni commits en GitHub. La única excepción es `backfill.yml`, que conserva `contents: write` porque publica Releases históricos bajo demanda.

Para publicar una fuente estática desde un ETL se usa un grupo explícito, por ejemplo:

```bash
npm run data:build:subsets
npm run data:publish:static -- --groups chilecompra
```

Los datos grandes y los artefactos reproducibles permanecen fuera de GitHub: lake, `out/`, `public/data/`, slices generados, staging y manifests locales están ignorados. El repositorio conserva código, semillas canónicas, subsets pequeños y fixtures necesarios para pruebas; no se debe hacer `git add -f` de salidas de build para “arreglar” una ejecución.

Si un ETL termina verde pero no publica su grupo estático, D1/R2 puede estar actualizado mientras Pages queda con el release anterior. La guardia correcta es revisar el log de `data:publish:static` y el checksum del manifiesto R2 antes de investigar la UI.

## Estado externo comprobado

### Auditoría de Gastos Operacionales Rendidos — 26-ago-2026

El faltante observado en `/politico` no era ausencia del módulo de interfaz. El estado antes de esta corrección era:

| Capa | Existe | Falta o problema |
|---|---:|---|
| ETL Cámara | Sí | El conector oficial WebForms no se ejecutaba en `etl-daily` |
| ETL Senado | Sí | El conector oficial existía, pero no se publicaba en el release estático |
| Worker/D1 Cámara | 16.275 registros | No llegaban al HTML estático de Pages |
| Worker/D1 Senado | 0 registros observados | Debe poblarse con el workflow de gastos y quedar validado |
| Fichas `/politico/[id]` | 205 páginas HTTP 200 | Las 205 mostraban el bloque vacío “Sin registros” |
| Tarjetas `/politico` | Sí | No mostraban resumen de gastos |
| Slices estáticos | Sí | Se construían con `gastos: []` porque Pages no hidrata `latest.json` |
| Inputs Pages/R2 | Sí, para otras fuentes | No incluían subsets de gastos |

La solución incorporada mantiene una sola fuente autorizada: `data/etl/latest.json` producido por los conectores oficiales. `scripts/build-lake-subsets.mjs` genera los subsets compactos completos `gastos-camara.subset.json` y `gastos-senado.subset.json`; no genera muestras ni datos inventados. El nuevo workflow `etl-expenses.yml` los publica a R2, materializa ambos orígenes en D1 y dispara el refresco estático de Pages. El build de slices los consume y las tarjetas muestran total, períodos, último período y cantidad de filas; la ficha conserva el desglose mensual y el enlace de fuente.

`verify-prod-full.mjs` ahora marca como fallida la producción si Kaiser o Bianchi vuelven a mostrar el bloque vacío, o si el Worker devuelve cero filas para cualquiera de las dos fuentes. El objetivo es que un falso verde de infraestructura no oculte otra vez la ausencia de datos visibles.

La guardia `node scripts/verify-expense-release.mjs --required` bloquea un release si faltan los dos subsets, hay IDs duplicados, checksum incorrecto, montos/períodos inválidos o filas que no llegaron a una ficha. Por seguridad, el cambio de código aún no significa que producción ya tenga el nuevo contenido: primero debe ejecutarse con éxito `ETL Mensual - Gastos Operacionales Congreso`, y luego `Pages estático - refresco automático verificable`. Hasta ese momento la producción continuará mostrando el release estático anterior.

La auditoría también separa cobertura de datos de funcionamiento del sitio. En el mismo release se observaron 3.881 entidades, 59.912 transferencias, 205 fichas políticas y 346 municipalidades; funcionarios tenía 320 disponibles de 346 esperados. Esos números no se alteran por este cambio y siguen requiriendo sus propias guardias.

Los subsets de gastos y los slices generados están ignorados en Git. El repositorio conserva código, workflows, contratos y documentación; los datos completos viven en R2/D1 y sólo cruzan a Pages mediante el manifiesto con checksum.

### Verificación posterior al cutover — 26-ago-2026

- El dominio público ya sirve Pages: `/`, `/politico/`, `/municipalidades/` y `/api/v1/health` devolvieron `200` desde una red externa. La respuesta pública usa CSP estática sin nonce ni `unsafe-inline`.
- El Worker API conserva `/api/*`; `GET /api/v1/health` devuelve `200`. Un `HEAD` sobre ese endpoint devuelve `405` porque el contrato permite `GET`, no es una caída del API.
- Pages deployment activo: `1e02ca1b-8476-4de0-aa5f-008dcb8264e0` (`https://1e02ca1b.cambiometro.pages.dev`). Worker version promovida: `3ea6312f-6f6e-4185-9ee7-0cb2891e17c0`.
- La ruta Cloudflare confirmada es `cambiometro.impulsacv.cl/api/*` hacia `cambiometro-public-api`; el Custom Domain antiguo de OpenNext fue retirado y el CNAME ahora apunta a `cambiometro.pages.dev`.
- El smoke manual de Actions `33017384201` sigue rojo sólo en `/`: `403` desde un runner GitHub. Las otras nueve rutas, incluidos `/politico`, `/municipalidades`, la ficha Kaiser, `/transferencias`, `/cruces`, `/api/v1/health` y búsqueda, devolvieron `200`.
- Por lo anterior, la migración técnica está aplicada, pero el cierre de producción queda pendiente de que la regla WAF guardada coincida realmente con el token `CAMBIOMETRO_UPTIME_TOKEN` y cubra la raíz. No se debe declarar `uptime-smoke` verde ni cerrar el cutover mientras `/` siga en `403` desde Actions.

El 25-ago-2026, desde el checkout correcto y sin credenciales Cloudflare locales (`wrangler whoami` respondió `You are not authenticated`), se verificó sólo lectura:

- `https://cambiometro.pages.dev/` responde 200, pero su `data/transferencias/manifest.json` todavía contiene el snapshot parcial de 1.000 filas y 20 páginas.
- `https://cambiometro.impulsacv.cl/` todavía entrega HTML OpenNext con nonce por request.
- `https://cambiometro.impulsacv.cl/api/v1/transferencias?page=1&limit=1` responde 503 `DATABASE_UNAVAILABLE`.
- No se hicieron deploys, cambios de CNAME, WAF ni promoción de Worker; por tanto no existen todavía deployment ID de Pages ni version ID del Worker que registrar.

Esta evidencia es el punto de partida para el siguiente agente: primero debe obtener el token con permisos R2/D1/Pages/Workers, ejecutar el workflow con el release completo, probar preview, y sólo después hacer el cutover y correr `verify-prod-full` dos veces.

El workflow de Worker usa `npx wrangler versions upload` para separar upload de promoción, como exige el modelo de versiones de Cloudflare. Al promover, deja impreso el rollback exacto: `npx wrangler rollback <worker-version-id> --name cambiometro-public-api`.

## Cutover y rollback

Registrar antes de promover:

```bash
npm run pages:rollback -- <pages-deployment-id>
npx wrangler rollback <worker-version-id> --name cambiometro-public-api
```

Si falla una página, aparece un spinner permanente, falta un chunk, hay un 5xx/1102, o los universos no cuadran, se conserva OpenNext y se posterga el cambio de CNAME.

## Qué debe comprobar el siguiente agente

1. Confirmar el release canónico de transferencias y su checksum.
2. Ejecutar CI en la rama nueva; no usar la rama histórica desfasada.
3. Obtener un preview Pages y probarlo con el Worker candidato.
4. Ejecutar `verify-prod-full` dos veces y el crawl frío completo.
5. Registrar deployment ID, version ID, evidencia de headers/CSP y comandos de rollback.
6. Sólo después cambiar CNAME y verificar que el dominio dejó de servir OpenNext.

## Evidencia de producción posterior al release 13f1c5b

Esta sección reemplaza los estados pendientes de las notas anteriores. La
verificación se ejecutó contra `https://cambiometro.impulsacv.cl` desde el
checkout correcto el 26/27-ago-2026.

### Publicación

- `main`: `13f1c5b8558c2dcc6b54522aad33aaea82135e94`.
- GitHub Actions: `33032542057`, resultado `success`.
- Pages deployment: `0cd3adf2-864f-4e99-bc32-7ec5c02b8519`.
- Pages URL: `https://0cd3adf2.cambiometro.pages.dev`.
- Artefacto: 17.198 archivos, 5.017 HTML, 1.915.556.093 bytes.
- Worker: no se modificó ni se promovió una versión nueva en este release. La
  versión pública existente continúa siendo
  `3ea6312f-6f6e-4185-9ee7-0cb2891e17c0`.

Rollbacks exactos:

```bash
npm run pages:rollback -- 0cd3adf2-864f-4e99-bc32-7ec5c02b8519
npx wrangler rollback 3ea6312f-6f6e-4185-9ee7-0cb2891e17c0 \
  --name cambiometro-public-api
```

### Datos y aplicación

- `/data/gastos-operacionales/manifest.json`: 22.788 filas, 456 páginas,
  `$5.826.806.080`, checksum
  `d5bca5843bc5daabacbedb327f52a275cf99059dc0ebb8e970017e1ab790c456`.
- Distribución: 16.275 Cámara + 6.513 Senado. Las 1.288 rendiciones
  históricas que no corresponden al directorio vigente se conservan en el
  índice general, sin atribuirlas a otra persona.
- La ruta pública nueva `/gastos-operacionales/` responde `200` y carga sus
  chunks estáticos. Kaiser y Bianchi muestran el bloque `Gastos Operacionales
  Rendidos` en sus fichas.
- Transferencias: 59.912 filas, 1.199 páginas, `$5.020.688.584.211`, checksum
  `2144da2a41d67a8fef109273242b72fb8c321ce2eb45c81b0cbcf1252ab43838`.

### Verificaciones ejecutadas

- `verify-prod-full.mjs`: pasada 1 y pasada 2, separadas exactamente 600.000
  ms; ambas `116 verificaciones pasadas, 0 fallidas`.
- Invariantes comprobadas: dieta Kaiser `$8.291.039`, asignación `+33,7%`,
  Bianchi `25.009 / 24,89%`, `580` votos Cámara y `189` Senado, Maipú `301`
  hacia `/municipalidades/maipu`, Worker de gastos Cámara/Senado con filas,
  `74.142` ChileCompra, `60.523` InfoLobby y `291` CGR.
- Crawl frío: 5.014/5.014 rutas del sitemap en `200`, 0 fallidas, 0 `1102`,
  0 `5xx`; máximo 2.339 ms, promedio 670 ms. Las rutas principales quedaron
  registradas en `artifacts/cold-crawl-latest.json` (artefacto local ignorado
  por Git). La tabla completa ruta → status → ms está en ese JSON.
- `uptime-smoke.mjs` local: 10/10 rutas en `200`, incluyendo home, listados,
  ficha Kaiser, `/api/v1/health` y `/api/v1/search?q=Kaiser`.
- Navegador Playwright en contexto nuevo: todas las rutas críticas cargan sin
  spinner ni overlay; la nómina Maipú muestra 159 funcionarios y los chunks
  responden. El output completo queda localmente en
  `verify-static-browser-prod.log`.

### Pendientes externos que impiden declarar cierre absoluto

- El workflow `Uptime Smoke Cron (5 min)` está visible y conserva `*/5 * * * *`,
  pero el run `33034690421` sigue fallando sólo en `/` con `403`; las otras 9
  rutas pasan. El secreto `CAMBIOMETRO_UPTIME_TOKEN` llega a Actions, por lo
  que la excepción WAF guardada no coincide con ese valor o no incluye la raíz.
  Debe corregirse en Cloudflare y repetirse el run; no se debe relajar el
  workflow ni eliminar la comprobación de home.
- Playwright registró 50 violaciones CSP de infraestructura inyectada por
  Cloudflare (`/cdn-cgi`/JavaScript Detections e
  `static.cloudflareinsights.com`) en las rutas probadas. La aplicación no
  generó errores, no hay `unsafe-inline` en la CSP estática y los spinners no
  reaparecen. Para dejar la consola en cero hay que desactivar Browser
  Insights/JavaScript Detections de la zona, o configurar esa inyección para
  respetar la CSP; no se debe agregar `unsafe-inline`.
- El endpoint nacional `/api/funcionarios` sin `muni` responde `503
  DATASET_SCOPE_REQUIRED` por diseño cuando no existe el índice D1 nacional.
  La consulta municipal usada por el contrato (`muni=muni-maipu`) responde
  `200` con filas y paginación; `/api/v1/search` también responde `200`.

Los outputs de auditoría completos son locales e ignorados por Git:

```text
transparencia-app/verify-prod-pass1-full.log
transparencia-app/verify-prod-double-full.log
transparencia-app/verify-static-browser-prod.log
transparencia-app/cold-crawl-prod.log
transparencia-app/artifacts/cold-crawl-latest.json
```

El checkout mantiene `git status --short` limpio: no se agregan `out/`,
`.next/`, `public/data/`, chunks, slices ni logs de verificación al
repositorio.

### Publicación de interfaz — 27-ago-2026

Este release contiene únicamente cambios de interfaz y análisis derivado de
datos ya publicados. No ejecuta ETL, no cambia D1/R2 y no promueve el Worker.

- `main`: `5ce7448b46fe7ce66e65c36f714c25cfbd3ea746` (PR #228).
- Pages deployment: `a5b5008a-9ecf-465a-9699-df65303ce8af`.
- Pages URL: `https://a5b5008a.cambiometro.pages.dev`.
- Worker vigente: `3ea6312f-6f6e-4185-9ee7-0cb2891e17c0`.
- El dominio `https://cambiometro.impulsacv.cl` entrega la nueva UI con HTTP
  `200` en `/`, `/votaciones-destacadas/` y `/partidos/pdg/`.
- La ficha de votación ahora muestra participación efectiva, opción
  mayoritaria, alineamiento de bancadas, composición de votos y acceso al
  padrón nominal.
- PDG: `Lilian Betancurt Delgado` se muestra como diputada; el partido no tiene
  senadores en el padrón vigente y la página lo informa explícitamente.
- Producción mantiene el snapshot existente de transferencias: `59.912`
  filas, `1.199` páginas y `$5.020.688.584.211`; el API devuelve el mismo
  total. No se sustituyó por el snapshot histórico de `59.361` filas.

Rollback exacto de esta publicación:

```bash
npm run pages:rollback -- a5b5008a-9ecf-465a-9699-df65303ce8af
npx wrangler rollback 3ea6312f-6f6e-4185-9ee7-0cb2891e17c0 \
  --name cambiometro-public-api
```

La verificación oficial de producción se ejecutó en Actions mediante el run
`33080620233`, con doble pasada separada por 10 minutos. Ambas pasadas
registraron `100` checks aprobados y `17` fallidos, todos derivados del mismo
`403` de Cloudflare sobre `/`; fichas, gastos, Maipú, transferencias, API,
fuentes, cobertura, `769` votaciones y las muestras estáticas pasaron. El
crawl frío no pudo comenzar porque el sitemap recibió el mismo `403`.

El smoke `33081921420` confirmó `9/10` rutas verdes: `/`, y sólo `/`, quedó
en `403`; `/politico`, `/municipalidades`, `/servicios-publicos`, `/entidades`,
Kaiser, `/transferencias`, `/cruces`, `/api/v1/health` y la búsqueda API
respondieron `200`. El workflow creó el issue automático #230.

Mientras Cloudflare siga desafiando al runner o inyectando JavaScript/GTM
incompatible con la CSP, el cierre operativo permanece pendiente: la CSP de
la aplicación sigue estricta y no se debe añadir `unsafe-inline`. Los logs y
el JSON completo del crawl sólo deben registrarse como artefactos ignorados,
no como archivos versionados.

### Publicación de interfaz — `e78cc72` / 27-ago-2026

Este release contiene únicamente la mejora del análisis de votaciones y la
reparación de assets estáticos. No ejecuta ETL, no cambia D1/R2 y no promueve
el Worker.

- PR: [#231](https://github.com/jmorgadodev/cambiometro/pull/231), todos los
  checks CI verdes.
- Pages workflow: `33085766641`, resultado `success`.
- Pages deployment: `f82dbf23-b06c-4c75-8fb3-088fced53d4a`.
- Pages URL: `https://f82dbf23.cambiometro.pages.dev`.
- Worker vigente: `3ea6312f-6f6e-4185-9ee7-0cb2891e17c0` (sin cambios).

La ficha de votación incluye barras apiladas comparables por bancada,
leyenda porcentual y acceso al padrón nominal. `Lilian Betancurt Delgado`
aparece como diputada del PDG; el partido informa que no tiene senadores en
el padrón vigente. Los chunks dinámicos codificados de político y
municipalidad responden `200` en Pages, corrigiendo el `404` que podía dejar
la hidratación incompleta.

Rollback exacto:

```bash
npm run pages:rollback -- f82dbf23-b06c-4c75-8fb3-088fced53d4a
npx wrangler rollback 3ea6312f-6f6e-4185-9ee7-0cb2891e17c0 \
  --name cambiometro-public-api
```

Comprobación directa posterior: `/`, `/votaciones-destacadas/`,
`/partidos/pdg/`, los chunks codificados y `/api/v1/health` responden; el
Worker conserva el snapshot productivo de transferencias de `59.912` filas.
La interacción de análisis comprobó 18 composiciones de bancada y encontró a
Lilian en el padrón nominal.

El smoke productivo `33086705923` quedó en `9/10`: `/` recibió `403` desde el
runner de GitHub y las otras nueve rutas, incluida la API, pasaron. La doble
verificación `33086674446` se lanzó con una segunda pasada a 600.000 ms; su
resultado y sus artefactos se registran al finalizar. El bloqueo restante es
Cloudflare en la raíz y la inyección CSP de infraestructura; no se debe
resolver relajando la CSP con `unsafe-inline`.

### Evidencia completa — verificación `33086674446`

La doble pasada terminó el 27-ago-2026 en `12m44s`, con la segunda pasada
separada exactamente por `600000 ms`:

| Pasada | Inicio UTC | Resultado |
|---|---|---|
| 1/2 | `2026-08-27T15:15:10.400Z` | 100 aprobadas, 17 fallidas |
| 2/2 | `2026-08-27T15:25:56.773Z` | 100 aprobadas, 17 fallidas |

Las 17 fallas de cada pasada son comprobaciones derivadas de `/` (`HTTP
403`), más el probe de tema que no pudo navegar y los elementos del home/footer
que por ello no pudieron leerse. Las fichas, invariantes, transferencias,
API, fuentes, calidad, cobertura `769 = 580 Cámara + 189 Senado`, y muestras
estáticas pasaron. El crawl terminó con `SITEMAP_HTTP_403`, por lo que no hay
base para declarar todavía cero `1102`, cero `5xx` o crawl completo desde
Actions.

Outputs completos descargados localmente (artefacto ignorado por Git):

```text
transparencia-app/artifacts/production-verification-33086674446/production-verification-33086674446/verify-prod-double.log
transparencia-app/artifacts/production-verification-33086674446/production-verification-33086674446/browser-production.log
transparencia-app/artifacts/production-verification-33086674446/production-verification-33086674446/cold-crawl-output.log
```

El smoke `33086705923` volvió a confirmar `9/10`: `/` `403` desde el runner
de GitHub; los otros nueve endpoints pasaron, incluido `/api/v1/health` y la
búsqueda de Kaiser. Se abrió el issue automático #232. El workflow conserva
el cron `*/5 * * * *`.

### Publicación de interfaz — `9728be4` / 27-ago-2026

Este release publica únicamente la mejora visual e interactiva del detalle de
`/votaciones-destacadas/`. La data, los ETL, D1, R2 y el Worker no cambiaron.
El workflow reutilizó el snapshot validado/cacheado y terminó correctamente en
`7m28s`.

- PR: [#236](https://github.com/jmorgadodev/cambiometro/pull/236), checks CI verdes.
- Workflow Pages: `33090235172`, resultado `success`.
- Pages deployment ID: `d3974c8a-36c3-4c81-80de-345d4345eaaf`.
- Pages URL: `https://d3974c8a.cambiometro.pages.dev`.
- Worker vigente: `3ea6312f-6f6e-4185-9ee7-0cb2891e17c0` (sin cambios).

El detalle productivo ahora muestra mapa de decisiones, indicadores de
participación/cohesión/disenso, ordenamiento de bancadas, comparación de hasta
tres colectividades y padrón nominal con búsqueda. La prueba de navegador
confirmó 18 bancadas, tres selecciones comparables y el registro de `Lilian
Betancurt Delgado`. `/partidos/pdg/` confirma `14 diputados y 0 senadores` y
conserva el historial de votos de Lilian.

Rollback exacto de esta publicación:

```bash
npm run pages:rollback -- d3974c8a-36c3-4c81-80de-345d4345eaaf
npx wrangler rollback 3ea6312f-6f6e-4185-9ee7-0cb2891e17c0 \
  --name cambiometro-public-api
```

La comprobación directa posterior obtuvo `200` en `/`,
`/votaciones-destacadas/`, `/partidos/pdg/`, `/api/v1/health` y el manifest de
transferencias. La producción mantiene `59.912` filas, `1.199` páginas y
`$5.020.688.584.211`; no se ejecutó ningún ETL.

El smoke posterior `33092012558` volvió a quedar en `9/10`: `/politico`,
`/municipalidades`, `/servicios-publicos`, `/entidades`, Kaiser,
`/transferencias`, `/cruces`, `/api/v1/health` y la búsqueda API dieron `200`.
Sólo `/` recibió `403` del runner de GitHub y se abrió el issue automático
[#237](https://github.com/jmorgadodev/cambiometro/issues/237). Desde una
conexión directa al dominio, `/` respondió `200`.

La evidencia del navegador se conserva como artefacto local ignorado por Git:

```text
transparencia-app/artifacts/votaciones-detalle-comparador-production-20260827.png
```

La consola del navegador sigue registrando únicamente la inyección externa de
Cloudflare/GTM bloqueada por la CSP estricta (`script-src 'self'
https://challenges.cloudflare.com`). No se añadió `unsafe-inline`; el cierre
completo de CSP/WAF requiere corregir esa configuración de infraestructura.

### Verificación posterior al release `9728be4` — run `33091980932`

La doble pasada se ejecutó inmediatamente después del deployment y con la
segunda pasada exactamente `600000 ms` después:

| Pasada | Inicio UTC | Resultado |
|---|---|---|
| 1/2 | `2026-08-27T16:13:08.204Z` | 100 aprobadas, 17 fallidas |
| 2/2 | `2026-08-27T16:24:00.394Z` | 100 aprobadas, 17 fallidas |

Las 17 fallas de cada pasada son derivadas del mismo bloqueo de Cloudflare en
`/`: el runner recibe `403`, el probe de tema no alcanza `networkidle` y los
marcadores SSR del home no pueden leerse. En cambio, el módulo completo de
fichas, gastos, Maipú, cruces, transferencias, API, fuentes, calidad,
`769 = 580 Cámara + 189 Senado`, snapshots, registros canónicos y las fichas
estáticas de rendimiento pasan. El resumen de cada pasada es literalmente:
`100 verificaciones pasadas, 17 fallidas`.

El crawl frío tampoco pudo comenzar porque el sitemap recibió `403`
(`SITEMAP_HTTP_403`). Por ello todavía no se debe declarar cero 1102/5xx en el
crawl desde GitHub Actions, aunque las comprobaciones directas locales y de
producción del dominio sí respondieron `200` para las rutas principales.

El smoke `33092012558` fue `9/10`: `/politico`, `/municipalidades`,
`/servicios-publicos`, `/entidades`, Kaiser, `/transferencias`, `/cruces`,
`/api/v1/health` y `/api/v1/search?q=Kaiser` respondieron `200`; sólo `/`
respondió `403` desde el runner. Se creó el issue automático #237.

Outputs completos descargados localmente como artefactos ignorados por Git:

```text
transparencia-app/artifacts/production-verification-33091980932/production-verification-33091980932/verify-prod-double.log
transparencia-app/artifacts/production-verification-33091980932/production-verification-33091980932/browser-production.log
transparencia-app/artifacts/production-verification-33091980932/production-verification-33091980932/cold-crawl-output.log
transparencia-app/artifacts/themes-production-20260827/
```

En el dominio, la auditoría específica de temas generó `12` capturas (4 rutas
por 3 temas), comprobó persistencia de Papel/Oscuro/Noche y encontró cero
violaciones axe AA. La auditoría de consola confirma que los únicos mensajes
son la inyección externa Cloudflare/GTM que la CSP bloquea; el código del sitio
no añade `unsafe-inline`.

### Preflight WAF posterior — run `33096104366`

El preflight protegido se ejecutó en modo lectura el `2026-08-27` usando los
secretos reales del entorno `production`; no aplicó cambios en WAF, DNS ni RUM.
Confirmó:

- Regla activa `28645f6a4f3e40eb8f51836bb32d7614`, descripción
  `cambiometro-uptime-root-exception`, acción `skip` y alcance limitado al
  hostname productivo, `/`, `/api/*` y el header de uptime.
- `expressionMatchesSecret: true`: el secreto de GitHub coincide con la
  expresión publicada.
- La raíz sigue respondiendo `403` con `cf-mitigated: challenge` y
  `cdn-cgi/challenge-platform` desde GitHub Actions.
- La consulta de Bot Management devuelve `403 Authentication error`, por lo
  que todavía no se puede confirmar ni ajustar Bot Fight Mode/JavaScript
  Detections con el token actual.

Este resultado separa el bloqueo de infraestructura de la aplicación: no se
debe relajar la CSP ni ampliar la excepción WAF. Para cerrar el smoke y el
crawl productivo se necesita un token con permiso de Bot Management o el ajuste
equivalente en Cloudflare para que la monitorización autorizada no reciba el
desafío.

### Revalidación del bloqueo — run `33129776241`

El preflight de solo lectura se repitió el `2026-08-28` antes de continuar con
nuevos ajustes de interfaz. El resultado fue idéntico:

- La expresión de la excepción WAF coincide con el secreto real
  (`expressionMatchesSecret: true`).
- La raíz `/` todavía devuelve `403`, `cf-mitigated: challenge` y
  `challengePlatform: true` al runner de GitHub.
- La consulta de Bot Management todavía devuelve
  `CLOUDFLARE_API_FAILED:403:Authentication error`.

Conclusión operativa: no es un fallo de Pages, ETL, D1, R2 ni del Worker. La
corrección definitiva debe hacerse en la configuración de Bots/Challenges de
Cloudflare con un token que tenga ese permiso. No se debe quitar `/` del smoke,
desactivar globalmente WAF/DDoS ni marcar el workflow como exitoso ignorando el
`403`.

### Verificación integral posterior a la corrección del probe — 27-ago-2026

Se ejecutó una pasada directa contra `https://cambiometro.impulsacv.cl` con
`VERIFY_THEME_BROWSER=1`, después de corregir la condición de carrera del
atributo `data-theme` en `verify-prod-full.mjs`.

- Resultado: **119 verificaciones aprobadas, 0 fallidas**.
- Temas: Papel, Oscuro y Noche aplicaron sus tokens y persistieron correctamente.
- Invariantes: Kaiser, Bianchi, Maipú, 769 votaciones, 155 diputados, 50
  senadores, transferencias, API, fuentes y fichas estáticas pasaron.
- Release de transferencias observado: 59.912 filas, 1.199 páginas y
  `$5.020.688.584.211`.
- Esta fue una pasada única directa. La doble pasada y el crawl frío desde
  GitHub Actions continúan pendientes hasta retirar el challenge 403 de
  Cloudflare para el runner.

### Actualización de interfaz — TikTok y verificación final — 27-ago-2026

El enlace oficial `https://www.tiktok.com/@cambiometro` se añadió al bloque de
redes sociales del footer con etiqueta accesible y apertura en nueva pestaña.
Se integró mediante PR #246 (`92aca59`) y se publicó sin ejecutar ETL ni
modificar D1/R2.

- Pages deployment: `27797c40-39b1-4b5b-a736-8cdb997257ef`
- Preview: `https://27797c40.cambiometro.pages.dev`
- Verificación HTTP del dominio: `200`, enlace TikTok presente.
- Verificación Playwright: `200`, un enlace TikTok presente en el DOM.
- `verify-prod-full.mjs` con `API_URL` apuntando al dominio raíz:
  **120 aprobadas, 0 fallidas**.
- Rollback Pages: `npm run pages:rollback -- 27797c40-39b1-4b5b-a736-8cdb997257ef`

La primera ejecución de la verificación se hizo con `API_URL` duplicando el
prefijo `/api`, y produjo falsos negativos en el Worker. La segunda ejecución
usó la URL raíz correcta y confirmó gastos, transferencias, health, búsqueda,
temas, invariantes y footer.
