# Hallazgo de remuneración — Abel Becerra Vidal, Tortel

## Resultado de conciliación

El 10 de octubre de 2026 se cotejó la respuesta productiva con la fila original
de `TA_PersonalPlanta.csv`, fuente oficial del Consejo para la Transparencia.
La consulta a la fuente se hizo mediante rangos HTTP: 23 solicitudes y
1.180.224 bytes leídos. No se descargó el archivo completo (8,71 GB).

Para el registro de Abel Becerra Vidal, la fila original entrega:

| Campo | Valor en la fuente CPLT |
| --- | --- |
| Organismo | Municipalidad de Tortel (`MU326`) |
| Período | Enero de 2025 |
| Cargo publicado | `ALCALDE` |
| Bruto publicado | `$468.212,0` |
| Líquido publicado | `$410.021,0` |
| Fecha de ingreso | `2021/06/28` |
| Fecha de término publicada | `Indefinido` |
| Identificador de página CPLT | `61143682` |
| Fecha de publicación de esa página | `2026/09/07` |

Los montos que devuelve el ETL y la API coinciden con la fila original. No se
observa una alteración introducida por el parser ni por la proyección de R2.
La causa de que el registro de enero de 2025 tenga ese valor no queda explicada
por el CSV.

Como contexto, el mismo CSV publica para Abel `$3.464.016` bruto en diciembre
de 2024 y `$7.426.023` en noviembre de 2024. La fila de enero de 2025 es, por
tanto, una diferencia que requiere aclaración del organismo; no se debe
presentar una explicación causal por inferencia. El CPLT indica que los montos
de marzo de 2025 hacia atrás están mensualizados, pero esa regla define la
unidad declarada, no valida por sí sola el monto ni explica su variación.

## Presentación y alcance

- En producción el dato se rotula como **monto bruto reportado** y conserva su
  período; no se presenta como el sueldo actual de una autoridad vigente.
- Se muestra la aclaración del CPLT para períodos hasta marzo de 2025 y el
  enlace a su guía oficial.
- La autoridad comunal actual y la remuneración histórica de Abel se mantienen
  como hechos separados.
- La fila de fuente acredita qué publicó CPLT, pero no permite concluir si hubo
  un pago parcial, una liquidación, un error del municipio o cualquier otra
  causa.
- Esta revisión es sólo de este registro. No estima cuántos casos similares hay
  en otras municipalidades.

## Estado

**Conciliación ETL–API–fuente: verificada.**
**Explicación sustantiva del valor: no determinada; requiere respuesta o
respaldo del organismo publicador.**

La corrección de presentación fue promovida mediante PR #735, fusionado en
`main` el 10-10-2026. En esta comprobación no se escribió ni eliminó información
de R2 o D1 y no se ejecutó ningún ETL.

## Evidencia oficial

- [Planilla CPLT de personal de planta](https://consejotransparencia.cl/transparencia_activa/datoabierto/archivos/TA_PersonalPlanta.csv)
- [Guía CPLT para publicación de personal y remuneraciones](https://www.consejotransparencia.cl/portal-de-transparencia/guia-pte-publicacion-remuneraciones/)
- [Municipalidad de Tortel — alcaldesa](https://www.tortel.cl/alcaldesa/)
