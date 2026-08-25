# Estado de la migración Pages + Worker

Fecha de auditoría: 25-08-2026
Checkout auditado: `feature/tarea-p-v3-static-site` en `31c3a5d`
Repositorio: `C:\Users\jorge\Proyectos\cambiometro-public`

## Estado ejecutivo vigente — 2026-08-25

La carpeta correcta está confirmada y el trabajo se está haciendo sólo allí.
La rama contiene los cambios de migración y está publicada en el PR #73 contra
`main`; no se hizo merge, deploy Pages, promoción del Worker ni cambio DNS.
El baseline histórico `d3c6fa2` se conserva como referencia, no como el estado
actual del checkout.

El sitio actual de producción sigue siendo OpenNext y no está cerrado para
cutover: la ficha municipal falla hidratación cuando el HTML prerenderizado con
nonce se sirve con `s-maxage=31536000`; el endpoint actual de transferencias
responde 503; y seis rutas frías exceden 700 ms. En el branch, el artefacto
Pages ya pasa localmente exportación, navegador, crawl y CSP; el Worker local
también pasa con el fallback R2. Falta todavía probar y promover ambos en
preview/producción.

La última verificación productiva de sólo lectura terminó en **108 pasadas y 11
fallas**. No existe un Pages deployment ID ni un Worker version ID nuevo. La
decisión segura es mantener OpenNext y continuar con los gates locales/preview;
no usar el verde de ETL como autorización de lanzamiento.

## Decisión de seguridad

El checkout conocido-bueno de producción sigue siendo OpenNext. No se hizo
deploy, no se cambió DNS y no se promovió ningún Worker. Las correcciones están
commiteadas en la rama de trabajo, pero aún no se han mezclado con `main`; el
baseline de referencia sigue identificado por `d3c6fa2`.

La migración sólo puede continuar después de que el sitio estático, el Worker, los datos completos y el rollback estén probados juntos. No se debe usar el resultado verde del ETL como autorización de cutover.

## Qué significa la luz verde del ETL

El workflow `etl-ley-19862-full.yml` reconstruye el año vigente desde CSV oficial, publica releases/R2 y verifica el catálogo remoto. Es el único workflow vigente para Ley 19.862 y admite schedule mensual más ejecución manual. No ejecuta `next build` estático, no verifica `out/`, no prueba los chunks de Pages, no hace crawl frío ni valida el contrato completo del Worker.

El workflow de build actual sigue usando `opennextjs-cloudflare build`. Por tanto, el estado verde observado confirma el pipeline de datos/OpenNext, pero no la arquitectura Pages + Worker objetivo.

## Evidencia local del baseline

Pasaron en el checkout auditado:

- `npm run typecheck`
- `npm run lint`
- `npm run check:tokens`
- `npm test` — 15 pruebas ETL Node y 123 archivos/686 pruebas Vitest pasaron
- `npm run cf:build` — OpenNext generó 1.975 páginas y el worker local

En preview OpenNext local, las páginas principales respondieron 200:

| Ruta | Status | Tiempo observado |
|---|---:|---:|
| `/` | 200 | 786 ms, primer request |
| `/municipalidades` | 200 | 69 ms |
| `/municipalidades/maipu` | 200 | 62 ms |
| `/politico` | 200 | 141 ms |
| `/cruces` | 200 | 173 ms |
| `/transferencias` | 200 | 46 ms |
| `/funcionarios` | 200 | 50 ms |
| `/entidades` | 200 | 56 ms |

También se verificó que `/api/v1/transferencias?page=1&pageSize=10` respondió 200 localmente. `/api/v1/health/data` respondió 503 porque el D1 local no tiene las tablas de estado; se conserva como señal honesta de entorno incompleto, no se oculta con datos inventados.

La verificación de navegador completa reveló un límite del baseline OpenNext local: después de cientos de navegaciones internas, el proceso de Wrangler alcanzó aproximadamente 1,4 GB y terminó con `V8 fatal error ... JavaScript heap out of memory`. El log queda en `%APPDATA%\\xdg.config\\.wrangler\\logs\\wrangler-2026-08-24_11-53-16_795.log`. No fue un 5xx de una ruta: las solicitudes previas, incluida `/datos/calidad`, devolvieron 200 y el proceso murió por agotamiento del heap del preview. Una prueba aislada, con contexto nuevo por ruta y cinco segundos de espera, pasó las diez rutas críticas (`/`, municipalidades, Maipú, listado/fichas políticas, `/cruces`, `/transferencias`, `/funcionarios` y `/entidades`) con 200, sin spinner ni errores de consola. Esto mantiene el problema de memoria como bloqueo de la verificación masiva OpenNext; no se considera evidencia de que Pages/Worker ya esté listo.

La migración local `0014_transferencias_19862.sql` ya crea la tabla especializada, staging e índices de fecha, período, emisor, receptor, monto y RUT. `materialize-d1.mjs` ahora proyecta cada fila oficial de `ley-19862` desde el lake a esa tabla y reemplaza la proyección anterior sólo al finalizar la fuente; una fila inválida hace fallar la materialización con su ID, evitando pérdida silenciosa. La prueba local confirmó 17 comandos de migración ejecutados y las tablas/índices presentes. Todavía no se ejecutó contra D1 remoto ni se puede afirmar el conteo completo en este checkout: el catálogo/lake completo no está disponible localmente.

Consulta remota de sólo lectura, 24-08-2026, contra `transparencia-db`:

- `transferencias_19862` y `stage_transferencias_19862`: no existen todavía.
- `source_state`: `ley-19862`, `partial`, `17.564` registros, generado `2026-08-15T09:29:03.460Z`.
- `records WHERE source_id='ley-19862'`: `17.564`.
- No hubo filas escritas ni cambios de D1 (`changes=0`, `rows_written=0`).

Conclusión: la base productiva está incompleta respecto de `59.361`; antes de cualquier Pages/Worker cutover hay que publicar el release full autorizado en R2 y comprobar conteo, suma y checksum contra ese manifest.

La aplicación de `0014` contra D1 productiva se intentó con la sesión local de Wrangler y fue rechazada por Cloudflare con `Exceeded maximum DB size` (`size_after=508018688`). La migración no creó tablas ni cambió filas. Por eso el diseño operativo usa R2 para el histórico de transferencias: `/api/v1/transferencias` consulta los artefactos R2 cuando la tabla especializada no está disponible y sólo usa la muestra embebida como último fallback local.

### Correcciones locales posteriores

La búsqueda ya no convierte la ausencia de tablas `entities` en 500: `searchEntities()` cae al índice local y `/api/v1/search?q=maipu` responde 200 con Municipalidad de Maipú. La respuesta canónica local observada fue `total=1`; el resultado aún puede traer la URL histórica `/municipalidades/muni-maipu`, que el middleware redirige con 301 a `/municipalidades/maipu`.

Las fichas de políticos tenían un fallo más profundo: `data/politico-slices/*.json` existía durante `next build`, pero no está disponible en el filesystem del Worker. El síntoma era una ficha con dieta/elección correctas y “sin votaciones”. Ahora `build-politico-slices.mjs` copia los 205 slices por ID y slug a `public/data/politico-slices/`; la carpeta generada está ignorada por Git. `VotacionesHistorial` carga ese asset en el navegador y expone estados `loading`, `ready`, `empty` y `error` con reintento.

Evidencia después de reconstruir y reiniciar `opennextjs-cloudflare preview`:

| Ruta/asset | Resultado |
|---|---:|
| `/politico/vanessa-kaiser-barents-von-hohenhagen` | 200; dieta `$8.291.039`; 189 votaciones; sin errores de consola; sin loader a los 5 s |
| `/politico/carlos-bianchi-chelech` | 200; `25.009`; `24,89%`; 580 votaciones; sin errores de consola; sin loader a los 5 s |
| `/municipalidades/maipu` | 200; `CUT 13119`; sin errores de consola; sin loader a los 5 s |
| `/data/politico-slices/sen-038.json` | 200; `totalVotaciones=189`, `votos=189` |
| `/data/politico-slices/dip-154.json` | 200; `totalVotaciones=580`, `votos=580` |
| `/municipalidades/muni-maipu` | 301 → `/municipalidades/maipu` |
| `/politico/sen-038` | 301 → `/politico/vanessa-kaiser-barents-von-hohenhagen` |
| `/api/funcionarios?query=Jorge%20Andres%20Maldonado&limit=5` | 200; 1 resultado; fallback marcado `sourceStatus=partial`, `stale=true` por R2 local ausente |
| `/api/v1/search?q=maipu` | 200; 1 resultado; URL `/municipalidades/maipu` canónica |
| `/api/v1/search?q=vanessa` | 200; 2 resultados; Vanessa devuelve `/politico/vanessa-kaiser-barents-von-hohenhagen` |

El flujo de build reportó `205 parlamentarios procesados` y `99.350 votos` en el snapshot local. Los assets generados son aproximadamente 93 MB y 410 archivos; no deben commitearse. Cualquier CI que ejecute `npm run build` debe tener primero los artefactos ETL necesarios.

La alerta de asignaciones de Vanessa quedó corregida en el generador de slices y en el fallback cliente del asset publicado. En el preview final, después de cinco segundos: `/politico/vanessa-kaiser-barents-von-hohenhagen` mostró dieta `$8.291.039`, `+33,7%`, 189 votaciones, sin spinner ni errores de consola; `/politico/carlos-bianchi-chelech` mostró `25.009`, `24,89%`, 580 votaciones y 189 senado, sin spinner ni errores.

La pasada aislada final de rutas críticas pasó 10/10 con HTTP 200, un `h1` por ruta, cero spinners y cero errores de consola: `/`, `/municipalidades`, `/municipalidades/maipu`, `/politico`, ambas fichas, `/cruces`, `/transferencias`, `/funcionarios` y `/entidades`. `npm run verify:security` pasó con seis rutas, cabeceras y búsqueda sin reflexión XSS. La pasada masiva `verify:browser` sigue separada como no concluyente porque el preview OpenNext de Windows termina por agotamiento de heap tras cientos de navegaciones; no se reporta como verde.

### Primera prueba Pages aislada

Se añadió `npm run pages:build`, que construye un staging temporal sin `app/api` ni
`middleware`, dejando el checkout OpenNext intacto. El 24-08-2026 terminó con
1.965 rutas prerenderizadas; `npm run pages:verify` confirmó 1.963 HTML, 13.900
archivos, `404.html`, `robots.txt`, `sitemap.xml`, `_headers` y `_redirects`.
Servido con `wrangler pages dev` desde `out/`, las rutas principales devolvieron
200; una pasada Playwright aislada con espera de 5 segundos pasó las cuatro rutas
críticas probadas sin spinner ni errores de consola. La guardia posterior detectó
que el prefetch RSC de `next/link` sí producía 404 en Pages; se corrigió con
`components/SiteLink.tsx` (`prefetch={false}`) y se retiró el prefetch manual del
header. La verificación posterior no registró 404 RSC.

Este builder es una etapa de migración, no una autorización de publicación: la
fuente todavía conserva `app/api` y `middleware` para rollback OpenNext, el
`_redirects` generado contiene sólo Maipú y `sen-038`, y falta conectar el Worker.

La ficha enlazada `/entidades/public-body-camara/` también se comprobó como 404
antes del cambio. `generateStaticParams()` ahora incluye los IDs del índice de
build `data/entidades-canonica.json` cuando el ETL lo produce y conserva el
organismo de Cámara como fallback explícito para el checkout actual; la ruta
responde 200 localmente. Esto no equivale todavía al universo canónico completo:
el build debe recibir ese índice ETL antes de cerrar la migración.

El builder fue endurecido después de una prueba de cancelación: un build
interrumpido no puede dejar `middleware.ts` aparcado, y se comprobó que el hash
del middleware se restaura y que no queda `.pages-static-middleware.ts`.

La guardia CI correspondiente quedó en `.github/workflows/pages-static-check.yml`.
El lint de fuentes se ejecuta sin entrar a los artefactos `.pages-static` ni
`.dist`; en la última pasada terminó con 0 errores y 147 warnings históricos.
`npm test` terminó con 123 archivos y 686 pruebas, y `npm run worker:check` más
`npm run worker:bundle` terminaron correctamente.

## Auditoría de contenido versionado en Git

El checkout conserva 17 archivos rastreados de más de 200 KB, todos todavía
necesarios como entradas de build o fixtures de fuentes que aún no tienen
hidratación automática completa. En esta pasada sí se retiraron del índice,
sin borrar los archivos locales, las 346 particiones CPLT y tres JSON de
auditoría generados: el workflow hidrata las particiones desde R2 antes de
construir y la auditoría queda documentada en Markdown. La guardia de límites
impide que vuelvan a rastrearse. Los 410 slices derivados tampoco se rastrean
y se regeneran bajo `public/data/politico-slices/`.

## Coherencia de datos comprobada

Los artefactos versionados de Ley 19.862 coinciden entre sí:

- `total_transfers`: `59.361`
- `total_monto_clp`: `$5.011.094.170.302`
- receptores: `14.640`
- emisores: `272`
- muestra de proyección: 1.000 filas
- muestra de subset: 50 filas
- IDs de muestras sin duplicados
- URLs de muestra apuntan a `registros19862.gob.cl`

La coherencia del snapshot no debe confundirse con la disponibilidad de las 59.361 filas. La API local anterior respondía `total=59361`, pero cuando D1 no tenía la tabla usaba filas de muestra para el detalle; eso quedó identificado como bloqueo. La ruta operativa corregida es publicar las particiones completas en R2 y hacer que la API lea R2; la materialización `0014` queda disponible para un D1 con capacidad, pero no debe reintentarse contra la D1 productiva actual porque Cloudflare rechazó la migración por tamaño.

Se corrigió una incoherencia heredada en `by_year`: `a173d39` tenía sólo el bloque 2026 coherente con sus KPIs, pero un commit posterior añadió bloques 2023–2025 sin cambiar los totales. Se retiraron esos bloques obsoletos y `data:verify:coherence` ahora verifica también la suma anual de conteos y montos.

La fuente se reporta como `partial` y las particiones full están ignoradas por
Git; por eso no llegan a un checkout limpio, aunque pueden existir localmente
después de hidratar R2. El script `npm run data:verify:coherence` valida la
coherencia del snapshot sin fingir que la muestra es el universo completo. Para
una validación estricta del universo se debe ejecutar con `--require-full` en
el workspace ETL/R2/D1 que sí contenga las particiones.

Además, una consulta directa posterior a la fuente viva produjo un conteo/monto distinto al snapshot fijado. Eso debe tratarse como diferencia de versión de fuente: antes de regenerar se necesita fijar release, fecha y checksum del artefacto autorizado. No se deben recortar ni combinar filas en forma manual para hacer coincidir `59.361`.

## Bloqueos antes de Pages

1. `output: "export"` no está probado en el baseline. La tentativa local falló primero por rutas API dinámicas y luego por uso server-side de `searchParams` en `/entidades/[id]`.
2. Hay que refactorizar todas las rutas dinámicas para `generateStaticParams()` y separar API/OG en el Worker sin dejar dependencias SSR.
3. Falta probar y materializar el esquema D1 productivo, incluyendo `transferencias_19862` y las tablas de búsqueda/health requeridas.
4. Falta demostrar que el Worker entrega las filas completas, no sólo el total canónico acompañado de una muestra.
5. `check:bundle` pasa el presupuesto histórico OpenNext de 12 MB, pero mide 10,91 MB de JavaScript de cold start; eso no cumple todavía el objetivo del Worker separado menor a 1 MB.
6. Falta generar y validar chunks, manifest, headers, redirects, censo, E2E, CSP, crawl frío y smoke de producción.

El Worker separado está en `transparencia-app/workers/public-api`.
`npm run worker:check` y `npm run worker:bundle` pasan; el último dry-run midió
28,13 KiB sin gzip y 8,63 KiB gzip. La guardia falla si Wrangler reporta 1 MiB
o más. Ya cubre los contratos canónicos de health, búsqueda, fuentes,
entidades, records, relaciones, cruces, alertas, político, directorio,
funcionarios, transferencias, export, health/data y OG. No está desplegado ni
tiene route de producción; las respuestas `503` siguen siendo honestas cuando
faltan tablas o releases productivos.

En el Worker local, `/api/health` respondió 200 con D1/R2 enlazados. Búsqueda,
funcionarios y transferencias respondieron 503 porque el D1 local no tiene las
tablas/partición completas; esto es una señal de fixture incompleto, no una
prueba de que la API productiva esté lista. El endpoint no debe degradarse a un
`total=59361` con filas de muestra: antes de promoverlo hay que publicar el
release R2 autorizado o materializar el esquema completo.

La producción actual sigue siendo OpenNext: el 24-08-2026 `/` respondió 200 con
CSP nonce y `/api/v1/search?q=maipu` respondió 200; `/api/health` respondió 404,
porque ese endpoint pertenece al Worker nuevo aún no enroutado. No hay Pages
deployment ID, Worker version ID, cambio CNAME, WAF nuevo ni run de Actions
posterior a estos cambios.

## Orden seguro para continuar

1. Mantener este baseline ejecutable y probar el esquema/migración D1 sólo en un entorno aislado; no reintentar la migración en la D1 productiva de 508 MB.
2. Fijar el artefacto ETL autorizado y validar el universo completo con checksum contra D1.
3. Ejecutar `etl-ley-19862-full.yml` para reconstruir el año vigente y comprobar el catálogo R2, con checksum y paridad de particiones. La API debe usar R2 hasta que exista una D1 con capacidad; no forzar `0014` en la D1 productiva actual.
4. Extraer la API al Worker con contratos probados y bundle menor a 1 MB.
5. Completar contratos Worker y probarlos con D1/R2 aislados; después medir el bundle final.
6. Convertir las páginas una familia a la vez; después de cada familia ejecutar typecheck, lint, tests, build y Playwright.
7. Generar `out/`, chunks, manifest, `_headers`, `_redirects`, sitemap y 404; ejecutar crawl local completo.
8. Publicar sólo un preview de Pages y una versión no promovida del Worker. Promover y cambiar CNAME únicamente si todos los gates están verdes.

## Instrucciones para el siguiente agente

1. Trabajar únicamente en `C:\Users\jorge\Proyectos\cambiometro-public` y revisar `git status` antes de editar.
2. Ejecutar `npm run build:slices` para regenerar los snapshots derivados; no agregar `data/politico-slices/` ni `public/data/politico-slices/` al commit.
3. Para una prueba local reproducible: ejecutar `npm run cf:build`, iniciar `npx opennextjs-cloudflare preview`, y esperar cinco segundos en cada ficha antes de evaluar loaders, datos y errores de consola.
4. No interpretar los errores de tablas ausentes del D1 local como datos incoherentes: aplicar las migraciones locales o probar contra bindings D1/R2 antes de cambiar contratos. Las verificaciones locales de entidad/API usan `person-test-1` por defecto; CI puede seleccionar un ID de fixture con `VERIFY_ENTITY_ID`.
5. Antes de cualquier Pages/Worker deploy, resolver el universo completo de transferencias en R2, el bundle del Worker, `output: "export"`, CSP estática y el crawl completo. El estado actual sigue siendo no promovible.

## Actualización automática sin costo

Hoy `etl-ley-19862-full.yml` reconstruye y publica R2 mensualmente; `build-e2e.yml` valida el artefacto OpenNext en cada push/PR; y `uptime-smoke.yml` corre cada cinco minutos contra producción. La consulta API ya puede leer R2 sin ampliar D1. Todavía no existe una cadena segura ETL → build Pages → preview → promoción, por lo que no se añadió un deploy automático que pudiera reemplazar OpenNext sin gates. La secuencia restante de costo cero es: ETL publica release inmutable → build genera slices/assets → `data:verify:coherence` y censo → preview Pages/Worker → smoke/crawl → promoción manual protegida.

`uptime-smoke.yml` conserva el cron `*/5 * * * *`, prueba la home, listados,
ficha Vanessa y APIs, y puede enviar `X-Cambiometro-Uptime-Token` desde el
secreto `UPTIME_TOKEN`. El workflow está publicado, pero aún no existe
evidencia de un run verde de producción posterior a estos cambios: el dominio
actual todavía no enruta `/api/v1/health` al Worker nuevo.

Rollback preparado:

```bash
npm run pages:rollback -- <pages-deployment-id>
npx wrangler rollback <worker-version-id> --name cambiometro-public-api
```

Si falla un gate crítico, se conserva OpenNext y se pospone el cutover.

## Estado de esta sesión de auditoría

- Checkout correcto confirmado: `C:\Users\jorge\Proyectos\cambiometro-public`.
- Rama local: `feature/tarea-p-v3-static-site` en `31c3a5d`; el PR sigue abierto
  contra `main`; no se hizo merge ni deploy.
- Verde local: `typecheck`, lint, `pages:build`, `worker:check`, `worker:bundle`,
  pruebas unitarias/ETL y navegador aislado de Pages para home, Maipú y
  Cámara. `pages:verify` se detiene ahora en el guard CSP porque el artefacto
  todavía no publica una política válida.
- No cerrado: datos y bindings productivos del Worker, transferencias full en
  D1/R2 productiva, censo de entidades completo, CSP estática, crawl frío y
  verificación productiva doble. La superficie de contratos Worker ya está
  implementada y necesita pruebas contra bindings reales.
- Los artefactos `.dist`, `.wrangler`, `.pages-static`, `out` y slices generados
  están fuera del commit; se añadieron reglas explícitas para que una ejecución
  de Wrangler no los ofrezca por accidente al repositorio.

### Corrección de contrato del Worker en esta sesión

Se eliminó un fallback peligroso de `workers/public-api/src/index.ts`: cuando la
tabla `transferencias_19862` estaba vacía o ausente, el Worker podía anunciar
`total=59361` aunque no entregara filas. Ahora responde `503 DATASET_UNAVAILABLE`
hasta que D1 tenga al menos una fila, y el total de cada filtro sale de la
consulta real. Un filtro sin coincidencias sobre una tabla disponible sí puede
responder 200 con `total=0`.

La búsqueda del Worker ahora consulta de forma independiente `entities` y
`funcionarios_publicos`. Esto permite que la búsqueda de funcionarios siga
siendo utilizable durante una publicación por etapas, sin convertir la ausencia
temporal del índice canónico en una respuesta falsa. Se añadieron pruebas de
regresión en `workers/public-api/src/index.test.ts`; la verificación de tipos,
ESLint y las dos pruebas pasan localmente.

La higiene del repositorio conserva sólo los snapshots que aún son entradas de
build y excluye explícitamente todos los resultados de build/preview (`out`,
`.next`, `.open-next`, `.pages-static`, `.dist`, `.wrangler`), slices derivados,
particiones CPLT y JSON de auditoría. El siguiente trabajo de limpieza debe
reemplazar cada import de snapshot restante por un asset de build o una lectura
de R2 y retirar el archivo en un cambio separado.

## Actualización posterior: datos vivos, chunks Pages y navegador estático

La consulta oficial mensual ejecutada el 24-08-2026 reconstruyó enero–agosto de
2026 desde `registros19862.gob.cl` sin fabricar filas. El snapshot fijado para
tests/runtime conserva 59.361 filas, $5.011.094.170.302, 14.640 receptores y
272 emisores. El release oficial vivo usado por Pages contiene 59.544 filas,
$5.013.581.357.467, 14.742 receptores y 273 emisores, con checksum
`13b9de4b9d4c07ad4a46afb9b4b4a9fdc9def947f0839544ce12def1b83e5c35`.

La diferencia es una diferencia de versión de la fuente y no se corrige
recortando filas. El runtime conserva el snapshot compacto de referencia; el
build Pages genera desde el lake completo `summary.json`, `manifest.json`,
`search-index.json` y 1.191 chunks `p-*.json` de 50 filas. Esos archivos están
ignorados por Git y se reconstruyen con:

```bash
node scripts/backfill-ley-19862-full.mjs --year 2026 --through-month 8
npm run pages:build
npm run pages:verify
```

La salida local verificada fue `htmlCount=1963`, `fileCount=13900`,
`totalRows=59544`, `totalPages=1191` y `totalMontoClp=5013581357467`.
`pages:verify` valida también el esquema del manifest, la paridad del índice,
la aritmética de páginas y la existencia de todos los chunks.

La UI `/transferencias` ya no necesita API Next para su primer render,
paginación, filtros o búsqueda: carga manifest/índice/chunks desde Pages. Cada
carga reactiva tiene timeout de cinco segundos, estado de error visible y botón
`Reintentar`; el Worker `/api/v1/transferencias` se conserva para consumidores
externos y no anuncia un total si D1 está vacío.

El E2E `scripts/verify-pages-browser.mjs`, ejecutado con contexto de navegador
nuevo por ruta, pasó las diez rutas canónicas con HTTP 200, cero spinners a los
5,2 segundos, cero overlays y cero recursos estáticos fallidos. Respondieron
200 el manifest, `p-0001.json`, `p-1191.json` y el índice de búsqueda. Pasaron
las invariantes HTML de Kaiser (`8.291.039`, `33,7%`), Bianchi (`25.009`,
`24,89%`, `580`, `189`) y Maipú (`13119`). El servidor HTTP plano usado para
esta prueba no aplica `_redirects`; la redirección `muni-maipu → maipu` debe
verificarse con Wrangler/Pages.

El build estático mantiene `middleware.ts` fuera del staging. Como Next/Turbopack
resuelve dependencias desde la raíz del checkout, el script lo aparca sólo
durante el proceso `next build` y lo restaura en `finally`; también registra
manejadores para interrupciones. La guardia lee el manifiesto de middleware del
staging y falla si aparece cualquier middleware o función dinámica. El checkout
OpenNext quedó restaurado tras la compilación verificada.
La guardia de imports grandes sigue en cero imports JSON de más de 200 KB desde
`app/` o `lib/`; el último dry-run del Worker midió 28,13 KiB sin gzip y 8,63
KiB gzip, muy por debajo de 1 MiB.

Resultado de calidad posterior: `npm test` — 123 archivos y 686 pruebas verdes;
`npm run lint` — 0 errores; `typecheck`, `pages:verify`, `worker:check`,
`worker:bundle` y `scan-bundle-imports` también verdes. El workflow
`pages-static-check.yml` ahora descarga el universo oficial vigente antes de
construir Pages, para que un checkout limpio de GitHub no dependa de particiones
ignoradas ni caiga silenciosamente a `transfers_sample`.

Sigue sin haber deploy, merge, cambio DNS, Pages deployment ID, Worker version
ID ni verificación productiva; el cutover continúa bloqueado hasta completar
crawl frío, smoke, CSP y rollback en producción.

## Automatización añadida y alcance real

Se añadió `.github/workflows/pages-static-refresh.yml`. Se ejecuta manualmente o
después de un `ETL completo mensual - Ley 19.862` exitoso, reconstruye el año
vigente desde el conector oficial, genera Pages, valida el censo/chunks,
coherencia de datos, tipos y bundle del Worker, ejecuta el navegador con un
contexto nuevo por ruta y conserva el directorio `out/` como artefacto por siete
días. No despliega Pages, no promueve el Worker y no cambia DNS: eso es
intencional hasta tener secretos, preview, smoke, crawl frío y rollback
aprobados.

La luz verde del ETL significa que el conector descargó y publicó sus artefactos
con las guardias de ese workflow; no significa que el HTML Pages, el Worker, el
DNS o el navegador estén verificados. El workflow de refresco usa esa luz verde
como disparador de build, no como autorización de cutover. Para actualizar
también las demás familias de datos debe añadirse cada ETL a este disparador
cuando exista una rutina segura que hidrate sus proyecciones R2; no se debe
simular actualidad copiando snapshots o mezclando universos.

Última verificación local posterior a la guardia: `npm run pages:build` pasó con
1.965 páginas y sin `ƒ Proxy`; `middleware-manifest.json` del staging tiene
`middleware: {}` y `functions: {}`; `middleware.ts` existe en el checkout y no
queda `.pages-static-middleware.ts`. También pasaron `pages:verify`, el guard de
imports grandes, `worker:check`, `worker:bundle` y `data:verify:coherence`.

## Hallazgo reproducido: ficha municipal y nómina

El 24-08-2026 se abrió con Playwright la ficha estática
`/municipalidades/maipu` y se activaron las cinco pestañas del dashboard:
Finanzas, Nómina, Compras, Concejo y Contraloría. La navegación de pestañas no
deja overlay ni spinner permanente y el HTML inicial contiene la ficha completa.
Sin embargo, al activar Nómina, la página Pages sola solicita
`/api/funcionarios?muni=muni-maipu...`; un servidor de archivos estáticos
responde 404 y la UI muestra “Nómina no disponible”. Esto no es una falla del
ETL: es la dependencia esperada del Worker separado.

La ruta antigua de Next ya tenía la implementación correcta de fuente R2:
lee `projections/funcionarios-v1/manifest.json` y la partición versionada de la
municipalidad. Se portó ese fallback al Worker en
`transparencia-app/workers/public-api/src/index.ts`: D1 se intenta primero y,
si la tabla no está disponible, R2 sirve la partición real con período, filtros,
orden y paginación. Si faltan manifest o partición, el Worker responde
`503 DATASET_UNAVAILABLE`; nunca inventa un universo ni un total.

La regresión está cubierta en
`transparencia-app/workers/public-api/src/index.test.ts` con un bucket R2
simulado. En local pasaron `3/3` pruebas del Worker y `npm run worker:check`.
La verificación final de navegador de esta ruta debe ejecutarse con Pages y el
Worker levantados juntos; `npx serve out` deliberadamente no simula el Worker.
Hasta que ese entorno combinado y R2 productivo estén disponibles, no se debe
declarar producción cerrada.

## Fuente CPLT: reemplazo oficial de Contrata

El run de Actions `32752609856`
(`https://github.com/jmorgadodev/cambiometro/actions/runs/32752609856`) dejó
Planta, Honorarios y Código del Trabajo en verde, pero Contrata falló antes de
publicar porque el endpoint histórico
`https://www.cplt.cl/transparencia_activa/datoabierto/archivos/TA_PersonalContrata.csv`
respondió `404 Not Found`. La consolidación R2/D1 fue correctamente omitida.
Esto explica por qué había avances y checks verdes sin que existiera cobertura
completa de nóminas: cada matriz de categoría validaba su propia entrada y el
release final sólo corre si todas las categorías terminan.

Se verificó el reemplazo oficial en el Portal de Transparencia. Para una
municipalidad, la ruta actual es organismo → categoría (`PCONT`, `PPLAN`,
`PHONO` o `PCODIGO`) → subcategoría → año → mes → `Descargar CSV`. El botón
ejecuta un POST JSF autenticado por la sesión y devuelve `text/csv` con charset
`iso-8859-15`; no es correcto sustituirlo por la plantilla XLS de CPLT ni
adivinar un nuevo nombre de archivo masivo.

El adaptador reproducible está en
`transparencia-app/scripts/etl/portal-transparencia-personal.mjs`. Descubre y
cachea los IDs Liferay, descarga el último mes publicado por subcategoría,
decodifica el CSV oficial, normaliza registros, genera proyección/coverage y
valida IDs, fuente HTTPS y checksum. `stream-remote-personal.mjs` lo usa sólo
cuando el endpoint Contrata devuelve 404 y
`CPLT_PORTAL_FALLBACK=1`. El workflow `etl-cplt.yml` instala Chromium, activa
ese fallback y mantiene `REQUIRE_COMPLETE_CPLT=1`; si falta una municipalidad,
el job falla y no publica un release parcial.

Prueba controlada ejecutada sin publicar, limitada a Iquique (`CPLT_PORTAL_LIMIT=1`):
el Portal resolvió `muni-iquique → MU112` y entregó 152 registros de Contrata
del último mes disponible. La prueba confirmó el flujo CSV completo.

La corrida nacional local se ejecutó sin publicar el 24-08-2026 con
`CPLT_PORTAL_MIN_YEAR=2024`, checkpoints por municipalidad y sin límite de
selección. Resultado reproducible:

```text
municipalidades reales procesadas: 345/345
registros Contrata normalizados: 61.508
municipalidades con registros: 281
municipalidades sin CSV publicado en 2024-2026: 64
municipalidad sin administración propia: 1 (muni-antartica)
```

El reporte se escribió en
`data/raw/transparencia_activa-portal-full/coverage/contrata.json` y la
validación en `.../validation/contrata.json`. Los registros se obtuvieron del
Portal oficial; se preserva el año/mes real de cada CSV y se deduplican por ID
estable. `muni-maipu` quedó con 523 registros y `muni-lacalera` con 359 luego
de corregir una colisión de descubrimiento: `MU022` es Calera de Tango y
`MU116` es La Calera. El cache final no contiene IDs Liferay duplicados.

Los 64 ceros son “sin CSV publicado en el rango operativo”, no datos inventados
ni prueba de inexistencia de funcionarios. Alto Hospicio, por ejemplo, muestra
explícitamente en el Portal que no está incorporado; otros organismos tienen
pestañas pero no un CSV descargable. El workflow conserva
`REQUIRE_COMPLETE_CPLT=1`, pero activa explícitamente
`CPLT_ALLOW_UNAVAILABLE=1`: la publicación automática exige las 346 particiones
y sus estados (`available`, `unavailable` o `not_applicable`), sin exigir que la
fuente entregue un archivo que oficialmente no existe. El modo sin esa bandera
sigue fallando como guardia de auditoría. La extracción puede reanudarse desde
`data/raw/transparencia_activa-portal-full/progress/`.

## Higiene del repositorio

La guardia `npm run audit:repo-boundary` confirma que los resultados derivados
(`out`, `.pages-static`, slices de políticos, chunks de transferencias,
particiones CPLT/lake y bundles Wrangler) no están rastreados; la última
verificación reportó 700 archivos rastreados después de retirar del índice las
346 particiones CPLT y los JSON de auditoría generados. Los archivos locales
se conservaron para no interrumpir esta auditoría. Permanecen versionados sólo
los snapshots que todavía son entradas de build o fixtures sin hidratación
automática completa.

También se retiraron cuatro scrapers piloto sin referencias (`cplt-crawler`,
`fetch-liferay-ids`, `test-playwright` y `transparencia-activa-bot`); podían
confundir el flujo oficial y no formaban parte de ningún script npm o
workflow. El reemplazo mantenido es el adaptador portalizado descrito arriba.

### Inventario de archivos grandes que aún no se deben desversionar

El inventario del índice, después de la limpieza, conserva entre otros:
`data/politicos-votaciones.json` (7,2 MiB),
`data/lake/projections/v1/chilecompra.json` (6,2 MiB),
`data/lake/projections/v1/ley19862-summary.json` (4,4 MiB),
`data/personal-apoyo.json` (1,2 MiB) y
`data/municipalidades-data.json` (0,7 MiB). Estos restantes son entradas de
build/fallback y no se pueden quitar sin reemplazar antes sus lecturas por
hidratación de ETL/R2.

Regla de limpieza: cada archivo debe pasar primero a una fuente publicada
versionada (R2/release), un adaptador de build que falle si falta la fuente y
una prueba sobre checkout limpio. Esta pasada aplicó ese procedimiento a CPLT:
`git rm --cached` dejó las 346 particiones fuera de GitHub y preservó los
archivos locales. `npm run audit:repo-boundary` confirma ahora 700 archivos
rastreados y falla si reaparece cualquier partición CPLT, output Pages, chunk,
partición full o bundle generado.

## Auditoría remota de sólo lectura — 24-08-2026

Con Wrangler autenticado en la cuenta Cloudflare del proyecto se consultaron
los bindings configurados, sin escribir nada:

```text
D1 transparencia-db
  tablas encontradas: entities, funcionarios_publicos
  entities: 97.378 filas
  funcionarios_publicos: 0 filas
  transferencias_19862: tabla inexistente
  tamaño D1: 508.018.688 bytes

R2 transparencia-public-data
  projections/funcionarios-v1/manifest.json: inexistente
```

La API que hoy atiende el dominio todavía es OpenNext: el GET productivo a
`/api/funcionarios?muni=muni-maipu&periodo=2026-06&limit=1` respondió `200` con
`data=[]`, `meta.total=0` y `sourceStatus=partial`; `/api/v1/health` respondió
`404`; y `/municipalidades/muni-maipu` respondió `301` a
`/municipalidades/maipu`. No hubo deploy ni modificación de DNS durante esta
auditoría.

Conclusión operativa: el Worker nuevo está diseñado para fallar seguro mientras
faltan esos artefactos, pero todavía no puede reemplazar a OpenNext. Primero se
debe ejecutar/publicar el workflow CPLT para que exista el manifest R2, ejecutar
la materialización autorizada de `transferencias_19862` (o cerrar un índice R2
equivalente), y volver a verificar conteos/checksums. El tamaño actual de D1
también obliga a revisar capacidad antes de aplicar una migración grande; no se
debe reintentar a ciegas.

## Capa Pages para nóminas municipales — actualización local

Para que una ficha no dependa del Worker durante el primer render, se añadió
`scripts/build-funcionarios-static.mjs`. Lee las 346 particiones CPLT de la
publicación R2 hidratada (o el lake local durante desarrollo), separa cada
período y genera assets ignorados en
`public/data/funcionarios/<municipalidad>/<periodo>.json`. La UI de la pestaña
Nómina filtra y pagina esos datos localmente; en Maipú, la prueba usa 4.071
registros de `2026-06`, no una muestra, y no hace ninguna llamada
`/api/funcionarios`.

Comandos locales:

```bash
npm run data:build:funcionarios-static
npm run pages:build
npm run pages:verify
```

La automatización nueva descarga primero la publicación versionada mediante
`npm run data:hydrate:cplt`, valida exactamente 346 particiones y recién
después construye Pages. `pages:verify` ahora falla si no existe el manifiesto
CPLT estático, si no están las 346 municipalidades o si falta el período por
defecto de Maipú y su payload no coincide en período/conteo. El período por
defecto ya no lo decide un snapshot municipal atrasado: el builder calcula la
representatividad desde las particiones oficiales efectivamente hidratadas y
elige el período representativo más reciente.
Esta guardia evita que un checkout limpio vuelva a producir fichas con una
nómina vacía. Los assets generados permanecen fuera de Git y se suben sólo como
parte del artefacto Pages.

### Actions y smoke real

`gh workflow list --all` confirma que los workflows CPLT y Ley 19.862 están
activos, pero `gh run list` no muestra ejecuciones recientes de ninguno de
ellos. El ETL diario sí tuvo una ejecución verde el 24-08-2026
(`32703576889`), pero ese workflow publica actividad parlamentaria/movimientos
y personal de apoyo; no crea la tabla de transferencias ni el manifest CPLT
municipal usado por el Worker.

El workflow de uptime remoto está activo con cron `*/5 * * * *`, pero sus
últimas ejecuciones están rojas. En el run `32744369497`, las páginas de
`cambiometro.pages.dev` respondieron 200 y el endpoint de búsqueda respondió
200, mientras `/api/v1/health/data` respondió 403 por WAF. Además, el script
remoto intentó interpolar esa ruta en un comando shell al crear el issue,
generando errores secundarios. La rama local reemplaza esa ruta por health,
búsqueda y funcionarios del Worker, y crea issues con argumentos sin shell;
esto no se considera un run verde hasta que el Worker y la excepción WAF estén
publicados.

### Verificación repetida después de la capa estática

El 24-08-2026 se volvió a ejecutar `scripts/verify-pages-browser.mjs` contra
`npx serve out -l 8788` con contexto nuevo por cada ruta. Pasaron `/`,
`/municipalidades`, `/municipalidades/maipu`, `/politico`, Kaiser, Bianchi,
`/cruces`, `/transferencias`, `/funcionarios` y `/entidades`: HTTP 200 en las
diez, cero respuestas malas, cero overlays/spinners después de 5 segundos y
cero solicitudes a `/api/funcionarios` al abrir y buscar en la nómina de Maipú.
La lista mostró `4.071 funcionarios navegables` y la búsqueda local encontró
`Javiera Nicoll Abello Morales`. `npm run pages:verify` quedó en verde con
1.963 HTML y 13.900 archivos. La build completa posterior regeneró 1.965
rutas y dejó el manifest Pages de transferencias en 59.544 filas, 1.191
páginas, monto `$5.013.581.357.467` y checksum
`13b9de4b9d4c07ad4a46afb9b4b4a9fdc9def947f0839544ce12def1b83e5c35`; el
segundo navegador volvió a pasar las mismas diez rutas sin errores ni spinners.

### Coherencia y actualización automática de transferencias

El snapshot versionado del checkout conserva el corte del 21-08-2026 con
59.361 filas y `$5.011.094.170.302`. El backfill oficial ejecutado localmente
el 24-08-2026 produce 59.544 filas y `$5.013.581.357.467`; no se eliminaron
filas ni se mezclaron universos. Se cambió el build para que el lote oficial
recién reconstruido sea la fuente viva de Pages: genera `summary.json`,
manifest, chunks, conteos, monto y checksum desde las mismas particiones.
`pages:verify` recorre los 1.191 chunks, valida sus checksums, IDs únicos,
conteo, monto y paridad con el resumen generado.

El snapshot pequeño queda como referencia histórica/fallback del checkout, no
como límite fijo para una actualización mensual. Los textos visibles de
transferencias y `/cruces` usan ahora el manifest generado; así el site no
puede mostrar un KPI viejo junto a una lista nueva.

El Worker sigue respondiendo `DATASET_UNAVAILABLE` si D1 no tiene
`transferencias_19862`; no se anuncia un total completo desde R2 mientras R2
sólo tenga particiones parciales. Esto afecta la compatibilidad API externa,
no el primer render ni la navegación estática de Pages.

La auditoría remota del catálogo R2 también mostró que hoy sólo hay particiones
Ley 19.862 parciales (`2025-01`: 11.651 y `2026-07`: 5.913; total 17.564), no
el universo completo. Por eso no se implementó un fallback Worker que anuncie
59.361 con datos parciales.

La guardia `npm run data:verify:coherence` sigue validando el snapshot pequeño
versionado. La validación del universo vivo se hace en `pages:verify`, después
de materializarlo desde el ETL, para no bloquear actualizaciones legítimas por
un número histórico fijo.

### Diagnóstico histórico y estado actual de cobertura CPLT municipal

El diagnóstico inicial del 24-08-2026 auditó el contenido, no sólo el número
de archivos, de la proyección local `data/lake/projections/funcionarios-v1`.
Aunque existían 346 particiones con el nombre esperado, sólo Maipú y Santiago
contenían registros; ese era el motivo real por el que el ETL general en verde
no demostraba cobertura CPLT completa. Ese estado fue corregido en la fuente de
build mediante el adaptador portalizado, pero todavía no se ha publicado a R2,
D1 ni a Pages.

El builder ahora registra esta diferencia en
`public/data/funcionarios/manifest.json`:

El resultado nacional nuevo es `municipalities=346`, con 281 municipalidades
con registros, 64 sin CSV en 2024-2026 y `muni-antartica` como
`not_applicable`; sigue siendo `complete=false` para la guardia estricta.

Durante desarrollo se puede construir Pages para probar navegación: las
municipalidades sin registros cargan su manifiesto y muestran “Sin nómina
publicada”, sin solicitar un período inexistente ni dejar un spinner. CI y el
refresco automático exigen `REQUIRE_COMPLETE_CPLT=1` junto a
`CPLT_ALLOW_UNAVAILABLE=1`: se exige el censo de 346 estados, pero los 64
organismos sin CSV se publican como `unavailable` explícitos. No se deben
rellenar esos archivos con Maipú, Santiago ni datos inventados. El siguiente
paso de datos es ejecutar el workflow CPLT autorizado, publicar su manifest
versionado en R2, hidratarlo y repetir:

```bash
npm run data:hydrate:cplt
$env:REQUIRE_COMPLETE_CPLT='1'; npm run data:build:funcionarios-static
$env:REQUIRE_COMPLETE_CPLT='1'; npm run pages:verify
```

`pages:verify` también es estricto por defecto. Para inspeccionar únicamente
la navegación local mientras se espera la publicación CPLT, se puede usar
explícitamente `$env:ALLOW_PARTIAL_CPLT='1'; npm run pages:verify`; ese resultado
no es apto para promoción.

La migración Pages + Worker continúa bloqueada para promoción productiva hasta
que el Worker tenga sus bindings/datasets productivos, se resuelva la
divergencia de transferencias y pasen nuevamente los E2E, smoke y crawl frío.

### Evidencia posterior a la corrección del loader

La build local del 24-08-2026 terminó con 1.965 rutas estáticas y generó el
manifest de transferencias con 59.544 filas, 1.191 chunks y
`checksumSha256=13b9de4b9d4c07ad4a46afb9b4b4a9fdc9def947f0839544ce12def1b83e5c35`.
`ALLOW_PARTIAL_CPLT=1 npm run pages:verify` pasó con 1.963 HTML y 13.900 archivos. El navegador
contra `serve out` pasó las diez rutas principales, las cinco pestañas de la
ficha Maipú, la búsqueda local de nómina y la municipalidad sin cobertura
`/municipalidades/alto-hospicio`: no hubo 4xx de recursos, overlay ni spinner
persistente; el caso sin datos mostró el estado explícito “Sin nómina
publicada”.

La misma verificación con `REQUIRE_COMPLETE_CPLT=1` falla intencionalmente con
`FUNCIONARIOS_STATIC_COVERAGE_INCOMPLETE` y 64 municipalidades reales sin CSV;
Antártica queda separada como `not_applicable` porque no tiene municipalidad
propia. Con `ALLOW_PARTIAL_CPLT=1`, la misma build pasa con las 346 particiones
y todos los estados explícitos.
Ese fallo es ahora el criterio de seguridad para CI y el refresco automático,
no un error que deba ocultarse para publicar.

Con el artefacto portalizado local (`CPLT_STATIC_SOURCE_ROOT`), la build de
funcionarios produjo 346 manifiestos, 61.508 filas y 690 assets. La build Pages
completa terminó con 1.965 rutas prerenderizadas, cero marcadores dinámicos
`ƒ`, 1.963 HTML verificados y 14.183 archivos. El navegador, en contexto nuevo,
pasó las diez rutas principales, Maipú con sus pestañas y Alto Hospicio con el
estado vacío explícito; no hubo recursos 4xx, overlays activos ni spinners tras
5,2 segundos. La comprobación local de invariantes encontró `$8.291.039`,
`+33,7%`, `25.009`, `24,89%`, 580/189 y el redirect 301 de `muni-maipu` en
`out/_redirects`.

La build ya consume el lote full oficial recién descargado: 59.544 filas,
`$5.013.581.357.467`, 1.191 chunks y checksum
`13b9de4b9d4c07ad4a46afb9b4b4a9fdc9def947f0839544ce12def1b83e5c35`. El
snapshot de 59.361 queda sólo como fixture histórico del checkout. El
workflow valida el lote actual con `data:verify:full:ley19862` antes de
publicar; no existe bypass `ALLOW_TRANSFER_SOURCE_DRIFT` en la ruta normal.

### Headers estáticos y CSP pendiente

La build Pages ahora genera `out/_headers` con HSTS, `X-Frame-Options`,
`nosniff`, Referrer-Policy, Permissions-Policy, COOP, CORP y caché de assets,
además de `out/_redirects`. La auditoría local confirmó que estos archivos se
copian al artefacto final.

La CSP todavía no está cerrada para Pages: el checkout conserva miles de
atributos `style` inline y los scripts inline de RSC que Next necesita para
hidratar una exportación estática. El middleware OpenNext usa actualmente
nonce por request y `style-src 'unsafe-inline'`; eliminarlo sin migrar esos
estilos/scripts rompería el sitio. Se midieron 5.187 cuerpos de script inline y
2.019 valores de estilo inline en la build actual. Por tanto, no se debe
promover Pages ni afirmar “cero violaciones CSP” hasta completar esa
refactorización (clases CSS + estrategia de scripts estáticos) y repetir la
prueba en DevTools. El header estático no inventa una CSP incompleta que pueda
dejar la hidratación rota.

### Run CPLT ejecutado y causa de la luz roja histórica

El 24-08-2026 se disparó manualmente el workflow oficial
`ETL Mensual - CPLT Nóminas Transparencia Activa` en el run
`32752609856`. Planta, Honorarios y Código del Trabajo terminaron verdes, pero
Contrata falló y la consolidación/publicación R2-D1 quedó omitida. El log del
job muestra que la fuente configurada respondió `404 Not Found`:

```text
https://www.cplt.cl/transparencia_activa/datoabierto/archivos/TA_PersonalContrata.csv
CPLT_DOWNLOAD_FAILED: Contrata respondio 404 Not Found
```

Las otras tres URLs respondieron HTTP 200 en la auditoría local; el portal web
estaba además en mantenimiento al intentar inspeccionar el registro publicado.
No se reemplazó Contrata con Planta, no se reutilizó una muestra y no se marcó
el ETL como exitoso: el workflow quedó `failure` y el job final fue `skipped`.
La alternativa oficial ya fue confirmada y ejecutada localmente mediante el
Portal JSF descrito arriba. Falta incorporar este adaptador al run remoto de
Actions y publicar su release validado. El modo estricto sin
`CPLT_ALLOW_UNAVAILABLE=1` sigue fallando por los 64 estados no disponibles;
el modo automático permite publicar el censo completo con esos estados
explícitos, sin fabricar filas.

### Bitácora de continuación

- Se añadió `CPLT_ALLOW_UNAVAILABLE=1` a los workflows CPLT y Pages. La bandera
  exige las 346 particiones y publica estados explícitos; no crea filas para
  municipalidades sin CSV.
- `stage-cplt-category.mjs` completa particiones faltantes desde `coverage.json`
  y sólo permite archivos vacíos bajo esa bandera. `hydrate-cplt-from-r2.mjs`
  verifica ahora checksum SHA-256 de cada asset y el censo de 346 estados.
- Se añadió `data:verify:full:ley19862`: lee cada partición gzip del backfill,
  verifica conteo por período, IDs únicos, montos válidos, URLs oficiales y
  suma total. Es la guardia del release vivo; `data:verify:coherence` conserva
  la comprobación del fixture histórico versionado.
- Se corrigió el disparador de `pages-static-refresh.yml` y se eliminó el
  workflow duplicado de Ley 19.862. Queda un único ETL mensual vigente
  (`etl-ley-19862-full.yml`) con schedule y ejecución manual; Pages escucha
  ese flujo además del workflow CPLT.
- Auditoría local de la build estática sin bypass de transferencias:
  1.965 páginas, cero rutas `ƒ`, 13.900 archivos, 59.544 transferencias en
  1.191 chunks y 346 fichas municipales. Playwright
  en contextos nuevos pasó 10/10 rutas con HTTP 200, cero respuestas malas y
  cero spinners persistentes después de 5,2 s. `pages:verify` pasó con
  `CPLT_ALLOW_UNAVAILABLE=1`.
- La comprobación HTTP local confirmó Kaiser (`$8.291.039`, `+33,7%`),
  Bianchi (`25.009`, `24,89%`, `580`, `189`), manifest Maipú con 523 filas y
  el redirect `/municipalidades/muni-maipu` → `/municipalidades/maipu` (301).
- No se agregó CSP al artefacto todavía: quedan pendientes la migración de
  estilos/scripts inline y la prueba DevTools. `_headers` sí contiene HSTS,
  frame/content/referrer/permissions y políticas de aislamiento.
- No se hizo push, merge, deploy, cambio DNS ni publicación R2/D1 durante esta
  auditoría. Los artefactos locales bajo `out/` y `public/data/` son regenerables
  y están excluidos por `audit:repo-boundary`.

### Última comprobación reproducida después de la limpieza del índice

La última ejecución local volvió a construir Pages desde el checkout correcto:

- `pages:build`: 1.965 rutas estáticas; 59.544 transferencias; 1.191 páginas;
  checksum `13b9de4b9d4c07ad4a46afb9b4b4a9fdc9def947f0839544ce12def1b83e5c35`;
  346 municipalidades; 281 con registros, 64 `unavailable`, 1
  `not_applicable`; 61.508 filas CPLT y 690 assets.
- `CPLT_ALLOW_UNAVAILABLE=1 npm run pages:verify`: `ok=true`, 1.963 HTML y
  14.183 archivos. Sin la bandera, la guardia falla intencionalmente por las
  64 ausencias oficiales.
- `VERIFY_BASE_URL=http://127.0.0.1:8788 npm run verify:pages-browser`:
  10/10 rutas HTTP 200, cero respuestas malas y cero spinners después de
  5,2 segundos; los tiempos de esa tabla incluyen deliberadamente la espera
  de estabilidad y no son una medición de rendimiento de producción.
- `npm test`: 123 archivos y 686 pruebas; `npm run data:verify:full:ley19862`:
  59.544 filas, monto `5.013.581.357.467`, IDs duplicados `0`, URLs oficiales.
- `npm run audit:repo-boundary`: 700 archivos rastreados; las 346 particiones
  CPLT y los 3 JSON de auditoría generados quedaron fuera del índice, pero sus
  copias locales no fueron borradas.

### Actualización de contratos del Worker

Se amplió `workers/public-api/src/index.ts` para que el cutover no deje rutas
Next sin equivalente: `sources`, `records`, `relations`, `crosses`, `alertas`,
`directorio`, `politico/:id`, `export`, `health/data`, `og/site`, `og/:id`,
`csp-report` y `requests`, además de las rutas existentes de búsqueda,
funcionarios, entidades y transferencias. Las consultas usan SQL parametrizado,
límite máximo, paginación y respuestas `503` cuando falta la proyección. El
Worker no importa `data/`, `app/` ni snapshots grandes. Las pruebas locales de
contrato pasaron 4/4 y el bundle quedó en 28,13 KiB.

Esto demuestra la superficie de API y el manejo seguro de ausencia, no la
disponibilidad productiva: la publicación sigue detenida hasta comprobar las
tablas/releases reales de D1/R2, el formulario con Turnstile configurado y el
smoke contra el Worker desplegado.

### Auditoría local final de esta sesión — 2026-08-24

- El fallback CPLT quedó generalizado: cualquier categoría cuyo endpoint CSV
  responda `404` puede continuar por el Portal de Transparencia oficial por
  organismo cuando `CPLT_PORTAL_FALLBACK=1`; Actions instala Chromium en las
  cuatro categorías para que ese camino sea reproducible.
- `node --check scripts/etl/stream-remote-personal.mjs`, ESLint del Worker,
  `npm run worker:test`, `npm run worker:bundle`, `npm run typecheck`,
  `npm run lint`, `npm run data:verify:coherence` y `git diff --check` pasaron.
  Lint mantiene 137 warnings históricos y 0 errores.
- `npm test` pasó con 123 archivos, 686 pruebas Vitest y 15 pruebas ETL Node.
  La ejecución inicial con `--runInBand` fue descartada porque Vitest no
  reconoce esa opción; no fue un fallo de código.
- Playwright en servidor estático local, con contexto nuevo por ruta, pasó
  `/`, municipalidades, Maipú, político, Kaiser, Bianchi, cruces,
  transferencias, funcionarios y entidades: 10/10 HTTP 200, cero recursos con
  error, cero errores de consola accionables y cero spinners/overlays al cabo
  de 5,2 segundos. El manifest verificó 59.544 filas en 1.191 páginas.
- El bundle Worker midió 28,13 KiB sin gzip y 8,63 KiB gzip, frente al límite
  de 1 MiB. El repositorio quedó en 700 archivos rastreados y sin particiones
  CPLT ni JSON de auditoría generados dentro del índice; los archivos locales
  se conservaron para regenerar y validar.
- La CSP todavía no se declara en `_headers`: la migración de estilos/scripts
  inline y la comprobación DevTools siguen siendo un bloqueo explícito antes
  de promover Pages. Tampoco hay evidencia de producción: no se generaron
  deployment/version IDs, no se modificó CNAME y no se hizo merge, push ni
  promoción del Worker.

### Corrección posterior: grafo de navegación y universo canónico — 2026-08-24

La luz verde del ETL era válida para sus propios contratos (fuente oficial,
checksums, filas, montos y URLs), pero no cubría la navegación del export
estático. El fallo que hacía que una vista pareciera cargar y luego cayera en
otro apartado tenía tres causas independientes:

- `next/link` intentaba pedir el endpoint RSC de Next, que no existe en Pages
  estático. `components/SiteLink.tsx` ahora usa navegación HTML completa para
  que cada cambio de ruta llegue a un documento real de `out/`.
- Varias tarjetas enlazaban IDs internos (`muni-maipu`, IDs de autoridades o
  entidades) en vez de sus slugs públicos. Se centralizó la conversión y se
  añadió `scripts/verify-pages-route-links.mjs`, que recorre todos los HTML.
- Al expandir `generateStaticParams()` al universo canónico aparecieron nombres
  de InfoLobby de miles de caracteres. `compactId()` ahora conserva el prefijo
  legible y añade un hash estable cuando el segmento excede 120 caracteres;
  ningún registro se descarta por ese motivo.

Resultado reproducido después de esas correcciones:

- `CPLT_ALLOW_UNAVAILABLE=1 npm run pages:build`: 4.647 rutas estáticas y
  4.645 HTML. La salida inicial de Next tenía 30.276 archivos antes de la
  poda de auxiliares RSC descrita más abajo; sólo reportó rutas `○`/`●`, sin
  `ƒ`.
- `npm run pages:verify` y `node scripts/verify-pages-route-links.mjs`:
  `ok=true`, 169 enlaces internos únicos, 2 fuentes de redirect y cero fallas.
  `_redirects` confirma `muni-maipu → maipu` con 301; `_headers`, `404.html`,
  `robots.txt` y `sitemap.xml` están presentes.
- Playwright con contextos nuevos pasó 10/10 rutas, 200 en todas, cero
  respuestas malas, cero overlays/spinners después de 5,2 segundos y la
  navegación encadenada `home → politico → ficha → municipalidades → maipu`.
- El manifest vigente de transferencias valida 59.544 filas, 1.191 chunks,
  checksum `13b9de4b9d4c07ad4a46afb9b4b4a9fdc9def947f0839544ce12def1b83e5c35`
  y monto `5.013.581.357.467`. El guard histórico sigue verificando aparte el
  snapshot fijado de 59.361 filas; no deben mezclarse esos dos universos.
- `npm test`: 123 archivos, 686 pruebas Vitest y 15 pruebas ETL; lint termina
  con 0 errores y 137 warnings históricos. Worker: 4/4 pruebas y 28,13 KiB
  sin gzip / 8,63 KiB gzip, bajo el límite de 1 MiB.

El preview de CI usa `serve@14` sobre `out/`: en este checkout Wrangler
descubre el `wrangler.jsonc` de OpenNext y sirve `.open-next/assets` en vez de
`out/`, por lo que no es una prueba fiable del artefacto Pages. Redirects y
headers se verifican directamente como archivos del artefacto; el cambio está
documentado en `pages-static-refresh.yml`.

### Límite de archivos Pages y refresco automático

Next/Turbopack generaba cinco `.txt` auxiliares RSC por cada ruta. Como todas
las navegaciones públicas usan `SiteLink` HTML, esos archivos no son
necesarios para el sitio estático. `scripts/prune-pages-output.mjs` elimina
únicamente los patrones `index.txt`, `__PAGE__.txt` y `__next.*.txt`, conserva
`robots.txt` y se ejecuta dentro de `pages:build`.

La comprobación local eliminó 23.215 archivos auxiliares: el artefacto quedó
en 7.061 archivos, 4.645 HTML, bajo el límite gratuito de 20.000. La guardia
`verify-pages-static.mjs` falla si reaparecen esos archivos o si el total supera
20.000. El workflow de refresco tiene 60 minutos de margen para el export
canónico exhaustivo y mantiene el costo en GitHub Actions gratuito del
repositorio; no aumenta ningún recurso de Cloudflare.

`npm run pages:crawl` agregó el crawl frío reutilizable: deriva las rutas desde
los `index.html` y el sitemap, usa HTTP concurrente y distingue IDs numéricos
legítimos de páginas Cloudflare 1102. En el artefacto actual verificó 4.643
rutas, cero fallas, máximo 244 ms y p95 de 30 ms; el crawl de nivel 1 no
superó 700 ms.

La migración `0014_transferencias_19862.sql` se ejecutó en D1 local con 10
comandos exitosos. El Worker local respondió `/api/v1/health` con 200 y
bindings D1/R2 disponibles; `/api/v1/transferencias` respondió el 503 explícito
`DATASET_UNAVAILABLE` porque esa base local está vacía. La publicación real
debe cargar el release completo antes de enrutar el dominio.

### Estado externo comprobado sin mutaciones — 2026-08-25

La comprobación HTTP de sólo lectura separó el artefacto Pages del dominio
actual:

- `https://cambiometro.pages.dev/` respondió 200; sus rutas con trailing slash
  de Kaiser y Maipú respondieron 200 y conservaron sus datos visibles.
- `https://cambiometro.impulsacv.cl/` respondió 200, pero
  `/politico/vanessa-kaiser-barents-von-hohenhagen` respondió 503,
  `/municipalidades/maipu` respondió 200 en 2.634 ms y
  `/api/v1/health` respondió 404. El dominio personalizado todavía sirve el
  OpenNext anterior, no el Pages estático ni el Worker separado.
- `wrangler whoami` local confirmó que no hay sesión Cloudflare disponible.
  GitHub sí tiene `WRANGLER_TOKEN` y `CLOUDFLARE_DATA_API_TOKEN`; no existe
  todavía el secreto `UPTIME_TOKEN`. Por eso no se ejecutó deploy, cambio DNS,
  migración remota D1 ni promoción de Worker.
- El run de Actions `32791123502` en `main` confirmó la misma separación:
  Pages pasó las rutas públicas, pero `/api/v1/health/data` falló 403 porque
  el workflow antiguo no tenía el token de uptime configurado.

Este es el bloqueo externo concreto para cerrar producción; no es un problema
del artefacto local. La siguiente ejecución autorizada debe cargar la
proyección completa en D1, publicar el Worker en versión no promovida, publicar
Pages, ejecutar `verify-prod-full` y sólo después cambiar el CNAME/ruta del
dominio.

Rollback preparado (no ejecutado):

```bash
CONFIRM_PAGES_ROLLBACK=1 npm run pages:rollback -- <pages-deployment-id>
npx wrangler rollback <worker-version-id> --name cambiometro-public-api
```

El primer comando usa la API Pages Write y exige confirmación explícita; el
segundo debe ejecutarse con el `wrangler.jsonc` del Worker y el version ID
registrado durante la publicación.

### Actualización de checkout limpio y CI — 2026-08-25

La rama `feature/tarea-p-v3-static-site` contiene ahora `b534dae` y se mantiene
separada de `main`. Los cambios de esta sesión sí fueron enviados a la rama de
trabajo, pero no hubo merge, deploy, cambio de CNAME ni promoción de Worker.

El build de Pages ya no intenta consultar el portal vivo de Ley 19.862 durante
CI: `data:hydrate:ley19862` descarga desde el catálogo versionado de R2,
verifica SHA-256 y sólo materializa el año más reciente. En el catálogo remoto
hay una entrada histórica `2025-01` que se ignora deliberadamente; el release
vigente 2026 produce 59.544 filas, monto `5.013.581.357.467` y 1.191 chunks.
El snapshot histórico fijado de 59.361 filas y monto `5.011.094.170.302` sigue
siendo otro universo de pruebas y no se combina con el release vivo.

La publicación CPLT de R2 contiene 320 particiones reales y metadatos de
cobertura incompletos. CI conserva el censo canónico de 346 municipalidades:
hidrata las particiones disponibles y materializa `unavailable` explícito para
los IDs sin publicación oficial. El modo estricto continúa fallando si se
solicita una cobertura completa; el modo de build usa
`CPLT_ALLOW_UNAVAILABLE=1` y no inventa registros.

Los JSON grandes de `docs/auditoria/` siguen excluidos por
`audit:repo-boundary`; no se agregan al repositorio. `pipeline-guard.mjs` los
exige por defecto en una auditoría local, pero CI invoca explícitamente
`--allow-missing-reports` para ejecutar el guard de consistencia de gabinete y
dejar registrada la ausencia como artefacto local generado. Los guards de
coherencia, imports, tests, Worker y datos continúan ejecutándose en el
checkout limpio. Esto explica por qué el ETL podía estar verde y Quality fallar
antes: el fallo era una dependencia de tres JSON ignorados, no una incoherencia
del ETL.

La evidencia de Actions debe leerse por run y commit. Hasta que Quality y Pages
terminen verdes sobre este ajuste, la migración sigue sin criterio de promoción.

Evidencia posterior del checkout limpio:

- Pages + Worker dry-run `32795541360`, commit `b534dae`: verde en 10m21s;
  build estático, `pages:verify`, coherencia, checks y bundle completados.
- Quality `32796566007`, commit `0eb1c88`: verde en 4m25s; todos los pasos
  completados. El fallo previo `32796170690` fue sólo la allowlist faltante de
  `Bearer` en `pages-rollback.mjs`, ya corregida en `0eb1c88`.
- Los warnings de lint permanecen históricos y no bloquean el job; no se
  desactivó ningún guard por ellos.

Esto habilita continuar con revisión de preview, Worker/D1/R2 productivos y
crawl frío, pero no autoriza todavía merge a `main`, cambio DNS ni promoción.

### Auditoría de continuidad — 2026-08-25

Se confirmó que el checkout que se debe subir es únicamente
`C:\\Users\\jorge\\Proyectos\\cambiometro-public`. El checkout de auditoría
anterior queda fuera de alcance. La rama de trabajo está limpia y sincronizada
con GitHub en `5db27fc`; los artefactos `out/`, `.pages-static/`, chunks CPLT,
slices políticos y payloads municipales siguen ignorados y no forman parte del
repositorio.

La guardia `verify-pages-static.mjs` ahora valida el universo completo del
artefacto, no sólo Maipú: exige 346 directorios/IDs municipales, manifiesto
legible por municipio, período por defecto, cada payload y sus conteos; además
valida las dos copias (ID y slug), las 205 rutas HTML y la concordancia de
votos de cada slice político. `pages:verify` pasó con `CPLT_ALLOW_UNAVAILABLE=1`:
4.645 HTML, 7.061 archivos, 281 municipalidades disponibles, 64 marcadas
`unavailable`, una `not_applicable` (Antártica), 410 slices políticos y cero
fallos de checksum/enlaces. Sin ese flag, el guard falla deliberadamente porque
la fuente CPLT actual no tiene las 64 particiones; nunca se rellenan con datos
inventados.

El refresco automático quedó conectado en
`.github/workflows/pages-static-refresh.yml` a todos los workflows ETL. Cuando
un ETL termina exitosamente en `main`, el workflow hidrata R2, construye,
verifica datos, navegador, crawl y Worker, conserva el artefacto y publica
Pages con `WRANGLER_TOKEN`. Una ejecución manual no publica salvo que active
`deploy_pages=true`. Esta publicación actualiza Pages y no cambia el dominio
personalizado; el Worker se mantiene separado porque las actualizaciones de
D1/R2 no requieren una versión nueva de código.

La guardia de producción (`verify-prod-full.mjs`) ahora tiene timeout de 10 s
por request y devuelve `status 0` en vez de quedarse bloqueada en Windows. La
pasada de sólo lectura sobre el dominio actual confirmó que sigue siendo
OpenNext: home y fichas responden, pero `/api/v1/transferencias` no responde
200 y el paginador de transferencias queda en cero; además `/` y `/partidos`
superaron 700 ms en el crawl frío. `https://cambiometro.pages.dev/` sí entrega
el export estático nuevo. Esto es una falla del servicio actualmente publicado,
no una razón para relajar los gates.

Los commits `e5ac55d` y `5db27fc` tienen Quality y Pages/Worker dry-run verdes
en Actions (`32797754073` y `32797754133`). El PR histórico de esta rama queda
conflictivo con `main` porque `main` recibió otras modificaciones sobre 25
archivos (páginas, scripts de producción, `package.json` y configuración del
Worker). No se resolvió seleccionando una versión a ciegas; antes del merge se
debe crear una integración controlada y repetir tests, build, navegador y
crawl. Hasta entonces el dominio sigue con OpenNext y no existe Pages
deployment ID ni Worker version ID nuevos.

### Integración controlada con `main` — 2026-08-25

Se inició un merge sin promoción ni deploy desde `origin/main` hacia
`feature/tarea-p-v3-static-site`. En los conflictos se conservaron
explícitamente las versiones de la rama de migración para las rutas API,
`middleware.ts`, `open-next.config.ts` y la configuración OpenNext del sitio,
porque son el rollback conocido-bueno. También se restauraron las rutas API
que `main` había eliminado; esto mantiene disponible la superficie de
compatibilidad mientras Pages y el Worker se validan por separado.

La ficha de entidad-persona dejó de redirigir automáticamente a una ficha de
político. La página conserva ahora su ruta canónica y renderiza el perfil
continuamente, evitando el salto que dejaba fichas estáticas o navegaciones
incompletas. Se añadió además un entorno Wrangler `staging` aislado, sin ruta
de producción y con bindings declarativos, para satisfacer la guardia C1 sin
riesgo de apuntar pruebas locales a producción.

Evidencia local del árbol integrado antes de cerrar el merge:

- `npm test`: 124 archivos y 688 pruebas verdes, incluyendo los 15 tests ETL.
- `npm run lint -- --quiet`: verde.
- `npm run pages:build`: 4.647 rutas HTML, 205 políticos, 346 municipios y
  3.510 entidades; se podaron 23.215 auxiliares RSC.
- `npm run pages:verify`: 4.645 HTML, 7.061 archivos, sin texto de rutas
  Next dinámicas y el índice de búsqueda de 13.504.043 bytes.
- `npm run worker:check`, `npm run worker:test` (4/4) y bundle Worker:
  28,13 KiB de upload / 8,63 KiB gzip, bajo el límite de 1 MiB.
- Navegador Playwright: 10/10 rutas principales, navegación
  `/` → `/politico` → ficha → `/municipalidades` → Maipú, pestañas CPLT y
  estados vacío/no aplicable, sin spinner, overlay, respuesta fallida ni error
  de consola.
- Crawl local frío: 4.643 rutas, cero fallos, cero lentas, máximo 373 ms y
  p95 de 50 ms.
- `npm run audit:repo-boundary`: verde; los artefactos generados no entran al
  repositorio.

Este resultado sólo prueba el checkout integrado. Todavía no existe merge a
`main`, Pages deployment ID, Worker version ID, cambio de CNAME ni evidencia
de producción doble pasada. El siguiente agente debe cerrar el merge, subir
la rama, esperar los checks del commit integrado y repetir la misma evidencia
en preview antes de cualquier promoción. Si falla un gate, se conserva
OpenNext y se ejecutan sólo los rollbacks registrados en este documento.

El primer push del merge (`5f9a2c5`) fue rechazado por Actions en `npm ci`
porque el `package.json` ya declaraba `@opennextjs/cloudflare` pero el lockfile
integrado no contenía esa dependencia ni su árbol. El diagnóstico fue
determinista (`npm ci` listó los paquetes faltantes), no un fallo de red ni de
Node. Se regeneró únicamente `transparencia-app/package-lock.json` con
`npm install --package-lock-only --ignore-scripts` y
`npm ci --ignore-scripts --dry-run` pasó localmente. Debe repetirse el check
remoto sobre el commit correctivo antes de cerrar el PR.

El primer E2E del commit correctivo avanzó hasta `pages:build` y reveló una
segunda diferencia entre workflows: `build-e2e.yml` no hidrataba CPLT ni Ley
19.862 antes de construir, mientras `pages-static-check.yml` y el refresco
automático sí lo hacían. Se corrigió el workflow para descargar el catálogo
desde R2, hidratar ambas fuentes y verificar el universo de transferencias
antes de levantar Pages local. Así el checkout limpio usa la misma secuencia
de datos que el artefacto publicable.

El E2E siguiente alcanzó la compilación completa (4.671 rutas SSG) y falló
después por una llamada obsoleta a `npm run api:size`, script que no existe en
este checkout. El guard vigente es `scripts/audit/measure-bundle-size.mjs` y
ya se ejecuta en el paso siguiente del workflow. Se retiró únicamente esa
llamada inválida; no se relajó el límite del bundle ni se omitió la auditoría.

El E2E posterior falló al levantar Pages local porque Wrangler detectó el
`wrangler.jsonc` OpenNext del directorio raíz y buscó `.open-next/assets`.
Incluso aislando el directorio, esta versión local de Wrangler respondió 404
para `out/index.html`. El artefacto estático estaba correcto. El workflow usa
ahora `serve out` para la superficie HTML estática y mantiene Wrangler
separado en el puerto del Worker API; esta es la misma estrategia determinista
del refresco Pages y no cambia el runtime de producción.

### Auditoría de carga y coherencia posterior — 2026-08-25

Se corrigieron cuatro fallos que podían dejar apartados vacíos o aparentar una
carga infinita:

- `/autoridades` y `/funcionarios` ahora renderizan el contenido de Personas
  como fallback estático, aunque el servidor local no procese `_redirects`.
- El verificador usa rutas canónicas estáticas y separa `VERIFY_BASE_URL`
  (Pages) de `VERIFY_API_URL` (Worker). Los alias que deben redirigir se
  omiten sólo al verificar enlaces contra el servidor local, no en Pages.
- `widget.js` ya no asume que la respuesta de health contiene
  `meta.snapshot_etl`; usa una fecha alternativa segura.
- `/api/v1/health/data` del Worker ya no expone `publishedVersion` ni el ID
  interno de `etl_runs`; se agregó una prueba específica del contrato público.

El arnés local versionado es `scripts/serve-pages-static.mjs`. Sirve `out/`,
aplica `_redirects` y `_headers` cuando existen, y proxifica `/api/*` a
`API_ORIGIN`. Esto reproduce el enrutamiento Pages + Worker sin volver a
levantar OpenNext; la prueba `lib/deploy-runtime-ci.test.ts` exige esa
separación.

Evidencia local del checkout correcto después de estas correcciones:

- `npm run pages:build`: verde; 4.647 rutas SSG, 4.645 HTML finales y 23.215
  auxiliares RSC podados.
- `CPLT_ALLOW_UNAVAILABLE=1 npm run pages:verify`: verde; 7.061 archivos,
  346 municipios censados, 281 disponibles, 64 `unavailable`, 1
  `not_applicable`, cero fallos de checksum y cero enlaces rotos.
- `npm run verify:browser` con Pages en `3003` y Worker en `8788`: verde;
  rutas, responsive, APIs, widget, navegación y datos sin spinner persistente,
  404 ni error de consola.
- `npm run verify:pages-browser`: verde en 10 rutas principales; cero
  overlays/spinners, cero respuestas no válidas. El reporte completo registra
  59.544 transferencias y 1.191 páginas del release vivo.
- `npm run pages:crawl`: verde; 4.643 rutas, cero fallos, máximo 63 ms,
  p95 de 34 ms y cero rutas lentas.
- `npm test`: verde; 124 archivos y 689 pruebas. `npm run lint -- --quiet`,
  typecheck, Worker check/test y coherencia de datos también verdes.
- Bundle Worker: 28,17 KiB de upload y 8,66 KiB gzip; límite 1 MiB verde.

Hay dos universos de transferencia que no se deben mezclar. El release vivo
de R2 que construye Pages contiene 59.544 filas, suma
`5.013.581.357.467` CLP, checksum
`13b9de4b9d4c07ad4a46afb9b4b4a9fdc9def947f0839544ce12def1b83e5c35` y 1.191
chunks. El snapshot histórico fijado por los fixtures contiene 59.361 filas y
`5.011.094.170.302` CLP; `npm run data:verify:coherence` lo confirma de forma
independiente. La discrepancia es temporal/versionada y debe resolverse con
una decisión de release antes de afirmar las invariantes históricas en
producción; no se alteró el ETL ni se recortó el release vivo para forzar
59.361.

La puerta CSP sigue abierta deliberadamente. El artefacto Pages generado en
este checkout no emite todavía `Content-Security-Policy`, porque el árbol
actual contiene miles de estilos React inline y más de 8.000 scripts RSC inline
únicos; aplicar `style-src 'self'` sin una migración completa rompe la
hidratación y provoca React #412. Un intento de externalización por script
superó 20.000 archivos y fue retirado por completo. Por eso
`npm run verify:security` falla ahora por ausencia de la cabecera CSP y no se
considera evidencia de producción. No se añadió `unsafe-inline`; este gate
debe cerrarse con una estrategia CSP compatible y una prueba de consola antes
del cutover.

El checkout sigue sin merge a `main`, deploy de Pages, promoción del Worker,
cambio de CNAME ni workflow de uptime verde en Actions. No existen todavía
Pages deployment ID ni Worker version ID nuevos. Los comandos preparados para
rollback son:

```bash
CONFIRM_PAGES_ROLLBACK=1 npm run pages:rollback -- <pages-deployment-id>
npx wrangler rollback <worker-version-id> --name cambiometro-public-api
```

Mientras CSP, cobertura CPLT estricta, decisión del universo de transferencias
y verificación productiva doble sigan pendientes, se conserva OpenNext como
rollback y no se promueve Pages.

### Cierre de la brecha R2 → D1 de transferencias — 2026-08-25

La auditoría del checkout confirmó que el ETL mensual de Ley 19.862 publicaba
el catálogo y los artefactos completos en R2, pero terminaba sin ejecutar
`data:materialize` en D1. Esa diferencia explicaba que la UI estática pudiera
leer el release de R2 mientras `/api/v1/transferencias` devolvía
`DATASET_UNAVAILABLE` (503) cuando la tabla productiva aún no existía o estaba
vacía.

### Estado remoto posterior a la auditoría — 2026-08-25

En el commit `9c3d1cf` los checks remotos observados fueron:

- `Quality (Lint, Types & Unit Tests)`: verde, run `32806603516`.
- `Pages static + public API check`: verde, run `32806600028`.
- `Security Scan (Secrets & Audit)`: verde, run `32806603579`.
- `Build and E2E Verification`: compilación, hidratación R2, guards de datos,
  bundle Worker y `verify:browser` verdes; el run `32806603518` terminó rojo
  sólo en `verify:security` porque `/` no recibió
  `Content-Security-Policy` desde el servidor estático.

La conclusión operativa es que las rutas y los datos no deben tocarse para
resolver ese rojo: el fallo está en la generación/aplicación de headers. La
publicación Pages sigue bloqueada hasta que `out/_headers` emita una CSP
compatible con la hidratación real y el navegador confirme cero violaciones.
El código de API y la paridad R2 → D1 quedan separados de esa decisión.

El workflow `.github/workflows/etl-ley-19862-full.yml` ahora, después de
confirmar el catálogo remoto, materializa exclusivamente `ley-19862` mediante
el materializador oficial. La misma ejecución comprueba después que
`COUNT(*)` de `transferencias_19862` en D1 sea igual a `recordCount` del
catálogo R2. El paso usa los secretos existentes de producción y no agrega
servicios ni datos versionados al repositorio.

Esto corrige la actualización automática del API cuando el workflow mensual
se ejecute; todavía no es evidencia de que D1 productiva ya esté poblada, pues
no se ejecutó ningún workflow de mutación desde este checkout. Antes de
promover el Worker se debe ejecutar el workflow en Actions y conservar en el
registro el conteo, checksum, health y respuesta paginada.

### Incidente reproducido de nonce/CSP en OpenNext — 2026-08-25

El E2E de sólo lectura contra el dominio vigente reprodujo el problema que
deja fichas sin hidratar: el HTML prerenderizado se entrega con un nonce, pero
la respuesta tenía `Cache-Control: s-maxage=31536000`. En una petición
posterior el middleware genera otro nonce para el CSP, mientras el HTML puede
seguir viniendo de caché con el anterior. Chromium registró violaciones CSP y
la ficha municipal llegó sin `h1`.

Se agregó una prueba en `transparencia-app/lib/middleware.test.ts` y el
middleware de rollback ahora marca el HTML como `private, no-store, max-age=0`
con `CDN-Cache-Control: no-store` y
`Cloudflare-CDN-Cache-Control: no-store`. La prueba reproduce el caso y pasa
localmente; esto no se aplica al export Pages porque su staging excluye el
middleware.

El intento de usar todos los hashes inline como CSP estática fue descartado:
el generador produjo una línea de 831.799 bytes con 15.395 hashes. Cloudflare
Pages limita cada línea de `_headers` a 2.000 caracteres, así que esa salida
no es desplegable. No se dejó ese artefacto en `public/_headers` ni en Git.

El build OpenNext (`npm run cf:build`) tampoco es actualmente reproducible
desde este checkout porque `next.config.ts` ya declara `output: "export"` y
la ruta histórica `app/api/og/[id]` sigue en el árbol fuente. El rollback
conocido sigue siendo el deployment existente; antes de retirar OpenNext se
debe conservar un build/configuración de rollback reproducible por separado.

La corrida de Actions sobre `09767a3` (`Build and E2E Verification`, run
`32808312266`) confirmó la misma frontera: build estático, hidratación oficial
R2, bundle Worker, `verify:browser` y fixture D1 pasan; `verify:security` falla
únicamente porque el servidor estático no recibe `Content-Security-Policy`.
No se debe convertir ese rojo en un bypass: es el gate que evita promover un
Pages funcional pero sin la postura de seguridad exigida.

### Rollback OpenNext reproducible — 2026-08-25

Se añadió `transparencia-app/next.config.opennext.ts` y el script
`scripts/build-open-next-rollback.mjs`. `npm run cf:build`, `npm run preview` y
`npm run deploy` cambian temporalmente a la configuración OpenNext, ejecutan el
build y restauran `next.config.ts` incluso si el proceso termina con error.
Así el build Pages conserva `output: "export"` y el rollback histórico puede
reconstruirse sin editar archivos a mano.

Verificación local: `npm run cf:build` terminó con `OpenNext build complete` y
`next.config.ts` quedó restaurado. El artefacto `.open-next` es generado e
ignorado; no se incorpora al repositorio.

El guard `verify-static-export.mjs` ahora forma parte de `pages:verify` y
comprueba CSP presente, máximo de 100 reglas y máximo de 2.000 caracteres por
línea. En el artefacto actual falla de forma intencional con
`out/_headers no publica Content-Security-Policy`; el generador de hashes
también se niega a escribir una política de 831.799 caracteres. El CI queda
rojo hasta resolver la CSP de forma compatible con la hidratación, en lugar de
aceptar un header inválido o silenciar el check.

La medición reproducible `npm run audit:inline-styles` encontró 3.286 usos de
`style`: 3.022 objetos son literales directos extraíbles, 263 dependen de
estado/datos React y uno usa una expresión externa. La guardia ya no considera
condicionales como literales estáticos; esto evita subestimar el trabajo CSP.
La próxima migración debe convertir los 3.022 estilos directos a clases CSS y
resolver los 264 restantes (colores, porcentajes, transiciones y estilos de
componentes interactivos) sin romper la hidratación.

También se corrigió `scripts/verify-prod-full.mjs`: el contrato del Worker se
lee como `payload.data.total` y `payload.data.data[]`, y la verificación ahora
detecta explícitamente el caso peligroso de nonce con `s-maxage` compartido.
Así la doble pasada productiva no confundirá una respuesta API válida con un
fallo de forma, ni permitirá cerrar el incidente de hidratación sin comprobar
el cache-control real.

La ejecución de diagnóstico contra la producción vigente del 2026-08-25
terminó con 108 verificaciones pasadas y 11 fallidas. Pasaron Kaiser
(`$8.291.039`, `+33,7%`), Bianchi, la redirección 301 de Maipú, los tiles de
cruces, fuentes, calidad y los estados editoriales. Fallaron deliberadamente:

- nonce CSP servido junto con `s-maxage=31536000`;
- total/paginación estática de transferencias, que devolvió `0` en ese
  OpenNext, y `/api/v1/transferencias` con 503;
- latencias de `/rankings` (13.303 ms), `/cambios` (13.262 ms),
  `/funcionarios` (23.171 ms), Karim (22.704 ms), Concepción (22.661 ms) y
  Hacienda (22.691 ms).

Las respuestas fueron 200, pero las latencias incumplen el objetivo de 700 ms
y el navegador registró violaciones CSP en el dominio actual. Esta salida es
una línea base de OpenNext, no evidencia de aprobación del cutover.

Después de esa corrida se reforzó `verify-prod-full.mjs` para que la próxima
pasada también compruebe explícitamente en la ficha de Carlos Bianchi
`25.009`, `24,89%`, `580` votos de Cámara y `189` de Senado. La salida 108/11
es, por tanto, la evidencia capturada antes de añadir esas tres aserciones
específicas; no se presenta como una corrida nueva ni como doble pasada.

### Cierre local de CSP Pages y fallback R2 del Worker — 2026-08-25

El checkout correcto ya tiene una transformación de build acotada para CSP:
`scripts/prepare-static-csp.mjs` usa el AST de TypeScript sólo en el staging de
Pages y convirtió 3.288 props `style` de 87 archivos en clases deterministas.
`scripts/finalize-static-csp.mjs` genera el CSS externo
`/_next/static/css/csp-inline-styles.css` con 2.061 reglas y 188.353 bytes.
La política estática usa únicamente el nonce fijo de assets
`cambiometro-static-v1`; no contiene `unsafe-inline` ni `unsafe-eval`, y la
línea CSP de `out/_headers` mide 653 caracteres. Las dos declaraciones de
estilo residuales del framework están limitadas mediante hashes exactos.

Evidencia local posterior a esa implementación:

- `npm run pages:build`: 4.647 rutas, 4.645 HTML; release Ley 19.862 de
  59.544 filas, 1.191 páginas, suma `5.013.581.357.467` y checksum
  `13b9de4b9d4c07ad4a46afb9b4b4a9fdc9def947f0839544ce12def1b83e5c35`.
- `CPLT_ALLOW_UNAVAILABLE=1 npm run pages:verify`: 7.064 archivos,
  720.079.202 bytes, cero rutas fallidas, cero RSC auxiliares y asset mayor
  de 15,9 MB; dentro de los límites de Pages.
- `npm run verify:pages-browser`: 10/10 rutas críticas en 200, sin spinner,
  overlay, error de consola o respuesta de recurso inválida; navegación
  home → político → ficha → municipalidad → Maipú verde. Transferencias
  mostró 59.544 filas y 1.191 páginas.
- `CRAWL_CONCURRENCY=16 npm run pages:crawl`: 4.643 rutas, cero fallas,
  cero lentas; máximo 83 ms y p95 44 ms en el servidor estático local.
- `VERIFY_BASE_URL=http://127.0.0.1:8788 VERIFY_API_URL=http://127.0.0.1:8789
  npm run verify:security`: seis rutas con cabeceras completas y búsqueda
  sin reflexión XSS. El Worker local se ejecutó separado del servidor Pages.
- `npm run worker:check`, `npm run worker:test` (6 pruebas) y
  `npm run worker:bundle`: verde; 30,06 KiB upload / 9,30 KiB gzip.

La API de transferencias ya no queda bloqueada por el tamaño de D1. Se añadió
`scripts/publish-transferencias-api-release.mjs`, que publica páginas de 50,
índice de búsqueda y un manifest puntero inmutable bajo
`projections/transferencias-v1/` en R2. El Worker intenta D1 cuando existe y
cae al release R2 con el mismo contrato, filtros, paginación, checksum y
`sourceStatus: complete` cuando D1 está ausente o vacío. La prueba unitaria
reproduce exactamente ese caso. La materialización D1 quedó como optimización
opcional del ETL; el gate obligatorio es la paridad del manifest R2 contra el
catálogo oficial. Esto evita que un límite de almacenamiento deje el endpoint
en 503 o fuerce una muestra inventada.

Esta sección sólo documenta verificación local. Sigue pendiente ejecutar el
workflow mensual con secretos reales, verificar el manifest publicado en R2,
desplegar Pages/Worker en preview, realizar crawl frío productivo y obtener
deployment/version IDs. Mientras eso no ocurra, no existe evidencia de
producción ni autorización para cambiar CNAME o promover el cutover.

Para continuar sin mutar tráfico se añadieron dos operaciones manuales:
`pages-static-refresh.yml` acepta `deploy_preview=true` y publica una rama
Pages `preview-<run_id>`; `public-api-version-upload.yml` valida y ejecuta
`wrangler versions upload` sin ejecutar `versions deploy`. La promoción sigue
siendo una acción separada, y los comandos de rollback permanecen:

```bash
npm run pages:rollback -- <pages-deployment-id>
npx wrangler rollback <worker-version-id> --name cambiometro-public-api
```

### Incidente CI del widget y corrección CSP — 2026-08-25

El run `32814866419` validó correctamente datos R2, export Pages, bundle y
navegador, pero falló en `verify:browser` esperando el nombre del widget. La
reproducción local mostró dos causas separadas: el test apuntaba directamente
al puerto del Worker, incompatible con `connect-src 'self'`, y `widget.js`
creaba un `<style>` inline dentro del Shadow DOM, que violaba `style-src`.

Se corrigió el test para que, cuando Pages y Worker estén en puertos locales
distintos, el widget use el proxy de Pages (el equivalente local del dominio
único). El widget ahora carga `public/widget.css` como hoja externa y publica
headers CORS/CORP para `widget.js` y `widget.css`; no se agregó
`unsafe-inline`.

Evidencia posterior: el widget renderizó `José Antonio Kast Adriasola`, el
escaneo de cuatro rutas principales más el widget registró cero mensajes CSP,
`verify:browser` terminó verde, `verify:security` terminó verde y el artefacto
Pages quedó en 7.065 archivos, con cero fallas de rutas. El run posterior
`32817982573` terminó verde el 2026-08-25: export Pages, hidratación R2,
bundle Worker, rutas, APIs, UI responsive y widget.

### Auditoría de continuidad del checkout correcto — 2026-08-25

Esta auditoría se ejecutó exclusivamente en
`C:\Users\jorge\Proyectos\cambiometro-public`, rama
`feature/tarea-p-v3-static-site`, commit `1044871` (`10448713e160...`). El
checkout local quedó limpio y el PR #73 sigue abierto contra `main`; no se
ejecutó merge, deploy, cambio de CNAME ni promoción de Worker.

Los gates remotos del commit están verdes:

- Build/E2E `32817982573`: verde, 8m21s.
- Quality `32817982339`: verde.
- Quality duplicado `32817977085`: verde.
- Security `32817982367`: verde.
- PR #73: `OPEN`, `mergeStateStatus=CLEAN`.

El guard de frontera reportó 755 archivos versionados y cero artefactos
generados indebidos. `out/`, `.next/`, `.open-next/`, `.wrangler/`, chunks,
slices, particiones CPLT y artefactos de auditoría JSON están excluidos del
repositorio. Permanecen versionados 17 archivos mayores de 200 KB porque son
entradas de build/fixtures activos, módulos fuente o `package-lock.json`; no
se eliminaron a ciegas porque romperían el build conocido y los ETL. La lista
exacta se obtiene con `git ls-files` y el inventario de esta auditoría.

Los 17 archivos versionados mayores de 200 KB son:

```text
data/politicos-votaciones.json
data/lake/projections/v1/chilecompra.json
data/lake/projections/v1/ley19862-summary.json
data/lake-subsets/politicos-votaciones.subset.json
data/partidos-stats.json
data/catalog/entities-routes.json
data/lake/projections/v1/sinim.json
data/personal-apoyo.json
data/lake/projections/v1/contraloria.json
data/lake/projections/v1/presupuesto.json
data/municipalidades-data.json
data/lake/projections/v1/organismos.json
data/lake-subsets/partidos-stats.subset.json
data/catalog/communes.json
package-lock.json
lib/funcionarios-source.ts
lib/municipalidades.ts
```

Estos archivos no son artefactos generados de Pages: los JSON son fixtures o
entradas requeridas por el build/ETL actual, los dos módulos son código fuente
y el lockfile es necesario para instalaciones reproducibles. Los payloads
full, slices y resultados de build sí permanecen fuera de Git.

La verificación normal `npm run data:verify:coherence` está verde para el
snapshot fijado de 59.361 filas y `$5.011.094.170.302`. La verificación estricta
`npm run data:verify:coherence -- --require-full` falla de forma deliberada:
las particiones full locales contienen 59.544 filas y
`$5.013.581.357.467`. Es una divergencia de release de la fuente oficial; se
debe fijar un manifest/checksum y regenerar todos los derivados juntos antes
de publicar, nunca recortar o combinar filas manualmente. Hasta entonces, el
sitio debe tratar el snapshot pinned y el release full como universos
separados y no declarar paridad completa.

Conclusión operativa: la base de código y el pipeline están listos para un
preview reversible, pero la migración todavía no está cerrada en producción.
El siguiente paso correcto es validar un único release de transferencias en
R2/D1, ejecutar preview Pages y upload de versión Worker sin promoción, y sólo
después repetir crawl frío, `verify-prod-full` doble y smoke. OpenNext y el
dominio actual permanecen como rollback.
