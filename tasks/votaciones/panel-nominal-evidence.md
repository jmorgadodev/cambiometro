# Panel lateral y nominales — evidencia local, 19-11-2026

**Estado posterior:** el bloqueo de Cámara descrito aquí quedó resuelto al reutilizar en el consumidor el mapa DIPID que el ETL ya empleaba. No requiere repetir la extracción. Prevalece reparacion-publicacion-evidence.md; esta nota conserva el diagnóstico provisional y su corrección.

Rama codex/votaciones-panel-nominal-20261119; base dfb9eb68; origin/main 915fe31e actualizado antes de editar. Repositorio canónico C:/Users/jorge/Proyectos/cambiometro-public. Se retomó Votaciones; no se modificó el proyecto de video enviado por error.

## Interfaz entregada

- Detalle de altura completa anclado a la derecha, entrada lateral y respeto a movimiento reducido. Móvil usa todo el ancho; contenido con scroll y cabecera de cierre fija.
- Botón de cierre, Escape y clic fuera; bloqueo de scroll del fondo, recorrido de teclado contenido y foco restaurado al disparador. Sin cambios de navegación o globals.css.
- Un mismo componente para Cámara y Senado: nombres, búsqueda sin distinguir acentos, filtros de opción y contadores cuando el registro supera validación. No Vota, Pareo y Dispensado sólo proceden de opciones publicadas.
- Validación por registro: nombres e IDs únicos, nombres presentes, opciones reconocidas y coincidencia con los tres totales conocidos. Vacío es unavailable, inconsistente es review; ambos conservan el resultado y sus totales. No se reconstruye una nómina desde el padrón.
- Metodología actualizada para explicar esta regla común. Los contratos públicos, datos R2, ETL y tareas remotas no se modificaron.

## Hallazgo que impide cerrar los datos nominales de Cámara

Se corrige expresamente la conclusión inicial: coincidir con el XML y con los tres totales NO acredita las identidades. Cámara 91584 tiene 155 filas, pero sólo 134 nombres distintos: 21 nombres se repiten con IDs diferentes. Por ejemplo, Sergio Bobadilla aparece con 815 y 1183; Gabriel Boric con 1056 y 1184. Sumar sus opciones produce 89/36/10, pero no habilita atribuciones individuales.

La página oficial de esa misma votación presenta nombres distintos, entre ellos Ignacio Achurra, y los mismos totales. La captura XML está repetida en el registro publicado; el problema no se corrige cambiando la posición del modal o sustituyendo el padrón por la nómina actual.

Fuentes de lectura:
- https://opendata.camara.cl/camaradiputados/WServices/WSLegislativo.asmx/retornarVotacionDetalle?prmVotacionId=91584
- https://www.camara.cl/legislacion/sala_sesiones/votacion_detalle.aspx?prmIdVotacion=91584
- https://opendata.camara.cl/wscamaradiputados.asmx/getVotacion_Detalle?prmVotacionID=91584

El HTML se pudo leer mediante la herramienta de consulta web, pero su descargador HTTP local recibió 403. getVotacion_Detalle devolvió un XML xsi:nil=true. No se eludieron esas respuestas ni se publicaron parches manuales. En las dos primeras páginas capturadas de Cámara, los 200 registros fallaron la conciliación; no se extrapola ese resultado a todo 2026. En la primera página senatorial, 64 de 100 pasaron y 36 requirieron revisión.

SHA256 XML capturado: 06d61c83be4b9000997b86772a36066f849156c371149ade2f6fe5fb33e2836d.
SHA256 registro API capturado: 90fbf9cd372653ac9c3601473e9eec6dfd5e492e1f5588a5f31c0333bbfa5743.

## Verificación

21 pruebas de voting-explorer/voting-workspace correctas, incluida la regresión de nombres duplicados que suman bien. Lint afectado, tipos y guards de tokens, enlaces, inyección y arquitectura correctos. Compilación final Next --webpack correcta: 4.885 páginas estáticas, incluidas las 205 rutas de legisladores. Se compiló la UI sin ejecutar los generadores/ETL de pages:build; no constituye un release de datos. Una herramienta temporal de diagnóstico TypeScript se retiró después de quedar incluida accidentalmente en el typecheck; la comprobación final pasa.

Chromium real, 1440/390/320 px: seis recorridos de ambas cámaras; panel alineado al borde derecho, alto de viewport, sin overflow horizontal. Se validaron cierre, foco y bloqueo del fondo. Senado 11490: 43 registros nominales (39 favor, 1 contra, 1 no vota y 2 pareos), búsqueda y filtros. Cámara 91584: advertencia visible y nombres inconsistentes excluidos. Axe: cero infracciones en los seis paneles. Cero errores JavaScript. Las respuestas GET publicadas se capturaron una vez y se reprodujeron sin cambios para las comprobaciones de tamaños.

Una comprobación adicional sin interceptar API confirmó los 43 registros del Senado y el panel derecho. Otra con fixture explícita de Cámara verificó nombres, filtro y búsqueda con acentos: prueba de interfaz, NO evidencia de cobertura publicada.

Capturas y recibos ignorados: transparencia-app/artifacts/voting-panel/{browser-receipt.json,live-receipt.json,synthetic-ui-receipt.json,panel-right-live-1440.png,senado-390.png,camara-390.png}. El servidor existente se conserva en http://localhost:3107/votaciones/.

## Estado y siguiente entrega

Interfaz lateral y reglas comunes verificadas en local. Cobertura nominal de Cámara PENDIENTE: no cerrar esta fase como datos íntegros de ambas cámaras. Próximo trabajo: obtener un detalle oficial descargable con identidades correctas, conservar evidencia por ID/fecha/opción, conciliar totales/dispensas y generar un candidato de datos separado; comprobar 91584 y muestras de meses de todo 2026 antes de promover un release. No usar afiliación actual para reparar votos históricos, deduplicar y recontar para forzar coincidencias, ni eliminar votos dudosos del archivo original.

No hubo push, CI, despliegue o publicación de datos. Para publicación agrupada rige UI-only con hidratación R2, SHA real y release-set, preview validada y rollback; la compilación local no acredita paridad con el release productivo.
