# Cierre R2 de votaciones del Senado — 2026-09-14

## Alcance

Auditoría de sólo lectura del catálogo R2 productivo para `votaciones_senado`.
No se consultó D1, no se modificó R2 y no se desplegó código.

Comando ejecutado desde `transparencia-app`:

```text
npm run audit:r2:closure -- --source votaciones_senado --limit 10 --verify-artifacts
```

## Resultado

El catálogo declara siete particiones entre marzo y septiembre de 2026. La
comprobación física de los artefactos referenciados encontró:

- `missingArtifacts`: ninguno entre los manifiestos que sí pudieron leerse.
- `missingManifests`:
  - `partitions/votaciones_senado/2026/08/manifest.json`
  - `partitions/votaciones_senado/2026/09/manifest.json`
- `complete`: `false`.

Por tanto, el catálogo productivo no puede presentarse como cerrado para esta
fuente. La ausencia se mantiene explícita; no se convierte en cero registros
ni se reemplaza el último release válido.

## Comprobación de la fuente oficial

La ejecución local y aislada del conector, en modo seco, respondió sin errores:

```text
npm run etl -- --dry-run --source votaciones_senado --from 2026-09-01 --to 2026-09-13
```

Resultado para septiembre: 29 votaciones obtenidas, 0 errores y 0 archivos
escritos. Una lectura directa del conector para agosto y septiembre obtuvo 52
votaciones únicas: 23 en agosto y 29 entre el 1 y el 13 de septiembre, todas
con URL oficial. Esto indica que la fuente oficial responde; la incidencia
observada está en el cierre/publicación de los manifiestos R2, no en una fuente
que haya devuelto cero datos. El catálogo actualmente declara 23 filas para
agosto y sólo 5 para septiembre, por lo que septiembre también requiere
reconciliación de alcance antes de presentarse como completo.

## Próxima acción segura

Regenerar de forma aislada las particiones de agosto y septiembre, verificar
conteos y checksums, ejecutar nuevamente la auditoría de cierre y sólo después
evaluar una publicación incremental. Hasta entonces, la fuente debe mostrarse
como incompleta/desfasada y conservar el último release válido.
