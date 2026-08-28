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

## Actualización automática de las tarjetas de fuentes

El flujo operativo es:

1. Cada ETL se ejecuta según su calendario y publica en R2 el release validado
   (y en D1 los metadatos consultables cuando corresponde).
2. Un `workflow_run` exitoso de ese ETL activa
   `.github/workflows/pages-static-refresh.yml`.
3. Pages descarga el catálogo y los inputs con checksum desde R2, normaliza
   Movimientos y ejecuta `npm run data:health` antes de construir. Así el estado,
   fecha y conteos brutos de salud se calculan con exactamente el snapshot que
   se va a publicar.
4. El build y sus guardias deben pasar antes de generar el artefacto `out/`.
   Si falla la descarga, checksum, integridad o build, no se publica una
   versión nueva y queda vigente la última publicación válida.

Las tarjetas del inicio muestran el **conteo canónico** de cada fuente. Ese
conteo es distinto del conteo bruto del catálogo: por ejemplo, puede excluir
duplicados, períodos fuera del corte editorial o registros que no forman parte
del universo publicado. Por eso no se sustituye automáticamente por el
conteo bruto sólo porque cambió un release. El estado y la fecha sí se
regeneran automáticamente; para cambiar un conteo canónico debe publicarse
una nueva metadata de release con esa regla explícita y actualizar sus
invariantes, nunca editar la tarjeta a mano.

No es necesario copiar JSON generados ni ejecutar el ETL para cada cambio de
diseño. Los cambios de código pasan por el refresco de UI; los cambios de datos
disparan este refresco estático y ambos usan los mismos gates antes de
publicar.

## SEO estático

Cada página indexable debe declarar su propio rel="canonical" con la URL
canónica y barra final. El build genera sitemap.xml usando sólo páginas
canónicas, excluye alias con redirección 301 y no inventa lastmod igual para
todo el sitio. robots.txt mantiene el sitemap público y bloquea /api/ y
/_next/ sin bloquear las páginas.

El guard npm run check:seo valida títulos, descripciones, canonicals, ausencia
de noindex inesperado y correspondencia exacta entre HTML y sitemap. Después
de publicar un cambio, se debe enviar o volver a validar
https://cambiometro.impulsacv.cl/sitemap.xml en Google Search Console y usar
Inspección de URL para las páginas prioritarias. El sitemap ayuda a descubrir
URLs, pero no garantiza su indexación.

## Qué significa el bloqueo

Este error no indica que se hayan perdido los datos históricos ni que la
producción esté vacía. Indica que este checkout no contiene todavía la copia
local del release requerido para construir una nueva publicación. La solución
es recuperar el release validado desde R2 o ejecutar el ETL que lo publique;
no modificar los JSON a mano.
