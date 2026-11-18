# Gastos · integración y cierre operativo

Autorización: Jorge pidió realizar la integración y verificación publicadas para cerrar la fase. Base remota verificada: `8d5a1cd3`. Raíz operativa: `C:/Users/jorge/Proyectos/cambiometro-public`; rama `codex/gastos-cierre-operativo-20261118`. Sólo se incorporan los commits de gastos; los prototipos visuales continúan en su rama local.

Hallazgo del preflight: OAuth de Wrangler lee R2, pero no sirve para derivar las credenciales S3 del publicador condicional. La publicación de Cámara se encadenará al workflow de gastos, con las credenciales de datos existentes de Actions, comprobación del candidato y CAS. No se crearán tokens ni se ampliarán permisos.

Archivos propios: ejecutor Cámara y wrapper, cargador de baseline mensual, promotor CI de candidatos Cámara, pruebas de gastos, workflow etl-expenses.yml, calendario y documentación del módulo. No cambiar navegación, diseño ni módulos pausados.

Aceptación: baseline canónico por mes, sin regresión a subsets antiguos; ausencia y ceros no verificados retenidos; Cámara incremental y reintentos de publicación tardía; candidato inmutable leído/verificado antes de CAS; revisión del candidato Senado; PR con CI verde; raíz canónica en main integrado; ejecución real de los ejecutores; artefacto publicado con SHA/release-set y comprobación de las dos fichas; rollback y próxima ejecución documentados.

No se declara completada la fase hasta obtener esos recibos. La ejecución de verificación puede iniciarse manualmente mediante el mismo ejecutor de producción; se distinguirá de un futuro disparo del calendario.
