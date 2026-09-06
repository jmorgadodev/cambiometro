# Auditoría de producción — 6 de septiembre de 2026

## Estado

La publicación de Pages posterior al ajuste de Movimientos terminó correctamente.

- Commit de `main`: `bd58ade025bdfc9f4d153ae1ea74172e07b1ac06`.
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

`node scripts/verify-prod-full.mjs` pasó `130` verificaciones y `0` fallos. Se confirmaron, entre otros, las fichas Kaiser/Bianchi, Maipú, cruces, fuentes, transferencias `60.351`, Worker health, funcionarios, cero spinner y cero errores críticos.

La comprobación se realizó contra Pages y el dominio productivo después del deployment. No se ejecutaron lecturas masivas de D1; las transferencias y el catálogo grande se sirvieron desde el release R2/estático.

