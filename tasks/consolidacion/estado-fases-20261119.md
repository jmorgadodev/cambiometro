# Estado conciliado de fases — 19-11-2026

Este registro sustituye los estados «preparado en local / pendiente de publicación» anteriores a la entrega #848. La fase 1 está completada; no repetir extracción, diagnóstico o publicación para volver a cerrarla. Los controles futuros del calendario son seguimiento operativo.

## Entrega comprobada

- PR integrado: https://github.com/jmorgadodev/cambiometro/pull/848
- Main: `39cc06d05e110ecd795e56d4d3726ff16f01a13a`.
- Código del artefacto: `bbd9a2f5fd2f8a9fc2bf6af2b0caedcd120071d7`.
- Preview: https://ec77507a.cambiometro.pages.dev/ ; producción inmutable: https://ddbe1173.cambiometro.pages.dev/ ; dominio: https://cambiometro.impulsacv.cl/ .
- Build UI-only: https://github.com/jmorgadodev/cambiometro/actions/runs/44517897826 ; promoción: https://github.com/jmorgadodev/cambiometro/actions/runs/44520016808 . Ambos completados; mismo artefacto y release, sin reconstruir ni ejecutar ETL.
- ReleaseSet: `5cd0a3da19dddbbcccc9ef8a12215bc35e9f0cde00c239892b48ab25225cd9bf`.
- SHA256 del archivo público release-set: `fd011de0e59e681e114e4e61c971c61d7352b0281acd6fe4dfd961f36ea7c484`.
- Evidencia: 13 recorridos públicos y 4 comprobaciones finales de fichas en escritorio/móvil. Comparación financiera conservó los importes no ausentes: Bianchi 9 meses y Kaiser 7; referencias de dieta julio/junio. CI del PR aprobado.
- Recibo público duradero: descripción del PR #848. Recibos locales reutilizables (ignorados por Git): `transparencia-app/artifacts/voting-panel/production-verified-receipt.json`, `published-final/receipt.json`, `staff-final-public.json`, `profile-finance-parity.json`.
- Rollback anterior: `ba68078f-c180-4e37-85fc-edb8cbbc6d83`; `npm run pages:rollback -- ba68078f-c180-4e37-85fc-edb8cbbc6d83` desde transparencia-app, sólo cuando se solicite una reversión.

## Fases y alcance real

| Fase | Estado de la entrega | Pendiente que no debe confundirse con republicación |
|---|---|---|
| 0 · Prototipos | Revisados; ajustes aceptados e incorporados a #848. | Ninguno de la entrega aprobada. |
| 1 · Gastos | Completada: correcciones de ambas cámaras promovidas, ejecutores y artefacto web comprobados. | Seguimiento del calendario; próxima extracción elegible el 22-11. No rehacer la fase. |
| 2 · Personal y asesorías | Correcciones de protección histórica, apoyo por partido y orden por importe entregados. | Revisar observaciones oficiales nuevas antes de promoverlas y diagnosticar el último resultado 1 de las tareas Cámara/apoyo y asesorías. No afirmar automatización sana por el éxito de la UI. |
| 3 · Dietas | Entregada: última referencia oficial positiva y mes real; ausencia no equivale a cero ni a pago de otro mes. | Reajustes nuevos se validan cuando existan en la fuente, sin imputarlos a todos. |
| 4 · Votaciones y Partidos | Explorador 2026, filtros por cámara, sesiones internas, historial de legislador, panel nominal derecho y apoyo partidario publicados. | Comisiones: contrato/datos/consumidor aún incompletos. Asistencia fue retirada por petición expresa; no implementarla como pendiente. El nominal reutiliza el mapa DIPID del ETL existente; no requiere un backfill nuevo. |
| 5 · Movimientos, Datos y Metodología | Cambios integrados y publicados. Datos conserva contenido/URL bajo En construcción; metodología actualizada al release. | Seguimiento de procesos activos y evidencia explícita del caso Cristián Bravo en la comparación de renuncias. No incluirlo por una opinión o anuncio. |
| 6 · Ficha parlamentaria | Completada: resumen, menú izquierdo/selector móvil, un panel, identidad, timeline y orden descendente de personal/asesores. | Ninguno de la entrega aprobada; conservar períodos e importes. |
| 7 · Dashboard | Implementado y validado en local; [evidencia](../dashboard/evidence.md). | Revisión de Jorge y futura fase 9; no publicado. |
| 8 · Reportajes | Pendiente de completar; nombre elegido por Jorge. | Revisar material del repositorio editorial separado y construir con evidencia conciliada. |
| 9 · Preview y publicación | Completada para #848. | Una nueva publicación sólo cuando Jorge la solicite; trabajar y agrupar avances en local. |

## Orden para continuar

1. Conservar este recibo y corregir las listas atrasadas; no ejecutar ETL ni repetir checks aprobados sólo para revisar el estado.
2. Resolver los seguimientos operativos concretos de Personal y registrar su causa sin reabrir Gastos. Comisiones y el caso documental de Movimientos siguen delimitados en sus módulos.
3. Continuar la fase 7 Dashboard, después la fase 8 Reportajes, usando datos ya publicados y verificados. Un plan escrito no equivale a funcionalidad entregada.
4. Aplicar la fase 9 a la próxima entrega agrupada cuando se autorice.

Menú vigente: Cámara, Partidos, Votaciones, Movimientos y Metodología. Las páginas aplazadas siguen accesibles con aviso; no deben deshabilitarse. Preservar landing y fuentes centralizadas.
