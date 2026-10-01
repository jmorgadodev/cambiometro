> Histórico (septiembre de 2026). El tablero operativo vigente es
> [tasks/stability/todo.md](stability/todo.md). Sus porcentajes se calculan por
> puertas verificadas, no por estimaciones históricas.

# Lista de trabajo inmediata

## Actualización crítica — Contraloría (28-09-2026)

- [ ] **R2 — 81,8% de almacenamiento de cuenta (lectura 28-09):** 8.180.607.166
  de 10.000.000.000 bytes sumando el bucket público (7.131.123.983) y backups
  (1.049.483.183). Está sobre la advertencia del 80%, bajo la revisión del 90%
  y el bloqueo al 95%; quedan 1.319.392.834 bytes hasta el bloqueo. El inventario
  publicado del bucket principal está atrasado: omite 183 objetos/89.689.856
  bytes y tiene una diferencia de tamaño de 84.078 bytes. El guard de publicación
  consulta el inventario vivo, pero debe conservarse esta discrepancia para
  corregir/reconciliar el índice, sin borrar objetos. No publicar un release
  nuevo sin tamaño proyectado y preflight de cuenta completo.

- [ ] **Contraloría — 60% técnico (3/5 etapas; los datos siguen sin reconciliar):** ya se compararon el catálogo R2
  (310), el manifiesto ETL (284) y los registros por partición (275 legibles +
  35 esperados de agosto, cuyo manifiesto falta); también se validó el backup y
  se corrigió en código el `expectedTotal` literal que exponía 291 durante una
  caída. El generador local ya deriva sus conteos desde las filas y falla ante
  discrepancias; la proyección existente coincide (275/210/248). Pasan los 24
  tests del Worker, 3 pruebas del generador, `api:typecheck`, `api:size` y el
  smoke del preview aislado R2-only (`36383543138`); la paginación sigue
  marcando la partición ausente. Falta reconciliar la versión por período y
  recuperar/regenerar agosto con fuente oficial y preflight de tamaño; luego
  validar datos y búsquedas en producción. Sin restaurar el backup de 3 filas,
  escribir R2, materializar D1 ni promover producción mientras los conteos
  discrepen.

  **Nuevo hallazgo de cobertura (28-09):** se relevaron los 43 listados
  oficiales (27 centrales y 16 regionales); quedaron visibles 33 filas de
  agosto, que son sólo un mínimo observado. Varias vistas muestran hasta 10
  filas recientes sin paginación aparente, y el ETL lee únicamente las filas
  cargadas. El 35 de catálogo aún no se pudo reconciliar y el ETL no debe
  presentarse como universo completo. Falta ubicar filtros/endpoints oficiales
  de alcance completo y cotejar IDs antes de regenerar o publicar.
  También se verificó que la clave canónica del payload de agosto no existe
  en R2. Se añadió localmente una barrera para que el ETL no reemplace una
  partición de Contraloría con un conteo menor al publicado; 2 regresiones
  prueban 33<35 bloqueado y 35=35 permitido. No recupera el payload ni está
  desplegada. La sección oficial Datos Abiertos ofrece además bases hasta 2025
  (municipal hasta 2024); no sirven para reconstruir agosto 2026. Sólo se
  consultaron sus tamaños HTTP, no se descargaron ni integraron.

  **Endpoint oficial nuevo (28-09):** el Geoportal publica resúmenes por
  comuna y un listado de informes por código comunal. Sus agregados 2026
  coinciden: 22 en el resumen global, 22 en los resúmenes por región y 22 filas
  detalladas en 20 comunas. El subconjunto municipal incluye tres informes de
  agosto (Concepción, Navidad y Putre), potenciales para cotejo, pero no
  reconcilia las 35 filas del lago Contraloría, que incluye un alcance distinto.
  La API productiva de Cambiómetro confirma que agosto sigue sin estar
  consultable (`publishedRows=0`, `expectedRows=35`, partición faltante). Falta
  cotejar IDs/documentos y localizar evidencia oficial para las otras filas;
  no sumar automáticamente estos 3 registros ni declarar recuperado el corte.

- [ ] **DIPRES — 80% técnico:** el manifest estático R2
  productivo referencia la proyección completa correcta (476 filas, 476 IDs
  distintos, checksum válido), pero el subset de 60 filas publica
  `totalPrograms: 320` y omite `count`. La aplicación usa la proyección
  completa cuando está disponible; el total 320 es un defecto del fallback,
  no la cobertura de la vista normal. Se confirmó que los 60 registros del
  fallback local coinciden exactamente con 60 programas de la proyección R2
  completa (476 IDs únicos); el artefacto local ahora declara `count=60` y
  `totalPrograms=476`, con prueba de regresión (4 pruebas verdes) y `typecheck`.
  El 28-09-2026 el build completo de Pages sí se validó localmente usando el
  release canónico paginado de Ley 19.862, que es el que hidratan los workflows
  oficiales: 62.172 filas, 1.244 páginas y checksum
  `9615b9e0453a3dcbb849114295d3803a3aaeec84c336669efb0e2afe6f800825`; coincide
  con el manifiesto R2. `npm run build` terminó en 0 y generó 4.675 rutas; el
  smoke Playwright local pasó 101 comprobaciones. Esto corrige la conclusión
  anterior: la ausencia de las ocho claves de manifiesto del lago histórico
  (enero–agosto 2026) no bloquea Pages, pues el release API canónico existe y
  está verificado. Siguen pendientes preview/publicación, revisión de frescura
  DIPRES (release 21-08-2026) y reconciliación de las claves históricas
  ausentes; no se escribió R2/D1 ni se desplegó.

## Estado de cierre actualizado — 25-09-2026

Este resumen prevalece sobre los estados históricos fechados más abajo cuando
existe evidencia posterior. Los porcentajes son estimaciones por criterios de
cierre verificados; no representan cobertura de datos ni una métrica automática.

### Cerrado

- [x] Buscador global, fichas, footer y SEO municipal: desplegados en Pages y
  smoke productivo HTTP 200; workflow `36078815272` exitoso.
- [x] Movimientos separa las 46 salidas reconciliadas del Ejecutivo de las dos
  señales en confirmación. Reemplazos parlamentarios quedan fuera de ese conteo.
- [x] Verificación productiva adicional (25-09): la Home presenta a Fabián
  Páez y José Bravo en confirmación; la API de movimientos mantiene 46 filas
  reconciliadas y su fecha máxima en 2026-09-14. No promover por notas de
  prensa ni inferir fecha efectiva: Bravo tiene comunicado oficial que solicita
  la renuncia, sin fecha efectiva ni reemplazo; para Páez falta decreto o
  comunicado primario localizado. Evidencia en la auditoría de estabilidad.
- [x] ETL remoto diario de votaciones Senado retirado de workflow y calendario
  versionados; PR #621 integrado con checks verdes. La tarea local de Windows
  permanece registrada y `Ready`; la reparación manual aislada queda.
- [x] Gastos Senado: 174 manifests/artefactos con SHA-256 válido, 154.132 filas
  (igual al total productivo); los 1.655 IDs de marzo coinciden en producción,
  proyección estática y partición local, sin duplicados ni diferencias. La API
  oficial confirma que 2020-12 no publicó filas; no es un hueco ETL.

### Pendiente priorizado

| Bloque | Avance estimado | Próximo criterio para cerrar |
| --- | ---: | --- |
| Historial de mandatos parlamentarios — **nuevo** | 10% | Capturar cortes oficiales por ID y asiento; comparar altas/bajas; confirmar fechas con evidencia; conservar períodos cerrados sin sumarlos a Movimientos del Ejecutivo. El análisis encontró que la tabla D1 actual no basta como historial público y su materialización remota está deshabilitada por defecto. |
| Votaciones Senado | 85% | El preflight local y la API R2 coinciden para 12 votos del 20–24-09; septiembre publica 41 filas completas. Falta smoke de navegación/fichas y seguir revisando cortes futuros mediante la tarea local (cron remoto retirado). |
| ChileCompra | 70% técnico; ejecución completa pendiente | El selector automático y sus 5 pruebas están en `c736f59`, rama `codex/r2-catalog-reference-audit-20260928`, con checks de CI verdes. El sondeo oficial eligió julio 2026 (8.004 licitaciones, 9.361 tratos directos y 17.364 convenios); R2 aún declara junio (74.142 registros). El preflight encontró 38.625 URLs de detalle únicas; a 5 req/s el piso es 2 h 8 min. Amplié en esta rama el timeout del workflow de 60 a 240 minutos, manteniendo la tasa y el guard R2 al 95%. Falta que CI valide el workflow y que una ejecución completa confirme estabilidad, conteos y bytes. La prueba local parcial se interrumpió tras 500 respuestas; no se completó ETL ni se escribió R2/D1. Antes de promover julio: verificar artefactos y presupuesto total de cuenta; no ejecutar si el preflight supera el margen/coste acordado. |
| Remuneraciones y calidad CPLT | 55% | Terminar duplicados/calidad municipales, revisar el corte central contaminado y reconciliar el salto de julio con la parcialidad de agosto-septiembre; luego construir historiales por lotes. |
| Backups y capacidad R2 | 30% | Obtener medición vigente, inventario/checksums y restauración probada; sólo entonces decidir retención selectiva. No borrar backups ni publicar una proyección grande antes de asegurar margen y rollback. |
| Aislamiento y consumo D1 | 85% | La materialización remota no corre por defecto. Falta recuperar una lectura vigente de consumo/cuotas para certificarlo; no ejecutar escaneos ni cargas masivas. |
| Auditoría integral ETL → R2 → API → páginas | 60% | Cerrar deltas conocidos por fuente, corte y checksum; repetir smoke productivo y registrar fallos externos que siguen conservando el último release válido. |

**Avance global estimado: 66%.** Es una estimación ponderada de los bloques
anteriores. La última auditoría de fuentes amplia es 23-09-2026; se añadió una
reconciliación completa del corte de marzo de Gastos Senado el 24-09, una
comparación acotada de votaciones y un smoke productivo de Movimientos el
25-09. El cierre de Gastos aplica al release vigente;
no implica que toda la plataforma tenga cobertura histórica completa.
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
