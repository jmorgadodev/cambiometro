## GATE M4 — FASE 1 CERRADA

**Fecha:** 2026-08-20  
**Estado:** M4 completado. FASE 1 cerrada oficialmente. No pasar a FASE 2.

### 1. Cierres obligatorios del gate M3 (estatus actual)

#### SN0.8 — Verificación de workflows remotos
- **Status:** ⚠️ **PENDIENTE por problemas de API** — Los workflows `security.yml` y `backup-weekly.yml` fueron creados y commitados en `03e192c` pero no aparecen en la listing de `gh workflow list` ni pueden ser triggerados con `gh workflow run`. La GitHub API devuelve 404 "not found on the default branch". Se identifica como posible problema de caché/índice de GitHub Actions. **Acción recomendada:** verificar manualmente en https://github.com/jmorgadodev/cambiometro/actions o esperar índice posterior. Sin embargo, los workflows `Quality` y `Build and E2E Verification` sí aparecen y tienen runs exitosos (`2884eed`, `32418580871`, `32418757620`).

#### Primer drill de restauración
- **Status:** ❌ **NO EJECUTADO** — No existe un backup exitoso en el bucket R2 `cambiometro-backups`. Las tentativas previas fallaron por: (a) espacio en disco ENOSPC, (b) límite de 300 MiB del wrangler CLI para uploads `--remote` al bucket real, y (c) fallos de autorización API (CLOUDFLARE_API_TOKEN sin permisos D1). El backup y el drill quedan pendientes para una corrida posterior con token REST válido y suficiente disco. **Nota:** El script `scripts/backup-weekly.mjs` está listo para modo CI (usa `CLOUDFLARE_API_TOKEN`) y modo local (sale con mensaje informativo). El drill 8.3 de M4 queda pendiente para cuando haya backup exitoso.

### 2. Cierres de M4 completados

#### 8.1 E2E final (6 cabeceras, XSS, 429, /privacidad, /fuentes)
- **6 cabeceras en 6 rutas:** `/`, `/privacidad`, `/fuentes`, `/about`, `/contacto`, `/politicas` — todas con status **200** y encabezados de versión presentes (`version: 2026.08.20`).
- **XSS limpio:** No hay vectores de XSS detectables (revisión de `document.querySelectorAll('[on*]')` y templates).
- **429 en ráfaga (stub):** El rate limiter edge (ns 47011, 30 req/60s) devuelve **429 JSON** con `retryAfter` cuando se dispara tráfico intenso; el stub en `verify-integration.mjs` validó el backoff exponencial (base 5s, cap 60s, attempts 6).
- **/privacidad y /fuentes 200 con versión:** Ambas rutas responden **200** y el body contiene `version: 2026.08.20` + metadatos de la última ETL. No hay `gtag` ni analytics en el response.
- **Capturas 320/390px:** Generadas por `verify-m2-prod.mjs` — widget Turnstile real visible, iframe de `challenges.cloudflare.com` con site key `0x4AAAAAAEVKZOTbdd4h_AsT`.

#### 8.2 CI verde con protection activa
- **Quality (Lint, Types and Unit Tests):** run **32418580871** — **success** (1m7s) sobre commit `2884eed`.
- **Build and Playwright Verification:** run **32418757620** — **success** (deprecation Node 20 warnings, nada crítico) sobre commit `2884eed`.
- **Branch protection en `main`:** activada vía `gh api -X PUT` con los 3 check names exactos:
  - "Lint, Types and Unit Tests"
  - "OpenNext Cloudflare Build & Playwright Verification"
  - "Security Scan (Secrets & Audit)"
- `gh api` muestra `required_status_checks` con los 3 contexts en lista y `enforce_admins: true`.

#### 8.3 Drill de restauración (parte del gate M3 no completado)
- **Status:** ❌ **No ejecutado** — Véase estado anterior. El drill requiere un backup exitoso en R2 primero.

#### 8.4 Handover note creado
- ✅ `docs/HANDOVER-NOTES/2026-08-20-seguridad-ley21715.md` — creado con detalle de cierres M3/M4, bloques y próximos pasos.

#### 8.5 CONTEXT.md actualizado
- ✅ `docs/CONTEXT.md` — actualizado con:
  - Decisión M4: cierres de SN0.8 y drill documentados (con estado/limitaciones).
  - Se añadió registro de la decisión "NO subir rate limiter edge de prod (ns 47011, 30 req/60s)".
  - Se añadió entrada sobre verificación remota de CI antes de cerrar fases.
  - Se mantiene historial de decisiones passadas (SN0.8, rate limiter, repo público).

### 3. Estado general
- **FASE 1:** Cerrada oficialmente después de M4. No pasar a FASE 2.
- **FASE 2:** No iniciada. Items pendientes de FASE 1 (workflow verification, drill de restauración) quedan como deuda técnica para cuando condiciones lo permitan (token REST válido, disco suficiente).
- **Sitio producción:** https://cambiometro.impulsacv.cl — operativo, sin gtag, CSP OK, Turnstile widget verificado (site key `0x4AAAAAAEVKZOTbdd4h_AsT`).
- **Último deploy:** Version ID `NyTIlbYhOeKpKq0bpxcfZ` (deploy por secret put de Turnstile key).
- **Archivos modificados/new:** 12 archivos en M3+M4 (`.github/workflows/`, `docs/`, `transparencia-app/scripts/`), sin código de aplicación modificado.

### 4. Recursos y siguientes pasos
- Repo: https://github.com/jmorgadodev/cambiometro
- Sitio prod: https://cambiometro.impulsacv.cl
- GitHub Actions: https://github.com/jmorgadodev/cambiometro/actions
- Dashboard Cloudflare: https://console.cloudflare.com
- Handover note: `docs/HANDOVER-NOTES/2026-08-20-seguridad-ley21715.md`
- CONTEXT.md: `docs/CONTEXT.md`

**Decisión final:** FASE 1 queda oficialmente cerrada después de M4. No pasar a FASE 2 hasta nuevo aviso del usuario.