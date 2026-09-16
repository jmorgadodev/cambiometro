# Auditoría remota de almacenamiento R2 — 2026-09-16

## Objetivo

Medir el almacenamiento real de R2 antes de publicar nuevos releases. La revisión
se hizo mediante el listado remoto de objetos del bucket productivo; no descargó
filas de datos y no ejecutó `PUT` ni `DELETE`.

## Resultado remoto

Bucket público `transparencia-public-data`:

| Superficie | Objetos | Bytes | Lectura |
| --- | ---: | ---: | --- |
| Total bucket | 23.152 | 11.078.005.075 | El bucket supera el umbral interno de 10.000.000.000 bytes |
| Proyección municipal | 3.072 | 4.447.157.239 | Hay dos versiones publicadas |
| Proyección central | 7.026 | 4.459.740.764 | Hay una versión publicada |

Las principales superficies restantes son:

- `projections/static-site-v1/releases`: 259 objetos, 772.752.756 bytes.
- `projections/transferencias-v1/releases`: 12.376 objetos, 484.249.444 bytes.
- `indexes/v1/infolobby`: 11 objetos, 447.027.190 bytes.
- `indexes/v1/chilecompra`: 5 objetos, 165.437.953 bytes.
- `indexes/v1/infoprobidad`: 9 objetos, 135.571.189 bytes.

## Versiones de remuneraciones

Municipal:

- `2026-09-02T03-28-30-598Z`: 1.514 objetos, 2.134.868.312 bytes.
- `2026-09-15T08-08-44-566Z`: 1.557 objetos, 2.311.721.334 bytes.

Central:

- `2026-09-14T03-51-42-634Z`: 7.025 objetos, 4.458.019.964 bytes.

La versión municipal anterior no se elimina en esta auditoría. Antes de
conservarla o retirarla se debe comprobar que el release vigente y el rollback
validado contienen los mismos artefactos necesarios y que ningún manifiesto o
alias productivo apunta a la versión anterior.

## Backups

Bucket `cambiometro-backups`:

- 3.206 objetos.
- 6.359.832.609 bytes.
- `backup/2026-09-13`: 2.587 objetos, 4.310.789.809 bytes.
- `backup/2026-08-20`: 613 objetos, 1.878.360.452 bytes.
- Cinco dumps D1 fechados entre el 20 de agosto y el 6 de septiembre suman
  aproximadamente 173 MB.

El backup de `2026-09-13` es voluminoso porque contiene entidades y artefactos
completos. No se considera automáticamente prescindible: debe quedar al menos
un rollback verificable por release antes de evaluar retención.

## Decisión operativa

1. No publicar nuevos datos mientras el cálculo de tamaño no confirme margen
   seguro para el release completo.
2. No ejecutar una limpieza por patrón amplio. Primero se deben identificar
   manifiestos, aliases y objetos que realmente estén referenciados.
3. Mantener un solo release activo y un rollback validado por proyección; las
   versiones adicionales requieren justificación de retención.
4. Reducir tamaño en la próxima publicación mediante compresión, índices que
   sólo contengan referencias y separación entre corte vigente e histórico.
5. Revisar la política de backups por edad y tipo de artefacto antes de borrar
   cualquier objeto. La eliminación requiere una lista explícita y verificable.

## Estado

- Diagnóstico: completo.
- Escrituras R2: 0.
- Eliminaciones R2: 0.
- Descarga de universos de datos: 0.
- Publicación de nuevos datos: bloqueada hasta reconciliar retención y tamaño.

