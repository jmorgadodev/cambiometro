# Evidencia local · Personal y asesorías

> Actualización 19-11-2026: los estados de publicación pendiente de este informe son históricos. La entrega #848 ya fue publicada y verificada; consultar [estado conciliado y recibo](../consolidacion/estado-fases-20261119.md). Conservar esta evidencia sin repetir extracciones o comprobaciones ya aprobadas. Los seguimientos operativos se registran en el tablero vigente.

Fecha: 18-11-2026, America/Santiago. [Plan](plan.md) y [recibo](local-evidence.json). Sin extracción nueva, escrituras remotas, CI ni despliegue.

## Resultado

Se reprodujeron cinco regresiones antes del cambio. Los totales mínimos globales permitían pérdidas de meses/oficinas; las respuestas no publicadas podían sustituir cortes disponibles. Ahora se comparan autoridad, período, contratos y multiplicidad de duplicados. Se retienen cambios de importes publicados, incluido null → 0, y pérdidas históricas. Las observaciones no publicadas conservan el corte anterior de apoyo y asesorías.

El comparador de candidatos Senado usa la misma protección que el runtime Cámara. Los errores son PERSONAL_APOYO_PUBLISHED_HISTORY_LOSS y PERSONAL_APOYO_PUBLISHED_AMOUNTS_REVISED; se conserva el release vigente y se revisa el candidato, no se fuerza la publicación ni se reconstruye desde Git.

## Datos de referencia

La copia publicada guardada pasa SHA-256 y tamaño contra el manifiesto estático del 2026-11-19T00:42:02.813Z: 244 autoridades Cámara (incluye historia), 70 oficinas Senado (incluye historia), cortes hasta septiembre de 2026; generado_en 2026-10-12T16:59:12.534Z. No son conteos de parlamentarios vigentes. La copia Git tenía 160 autoridades y Senado hasta agosto y no coincide con ese manifiesto: no sirve como reemplazo de producción. El snapshot verificado se reutilizó desde el worktree preservado sin reemplazar archivos versionados. Esto no acredita que octubre/noviembre ya estén disponibles en el origen.

## Verificación

59 pruebas en siete archivos, lint de los archivos cambiados y tsc --noEmit aprobados. Preparación sobre baseline verificado contra sí mismo: unchanged, sin publicación. No se ejecutó build, navegador o suite global porque no se modificó interfaz, configuración Next ni contratos de frontend.

Pendientes operativos: nuevas observaciones oficiales y validación/publicación de la entrega agrupada, cuando se autorice. No repetir este diagnóstico o una extracción completa para revisar la interfaz.
