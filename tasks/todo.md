# Lista de trabajo inmediata

## Estado de cierre actualizado — 25-09-2026

Este resumen prevalece sobre los estados históricos fechados más abajo cuando
existe evidencia posterior. Los porcentajes son estimaciones por criterios de
cierre verificados; no representan cobertura de datos ni una métrica automática.

### Cerrado

- [x] Buscador global, fichas, footer y SEO municipal: desplegados en Pages y
  smoke productivo HTTP 200; workflow `36078815272` exitoso.
- [x] Movimientos separa las 46 salidas reconciliadas del Ejecutivo de las dos
  señales en confirmación. Reemplazos parlamentarios quedan fuera de ese conteo.
- [x] ETL remoto diario de votaciones Senado retirado de workflow y calendario
  versionados; PR #621 integrado con checks verdes. La tarea local de Windows
  permanece registrada y `Ready`; la reparación manual aislada queda.

### Pendiente priorizado

| Bloque | Avance estimado | Próximo criterio para cerrar |
| --- | ---: | --- |
| Historial de mandatos parlamentarios — **nuevo** | 10% | Capturar cortes oficiales por ID y asiento; comparar altas/bajas; confirmar fechas con evidencia; conservar períodos cerrados sin sumarlos a Movimientos del Ejecutivo. El análisis encontró que la tabla D1 actual no basta como historial público y su materialización remota está deshabilitada por defecto. |
| Gastos Senado | 75% | Reconciliar en producción las 25 filas de diferencia API/R2 vs. estático y confirmar el recorrido histórico. Se validaron por API 2012-01 (307), 2026-06 (1.248) y 2026-07 (1.250); faltan 171 cortes para probar 174 meses y el delta estático sigue abierto. |
| Votaciones Senado | 60% | Validar el lote local de 6 IDs (11341–11346) contra el origen y publicarlo sólo con conteos completos y rollback. |
| ChileCompra | 60% | Resolver el 403 del archivo mensual o mantener el corte válido; publicar sólo un período verificable, nunca el resultado vacío. |
| Remuneraciones y calidad CPLT | 55% | Terminar duplicados/calidad municipales, revisar el corte central contaminado y reconciliar el salto de julio con la parcialidad de agosto-septiembre; luego construir historiales por lotes. |
| Backups y capacidad R2 | 30% | Obtener medición vigente, inventario/checksums y restauración probada; sólo entonces decidir retención selectiva. No borrar backups ni publicar una proyección grande antes de asegurar margen y rollback. |
| Aislamiento y consumo D1 | 85% | La materialización remota no corre por defecto. Falta recuperar una lectura vigente de consumo/cuotas para certificarlo; no ejecutar escaneos ni cargas masivas. |
| Auditoría integral ETL → R2 → API → páginas | 60% | Cerrar deltas conocidos por fuente, corte y checksum; repetir smoke productivo y registrar fallos externos que siguen conservando el último release válido. |

**Avance global estimado: 65%.** Es una estimación ponderada de los bloques
anteriores. La última auditoría de fuentes amplia es 23-09-2026; se añadió una
verificación puntual de Gastos Senado el 24-09, sin cerrar su cobertura histórica.
el despliegue UI-only del 25-09 no refrescó ETL ni modificó R2/D1, así que no
debe interpretarse como una actualización de los datos.

## Ahora, sin D1

- [x] A. Congelar línea base y rollback por fuente.
- [x] B. Corregir el contrato R2 de Movimientos en la rama local.
- [x] C. Reconciliar Cámara y Senado por componente y período; diferencia local/R2 documentada.
- [x] **Checkpoint 1 local:** 957 tests, typecheck, lint, build Pages y browser smoke verdes.
- [x] **Checkpoint 1 remoto:** preview del Worker y API de Movimientos validados desde R2, sin lecturas públicas D1.
- [x] Promoción controlada del Worker candidato y smoke productivo completados.
- [x] D1. Auditar ChileCompra, InfoLobby, DIPRES y Transparencia Activa en el candidato, sólo por R2.
- [x] Reconciliar las 92 filas de InfoLobby mediante índice R2 acumulado versionado, sin D1.
- [x] Separar corte vigente/histórico de ChileCompra; mantener el snapshot válido mientras el origen responda HTTP 403.
- [x] E. Ejecutar auditoría de consistencia y calidad en producción/R2/candidato.
- [x] **Checkpoint 2:** checksums, paginación y ausencia de lecturas públicas D1 validados.
- [x] F. Promoción controlada del Worker y verificación productiva completadas.
- [x] Integrar PR #493 sobre `main`; candidato Worker validado con R2-first y sin D1 público.
- [x] Promover explícitamente el candidato `8fffd277-d5b5-4330-bdd8-7abc04c18f3a` para corregir el 1102 productivo de ChileCompra.
- [x] Reconciliar catálogo R2 contra filas consultables por fuente sin usar D1.
- [x] Separar en la UI catálogo declarado, publicados y consultables; comenzar por ChileCompra; corregir metadata R2 de InfoLobby.
- [x] Preflight de fuentes sin escritura: Cámara, Senado y los cinco orígenes de Movimientos respondieron correctamente el 2026-09-12.
- [x] Reparar/publicar sólo la variante R2 `votaciones_camara`; PR #495 fusionado y Worker `d2f82268-b1af-4481-a67b-d1f8953f0fc6` promovido. Alias validado en producción desde R2, sin D1.
- [x] Reconstruir las 7 particiones históricas faltantes de Cámara en R2; manifiestos y registros verificados por checksum, alias y fuente canónica completos en producción.
- [x] Verificar las 2 particiones históricas de Senado en R2 (2025-08: 121; 2026-02: 7) contra sus manifiestos y registros publicados, sin reconstruir ni duplicar artefactos.
- [x] Auditar la retención de R2 en modo lectura (2026-09-16): 0 snapshots expirados y 0 bytes candidatos; no se ejecutaron `PUT` ni `DELETE`.
- [x] Auditar las proyecciones CPLT productivas sin descargar el universo: municipal 1.243.761 y central 2.110.434; búsqueda `scope=all` verificada con consultas nominales acotadas.
- [x] Detectar la discrepancia entre la tarjeta estática CPLT (1.203.287) y el release productivo municipal; documentada sin modificar R2 ni D1.
- [x] Blindar el publicador para que el alcance central vuelva a excluir municipalidades; PR #579 fusionado el 2026-09-17.
- [x] Confirmar mediante dry-run que la corrección central elimina 18.022 filas fuera de alcance y conserva 2.092.412 filas válidas.
- [ ] Publicar la proyección central corregida después de resolver capacidad y rollback de R2; producción aún conserva el release contaminado anterior.
- [ ] Auditar y depurar backups R2 con lista explícita de objetos, sin borrar ningún snapshot hasta verificar su restauración.

## D1 después del reinicio — comprobado 2026-09-16

- [x] Medir cuota D1 post-reset: nivel `ok`; 5.192 filas leídas y 57 escritas en la sonda `35136580370`.
- [x] Identificar los consumidores de `transparencia-db` fuera del Worker público: workflows ETL opcionales, registro de estado CPLT y export de backup sólo manual; evidencia en `docs/auditorias/2026-09-16-consumidores-d1.md`.
- [x] Confirmar que no existen lecturas masivas nuevas en la sonda: sólo se ejecutó una página de Cámara y no hubo SQL masivo.
- [x] Verificar compuertas de materialización programada; todas requieren `workflow_dispatch` y confirmación explícita.
- [x] Ejecutar un preflight acotado con una página de Cámara; respondió desde R2.

## Trabajo habilitado antes del reinicio D1

- [x] Validar conectividad y fechas máximas de Cámara/Senado sin ejecutar ETL.
- [x] Validar conectividad de las fuentes de Movimientos sin reemplazar el snapshot.
- [x] Revisar manifiesto R2 y preview de `votaciones_camara` sin usar D1.
- [x] Auditar paginación R2 con tamaños pequeños y registrar respuestas 1102
  intermitentes sin desplegar un parche.
- [x] Preparar y validar en preview el hardening de paginación R2 (PR #497),
  con pruebas `limit=1/10/25/50` y cursor en InfoLobby, ChileCompra y DIPRES;
- [x] Promover PR #497 al 100% y verificar health, páginas 1–2 y límites 1/10/25/50
  en producción; el verificador productivo largo quedó exitoso.
- [x] Ejecutar el verificador de calendario ETL (`34717871931`) sin tocar D1.
- [x] Inventariar las carpetas maestras locales; sólo existen `public`, `audit`
  y `editorial` (20,46 GiB combinados), sin eliminar contenido.
- [x] Reconciliar el alcance de Senado 2025-08 y 2026-02 contra los
  manifiestos y registros publicados en R2, sin rehidratar D1.
- [x] Revisar el corte vigente/histórico de ChileCompra y la publicación de
  InfoLobby sólo desde producción/R2; no rehidratar D1.

### Evidencia de cierre — 2026-09-13

- Senado 2025-08: 121 registros; manifiesto y archivo de registros verificados
  por checksum, sin cambios adicionales.
- Senado 2026-02: 7 registros; manifiesto y archivo de registros verificados
  por checksum, sin cambios adicionales.
- ChileCompra: 74.142 registros corresponden al corte público actual; 888.693
  es la referencia histórica declarada y permanece separada como cobertura no
  disponible completa para recorrido. La guardia del proceso aborta antes de
  escribir si el origen devuelve HTTP 403, vacío o un resultado inválido.
- Interfaz: los detalles técnicos de infraestructura no se muestran en la
  experiencia pública; quedan sólo en pruebas, auditoría y configuración.

### Pendientes actuales de datos

1. [x] Corregir la presentación del conteo CPLT para separar municipalidades y
   organismos centrales; no usar el valor estático 1.203.287.
2. [x] Auditar los cortes CPLT productivos por período; evidencia en
   `docs/auditorias/2026-09-16-cplt-cortes-r2.md`.
3. [ ] Completar la matriz de calidad de nombres, montos, períodos y duplicados
   desde manifiestos R2, sin cargar el universo en D1. La auditoría de metadatos,
   montos y períodos quedó documentada en
   `docs/auditorias/2026-09-16-calidad-remuneraciones-r2.md`; falta el conteo
   reproducible de duplicados exactos y la revisión por organismo. El snapshot
   central local ya fue revisado: 2.110.434 filas, 0 duplicados exactos; falta
   repetirlo para municipal.
4. Construir historiales, altas, bajas y cambios de monto por lotes pequeños.

### Bloqueante operativo actual

La cuenta R2 suma 17.437.837.684 bytes entre el bucket público y backups; el
bucket público suma 11.078.005.075 bytes. La guardia de publicación al 95% se
mantiene activa. La decisión de respaldo y la secuencia para liberar espacio
están documentadas en `docs/auditorias/2026-09-17-decision-backup-r2.md`.

### Pendientes de normalización habilitados

- [x] Retirar la gráfica general de evolución y el acceso “Ver detalle mensual”
  del recorrido público de Remuneraciones; se conservan las fichas y las
  comparaciones detalladas que sí tienen filas originales.
- [x] Preparar el índice R2 liviano por organismo y período para explicar la
  cobertura sin leer el universo ni usar D1. Queda pendiente validarlo en CI y
  publicarlo con el siguiente release de cada alcance.
- [ ] Auditar el salto de julio y la caída de agosto/septiembre por categoría
  y organismo antes de ampliar la interfaz o incorporar pagos. La señal quedó
  confirmada en ambos releases productivos y documentada; falta el desglose
  por organismo y archivo de origen.

## Fuera de alcance

- [ ] No tocar `cambiometro-editorial`.
- [ ] No cambiar nombres ni estructura del menú.
- [ ] No limpiar ni resetear cambios sucios existentes.
- [ ] No publicar código sin preview y checkpoint.
