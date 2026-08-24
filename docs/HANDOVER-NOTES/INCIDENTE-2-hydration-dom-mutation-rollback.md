# INCIDENTE-2 — Intermitencia en Navegación Client-Side ("This page couldn't load"), Rollback y Fix de Orbe Seguro

**Fecha:** 2026-08-22  
**Estado:** Resuelto / Mitigado  
**Versión de Rollback Inmediato:** `ba788f15-bb61-459d-9354-6bfb5dbb2ccc`  
**PR del Fix Seguro:** PR #34  

---

## 1. Síntomas Reportados

- El splash inicial y el orbe eran visibles durante la carga, pero al interactuar y navegar a fichas políticas o rutas dinámicas, el navegador presentaba de forma intermitente la pantalla de error de Next.js: *"This page couldn't load"*.
- Al presionar F5 (recarga dura SSR), la página cargaba correctamente (HTTP 200), pero volvía a fallar al intentar realizar transiciones mediante enlaces client-side.

---

## 2. Acciones Inmediatas (Rollback)

1. Se ejecutó de forma inmediata el rollback en Cloudflare Workers a la versión estable:
   ```bash
   npx wrangler rollback ba788f15-bb61-459d-9354-6bfb5dbb2ccc
   ```
2. Se verificó respuesta HTTP 200 y ausencia de errores en:
   - `/`
   - `/municipalidades`
   - `/datos`
   - `/cruces`
   - `/politico/vanessa-kaiser-barents-von-hohenhagen`
   - `/politico/jorge-diaz-ibarra`
   - `/politico/luis-malla-valenzuela`

---

## 3. Causa Raíz (Root Cause)

1. **Mutación Destructiva del DOM en SSR (`splash.remove()`):**
   - En los PRs #30-#33 se insertó `<div id="initial-splash-orb">` en el HTML SSR de `app/layout.tsx` como primer hijo del `<body>`.
   - Tras la hidratación, `RouteTransitionOrb.tsx` ejecutaba `splash.remove()` eliminando el nodo directamente del DOM nativo.
   - En React 19 / Next.js App Router, cuando el cliente realiza una navegación SPA, el reconciliador de React compara el árbol de Fiber con el DOM del contenedor raíz. Al haber desaparecido un nodo renderizado por el servidor sin conocimiento de React, la reconciliación lanzaba un error no capturado en el runtime del cliente (`NotFoundError: Node not found` / mismatch de hidratación), disparando el error boundary de Next.js (*"This page couldn't load"*).

2. **Colisión de Estados y Eventos Nativos (`beforeunload` + `classList.add`):**
   - La manipulación manual de clases (`overlay.classList.add("is-active")`) sobre un componente controlado por React generaba desincronización entre las props de React y los atributos reales del elemento DOM.
   - El listener global de `beforeunload` introducía bloqueos innecesarios en la descarga de páginas.

---

## 4. Solución Aplicada (Fix Seguro del Orbe)

1. **Preservación Estricta del DOM:**
   - El splash inicial `#initial-splash-orb` nunca se elimina del DOM (`splash.remove()` eliminado). En su lugar, simplemente recibe la clase CSS `.initial-splash-orb--hidden` con `opacity: 0; visibility: hidden; pointer-events: none;`.
2. **Control Exclusivo por Estado React:**
   - El overlay `RouteTransitionOrb.tsx` es controlado al 100% mediante estado React (`useState(isVisible)`), sin mutaciones directas al DOM ni llamadas a `classList.add`.
   - Se eliminaron todos los listeners de `beforeunload`.
   - Se mantiene la garantía de visibilidad mínima de 350 ms para evitar parpadeos y un fade-out suave de 200 ms.
3. **Nueva Regla Permanente de Pruebas:**
   - Todo stress test pre-deploy y post-deploy debe ejecutar peticiones a **rutas y fichas políticas distintas** (cold renders), no repetir 20 veces la misma URL.
   - Verificación automatizada con `scripts/stress-distinct-routes.mjs` y `scripts/verify-distinct-routes-e2e.mjs`.

---

## 5. Matriz de Verificación Post-Fix

- **Stress Test 20/20 Distintas:** 100% HTTP 200 (latencias 213ms - 436ms).
- **Playwright E2E Multi-Ficha:** 8 fichas políticas distintas navegadas consecutivamente sin error.
- **Kaiser:** Monto `$4.582.550` + Alerta `ALTA` + `Exceso de +33,7% sobre la base mensual oficial` intactos.
- **Sitemap:** 1126 URLs válidas.
