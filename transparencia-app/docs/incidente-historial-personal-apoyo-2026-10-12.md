# Recuperación del historial mensual de Personal de Apoyo de Cámara

## Referencia única

- Worktree: `C:\Users\jorge\.codex\worktrees\advisory-ui-total\cambiometro-audit`.
- App: `transparencia-app`; rama `codex/personal-support-month-history-20261012`, basada en `origin/main`.
- No desplegar el checkout divergente `Proyectos\cambiometro-public` ni el proyecto editorial.
- Baseline canónico comprobado: `projections/personal-apoyo-v1/personal-apoyo.json`, versión `2026-10-12T08-54-35-463Z`, SHA-256 `102be25708b75b3404311223ef1c522de776a224618d5a6fec9511988e3bc386`.

## Causa y alcance

El archivo vigente de Cámara conservaba un solo `mes_personal`/`personal_apoyo` por diputado. No contenía la serie mensual necesaria para seleccionar marzo. Las copias locales inspeccionadas mostraban julio o septiembre; esto **no demuestra que los reportes anteriores del usuario nunca hayan tenido marzo**. Esa conclusión previa era incorrecta.

El ETL ahora conserva `personal_apoyo_por_periodo`, une los cortes por ID/mes y mantiene el último publicado para compatibilidad. Un mes que la Cámara declara todavía no publicado se representa como `unpublished`; no aborta la recuperación, no desplaza septiembre y no aporta un cero al costo mensual.

La extracción directa por HTTP de las fichas sigue bloqueada por el origen. Se recuperó el histórico mediante la tabla nacional oficial accesible en Chrome: `https://www.camara.cl/transparencia/personalapoyogral.aspx`. Se guardó el DOM renderizado de sus filas, con el mes/año seleccionados, conteos y checksums. No es una captura inferida de nombres de archivo ni una copia de registros entre meses.

## Pasos y resultados

1. **Cerrado — extracción 2026:** nueve tablas completas en `C:\Users\jorge\Downloads\Camara de diputados\Personal de apoyo 2026\recuperacion-20261012`. Usar únicamente `imports-2026-complete.json`; el manifiesto intermedio y los archivos `.partial.html`/`.incomplete` son evidencia de capturas rechazadas y no entradas de publicación.
2. **Cerrado — vinculación:** padrón oficial Open Data de 633 IDs; 10.669/10.669 filas vinculadas, cero ambiguas y cero sin asignación. La tabla nacional escribe `Zamorano P., Fernado`; se contrastaron las cinco filas de marzo con la ficha oficial ID 1264 y se registró el alias exacto en `data/camara-personal-apoyo-nombres-verificados.json`. No se utiliza similitud aproximada para asignar IDs.
3. **Cerrado — conciliación del candidato:** por cada mes, conteo y suma coinciden con la tabla fuente. Senado, asignaciones y asesorías externas permanecen idénticos al baseline. El candidato contiene 244 IDs actuales/históricos; no representa 244 diputados vigentes. `filasCamara` mantiene su significado previo: último corte conservado por ID; no equivale a las 10.669 filas del historial.
4. **Cerrado — caso informado:** Jorge Alessandri, ID 1009, marzo: 9 filas y $8.468.195; abril–septiembre: 5 filas y $8.946.054 por mes. Enero/febrero se recuperan de sus propios cortes. Septiembre sigue seleccionado por defecto. Los registros repetidos de marzo corresponden a contratos distintos y conservan Inicio/Cese; no se etiquetan como nueve personas únicas.
5. **En curso — validación y promoción:** pruebas, CI/Pages, publicación R2 con preflight account-wide, verificación de la ficha y rollback. No declarar este paso cerrado hasta registrar los identificadores productivos y comprobar marzo/septiembre en el navegador.

| Corte | Filas | IDs presentes en la tabla |
| --- | ---: | ---: |
| 2026-01 | 1.122 | 155 |
| 2026-02 | 1.079 | 155 |
| 2026-03 | 1.966 | 239 |
| 2026-04 | 1.046 | 155 |
| 2026-05 | 1.079 | 155 |
| 2026-06 | 1.103 | 155 |
| 2026-07 | 1.084 | 155 |
| 2026-08 | 1.096 | 155 |
| 2026-09 | 1.094 | 155 |

Marzo incluye el cambio de legislatura: estos conteos no son personas únicas ni composición vigente. El alcance es enero–septiembre de 2026; no se afirma cobertura de otros años u octubre.

## Reproducción y prevención

- Reutilizar `scripts/import-camara-support-history.mjs` con `--manifest`, `--input` canónico, `--current-manifest`, `--output` aislado y `--expected-periods` (lista entre comillas). Valida SHA-256, archivo completo, filas, IDs, sumas y conservación de otras categorías antes de escribir el candidato.
- Mantener las tablas y `diputados-open-data.xml` en Descargas como evidencia. No versionar los universos en Git ni volver a descargar los nueve cortes cerrados.
- La tarea local automática sigue usando `origin/main` actualizado. Una ejecución de prueba del runtime puede indicar `--ref=<commit>`; debe ser un commit que ya incluya el cambio. Los archivos sin commit no se copian al worktree aislado.
- El backfill `--all-months` es explícito; las ejecuciones periódicas conservan la ventana corta y unen el histórico anterior. Ante bloqueo del origen se mantiene el release válido.
- D1 no participa en esta recuperación. La publicación utiliza la guarda de presupuesto R2 existente y conserva la versión anterior como rollback.
