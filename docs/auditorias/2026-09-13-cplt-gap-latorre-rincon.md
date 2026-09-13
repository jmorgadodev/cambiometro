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

La fila está ausente del release/index público actual. Las hipótesis que deben
probarse contra el archivo original son, en este orden:

1. el lote de `Planta` no incorporó el período o el organismo;
2. la fila fue filtrada durante la reducción por organismo/categoría;
3. la fila llegó al artefacto de categoría pero no al índice R2;
4. el manifiesto declara un universo agregado sin representar la cobertura
   efectiva por mes.

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

Este caso se convierte en una prueba de regresión de cobertura; no se usa como
justificación para consumir D1 ni para descargar el universo completo al
navegador.
