# Auditoría de cobertura ChileCompra en R2

Fecha del diagnóstico: 11 de septiembre de 2026 (America/Santiago)

## Resultado ejecutivo

El catálogo público de R2 contiene actualmente **74.142 registros consultables** de
ChileCompra. El histórico de **888.693 registros** que aparece en algunos artefactos
locales no está publicado como particiones recorribles en el catálogo R2 y, por lo
tanto, no debe presentarse como histórico disponible para el público.

La diferencia queda clasificada como **alcance publicado vs. universo histórico
declarado**, no como error de conteo del release vigente.

## Evidencia R2

| Elemento | Evidencia |
| --- | --- |
| Fuente | `chilecompra` |
| Registros del catálogo | 74.142 |
| Estado | `partial` |
| Períodos descubiertos por la fuente | `2026-06`, `2026-07` |
| Particiones publicadas | 1: `chilecompra/2026-06` |
| Filas de la partición publicada | 74.142 |
| Checksum del índice de fuente | `1bce7de1ed00f321363df1a5e0e7a920d679f2e767264b2b327db6acb565f1bd8` |
| Checksum de la proyección publicada | `82aedb1d0f6fd8e2b359f01e06b1ed39239ccbc504cdadfb35980d0ff28476e4` |
| Fecha de generación de la partición | 12 de agosto de 2026 08:44:19 UTC |
| Origen oficial declarado | `https://datos-abiertos.chilecompra.cl/descargas/procesos-ocds` |

La partición contiene los objetos de manifiesto, registros comprimidos y checksum.
No se encontró una partición histórica adicional de ChileCompra bajo
`partitions/chilecompra/`.

## Interpretación pública

- **Canónico vigente:** 74.142.
- **Consultable en R2:** 74.142.
- **Histórico declarado en artefactos locales:** 888.693.
- **Histórico consultable:** no disponible todavía.

La interfaz y el resumen de calidad deben mostrar estas cifras separadas. No se
debe afirmar que las 888.693 filas están disponibles hasta que el ETL publique sus
particiones, manifiestos y paginación en R2 con checksums verificables.

## Acción pendiente del ETL

Para cerrar la fase ChileCompra se requiere una de estas dos salidas verificables:

1. Publicar en R2 las particiones históricas y actualizar el catálogo con sus
   conteos y checksums; o
2. Mantener el release parcial y cambiar el histórico declarado a una referencia
   explícitamente no publicada.

Mientras eso no ocurra, las rutas actuales se mantienen con el corte público de
74.142 y no se habilita un buscador que prometa el universo histórico.
