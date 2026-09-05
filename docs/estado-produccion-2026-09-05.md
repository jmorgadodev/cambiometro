# Estado de producción — 5 de septiembre de 2026

## Resultado

Movimientos quedó operativo y automatizado en producción. El flujo validado es:

`ETL diario → snapshot R2 → build/gates Pages → Pages producción → guardia de frescura`.

El ETL de Movimientos se ejecuta de forma independiente del ETL de Cámara. La
publicación automática sólo ocurre después de que terminan los gates del build;
si falla una validación, se conserva la publicación anterior.

## Evidencia de la ejecución

- ETL Movimientos: run `33975348933`, `success`, 33 s.
- Refresco y publicación Pages: run `33975381944`, `success`, 5m32s.
- Pages deployment: `e70fc84b-498c-4211-bfab-bcfb7d4791b2`.
- Preview del deployment: <https://e70fc84b.cambiometro.pages.dev>.
- Dominio: <https://cambiometro.impulsacv.cl>.
- Worker productivo sin cambios: `5e091180-d59b-4a72-8618-10b8898e5a98`.
- Guardia ETL: run `33975381928`, `success`; confirmó la publicación automática
  posterior al ETL.

## Datos visibles

- `data/movimientos.json`: HTTP 200, 82 registros.
- `last_success_at`: `2026-09-05T15:37:31.418Z`.
- `last_event_date`: `2026-09-02`.
- Checksum: `64771806b4f1fcb444c4975f123112e9ed22f4f9cccafe5eed198f61de26a4ce`.
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

- `gob.cl`: HTTP 403 temporal.
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
npm run pages:rollback -- 562aaa89-cd1e-49e3-8700-5569930ef6f2

npx wrangler rollback 5e091180-d59b-4a72-8618-10b8898e5a98 \
  --name cambiometro-public-api
```

