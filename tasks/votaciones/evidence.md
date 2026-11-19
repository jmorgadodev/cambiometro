# Evidencia local · Votaciones y Partidos

18-11-2026, America/Santiago. [Plan](plan.md), [recibo y huellas](local-evidence.json). Incremento guardado en local, no publicado.

## Datos y comportamiento

Se verificó por SHA-256 y tamaño la copia publicada guardada contra su manifiesto estático del 2026-11-19T00:42:02.813Z. Cortes observados: Senado: 504 sesiones, última fecha 2026-11-17; Cámara: 1477 sesiones, última fecha 2026-11-17. Es una captura guardada, no acredita una consulta nueva al origen. No se reemplazaron los JSON versionados por esa copia.

Se reprodujeron seis regresiones: agrupación histórica por partido actual, atribución sin historial, separación falsa entre Sí/Afirmativo, fechas imposibles, conteos inválidos y tarjetas repetidas.

La resolución por militancia exige fecha inicial, respeta el término y devuelve desconocido ante rangos incompatibles. El detalle nominal conserva al parlamentario sin atribuirle partido histórico; esa fila no forma una bancada ficticia. Cohesión utiliza cada fecha/cámara, excluye grupos con registros ausentes/duplicados/no interpretables y conserva sólo votos emitidos en el denominador. Los agregados desactivados siguen en revisión.

La Home conserva las tres tarjetas y el foco central. Fechas imposibles se descartan; conteos vacíos/no enteros/no seguros no generan porcentajes publicados. La fusión de respuestas mantiene el corte más reciente, deduplica IDs y alias sen-vot-/senado-vot- e incorpora respuestas nuevas parciales sin borrar el resto. Las fechas de cada tarjeta corresponden a su fuente.

El resultado es el de la sesión oficial; no se deduce aprobación de si >= no ni se presume quórum. La propiedad histórica resultadoRecalculado se conserva por compatibilidad, con el resultado oficial. El guard editorial comprueba el mismo dato y valida el hostname oficial de sus enlaces.

## Verificación

53 pruebas en siete archivos; guard de ocho destacadas; lint de archivos cambiados y tipos aprobados. Navegador Chromium con el componente real HomeFeaturedVotes, en un harness local: Next Link se sustituye por un enlace y la API se intercepta con datos sintéticos. Tres respuestas controladas, escritorio 1280 y móvil 390, sin errores de ejecución; una respuesta antigua no desplaza a la nueva. Recibo/capturas en transparencia-app/artifacts/votaciones/widget-verification/. No es una revisión completa de la landing productiva.

## Entrega pendiente

Cuando Jorge solicite la entrega agrupada: fijar el release vigente de R2 para ambas cámaras, compilar una vez y revisar landing y páginas de partidos completas en preview. No activar cohesión/apoyo agregado sin cobertura acreditada. No ejecutar runtimes programados sólo para revisar UI: pueden autenticar, consultar origen y encadenar publicación. No repetir esta extracción/diagnóstico por cada ajuste.
