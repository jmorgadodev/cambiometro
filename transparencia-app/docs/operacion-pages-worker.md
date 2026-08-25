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

Las transferencias se generan desde `data/lake/partitions/ley-19862`, nunca desde un sample cuando el release completo está disponible. El build crea `public/data/transferencias/` con páginas de 50 filas, índice de búsqueda, resumen y manifest con checksum.

Hay dos snapshots que no deben mezclarse:

- snapshot canónico fijado en el repositorio: 59.361 filas y `$5.011.094.170.302`;
- release R2 local observado durante la auditoría: 59.544 filas y `$5.013.581.357.467`, checksum `13b9de4b9d4c07ad4a46afb9b4b4a9fdc9def947f0839544ce12def1b83e5c35`.

La discrepancia es de versión, no se corrige recortando filas. Antes de producción se debe elegir un release, publicar su manifest en Pages y R2 y hacer que las verificaciones usen ese mismo checksum.

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
```

El build genera `out/`, `public/data/` y artefactos de Worker. Son salidas reproducibles y no deben commitearse. La publicación de datos requiere credenciales de Cloudflare y sólo se ejecuta desde CI o con autorización explícita.

`npm run verify:static:browser` levanta un servidor local del directorio `out/`, abre un contexto nuevo por ruta y espera 5,2 segundos. Comprueba `/`, listados, `/cruces`, `/transferencias`, `/funcionarios`, `/entidades`, las fichas Kaiser/Bianchi/Maipú, dos navegaciones internas, el redirect `/municipalidades/muni-maipu` y la ausencia de errores, recursos 4xx/5xx, overlays o spinners permanentes. El criterio general es HTTP 200, cero errores de React/CSP, cero overlay activo y ausencia de textos de carga permanentes.

## Flujo automático

- `etl-cplt.yml` publica la proyección CPLT en R2.
- `etl-ley-19862.yml` publica las fuentes y el release completo de transferencias.
- `pages-static-refresh.yml` recupera el release desde R2, construye Pages, verifica rutas y tamaño del Worker y publica Pages sólo cuando el disparador se ejecuta sobre `main` o se solicita manualmente.
- `uptime-smoke.yml` verifica las rutas Pages y el origen API separado.

La automatización no cambia DNS, no promueve una versión de Worker y no debe hacerlo hasta completar el crawl frío, E2E, invariantes y rollback.

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
