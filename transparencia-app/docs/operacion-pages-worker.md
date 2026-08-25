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

## Flujo automático

- `etl-cplt.yml` publica la proyección CPLT en R2.
- `etl-ley-19862.yml` publica las fuentes y el release completo de transferencias.
- `pages-static-refresh.yml` recupera el release desde R2, construye Pages, verifica rutas y tamaño del Worker y publica Pages sólo cuando el disparador se ejecuta sobre `main` o se solicita manualmente.
- `public-api-worker.yml` valida el Worker en cada cambio relevante; en `main` sube una versión candidata sin promover tráfico y guarda el listado/version ID como artefacto. La promoción requiere `workflow_dispatch`, `promote_version=true` y el version ID exacto.
- `uptime-smoke.yml` verifica las rutas Pages y el origen API separado.

La automatización no cambia DNS, no promueve una versión de Worker y no debe hacerlo hasta completar el crawl frío, E2E, invariantes y rollback.

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
