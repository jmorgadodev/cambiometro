# Auditoría de remuneraciones en producción — 2026-09-17

## Alcance

Se consultaron únicamente manifiestos públicos y páginas pequeñas de la API
productiva. No se descargó el universo completo, no se consultó D1 y no se
escribieron releases.

## Conteos observados

| Superficie | Publicado/total | Consultable | Corte o actualización | Estado |
| --- | ---: | ---: | --- | --- |
| CPLT en catálogo de Remuneraciones | 1.203.287 | 1.203.287 | 2026-06 / 2026-07 | Parcial |
| CPLT municipal en API R2 | 1.243.761 | 1.243.761 | 2026-09-15 | Parcial |
| CPLT central en API R2 | 2.110.434 | 2.110.434 | 2026-09-14 | Requiere corrección de alcance |
| Registro 38 bis | 29.703 | 29.703 | 2025-01 / 2026-06 | Completo |
| Cámara · personal de apoyo | 1.084 | 1.084 | 2026-08 | Parcial |
| Senado · personal de apoyo | 2.989 | 2.989 | 2026-08 | Parcial |
| DIPRES | 15.689 | No aplica | 2026-07 | Agregado |

Los 1.203.287 del catálogo y los 1.243.761 de la API no son el mismo release.
La diferencia de 40.474 filas queda clasificada como diferencia de release o
alcance, no como pérdida de datos, hasta reconciliarla por organismo y período.

## Hallazgo crítico CPLT central

La API productiva todavía permite observar 11.070 filas municipales dentro
del alcance central. El conteo central también incluye 6.952 filas de períodos
que el nuevo publicador excluiría por ser inválidos o posteriores al corte.

El dry-run del release corregido deja:

- 2.092.412 filas centrales válidas;
- 0 filas con `organo_tipo: municipalidad`;
- 18.022 filas excluidas en total: 11.070 por alcance y 6.952 por período.

La corrección del publicador está fusionada en PR #579. Además, el PR #581
agrega una defensa de lectura para que las búsquedas centrales intersecten el
índice de organismos de servicio mientras producción conserva el release
anterior.

## Consultas nominales de control

| Consulta | Resultado |
| --- | ---: |
| Lucy Depablos, todas las fuentes | 7 registros |
| Sofía Pumpin, todas las fuentes | 1 registro |
| María Victoria Raimann Pumpin, todas las fuentes | 1 registro |
| Río Sebastián Torrealba del Río, todas las fuentes | 1 registro |
| Independencia, alcance municipal | 8.161 coincidencias |

Estas consultas confirman que la búsqueda nominal responde, pero no prueban
que el catálogo público tenga todos los organismos ni que los cortes sean
comparables.

## Calidad observada

- Municipal: 159.705 registros con incidencias; 159.679 corresponden a líquido
  no informado.
- Central: 563.221 registros con incidencias; 563.169 corresponden a líquido
  no informado.
- Los valores originales se conservan; las incidencias no convierten un dato
  faltante en cero.

## Decisiones

1. No mostrar porcentajes de cobertura entre catálogo estático y API hasta
   reconciliar release, organismo y período.
2. No presentar el conteo central actual como limpio.
3. Promover primero la defensa de lectura y luego el release corregido, cuando
   R2 tenga margen y exista rollback verificable.
4. Repetir la misma auditoría para municipalidades por organismo antes de
   construir historiales o detectar duplicados a escala.

