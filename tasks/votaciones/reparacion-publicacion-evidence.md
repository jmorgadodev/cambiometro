# Resolución del nominal existente — 19-11-2026

Jorge autorizó corregir Cámara y subir los avances, y precisó que se reutilizara el ETL ya operativo. Rama codex/votaciones-reparacion-publicacion-20261119; base 284a6900, origin/main 915fe31e obtenido.

## Causa corregida

El explorador nuevo no aplicaba la resolución de identidades que ya usa scripts/ingest-votaciones-full.mjs: data/diputados-ids.json asocia el DIPID oficial al nombre. La salida cruda del lake contiene nombres antiguos/repetidos, aunque sus IDs y las opciones emitidas del ejemplo son correctos. Mi diagnóstico inicial confundió ese defecto del consumidor con la necesidad de extraer de nuevo el archivo completo.

Se comprobó el último workflow automático de Cámara: ejecución 44346890944, success, 18-11-2026, consolidó 1.477 decisiones de Cámara y 504 del Senado en la proyección estática. La consulta general de la API también incluye enero/febrero, fuera de ese catálogo estático del período vigente. La tarea Windows de votaciones Senado conserva la raíz canónica, último resultado 0 y próxima ejecución programada. No se ejecutaron ni alteraron esas automatizaciones.

El backfill manual equivocado fue detenido después de registrar progreso 25/1.814. Sus checkpoints y prototipo se conservaron bajo artifacts/camara-nominal-2026 y artifacts/voting-panel/unused-backfill-prototype, ignorados por Git; no se integraron. No hubo escrituras R2/D1, cambios de manifests, ETL o calendario. La lectura R2 local con el token de la sesión devolvió 401; la publicación usa el workflow existente con sus credenciales de datos, sin cambiar permisos ni buscar secretos.

## Solución y contraste

voting-explorer reutiliza el mismo mapa DIPID del ETL para Cámara y conserva opciones y totales. No aplica ese mapa a Senado, no modifica fuentes y no asigna partido actual a votos históricos. Las identidades desconocidas conservan el nombre publicado y siguen exigiendo unicidad y conciliación; opciones desconocidas o totales incompatibles permanecen en revisión.

91584: al resolver nombres, las 155 filas son únicas. La página oficial presenta 89 A Favor, 36 En Contra, 10 Abstención y 8 Pareados; los 135 votos emitidos coinciden por ID/opción con el registro publicado y las 143 identidades del HTML coinciden por ID/nombre con el catálogo existente. El XML agrupa no emisiones de otra forma: se muestra Sin voto emitido en lugar de inferir ausencia o negar un pareo. La fuente original conserva su URL y las opciones originales; no se fabricaron registros para llenar las diferencias.

El HTML oficial de contraste y su checksum ya constaban en artifacts/voting-panel. Fuentes:
- https://www.camara.cl/legislacion/sala_sesiones/votacion_detalle.aspx?prmIdVotacion=91584
- https://github.com/jmorgadodev/cambiometro/actions/runs/44346890944

## Verificación local

23 pruebas de voting-explorer/voting-workspace: nombres resueltos, duplicados desconocidos rechazados, IDs por cámara, faltantes, opciones, fechas y totales. Navegador a 1440/390/320 px: Cámara 155 filas, filtro A favor 89; Senado 43, filtro A favor 39; búsqueda, cierres, foco, panel derecho de altura completa. Axe sin infracciones en los seis recorridos; cero errores JS. Se reutilizaron GET publicados sin modificar su contenido para las tres anchuras. Evidencia browser-receipt.json y capturas en artifacts/voting-panel.

Suite integrada: 323 archivos y 2.060 pruebas correctas; typecheck de aplicación/API y guards de arquitectura, tokens, enlaces e inyección correctos. Lint completo: cero errores, 216 advertencias, sin bloquear la entrega.

## Publicación agrupada

Actualizar el PR #848 existente con todos los commits acumulados. No crear otra tubería ni repetir ETL. pages-ui-refresh hidrata R2 vigente y produce preview verificable; producción recibirá ese mismo artefacto mediante pages-promote-artifact, con SHA/release-set y rollback registrados en tasks/entregas. Estado de publicación: pendiente de CI y verificación del artefacto; no se da por publicado por el éxito de Git push.

## Falso positivo de seguridad confirmado

Gitleaks señaló como generic-api-key el checksum público del registro capturado, introducido en 284a6900, tasks/votaciones/panel-nominal-evidence.md:27. Se cotejó el valor con el SHA256 real del archivo de evidencia. .gitleaksignore contiene únicamente la huella exacta de ese hallazgo histórico; no una regla general ni una exclusión de carpeta. Se retiró la palabra API del rótulo que inducía el falso positivo. Ningún secreto se ignoró ni se desactivó la puerta de seguridad. Esta corrección documental no cambia el árbol de la aplicación ni el artefacto Pages ya en construcción.

## Recorrido de referencias actualizado

El E2E heredado exigía tres enlaces directos con target blank en Últimas del Senado. Se actualiza para exigir tres accesos internos a Fuentes y alcances, comprobar HTTPS/dominio oficial y abrir esa vista dentro del sitio; allí exige la URL original exacta y noopener/noreferrer. El recorrido pasó contra la preview pública. Esta modificación de verificación no cambia app/components/lib/data/public ni los generadores del artefacto; se reutiliza la preview 3f8404a8.

Contraste financiero directo contra producción: todos los importes no ausentes y los meses permanecen iguales en Carlos Bianchi (9 meses, dieta julio 2026) y Vanessa Kaiser (7 meses, dieta junio 2026). Recibo profile-finance-parity.json en artifacts/voting-panel. No se ejecutó ningún ETL para esta comparación.
