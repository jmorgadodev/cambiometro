# Recuperación municipal CPLT — ejecución autorizada 15-10-2026

## Referencia y motivo

- Worktree `C:\Users\jorge\.codex\worktrees\advisory-ui-total\cambiometro-audit`; rama documental `codex/cplt-recovery-20261015`, desde `origin/main` `7fd3e94f` (cierre de evidencia #807). No usar los checkouts divergentes ni reiniciar la auditoría del lote cerrado.
- El índice municipal activo sigue en `2026-09-15T08-08-44-566Z`, 1.243.761 registros. Manifiesto SHA-256 `9565ecd3d208e0f1dc48f0e05689aed3e7f1edd7456ab411b384d5abf7e99f04`.
- Las filas oficiales actuales y los validadores del release corresponden a cortes distintos. [Cotejo y casos precisos](municipal-source-lot-20261015.md). No cambiar meses históricos por inferencia.

## Causa operativa comprobada

- [Run programado del 05-10 `37351220112`](https://github.com/jmorgadodev/cambiometro/actions/runs/37351220112): job de frescura cancelado, sin pasos ejecutados; ingesta y consolidación omitidas. Anotación de GitHub: `The job was not acquired by Runner of type hosted even after multiple attempts`. No fue un CSV vacío ni un fallo de transformación acreditado.
- [Run del 10-10 `38087658657`](https://github.com/jmorgadodev/cambiometro/actions/runs/38087658657): comprobador satisfactorio con `changed=true`; ingesta y consolidación omitidas. Su estado verde no acredita datos actualizados ni publicación.
- Se reutiliza el workflow existente, sin modificar calendarios, permisos ni guardas, y sin crear un descargador alternativo.

## Autorización y coste antes de arrancar

Jorge autorizó explícitamente el 15-10 preparar y publicar la actualización municipal sólo con validaciones y margen gratuito, conservando el release anterior si falla. Esta autorización levanta para esa actualización la restricción de sólo lectura de la auditoría; no autoriza cobros, respaldos nuevos, eliminación del respaldo ni cargas de ChileCompra.

Panel R2 observado en Chrome autenticado antes del dispatch, ciclo **26 sep–26 oct**:

| Concepto | Lectura del panel (redondeada) |
| --- | ---: |
| Uso facturable | $0.00 |
| Operaciones Clase A | 8,53 mil |
| Operaciones Clase B | 70,14 mil |
| Almacenamiento total de cuenta | 8,72 GB |
| `transparencia-public-data` | 7,67 GB |
| `cambiometro-backups` | 1,05 GB |
| Otros buckets | 257,84 kB y un bucket vacío |

La franquicia se aplica a R2 Standard: 10 GB-mes, un millón de operaciones A y diez millones B por mes, según [precios oficiales consultados el 15-10](https://developers.cloudflare.com/r2/pricing/). El panel no predice el tamaño del candidato. No usar estas cifras redondeadas para saltarse el inventario exacto ni anunciar coste futuro garantizado.

El publicador vigente calcula inventario de todos los buckets, pico y tamaño proyectado antes de escribir; bloquea al 95% (9.500.000.000 bytes sobre el límite conservador configurado). El presupuesto de operaciones se estima por publicación. Se preservan el release activo y rollback; sólo se pueden retirar versiones de proyecciones obsoletas según el plan existente. No borrar el respaldo ni históricos protegidos para hacer pasar el presupuesto. Si el candidato no cabe, conservar producción y registrar el bloqueo, sin subir el umbral.

## Ejecución en curso — no declarar cerrada

- [Run `38711255292`](https://github.com/jmorgadodev/cambiometro/actions/runs/38711255292), creado `2026-10-15T09:12:39Z`, workflow `etl-cplt.yml`, commit `43e4e9a9eb2f46664a26d23593458201f1b5b43b` de `main`.
- Dispatch `check_sources_only=false`, categoría sin restringir: Planta, Contrata, Honorarios y Código del Trabajo. Se comprobó que no había otro run CPLT activo antes de iniciar.
- Primer job observado `in_progress`: esta vez GitHub sí asignó ejecución. No lanzar otro run por un timeout de observación o una espera de concurrencia; consultar este ID.
- Las extracciones y candidatos se preparan en GitHub, no se descarga el universo al equipo. Se reutiliza consolidación R2-only y publicación de agregados municipales; no se materializa D1 ni se hace backup nuevo.
- El bloqueo global de publicación se conserva. La reconstrucción de agregados no debe reemplazar otras fuentes por snapshots Git. Un fallo de una categoría impide finalizar el lote.

## Criterio para cerrar la recuperación

1. Comprobar resultado real de las cuatro categorías y consolidación; no basta con el primer job verde.
2. Registrar preflight exacto y versión/checksum/conteos del manifiesto efectivamente publicado. Si la guarda bloquea, registrar ese resultado y conservar el release anterior, sin llamarlo actualización completa.
3. Verificar el nuevo corte en API y páginas afectadas, incluidos los IDs del lote cero/no informado; comprobar que no se convirtieron vacíos en cero ni se fusionaron variantes nominales.
4. Comprobar propagación de los agregados y ReleaseSet de Pages con los flujos existentes; el éxito del ETL no equivale por sí solo a un build publicado.
5. Volver al panel de R2 al finalizar: almacenamiento, operaciones y uso facturable. Documentar rollback disponible y pendientes exactos.

Esta recuperación no equivale a conciliación nacional fila por fila. El punto 6 permanece abierto mientras falten sus verificaciones; ChileCompra sigue al final. No repetir los seis cotejos cerrados para llenar una espera del run.
