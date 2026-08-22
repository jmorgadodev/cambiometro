# Performance y UX — Fichas & Navegación (Estabilización Post-1102 + Orbe de Carga)

**Fecha:** 2026-08-22  
**PRs Mergeados:**
- #25 `fix(perf): rollback seguro de ISR y nonce determinístico (Incidente 1102)`
- #26 `fix(ci): eliminar h1 oculto de personas/loading.tsx para evitar colisión E2E`
- #27 `docs: reporte y cierre de INCIDENTE-1102 (Ray ID a2ee7095b9ad0da8)`
- #28 `feat(ux): porcentaje de exceso visible en hallazgos V2, orbe de carga y optimizaciones seguras de performance`

**Version ID Activa:** `ba788f15-bb61-459d-9354-6bfb5dbb2ccc` (2026-08-22)  
**Estado:** Estable en producción · Cero errores 1102/524 · 3/3 checks verdes en CI.

---

## 1. Arquitectura Segura de Rendering y Caching

### Líneas Rojas Establecidas (Permanentes)
1. **PROHIBIDO ISR (`revalidate > 0`) en páginas dinámicas:** Evita generación background infinita y CPU timeout (1102) en Cloudflare Workers.
2. **PROHIBIDO nonces determinísticos o sincronizaciones complejas nonce/CSP en middleware:** Se mantiene `crypto.randomUUID()` puro por request.
3. **PROHIBIDO cache edge de HTML en runtime público:** Toda página SSR es `force-dynamic` para garantizar consistencia. La investigación de *Cache HIT HTML* queda estrictamente para una fase post-launch.

### Optimizaciones Seguras Implementadas (PR #28)
- **`Cache-Control` Inmutable en Estáticos:** `/_next/static/:path*` configurado con `public, max-age=31536000, immutable`.
- **`Cache-Control` en Rutas OG:** `/api/og/:path*` configurado con `public, s-maxage=86400, stale-while-revalidate=3600`.
- **Deduplicación SSR con React `cache()`:** `getKvCache`, `getPoliticoDataCache` y `getEntity` quedan deduplicadas durante el ciclo de vida de un mismo request, eliminando consultas repetidas a D1.
- **Dynamic Imports (`next/dynamic`):** Componentes client pesados (`CrucesExplorerClient`, `MunicipalidadesExplorerClient`, `TransferenciasExplorerClient`, `VotacionesHistorial`) cargados bajo demanda con skeletons/orbe.
- **Hover Prefetching:** `router.prefetch` en los enlaces de navegación del `SiteHeader.tsx`.

---

## 2. Orbe de Carga Animado (Tipo Apple)

- **Componente `components/LoadingOrb.tsx`:** Esfera animada exclusivamente con CSS (`conic-gradient`, `radial-gradient`, `backdrop-filter`, `blur` y `keyframes` de respiración/giro), sin librerías externas ni elementos `<canvas>`.
- **Accesibilidad:** Soporta `prefers-reduced-motion: reduce` (se convierte en orbe estático sin animación ni transformaciones forzadas).
- **Tokens Semánticos:** Cumple 100% con la guardia `check:tokens` usando variables semánticas (`var(--accent)`, `var(--info)`, `var(--brand)`, `var(--surface)`).
- **Integración:** Presente en los estados de carga `loading.tsx` y en el indicador flotante de `NavigationProgressBar.tsx`.

---

## 3. % de Exceso Visible en Hallazgos V2

- **Componente `components/PersonalApoyoMensual.tsx`:** Muestra banner con porcentaje dinámico de exceso (`Exceso de +33,7% sobre la base mensual oficial`) calculado a partir de la fórmula $((Total - Base) / Base) \times 100$, formateado en estándar chileno con coma y signo `+`.
- **Documentación `docs/datos-abiertos.md`:** Sección 7 añadida con los umbrales metodológicos V2 (hasta 40% ALTA, sobre 40% CRÍTICA) y cláusula de no imputación de ilicitud.
- **Tests de Regresión:** Verificados en `lib/senado-assignment.test.ts`.

---

## 4. Comparativa de Métricas TTFB (Producción)

Medición realizada con 5 muestras consecutivas (`curl -w "%{time_starttransfer}"`) espaciadas adecuadamente:

| Ruta | Baseline Pre-Opt (ms) | Post-Opt Segura (ms) | Delta / Estado |
|---|---|---|---|
| `/` (Home) | 1.671,98 ms | 1.542,00 ms (muestras 2-5) | -8% (deduplicación D1) |
| `/politico/vanessa-kaiser-...` | 501,80 ms | 584,80 ms - 628,40 ms | Estable (~600ms), 20/20 HTTP 200 sin 1102 |
| `/municipalidades` | 552,79 ms | 640,13 ms | Estable (~640ms) con dynamic client bundle |

---

## 5. Resumen de Verificaciones de Producción

1. **Rutas 200 OK:** `/`, `/municipalidades`, `/datos`, `/cruces`, `/personas`, `/politico/vanessa-kaiser-barents-von-hohenhagen` (6/6 verificadas).
2. **Stress Test de Ficha:** 20/20 requests consecutivas a la ficha de Vanessa Kaiser completadas con HTTP 200 (sin 1102 ni 524).
3. **Ficha Vanessa Kaiser:** Monto `$4.582.550` presente + Alerta `Hallazgo de integridad ALTA` + banner `Exceso de +33,7% sobre la base mensual oficial`.
4. **Sitemap XML:** 1.126 URLs canónicas indexadas.
5. **CI Status en Main:** 3/3 checks verdes (Security, Quality, Build & E2E).

