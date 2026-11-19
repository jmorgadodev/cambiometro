# Explorador parlamentario 2026+: incremento local

19-11-2026. Rama codex/navegacion-votaciones-local-20261119; hereda fff8d662 y todas las fases locales anteriores.

## Rutas y comportamiento

| Ruta | Alcance preparado |
|---|---|
| /votaciones/ | Catálogo de decisiones con filtros de cámara, año, materia/boletín y paginación |
| /votaciones/legisladores/ | Nómina incorporada de ambas cámaras, búsqueda por nombre/territorio/partido y acceso a fichas |
| /votaciones/proyectos/ | Agrupación por boletín de actividad incorporada desde 2026, entre cámaras |
| /votaciones/sesiones/ | ID de sesión cuando consta en el origen; el resto se distingue como jornada con registros |
| /votaciones/comisiones/ | Avance visible, cobertura pendiente y acceso a fuentes oficiales |
| /votaciones/asistencia/ | Avance visible, cobertura pendiente y acceso a fuentes oficiales; sin porcentajes inferidos de votos |

El menú principal apunta a /votaciones. /votaciones-destacadas conserva análisis, detalle y query votacion; se reconoce como alias del área activa y enlaza al explorador nuevo. Las rutas dinámicas usan generateStaticParams para los cinco submódulos; se consultó la guía Next instalada. No se modificó la landing. Los módulos sin necesidad de un catálogo de votos no lo reciben como payload.

Los filtros viven en la URL y se limpian sin recargar datos ni ejecutar ETL. Se excluyen fechas anteriores a 2026 y fechas imposibles; años siguientes aparecen sólo cuando tienen registros incorporados. Un proyecto ingresado antes de 2026 puede aparecer por una votación de 2026: el corte corresponde a actividad observada, no a fecha de ingreso. No se publican estados de tramitación completos ni se convierte el resultado de una votación en aprobación de una ley. La tarjeta identifica el boletín y rotula el texto como último registro incorporado, no como título acreditado del proyecto.

La colección sessions de la fuente contiene votaciones. El módulo nuevo no usa su longitud como número de sesiones: sólo reconoce el parámetro id_sesion en HTTPS web-back.senado.cl/api/votes. La Cámara y registros sin ID se agrupan por fecha/corporación como jornadas; no se declara una sesión única por día. El resultado no reconocido se muestra por verificar; no se infieren votos ni quórum.

## Referencia de navegación

Se revisaron https://www.votovisible.cl/ y sus apartados /legisladores, /votaciones, /proyectos, /sesiones, /comisiones y /asistencia. Se adoptó la organización por módulos; no se copiaron sus datos, métricas ni marca. Sus cifras no son fuente ni objetivo de igualdad para nuestro catálogo. La interfaz usa tokens visuales existentes y CSS module propio.

## Validación y límites

52 pruebas en seis archivos (voting-workspace, site-modules, header, defensible-pages, votaciones-ui, votaciones-destacadas). Las pruebas nuevas cubren el límite 2026+, fechas imposibles, filtro conjunto, boletines entre cámaras y distinción de sesión/jornada. Lint y tsc --noEmit correctos. La comprobación global de integración se actualizó, pero no se ejecutó suite/build/CI completa ni extracción oficial.

Navegador con el componente real y captura R2 reutilizada, SHA256 2a0a663b5ad7f659531ab60c4894bd9b072f95f0e6950bca6bb638b9c5b30425 validado contra manifiesto guardado: 1981 registros, nómina de 205 representantes. 1280/390 px; seis módulos, filtros en URL, búsqueda Kaiser, proyecto → votaciones, explicación de sesiones y avances de Comisiones/Asistencia. Sin errores de ejecución ni desbordamiento horizontal. Next Link se sustituye por ancla; CSS existente sin directivas Tailwind; no es build completo ni verificación tipográfica con fuentes Next. Recibo/capturas en transparencia-app/artifacts/votaciones-modulos/. Servidor y navegador se cierran al terminar. La captura no es una extracción actual ni acredita próxima ejecución.

## Pendientes por módulo

Comisiones: incorporar catálogo, integrantes, mandatos y sesiones/documentos con contratos y corte explícito, antes de inferir vínculos por boletín. Asistencia: validar actas/justificaciones y denominadores por cámara/fecha antes de porcentajes. Estos dos módulos son avances consultables, no indicadores operativos.

Votaciones: ampliar detalle nominal conciliado más allá de la selección editorial actual; las filas conservan fuente oficial y acceso al detalle previo con su estado de revisión. Proyectos: añadir tramitación oficial con eventos fechados; Sesiones: incorporar identificación documental de Cámara. Cada módulo tiene tarea independiente en tasks/votaciones/modulos/. Los cambios compartidos del contenedor se integran coordinadamente.

Preparado en local, sin push, PR, CI ni publicación. Entrega agrupada: hidratar release R2 vigente, validar rutas y datos integrados, generar un artefacto único verificado. Recuperación: revertir UI/rutas de este incremento, conservando /votaciones-destacadas y datos publicados.
