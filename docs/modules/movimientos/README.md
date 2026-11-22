# Movimientos

## Contrato y responsabilidad

Separar fecha de publicación, fecha efectiva y estado de confirmación. Una declaración hipotética de renuncia no confirma un cambio de cargo.

## Origen, ejecución y artefactos

Ejecutores: etl-movimientos.yml.

Artefactos: data/movimientos.json fijado por el release-set.

El calendario remoto canónico es .github/etl-calendar.json. Las rutas locales son relativas a cambiometro-public/transparencia-app; no instalar tareas desde worktrees. Verificar el corte del manifiesto publicado antes de usar copias locales.

## Verificación y recuperación

Desde transparencia-app: npm run check:movimientos-integrity; npm run verify:prod:movimientos.

Si el origen falla o se reduce la cobertura sin justificación, detener la publicación y conservar el último release válido. Registrar fallo, período, checksum y próxima acción en tasks/movimientos/evidence.md. No reactivar módulos secundarios como dependencia incidental. La recuperación de interfaz usa el artefacto previo; la de datos usa el release previamente validado.

## Archivos compartidos

Cualquier cambio de esquema, generador de slices, navegación global o release-set debe coordinarse con el integrador y sus consumidores. Consultar AGENTS.md antes de editar.

## Incremento local del 18-11-2026

Ver [evidencia de fase 5](../../../tasks/movimientos/evidence.md). El estado de automatización proviene del calendario canónico y se muestra separado del corte y cobertura. No acredita una ejecución sana. Preparado en local, pendiente de la entrega agrupada.

## Comparación y conteo de salidas

Ver [diagnóstico y corrección local](../../../tasks/movimientos/comparacion-renuncias-kast.md). Los casos de salida (incluidos nombramientos fallidos y pendientes) se cuentan aparte de nombramientos entrantes. Opiniones, recomendaciones e hipótesis no son anuncios. Una diferencia con otro catálogo requiere revisar identidad, fechas, tipo y evidencia; no se iguala su total automáticamente.

## Registro documental — 22-11-2026

[Entrega y limitaciones](../../../tasks/movimientos/entrega-registro-20261122.md), [especificación](../../../tasks/movimientos/especificacion-registro-20261122.md), [tarea y aceptación](../../../tasks/movimientos/renovacion-registro-20261122.md) y [recibo de validación](../../../tasks/movimientos/validacion-registro-20261122.json).

La proyección `lib/movement-register-source.ts` reutiliza el modelo original, isPublicMovementSignal, movimientoOfficialEvidence y las revisiones documentales existentes. No cambia estados ni fechas de origen. Conserva todos los IDs, no fusiona eventos por nombres y sólo relaciona fuentes ya incorporadas al mismo caso. El criterio de acto oficial individualizado no se sustituye por el estado verificado del catálogo ni por la presencia de una publicación institucional.

`lib/movement-register.ts` resuelve búsqueda, filtros, fechas, orden y paginación en memoria. `components/movimientos/` organiza registro, cronología, filtros móviles y detalle; reutiliza VotingPanel sin modificarlo. No hay API ni consultas por interacción. Los parámetros antiguos permanecen compatibles; movimiento=ID-original permite compartir un detalle.

Fechas cuestionadas: el listado identifica la publicación del respaldo y la revisión, conserva la fecha original en el detalle y no muestra una fecha efectiva inventada. Un anuncio sin effective_date no adquiere una fecha efectiva desde date. El usuario puede elegir la base temporal; los registros sin esa fecha permanecen en todos los períodos.

Verificación durante desarrollo: `npx vitest run lib/movement-register.test.ts lib/movimientos-public-copy.test.ts lib/movimientos-documentary-review.test.ts`. La suite de fixtures se ejecuta sobre los originales; no debe modificar un snapshot publicado para satisfacer una prueba. La entrega se revisa en navegador con el JSON publicado hidratado mediante el flujo existente y un recibo de origen. `scripts/verify-movement-experience.mjs` utiliza MOVEMENT_QA_BASE (localhost) y la captura verificada en artifacts/movimientos-renovacion/published-movimientos.json para comprobar todos sus IDs. No es un extractor ni sustituye el flujo UI-only con R2 vigente para una futura publicación.

El último resultado observado del ETL fue success el 22-11-2026 y el workflow estaba active. Sus archivos, calendario, conectores y almacenamiento no se modificaron. La verificación de 14 enlaces institucionales fue HEAD; los tres no verificables se identifican en el recibo y no se presentan como documentos descargados o revisados.
