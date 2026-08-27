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

La comprobación read-only del health productivo actual también devolvió
`transferRows=59912`, mientras que el release objetivo exige `59361`. La nueva
guardia falla explícitamente con `API_TRANSFER_UNIVERSE_MISMATCH` hasta que el
Worker/R2 productivos se actualicen y su checksum coincida.

El código ya incluye la migración `0014_transferencias_19862.sql` y el paso
`data:materialize:transfer` para poblar D1 en lotes con el checksum del release.
La materialización sólo acepta el universo canónico de 59.361 filas y
`$5.011.094.170.302`; no convierte el release productivo actual de 59.912 en
un dato válido.

La prueba de navegador read-only del dominio confirmó además que producción
continúa sirviendo el stack anterior: `/votaciones-destacadas` devuelve 404 y
la consola reporta violaciones CSP por scripts inline, Cloudflare Insights y
Google Tag Manager. El E2E ya no ignora esos mensajes; el workflow de
producción fallará hasta que el deployment Pages estático y la configuración
Cloudflare estén realmente activos.

Todavía falta ejecutar contra producción real, después de una aprobación
explícita: doble `verify-prod-full` separada por diez minutos con el universo
fijado en 59.361 filas, crawl frío del dominio, primer run verde de
`uptime-smoke`, inspección CSP en DevTools y confirmación de CNAME/WAF. El
workflow conserva las salidas completas aunque una pasada falle, para que la
decisión se base en evidencia de ambas pasadas. Por eso este documento no
declara el cutover cerrado.

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
