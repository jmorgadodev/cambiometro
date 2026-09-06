# Auditoría de cierre operativo — 2026-09-05

## Estado

La aplicación publicada responde correctamente. La base funcional de `main` es
`e00c71a`; el último refresco Pages fue generado por el release de Movimientos
y los merges posteriores actualizaron documentación y el Worker. Esta auditoría
reemplaza la fotografía anterior; no implica consultas masivas contra D1.

## Evidencia de producción

- Dominio: <https://cambiometro.impulsacv.cl>.
- Pages vigente: deployment `1048787c-778e-4ce4-b908-f8181bbdd2e2`.
- Preview verificable: <https://1048787c.cambiometro.pages.dev>.
- ETL de Movimientos: run
  `34007305715`, `success`.
- Refresco Pages automático: run `34007340270`, `success`.
- Guard de publicación ETL: run `34007340178`, `success`.
- Worker API promovido al 100%: versión
  `c5996d6b-a941-4c03-981c-37a81d9329ce`, workflow `34005110991`, bundle
  165,80 KiB (30,57 KiB gzip).
- Verificación final doble, navegador y crawl frío: run
  `34005184919`, `success`.
- Artefacto de evidencia final: <https://github.com/jmorgadodev/cambiometro/actions/runs/34005184919/artifacts/9981017237>.

La verificación final ejecutó 138/138 comprobaciones en cada pasada, con cero
fallos. El crawl recorrió 5.015 rutas: 5.015 respuestas 200, cero 404
inesperados, 5xx, 1102 o respuestas no válidas. Home respondió en 71 ms y los
listados principales quedaron bajo 700 ms; dos fichas aisladas fueron las
únicas rutas sobre ese umbral (890–925 ms). No hubo violaciones CSP. El falso fallo anterior se
debía al diagnóstico interno del iframe de Turnstile; el guard ahora ignora
únicamente ese mensaje conocido y mantiene fatales los errores de la página,
del Worker y de CSP.

## Movimientos

- `data/movimientos.json`: 82 registros publicados.
- Última publicación exitosa: `2026-09-06T02:46:13.765Z`.
- Último evento: `2026-09-02`.
- Checksum del payload ETL publicado: `4898ae7cad921d6880af2a53454104fa51769fc293a24ebc47a52726f07e397f`.
- Checksum del asset estático de Movimientos: `f427d95dbfcf9d412d3051ebebf14ff4f5318c342eb073745ced2119e74a67b8`.
- Alonso Velásquez: evento efectivo `2026-09-02`, aviso de Radio Paulina
  `2026-09-03`, referencia oficial MINVU; estado `en_confirmacion`.
- Patricio Löhr: evento efectivo `2026-09-01`, referencias Emol/ADN/BioBio;
  estado `en_confirmacion`.

Las fechas del evento, de publicación de la fuente y de ejecución del ETL se
muestran por separado. Ninguna señal periodística se promueve a `verificado`
sin el acto administrativo correspondiente.

## Fuentes y conexiones

`/api/v1/sources` devuelve 12/12 fuentes del catálogo como `connected`:
Cámara, ChileCompra, Contraloría, CPLT, DIPRES, INE, InfoLobby,
InfoProbidad, Ley 19.862, Senado, SERVEL y SINIM. No aparecen los alias
retirados `transparencia-activa` ni `personal-apoyo`.

El ETL conserva una advertencia separada: `gob.cl` sigue respondiendo HTTP 403
desde el runner de GitHub; el diagnóstico publicado ahora conserva
explícitamente `status: 403`. El fallback por `curl` quedó incorporado, pero el
bloqueo es de la red de origen y no se puede saltar sin autorización oficial.
El ETL no publica un snapshot vacío ni incompleto: conserva
el último snapshot válido y publica sólo si existe al menos una fuente oficial
usable. Ley Chile, Diario Oficial, Mindep y Prensa Presidencia sí respondieron
en la última ejecución.

## D1 y coste

Las rutas de transferencias y relaciones ancladas usan R2-first. La última
prueba D1 posterior al reinicio fue verde y no se ejecutó una materialización
manual ni un `COUNT(*)` global. El health check del Worker fue corregido para
leer sólo el puntero singleton de release, nunca la tabla completa. El endpoint
de registros sin alcance rechaza la petición antes de consultar D1
(`RECORD_SCOPE_REQUIRED`), evitando lecturas accidentales masivas.

## Advertencias no bloqueantes

1. Resolver o autorizar, si se requiere cobertura adicional, una vía oficial
   para que el runner pueda consultar
   `gob.cl` sin 403, o mantener explícitamente esa fuente como advertencia no
   bloqueante. Esto no impide el ETL porque hay cuatro fuentes oficiales
   disponibles en la última ejecución.
2. Si se incorpora un acto administrativo para Alonso o Löhr, ejecutar el ETL
   diario y verificar el cambio de `en_confirmacion` a `verificado`.

## Rollback

```bash
npm run pages:rollback -- 1048787c-778e-4ce4-b908-f8181bbdd2e2

npx wrangler rollback c5996d6b-a941-4c03-981c-37a81d9329ce \
  --name cambiometro-public-api
```
