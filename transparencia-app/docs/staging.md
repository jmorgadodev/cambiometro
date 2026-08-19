# Guía de Staging — Transparencia ImpulsaCV

Guía técnica para validar el entorno de staging antes de cada release a producción: deploy, health checks, suite de tests e integridad del snapshot de base de datos.

---

## 1. Propósito del Entorno

El entorno de staging replica el runtime de producción (OpenNext sobre Cloudflare Workers, D1, R2) con datos de prueba o un snapshot reciente, y es el último punto de control antes de publicar cambios. Toda verificación aquí debe repetirse en producción con el mismo procedimiento.

---

## 2. Deploy y Health Check

1. Desplegar la aplicación al entorno de staging (preview de Cloudflare Workers/OpenNext).
2. Verificar el health endpoint:

```bash
curl <URL_STAGING>/api/v1/health/data
```

Respuesta esperada:

```json
{"status":"healthy","latestRun":{"status":"success"}}
```

3. Verificar una entidad representativa con identificador público canónico (por ejemplo `person-camara-1077`), confirmando que la fuente oficial está presente en la respuesta.
4. Verificar el estado de cada fuente en `latestRun.sources`; un estado `partial` en una fuente esperada debe investigarse antes del go/no-go.

---

## 3. Suite de Tests

**Comando:** `npm test` (ejecuta typecheck + check de tokens + vitest)

| Métrica | Esperado |
|---------|----------|
| TypeScript (`tsc --noEmit`) | 0 errores |
| Archivos de test (vitest) | todos PASS |
| Tests unitarios | todos PASS |

**Notas sobre stderr esperado (no son errores):**
- `D1 Database not bound` — warning esperado en Node local; los tests usan mocks.
- Mensajes de deduplicación (`[senado] registros duplicados...`) — comportamiento correcto frente a paginación inestable del API de origen.

**Suites clave:** `api-v1` (contratos API canónica), `security-hardening`, `d1-materialization`, `cplt-connectors`, `data-lake-plan`, `municipalidades`.

---

## 4. Integridad del Snapshot de Base de Datos

Cada snapshot de D1 se respalda antes de materializar cambios destructivos:

1. Generar el snapshot desde el panel de Cloudflare (D1 → Export) o CLI.
2. Registrar y verificar el hash del archivo:

```bash
Get-FileHash <ARCHIVO>.sql -Algorithm SHA256   # PowerShell
sha256sum <ARCHIVO>.sql                          # Linux/macOS
```

3. Almacenar el hash junto al snapshot (fuera del repositorio) para verificación futura.

---

## 5. Checklist Go/No-Go

| Validación | Criterio de aprobación |
|-----------|------------------------|
| TypeScript + Vitest | todos PASS |
| Catálogo de comunas | `npm run data:communes:check` → `{"status":"current",...}` |
| Health staging | `healthy` con `latestRun.status=success` |
| Entidad representativa | 200 con fuente oficial verificada |
| Municipios nuevos | slugs e IDs canónicos resueltos (routing `app/api/v1/municipalidades/[id]/route.ts`) |
| E2E en viewports | 390px, 768px y desktop sin regresiones |
| Backup D1 | SHA-256 registrado y consistente |

**Regla:** no avanzar a producción si alguna validación marcada como requerida queda pendiente o en estado parcial sin causa documentada.