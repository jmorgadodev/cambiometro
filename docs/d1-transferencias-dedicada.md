# Proyección D1 dedicada de transferencias

## Motivo

La base `transparencia-db` ya estaba cerca del límite de tamaño del plan
gratuito. El release completo de Ley 19.862 no debe insertarse allí: el intento
del 29 de agosto de 2026 terminó con Cloudflare `Exceeded maximum DB size`
(`code: 7500`). Eso no era un fallo del ETL; era una limitación de capacidad de
la base compartida.

## Solución aplicada

El ETL crea o reutiliza de forma idempotente la base `cambiometro-transferencias`
y materializa allí la tabla `transferencias_19862` con sus índices. El Worker la
recibe como `TRANSFERS_DB`; las demás consultas siguen usando `DB`. El release
completo y su checksum continúan publicados en R2, que es la fuente canónica.

La materialización se realiza en una tabla `*_stage`. Sólo después de insertar
el release completo y crear los índices se reemplaza la tabla activa y se
actualiza `transferencias_19862_release`. Si un lote falla, el release anterior
permanece activo; si la activación queda incompleta, el Worker verifica el
checksum y usa R2 automáticamente.

## Costo y límites

La solución no solicita un plan de pago ni crea una base por cada ejecución:
siempre busca la base por nombre antes de crearla. La documentación vigente de
Cloudflare establece para Workers Free hasta 10 bases, 500 MB por base y 5 GB
totales; el uso sólo permanece sin costo mientras se respeten los límites
diarios y de almacenamiento del plan.

## Flujo automático

1. `etl-ley-19862.yml` publica el release validado en R2.
2. `ensure-transfer-d1.mjs` resuelve el UUID de
   `cambiometro-transferencias` usando el API de Cloudflare.
3. `materialize-transferencias-d1.mjs` aplica la migración, carga el staging y
   activa el release coherente.
4. `public-api-worker.yml` genera una configuración temporal con el binding
   `TRANSFERS_DB` cuando sube o promueve una versión del Worker.
5. `health` informa `transferD1`, `d1TransferRows`, `d1ReleaseChecksum`,
   `d1Consistent` y `transferSource`. R2 sigue siendo el fallback seguro.

### Reparación sin reingerir el origen

Si la base dedicada queda vacía o desfasada, no se debe ejecutar de nuevo el
ETL oficial ni reconstruir desde particiones históricas locales. El workflow
manual `.github/workflows/repair-transfer-d1.yml` descarga el manifest y las
páginas del release canónico de R2, valida el checksum y materializa exactamente
ese release en `cambiometro-transferencias`. Exige escribir
`REPAIR_TRANSFER_D1`, pasa primero por el preflight de cuota y falla si la
métrica no está disponible o supera el 60%; en ambos casos R2 continúa siendo
la fuente pública y no se realiza una escritura parcial.

No se guardan UUIDs ni configuraciones generadas con secretos en el repositorio.
Los archivos temporales se crean en el runner y están excluidos por `.gitignore`.
