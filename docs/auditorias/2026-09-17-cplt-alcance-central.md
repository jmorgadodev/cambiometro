# Auditoría de alcance CPLT central — 2026-09-17

## Resultado

La proyección central publicada en producción no está completamente aislada:
la consulta acotada `scope=central&tipo=municipalidad` devuelve `11.070`
filas. El release central declara `2.110.434` filas, por lo que esas filas
municipales representan una contaminación de alcance que debe corregirse antes
de recalcular cobertura o publicar un nuevo release.

La proyección municipal productiva declara `1.243.761` filas. La diferencia no
se interpreta como pérdida de remuneraciones: es una mezcla incorrecta del
alcance central con parte del universo municipal.

## Evidencia reproducible

Consultas de lectura realizadas contra producción:

| Consulta | Resultado |
| --- | ---: |
| `/api/v1/funcionarios?scope=central&tipo=municipalidad&limit=1` | 11.070 filas |
| `/api/v1/funcionarios?scope=municipal&tipo=municipalidad&limit=1` | 1.243.761 filas |
| `/api/v1/funcionarios?scope=central&periodo=2026-12&limit=1` | 0 filas |

La primera fila municipal observada en el alcance central pertenece a
`I. Municipalidad de Penco` y conserva `organo_tipo: municipalidad`.

## Causa y corrección preparada

El ETL de streaming ya filtra por alcance, pero el publicador aceptaba
proyecciones materializadas antiguas sin volver a comprobar la frontera. Por
eso un snapshot central previamente contaminado podía llegar al release.

La corrección agrega un filtro defensivo justo antes de construir índices,
resúmenes, archivos y manifiestos:

- el alcance central excluye filas cuyo organismo o tipo sea municipal;
- el alcance municipal sólo acepta filas municipales;
- las filas originales no se modifican;
- si el filtro dejara una categoría sin filas, las validaciones existentes
  detienen la publicación.

La corrección está en una rama separada y debe pasar CI antes de cualquier
publicación. Todavía no se escribió R2 ni se reemplazó el release productivo.

## Decisión operativa

No se deben calcular porcentajes de cobertura central ni sumar ambos alcances
hasta generar un release corregido y verificar sus conteos. La publicación se
mantendrá bloqueada mientras R2 permanezca sobre el umbral de almacenamiento.
