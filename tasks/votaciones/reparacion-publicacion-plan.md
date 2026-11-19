# Conexión del explorador y publicación agrupada — 19-11-2026

Rama codex/votaciones-reparacion-publicacion-20261119, base 284a6900; origin/main 915fe31e obtenido. Jorge autoriza corregir y publicar todos los avances; después precisa reutilizar la automatización existente.

El backfill iniciado sin revisar esa conexión se detuvo a petición de Jorge. Sus checkpoints y prototipo quedan ignorados en artifacts, sin conexión a ETL ni escrituras remotas. La programación automática continúa intacta.

Diagnóstico: ingest-votaciones-full.mjs ya resuelve los nombres por data/diputados-ids.json; el nuevo explorador consumía nombres crudos del lake sin esa resolución. Se comparte el mismo catálogo por DIPID, sin atribuir afiliación actual ni modificar votos. Los 135 votos emitidos del ejemplo 91584 coinciden por ID y opción con el HTML oficial y las identidades resueltas coinciden por ID/nombre. «No Vota» del XML se presenta como «Sin voto emitido»; no equivale a asistencia ni diferencia pareos.

Alcance: consumidor lib/voting-explorer, explicación de VoteDetail/Metodología y pruebas. Sin cambios de ETL, cron, workflows o datos remotos. Mantener conciliación y rechazo de IDs/opciones duplicados o totales incompatibles.

Aceptación: nominal de Cámara y Senado visible; panel derecho y filtros ambas cámaras; 2026 completo consultable mediante cursores; pruebas integradas y preview con R2 vigente; promover el mismo artefacto; SHA/release/rollback documentados.

## Ajuste final solicitado antes de producción

Retirar de la cabecera el párrafo explicativo de profesión/formación/edad, conservando los campos. Ordenar Personal y asesores por importe descendente en ambas cámaras; empates por nombre. Verificar importes y períodos sin modificar ETL. Este cambio de interfaz exige un nuevo artefacto final UI-only, sustituyendo la preview 3f8404a8 para la promoción. Jorge autoriza expresamente producción después de estos ajustes.
