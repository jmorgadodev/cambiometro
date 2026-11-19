# Gastos · integración y cierre operativo

Autorización: Jorge pidió realizar la integración y verificación publicadas para cerrar la fase. Base remota verificada: `8d5a1cd3`. Raíz operativa: `C:/Users/jorge/Proyectos/cambiometro-public`; rama `codex/gastos-cierre-operativo-20261118`. Sólo se incorporan los commits de gastos; los prototipos visuales continúan en su rama local.

Hallazgo del preflight: OAuth de Wrangler lee R2, pero no sirve para derivar las credenciales S3 del publicador condicional. La publicación de Cámara se encadenará al workflow de gastos, con las credenciales de datos existentes de Actions, comprobación del candidato y CAS. No se crearán tokens ni se ampliarán permisos.

Archivos propios: ejecutor Cámara y wrapper, cargador de baseline mensual, promotor CI de candidatos Cámara, pruebas de gastos, workflow etl-expenses.yml, calendario y documentación del módulo. No cambiar navegación, diseño ni módulos pausados.

Aceptación: baseline canónico por mes, sin regresión a subsets antiguos; ausencia y ceros no verificados retenidos; Cámara incremental y reintentos de publicación tardía; candidato inmutable leído/verificado antes de CAS; revisión del candidato Senado; PR con CI verde; raíz canónica en main integrado; ejecución real de los ejecutores; artefacto publicado con SHA/release-set y comprobación de las dos fichas; rollback y próxima ejecución documentados.

No se declara completada la fase hasta obtener esos recibos. La ejecución de verificación puede iniciarse manualmente mediante el mismo ejecutor de producción; se distinguirá de un futuro disparo del calendario.

## Hallazgos de la ejecución integrada

PR #845 integrado en e85bcae6, CI completo verde. Ejecución real de Cámara: 155/155, 6.510 filas; código 2 por revisión oficial del ítem TRASLACIÓN de María Francisca Bello en agosto (626.161 → 573.641 CLP), confirmada con una segunda consulta independiente. La tarea restauró su acción original y no publicó datos. Septiembre sigue retenido por matriz de ceros.

El run Senado 44397039243 falló con SENADO_HTTP_403 desde GitHub antes de publicar. Se traslada la extracción al equipo local; CI conserva validación, revisión explícita por hashes y promoción CAS. El run 44398099390 verificó staging→CI de Cámara sin modificar el manifiesto. La fase sigue abierta hasta verificar ambos ejecutores y el artefacto final.
