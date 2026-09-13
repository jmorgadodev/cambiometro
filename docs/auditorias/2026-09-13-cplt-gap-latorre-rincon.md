# Brecha de cobertura CPLT — Valentina Latorre Rincón

## Resultado

La búsqueda pública no encuentra `LATORRE RINCON VALENTINA ANDREA`, aunque el
Portal de Transparencia publica registros para `LATORRE RINCON, VALENTINA
ANDREA` en archivos de personal de planta. El hallazgo es reproducible y no
corresponde a un problema de mayúsculas, tildes o inversión de apellidos.

## Evidencia verificada el 13 de septiembre de 2026

- Producción: `GET /api/funcionarios?query=LATORRE%20RINCON%20VALENTINA%20ANDREA&include_zero=true&limit=20`
  responde HTTP 200 con `meta.total=0`.
- La misma API sí devuelve registros al buscar sólo `LATORRE`; por tanto el
  índice responde y el problema no es el token de búsqueda.
- El universo CPLT que declara producción es `1.226.913` registros y tiene
  estado `partial`; ese número no garantiza que cada categoría y mes esté
  indexado.
- La fuente oficial expone actualmente:
  - `TA_PersonalPlanta.csv`: HTTP 200, `ETag="200e8b575-65ace0fcb2bc0"`,
    `Last-Modified=2026-09-06`, tamaño 8.605.185.397 bytes.
  - `TA_PersonalContrata.csv`: HTTP 200, `ETag="35418ee8a-65acca312a400"`,
    `Last-Modified=2026-09-06`, tamaño 14.295.821.962 bytes.
- La captura de la fuente muestra a la persona en `Personal de Planta`, con
  cortes noviembre de 2025 y julio de 2026, cargo `DIRECTOR/A REGIONAL` y
  montos publicados de `5.488.617` y `5.676.763` pesos.

## Diagnóstico

La causa estructural ya está identificada en el código del ETL vigente:

- `scripts/etl/stream-remote-personal.mjs` descarta toda fila cuyo organismo
  no empiece por `municipalidad` o `municipio`.
- `scripts/etl/central-honorarios-stream.mjs` procesa organismos centrales,
  pero sólo la categoría `Honorarios`.
- No existe un flujo equivalente para `Planta`, `Contrata` o `CodigoTrabajo`
  de organismos centrales.

Por eso la fila de Valentina Latorre Rincón puede estar publicada oficialmente
en `Planta` y, al mismo tiempo, quedar fuera del release/index público. El
conteo agregado de producción no permite detectar esta omisión de alcance.

La auditoría de los archivos originales sigue siendo necesaria para medir el
volumen adicional y comprobar si existen más categorías y períodos afectados,
pero ya no se considera una hipótesis que el problema sea sólo el índice.

Un sondeo acotado por rangos HTTP, sin descargar los archivos completos,
confirmó además la escala del cambio: `Planta` pesa aproximadamente 8,6 GB,
`Contrata` 14,3 GB y `CodigoTrabajo` 6,3 GB. La distribución de los primeros
rangos muestra que las tres categorías contienen grandes bloques de organismos
centrales, no sólo unas pocas filas aisladas. Estas cifras son tamaño de fuente
cruda, no cantidad de registros publicables después de deduplicar por persona,
período y organismo.

No se agregará manualmente la fila ni se reemplazará el snapshot vigente hasta
identificar cuál de esas etapas falla.

## Criterio de corrección

La auditoría CPLT queda cerrada sólo cuando un reprocesamiento reproducible
demuestre, para `Planta` y `Contrata`, por período y organismo:

- filas leídas, filas válidas y filas publicadas;
- checksum del archivo original y del artefacto publicado;
- presencia de esta persona en los cortes oficiales que la fuente entrega;
- que la búsqueda pública encuentre por nombre con y sin tildes;
- que un fallo o archivo vacío conserve el release anterior y bloquee la
  publicación.

Antes de implementar esa ampliación se debe estimar el volumen de las tres
categorías centrales adicionales, su impacto en R2 y el tiempo de build. No se
ejecutará una descarga nacional ni se publicará un cambio mientras esa
estimación no esté validada.

La arquitectura segura será una proyección central separada, con páginas e
índices por fuente, período y organismo. No se debe mezclar con la cobertura
municipal de 346 comunas, no se debe materializar en D1 y no se debe cargar el
universo completo en el navegador.

Este caso se convierte en una prueba de regresión de cobertura; no se usa como
justificación para consumir D1 ni para descargar el universo completo al
navegador.
