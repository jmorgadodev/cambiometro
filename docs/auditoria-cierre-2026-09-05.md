# Auditoría de cierre operativo — 2026-09-05

## Estado

La aplicación publicada responde correctamente. El checkout `main` actual es
`5d8abda`; el deployment Pages de datos fue construido desde `95bfbb8` y el
merge posterior sólo actualizó documentación. Esta auditoría reemplaza la
fotografía anterior; no implica consultas masivas contra D1.

## Evidencia de producción

- Dominio: <https://cambiometro.impulsacv.cl>.
- Pages vigente: deployment `271c27ce-a73e-4e81-9d56-d01575fd2ce5`.
- Preview verificable: <https://271c27ce.cambiometro.pages.dev>.
- ETL de Movimientos: run
  `34003987310`, `success`.
- Refresco Pages automático: run `34004020098`, `success`.
- Verificación doble, navegador y crawl frío anterior: run
  `34001841994`, `success`.
- Artefacto de evidencia anterior: <https://github.com/jmorgadodev/cambiometro/actions/runs/34001841994/artifacts/9979998361>.

La verificación final no reportó 404 inesperados, 5xx, 1102 ni violaciones
CSP. El crawl y la doble pasada fueron exitosos. El falso fallo anterior se
debía al diagnóstico interno del iframe de Turnstile; el guard ahora ignora
únicamente ese mensaje conocido y mantiene fatales los errores de la página,
del Worker y de CSP.

## Movimientos

- `data/movimientos.json`: 82 registros publicados.
- Última publicación exitosa: `2026-09-06T01:29:08.244Z`.
- Último evento: `2026-09-02`.
- Checksum del payload ETL publicado: `4274c964746883dda509eda168595a07fbbd52e210985aa37c783b49f3d9dc02`.
- Checksum del asset estático de Movimientos: `9b6933d0ceeed7cd168a7d5e7512c9a9c1681e27969586c28d094a4e58067692`.
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
desde el runner de GitHub; el fallback por `curl` quedó incorporado, pero el
bloqueo es de la red de origen y no se puede saltar sin autorización oficial.
El ETL no publica un snapshot vacío ni incompleto: conserva
el último snapshot válido y publica sólo si existe al menos una fuente oficial
usable. Ley Chile, Diario Oficial, Mindep y Prensa Presidencia sí respondieron
en la última ejecución.

## D1 y coste

Las rutas de transferencias y relaciones ancladas usan R2-first. La última
prueba D1 posterior al reinicio fue verde y no se ejecutó una materialización
manual ni un `COUNT(*)` global. El endpoint de registros sin alcance rechaza la
petición antes de consultar D1 (`RECORD_SCOPE_REQUIRED`), evitando lecturas
accidentales masivas.

## Pendiente real

1. Resolver o autorizar una vía oficial para que el runner pueda consultar
   `gob.cl` sin 403, o mantener explícitamente esa fuente como advertencia no
   bloqueante. Esto no impide el ETL porque hay cuatro fuentes oficiales
   disponibles en la última ejecución.
2. Si se incorpora un acto administrativo para Alonso o Löhr, ejecutar el ETL
   diario y verificar el cambio de `en_confirmacion` a `verificado`.

## Rollback

```bash
npm run pages:rollback -- 271c27ce-a73e-4e81-9d56-d01575fd2ce5

npx wrangler rollback <worker-version-id> \
  --name cambiometro-public-api
```
