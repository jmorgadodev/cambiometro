# Estado de cierre Pages + Worker y Opción A

Fecha de la verificación local: 2026-08-27.

## Alcance

El trabajo se realizó únicamente en `cambiometro-public`, sobre la rama
`codex/close-pages-worker-option-a`. `cambiometro-audit` no forma parte de
este cambio. La publicación productiva, el cambio de DNS y la promoción del
Worker no se ejecutaron.

## Evidencia local

| Control | Resultado |
|---|---|
| TypeScript, Worker typecheck y tests | 741 tests, 134 archivos: verde |
| Lint | 0 errores; 147 advertencias preexistentes |
| Arquitectura estática y tokens | verde |
| Calendario ETL | 11 workflows verificados, `America/Santiago` |
| ETL coverage sweep | 14/14 controles; 769 votaciones, 580 Cámara, 189 Senado |
| Build Pages | 5.018 HTML, 16.377 archivos, 562.812.977 bytes |
| Fichas | 205 políticos, 346 municipalidades, 3.881 entidades |
| Transferencias | 59.361 filas, 1.188 chunks, $5.011.094.170.302 |
| Worker | 135.119 bytes; límite 1.000.000 |
| Navegador estático | 80/80, sin spinner, errores ni respuestas 4xx/5xx |
| Temas | 12/12 capturas; axe WCAG 2A/2AA sin violaciones |
| Crawl frío serial | 5.015/5.015 rutas, 0 fallos, 0 1102, máximo 47 ms |
| Guardias de artefactos | 1.001 archivos rastreados, 0 generados comprometidos |

Las capturas y el JSON del crawl se generan en `transparencia-app/artifacts/`
y están ignorados por Git. El crawl concurrente contra Wrangler local se
descartó como evidencia porque saturó el servidor de desarrollo; el crawl
serial contra el mismo `out/` pasó completo.

## Bloqueos para producción

El build local sólo pudo usar `ALLOW_STATIC_SAMPLE=1` porque el checkout limpio
no contiene los subsets de gastos operacionales hidratados desde R2. Esto no
se permite en el workflow de publicación: `pages-static-refresh.yml` usa
`--required --required-all` y `pages:build` debe ejecutarse sin ese flag antes
de publicar. Un ETL verde sin publicación R2/D1 queda bloqueado por
`etl-publication-guard.yml`.

La comprobación read-only del health productivo actual devolvió
`transferRows=59912`, coherentes con el manifest y checksum publicados en R2.
`59361` queda como baseline histórico mínimo. El PR #208 (`7caf5a1`) corrigió
la guardia para aceptar releases oficiales posteriores completos sin recortar
datos; el workflow de refresco `33046341762` está validando ese caso.

El código ya incluye la migración `0014_transferencias_19862.sql` y el paso
`data:materialize:transfer` para poblar D1 en lotes con el checksum del release.
La materialización valida el mismo checksum/manifest del release y conserva el
baseline mínimo de 59.361 filas y `$5.011.094.170.302`. La proyección D1 no es
requisito para el Worker actual: el release completo se sirve R2-first porque
la base productiva alcanzó su límite de capacidad.

La prueba read-only actual observa que `/votaciones-destacadas` aún devuelve
404 y que el deployment activo no contiene los tokens Opción A (`paper`,
`dark`, `night`); está sirviendo una versión Pages anterior. El E2E debe
repetirse contra el próximo preview generado desde `main` antes de promoverlo.

Todavía falta completar contra el deployment nuevo: doble `verify-prod-full`
separada por diez minutos, crawl frío del dominio, primer run verde de
`uptime-smoke`, inspección CSP en DevTools y confirmación de WAF. El CNAME y el
registro de custom domain ya aparecen en el preflight read-only, pero no se
declara cerrado el cutover hasta que el preview nuevo pase esos gates.

## Protección de publicación

Los eventos push, ETL y dispatch pueden construir y verificar el artefacto,
pero el deploy productivo de Pages exige dispatch manual con:

```text
publish_pages=true
confirm_cutover=CAMBIOMETRO_CONFIRM_CUTOVER
```

El workflow Cloudflare es de sólo lectura por defecto. `--apply` exige la
variable `CAMBIOMETRO_CONFIRM_CUTOVER`, el hostname exacto, `/` o `/api/*` y
el header secreto de uptime. No se agrega `unsafe-inline` a CSP.

## Corridas productivas registradas

- `33041504758`: Worker candidato subido sin promoción; version ID
  `2633eef6-777e-4a21-91e4-a482d98781bc`; bundle 131,95 KiB.
- `33041504766`: refresco Pages rechazado antes de publicar porque R2 reportó
  59.912 filas y el gate canónico exige 59.361.
- `33041645334`: preflight WAF read-only; encontró la regla
  `28645f6a4f3e40eb8f51836bb32d7614`, pero la CSP antigua seguía dinámica.
- `33041993122`: aplicación WAF limitada exitosa; luego falló sólo el gate de
  CSP dinámica del stack anterior.
- `33041213475` y `33042027955`: smoke productivo 9/10; API, listados y ficha
  pasan, pero `/` continúa en 403. Se generaron los incidentes GitHub #198 y
  #200.
- `33042554365`: preflight WAF read-only posterior al merge; confirmó
  `expressionMatchesSecret=true` y el alcance correcto de la regla. Continúa
  fallando únicamente por la inyección CSP del stack anterior.
- `33042337269`: doble verificación productiva con ambas pasadas ejecutadas
  (05:24:11 y 05:34:55 UTC). Cada pasada obtuvo 91 verificaciones correctas y
  26 fallidas; la portada recibió 403 desde el runner, el sitemap del crawl
  recibió 403 y producción sigue publicando 59.912 transferencias/1.199
  páginas en vez de 59.361/1.188. El artefacto completo quedó descargado en
  el directorio temporal `cambiometro-prod-33042337269` del equipo de
  verificación.
- `33043359229`: segunda corrida doble con ambas pasadas ejecutadas (05:43:23
  y 05:54:03 UTC). Repitió 91 correctas y 26 fallidas en cada pasada; el
  crawl autenticado también recibió `SITEMAP_HTTP_403`. El artefacto completo
  quedó publicado en GitHub Actions como `production-verification-33043359229`
  (artifact ID `9634916487`).
- `33044032375`: preflight WAF con diagnóstico seguro; confirmó
  `expressionMatchesSecret=true`, la regla `28645f6a4f3e40eb8f51836bb32d7614`
  y `cf-mitigated=challenge`/`403` en `/`, con HTML de
  `/cdn-cgi/challenge-platform/`. El 403 proviene de una protección Bot
  Fight/Challenge fuera de la excepción WAF; no se habilitará una excepción
  global ni se desactivará protección sin una decisión explícita.
- `33045338762` y `33046472668`: preflight WAF read-only; la expresión coincide
  con el secreto (`expressionMatchesSecret=true`), pero Bot Management devuelve
  `403 Authentication error` y el borde mantiene `cf-mitigated=challenge` en
  `/` aun con el header de uptime. No se hizo bypass global.
- `33046474605`: preflight custom domain Pages exitoso; observó deployment
  `c0c444ff-ecd1-407b-9a51-2a2ad3a6f88b`, custom domain registrado, CNAME
  `cambiometro.pages.dev` y ruta Worker `cambiometro.impulsacv.cl/api/*`.
- `33046341762`: refresco Pages de `main` terminó verde después de validar
  inputs oficiales R2; no publicó producción automáticamente.
- Verificación local contra el dominio real, pasadas `2026-08-27T06:37:46Z` y
  `2026-08-27T06:48:19Z`: `116` correctas y `3` fallidas en cada pasada; las
  tres fallas son exclusivamente los tokens del tema anterior. Invariantes,
  Worker, gastos, Maipú, transferencias `59912` y cobertura `769` pasaron.

La documentación de Cloudflare confirma que Bot Fight Mode no puede omitirse
con una regla Skip. Para liberar de forma segura el runner se debe desactivar
Bot Fight Mode y usar una modalidad con excepciones (SBFM/Bot Management), o
autorizar una IP fija controlada; los runners hospedados de GitHub no tienen
una IP única estable. Referencias: [Skip options de WAF](https://developers.cloudflare.com/waf/custom-rules/skip/options/)
y [Bot Fight Mode](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/).

No existe Pages deployment ID nuevo: ningún despliegue Pages fue promovido.
Se conserva como rollback conocido-bueno `0cd3adf2-864f-4e99-bc32-7ec5c02b8519`.

## Rollback preparado

```bash
npm run pages:rollback -- <pages-deployment-id>
npx wrangler rollback <worker-version-id> --name cambiometro-public-api
```

Referencias conocidas antes de este cierre: Pages
`0cd3adf2-864f-4e99-bc32-7ec5c02b8519` y Worker
`3ea6312f-6f6e-4185-9ee7-0cb2891e17c0`. No se presentan como IDs de una nueva
publicación.

## Estado operativo comprobado — 27-ago-2026

Esta sección es la referencia vigente y reemplaza cualquier cifra anterior de
esta auditoría que indique que el cierre productivo ya está aprobado.

### Código y candidato Pages

- `main` está limpio y sincronizado en `f49995e`; no se trabaja desde
  `cambiometro-audit`.
- El refresco Pages `33054333038` terminó `success` sobre `8d5f2be`; generó el
  artefacto `pages-static-8d5f2be03149e2352427219e4d770c56251eb8f0`, ID
  `9639677162`, de `198.100.519` bytes. El job de promoción productiva quedó
  omitido.
- El preview verificable es `https://codex-static-1c8bd09.cambiometro.pages.dev`
  (deployment corto `f917c34f`; run `33050990340`; artefacto `9638212276`).
  Browser, chunks, invariantes, crawl frío y temas pasaron en ese candidato.

### Datos y verificaciones del candidato

- Transferencias: `59.912` filas, `1.199` páginas, monto total
  `$5.020.688.584.211`, checksum
  `2144da2a41d67a8fef109273242b72fb8c321ce2eb45c81b0cbcf1252ab43838`.
  `59.361` y `$5.011.094.170.302` permanecen como baseline histórico mínimo;
  no se recorta un release oficial más nuevo.
- Gastos rendidos: `16.275` filas Cámara y `6.513` Senado. La ficha de Carlos
  Bianchi usa el registro correcto `dip-154`; un mes pendiente en cero no
  oculta su historial acumulado.
- El crawl del preview cubrió `5.015/5.015` rutas: `200` en todas, cero 404,
  5xx y 1102; máximo `555 ms`, promedio `253 ms`, y las rutas principales
  bajo `700 ms`.
- Temas: `12/12` capturas y axe WCAG AA sin violaciones en las cuatro vistas.
  El navegador estático pasó sin spinner permanente, overlay, errores de
  consola ni recursos fallidos.

### Producción real: doble pasada bloqueada por Cloudflare

La corrida oficial `33054809647` ejecutó ambas pasadas y guardó el artefacto
`production-verification-33054809647` (ID `9639503790`). No es evidencia verde:

- Pasada 1: `2026-08-27T08:37:54.515Z`, `100` correctas y `17` fallidas.
- Pasada 2: `2026-08-27T08:48:49.999Z`, `100` correctas y `17` fallidas.
- En ambas, el runner recibió `403` con `cf-mitigated: challenge` en `/`; el
  crawl abortó con `SITEMAP_HTTP_403`. Las invariantes de fichas, gastos,
  transferencias, Worker y cobertura que sí alcanzaron a ejecutarse pasaron.
- El crawl no puede declararse como cero-fallos de producción mientras el
  runner no pueda leer la raíz y el sitemap.

Desde una red externa la raíz responde `200` y el API responde `200`, pero eso
no reemplaza el gate de Actions: el uptime reciente sigue rojo por el mismo
challenge en `/`. La regla Skip WAF existente sí coincide con el secreto
(`expressionMatchesSecret=true`), pero no omite Bot Fight Mode. No se debe
abrir globalmente el API ni agregar `unsafe-inline` a la CSP. La acción pendiente
es una excepción de producto anti-bots para el hostname exacto y el tráfico
controlado de verificación, o migrar a una modalidad de protección que admita
Skip; después hay que repetir smoke, crawl y las dos pasadas.

Comprobación pública adicional de esta fecha:

| URL | Resultado |
|---|---|
| `/` | `200`, pero no es el candidato nuevo |
| `/votaciones-destacadas/` | `404` en el deployment público actual |
| `/api/v1/health` | `200`, Worker activo |
| `/data/transferencias/manifest.json` | `200`, release `59.912` |
| Preview `/votaciones-destacadas/` | `200` |

Por tanto, no existe un Pages deployment ID nuevo promovido ni un Worker
version ID nuevo de este cierre. Se mantienen como referencias de rollback los
IDs conocidos-buenos:

```bash
npm run pages:rollback -- 0cd3adf2-864f-4e99-bc32-7ec5c02b8519
npx wrangler rollback 3ea6312f-6f6e-4185-9ee7-0cb2891e17c0 \
  --name cambiometro-public-api
```

Los logs completos de la corrida están en el artefacto de Actions y, durante
la auditoría local, en:

```text
C:\Users\jorge\AppData\Local\Temp\cambiometro-prod-evidence-33054809647\browser-production.log
C:\Users\jorge\AppData\Local\Temp\cambiometro-prod-evidence-33054809647\cold-crawl-output.log
C:\Users\jorge\AppData\Local\Temp\cambiometro-prod-evidence-33054809647\verify-prod-double.log
```

No se declara cerrado el cutover hasta que Cloudflare permita esas lecturas
desde Actions y pasen nuevamente todos los gates. Mientras tanto, el preview
queda disponible para la siguiente promoción controlada y el repositorio no
rastrea `out/`, `.next/`, `public/data/`, logs ni artefactos generados.
