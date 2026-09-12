# Auditoría de Transparencia Activa — 12 de septiembre de 2026

## Resultado de producción

El catálogo público de fuentes declara para CPLT:

- `1.226.913` registros;
- estado `partial`;
- última actualización `2026-09-02T03:28:30.598Z`;
- datos publicados en el lake, sin checksum de catálogo expuesto.

La ruta genérica `/api/v1/records?source=cplt` respondió `200`, pero con
`sourceBackend=none`, `sourceStatus=temporarily-unavailable` y cero filas. Por
tanto, el buscador de funcionarios y municipalidades usa sus índices/proyecciones
específicos; no se debe afirmar que el endpoint genérico permite recorrer todo
el universo CPLT.

## Comparación con local

El snapshot local `data/etl/source-health.json` declara:

- `1.218.136` registros;
- estado `partial`;
- última generación `2026-08-21T03:35:33.587Z`.

La diferencia es de `8.777` registros y una fecha de corte posterior en
producción. El plan local de publicación CPLT fue generado el `2026-08-30` y
contiene `1.515` assets de proyección, pero no expone un `totalRows` único en
el archivo de plan. Esto impide usarlo por sí solo como reconciliación de
cobertura total.

## Diagnóstico

No hay evidencia suficiente para declarar cobertura completa sólo por el
conteo del catálogo. La experiencia pública sí tiene proyecciones por
municipalidad y personal, pero el control debe conservar tres cifras
separadas:

1. filas publicadas en el release;
2. filas consultables por el índice correspondiente;
3. filas esperadas según el catálogo CPLT.

Las ausencias, montos no publicados, montos cero y posibles proporcionales
deben seguir siendo estados distintos. No se debe rellenar el faltante con
D1 ni descargar el universo completo al navegador.

## Siguiente paso seguro

Antes de ampliar historial, altas, bajas o cambios de sueldo, se debe generar
un manifiesto CPLT con `releaseId`, `recordCount`, `consultableRows`, períodos,
checksum y cobertura por organismo. La publicación debe rechazar el release
si la cifra de filas consultables no coincide con sus índices y debe mantener
el release anterior si una municipalidad o partición falla.
