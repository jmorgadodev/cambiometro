# Checklist de verificación manual — 2FA y cero secrets

Fecha de última ejecución: **2026-08-20**

## 1. Autenticación de dos factores (2FA)

### GitHub (jmorgadodev)
- [x] 2FA activada en GitHub (Settings → Password and authentication)
- [x] Sesiones de máquinas nuevas requieren confirmación por dispositivo
- [x] El token OAuth local se rotó o se confirma vigente (nunca commitear)

### Cloudflare (koooke.ai@gmail.com)
- [x] 2FA activada en el panel de Cloudflare (My Profile → Authentication)
- [x] Acceso a la cuenta solo vía OAuth del CLI (`wrangler whoami` muestra el correo correcto)
- [x] No se comparten credenciales por chat; los secrets viven en el dashboard de GitHub Actions y en `.dev.vars` local (gitignored)

## 2. Cero secrets en el repositorio

- [x] `.dev.vars` está en `.gitignore` (verificado en `transparencia-app/.gitignore`)
- [x] `scripts/check-no-private-assets.mjs` rechaza patrones `backups/`, `clients/`, `Bearer`, etc. (corre en CI Quality)
- [x] `scripts/check-no-ai-traces.mjs` corre en CI Quality
- [x] `npm audit --omit=dev --audit-level=high` corre en build-e2e.yml y en el nuevo security.yml
- [x] Gitleaks escanea secrets en cada push a `main` (workflow `Security Scan (Secrets & Audit)`)
- [x] Branch protection en `main`: exige verde de Quality, Build/E2E y Security antes de merge

## 3. Secrets de CI (GitHub Actions)

- [x] `WRANGLER_TOKEN` (token API de Cloudflare con permisos de Workers y R2)
- [x] `CLOUDFLARE_ACCOUNT_ID`
- [x] `CLOUDFLARE_DATA_API_TOKEN` (ETL)
- [x] `TURNSTILE_SECRET_KEY` (verificación server-side del formulario Ley 21.715)

> Regla: si algún secret falta, detenerse y pedir su creación manual. Nunca recibir valores por chat.