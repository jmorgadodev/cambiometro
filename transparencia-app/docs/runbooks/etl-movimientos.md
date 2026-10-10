# ETL de Movimientos de autoridades

## Regla editorial y de conteo

Un anuncio respaldado por una fuente oficial o periodística se publica de inmediato como señal `en_confirmacion` y se incluye en el total público. No se suma al total de salidas verificadas. Una referencia a prensa no se convierte en un acto oficial.

En ejecuciones posteriores, el ETL vuelve a consultar las señales pendientes y sus fuentes relacionadas. Sólo cambia el estado a `verificado_oficial` si encuentra evidencia legal compatible con persona, cargo, organismo y cese. Al confirmar, conserva el `signal_id` del anuncio, agrega la evidencia legal y evita crear una segunda salida. Si la coincidencia es incompleta o ambigua, permanece pendiente. No se usa `renunciaskast.cl` como fuente del ETL ni como cita pública.

## Validación operativa

- Workflow: `etl-movimientos.yml`, diario. Última ejecución consultada el 10-10-2026: run `38054598823`, estado `success`.
- Comprobación pública: `npm run verify:prod:movimientos`; prueba la ruta, hidratación, snapshot, conteos, corte reconciliado y señales pendientes.
- Pruebas del ciclo: `npx vitest run scripts/movimientos-pipeline.test.mjs lib/movimientos-publication.test.ts lib/movimientos.test.ts`.
- Al 10-10-2026, el release reconciliado conserva 46 salidas hasta el 14-09-2026 (`kast-2026-succession-reconciled-2026-09-14`, SHA-256 `fa9aae700ec9fab351e40f1f90d9601c1bb79f79fdafa218e456cc2dd35d52cc`). Se publican además 5 señales en confirmación: total 51, no 51 salidas verificadas.
- Las tres señales del 30-09-2026 aparecen en producción: Sebastián Norambuena (comunicado MINVU), Kattia Durán (Radio Universidad de Chile; fecha efectiva reportada 01-10) y Juan Carlos Meléndez Santelices (comunicado del Ministerio de Economía). Las tres siguen en confirmación hasta que el acto de cese se verifique.
- También se conservan José Bravo Burgos (15-09, Minsal) y Fabián Páez (17-09, Chilevisión citando un comunicado de la DPR) como señales, fuera del corte de 46.
- El verificador productivo terminó con `ok: true`; comprobó que las cinco señales se cuentan separadas, no se promocionan sin evidencia y no se atribuye el corte posterior al release reconciliado.

## Límites de promoción

- Si todas las fuentes oficiales fallan y no hay anuncios admisibles, el ETL falla cerrado y conserva el snapshot vigente.
- Un release sin cambios no se vuelve a publicar.
- No cambiar un estado sólo por antigüedad, por una nota repetida ni por una coincidencia de nombre.
- Para investigar una señal, conservar por separado fecha del anuncio, fecha efectiva reportada, fecha del acto y fecha de detección.
- Los errores HTTP, timeouts y nombres de conectores son información interna; no se muestran en páginas públicas.
