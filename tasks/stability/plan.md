# Plan canónico de estabilización

Actualizado: 2026-10-02. Este plan sustituye como tablero operativo a los
planes fechados en septiembre; aquellos permanecen como historial, no como
instrucciones vigentes ni evidencia de cobertura actual.

## Objetivo y límites

Congelar funciones nuevas y lograr que cada fuente conserve su último release
válido ante fallos, que Pages muestre exactamente los releases R2 verificados y
que la operación pueda supervisarse sin depender del historial de un chat.
No usar D1 para búsquedas, barridos o materialización masiva. No borrar datos
ni backups para ganar espacio. ChileCompra se aborda al final y mientras tanto
conserva su release válido. No cambiar diseño, menú ni rutas.

**Costo facturable objetivo: $0.** El backup completo no se genera por
calendario: se conserva y verifica el respaldo existente, sin crear copias
nuevas ni reducirlo automáticamente. Antes de publicar, comprobar el uso y la
proyección de almacenamiento **y operaciones Clase A/B de toda la cuenta R2**.
El umbral de 95 % de almacenamiento no demuestra por sí solo costo cero. Si
faltan métricas de facturación o margen verificable, no promover la carga.

La ruta de código es el repositorio `C:\Users\jorge\Proyectos\cambiometro-public`
en una rama `codex/` creada desde `origin/main` y montada bajo
`C:\Users\jorge\.codex\worktrees`. El checkout principal divergente no se
actualiza ni se usa para desplegar. `cambiometro-audit` sólo guarda evidencia.

## Medición y cierre

- La complejidad estima esfuerzo técnico, no cobertura de datos: XS = un
  documento/configuración; S = 1–2 archivos; M = 3–5 archivos; cualquier
  trabajo mayor se divide antes de empezar.
- Cada tarea tiene cuatro puertas de aceptación en [todo.md](todo.md). Su
  porcentaje es `25 × puertas verificadas`; no se asignan porcentajes por
  impresión ni por tiempo transcurrido.
- Una tarea técnica no llega a 100 % sin pruebas, CI/preview cuando aplica,
  promoción y smoke de producción. Una tarea documental llega a 100 % tras
  revisión y fusión. La observación de siete días sólo llega a 100 % al
  completar los siete días.
- Los porcentajes de este tablero **no son porcentajes del universo de datos**
  ni equivalen al 66 % de un plan histórico. No se publica una cobertura sin
  denominador comprobado.
- Al cerrar cada puerta se actualizan **en el mismo cambio** `todo.md` y
  [evidence.md](evidence.md), con fecha, commit/PR, release o manifest,
  checksum/conteo si procede, pruebas, URL/resultado y rollback. Si no hay
  evidencia, la puerta sigue abierta.
- Si producción revela una regresión, reabrir la puerta afectada y registrar
  el incidente; no dejar un 100 % histórico como estado vigente.

## Orden de ejecución (de menor a mayor complejidad, respetando dependencias)

| ID | Tarea / criterio de salida | Complejidad | Depende de | Avance |
| --- | --- | --- | --- | ---: |
| O01 | Tablero único y ruta canónica documentados | XS | — | 100 % |
| O02 | Despliegue UI y ETL de Movimientos no retroceden a Git | S | — | 100 % |
| O05 | Confirmar ausencia de copias nuevas y presupuesto R2 de toda la cuenta | S | O01 | 50 % |
| O03 | Registro ETL con procedencia configurada, calendario y manifiestos | S | O01 | 100 % |
| O04 | Suprimir contadores fijos antiguos de Fuentes; derivar por release y alcance | S | O03 | 100 % |
| O06 | Candidato/no-op de Movimientos: anuncio, confirmación en el mismo ID y cero inesperado | M | O02, O05 | 100 % |
| O07 | Guardia ETL común: esquema, checksum, períodos, duplicados, descenso y fallo externo | M | O06 | 100 % |
| O08 | `ReleaseSet` R2 con IDs/checksums por dominio y lectura fijada por Pages; guarda remota tras CI y fusión | M | O03, O07 | 75 % tras fusión |
| O09 | Promoción Pages de artefacto coherente y bloqueo global de publicación | M | O08 | 50 % |
| O10 | Control diario sin extracción ni alertas repetidas por una misma causa | M | O03, O08 | 50 % |
| O11 | Migrar fuentes pequeñas; Senado votaciones local-only; fallos externos aislados | M por fuente | O07 | 0 % |
| O12 | Gastos parlamentarios: guardas y períodos publicados, nulo distinto de cero | M | O07, O08 | 25 % |
| O13 | Remuneraciones municipal/central/38 bis: guardas, cortes e índices sin D1 masiva | M por componente | O07, O08 | 0 % |
| O14 | Simulacro local de rollback y muestra del respaldo existente, sin copia nueva; cierre tras CI y fusión | M | O05, O08 | 100 % tras fusión |
| O15 | Siete días continuos de concordancia R2 → API → Pages y alertas útiles | S operativo, 7 días calendario | O09–O14 | 0 % |
| O16 | ChileCompra: último, con preflight de alcance/coste y recuperación 403 | M por período | O05, O07, O15 | 0 % |

Detalle O11: personal de apoyo Senado terminó su ciclo 2026, publicado y comprobado en producción (4/4). Personal de apoyo Cámara conserva el release y queda en 1/4 por bloqueo externo verificado. El cierre de Senado no equivale al cierre de todas las fuentes de O11. La cuota de operaciones fue confirmada expresamente por Jorge para esta publicación; no se registró una medición de Analytics que el token no permite leer.

Los IDs permanecen estables para que la evidencia no se renumere. Entre las
tareas abiertas, **O05 es la siguiente**: medir el margen R2 antes de cualquier
publicación nueva. O05/#671 está apartado por indicación del usuario; O03 y O04
están cerrados; O07 también está cerrado y la siguiente tarea es O08. O11 y O13 se dividen en una tarea
verificable por fuente/componente antes de editar código. Una falla externa
queda como `degraded_external` y no bloquea
las otras fuentes; no se transforma una extracción vacía en release nuevo.

El [inventario de cierre ETL](etl-closure.md) es la lista de trabajo por
conector. Ningún ETL se declara operativo por tener workflow verde: requiere
procedencia efectiva, replay acotado, coherencia R2/API/página y una ejecución
en su modalidad real con guardas de costo. Los ETL manuales y local-only no se
presentan como actualizaciones automáticas.

## Checkpoints

1. **Base segura (O01–O05):** ruta única, release de Movimientos protegido,
   matriz de fuentes sin contadores fijos y margen R2 medido. No iniciar
   publicaciones grandes antes de O05.
2. **Promoción por fuente (O06–O09):** replay acotado, pruebas contractuales,
   `ReleaseSet` coherente y un artefacto Pages verificable. Ningún ETL fallido
   ni sin cambios despliega Pages.
3. **Operación (O10–O14):** monitoreo, gastos/remuneraciones por corte y
   restauración comprobada. Evitar escaneos D1.
4. **Observación (O15):** siete días reales sin retrocesos de release, conteos
   divergentes ni alertas duplicadas. Sólo entonces declarar estable el núcleo.
5. **ChileCompra (O16):** investigar al final; no anunciar cobertura 2026
   completa hasta conciliar meses y denominador.

## Riesgos que obligan a detener una promoción

- El nuevo release reduce filas fuera del umbral, cambia período/identidad de
  fuente o no supera checksum y conteos.
- La proyección de almacenamiento de toda la cuenta R2, incluido el backup,
  llega al 90 % sin revisión o al 95 %; o las operaciones Clase A/B podrían
  superar el tramo gratuito. Sin telemetría de facturación, detener publicación.
- Pages no puede demostrar qué release de cada dominio compiló, o su API y
  página muestran otro corte.
- Una fuente externa devuelve 403/timeout o cero sin certificación explícita.

Las puertas detalladas y el siguiente paso ejecutable están en [todo.md](todo.md).
