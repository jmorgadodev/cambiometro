# Auditoría productiva de normalización — 2026-09-14

## Alcance

Auditoría de sólo lectura contra los endpoints públicos de producción. Se
consultaron los manifiestos resumidos de fuentes, el estado de salud y como
máximo una fila por fuente. No se descargaron universos, no se ejecutó ETL,
no se escribió en D1 y no se modificó ningún release R2.

Referencia consultada: `https://cambiometro.impulsacv.cl`.

## Línea base operativa

- Backend público declarado: R2.
- Lecturas públicas D1 declaradas: `false`.
- Estado de salud: correcto (`ok=true`, R2 disponible).
- Fuentes auditadas: 13, incluyendo Movimientos.
- Muestra máxima: 1 fila por fuente.
- Los valores de las filas no se guardaron en este informe; sólo sus nombres
  de campos, estado y metadatos de paginación.

### Actualización de calidad acotada — 2026-09-14 14:08 UTC

El auditor ahora solicita como máximo 20 filas por fuente, manteniendo la
misma política de sólo lectura, sin D1 y sin mutar releases. Además de los
conteos, calcula únicamente métricas agregadas de la muestra: campos ausentes,
forma de fechas, forma de períodos, estados de monto, identificadores faltantes
y duplicados aparentes. No guarda los valores originales.

En la ejecución acotada se obtuvieron 3 muestras con filas, 3 releases
parciales, 1 fuente de resumen solamente y 0 solicitudes fallidas. Cámara,
ChileCompra e InfoLobby respondieron con 20 filas; Senado, DIPRES y
Transparencia Activa permanecieron sin detalle recorrible en este endpoint.
Los campos `period` y `amount` aparecen en parte de la muestra como objetos
estructurados; se registran como `structured`, no como montos inválidos ni se
convierten en cero. Esta observación queda pendiente de mapear al contrato de
cada dominio antes de promover una proyección.

## Matriz de producción frente a local

| Fuente | Producción declarado | Local | Estado productivo | Publicado / esperado en muestra | Clasificación |
| --- | ---: | ---: | --- | ---: | --- |
| Cámara | 58.751 | 19.025 | parcial | 155 / 58.751 | alcance/frescura por reconciliar |
| Senado | 1.428 | 8.138 | parcial | 0 / 1.428 | release sin filas consultables |
| ChileCompra | 74.142 | 74.142 | parcial en catálogo; completo en registros | 74.142 / 74.142 | metadatos inconsistentes |
| Contraloría | 310 | 291 | parcial | 0 / 310 | release parcial |
| DIPRES | 247.287 | 15.689 | parcial | 0 / 247.287 | alcance distinto; agregado |
| INE Censo 2024 | 346 | 346 | conectado | resumen, sin endpoint de filas | coincide en resumen |
| InfoLobby | 71.467 | 71.467 | parcial en catálogo; completo en registros | 71.467 / 71.467 | coincide en resumen y consulta |
| InfoProbidad | 16.077 | 15.331 | parcial | 16.077 / 16.077 | frescura |
| Ley 19.862 | 62.172 | 59.361 | parcial | 0 / 62.443 | release parcial |
| SERVEL | 23.894 | 23.894 | parcial | 0 / 23.894 | release parcial |
| SINIM | 3.105 | 3.105 | parcial | 0 / 3.105 | release parcial |
| Transparencia Activa | 1.226.913 | 1.203.287 | parcial | resumen solamente | frescura / consulta temporalmente no disponible |
| Movimientos | — | 4.092 local | parcial | 82 publicados | fuente fuera del catálogo general |

Los conteos no se interpretan como cobertura total automáticamente. “Declarado”
es el conteo del catálogo; “publicado” es lo que el endpoint de registros
reportó como publicado; “esperado” es el total que el propio endpoint declara
para ese release. Una fuente puede tener un catálogo correcto y aun así estar
parcialmente recorrible.

## Hallazgos que bloquean promoción

1. **Cámara:** el catálogo declara 58.751 registros, pero el endpoint expone
   155 y marca una partición faltante. Se debe separar el conteo declarado del
   subconjunto consultable antes de presentar cobertura.
2. **Senado:** el catálogo declara 1.428, pero la consulta devuelve cero filas
   con cuatro particiones faltantes. No se debe publicar ese cero como un
   corte nuevo ni reemplazar el release anterior válido.
3. **Transparencia Activa:** el resumen productivo conserva 1.226.913, pero
   la consulta detallada está temporalmente no disponible. Esto explica por
   qué un nombre puede aparecer en un resumen o en una versión anterior y no
   en una búsqueda actual.
4. **ChileCompra:** el catálogo de fuentes marca `partial`, mientras el
   endpoint de registros marca `complete` para las 74.142 filas del corte.
   Hay que reconciliar ese estado de metadata antes de usarlo en porcentajes.
5. **DIPRES:** su conteo productivo declarado corresponde a un alcance distinto
   al conteo local y sigue siendo un dataset agregado; no debe transformarse
   en fichas personales.
6. **Movimientos:** tiene 82 filas públicas, pero no aparece en el catálogo
   general de fuentes; debe mantener su propio manifiesto y estado de frescura.

### Revisión específica del resumen de remuneraciones

El archivo de producción consultado (`transparency-summary.json`) declara
`comparisonsAvailable: false`. Por eso los campos de nuevos registros,
registros ausentes y cambios de monto aparecen sin cálculo; no representan
un resultado igual a cero. El generador de releases sí contiene el cálculo
completo cuando recibe los registros históricos, por lo que la próxima
publicación debe incluir ese resumen verificable o conservar el anterior.

En el snapshot local central se observaron 2.110.434 filas. La distribución
incluye 75.998 filas en 2026-06, 578.446 en 2026-07, 46.657 en 2026-08 y
123 en 2026-09. También hay 2.884 períodos posteriores al corte del
diagnóstico. Julio queda marcado como salto anómalo y agosto/septiembre como
cortes que requieren revisión; no se deben presentar como una evolución
normal ni utilizar para afirmar altas, bajas o cambios de sueldo sin validar
el release original.

La interfaz de Remuneraciones deja de mostrar la gráfica mensual y la tabla de
12 cortes. Mantiene sólo el estado del último corte y sus tres indicadores
cuando el release trae una comparación válida.

## Decisión de normalización

La rama incorpora un contrato local, aún sin conexión al publicador:

- Cámara y Senado mantienen categorías separadas para votaciones, asistencia,
  gastos, remuneraciones, asesorías/personal de apoyo y categorías no
  determinadas.
- Movimientos conserva identificador, fecha del evento, fecha de detección,
  cargo, organismo, entrante, saliente, estado de verificación y fuentes
  documentales.
- Los ETL parlamentarios y de Movimientos registran ahora un resumen de
  categorías e incidencias en su reporte interno; las filas crudas siguen
  siendo el release canónico y no se duplican en R2.
- La promoción por fuente queda protegida por una compuerta que exige pruebas,
  checksum, paginación y ausencia de lecturas masivas D1. Un release vacío,
  fallido o con caída anómala conserva el anterior; una fuente parcial queda
  en espera hasta una reconciliación explícita.
- El stream CPLT aplica la misma compuerta antes de eliminar o reemplazar la
  categoría anterior. Si la validación falla, la proyección existente no se
  modifica.
- El registro original se conserva por referencia y nunca se reemplaza.
- `0`, `null`, “no informado” y valor inválido quedan en estados distintos.
- No se fusionan personas por nombre ni se corrigen releases fallidos.

## Siguiente checkpoint

Antes de conectar estos normalizadores al ETL o promover cambios:

1. reconciliar las particiones faltantes de Cámara y Senado;
2. comprobar que el release anterior permanece disponible ante respuesta vacía;
3. validar una persona y un organismo desde índices R2;
4. medir tamaño comprimido y margen de R2;
5. ejecutar pruebas y preview por fuente.

El historial de una persona se consulta bajo demanda desde el índice R2; la
interfaz no lo solicita al cargar la página ni lo resuelve mediante D1.
