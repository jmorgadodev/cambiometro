# Auditoría de producción — 6 de septiembre de 2026

## Estado

La publicación vigente de Pages se mantiene estable y fue revalidada contra el dominio productivo después de integrar las guardias operativas. La última guardia de CI no cambia datos ni el deployment activo.

- Commit de `main`: `c513e18` (`Fix: preserve mobile drawer during static hydration`).
- Pages deployment: `b9f75d80-3e88-47c5-b879-f75f5c931096`.
- URL del deployment: `https://b9f75d80.cambiometro.pages.dev`.
- Dominio verificado: `https://cambiometro.impulsacv.cl`.
- Rollback Pages: `npm run pages:rollback -- b9f75d80-3e88-47c5-b879-f75f5c931096`.
- Worker productivo vigente: `9fa69a8e-3998-47af-97e2-bea61059df3b`.
- Rollback Worker: `npx wrangler rollback 9fa69a8e-3998-47af-97e2-bea61059df3b --name cambiometro-public-api`.

## Movimientos

La verificación productiva `npm run verify:prod:movimientos` pasó todos sus checks:

- 82 registros históricos conservados.
- Última ejecución exitosa: `2026-09-06T04:58:19.805Z`.
- Último evento efectivo: `2026-09-02`.
- Última publicación de una fuente: `2026-09-03`.
- Checksum publicado: `cdaff6c2b47bbe808646d4b44e05258659b751c9a8ff98ef87dc55fb8bf40ff6`.
- Estados `verificado` y `en_confirmacion` visibles y separados.
- La página hidratada no deja spinner ni registra errores de navegador.

Las fechas no son contradictorias: el evento efectivo de Alonso Velásquez fue comunicado por MINVU el 2 de septiembre y la cobertura de Radio Paulina se publicó el 3; la renuncia de Patricio Löhr está fechada el 1 y Emol publicó el seguimiento el 2. La interfaz ahora muestra explícitamente “Última publicación detectada” y “Último evento efectivo”, y fecha cada señal anunciada.

## Conexiones

- Las 12 fuentes del catálogo de la API responden como `connected`.
- Ley Chile, Diario Oficial, Prensa Presidencia y Ministerio del Deporte respondieron disponibles en el snapshot de Movimientos.
- `Gob.cl Noticias` respondió `403` al runner. No bloquea la publicación: el ETL conserva el último snapshot válido y usa las demás fuentes oficiales; si todas las fuentes oficiales fallaran, el workflow falla y no publica un snapshot parcial.

## Verificación integral

`node scripts/verify-prod-full.mjs` pasó `132` verificaciones y `0` fallos. Se confirmaron, entre otros, las fichas Kaiser/Bianchi, Maipú, cruces, fuentes, transferencias `60.351`, Worker health, funcionarios, cero spinner y cero errores críticos. La guardia nueva confirma además `12/12` fuentes canónicas con estado `connected`.

El crawl frío de sitemap y rutas de nivel 1/2 pasó `5.015/5.015` respuestas HTTP 200, con `0` fallos, `0` respuestas 5xx/1102, máximo `679 ms` y promedio `312 ms`. La home respondió en `84 ms` en esa corrida y `/movimientos/` en `81 ms`.

La comprobación se realizó contra Pages y el dominio productivo después del deployment. No se ejecutaron lecturas masivas de D1; las transferencias y el catálogo grande se sirvieron desde el release R2/estático.

## Revisión adicional de conexiones y automatizaciones

La API productiva devolvió las 12 fuentes del catálogo con estado `connected`. Los conteos publicados coinciden con los releases visibles en la web: CPLT 1.226.913, ChileCompra 888.693, InfoLobby 60.523, Ley 19.862 60.351, Cámara 29.890, Senado 8.139, SERVEL 23.894, INE 346 y CGR 291, entre otros.

El workflow diario de Movimientos (`34012795797`) terminó `success` el 6 de septiembre a las 04:57 UTC y el snapshot publicado contiene los 82 registros. Los workflow fallidos observados no corresponden a pérdida del release público: CGR y Gastos fallaron en la proyección opcional D1 al alcanzar el límite de lectura; InfoLobby falló por un asset D1 ausente; Personal de apoyo falló porque Cámara bloqueó la URL de personal. R2/Pages conservó los últimos snapshots válidos. El PR #427 corrige la clasificación del mensaje actual de cuota D1 para que esos casos diferibles no interrumpan la publicación estática.

Se mantienen como advertencia operativa, no como dato inventado: `Gob.cl Noticias` devolvió `403` al runner, pero las otras fuentes oficiales de Movimientos respondieron 200. El pipeline no promueve una señal provisional a oficial sin respaldo.

