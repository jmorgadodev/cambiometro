# Decisión de respaldo y capacidad R2 — 2026-09-17

## Motivo

Se revisó si los respaldos actuales permiten corregir la proyección central de
Transparencia Activa sin dejar producción sin rollback ni superar el umbral
operativo de almacenamiento.

La revisión fue sólo de lectura: no se descargaron universos, no se ejecutó
ETL y no se hizo ningún `PUT` ni `DELETE` en R2.

## Estado observado

| Bucket | Objetos | Bytes | Lectura operativa |
| --- | ---: | ---: | --- |
| `transparencia-public-data` | 23.152 | 11.078.005.075 | Sobre el límite interno de 10 GB |
| `cambiometro-backups` | 3.206 | 6.359.832.609 | Respaldo voluminoso; requiere retención selectiva |
| Cuenta agregada | 26.358 | 17.437.837.684 | Bloqueada para publicaciones grandes |

La proyección central activa ocupa aproximadamente 4,46 GB y la municipal
aproximadamente 4,45 GB entre las dos versiones publicadas. La corrección del
alcance central produciría una nueva versión completa; conservar además la
versión activa durante la publicación no tiene margen seguro en el estado
actual.

## ¿Es necesario el backup?

Sí, pero no todo el contenido actual tiene que conservarse indefinidamente.
Debe existir al menos un rollback verificable por cada proyección activa antes
de reemplazarla. El respaldo disponible no acredita hoy una copia completa y
exacta de toda la proyección central activa: la auditoría previa encontró
copias parciales o con diferencias de fecha y no autorizó tratarlas como
rollback completo.

Por eso no se eliminan respaldos por nombre o por antigüedad sin una lista de
objetos verificada. La decisión correcta es retención selectiva, no borrar el
bucket completo:

1. conservar el rollback completo de cada release activo;
2. conservar el manifiesto, catálogo y checksums que lo hacen recuperable;
3. conservar por un plazo acotado los respaldos de fuentes críticas;
4. retirar sólo snapshots redundantes después de comparar tamaño, checksum,
   referencias y capacidad de restauración.

## Bloqueo actual y ruta segura

El código de publicación ya calcula el estado posterior y bloquea al 95%.
Con la cuenta en aproximadamente 17,44 GB, esa guardia debe mantenerse. No se
publicará la proyección central corregida hasta cumplir este orden:

1. crear y validar localmente el release corregido, sin escribir R2;
2. seleccionar y verificar un rollback real de la versión que se reemplaza;
3. preparar una lista explícita de objetos redundantes y el espacio que libera;
4. ejecutar la limpieza mínima aprobada y volver a medir la cuenta;
5. publicar la corrección sólo si la guardia confirma margen para datos y
   rollback;
6. verificar conteos, alcance, búsqueda y manifestos en producción;
7. conservar el rollback hasta cerrar la verificación posterior.

Mientras tanto, producción conserva la proyección anterior y la corrección de
código queda preparada en `main`; esto evita que una publicación incompleta
mezcle archivos centrales y municipales o deje el sitio sin datos.

## Decisión

- No borrar backups en esta revisión.
- No publicar un release de 4+ GB mientras la cuenta siga bloqueada.
- No usar D1 como alternativa de emergencia.
- La próxima intervención debe ser una conciliación de retención con una lista
  exacta, reversible y con rollback verificable.

