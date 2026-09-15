# Bloqueo de promoción: nóminas centrales CPLT

Fecha de auditoría: 2026-09-15 (America/Santiago)

## Estado

El release productivo vigente se mantiene intacto. El candidato central no está aprobado para promoción.

| Artefacto | Filas | Generado | Resultado |
| --- | ---: | --- | --- |
| `funcionarios-v1` productivo | 1.226.913 | 2026-09-02 03:28:30 UTC | Vigente |
| `funcionarios-central-v1` candidato | 2.110.434 | 2026-09-14 03:51:42 UTC | Bloqueado |

## Evidencia del bloqueo

La auditoría remota del candidato encontró:

- 212 páginas de índice y suma de páginas consistente con 2.110.434 filas.
- Sin cobertura declarada por organismo, por lo que no se puede demostrar qué instituciones están incluidas.
- 2.951 filtros de período posteriores al corte de generación; entre ellos `2026-10`, `2026-11`, `2026-12` y períodos hasta 2029.
- 6.952 filas asociadas a esos filtros futuros.
- Una muestra de `2026-12` conserva montos y apunta a `TA_PersonalContrata.csv`, por lo que no se puede interpretar como remuneración efectivamente pagada en el corte de septiembre.

La ausencia de `transparency-summary.json` explica que el auditor no pueda reconciliar períodos declarados, pero no elimina el bloqueo de períodos futuros ni la falta de cobertura.

## Protección aplicada al ETL

En la rama `codex/normalize-remuneraciones-contract`, commit `ede9777`, la ingesta:

- calcula el período máximo del corte al iniciar;
- rechaza registros cuyo `fuente_periodo` sea posterior a ese corte;
- aplica la misma regla a nóminas centrales de honorarios;
- incluye pruebas específicas para períodos futuros.

Validación realizada: 13/13 pruebas específicas y lint aprobados.

## Próximo paso seguro

Regenerar el candidato fuera del disco local actual, que dispone de aproximadamente 5,49 GiB libres, y volver a ejecutar la auditoría de manifest, cobertura, períodos, conteos y checksum antes de cualquier publicación.

No se eliminó ningún objeto R2, no se modificó D1 y no se reemplazó el release productivo.
