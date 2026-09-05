# Estado de producción — 5 de septiembre de 2026

## Resultado

Movimientos quedó operativo y automatizado en producción. El flujo validado es:

`ETL diario → snapshot R2 → build/gates Pages → Pages producción → guardia de frescura`.

El ETL de Movimientos se ejecuta de forma independiente del ETL de Cámara. La
publicación automática sólo ocurre después de que terminan los gates del build;
si falla una validación, se conserva la publicación anterior.

## Evidencia de la ejecución

- ETL Movimientos: run `33977700697`, `success`.
- Refresco y publicación Pages: run `33977739174`, `success`, 5m32s.
- Pages deployment: `ad28b34d-7846-4240-ae83-a343ec010f19`.
- Preview del deployment: <https://ad28b34d.cambiometro.pages.dev>.
- Dominio: <https://cambiometro.impulsacv.cl>.
- Worker productivo sin cambios: `5e091180-d59b-4a72-8618-10b8898e5a98`.
- Guardia ETL: run `33977739231`, `success`; confirmó la publicación automática
  posterior al ETL.

## Datos visibles

- `data/movimientos.json`: HTTP 200, 82 registros.
- `last_success_at`: `2026-09-05T16:23:45.876Z`.
- `last_event_date`: `2026-09-02`.
- Checksum: `82a165223878096bd600cf10b9b0c429476400b0fdb5bb002f499fdb3a0e2b8d`.
- Alonso Velásquez: evento 2-sep; Radio Paulina 3-sep y declaración oficial
  MINVU 2-sep; estado `en_confirmacion` hasta contar con acto administrativo.
- Patricio Löhr: evento 1-sep; Emol 2-sep; estado `en_confirmacion` hasta contar
  con fuente oficial.

La interfaz diferencia la fecha del evento de la fecha de detección/publicación
de la fuente. Los registros en confirmación se muestran, pero no se presentan
como confirmados oficialmente.

## Pruebas posteriores al deployment

- `npm run verify:prod:movimientos`: todos los checks verdes; sin spinner ni
  errores de navegador.
- `npm run smoke:uptime`: 12/12 rutas HTTP 200, sin 1102 ni errores, incluyendo
  `/movimientos`, `/api/v1/health` y búsqueda.
- El build/E2E, lint, tipos, seguridad y CodeQL de los PR de operación quedaron
  verdes.

## Fuentes pendientes

La API pública de fuentes reporta las 11 fuentes del catálogo como conectadas y
con datos publicados en el lake. Dentro del ETL específico de Movimientos hay
un conector con incidencia no bloqueante:

- `gob.cl`: HTTP 403 desde el runner de GitHub; también se probaron variantes
  públicas del mismo host (`/`, `?p=1` y `?page=1`) sin éxito.
- Prensa Presidencia: HTTP 200 después de agregar el intermedio público Sectigo
  que el servidor no entrega.

Ley Chile, Diario Oficial, Mindep, Prensa Presidencia, Radio Paulina y Emol están
disponibles en el snapshot actual. `gob.cl` queda visible como 403 del runner de
GitHub; no se desactiva su protección ni se publica un snapshot vacío o parcial
como si fuera exitoso.

## D1 y costo

La API de transferencias permanece R2-first: health productivo reporta
`transferSource=r2`, `transferRows=60351` y `d1TransferRows=0`. Esto evita
consultas D1 innecesarias y no requiere aumentar el plan. La consulta local
`wrangler d1 list` sigue bloqueada por permisos del token usado en el equipo;
no se ejecutó ninguna materialización D1 ni se consumió el límite diario.

## Rollback

```bash
npm run pages:rollback -- ad28b34d-7846-4240-ae83-a343ec010f19

npx wrangler rollback 5e091180-d59b-4a72-8618-10b8898e5a98 \
  --name cambiometro-public-api
```

