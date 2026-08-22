# INCIDENTE 1102 — ISR/Edge Nonce → CPU Timeout Worker

**Fecha:** 2026-08-22  
**Ray ID:** `a2ee7095b9ad0da8`  
**Severidad:** ALTA  
**Estado:** RESUELTO  

---

## Síntoma

- **Home `/`**: cargaba correctamente (200 OK).  
- **Navegación a fichas `/politico/[id]`**: caía con error Cloudflare **1102 — Worker exceeded CPU time limit**.  
- Las rutas `/municipalidades`, `/datos`, `/cruces`, `/autoridades`, `/personas` también afectadas intermitentemente.  
- Patrón: primer request OK, requests sucesivos desde cache HIT → error 1102.

---

## Causa Raíz

Dos cambios de performance mergeados a `main` en la sesión anterior introdujeron incompatibilidad fatal en CF Workers:

### 1. `perf: ISR/edge cache compatible con nonce CSP` (PR #21 — `7fcb29a`)
- Introdujo `generateNonce()` **determinístico** por URL + bucket 5 minutos
- Objetivo: que el nonce del HTML cacheado en ISR coincida con el del header CSP
- **Problema**: la función usa `btoa()` sobre una cadena que incluye `pathname:search:bucket`. En el runtime de CF Workers edge, `btoa()` con strings no-ASCII puede generar nonces inválidos o consumo excesivo de CPU en ciertas rutas.

### 2. `perf: revalidate 300 en fichas para ISR HIT` (PR #22 — `51b71bb`)
- Cambió `export const dynamic = "force-dynamic"` → `export const revalidate = 300` en páginas de fichas
- **Problema**: ISR en CF Workers (Next.js on Cloudflare) tiene comportamiento diferente al Node.js server: el `generateStaticParams` fallback en D1 durante el build generaba páginas pre-renderizadas con nonce estático, que luego chocaba con el nonce re-calculado en el middleware al servir desde cache.
- CPU spike causado por re-ejecución de lógica pesada de D1 en cada HIT de cache.

### Combinación letal:
El nonce determinístico + ISR cache HIT hacía que el Worker intentara re-validar datos de D1 en cada request de cache, consumiendo >10ms de CPU edge por request, superando el límite de Cloudflare Workers en fichas con mucha carga.

---

## Cronología

| Hora (UTC-4) | Evento |
|---|---|
| ~20:50 | Deploy con PR #21 y #22 activos |
| ~21:24 | Primer reporte de 1102 en fichas (Ray ID `a2ee7095b9ad0da8`) |
| ~21:45 | Último deploy fallido pre-rollback |
| ~22:37 | **Rollback a `fe02c600`** via `npx wrangler rollback` |
| ~23:06 | Merge PR #25 (revert selectivo a main) |
| ~23:13 | PR #26: fix h1 en personas/loading para CI E2E |
| ~23:18 | **CI main 3/3 VERDE** (Security, Quality, Build & E2E) |
| ~23:27 | **Redeploy exitoso a Cloudflare Workers** |

---

## Rollback y Redeploy Final

- **Rollback inicial:** `fe02c600-412c-4d8d-bc58-adb8877bfe03` (2026-08-22T02:37:32.950Z)
- **Versión final desplegada:** `6d95364e-93b2-45b7-a0d9-9abd06af5718` (desde main limpio `ef29b4e`)

---

## Commits revertidos (PR #25 & PR #26)

| SHA | Descripción | Acción |
|---|---|---|
| `51b71bb` | Merge PR #22: perf revalidate 300 en fichas | REVERTIDO |
| `d14ed94` | perf: revalidate 300 en fichas para ISR HIT | REVERTIDO (via revert de merge) |
| `7fcb29a` | Merge PR #21: ISR/edge cache + nonce determinístico | REVERTIDO |
| `a5de2e8` | perf: ISR/edge cache compatible con nonce CSP | REVERTIDO (via revert de merge) |
| `8006ae9` | fix(perf): ISR build fallback for missing D1 tables | REVERTIDO (via revert de merge) |

### Commits conservados

| SHA | Descripción | Motivo |
|---|---|---|
| `96523c5` | Merge PR #20: skeleton loading UX | CONSERVADO — no causa CPU issues |
| `84bf8e0` | feat(ux): skeleton loading en fichas | CONSERVADO |
| `04c60d1` | fix: guard fs en personal-apoyo y ESM default | CONSERVADO |
| `29aba5b` | fix: integra cambios sesion anterior | CONSERVADO |

---

## Verificación Exhaustiva Post-Redeploy (Versión 6d95364e)

1. **HTTP 200 en rutas clave:**
   - `/` → 200 OK
   - `/municipalidades` → 200 OK
   - `/datos` → 200 OK
   - `/cruces` → 200 OK
   - `/personas` → 200 OK
   - `/politico/sen-038` → 200 OK
   - `/politico/vanessa-kaiser-barents-von-hohenhagen` → 200 OK

2. **Test de Resistencia (20 requests seguidas a ficha):**
   - 20/20 requests consecutivas a `/politico/vanessa-kaiser-barents-von-hohenhagen` respondieron **200 OK** sin ningún error 1102 (CPU timeout erradicado).

3. **Verificación de Datos y Avisos:**
   - Monto Kaiser: `$4.582.550` visible en la ficha.
   - Aviso de integridad: **Hallazgo de integridad ALTA** (julio 2026) presente.

4. **UX & SEO:**
   - Skeleton loading presente y estilizado.
   - Sitemap XML: **1126 URLs** indexables activas (HTTP 200).

---

## Regla permanente establecida

> **NINGUN deploy si el push a main no esta completamente verde.**

### Regla especifica — ISR en CF Workers:
- **NO usar `export const revalidate = N`** en paginas con acceso a D1 (fichas de politicos, municipalidades, servicios publicos) mientras estemos en CF Workers runtime.
- **NO usar nonce deterministico** para ISR. El nonce debe ser siempre `btoa(crypto.randomUUID())`.
- El cache de HTML en CF Workers edge con ISR es incompatible con el modelo de nonce-por-request del middleware Next.js actual.
- Si se quiere ISR + CSP: se requiere arquitectura de cache separada (KV store para nonces, o eliminar nonce del inline script).

---

## Investigacion pendiente (post-launch)

- **Cache HIT rate bajo**: el uso de `force-dynamic` elimina ISR. Para recuperar performance, investigar:
  1. Cache en KV de Cloudflare a nivel de pagina completa
  2. Separar el nonce del script inline (moverlo a archivo externo servido con hash CSP)
  3. Evaluar `stale-while-revalidate` a nivel de CDN (no Worker)
- Esta investigacion queda en pausa hasta estabilizacion post-launch.

---

## Tarea #8 (ETL camara)

**EN PAUSA** — No tocar hasta que el sistema este estabilizado post-launch.

---

*Documento finalizado: 2026-08-22*

