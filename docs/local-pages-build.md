# Build local de Pages y releases de datos

## Estado

El sitio publicado puede estar operativo aunque un checkout local limpio no
pueda ejecutar `npm run pages:build`. Los releases grandes no se versionan en
Git: se publican en R2 y el workflow de Pages los hidrata antes del build.

## Gastos operacionales

El build necesita estos dos archivos locales, que son generados y están
ignorados por Git:

- `transparencia-app/data/lake-subsets/gastos-camara.subset.json`
- `transparencia-app/data/lake-subsets/gastos-senado.subset.json`

No se debe crear un archivo vacío ni usar datos de muestra para producción.
Si faltan, el build se detiene con `STATIC_EXPENSE_RELEASE_EMPTY` para evitar
publicar una página que parezca completa pero no tenga rendiciones.

## Preparar un checkout limpio

1. Autenticar Wrangler en la terminal o proporcionar credenciales de datos al
   entorno. La sesión del panel de Cloudflare no autentica automáticamente la
   terminal.

   ```powershell
   npx wrangler login
   ```

2. Desde `transparencia-app`, hidratar sólo los releases estáticos necesarios:

   ```powershell
   npm run data:hydrate:static -- --required --required-files data/lake-subsets/gastos-camara.subset.json,data/lake-subsets/gastos-senado.subset.json
   ```

3. Ejecutar el build completo:

   ```powershell
   npm run pages:build
   ```

En CI, `pages-static-refresh.yml` obtiene el manifiesto de R2, hidrata los
inputs completos y valida checksums antes de publicar el artefacto `out/`.
Los subsets permanecen fuera del repositorio; sólo se suben como releases
autorizados a R2.

## Qué significa el bloqueo

Este error no indica que se hayan perdido los datos históricos ni que la
producción esté vacía. Indica que este checkout no contiene todavía la copia
local del release requerido para construir una nueva publicación. La solución
es recuperar el release validado desde R2 o ejecutar el ETL que lo publique;
no modificar los JSON a mano.
