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

Ejecutada desde `C:\Users\jorge\Proyectos\cambiometro-public\transparencia-app` en la rama `codex/operational-static-pages-worker`:

- `npm test`: 124 archivos y 687 tests aprobados.
- `npm run lint`: 0 errores; quedan 156 warnings preexistentes que no bloquean el build.
- `npm run coverage:sweep`: todas las métricas canónicas aprobadas, incluyendo 769 votaciones, 155 diputados, 50 senadores, 79 movimientos, 59.361 filas de fixture, 74.142 ChileCompra, 60.523 InfoLobby y 291 informes CGR.
- `npm run api:size`: Worker de 82.186 bytes, límite 1.000.000.
- `npm run pages:build`: 5.016 HTML, 3.881 parámetros de entidades, cero rutas dinámicas `ƒ`, 16.363 archivos y 517.450.820 bytes.
- Release local generado: 59.544 filas, 1.191 páginas, monto `5.013.581.357.467`, checksum `13b9de4b9d4c07ad4a46afb9b4b4a9fdc9def947f0839544ce12def1b83e5c35`.
- `npm run check:transfer-release`: conteo, monto, páginas, índice y checksum coherentes.
- `npm run verify:static:browser`: 75/75 verificaciones aprobadas; cero spinners, overlays, errores de navegador o recursos 4xx/5xx en las rutas críticas. También validó Kaiser, Bianchi, Maipú y el redirect 301.
- El Worker expone `/api/v1/health` y `/api/v1/health/data`; ambos devuelven 200 sólo cuando D1 y el manifest completo de transferencias en R2 están disponibles, y 503 con el diagnóstico de bindings si falta alguno.
- `uptime-smoke.mjs` prueba home, listados, ficha Kaiser, transferencias, cruces, health y búsqueda. En Actions exige `CAMBIOMETRO_UPTIME_TOKEN` y lo envía únicamente como `X-Cambiometro-Uptime-Token` a `/api/*`, para coincidir con la excepción WAF limitada.

El consolidado municipal CPLT se escribe en `data/lake-cplt/projections/funcionarios-v1`; el rebuild municipal busca esa ruta antes de la compatibilidad histórica `current`. Los directorios `out/`, `.next/`, `dist/`, `public/data/` y los índices/slices generados se limpian después de verificar y están excluidos de Git. Antes de continuar, `git status --short` debe permanecer vacío.

La auditoría de higiene del checkout confirmó que no hay salidas de build, `out/`, `.next/`, `dist/`, chunks, slices ni manifests generados rastreados por Git. Sí permanecen algunos snapshots grandes versionados de referencia (por ejemplo, votaciones y proyecciones base) porque tests, desarrollo local y el fallback E2E todavía los leen directamente. No deben eliminarse con `git rm` hasta que el workflow de fixtures/hydration los reemplace; hacerlo ahora rompería builds limpios y pruebas aunque producción use R2. La reducción segura ya aplicada es que los ETL diarios dejaron de hacer commits automáticos de datasets: los nuevos releases viven en R2 y el repositorio sólo recibe código, workflows y documentación.

## Flujo automático

- `etl-cplt.yml` publica la proyección CPLT en R2.
- `etl-ley-19862.yml` publica las fuentes y el release completo de transferencias.
- Los ETL que alimentan páginas estáticas construyen su proyección y publican sólo las entradas autorizadas por `scripts/static-site-inputs.mjs`. El script `data:publish:static` crea releases inmutables bajo `projections/static-site-v1/releases/<sha256>/` y actualiza el puntero `projections/static-site-v1/manifest.json` después de subir todos los archivos.
- El ETL diario publica el grupo `parlamento`: votaciones completas, personal de apoyo, movimientos y sus subsets. El ETL CPLT reconstruye `municipalidades-data.json` y `municipalidades-list.json` a partir de la nómina recién consolidada y de las proyecciones SINIM, ChileCompra y CGR hidratadas desde R2; publica el grupo `municipalidades` sin hacer commit de esos artefactos generados. El workflow diario ya no hace commits automáticos de datasets.
- `pages-static-refresh.yml` descarga ese puntero con `data:hydrate:static -- --required`, valida tamaño y SHA-256 de cada archivo y recién después ejecuta el build. Si falta el manifiesto R2, el workflow falla; no compila Pages silenciosamente con JSON antiguo del checkout.
- `pages-static-refresh.yml` recupera el release desde R2, construye Pages, verifica rutas y tamaño del Worker y publica Pages sólo cuando el disparador se ejecuta sobre `main` o se solicita manualmente.
- `public-api-worker.yml` valida el Worker en cada cambio relevante; en `main` sube una versión candidata sin promover tráfico y guarda el listado/version ID como artefacto. La promoción requiere `workflow_dispatch`, `promote_version=true` y el version ID exacto.
- `uptime-smoke.yml` verifica las rutas Pages y el origen API separado.

La automatización no cambia DNS, no promueve una versión de Worker y no debe hacerlo hasta completar el crawl frío, E2E, invariantes y rollback.

Para publicar una fuente estática desde un ETL se usa un grupo explícito, por ejemplo:

```bash
npm run data:build:subsets
npm run data:publish:static -- --groups chilecompra
```

Los datos grandes y los artefactos reproducibles permanecen fuera de GitHub: lake, `out/`, `public/data/`, slices generados, staging y manifests locales están ignorados. El repositorio conserva código, semillas canónicas, subsets pequeños y fixtures necesarios para pruebas; no se debe hacer `git add -f` de salidas de build para “arreglar” una ejecución.

Si un ETL termina verde pero no publica su grupo estático, D1/R2 puede estar actualizado mientras Pages queda con el release anterior. La guardia correcta es revisar el log de `data:publish:static` y el checksum del manifiesto R2 antes de investigar la UI.

## Estado externo comprobado

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
