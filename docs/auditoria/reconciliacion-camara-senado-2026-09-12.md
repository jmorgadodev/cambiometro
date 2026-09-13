# Reconciliación Cámara y Senado — 2026-09-12

## Alcance

Esta nota compara el catálogo R2/producción vigente con los snapshots locales
versionados. No reemplaza datos productivos por archivos locales y no interpreta
una diferencia de fecha como pérdida de registros.

Referencia operativa: catálogo R2 `catalog/v1/manifest.json`, generado el
`2026-09-12T00:13:38.399Z` (UTC). Los snapshots locales revisados declaran
`2026-08-21T10:10:54.809Z`.

## Resultado ejecutivo

La diferencia observada es principalmente de frescura y alcance. Producción/R2
contiene un release posterior y separa categorías que los snapshots locales
anteriores agrupaban o exponían con otra cobertura. No se debe publicar un
porcentaje de cobertura hasta completar la reconciliación semántica de cada
categoría.

| Fuente | Producción/R2 vigente | Snapshot local anterior | Lectura | Estado |
|---|---:|---:|---|---|
| Cámara | 58.751 | 19.025 | Release posterior y alcance distinto | Parcial; reconciliación pendiente |
| Senado | 1.428 | 8.138 | Release posterior con subconjunto verificable distinto | Parcial; reconciliación pendiente |

Los conteos locales no se consideran baseline actual: corresponden a un corte
anterior y no deben sobrescribir el catálogo productivo.

## Cámara

El catálogo vigente declara 58.751 registros en la fuente principal:

- Asistencia: 54.538, incluida en el conteo principal.
- Votaciones: 4.058, incluida en el conteo principal.
- Registros residuales `congreso_opendata`: 155, incluidos en particiones del
  catálogo pero no expuestos como componente separado en el resumen de fuentes.
- Gastos operacionales: 16.275, separados en `gastos_camara` y no incluidos en
  los 58.751.

La suma de asistencia y votaciones es 58.596; la diferencia de 155 está
identificada como la categoría residual `congreso_opendata`. Esto es una
clasificación de alcance, no una corrección numérica ni una deduplicación.

El catálogo está particionado por período desde 2024-01 hasta 2026-09. La
fuente permanece marcada como `partial` porque sólo se deben presentar las
particiones verificadas.

## Senado

El catálogo vigente declara 1.428 registros en la fuente principal, separados
de otros conjuntos:

- Fuente principal: 1.428 registros, principalmente remuneraciones/dieta del
  período disponible en las particiones verificadas.
- Votaciones: 205 en `votaciones_senado`; no están incluidos en 1.428.
- Gastos operacionales: 6.517 en `gastos_senado`; no están incluidos en 1.428.

Por tanto, no corresponde sumar 1.428 + 205 + 6.517 y llamarlo “Senado” sin
mostrar la categoría. La interfaz debe mantener remuneraciones, votaciones y
gastos separados.

## Integridad y procedencia

- Cámara: checksum de índice `209ce6912849cfdc0699f916bba5f7d7cd462d0387de74d318503437b53ec3b5`.
- Senado: checksum de índice `95fd6a78a5d33385a46fcc3fde4769313208e6bdb9a14d4602727a6f1c321bb6`.
- Fuente Cámara: `https://opendata.congreso.cl/wscamaradiputados.asmx/getDiputados_Vigentes`.
- Fuente Senado: `https://www.senado.cl/transparencia/transparencia-activa`.

Ambas fuentes siguen en estado parcial en el catálogo. Los registros originales
se conservan en R2; la reconciliación sólo documenta categorías, períodos y
alcance.

## Acción técnica asociada

La consulta pública de registros se ajustó para no descomprimir el histórico
completo en una sola ejecución. Las páginas sin filtros leen sólo las
particiones necesarias; una consulta amplia sobre una fuente sin índice requiere
acotar período y responde de forma controlada, en vez de provocar un error 1102.
El camino público continúa siendo R2; esta corrección no habilita lecturas
masivas ni escrituras en D1.

## Pendiente antes de declarar la fase cerrada

1. Confirmar con el release de cada ETL qué representa exactamente el residual
   `congreso_opendata`.
2. Reconciliar período por período contra los manifiestos de Cámara y Senado.
3. Separar visualmente remuneraciones, asesorías, gastos y votaciones en los
   conteos públicos.
4. Ejecutar el workflow de reconciliación de Cámara sólo con confirmación
   explícita y después de validar las fuentes upstream.

