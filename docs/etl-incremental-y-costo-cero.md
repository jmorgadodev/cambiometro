# ETL incremental y protección del cupo gratuito

## Qué se ejecuta diariamente

El workflow `etl-daily.yml` mantiene el rango de ingestión con solapamiento y
fusiona los registros por identificador estable. El regenerador de
votaciones (`ingest:votaciones-full`) funciona en modo incremental por defecto:

- consulta el listado oficial para detectar altas y cambios;
- vuelve a pedir detalles sólo desde siete días antes de la fecha de ejecución;
- conserva los detalles históricos del último snapshot válido;
- ante una respuesta parcial o un fallo temporal no elimina sesiones ya
  publicadas;
- reintenta los registros recientes en la siguiente ejecución.

El rango de siete días evita perder una publicación tardía o una corrección
oficial sin volver a descargar todo el histórico.

## Reconstrucción completa

La reconstrucción completa es excepcional y sólo se usa para un backfill
controlado:

```bash
npm run ingest:votaciones-full -- --full
```

El workflow permite activarla manualmente con `full_votaciones=true`. No debe
activarse en el cron diario. La corrección del histórico debe ejecutarse una
vez, verificarse y luego volver al modo incremental.

## Transferencias y D1

El release completo con checksum publicado en R2 es la fuente pública normal
de `/api/v1/transferencias`. Esto evita que cada consulta haga `COUNT` y
consultas filtradas sobre las decenas de miles de filas de D1, que fue la
causa del agotamiento del límite gratuito `rows_read`.

El endpoint `/api/v1/health` tampoco cuenta la tabla de transferencias en su
camino normal: sólo comprueba que el binding D1 exista y que el manifest R2
sea válido. La comprobación de filas y checksum de D1 se activa únicamente
para una auditoría puntual con `HEALTH_CHECK_D1=1`.

D1 queda disponible para una validación o contingencia explícita mediante las
variables de Worker `PREFER_TRANSFER_D1=1` y `HEALTH_CHECK_D1=1`. No se
configuran en producción como camino normal. Si R2 no contiene un release completo, la API responde 503 de
forma visible y no inventa ni publica un universo parcial.

## Orden de recuperación después de un límite D1

1. No repetir el materializado remoto durante el mismo día UTC.
2. Esperar el restablecimiento del cupo gratuito.
3. Ejecutar el backfill completo sólo si la verificación detectó faltantes.
4. Confirmar filas, checksum, manifest y publicación estática.
5. Dejar el cron nuevamente en modo incremental.

Si se necesita recuperar primero la interfaz estática mientras D1 sigue sin
cuota, el workflow diario admite la ejecución manual con
`skip_d1=true`. Esa opción publica y verifica el snapshot R2, deja D1
explícitamente pospuesto en el resumen y nunca se usa en el cron programado.

La API pública continúa disponible desde R2 mientras D1 se recupera; el
materializado fallido no reemplaza el último snapshot válido.
