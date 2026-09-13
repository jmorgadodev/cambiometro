# Modos de despliegue Pages

El código de interfaz y los refrescos de datos son operaciones separadas. Esta
separación evita repetir ETL cuando sólo se cambia el diseño y protege D1 de
lecturas o escrituras innecesarias.

## `ui-only`

Usar `.github/workflows/pages-ui-refresh.yml`.

- Recupera el último release validado desde R2.
- Construye Pages con ese snapshot, sin ejecutar ningún `etl:*`.
- Usa D1 sólo localmente durante las pruebas de integración.
- No escribe en D1 productiva ni modifica snapshots o checksums.
- Puede publicar una preview. Producción requiere la confirmación de cutover
  existente.

El workflow rechaza explícitamente el valor `data-refresh` para evitar que el
flujo de interfaz se use accidentalmente como pipeline de datos.

## `data-refresh`

Usar `.github/workflows/pages-static-refresh.yml` después de un ETL exitoso.

- Un disparo automático `workflow_run` sólo continúa si el ETL terminó verde.
- Un disparo manual exige `deployment_mode=data-refresh` y
  `confirm_data_refresh=CAMBIOMETRO_DATA_REFRESH`.
- Recupera y valida el release nuevo, recalcula sus artefactos necesarios y
  publica sólo después de pasar sus guards.
- El snapshot anterior se conserva si el refresh falla.

La promoción a producción sigue requiriendo `CAMBIOMETRO_CONFIRM_CUTOVER`.
Un cambio visual no necesita esperar ni volver a ejecutar el calendario ETL.
