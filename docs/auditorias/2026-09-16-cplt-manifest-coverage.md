# Cobertura declarada en manifiestos CPLT — 2026-09-16

## Alcance

Revisión de los manifiestos remotos de `funcionarios-v1` y
`funcionarios-central-v1`. Se descargaron únicamente los manifiestos, no las
filas ni los archivos de cada organismo. No se consultó D1.

## Resultado

| Dataset | Release | Registros declarados | Filas de fuentes | Cobertura declarada | Resultado |
| --- | --- | ---: | ---: | ---: | --- |
| Municipal | `2026-09-15T08-08-44-566Z` | 1.243.761 | 1.243.761 | 346 municipios: 323 disponibles, 23 sin publicación | Conteo reconciliado |
| Central | `2026-09-14T03-51-42-634Z` | 2.110.434 | 2.110.434 | No desglosada por organismo en el manifiesto | Conteo reconciliado; falta detalle institucional |

El release municipal representa 93,35% de municipios con registros publicados
en su catálogo de 346 entradas; el 6,65% restante figura explícitamente como
no disponible y no se convierte en cero pagado. La suma de las cuatro fuentes
municipales coincide con el total del release.

El release central también coincide con la suma de sus cuatro fuentes, pero su
manifiesto no incluye una tabla de cobertura por organismo. Por eso no se puede
afirmar todavía qué instituciones están completas, parciales o ausentes sólo
con este archivo.

## Implicancias

- No hay evidencia de que la diferencia de conteos municipal/central sea una
  duplicación: cada release reconcilia su propio total con sus fuentes.
- La cobertura municipal permite informar ausencias por municipio sin
  descargar el universo.
- Para auditar el salto mensual por organismo y construir historiales se
  necesita publicar y validar el índice liviano por organismo y período; no se
  debe sustituir por una lectura global de D1.
- El índice central preparado localmente aún no se ha publicado porque el
  almacenamiento remoto está sobre el umbral interno.

## Retención remota

La auditoría de retención ejecutada el 2026-09-16, con una política de ocho
semanas, encontró 3.206 objetos de backup y 6.359.832.609 bytes protegidos, con
0 objetos vencidos y 0 bytes candidatos. Por lo tanto no existe una limpieza
automática segura bajo la política vigente.

El siguiente paso debe ser una revisión explícita de rollback por release y no
una eliminación por antigüedad aproximada. Cualquier borrado requiere una lista
cerrada de claves, verificación del puntero productivo y aprobación explícita.

