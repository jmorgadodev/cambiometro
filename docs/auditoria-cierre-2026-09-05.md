# Auditoría de cierre operativo — 2026-09-05

## Estado

La aplicación publicada responde correctamente y el checkout `main` está
limpio en `afe84c8`. Esta auditoría actualiza la fotografía histórica del
4-sep; no implica que se hayan ejecutado consultas masivas contra D1.

## Evidencia de producción

- Dominio: <https://cambiometro.impulsacv.cl>.
- Pages vigente: deployment `e4c106f8-5fb4-450f-91bf-12090be2feb8`.
- ETL de Movimientos: run
  `33996159042`, `success`.
- Guardia de publicación: run `33996195497`, `success`.
- Refresco Pages: run `33996214566`, `success`.
- Verificación doble, navegador y crawl frío: run
  `34001841994`, `success`.
- Artefacto de evidencia: <https://github.com/jmorgadodev/cambiometro/actions/runs/34001841994/artifacts/9979998361>.

La verificación final no reportó 404 inesperados, 5xx, 1102 ni violaciones
CSP. El crawl y la doble pasada fueron exitosos. El falso fallo anterior se
debía al diagnóstico interno del iframe de Turnstile; el guard ahora ignora
únicamente ese mensaje conocido y mantiene fatales los errores de la página,
del Worker y de CSP.

## Movimientos

- `data/movimientos.json`: 82 registros publicados.
- Última publicación exitosa: `2026-09-05T22:32:09.279Z`.
- Último evento: `2026-09-02`.
- Checksum publicado: `4c9fa0a1cc6eded40d12f6adf4ea1f19491dfcfa940d453f75c08057fd9ab4fb`.
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

El ETL conserva una advertencia separada: `gob.cl` responde HTTP 403 desde el
runner de GitHub. El ETL no publica un snapshot vacío ni incompleto: conserva
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
   bloqueante.
2. Si se incorpora un acto administrativo para Alonso o Löhr, ejecutar el ETL
   diario y verificar el cambio de `en_confirmacion` a `verificado`.

## Rollback

```bash
npm run pages:rollback -- e4c106f8-5fb4-450f-91bf-12090be2feb8

npx wrangler rollback <worker-version-id> \
  --name cambiometro-public-api
```
