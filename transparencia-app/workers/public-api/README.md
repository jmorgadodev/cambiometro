# `workers/public-api`

Worker independiente para `/api/*`. No importa datasets ni código de páginas:
consulta únicamente D1/R2 mediante bindings y mantiene límites, paginación y
`Cache-Control` en el borde.

Las rutas canónicas implementadas son health, search, sources, entities,
records, relations, crosses, alertas, político, directorio, funcionarios,
transferencias, export, health/data y OG. También conserva las respuestas
explícitas de disponibilidad para commercial keys/push y recibe reportes CSP
sin bloquear el navegador. Las consultas devuelven `503` si falta la tabla o
release requerido; nunca anuncian conteos de fixtures ni importan snapshots de
`app/`.

## Desarrollo

Desde `transparencia-app/`:

```bash
npx wrangler deploy --config workers/public-api/wrangler.jsonc --dry-run
npx wrangler dev --config workers/public-api/wrangler.jsonc --local
```

La configuración declara la ruta de producción
`cambiometro.impulsacv.cl/api/*`; `--dry-run` no la activa. El despliegue
promueve una versión del Worker y debe registrar el `version_id` que devuelve
Wrangler antes de cambiar Pages/DNS. Rollback exacto:

```bash
npx wrangler rollback <worker-version-id> --name cambiometro-public-api
```

Para habilitar el formulario en el Worker se debe configurar el secreto fuera
del repositorio, una sola vez por entorno:

```bash
npx wrangler secret put TURNSTILE_SECRET --config workers/public-api/wrangler.jsonc
```

Sin ese secreto el endpoint `/api/v1/requests` responde `403` y no escribe en
D1. No se debe sustituir por un valor de prueba ni agregarlo a `wrangler.jsonc`.

Este Worker no se promueve ni se enruta al dominio hasta que la proyección D1
de transferencias esté completa y el censo de contratos esté verde.
