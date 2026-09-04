# Procedimiento seguro después de agotar D1

Este procedimiento mantiene el plan Workers Free en costo cero y evita que una
prueba repetida vuelva a consumir el cupo diario. No ejecuta SQL ni modifica
datos por sí solo.

## Durante el bloqueo

No ejecutar contra producción:

- `wrangler d1 execute --remote`;
- `npm run data:materialize -- --remote`;
- ETL con materialización D1;
- `smoke:uptime` completo ni consultas desde el panel de Cloudflare.

El sitio estático y los releases publicados en R2 pueden revisarse sin tocar
D1. El workflow `usage-watch.yml` consulta Analytics de Cloudflare, no ejecuta
SQL; aun así, no hace falta repetirlo mientras el límite esté bloqueado.

## Cuando llegue la hora de reinicio

1. Copiar la hora UTC del correo o del panel en `D1_LIMIT_REACHED_AT`.
2. Ejecutar el candado local desde `transparencia-app`:

   ```powershell
   $env:D1_LIMIT_REACHED_AT = "2026-09-04T18:45:00Z"
   npm run d1:post-reset:preflight
   ```

   El resultado debe ser `"status": "ready"` y `"network": "not-called"`.
3. Ejecutar una sola vez el workflow manual `usage-watch.yml`, sólo para
   confirmar que el nuevo día comenzó con el nivel esperado. No ejecutar SQL.
4. Si el uso está bajo el umbral, hacer una única petición de health:

   ```powershell
   curl.exe -fsS https://cambiometro.impulsacv.cl/api/v1/health
   ```

5. Ejecutar primero el ETL incremental correspondiente, sin `--full-history`.
   En la materialización usar `--skip-unchanged`.
6. Verificar que el snapshot/R2, manifest, checksum y publicación estática
   correspondan a la misma versión.
7. No ejecutar backfills históricos ni smoke completo hasta confirmar el uso
   posterior a los pasos anteriores.

## Interpretación

- `wait`: el cupo todavía no se reinició; no se hizo ninguna llamada de red.
- `ready`: sólo autoriza comenzar la secuencia; no significa que D1 ya esté
  bajo el umbral ni que el ETL sea seguro sin medirlo.
- `critical` en `usage-watch`: detener materialización y conservar R2/Pages.

El límite gratuito de D1 se reinicia diariamente a las 00:00 UTC. Las horas
locales pueden variar según el horario de invierno/verano de Chile; se debe
usar siempre la hora UTC mostrada por Cloudflare.

## Qué queda pendiente después de la prueba

La estrategia incremental y `--skip-unchanged` ya evitan trabajo cuando un
checksum no cambia. Las votaciones diarias todavía requieren una optimización
adicional por partición para garantizar que un día con cambios no vuelva a
recorrer todo el histórico de D1. Si el primer ETL posterior al reinicio
supera el umbral, detenerse y corregir esa partición; no activar el plan pago
ni ejecutar `--full-history` como solución.
