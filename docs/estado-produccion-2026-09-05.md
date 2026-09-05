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
- Build/E2E del ajuste de Movimientos: run `33989323453`, `success`.
- Promoción controlada Pages: run `33989679783`, `success`.
- Pages deployment vigente: `b5183bc1-16a3-43b6-af2a-bbe4ea7638a6`.
- Preview del deployment: <https://b5183bc1.cambiometro.pages.dev>.
- Dominio: <https://cambiometro.impulsacv.cl>.
- Worker productivo: `291bab62-d89d-426f-b1e5-3d1cb9c92e76`, promovido al 100%
  por el workflow `33982168319`.
- Worker anterior conocido-bueno: `5e091180-d59b-4a72-8618-10b8898e5a98`.
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
- Verificación posterior al ajuste de fechas: Alonso y Patricio siguen visibles
  como anuncios `en_confirmacion`; los anuncios recientes ya no muestran la
  alerta incorrecta `>30d`. El encabezado separa `último aviso` (03-09-2026)
  de `último evento` (02-09-2026).
- `verify-prod-full.mjs` posterior a la promoción del Worker: `136/136`, sin
  fallos. El guard de GA4 acepta el evento observado por red o el evento
  `page_view` en `dataLayer`, sin relajar el consentimiento ni la detección de
  duplicados.
- `verify-prod-full.mjs` con navegador, CSP, consentimiento y temas: `136/136`,
  sin fallos; GA4 sólo se carga tras aceptar consentimiento, no se duplica y
  registra un `page_view` para home y otro para la navegación a Movimientos.
- La landing muestra `Conectada · cobertura parcial declarada` para distinguir
  una fuente conectada de una cobertura incompleta del snapshot. El cambio fue
  publicado por el workflow `33987712311` sin refrescar ETL.
- `npm run smoke:uptime`: `12/12` rutas HTTP 200, incluyendo home, listados,
  ficha, `/movimientos` y endpoints del Worker.
- `/api/v1/relations` y `/api/v1/crosses` anclados a una entidad: HTTP 200,
  `sourceBackend=r2-entity-index`, `total=18`; ya no requieren el COUNT/SELECT
  de D1 para ese flujo.
- El build/E2E, lint, tipos, seguridad y CodeQL de los PR de operación quedaron
  verdes.

## Fuentes pendientes

La API pública de fuentes reporta las 12 fuentes del catálogo como conectadas y
con datos publicados en el lake: Cámara, ChileCompra, Contraloría, CPLT,
DIPRES, INE Censo 2024, InfoLobby, InfoProbidad, Ley 19.862, Senado, SERVEL
y SINIM. La etiqueta `Cobertura parcial declarada` describe el alcance del
snapshot, no una conexión caída. Dentro del ETL específico de Movimientos hay
un conector con incidencia no bloqueante:

- `gob.cl`: HTTP 403 desde el runner de GitHub; también se probaron variantes
  públicas del mismo host (`/`, `?p=1` y `?page=1`) sin éxito.
- Prensa Presidencia: HTTP 200 después de agregar el intermedio público Sectigo
  que el servidor no entrega.

Ley Chile, Diario Oficial, Mindep, Prensa Presidencia, Radio Paulina y Emol están
disponibles en el snapshot actual. `gob.cl` queda visible como 403 del runner de
GitHub; no se desactiva su protección ni se publica un snapshot vacío o parcial
como si fuera exitoso. El endpoint de fuentes sigue respondiendo 12/12
`connected` porque el catálogo publicado está disponible; el detalle de salud
del ETL conserva el 403 para diagnóstico.

La página `/movimientos/` muestra ambas referencias para evitar confundirlas:
última ejecución exitosa `05-09-2026 12:23` (Chile) y último evento `02-09-2026`.
Alonso Velásquez y Patricio Löhr están publicados como `en_confirmacion`, con
sus fuentes y fecha de evento; no se promueven a oficiales hasta encontrar el
acto administrativo correspondiente.

## D1 y costo

La API de transferencias permanece R2-first: health productivo reporta
`transferSource=r2`, `transferRows=60351` y `d1TransferRows=0`. Las relaciones
ancladas también son R2-first desde el Worker `291bab...`. El monitor de uso
`33980663597` registró `4.676.009 / 5.000.000` rows read (`93,52%`) en el día;
el preflight del ETL mantiene pospuesta la materialización D1 sobre el umbral
de seguridad y no requiere aumentar el plan. La consulta local `wrangler d1
list` sigue bloqueada por permisos del token usado en el equipo; no se ejecutó
ninguna materialización D1 manual.

## Rollback

```bash
npm run pages:rollback -- b5183bc1-16a3-43b6-af2a-bbe4ea7638a6

npx wrangler rollback 291bab62-d89d-426f-b1e5-3d1cb9c92e76 \
  --name cambiometro-public-api
```

