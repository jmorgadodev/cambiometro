# ADR-0011: Staging lógico sobre la D1 autorizada

## Estado

Aceptada

## Fecha

2026-08-12

## Contexto

La cuenta Cloudflare alcanzó su límite de diez bases D1 y el usuario confirmó que no puede eliminar otra base. La única D1 disponible y autorizada para Cambiómetro es `transparencia-db`. El lanzamiento todavía necesita validar migraciones y el Worker nuevo sin arriesgar los datos vigentes.

## Decisión

- Las migraciones, fixtures y pruebas destructivas se ejecutan contra una D1 local aislada creada por Wrangler en CI.
- El Worker remoto `cambiometro-staging` se conecta a `transparencia-db` y `transparencia-public-data`, pero no recibe custom domain y solo se publica en `workers.dev`.
- El bundle web de staging es de solo lectura: las carpetas runtime `app` y `lib` no pueden contener sentencias D1 `INSERT`, `UPDATE`, `DELETE` o `REPLACE`. Una prueba automática bloquea su incorporación.
- Los ETL remotos son los únicos procesos autorizados para escribir. Materializan mediante `stage_entities`, `stage_records` y `stage_relations`, y solo promueven un lote validado.
- Antes de cada materialización o despliegue productivo se conserva un respaldo de D1 y el manifiesto vigente.
- R2 sigue usando el bucket existente. Los objetos de datos son inmutables y el manifiesto vigente se actualiza al final, por lo que staging puede leer sin modificarlo.

## Alternativas consideradas

### Crear otra D1 o eliminar una existente

No disponible por límite de cuenta y decisión explícita del usuario.

### Omitir staging

Rechazada. Se mantiene staging en dos niveles: D1 local aislada para migraciones y Worker remoto de solo lectura para comportamiento Cloudflare.

### Permitir escrituras desde el Worker de staging

Rechazada porque compartiría el riesgo con producción. Toda escritura permanece exclusivamente en los workflows ETL autenticados.

## Consecuencias

- No existe aislamiento físico remoto de datos entre ambos Workers.
- El riesgo se reduce con ausencia verificable de escrituras en el Worker web, staging local de D1, tablas `stage_*`, publicación inmutable y respaldos.
- Una prueba que requiera mutar datos debe ejecutarse localmente; nunca desde `cambiometro-staging`.
- El despliegue de staging continúa requiriendo los secrets de Cloudflare en GitHub.
