# Plan canónico de estabilización

## Encargo vigente: cierres de complejidad baja y media — 2026-10-05

Ejecutar LM01–LM09 del [tablero único](todo.md), sin renumerar ni borrar O01–O16. La autorización cubre documentación, correcciones de interpretación, validación acotada y estimación; no implica cargas históricas nacionales, nuevas fuentes, borrados o ampliación ChileCompra.

- **LM01:** consolidar pendientes, marcar documentos anteriores y fijar ruta/branch. Aceptación: referencias únicas, historial preservado y documentación fusionada.
- **LM02:** aclarar alcance/período/fuente en las cifras municipales pendientes. Aceptación: no atribuir cobertura completa, personas únicas ni pagos ausentes a un subconjunto; pruebas y render productivo.
- **LM03:** distinguir titular documentado de pagos históricos en Tortel/O’Higgins. Aceptación: evidencia oficial fechada, separación de representación y registros conservados; prueba y ficha productiva.
- **LM04:** completar política y alcance por fuente en Metodología con los metadatos ya auditados. Aceptación: oficial no equivale a completo, limitaciones específicas y períodos; pruebas y render.
- **LM05:** conciliar fechas/contadores Home–API–release. Aceptación: comparar unidades iguales, no fecha global inferida y no regresión del release; evidencia productiva.
- **LM06:** cerrar procedencia, frecuencia, última ejecución y fallos por ETL existente. Aceptación: usar registro/calendario actual, verificar ejecuciones y pruebas de preservación; no considerar verde como extracción exitosa cuando se omitió. Los bloqueados permanecen explícitos, no se fuerzan cargas.
- **LM07:** verificar anuncio contado y confirmación diaria de Movimientos. Aceptación: mismo ID, evidencia fiable, no-op/caída sin pérdida y ejecución/modalidad real cotejada.
- **LM08:** cotejar muestra explícita de pagos bajos, cero y faltantes. Aceptación: fuente y celda original, discrepancias resueltas o causa desconocida documentada; no extrapolar a todo el universo.
- **LM09:** medir viabilidad de históricos. Aceptación: bytes/objetos/operaciones estimados, inventario de cuenta fechado y límite gratuito; si falta telemetría no declarar coste cero ni publicar. No recuperar el universo durante la medición.

Orden: LM01, LM02–LM04, LM05–LM07, LM08–LM09. Cada bloque reutiliza las pruebas/scripts existentes; no hay refactor general. Si una fuente no responde, cerrar la protección y registrar la dependencia, sin marcar completa su cobertura.

### Secuencia de cierre restante — 2026-10-07

La cola concreta y sus dependencias están en [todo.md](todo.md). LM01–LM05,
LM07 y LM09 quedaron integrados y comprobados en producción mediante #715;
LM08 quedó integrado con CI verde mediante #716. No se repiten esos bloques
ni sus previews. Sólo queda integrar y activar el arranque local aislado
LM06; su preflight Windows y dry-run acotado ya están documentados.
Las sesiones incompletas detectadas son una dependencia operativa O11:
no se fuerza su publicación para cerrar el registro de procedencia/fallos.
Las tareas operativas O05,
O08, O10, O11, O13 y O15 siguen separadas con sus dependencias y evidencia;
ChileCompra O16 permanece al final. No se añaden fuentes ni auditorías.

En cada cierre actualizar `todo.md` y `evidence.md` con fecha, commit,
pruebas y destino real (local, preview o producción). El avance no se aumenta
por iniciar un comando ni por un workflow verde que omitió la extracción.

Cuatro puertas por punto: referencia/evidencia, cambio o diagnóstico, validación reproducible, fusión y verificación pública cuando cambia presentación. Cada puerta vale 25%; esos porcentajes describen el trabajo, nunca exactitud o cobertura de datos. La última puerta documental exige fusión, no sólo archivo local.

Cola vigente actualizada: 2026-10-07; base operativa: 2026-10-02. Este plan sustituye como tablero operativo a los
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
| O09 | Promoción Pages coherente y bloqueo global; alcance estático verificado | M | O08 | 100 % estático |
| O10 | Control diario sin extracción ni alertas repetidas; pin estático comprobado | M | O03, O08 | 75 % |
| O11 | Migrar fuentes pequeñas; Senado votaciones local-only; fallos externos aislados | M por fuente | O07 | 0 % |
| O12 | Gastos parlamentarios: guardas y períodos publicados, nulo distinto de cero | M | O07, O08 | 100 % del alcance publicado |
| O13 | Remuneraciones municipal/central/38 bis: guardas, cortes e índices sin D1 masiva | M por componente | O07, O08 | 0 % |
| O14 | Simulacro local de rollback y muestra del respaldo existente, sin copia nueva; cierre tras CI y fusión | M | O05, O08 | 100 % tras fusión |
| O15 | Siete días continuos de concordancia R2 → API → Pages y alertas útiles | S operativo, 7 días calendario | O09–O14 | 0 % |
| O16 | ChileCompra: último, con preflight de alcance/coste y recuperación 403 | M por período | O05, O07, O15 | 0 % |

Detalle O13: 38 bis alcanza 4/4 (100 % del ciclo probado) con julio corregido a 1.595 filas, 18 históricos preservados y R2/API/Pages concordantes. Guardas y representación nulo/cero integradas y desplegadas. La ejecución remota 37086353257 respondió con CSV oficial, checksum igual a R2 y no-op sin PUT/Pages; recuperación comprobada, no disponibilidad continua ni causa del fallo previo. Municipal y central permanecen pendientes; no es un porcentaje global de remuneraciones ni cobertura del universo. O15 sigue abierto.

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
