# Auditoría de producción — 6 de septiembre de 2026

## Estado

La publicación vigente de Pages se mantiene estable y fue revalidada contra el dominio productivo después de integrar las guardias operativas. La última guardia de CI no cambia datos ni el deployment activo.

- Commit de `main`: `a606deb` (`fix(api): block unbounded relation scans`).
- Pages deployment productivo vigente: `4e45a686-d052-4d56-875a-d738a4b6cc38`.
- URL del deployment: `https://4e45a686.cambiometro.pages.dev`.
- Dominio verificado: `https://cambiometro.impulsacv.cl`.
- Rollback Pages: `npm run pages:rollback -- 4e45a686-d052-4d56-875a-d738a4b6cc38`.
- Worker productivo vigente: `362fd90a-ab0a-4303-9d75-c617ad47d271`.
- Rollback Worker: `npx wrangler rollback 362fd90a-ab0a-4303-9d75-c617ad47d271 --name cambiometro-public-api`.

## Movimientos

La verificación productiva `npm run verify:prod:movimientos` pasó todos sus checks:

- 82 registros históricos conservados y release R2 `d854bf4717b54374dc2c08262c85db18f1a56ea7e3171905fa46a697ef15161e` hidratado en Pages.
- Última ejecución exitosa: `2026-09-06T11:28:11.475Z`.
- Último evento efectivo: `2026-09-02`.
- Última publicación de una fuente: `2026-09-03`.
- Checksum publicado: `abbd517e8ef918843f779779c9a7035e66a2a70cbd2441bb154d49dccfe5008a`.
- Estados `verificado` y `en_confirmacion` visibles y separados.
- La página hidratada no deja spinner ni registra errores de navegador.

Las fechas no son contradictorias: el evento efectivo de Alonso Velásquez fue comunicado por MINVU el 2 de septiembre y la cobertura de Radio Paulina se publicó el 3; la renuncia de Patricio Löhr está fechada el 1 y Emol publicó el seguimiento el 2. La interfaz ahora muestra explícitamente “Última publicación detectada” y “Último evento efectivo”, y fecha cada señal anunciada.

## Conexiones

- Las 12 fuentes del catálogo de la API responden como `connected`.
- Ley Chile, Diario Oficial, Prensa Presidencia y Ministerio del Deporte respondieron disponibles en el snapshot de Movimientos.
- `Gob.cl Noticias` respondió `403` al runner. No bloquea la publicación: el ETL conserva el último snapshot válido y usa las demás fuentes oficiales; si todas las fuentes oficiales fallaran, el workflow falla y no publica un snapshot parcial.

## Verificación integral

`node scripts/verify-prod-full.mjs` pasó `132` verificaciones y `0` fallos en la pasada 1 y nuevamente `132` verificaciones y `0` fallos diez minutos después (pasada 2). Se confirmaron, entre otros, las fichas Kaiser/Bianchi, Maipú, cruces, fuentes, transferencias `60.351`, Worker health, funcionarios, cero spinner y cero errores críticos. La guardia confirma además `12/12` fuentes canónicas con estado `connected`.

El crawl frío de sitemap y rutas de nivel 1/2 pasó `5.015/5.015` respuestas HTTP 200, con `0` fallos, `0` respuestas 5xx/1102, máximo `679 ms` y promedio `312 ms`. La home respondió en `84 ms` en esa corrida y `/movimientos/` en `81 ms`.

La comprobación se realizó contra Pages y el dominio productivo después del deployment. No se ejecutaron lecturas masivas de D1; las transferencias y el catálogo grande se sirvieron desde el release R2/estático.

## Revisión adicional de conexiones y automatizaciones

La API productiva devolvió las 12 fuentes del catálogo con estado `connected`. Los conteos publicados coinciden con los releases visibles en la web: CPLT 1.226.913, ChileCompra 888.693, InfoLobby 60.523, Ley 19.862 60.351, Cámara 29.890, Senado 8.139, SERVEL 23.894, INE 346 y CGR 291, entre otros.

El workflow diario de Movimientos (`34012795797`) terminó `success` el 6 de septiembre a las 04:57 UTC y el snapshot publicado contiene los 82 registros. Los workflow fallidos observados no corresponden a pérdida del release público: CGR y Gastos fallaron en la proyección opcional D1 al alcanzar el límite de lectura; InfoLobby falló por un asset D1 ausente; Personal de apoyo falló porque Cámara bloqueó la URL de personal. R2/Pages conservó los últimos snapshots válidos. El PR #427 corrige la clasificación del mensaje actual de cuota D1 para que esos casos diferibles no interrumpan la publicación estática. La protección adicional de relaciones/cruces sin alcance se integró en `a606deb` y está activa en el Worker indicado arriba.

Se mantienen como advertencia operativa, no como dato inventado: `Gob.cl Noticias` devolvió `403` al runner, pero las otras fuentes oficiales de Movimientos respondieron 200. El pipeline no promueve una señal provisional a oficial sin respaldo.

