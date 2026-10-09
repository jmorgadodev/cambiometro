# Nominales y totales discordantes — 2026-10-07

Referencia: [reporte reproducible](comprobacion-publicada.json). Se leyeron el
manifiesto y tres objetos inmutables de R2 por GET: 10.088.224 bytes; sus SHA
coinciden con el manifiesto productivo `ff21950f…`. Sin PUT/DELETE, D1 o ingestas.
Los originales descargados están en `.ci-confianza-audit/`, fuera de Git; no
reemplazan archivos de aplicación ni se incluyen en el expediente institucional.

## Resultado y límites

- 1.009 sesiones integradas: Cámara 696 (17-03 a 06-10-2026); Senado 313
  (06-01 a 23-09-2026). 205 claves de persona; no certifica identidad/vigencia.
- Cero pares persona/sesión duplicados, referencias a sesiones inexistentes o
  filas mal formadas en esta proyección. No certifica ausencia de otros errores.
- 219 diferencias de campos en **152 sesiones**: una de Cámara (3 campos),
  151 de Senado (216 campos). No son 219 sesiones ni porcentaje de exactitud.
- Las otras 857 sesiones concilian aritméticamente estas tres opciones; eso
  no certifica nombres, afiliación histórica ni el documento original.
- No hay abstenciones nominales en la proyección del Senado, aunque existen
  totales declarados de abstención. No completar ni redistribuir votos.

## Muestra original Cámara — la discrepancia también existe en el origen

URL: https://opendata.camara.cl/camaradiputados/WServices/WSLegislativo.asmx/retornarVotacionDetalle?prmVotacionId=90242

GET directo: HTTP 200, 42.946 bytes; SHA-256
`ea6fe76b80f452d406468918a22c4f30ceae9479e008350ed5bf050e86e1a4f3`.
El XML declara `TotalSi=56`, `TotalNo=60`, `TotalAbstencion=5`, mientras sus
155 etiquetas `OpcionVoto` dicen `No Vota`. La proyección reproduce esa
contradicción. **No atribuirla automáticamente a nuestro ETL ni corregirla
inventando los votos individuales.** Fuente oficial no implica consistencia.

## Muestra Senado — conciliación y contraste documental pendientes

`senado-vot-11349`: totales 17/0/1; nominales 17 Afirmativo, 14 Dispensado,
10 No Vota, ninguna Abstención. La tabla pública de sesión 10278 confirma
fecha 23-09-2026 y proyecto 17737-14, no los nominales individuales:
https://www.senado.cl/actividad-legislativa/sala-de-sesiones/sesiones-de-sala/10278

No atribuir aún el defecto al origen o a una etapa concreta de ingestión del
Senado; requiere el documento nominal y la entrada anterior a la proyección.

## Decisión implementada

1. Guarda de presentación por sesión; opciones de las sesiones no conciliadas
   pasan a `En revisión`, manteniendo registros, fechas, totales informados y URLs.
2. La guarda se aplica también a slices precalculados, no sólo al fallback.
3. No se genera un detalle nominal incompleto ni se rellena una fila ausente
   con `No Vota`. Historiales conservan registros pero retiran el resumen afectado.
4. Asistencia formal requiere actas; se retira su porcentaje inferido del voto.
   No inferir licencias/pareos/retiros. La cohesión no acreditada tampoco aparece
   en fichas individuales ni en textos de compartir como si estuviera revisada.
5. Los totales de sesión se mantienen como **informados**, no como nominales
   corroborados. No se cambia el release; los archivos originales siguen auditables.

Reactivación: un release cuyos nominales concilien supera esta guarda, pero
no acredita por sí solo identidad, afiliación histórica o cobertura completa.
Asistencia y cohesión requieren una revisión documental independiente.

## Preview y límites de cierre

Primer build canónico `37633872792`: compiló correctamente sin D1; smoke falló
en accesibilidad (`select-name` en filtros de Movimientos), por lo que no publicó.
Se añadieron nombres accesibles; no se desactivó la prueba. El PR #719 queda
borrador hasta nueva verificación. Se canceló su E2E habitual antes de preparar
el fixture D1 (`37633874623`); no confundir esa cancelación con prueba aprobada.

Actualización: el preview canónico de `41b39145`, run `37652611168`, superó
96/96 controles en dos tamaños y dos temas. Este resultado sustituye el bloqueo
visual anterior; no sustituye actas nominales ni pruebas API. Jorge autorizó
posteriormente D1 local efímera para completar el CI de integración, sin D1 remota.
