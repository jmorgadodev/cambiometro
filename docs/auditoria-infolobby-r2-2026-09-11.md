# Auditoría InfoLobby · R2 y vista pública · 11 de septiembre de 2026

## Resultado

InfoLobby no se publica como una muestra de 40 registros. La muestra local de 40 filas sólo se usa para construir cruces estáticos livianos. La consulta pública de registros se realiza mediante el índice paginado de R2 y, al momento de esta auditoría, responde **60.523 registros**.

## Evidencia consultada

| Evidencia | Resultado |
| --- | ---: |
| `GET /api/v1/sources`, `id=infolobby` | 60.615 declarados por el catálogo; estado `partial` |
| `GET /api/v1/records?source=infolobby&limit=1&cursor=v1_0` | 60.523 filas paginables; `sourceBackend=r2-lake` |
| Metadatos de la respuesta de registros | `publishedRows=60.523`, `expectedRows=60.523`, `missingPartitions=0`, `missingArtifacts=0` |
| `data/lake-subsets/infolobby.subset.json` local | 40 filas; subconjunto de cruces, no universo público |

La diferencia observada es de **92 registros** entre el conteo declarado por el catálogo y el índice consultable. No se presenta como cobertura completa: queda etiquetada como discrepancia de catálogo pendiente de reconciliación.

## Qué muestra el sitio

- `/cruces` informa 60.523 registros consultables mediante paginación.
- La representación inicial de cruces conserva sólo 40 filas para no descargar el universo al navegador.
- La pestaña “Registros por fuente” consulta el endpoint indexado y permite recorrer las páginas publicadas.
- El catálogo declarado (60.615) y la diferencia de 92 se muestran como advertencia de calidad, no como filas disponibles.
- No se usa D1 para listar o buscar el universo de InfoLobby.

## Alcance de los registros

Los registros cubren audiencias, viajes y donativos publicados por InfoLobby. Los sujetos pasivos, organismos y demás entidades sólo se relacionan cuando vienen respaldados por identificadores de la fuente. Una coincidencia documental no implica irregularidad ni responsabilidad.

## Pendiente operativo

El siguiente ETL debe reconciliar los 92 registros declarados por el catálogo con el índice público antes de elevar el estado a `complete`. Hasta entonces, se conserva el release consultable de 60.523 filas y no se imputan las 92 ausencias.
