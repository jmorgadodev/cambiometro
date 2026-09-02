# Cierre operativo — 2026-09-02

## Estado

El cierre todavía no está autorizado para publicar Pages. El Worker está
publicado al 100% y la reconstrucción Pages quedó validada como artefacto, pero
la zona Cloudflare aún inyecta JavaScript Detection en el HTML. Ese script
inline genera violaciones CSP y debe desactivarse con el permiso específico de
Cloudflare antes del cutover.

## Evidencia ejecutada

- `main`: `4f1541f`.
- PR #331: fusionado después de pasar build/E2E, tipos, seguridad y pruebas.
- Worker versión candidata y promovida: `b407af40-b45a-47cd-ba73-66586bfe3bfb`.
- Worker bundle: 150,11 KiB sin comprimir / 25,78 KiB gzip; límite 1 MB.
- Producción Worker: `gastos_camara` 200 con 16.275 filas; `gastos_senado` 200
  con 6.513 filas, ambos desde R2 y sin consultar D1.
- Build Pages verificable: workflow `33608448730`, terminado verde. El release
  parlamentario validado contiene 797 sesiones: 599 Cámara y 198 Senado.
- Verificación productiva local posterior al Worker: 134 controles pasados,
  2 pendientes (CSP y Pages todavía sirve el release anterior de 769 sesiones).
- Preflight Cloudflare: workflow `33608291394`, verde; regla limitada al host
  `cambiometro.impulsacv.cl`, `/` y `/api/*`, con el token de uptime real.
- Aplicación Cloudflare: workflow `33608366995`; la regla WAF se actualizó,
  pero `Bot Management` devolvió HTTP 403 al intentar `enable_js=false`.

## Por qué no se publica Pages todavía

Publicar ahora actualizaría los datos, pero mantendría las dos violaciones CSP
producidas por la inyección de Cloudflare. El criterio de lanzamiento exige
cero violaciones, por lo que el artefacto se conserva sin promover.

## Acción externa única pendiente

Editar el token guardado como `CLOUDFLARE_CUTOVER_TOKEN` y agregar permiso de
zona para configuración de Bot Management con capacidad de edición. Después,
ejecutar el workflow `Cloudflare production guard (preflight by default)` con:

```text
apply=true
disable_rum=false
disable_js_detection=true
confirmation=CAMBIOMETRO_CONFIRM_CUTOVER
```

No habilitar `unsafe-inline`, no desactivar Bot Fight global y no abrir una
excepción WAF global. Al desaparecer la inyección, repetir `verify-prod-full`,
el crawl frío y el smoke antes de promover el artefacto Pages.

## Rollback

```bash
npm run pages:rollback -- <pages-deployment-id>
npx wrangler rollback b407af40-b45a-47cd-ba73-66586bfe3bfb \
  --name cambiometro-public-api
```

El último Pages conocido-bueno registrado es
`0cd3adf2-864f-4e99-bc32-7ec5c02b8519`.

## Incrementalidad

Los builds posteriores restauran el snapshot validado por checksum desde la
caché. El build de referencia tardó 24:46 y el siguiente 3:48, omitiendo la
hidratación de entradas sin cambios. Los ETL sólo deben volver a publicar los
artefactos que cambien; no se repite el universo completo por cambios de
interfaz.
