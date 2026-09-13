# Auditoría de calidad de funcionarios — 2026-09-06

Esta revisión se ejecutó sobre el snapshot local de `data/cplt-artifacts`,
que contiene 1.220.960 registros en 1.256 archivos de proyección. Los conteos
son evidencia del snapshot local y no deben presentarse como un nuevo conteo de
producción hasta publicar un release posterior.

## Hallazgos

| Campo o relación | Registros | Porcentaje | Decisión recomendada |
| --- | ---: | ---: | --- |
| Prefijo de puntuación en nombre | 6 | 0,0005% | Corregir sólo para lectura y conservar original |
| Prefijo numérico aislado en nombre | 24 | 0,0020% | Retirar visualmente, marcar y conservar original |
| Nombre con una sola palabra | 5 | 0,0004% | No completar; mostrar “nombre incompleto de fuente” |
| Cargo con signo inicial | 656 | 0,0537% | Revisar por patrón; no retirar paréntesis con significado |
| Bruto positivo y líquido cero | 156.507 | 12,82% | Mostrar líquido no informado; conservar cero original |
| Líquido mayor que bruto | 9.649 | 0,79% | Marcar anomalía; no recalcular |
| Bruto cero y líquido positivo | 1.192 | 0,10% | Marcar inconsistencia de origen; no corregir |
| Bruto con decimales | 1.326 | 0,11% | Conservar y marcar posible unidad/formato |
| Líquido con decimales | 5.089 | 0,42% | Conservar y marcar posible unidad/formato |
| Algún monto sobre $20 millones | 112 | 0,0092% | Marcar para revisión, no eliminar por umbral |
| Fecha de término ausente | 314.945 | 25,80% | No completar: puede significar vínculo vigente |

Los porcentajes se calculan sobre los 1.220.960 registros del snapshot y se
redondean a dos o cuatro decimales según el tamaño del fenómeno.

## Qué debe hacer el próximo ETL

### Corrección automática segura

- recortar y compactar espacios;
- retirar signos o números aislados al inicio del nombre sólo para la capa de
  lectura;
- convertir fechas válidas al formato ISO `AAAA-MM-DD` y períodos a
  `AAAA-MM`;
- interpretar separadores de miles y decimales de la fuente sin inventar una
  unidad distinta;
- presentar el líquido `0` como “No informado por la fuente” cuando el bruto es
  positivo.

La extracción ya incorpora las reglas de nombre y líquido en
`scripts/etl/cplt-personal.mjs` y `scripts/etl/ingest-municipal-personal.mjs`.

### Sólo marcar, nunca corregir automáticamente

- líquido mayor que bruto;
- bruto cero con líquido positivo;
- montos decimales o extremadamente altos;
- cargos `#nd`, `?`, `.` o cargos con signos iniciales;
- nombres de una sola palabra;
- apellidos repetidos, orden de nombres o posibles errores ortográficos.

En estos casos se conserva el valor recibido, se agrega una incidencia de
calidad y se enlaza la fuente original. No se recalculan remuneraciones ni se
rellenan campos faltantes.

## Criterio de publicación

El ETL no debe sobrescribir los históricos con una “corrección” silenciosa.
Cada release debe incluir el checksum de entrada, el checksum de salida, el
conteo de registros con incidencias y el porcentaje por incidencia. Si aumenta
bruscamente una anomalía —por ejemplo, montos decimales o líquidos mayores que
brutos— el pipeline debe advertir y conservar el último release válido hasta
revisión.

## Filtro público

La interfaz expone la clasificación en **Calidad de la fuente**:

- `Todos`: universo normal de consulta;
- `Correcciones de formato`: filas en las que sólo se corrigió una marca o
  prefijo inequívoco para lectura;
- `Datos observados por auditoría`: filas con montos o campos que requieren
  revisión, sin reemplazar el valor recibido.

El término “datos observados” evita llamar “corrupto” a un registro cuando no
existe evidencia suficiente para determinar si el problema está en la fuente,
en una unidad de medida o en el contexto de pago.
