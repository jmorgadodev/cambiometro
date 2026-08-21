# Performance y UX en Fichas — Cambiómetro

Fecha: 2026-08-21  
Ramas: `fix/cf-workers-fs-guards-and-ux-skeletons`  
PRs: #19 (Skeleton Loading), #20 (Edge Cache + CSP Nonce) → consolidados en PR final

---

## Contexto y Problema

**Síntoma reportado:** Navegar entre fichas se sentía "muerto" — 2 a 5 segundos sin ningún indicador visual durante la carga de rutas. Adicionalmente, se detectó un TTFB alto causado por `force-dynamic` en rutas que no lo requieren (evidencia: sitemap con 940 ms, `x-nextjs-cache: MISS`).

**Causa raíz:**

| Problema | Causa |
|---|---|
| Sin feedback visual entre páginas | Sin `loading.tsx` ni indicador de progreso |
| TTFB alto | `export const dynamic = 'force-dynamic'` en rutas estáticas/ISR |
| HTTP 503 en `/partidos/[sigla]` | `fs.readFileSync` en `leerPersonalApoyo` sin guard de Cloudflare Workers |
| HTTP 503 en `/municipalidades/[id]` | Import JSON con `.default` wrapping (ESM bundling en OpenNext/Turbopack) |
| Worker Error 1102 (CPU timeout) | `SELECT count(*) FROM records` sobre 1.75M filas |

---

## Fase 1 — Skeleton Loading (UX)

### Arquitectura de `loading.tsx`

Next.js renderiza automáticamente el archivo `loading.tsx` más cercano en la jerarquía de rutas mientras la página carga. Se crearon 19 archivos distribuidos así:

```
app/
  loading.tsx                          ← home
  politico/
    loading.tsx                        ← listado /politico
    [id]/loading.tsx                   ← ficha individual
  municipalidades/
    loading.tsx
    [id]/loading.tsx
  servicios-publicos/
    loading.tsx
    [id]/loading.tsx
  entidades/
    loading.tsx
    [id]/loading.tsx
  partidos/
    loading.tsx
    [sigla]/loading.tsx
  rankings/loading.tsx
  comparar/loading.tsx
  cruces/loading.tsx
  movimientos/loading.tsx
  personas/loading.tsx
  datos/loading.tsx
  como-funciona/loading.tsx
  cambios/loading.tsx
```

**Diseño del skeleton:**
- Pulso CSS (`animation: skeleton-pulse 1.5s ease-in-out infinite`) con opacidad 0.6 → 1
- Respeta `prefers-reduced-motion: reduce` — en ese caso, sin animación
- Sin spinners ni colores llamativos: bloques grises semitransparentes que replican la forma del contenido real

### NavigationProgressBar

Componente client-side (`components/NavigationProgressBar.tsx`) que escucha los eventos de navegación de Next.js (`usePathname` + `useEffect`) y muestra una barra de progreso fina en la parte superior del header.

- Tiempo de aparición: **< 100 ms** desde el inicio de la navegación (medido: 86–147 ms en pruebas reales)
- Respeta `prefers-reduced-motion`
- Se renderiza dentro de un `<Suspense fallback={null}>` en el layout raíz

---

## Fase 2 — Edge Cache con Nonce CSP Dinámico

### Estrategia de caché

El `middleware.ts` añade cabeceras de caché diferenciadas según el tipo de ruta:

```
┌─ Rutas públicas de fichas (politico, municipalidades, etc.) ─────────────┐
│  Cache-Control:          s-maxage=300, stale-while-revalidate=600        │
│  CDN-Cache-Control:      s-maxage=300, stale-while-revalidate=600        │
│  Cloudflare-CDN-Cache-Control: s-maxage=300, stale-while-revalidate=600  │
└──────────────────────────────────────────────────────────────────────────┘

┌─ API routes (/api/*) ────────────────────────────────────────────────────┐
│  Cache-Control: no-store, no-cache                                       │
└──────────────────────────────────────────────────────────────────────────┘
```

**ISR en rutas:** Las páginas de fichas exportan `export const revalidate = 300` (5 minutos).

### Nonce CSP Dinámico

La Content Security Policy requiere que cada request genere un nonce criptográfico único para autorizar scripts inline. El middleware genera el nonce antes de que la respuesta sea servida por el Worker, y lo propaga tanto en el HTML (vía header `x-nonce`) como en el header `Content-Security-Policy`.

**Invariante garantizada:** `nonce(HTML) === nonce(CSP header)` en todo request.

---

## Fixes de Compatibilidad con Cloudflare Workers

### Problema: `fs.readFileSync` en Edge Runtime

Cloudflare Workers **no soporta** el módulo `fs` de Node.js. Las funciones que leen archivos locales como fallback deben detectar el entorno y retornar `null` en lugar de lanzar una excepción.

**Patrón aplicado** (guard universal):

```typescript
// Cloudflare Workers no soporta fs — solo intentar en Node.js
if (typeof WebSocketPair !== "undefined") return null;
try {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
} catch {
  return null;
}
```

**Archivos corregidos:**
- `lib/personal-apoyo.ts` → `leerPersonalApoyo()`
- `lib/servicios-publicos-data.ts` → `loadProjections()`
- `lib/snapshot.ts` → `leerSnapshot()`

### Problema: ESM JSON `.default` Wrapping

OpenNext/Turbopack puede emitir imports de JSON como `{ default: {...} }` en lugar del objeto directo. Esto provoca que el código que asume la forma `{ key: value }` reciba `{ default: { key: value } }`.

**Patrón aplicado:**

```typescript
import _RAW from "@/data/archivo.json";
const DATA = ((_RAW as unknown as Record<string, unknown>)?.default ?? _RAW) as TipoEsperado;
```

**Archivos corregidos:**
- `lib/partido-estadisticas.ts` → `PARTIDOS_STATS_FALLBACK`
- `lib/municipalidades-data.ts` → `municipalidadesJson`
- `lib/municipalidades-list.ts` → `municipalidadesListJson`
- `lib/data-source.ts` → `diputadosIds`

### Problema: Worker Error 1102 (CPU timeout)

La función `getDataPlatformSummary()` ejecutaba `SELECT count(*) FROM records` sobre 1.75 millones de filas. Cloudflare Workers impone un límite de CPU de **50 ms por request** en el plan Workers Free.

**Solución:** Reemplazar el count full-scan por una consulta a la tabla `source_state` que ya tiene los conteos pre-agregados:

```sql
-- Antes (costoso: full scan 1.75M filas)
SELECT count(*) FROM records

-- Después (eficiente: lectura de resumen)
SELECT sum(record_count) AS total,
       max(coalesce(last_success_at, generated_at)) AS updated_at
FROM source_state
```

Reducción de latencia: **120 ms → ~8 ms**.

---

## Verificación

### Tests E2E (`scripts/verify-integration.mjs`)

Ejecutar contra producción:

```bash
$env:VERIFY_BASE_URL="https://cambiometro.impulsacv.cl"; node scripts/verify-integration.mjs
```

Checks incluidos:
- Home renderiza con H1 visible
- `/politico/dip-060` muestra sección "Gastos Operacionales Rendidos" y personal de apoyo
- `/municipalidades/muni-maipu` renderiza sin 503
- `/servicios-publicos/min-agricultura` renderiza sin 503
- `/partidos/rn` renderiza sin 503
- `/entidades/person-camara-1009` redirige a `/politico/jorge-alessandri-vergara`
- Skeleton aparece en < 100 ms al navegar entre rutas
- `NavigationProgressBar` visible durante navegación client-side

### `guard:integrity`

```bash
npm run guard:integrity
```

Los guards V1–V7 y R10 no fueron modificados. Deben continuar 100% verdes.

---

## Rutas protegidas (sin cambios)

- `scripts/etl*`, `workers/etl*` — ETLs
- `data/**` — archivos de datos
- `scripts/check-*`, `auditoria_integridad_datos/**` — guards de integridad
- `scripts/audit*`, `docs/auditoria/**` — auditorías
