# Estado real de fases y ETL — 12 de septiembre de 2026

## Alcance y restricciones

Auditoría de sólo lectura realizada sobre producción, R2, GitHub Actions y el
repositorio maestro local. No se ejecutó SQL, no se materializó D1, no se
publicó código y no se tocó `cambiometro-editorial`.

D1 queda deliberadamente fuera de esta revisión hasta la ventana de reinicio
del día siguiente.

## Conclusión ejecutiva

No están cerradas la fase 3 ni las fases posteriores. La línea base y varias
protecciones de D1 sí están avanzadas, pero algunos workflows terminan en verde
después de publicar un artefacto que todavía no es servible desde la API
pública. El caso más claro es Movimientos.

La comparación local/producción es válida como diagnóstico de frescura, pero
no es todavía una reconciliación completa por el mismo `releaseId`, checksum,
fecha de corte y alcance.

## Estado por fase

| Fase | Estado | Evidencia | Pendiente real |
|---|---|---|---|
| 0. Línea base | Parcialmente cerrada | Producción responde `/api/v1/health` y `/api/v1/sources`; R2 es el backend público | Completar reconciliación contra releases equivalentes, no sólo contra snapshots locales antiguos |
| 1. Cierre D1 | Protegida, no cerrada | Producción declara `publicD1Reads=false`; materialización programada está bloqueada | Esperar reinicio, medir ventana completa y confirmar que no reaparece consumo masivo |
| 2. Cámara/Senado | ETL operativo; auditoría incompleta | Ambos workflows del 12-09 terminaron bien y publicaron R2 | Separar y reconciliar votaciones, asistencia, personal de apoyo, asesorías y gastos |
| 3. Movimientos | No cerrada; fallo de integración | ETL publicó release R2, pero producción devuelve `r2-unavailable` y cero filas | Alinear la ruta publicada con la ruta que consume la API y repetir smoke productivo |
| 4. Transparencia Activa | No implementada como fase completa | El catálogo existe y es consultable por el camino actual | Historial mensual, altas, bajas, cambios de sueldo/organismo y anomalías |
| 5. ChileCompra | Bloqueada | ETL del 07-09 recibió `CHILECOMPRA_BULK_HTTP_403` y generó cero registros en ese intento | Recuperar un snapshot válido o mantener explícitamente el último release válido; no publicar cero como corte |
| 6. InfoLobby | Parcial | Producción declara 60.615 registros, pero el flujo reciente observado fue `push`, no una ejecución programada completa | Probar paginación contra el universo y documentar diferencia entre muestra y release completo |
| 7. DIPRES | Parcial y desfasada | Último workflow listado: ejecución manual del 25-08; producción declara datos agregados | Validar frescura y presentar contexto agregado sin convertirlo en fichas individuales |
| 8. Validación final | No cerrada | Hay smoke y verificadores aislados en verde | Ejecutar matriz completa después de resolver las fuentes bloqueadas |

## Cámara y Senado

Los dos workflows actuales son ETL de GitHub Actions, no procesos que deban
depender del PC local:

- Cámara: run `34691437098`, terminado correctamente el 12-09. El ETL
  procesó 630 votaciones, reportó cero errores y publicó el release
  `c4cd3e1a7a1fbb4c682fff8d4b42ed43b5d652c318a2ea94aed3c1fd995d4b35`, con
  checksum `b45228691f3ac3534f5dee0b9b56dd5b1fb9827d0012c6b189204994787ef594`.
- Senado: run `34691714118`, terminado correctamente el 12-09. El ETL
  procesó 5 votaciones nuevas, reportó cero errores y publicó el release
  `b5a421f2b5bc1b6303dd49306e62e34d205693115ff189d257a2785bb1862ad2`, con
  checksum `8f7eaaf9872589c49679eb1af59cfe104367b90016e08587f94553411e41c147`.

Esto confirma que ambos ETL sí corrieron y publicaron. No confirma todavía que
la cobertura histórica o la clasificación de cada componente esté cerrada.

Si una fuente externa no responde, el respaldo correcto es ejecutar el mismo
ETL de forma local sólo como replay controlado y publicar un snapshot
verificado, conservando el release anterior. No corresponde sustituir una
fuente fallida con datos vacíos ni usar D1 como rescate masivo.

### Reconciliación por componente

La comparación del catálogo R2 vigente (`generatedAt` 2026-09-12) contra el
catálogo local (`generatedAt` 2026-08-24) confirma que local no es una copia
equivalente del corte productivo:

| Fuente/componente | Producción/R2 | Local | Lectura correcta |
|---|---:|---:|---|
| Cámara, fuente base | 58.751 | 13.286 | Local sólo tenía el subconjunto 2026; R2 incluye períodos 2024-01 a 2026-09 |
| Cámara, asistencia | 54.538 | incluido en el subconjunto local | Componente de Cámara, no remuneraciones |
| Cámara, votaciones | 4.058 | incluido en el subconjunto local | Componente de votaciones; actualizado hasta 2026-09 en R2 |
| Cámara, datos abiertos | 155 | no separado localmente | Componente adicional del release de Cámara |
| Cámara, gastos | 16.275 | 16.275 | Fuente separada `gastos_camara`, períodos 2026-03 a 2026-07 |
| Senado, fuente base | 1.428 | 1.428 | Registro propio del Senado; no incluye votaciones ni gastos |
| Senado, votaciones | 194 | 189 | R2 tiene cinco registros nuevos y período 2026-09 |
| Senado, gastos | 6.517 | 6.543 | Diferencia de release; local está 26 filas por sobre el corte vigente |

La cifra de Cámara (58.751) no debe sumarse nuevamente con gastos; los gastos
se publican como `gastos_camara`. Del mismo modo, 1.428 de Senado no es el
universo parlamentario completo: votaciones y gastos tienen identificadores y
manifiestos separados. Esta separación explica las inconsistencias observadas
sin modificar ni reemplazar datos locales.

Conclusión: Cámara y Senado quedan reconciliados por alcance y período. La
fuente vigente para el sitio es R2; local se conserva como copia de trabajo y
no debe usarse para afirmar cobertura productiva hasta hidratarla desde el
release R2 correspondiente.

## Auditoría de alcance sin D1

Se probó el candidato remoto con límite 1 y paginación. Las respuestas fueron
servidas por R2; el Worker mantiene `ALLOW_PUBLIC_D1_READS=0`.

| Fuente | Entrega verificable | Resultado | Observación |
|---|---:|---|---|
| ChileCompra | 74.142 / 74.142 | Completo para el release vigente | No equivale todavía al histórico de 888.693 mencionado en el plan |
| InfoLobby | 60.523 / 60.523 | Completo para el release R2 | El inventario general declara 60.615; hay una diferencia pendiente de 92 filas |
| DIPRES | 15.689 / 247.287 | Parcial | Debe presentarse como contexto agregado; no como buscador individual |
| Transparencia Activa | 1.226.913 en el índice nacional | Buscador R2 operativo | La ruta específica es `/api/v1/funcionarios`; `/api/v1/records?source=cplt` no representa esta nómina |

Esta prueba evita una falsa conclusión de ausencia: que `/records` no devuelva
filas para `cplt` no significa que Transparencia Activa esté caída. Su índice
especializado respondió con `sourceStatus=r2-search`, `totalHeadcount=1226913`
y paginación real.

Pendientes de datos, no de D1:

1. Reconciliar las 92 filas entre el inventario de InfoLobby y su release R2.
2. Definir si el histórico de ChileCompra será incorporado como release aparte,
   sin mezclarlo con el corte vigente.
3. Revalidar el universo DIPRES y sus períodos antes de ampliar su módulo.
4. Mantener la ruta especializada de CPLT como contrato público y agregar una
   prueba que impida medirla por el endpoint genérico de registros.

## Hallazgo crítico: Movimientos

El run `34690963760` terminó correctamente y publicó:

- release R2: `01d90402c2ecffd8b6e15f4d377e7cb025983c38c7ab390c1c1e54d72c89f8ba`;
- checksum: `7074f30a7f57f2985a155f816c6519c689a7eb9e2bbb02d706a3549713935189`;
- archivo publicado: `data/movimientos.json`;
- resultado del ETL: 82 movimientos, 11 señales; `gob-cl` respondió HTTP 403.

Sin embargo, la API productiva consultada después devolvió HTTP 200 con:

```json
{
  "data": [],
  "meta": {
    "sourceBackend": "none",
    "sourceStatus": "temporarily-unavailable",
    "reason": "r2-unavailable",
    "requestedSource": "movimientos"
  }
}
```

La causa técnica probable ya está acotada: el ETL publica `data/movimientos.json`
en el release estático, mientras el lector genérico de `/api/v1/records` busca
`data/lake/projections/v1/movimientos.json` o
`data/lake-subsets/movimientos.subset.json`. Al no encontrar esas rutas, cae a
la respuesta degradada. Esto explica el falso “verde”: publicación exitosa no
equivale a lectura pública exitosa.

## Otras fuentes relevantes

- ChileCompra falló antes de obtener datos del corte solicitado: el endpoint
  bulk respondió HTTP 403. El pipeline siguió construyendo una proyección con
  cero registros y luego falló al publicar la entrada estática. El release
  productivo anterior no debe reemplazarse por ese resultado vacío.
- Contraloría publicó R2, pero un intento posterior de materialización D1 falló
  por la cuota gratuita. Es un fallo de D1, no evidencia de que R2 haya
  desaparecido.
- CPLT tuvo un fallo de archivado no crítico después de validar/publicar R2;
  debe clasificarse como publicación parcial, no como cierre total.
- DIPRES y SINIM no tienen una actualización reciente equivalente a Cámara y
  Senado; sus fechas no deben presentarse como si fueran una consolidación
  global del sitio.

## D1

No se hizo ninguna consulta hoy. La protección operativa existente deja las
búsquedas públicas en R2 y bloquea la materialización programada. El consumo
histórico observado superó el límite compartido, pero la atribución completa se
debe comprobar después del reinicio, con una ventana limpia y sin lanzar ETL
masivos simultáneamente.

## Orden correcto para continuar

1. Mañana: comprobar el reinicio y la cuota D1 sin ejecutar materializaciones.
2. Resolver y probar Movimientos de extremo a extremo: R2 publicado, API y
   página pública.
3. Reconciliar Cámara/Senado por componente y período, usando los releases
   recién publicados.
4. Reintentar ChileCompra sólo con una estrategia que preserve el último
   snapshot válido frente a HTTP 403.
5. Auditar InfoLobby, DIPRES y Transparencia Activa por frescura y alcance.
6. Ejecutar la validación final y recién después promover cambios.

## Estado de cierre

El proyecto no debe declararse completamente cerrado todavía. Está estable en
su camino R2-first, pero Movimientos no está disponible desde producción y las
reconciliaciones de fuentes aún no están completas. La próxima acción segura
es la medición post-reinicio de D1; después, corregir Movimientos sin alterar la
navegación ni los demás módulos.

## Ejecución local posterior — 12 de septiembre

Se implementó y dejó en el commit local `7c1085d` una corrección acotada:

- la API reconoce explícitamente `data/movimientos.json`, que es el artefacto
  que publica el ETL;
- se agregó una prueba de regresión para esa ruta;
- ChileCompra ahora bloquea un release vacío salvo que exista una autorización
  explícita para ese caso, evitando reemplazar un snapshot válido después de un
  HTTP 403.

Las verificaciones locales posteriores terminaron así:

- `npm test`: 957 tests aprobados;
- `npm run api:typecheck`: aprobado;
- `npm run lint`: 0 errores, advertencias preexistentes;
- `npm run api:size`: 171,94 KiB, bajo el límite;
- `npm run pages:build`: aprobado, 4.674 rutas;
- `npm run pages:verify`: aprobado, 346 municipalidades y 205 perfiles;
- `npm run verify:static:browser`: 90 comprobaciones aprobadas;
- `npm run verify:prod:movimientos`: aprobado para la página y snapshot
  estáticos locales.

El preview remoto del Worker no pudo iniciar porque el token actual no tiene
el permiso necesario para crear la sesión remota. No se cambiaron permisos, no
se consultó D1 y no se desplegó producción. La corrección queda lista para
preview/promoción cuando exista una credencial autorizada para esa operación.

## Checkpoint remoto posterior — 12 de septiembre

El workflow `34698602598`, ejecutado desde la rama
`codex/movimientos-r2-fix-20260912`, terminó correctamente en sus tres
controles: typecheck/tamaño, preview sin ruta productiva y versión candidata.

La primera prueba remota mostró un segundo defecto de contrato: el archivo
publicado conserva las filas bajo `movimientos`, no bajo `records`. Se corrigió
la extracción sin cambiar el formato original y se repitió el workflow en el
run `34698602598`, cuyo commit es `2507ac3`.

Resultado del candidato remoto:

- alias de preview: `https://candidate-34698602598-cambiometro-public-api.koooke.workers.dev`;
- `/api/v1/records?source=movimientos&limit=3`: HTTP 200;
- `sourceBackend`: `r2`;
- total: 82 movimientos;
- paginación: activa (`totalPages=28` con límite 3);
- `/api/v1/health`: `publicD1Reads=false` y `publicDataBackend=r2`;
- versión Worker: `8e02ce9d-e947-44de-8ad2-6467c1ad9c9a`;
- tamaño: 172,09 KiB / gzip 32,62 KiB.

La consistencia del artefacto quedó comprobada: el snapshot público de
producción y el objeto R2 del release
`01d90402c2ecffd8b6e15f4d377e7cb025983c38c7ab390c1c1e54d72c89f8ba` tienen
82 filas, 205.865 bytes y checksum de contenido
`1027af7fc35ac6f68df2e7f798cdfc605bce7ef63d98e453fc8ce6207065dc2d`.

Conclusión del bloque: la corrección de Movimientos está validada en preview y
R2. Producción todavía no se promovió; el endpoint productivo continúa con el
comportamiento anterior hasta una promoción controlada y explícita.

## Checkpoint de calidad R2 — run 34699100822

El commit `c24f106` agregó la comparación entre el índice paginado y el
conteo del catálogo R2. La prueba remota del candidato quedó así:

- InfoLobby: 60.523 filas servibles de 60.615 declaradas; `sourceStatus=partial`,
  `missingPartitions=1`.
- ChileCompra: 74.142 de 74.142; `sourceStatus=complete`.
- Movimientos: 82 filas; `sourceBackend=r2`, `sourceStatus=partial` por la
  naturaleza histórica del snapshot, no por una caída del servicio.
- Health: `publicDataBackend=r2`, `publicD1Reads=false`.

El endpoint ya no afirma que InfoLobby está completo cuando falta su partición
de agosto. El dato faltante queda identificado como un problema de release R2,
no como una razón para consultar D1 ni para borrar el último snapshot válido.

## Promoción productiva y verificación posterior — run 34699354239

La versión `8e02ce9d-e947-44de-8ad2-6467c1ad9c9a`, construida desde el commit
`c24f106`, fue promovida al 100% mediante la compuerta explícita
`CAMBIOMETRO_CONFIRM_CUTOVER`. El workflow reaplicó la ruta
`cambiometro.impulsacv.cl/api/*` y confirmó health productivo.

Verificación posterior:

- `/api/v1/records?source=movimientos&limit=3`: HTTP 200, 82 registros,
  `sourceBackend=r2` y paginación activa;
- `/api/v1/health`: `publicDataBackend=r2` y `publicD1Reads=false`;
- `/`, `/movimientos/`, `/municipalidades/`, `/remuneraciones-publicas/`,
  `/personas/` y `/api/v1/sources`: HTTP 200;
- `npm run verify:prod:movimientos`: todas las comprobaciones aprobadas,
  incluyendo fechas, fuentes oficiales y estados de Alonso Velásquez y
  Patricio Löhr.

La producción ya no presenta el vacío anterior de Movimientos. No se ejecutó
ETL ni consulta SQL durante la promoción.

## Reconciliación InfoLobby R2 sin D1 — 12 de septiembre

La ejecución `34699618261` del workflow `ETL Semanal - InfoLobby` terminó
correctamente con `skip_d1=true`. La preflight y la materialización D1 quedaron
omitidas; el workflow registró explícitamente que R2/Pages conserva el release
canónico.

El diagnóstico de la cadena de publicación encontró que la ingesta había
publicado 10.945 filas del corte de agosto, pero el índice paginado público
seguía apuntando a las 60.523 filas anteriores. Se construyó una consolidación
versionada sin reemplazar el archivo anterior:

- histórico anterior: 60.523 filas;
- nuevo corte: 10.945 filas;
- duplicados reemplazados por su fila más reciente: 1;
- total único activado: 71.467 filas;
- índice: 1.430 páginas, con búsqueda y conteos por término;
- ruta nueva: `indexes/v1/infolobby/releases/20260912-144219/`;
- manifiesto anterior conservado para rollback.

La activación fue sólo en R2; no cambió código, Pages ni D1. La verificación
productiva con parámetro de caché confirmó:

- `/api/v1/records?source=infolobby&limit=1`: 71.467 filas;
- `sourceBackend=r2-lake`, `sourceStatus=complete`;
- `publishedRows=71.467`, `expectedRows=71.467`, sin particiones faltantes;
- búsqueda `q=municipalidad`: 16.881 coincidencias paginables;
- health: `publicDataBackend=r2`, `publicD1Reads=false`.

La respuesta sin parámetro de verificación puede tardar hasta cinco minutos en
reflejar el cambio por el caché HTTP de la API. No se ejecutó ninguna consulta
SQL ni materialización D1 durante esta corrección.

## Estado operativo después del trabajo inmediato

Movimientos quedó corregido y promovido, Cámara/Senado quedó reconciliado por
componente y período, InfoLobby quedó indexado contra el catálogo vigente y la
API productiva continúa R2-first. El siguiente bloque que requiere datos nuevos
es separar en la interfaz y manifiestos el corte vigente de ChileCompra frente
al histórico, sin reintentar su ETL mientras el origen mantenga HTTP 403.

## Integración segura posterior — PR #493

El commit `a6f3255e08391a5d4cc97d09d836094215dcd1df` quedó fusionado en
`main` después de ejecutar los checks completos. La integración fue acotada a
seis archivos: contrato de rutas estáticas R2, lectura de índices, detección
de índices parciales, prueba correspondiente y guard de D1 para InfoLobby. No
incluyó cambios de interfaz, datos locales sucios ni `cambiometro-editorial`.

Validación del candidato Worker `8fffd277-d5b5-4330-bdd8-7abc04c18f3a`:

- preview de ChileCompra, InfoLobby y Movimientos: HTTP 200 desde R2;
- health: `publicDataBackend=r2` y `publicD1Reads=false`;
- checks de GitHub: lint, tipos, unitarios, seguridad, build estático y E2E
  verdes.

El Worker productivo no fue promovido automáticamente: la compuerta exige
una ejecución explícita con el `worker_version_id`. En el smoke del tráfico
productivo vigente, Home, Municipalidades, Remuneraciones, Personas,
Movimientos e InfoLobby respondieron correctamente, pero ChileCompra respondió
HTTP 503/1102. El mismo endpoint respondió HTTP 200 en el candidato nuevo.
Esto confirma que el 1102 corresponde a la versión productiva anterior y que
la promoción controlada del candidato es el siguiente movimiento, separado de
la medición de cuota D1. No se ejecutó SQL ni materialización D1.

La promoción posterior se ejecutó mediante el workflow `34702718700` y terminó
verde. El Worker `8fffd277-d5b5-4330-bdd8-7abc04c18f3a` quedó al 100% en la
ruta productiva. El smoke posterior confirmó:

- health: HTTP 200, `publicDataBackend=r2`, `publicD1Reads=false`;
- ChileCompra: HTTP 200, 74.142 filas, índice completo;
- InfoLobby: HTTP 200, 71.467 filas, índice completo;
- Movimientos: HTTP 200, 82 filas, origen R2;
- Home, Movimientos, Municipalidades, Remuneraciones y Personas: HTTP 200.

El 1102 de ChileCompra quedó resuelto sin consultar ni materializar D1.

## Consistencia de metadata R2 y publicación Pages — PR #494

La integración `96a3a830101c7f8069a0bbade429835e20f78355` corrigió la
referencia local de InfoLobby para que el panel use el índice R2 reconciliado
vigente, no el snapshot anterior de 60.523 filas:

- InfoLobby: 71.467 filas canónicas, históricas y consultables;
- se eliminó la declaración obsoleta de 60.615 filas del catálogo visual;
- el fallback de indisponibilidad de la API conserva el mismo total esperado;
- no se alteraron registros, rutas, menú ni configuración D1.

Validación local y remota:

- `npm test`: 183 archivos y 980 pruebas aprobadas;
- `npm run pages:build`: 4.674 páginas estáticas generadas;
- `npm run pages:verify`, SEO, tipos y tamaño del Worker: aprobados;
- Pages refrescado en `34704571318`: terminado correctamente;
- `/datos/`: muestra InfoLobby 71.467 y ya no muestra 60.523;
- producción: ChileCompra 74.142 y InfoLobby 71.467 desde `r2-lake`, ambos
  completos; Movimientos 82 desde R2, parcial por su naturaleza histórica;
- `/api/v1/health`: `publicDataBackend=r2` y `publicD1Reads=false`.

El workflow de InfoLobby activado por el merge ejecutó únicamente su guard de
push (`Validación de workflow sin ingestión`) y omitió el ETL. El Worker quedó
validado como candidato, sin promoción adicional ni materialización D1.

## Validación de fuentes sin escritura — 12 de septiembre

Se ejecutó una comprobación acotada de lectura contra los conectores de Cámara,
Senado y Movimientos. No se ejecutó el ETL, no se escribieron archivos, no se
publicó un release y no se consultó D1.

### Resultado de fuentes externas

- Cámara: padrón vigente HTTP 200; listado de votaciones 2026 HTTP 200 con
  942 entradas; la más reciente observada fue la votación `90026` del
  2026-09-09 12:48:46; su detalle respondió HTTP 200 (43.183 bytes).
- Cámara: sesiones 2026 HTTP 200 (23.436 bytes).
- Senado: padrón HTTP 200; sesiones de la legislatura 374 HTTP 200 con 63
  sesiones observadas y última sesión el 2026-09-09; períodos de dietas HTTP
  200, con agosto de 2026 como último período disponible.
- Movimientos: Ley Chile, Diario Oficial, Gob.cl, Prensa Presidencia y
  Ministerio del Deporte respondieron HTTP 200. Gob.cl respondió sin desafío de
  Cloudflare en esta comprobación; Ministerio del Deporte entregó 6 señales
  compatibles con el detector.

### Hallazgo operativo Cámara

El snapshot local `data/politicos-votaciones.json` contiene 848 sesiones y
conserva Cámara y Senado hasta 2026-09-09. Producción devuelve votaciones de
Cámara mediante `source=camara`, pero la variante explícita
`source=votaciones_camara` responde `sourceBackend=none`,
`sourceStatus=temporarily-unavailable` y `reason=r2-unavailable`. Por tanto,
la fuente oficial no está caída y el dato no debe reemplazarse por cero. La
consulta canónica acotada `source=camara&kind=vote&from=2026-09-09&to=2026-09-09`
responde desde R2 con 7 votaciones y release completo; el catálogo declara
4.058 registros de votaciones dentro del componente Cámara. El pendiente es
de contrato/alias de la variante explícita, no una pérdida del universo
canónico.

La acción segura queda definida para hoy: comparar el manifiesto R2 y el
workflow de Cámara, y corregir sólo el contrato/alias de la variante explícita
en preview si se confirma que el componente canónico es suficiente. No se
reconstruirá el histórico ni se reemplazará el snapshot productivo. Si el
artefacto específico no está disponible, se conserva el snapshot canónico y
se informa la ausencia como temporal. No se usará D1 como fallback.

## Corrección controlada de Cámara — PR #495

El PR `#495` quedó fusionado en `main` como
`bff778b8c1d0b1b35adc963527cb0e9bb3014f23`. La corrección fue acotada al
contrato de consulta: `source=votaciones_camara` se resuelve contra la fuente
canónica de Cámara, con variante y filtro `kind=vote`, sin mezclar asistencia
ni recurrir a D1. No se modificaron datos, menú, rutas de Pages ni otros ETL.

El candidato Worker `d2f82268-b1af-4481-a67b-d1f8953f0fc6` pasó typecheck,
tamaño y checks remotos, y fue promovido al 100% por el workflow
`34707108200`. La comprobación productiva posterior confirmó:

- `source=votaciones_camara&kind=vote`: HTTP 200 desde `r2-lake`;
- `sourceStatus=complete`, `publishedRows=49`, `expectedRows=49` y cero
  particiones faltantes en el corte consultado;
- la primera fila mantiene `sourceId=camara` y `kind=vote`;
- `/api/v1/health`: `publicDataBackend=r2` y `publicD1Reads=false`;
- Home, Municipalidades, Remuneraciones, Personas y Movimientos: HTTP 200.

El workflow de Pages/refresco `34706970066` y el guard de publicación ETL
`34706970075` también terminaron verdes. El bloque queda cerrado sin ejecutar
SQL, materialización ni ETL de Cámara. La consulta histórica amplia de 2026
queda documentada como `partial` en la fuente canónica y en el alias, con 7
particiones faltantes (`publishedRows=13.685`, `expectedRows=14.510` en la
consulta canónica). Por eso se cierra el incidente del alias, pero no se
declara cerrada la cobertura histórica hasta reconstruir esas particiones desde
la fuente oficial y validarlas en R2.

La auditoría mensual posterior detectó la causa concreta de la limitación del
primer arreglo: el alias filtraba una variante R2 que sólo tenía septiembre.
Enero y marzo-agosto muestran particiones publicadas pero incompletas; febrero
no expone una partición consultable. El corte 2026-09 responde completo con 49
votaciones. El PR #496 elimina ese filtro de variante: el alias usa el
histórico canónico de Cámara y fuerza `kind=vote`, dejando la cobertura parcial
histórica visible hasta que se reconstruyan los artefactos faltantes.

El PR #496 (`2dc41e86056df5dba6a15e60464a9ac0cf091dcb`) quedó fusionado y su
Worker `6735ebae-9bed-4293-9b36-4c7b587a4788` fue promovido al 100% por el
workflow `34708311553`. La comparación productiva posterior mostró que el
alias `votaciones_camara` y `camara&kind=vote` entregan el mismo estado R2
histórico: `publishedRows=13.685`, `expectedRows=14.510`,
`missingPartitions=7` y `sourceStatus=partial`. Esto confirma que el alias ya
no pierde los meses anteriores; lo pendiente es exclusivamente reconstruir los
siete artefactos faltantes, no corregir el enrutamiento.

## Plan operativo aplicable hoy

1. **Fuentes**: conservar el resultado de estas pruebas como preflight; no
   lanzar un ETL completo ni una reconstrucción histórica.
2. **Cámara**: el alias ya está reparado y validado en producción. El siguiente
   bloque será reconstruir sólo las siete particiones históricas faltantes,
   con conteo, fecha máxima y checksum como guardas; validar primero en
   preview y sin reemplazar el release sano.
3. **Senado**: dejarlo en espera de cambio sólo si el snapshot productivo no
   coincide con el corte del 2026-09-09; la fuente está respondiendo.
4. **Movimientos**: no reemplazar su snapshot de 82 filas por una consulta
   parcial; la comprobación de fuentes queda verde y el bloque sigue siendo
   incremental.
5. **D1**: no ejecutar SQL, materialización ni backup. Mañana sólo se medirá
   cuota post-reset y se verificará que los procesos públicos sigan en R2.
6. **Cierre del día**: conservar el rollback exacto del Worker anterior y
   dejar D1 para el reinicio; ningún cambio de menú, rutas, municipalidades,
   remuneraciones o `cambiometro-editorial`.

## Restauración de Cámara ejecutada sin D1 — 12 de septiembre

La reconstrucción pendiente se resolvió sin ejecutar ETL, sin leer ni escribir
D1 y sin cambiar código. Se localizaron los siete releases inmutables de
GitHub que el catálogo R2 ya declaraba para enero y marzo-agosto de 2026. Cada
manifiesto y cada archivo `records.jsonl.gz` se verificó contra el checksum del
catálogo antes de publicarlo.

Se restauraron únicamente los 14 objetos canónicos:

- `camara/votaciones_camara/2026/01`
- `camara/votaciones_camara/2026/03`
- `camara/votaciones_camara/2026/04`
- `camara/votaciones_camara/2026/05`
- `camara/votaciones_camara/2026/06`
- `camara/votaciones_camara/2026/07`
- `camara/votaciones_camara/2026/08`

La primera carga dejó seis duplicados en rutas auxiliares para marzo-mayo.
Fueron eliminados después de confirmar la existencia y el checksum de las
rutas canónicas. Los releases originales permanecen disponibles como
rollback; febrero no tiene partición publicada en el catálogo.

### Verificación productiva posterior

- `source=votaciones_camara`: 874 votaciones, 14.510 filas publicadas,
  14.510 esperadas, cero particiones faltantes y cero artefactos faltantes.
- `source=camara&kind=vote`: exactamente el mismo resultado.
- Todos los períodos disponibles de 2026 responden `sourceStatus=complete`.
- `/api/v1/health`: `ok=true`, `publicDataBackend=r2`,
  `publicD1Reads=false`.
- No se desplegó Pages ni se ejecutó ETL como parte de esta reparación.

### Ruta de trabajo para continuar hoy

1. Mantener D1 fuera de operación hasta el reinicio; no ejecutar SQL ni
   materialización.
2. Cerrar el incidente histórico de Cámara y conservar esta evidencia como
   rollback y referencia de checksums.
3. Ejecutar sólo auditorías de lectura sobre Movimientos, Senado y las fuentes
   pendientes, sin sustituir snapshots ni activar ETL.
4. Preparar para después del reinicio una medición de cuota D1 y una prueba
   acotada de compuertas, sin materializar datos masivos.
5. No tocar navegación, municipalidades, remuneraciones, editorial ni cambios
   de interfaz mientras se valida la estabilidad de las fuentes.

## Hallazgo adicional de Senado — diagnóstico sin escritura

La consulta amplia de Senado con período explícito (`2025-01-01` a
`2026-12-31`) devuelve 1.300 de 1.428 registros esperados desde `r2-lake`.
El catálogo identifica cuatro particiones:

- 2025-08: 121 registros; manifiesto ausente en R2.
- 2026-02: 7 registros; manifiesto ausente en R2.
- 2026-05: 1.250 registros; manifiesto y registros presentes y con checksum
  coincidente.
- 2026-07: 50 registros; manifiesto y registros presentes.

Por tanto, la diferencia real es de 128 registros en dos particiones. No es
una diferencia de paginación: el corte sin rango puede cargar sólo la primera
partición para responder rápido, pero la consulta acotada confirma la ausencia.
No se reconstruirá todavía. El siguiente paso seguro es localizar los
artefactos inmutables asociados a `data-senado-2025` y `data-senado-2026`, o
consultar la fuente oficial para regenerarlos con el mismo contrato. Mientras
eso no ocurra, Senado debe permanecer rotulado como parcial y no como cobertura
total.

La fuente oficial actual fue consultada sólo en modo lectura y mostró otro
dato que impide una restauración automática: el endpoint de gastos
operacionales responde 1.199 filas para 2025-08 y 1.200 para 2026-02, mientras
el catálogo histórico declara 121 y 7, respectivamente. El período 2026-05 sí
coincide con el catálogo (1.250 filas). La diferencia puede corresponder a un
cambio de alcance, a una publicación histórica incompleta o a un cambio del
endpoint; debe resolverse comparando el contrato y los registros antes de
publicar. No se debe convertir esa diferencia en una cifra de cobertura ni
mezclarla con votaciones, dietas o gastos de otra categoría.

La búsqueda posterior en los releases del repositorio no encontró artefactos
inmutables de `gastos_senado` para 2025-08 ni 2026-02, y el workflow de gastos
del Senado no conserva artifacts descargables para esas ejecuciones. Sólo
existen releases recientes de 2026. Esto cierra la alternativa de una
restauración por rollback: esas dos particiones deben regenerarse desde la
fuente oficial con un contrato de alcance explícito, o permanecer ausentes y
marcadas como no consultables. No se hará una reconstrucción por inferencia.

## D1 — cuota crítica confirmada después del reinicio

La sonda programada `34673322107` y el workflow diario de Cámara
`34691031897` consultaron Analytics para el 2026-09-12 y reportaron:

- 13.758.232 filas leídas sobre 5.000.000 (275,16%).
- 18 filas escritas sobre 100.000 (0,02%).
- 13.757.655 lecturas en `transparencia-db` y 577 en
  `impulsacv-db`.
- La sonda detectó el estado `critical` y no ejecutó SQL ni consultas de API.

El workflow de gastos del Senado `34660874426` también omitió materialización
porque la métrica no estaba autorizada. Los workflows actuales de Cámara,
ChileCompra, InfoLobby y las demás fuentes usan la compuerta opcional y no
materializan cuando la cuota está crítica. La salud pública productiva sigue
indicando `publicDataBackend=r2` y `publicD1Reads=false`.

Conclusión: el consumo actual no corresponde a una escritura de ETL ni puede
atribuirse sólo al Worker público. La métrica disponible agrupa por base D1,
no por proyecto, workflow o endpoint. Debe auditarse la cuenta completa —incluidos
los otros proyectos— antes de reactivar cualquier materialización. Hasta
entonces, D1 queda en modo sólo diagnóstico y R2 es el único camino público.

## Movimientos — corte productivo actual sin reemplazo

La consulta productiva `source=movimientos&limit=100` respondió desde R2 con
las 82 filas del snapshot vigente:

- 74 registros `verificado` y 8 `en_confirmacion`.
- Último evento: 2026-09-02.
- Última detección registrada: 2026-09-12T11:24:46.934Z.
- Período de eventos observado: 2026-02-15 a 2026-09-02.
- No hay paginación pendiente: 82 filas, una página completa.

La respuesta conserva `sourceStatus=partial` porque Movimientos mantiene un
snapshot con procedencia y estados de confirmación, no porque falten filas en
el artefacto publicado. El siguiente trabajo debe ser incremental: incorporar
novedades, mantener los 82 registros anteriores ante un fallo de una fuente y
separar siempre fecha del evento, fecha de detección y última publicación.

## Probe manual posterior al reinicio — 12 de septiembre, 18:22 UTC

Se ejecutó manualmente el workflow de diagnóstico
`d1-post-reset-probe.yml` (run `34711006882`) para no esperar al siguiente
horario programado. La ejecución terminó correctamente, pero la cuota todavía
estaba crítica:

- 14.031.028 filas leídas de 5.000.000 (280,62%).
- 18 filas escritas de 100.000 (0,02%).
- Resultado: `D1_FREE_TIER_CRITICAL` / `D1 level=critical`.
- La compuerta dejó `probe=false` y no ejecutó SQL ni peticiones a la API.

Esto confirma que el reinicio no había liberado aún la métrica observada por
Analytics, o que otro consumidor de la cuenta siguió leyendo `transparencia-db`.
No permite atribuir el consumo a `cambiometro-public`: la salud productiva
continúa con `publicDataBackend=r2` y `publicD1Reads=false`, y el workflow
protegido no realizó lecturas. La identificación del consumidor restante
requiere auditoría de cuenta completa (otros proyectos, workflows o scripts),
sin reactivar materializaciones.

## Trabajo seguro aplicable inmediatamente, sin esperar D1

Mientras D1 permanece crítica se puede avanzar en tareas que no dependen de
ella:

1. Mantener el smoke de rutas productivas y las comprobaciones de fuentes en
   modo lectura, usando producción/R2 como referencia.
2. Cerrar la reconciliación de Cámara ya restaurada y mantener el rollback
   documentado.
3. Auditar Senado sin publicar las dos particiones discrepantes hasta resolver
   su alcance (el endpoint oficial actual devuelve 1.199 y 1.200 filas frente
   a los 121 y 7 del catálogo histórico).
4. Preparar la especificación de ETL incremental por fuente y sus guardas de
   conteo, checksum y publicación atómica, sin ejecutarla.
5. Revisar Movimientos, InfoLobby, ChileCompra y Transparencia Activa sólo
   contra releases productivos; no regenerar ni materializar datos.

No se debe hacer hoy: SQL de prueba, materialización, backup de D1, ETL
completo, despliegue de interfaz ni cambios de navegación.

## Hardening R2 preparado, sin promoción — 12 de septiembre

Se preparó en la rama aislada `codex/r2-pagination-hardening-20260912`
(commit `490e7b9`) un cambio acotado para la incidencia 1102. La API ahora
intenta primero el índice paginado R2 y sólo carga la proyección estática
antigua si el índice no puede responder. Así una consulta de 1–50 filas no
transfiere ni analiza primero un subconjunto completo innecesario.

La reproducción automatizada falló con el orden anterior y pasó con el cambio.
La rama quedó verificada con:

- 983 tests pasados;
- typecheck general y del Worker;
- guardas de arquitectura, tokens, enlaces y `innerHTML`;
- lint sin errores (sólo advertencias preexistentes);
- verificación de tamaño del Worker: 178.586 bytes, bajo el límite de 1 MB.

En el momento de este registro aún no se había publicado el cambio: el preview
remoto local de Wrangler no pudo abrir sesión porque el token local no tenía
permisos para esa operación. No se modificó el token. El workflow de GitHub se
usó después para probar `limit=1,10,25,50` en ChileCompra, InfoLobby y DIPRES;
el resultado y la promoción posterior quedan registrados en las secciones
cronológicamente siguientes.

## Auditoría adicional de registros públicos — 12 de septiembre

Se probó en producción el camino R2 de registros con páginas pequeñas, sin
consultar D1. La salud continúa declarando `publicDataBackend=r2` y
`publicD1Reads=false`. Los resultados no son uniformes por tamaño de página:

| Fuente | `limit=1` | `limit=10` | `limit=25` | `limit=50` |
|---|---:|---:|---:|---:|
| InfoLobby | 200 | 200 | 200 | 1102 observado |
| ChileCompra | 200 | 200 | 1102 observado | 1102 observado |
| DIPRES | 200 | 1102 observado | 1102 observado | 200 observado |

Los 1102 fueron respuestas intermitentes del Worker; al repetir una consulta
pequeña volvió a responder 200. No se debe interpretar este hallazgo como una
caída de R2 ni como una nueva lectura de D1. Sí demuestra que la paginación
actual no tiene un margen uniforme para filas grandes: una página de 50 puede
exceder el tiempo/CPU de la función al descomprimir, transformar y serializar.

La acción correcta queda separada del incidente D1: medir tamaño de fila,
tiempo y bytes por fuente; establecer un límite seguro por fuente; y verificar
cursor, caché y respuesta parcial antes de cambiar el Worker.

## Preview del hardening R2 — 12 de septiembre

El PR `#497` (`490e7b9`) pasó los checks de GitHub y se desplegó en preview
sin ruta productiva mediante el workflow `34713250459`. La prueba remota
confirmó el comportamiento esperado:

| Fuente | `limit=1` | `limit=10` | `limit=25` | `limit=50` | página 2 |
|---|---:|---:|---:|---:|---:|
| InfoLobby | 200 | 200 | 200 | 200 | 200 |
| ChileCompra | 200 | 200 | 200 | 200 | 200 |
| DIPRES | 200 | 200 | 200 | 200 | 200 |

Las respuestas usaron `sourceBackend=r2-lake`; la consulta de InfoLobby
reportó 71.467 filas, 1.430 páginas y cero particiones o artefactos faltantes.
El preview conservó `ALLOW_PUBLIC_D1_READS=0`, por lo que esta validación no
reabrió el camino público hacia D1.

Resultado de esa etapa: el hardening quedó validado para promoción. La
promoción posterior y el smoke productivo se registran en la sección siguiente;
la comprobación confirmó que D1 no volvió al camino público.

## Promoción controlada y smoke productivo — 12 de septiembre

El PR `#497` fue integrado en `main` con commit `05c119ab`. La versión Worker
`eb51837f-5774-465e-9306-fefc694b5698` se promovió al 100% mediante el workflow
`34716564468`, que también confirmó la ruta productiva con health exitoso.

La comprobación directa posterior respondió correctamente:

- `/api/v1/health`: 200, `publicDataBackend=r2` y `publicD1Reads=false`.
- InfoLobby, ChileCompra y DIPRES: HTTP 200 en `limit=1,10,25,50`.
- Página 2 con `limit=50`: HTTP 200 para las tres fuentes.
- InfoLobby y ChileCompra: estado `complete`; DIPRES conserva correctamente
  estado `partial` por su alcance declarado.

El verificador productivo completo quedó iniciado en modo sólo lectura como run
`34716686372`, con crawl frío de concurrencia 1 y doble pasada separada; su
resultado final se registrará cuando termine.

## Estado de los ETL separados — diagnóstico actual

La separación de workflows está activa, pero “workflow separado” no significa
que la fuente esté disponible en cada ejecución. Los últimos resultados
revisados quedan clasificados así:

| ETL | Último resultado | Causa o alcance | Acción segura ahora |
|---|---|---|---|
| Cámara, Senado, Movimientos y Votaciones Senado | Exitoso | La fuente respondió y el release quedó publicado/validado | Mantener preflight y smoke |
| Gastos Senado, Ley 19.862 e InfoProbidad | Exitoso | Publicación separada; sin habilitar D1 pública | Auditar checksum y fecha de corte |
| ChileCompra | Fallido, run `34130670889` | La fuente devolvió HTTP 403; el guard bloqueó un subset vacío | Conservar el snapshot productivo de 74.142 filas |
| Contraloría | Fallido, run `33633187407` | El release R2 se generó, pero la materialización D1 fue rechazada por la cuota diaria | No reintentar D1; R2 queda como publicación canónica |
| CPLT | Fallido, run `34342239360` | Guard de crecimiento R2 bloqueó la publicación al superar el 90% previsto | No publicar hasta revisar tamaño del release |
| Personal de apoyo Cámara | Fallido, run `34127058669` | Página oficial bloqueada (`PERSONAL_APOYO_SOURCE_BLOCKED`) | Conservar snapshot anterior |
| Remuneraciones 38 bis | Fallido, run `34630955321` | El endpoint oficial falló tras cuatro intentos | Conservar el último release verificable |

La compuerta D1 actual es fail-safe: la acción `.github/actions/d1-preflight`
mantiene `allow-remote-materialization=false` por defecto y sólo permite
materializar cuando un workflow manual lo habilita explícitamente y la métrica
está bajo el umbral. El fallo histórico de Contraloría ocurrió antes de esta
política reforzada; no se debe repetir como criterio para reintentarla ahora.

## Trabajo ejecutable sin esperar el reinicio de D1 — corte 12 de septiembre

El reinicio de cuota no es un requisito para continuar con las tareas de
auditoría, reconciliación R2 ni pruebas de conectividad. Sólo quedan fuera de
este bloque las materializaciones y cualquier consulta masiva sobre D1.

### Estado de workflows separado

La consulta de los últimos runs confirmó el siguiente estado operativo:

| Workflow | Último run revisado | Resultado | Tratamiento inmediato |
|---|---:|---|---|
| ETL Diario Cámara | `34691031897` | Exitoso | Auditar release, período y checksum |
| ETL Diario Movimientos | `34690963760` | Exitoso | Auditar fecha del último evento y detección |
| ETL Diario Votaciones Cámara | `34691437098` | Exitoso | Verificar cobertura por período |
| ETL Diario Votaciones Senado | `34691714118` | Exitoso | Verificar cobertura por período |
| ETL Mensual Gastos Senado | `34660874426` | Exitoso | Auditar checksum y corte |
| ETL Mensual InfoProbidad | `34481652765` | Exitoso | Auditar checksum y corte |
| ETL Mensual Ley 19.862 | `34231278337` | Exitoso | Auditar checksum y filas |
| ETL Trimestral DIPRES | `32851856261` | Exitoso | Mantener como dato agregado |
| ETL Semanal InfoLobby | `34713923767` | Exitoso | Mantener universo R2 de 71.467 filas |
| ETL ChileCompra | `34130670889` | Fallido protegido | Fuente HTTP 403; conservar snapshot vigente |
| ETL Contraloría | `33633187407` | Fallido protegido | Falló materialización D1 histórica; no reintentar |
| ETL CPLT | `34342239360` | Fallido protegido | Bloqueo de crecimiento R2; revisar tamaño antes de publicar |
| ETL Personal Cámara | `34127058669` | Fallido protegido | Fuente oficial bloqueada; conservar snapshot |
| ETL Remuneraciones 38 bis | `34630955321` | Fallido protegido | Endpoint oficial no respondió tras cuatro intentos |
| ETL Personal Senado | — | Sin ejecución reciente | Auditar workflow y no forzar ejecución sin fuente |

El resultado confirma que los fallos están aislados por fuente y no justifican
relanzar todo el proceso. Ninguno de los cinco fallos protegidos debe reemplazar
un snapshot válido ni abrir D1.

### Secuencia que queda habilitada ahora

1. Comparar producción contra el release R2 vigente por fuente: filas,
   período, checksum y estado de completitud.
2. Auditar los ETL exitosos sin publicarlos de nuevo: Cámara, Senado,
   Movimientos, votaciones, Gastos Senado, InfoProbidad, Ley 19.862, DIPRES e
   InfoLobby.
3. Revisar de manera aislada los artefactos y guardas de ChileCompra, CPLT,
   Personal Cámara y 38 bis; mantener el último release válido cuando la fuente
   no responda.
4. Confirmar que cada workflow fallido termine antes de cualquier publicación y
   que el guard registre la causa, evitando falsos “cortes vacíos”.
5. Auditar calidad del catálogo público: duplicados, períodos faltantes,
   montos no publicados, nombres normalizados y diferencia entre producción y
   local por fecha de corte.
6. Revisar el espacio local mediante inventario y clasificación; no borrar
   carpetas ni archivos hasta separar rollback, datos únicos y temporales.

### Bloque reservado para después del reinicio

Cuando Analytics confirme una cuota limpia, se hará sólo una sonda acotada y se
verificará que el preflight bloquee materializaciones por defecto. No se
reactivará ningún ETL masivo de D1 como parte de esta revisión. El camino
público seguirá siendo R2.

## Verificación directa adicional de producción — 12 de septiembre

Se consultaron en modo sólo lectura los endpoints productivos, sin ejecutar SQL
ni recorrer D1:

- `/api/v1/health` respondió HTTP 200, con `publicDataBackend=r2`,
  `publicD1Reads=false`, `transferSource=r2` y `transferRows=62172`.
- El mismo health declara `generatedAt=2026-09-08T13:21:08.102Z`; este campo no
  representa por sí solo la fecha de todos los ETL y debe dejar de presentarse
  como un corte global.
- `camara` declara 58.751 registros, pero la consulta verificable devuelve
  `sourceStatus=partial` y `publishedRows=49` en la respuesta de una página.
- `senado` declara 1.428 registros y devuelve `sourceStatus=partial`, con
  `publishedRows=50` en la respuesta de una página.
- `chilecompra` devuelve 74.142 filas, `sourceStatus=complete` y cero
  particiones o artefactos faltantes.
- `infolobby` devuelve 71.467 filas, `sourceStatus=complete` y cero
  particiones o artefactos faltantes.
- `cplt` no entregó filas en la consulta pública: respondió
  `sourceStatus=temporarily-unavailable`, `sourceBackend=none` y razón
  `r2-unavailable`, aunque el catálogo declara 1.226.913 registros.
- `movimientos` devuelve 82 filas desde R2, sin abrir D1.

La conclusión operativa es precisa: el camino público R2 está activo, pero los
catálogos y el estado visible aún mezclan “declarado”, “publicado” y
“consultable”. El siguiente cambio de datos debe corregir esa distinción antes
de mostrar cobertura o corte global; no se debe resolver aumentando D1 ni
descargando el universo al navegador.

El verificador de calendario ETL se ejecutó manualmente en GitHub como run
`34717871931` y terminó exitosamente. La comprobación confirma que los
workflows separados y sus frecuencias declaradas siguen cubiertos por el
calendario; esto no ejecutó ningún ETL ni consumió D1.

## Inventario local de proyectos — 12 de septiembre

Se midieron recursivamente los archivos de las carpetas maestras bajo
`C:\Users\jorge\Proyectos`, sin eliminar ni mover nada:

| Carpeta | Archivos | Tamaño aproximado |
|---|---:|---:|
| `cambiometro-public` | 77.169 | 11,03 GiB |
| `cambiometro-audit` | 147.377 | 8,28 GiB |
| `cambiometro-editorial` | 19.477 | 1,15 GiB |
| **Total** | **244.023** | **20,46 GiB** |

La comprobación encontró únicamente esas tres carpetas `cambiometro-*`; los
worktrees temporales de fases anteriores ya no están presentes en ese nivel.
La diferencia con una medición anterior cercana a 43 GiB corresponde a un
inventario histórico o a contenido temporal que ya no existe en la ubicación
actual. El siguiente paso de limpieza debe ser interno y selectivo: localizar
`node_modules`, caches, `.next`, artefactos de crawls y releases descargados,
conservar rollback y datos únicos, y sólo después proponer eliminaciones.

El desglose de mayor tamaño no autoriza todavía ninguna eliminación:

- En `cambiometro-public`, `data/lake-cplt` ocupa 3,99 GiB y
  `data/cplt-artifacts` 1,28 GiB; son artefactos de datos que deben conservarse
  hasta comprobar su correspondencia con R2 y los manifiestos.
- En `cambiometro-audit`, `data/lake` ocupa 4,05 GiB, `data/raw` 1,25 GiB y
  `data/lake-cplt` 1,25 GiB; se consideran material de auditoría/histórico,
  no caché prescindible.
- El proyecto público contiene copias generadas en `out/data` (1,55 GiB),
  `public/data` (1,55 GiB) y `.next` (1,34 GiB). Son los primeros candidatos a
  una limpieza reversible, pero sólo después de comprobar que no sean la única
  copia local del release que se está probando.
- En editorial, `social/Publicaciones` ocupa 0,34 GiB y queda fuera de la
  limpieza; contiene los assets editoriales que el usuario definió como
  esenciales.

## Resultado del verificador productivo largo — run 34716686372

El run terminó con fallo después de ejecutar dos pasadas y un crawl frío. La
clasificación basada en sus artefactos es:

- El crawl frío fue completamente exitoso: 4.671 de 4.671 rutas respondieron
  HTTP 200, con cero fallos, cero recuperaciones y cero cuerpos con 1102.
- La primera pasada de integración falló porque el endpoint de cruces devolvió
  HTTP 503 en una consulta puntual; una consulta directa posterior al mismo
  endpoint respondió HTTP 200 con datos.
- La segunda pasada volvió a encontrar una respuesta transitoria en gastos de
  Cámara, y el endpoint de funcionarios por municipalidad devolvió HTTP 503;
  ambos respondieron HTTP 200 en una comprobación directa posterior.
- En ambas pasadas el verificador esperaba el tile InfoLobby `60.523`, pero el
  release productivo vigente declara y muestra `71.467` filas.
- En ambas pasadas el verificador esperaba el consolidado histórico `1.490.035`,
  mientras `/fuentes` muestra el consolidado vigente `1.753.013` y el detalle
  de fuentes actualizado.

No se debe promover un parche de datos por este resultado. El siguiente cambio
correctivo corresponde al propio verificador: eliminar expectativas numéricas
históricas rígidas, leer los conteos declarados por la API o el HTML actual y
aplicar reintentos explícitos a las comprobaciones de endpoints que ya tienen
backoff en el resto del sistema. La producción queda operativa, pero la puerta
de verificación no puede declararse verde hasta repetirla con esa corrección.

## Corrección aislada del verificador — PR #498

Se preparó la rama `codex/verification-drift-20260912` y el PR
`https://github.com/jmorgadodev/cambiometro/pull/498`. El cambio no toca datos,
ETL, D1, R2, Pages, rutas ni menú; sólo modifica la instrumentación de
verificación:

- InfoLobby se valida con el conteo productivo observado, actualmente 71.467.
- El barrido de cobertura deja de imprimir el valor histórico 60.523.
- `/fuentes` se valida por presencia de los conteos canónico y consolidado
  vigentes, sin una fórmula histórica rígida.
- Gastos Cámara y funcionarios reintentan respuestas 429/5xx transitorias.
- Se agregan cuatro pruebas unitarias del contrato del verificador.

Evidencia local y productiva de la rama:

- `npm test`: 184 archivos y 986 pruebas pasadas.
- `verify-prod-full` corregido contra producción: 132 verificaciones pasadas,
  0 fallidas; InfoLobby aparece como 71.467 audiencias.
- No se ejecutó ningún ETL ni consulta D1 y el PR no se ha promovido.
- Los checks del PR quedaron en verde: build estático/API, lint, tipos, tests,
  seguridad, CodeQL y validación de workflows. El PR sigue sin merge ni
  despliegue, como corresponde a una corrección exclusiva de verificadores.

## Plan operativo para continuar hoy — sin esperar el reinicio de D1

El reinicio de D1 no debe detener el diagnóstico ni la preparación de los
ETL. Se trabajará en modo sólo lectura sobre producción y R2, sin publicar
nuevos datos ni modificar la estructura del sitio.

### Bloque A — Línea base por fuente

Se tomará una fotografía reproducible de cada endpoint público con `limit=1`
y de su manifiesto productivo. La matriz conservará cuatro conceptos
separados:

1. filas declaradas por el catálogo;
2. filas publicadas en el release;
3. filas consultables en el endpoint;
4. filas que faltan o están temporalmente indisponibles.

El corte directo observado el 12 de septiembre fue:

| Fuente | Catálogo declarado | Endpoint consultable | Estado operativo | Acción hoy |
|---|---:|---:|---|---|
| CPLT | 1.226.913 | 0 | temporalmente indisponible | No reintentar masivo; conservar snapshot y revisar disponibilidad R2 |
| Cámara | 58.751 | 49 en la página verificada | parcial | Conciliar componentes y períodos sin publicar |
| Senado | 1.428 | 50 en la página verificada | parcial | Documentar períodos faltantes, sin reconstruir |
| ChileCompra | 74.142 | 74.142 | completo | Mantener snapshot protegido por 403 de la fuente |
| InfoLobby | 71.467 | 71.467 | completo | Usar como corte productivo vigente |
| DIPRES | 247.287 | 15.689 en el release visible | parcial | Separar agregado de histórico y documentar alcance |
| Movimientos | 82 | 82 | parcial | Validar frescura y fechas por conector |
| Gastos Cámara | 16.275 | 16.275 | R2 | Mantener separado de remuneraciones/votaciones |
| Gastos Senado | 2.500 | 2.500 | R2 | Mantener separado de remuneraciones/votaciones |

La cifra de una página no se interpretará como total del dataset: se usará
únicamente para comprobar que el endpoint responde y que su metadato declara
el alcance correcto.

### Bloque B — Reconciliación Cámara y Senado

Hoy se revisarán los manifiestos y particiones de Cámara y Senado, sin correr
ETL ni materialización. El resultado esperado es una tabla de períodos que
indique `disponible`, `faltante`, `no publicado` o `no verificable`. La fuente
no será considerada completa sólo porque el catálogo tenga un número total.

Para Cámara se conserva como referencia el release R2 con sus particiones
verificadas de 2026 y se separan asistencia, votaciones y gastos. Para Senado
se mantienen explícitamente las ausencias ya detectadas de 2025-08 y 2026-02;
no se inventarán filas ni se copiarán desde otra fuente.

### Bloque C — Movimientos y frescura

Se auditarán hoy cinco fechas independientes: fecha del evento, fecha de
publicación de la fuente, fecha de detección, última ejecución exitosa y
última publicación en Pages. El sitio no recibirá cambios de interfaz en este
bloque; primero se validará que el corte declarado no mezcle esas fechas.

### Bloque D — Calidad y consistencia

Se preparará un reporte de anomalías sobre los releases ya disponibles:

- duplicados aparentes;
- períodos ausentes;
- nombres no reportados o normalizados;
- montos no publicados frente a monto cero;
- categorías mezcladas entre remuneración, asesoría, gasto y votación;
- diferencias de producción frente a local explicadas por fecha o alcance.

Este reporte no corregirá ni reemplazará los archivos originales. Las
correcciones futuras serán índices o vistas derivadas en R2, manteniendo la
fila de origen y su checksum.

### Bloque E — Preparación de ETL aislados

Se validará la configuración de cada workflow sin ejecutarlo:

- qué fuente consulta;
- qué artefacto produce;
- qué guardas impiden publicar vacío;
- qué snapshot conserva si la fuente falla;
- si intenta leer o escribir D1;
- qué checksum entrega;
- qué condición habilita la publicación.

Los workflows con fuente bloqueada (ChileCompra, CPLT, Personal Cámara y 38
bis) permanecerán en modo protegido. No se relanzarán en cadena ni se hará
una publicación por el solo hecho de que el reinicio de cuota ocurra.

### Bloque F — Espacio local, sin borrado impulsivo

Hoy sólo se clasificarán candidatos de limpieza por tipo: caché regenerable,
build reproducible, snapshot único, rollback y material editorial. No se
eliminará nada en esta etapa. Las carpetas esenciales quedan limitadas a
`cambiometro-public`, `cambiometro-audit` y `cambiometro-editorial`; cualquier
worktree temporal debe verificarse antes de proponer su retiro.

### Puerta de decisión posterior

Cuando D1 reinicie, se hará una sola sonda pequeña para confirmar la métrica y
el bloqueo del preflight. Sólo si la cuota está limpia se evaluará una prueba
incremental controlada; no se reactivará la materialización histórica. Todo lo
que se pueda resolver con R2, manifiestos, índices y validadores se cerrará
antes de esa puerta.

## Revisión de compuertas D1 y workflows — corte 12 de septiembre

La inspección estática de los workflows confirma que las ETL programadas usan
la acción `.github/actions/d1-preflight` con el valor predeterminado
`allow-remote-materialization=false`. En ese estado, el workflow puede
ingerir y publicar en R2/Pages, pero no materializa D1. La salida de la acción
es fail-safe: si Analytics no entrega la métrica, también pospone D1.

Se identificaron dos excepciones que permanecen manuales y no deben ejecutarse
durante la cuota crítica:

- `etl-daily.yml`: sólo admite materialización si se dispara manualmente con
  `allow_d1_materialization=true`, sin `skip_d1`, y el preflight está bajo el
  umbral.
- `repair-transfer-d1.yml`: requiere la confirmación literal
  `REPAIR_TRANSFER_D1` y un preflight válido; aunque usa una D1 dedicada,
  consume la cuota de la cuenta y por eso queda igualmente congelado.

El workflow `etl-ley-19862.yml` publica el release de transferencias en R2 y
Pages sin depender de D1; su proyección D1 también está condicionada a un
`workflow_dispatch` y al preflight seguro. Las ejecuciones locales de D1 en
`build-e2e.yml` y `pages-ui-refresh.yml` usan una fixture local y no consumen
la cuota remota.

Conclusión: hoy se puede continuar con auditoría de releases, checksums,
particiones, calidad y espacio local sin abrir D1. La única prohibición
operativa es no marcar manualmente ninguna opción de materialización ni
ejecutar el workflow de reparación. Esta revisión no modificó workflows ni
producción.

## Reconciliación acotada de votaciones — consulta R2 del 12 de septiembre

La consulta sin período fue correctamente rechazada para Cámara con
`QUERY_SCOPE_REQUIRED`; esto confirma que la protección contra escaneos
históricos está activa. Al acotar por año, los resultados fueron:

| Fuente y período | Filas del rango | Filas publicadas en el release | Estado |
|---|---:|---:|---|
| Cámara, 2025 | 0 consultables | 19.062 | parcial; 11 particiones faltantes |
| Cámara, 2026 | 874 consultables | 14.510 | completo; sin particiones faltantes |
| Cámara, agosto 2026 | 102 consultables | 2.117 | completo |
| Cámara, septiembre 2026 | 49 consultables | 979 | completo |
| Senado, 2026 | 196 consultables | 196 | completo |
| Senado, 2025 | 0 | no disponible | temporalmente indisponible |
| Senado, agosto 2025 | 0 | no disponible | temporalmente indisponible |
| Senado, febrero 2026 | 0 | no disponible | temporalmente indisponible |

La cifra `publishedRows` representa el release cargado, no necesariamente el
resultado del filtro temporal; por eso no se sumará directamente con `total`.
El hallazgo confirma que Cámara está actualizada para 2026, mientras que
Senado conserva una brecha real de períodos que debe resolverse desde su fuente
o release oficial, no mediante una copia local ni D1.

## Movimientos y conectividad de fuentes — consulta R2 y origen oficial

La consulta acotada de Movimientos devolvió 82 registros desde R2, con eventos
entre 2026-02-15 y 2026-09-02. Los dos casos que estaban pendientes de revisión
siguen marcados `en_confirmacion` y conservan `fecha_deteccion` del proceso;
no se promovieron automáticamente a `verificado` porque aún falta el acto
administrativo correspondiente.

También se hizo una comprobación liviana de disponibilidad de los portales,
sin descargar nóminas ni ejecutar los conectores completos. Respondieron HTTP
200 ChileCompra, Portal de Transparencia, OpenData Congreso y el Registro 38
bis. Esto no demuestra que los archivos internos estén disponibles: sí indica
que los fallos anteriores deben clasificarse como fallo del recurso o del
conector, no como caída total del dominio.

La siguiente acción segura para esas fuentes es inspeccionar el índice y sus
enlaces de descarga con una petición acotada, registrar URL, código HTTP,
content-type, tamaño y checksum, y sólo entonces evaluar un ETL aislado. No se
debe relanzar el workflow completo por el solo hecho de que la portada
responda.

La inspección de índices avanzó un paso sin descargar los universos:

- ChileCompra expone un `manifest.json` HTTP 200 de 434 bytes, pero la ruta de
  descargas entrega una aplicación web; el conector debe resolver los recursos
  desde ese índice/app y no asumir que la portada es un CSV.
- El Registro 38 bis expone `registro-publico?csv-todo` HTTP 200 con
  `text/csv`; la cabecera confirma campos de período, organismo, cargo,
  nombres, remuneración bruta y asignaciones. El endpoint oficial responde y
  merece una prueba de conector acotada antes de declarar la fuente caída.
- OpenData Cámara responde el endpoint XML de diputados vigentes HTTP 200; la
  prueba anterior que lo clasificó como HTML fue una inspección de cabeceras,
  no una falla del recurso.
- Portal de Transparencia responde la página de búsqueda HTTP 200, pero su
  interfaz es dinámica; se debe auditar el recurso de datos que consume la
  página, no la portada.

Esto cambia la prioridad: no se ejecuta todavía ningún ETL, pero el próximo
trabajo puede ser una prueba aislada de extracción de encabezado/metadatos por
fuente. Si pasa, se prepara un release de prueba sin publicar; si falla, se
conserva el snapshot actual y se registra el motivo exacto.

### Corrección aislada preparada para 38 bis

Con la evidencia anterior se preparó el PR
`https://github.com/jmorgadodev/cambiometro/pull/499` desde la rama
`codex/38bis-csv-connector-20260912`. El cambio:

- consulta el CSV oficial `?csv-todo` como entrada primaria;
- selecciona el período más reciente del archivo;
- conserva el parser HTML como fallback;
- mantiene historial, checksum y estados de monto no informado;
- añade pruebas del formato delimitado, acentos, comillas y períodos.

La prueba aislada del primer chunk real respondió HTTP 200, `text/csv`, y
produjo 71 filas válidas sin descargar el universo completo. `node --check` y
`git diff --check` están verdes. El PR queda sin merge y sin despliegue hasta
que CI termine y se revise una ejecución de release aislada.

## Comparación real CSV 38 bis versus producción

Se hizo una comparación de lectura contra la fuente oficial, sin escribir el
resultado en el repositorio ni publicarlo. El CSV actual contiene 29.703 filas
en 18 períodos, desde 2025-01 hasta 2026-06. Para el período vigente
2026-06 entrega 1.634 filas, de las cuales 1.066 tienen monto.

La versión productiva/local auditada tenía 1.632 filas del mismo período. La
primera comparación sin normalización parecía mostrar 567 entradas y 565
salidas, pero el 100% de esa diferencia correspondía a variantes de mayúsculas
en `No reportado`/`NO REPORTADO`. Tras normalizar espacios, mayúsculas y
tildes, el resultado real fue:

| Comparación | Resultado |
|---|---:|
| Entradas nuevas reales | 2 |
| Salidas observadas reales | 0 |
| Cambios de monto | 0 |

Las dos filas nuevas son `MARIA JOSE CRUZ VERGARA` (Asesor Senior,
$2.400.000) y `PILAR FRANCISCA LIZANA TORESANO` (Asesor Senior, $2.560.000),
ambas del Ministerio de Seguridad Pública. Esto confirma que el problema no
era una pérdida masiva de remuneraciones, sino una diferencia de formato más
dos registros nuevos.

El PR #499 fue actualizado con la normalización de claves y una prueba que
impide volver a generar falsos deltas por mayúsculas o tildes.

## Plan operativo inmediato — sin esperar el reinicio de D1

Este plan se ejecuta en paralelo a la espera de una cuota D1 limpia. No
requiere SQL, materialización, ETL completo, cambios de interfaz ni despliegue.

### Bloque A — cerrar 38 bis aislado

1. Esperar únicamente los checks del PR #499 sobre el commit
   `ead788d4f62714a8f11dc8b2eb43234a2a6f523f`.
2. Si los checks quedan verdes, dejarlo listo para revisión; no hacer merge ni
   promoción automática.
3. Mantener como evidencia la comparación contra el CSV oficial:
   29.703 filas históricas, 18 períodos, 1.634 filas en 2026-06, dos altas
   reales y cero bajas o cambios de monto frente al release actual.

### Bloque B — reconciliar ETL sin publicar datos

Auditar en modo lectura, en este orden:

1. Cámara: separar padrón, votaciones, asistencia, apoyo y gastos; registrar
   filas, período, checksum y estado del release.
2. Senado: repetir la misma matriz y mantener rotuladas como parciales las
   particiones cuya cobertura no coincida con el catálogo.
3. Movimientos: verificar evento más reciente, última detección y último
   release publicado; conservar el snapshot si una fuente falla.
4. ChileCompra, InfoLobby, CPLT y DIPRES: comparar catálogo, índice R2 y
   respuesta paginada pequeña, sin reconstruir universos.

La salida de este bloque es una matriz de diferencias, no una carga de datos.
Una discrepancia por fecha o alcance se documenta; no se corrige reemplazando
producción con un snapshot local.

### Bloque C — calidad y consistencia

Sobre los releases ya disponibles se medirán duplicados, períodos faltantes,
montos ausentes versus cero, nombres no reportados, cambios de organismo y
conteos declarados versus consultables. Se conservará el valor original y se
separará siempre `catalogado`, `publicado` y `consultable`.

### Bloque D — espacio local sin riesgo

Se mantiene el inventario de las tres carpetas maestras y se clasifica cada
subcarpeta como rollback, dato único, build regenerable, caché o temporal. No
se elimina nada hasta comprobar que el archivo no sea la única copia local de
un release o evidencia de auditoría.

### Bloque E — D1 después, sólo como comprobación

Cuando la cuota se reinicie, se ejecutará una sola sonda acotada para confirmar
la métrica y el bloqueo por defecto. No se reactivará materialización masiva.
Si la cuota sigue crítica, el plan continúa por R2 sin reintentos automáticos.

### Estado de ejecución

- Bloque A: en ejecución; PR #499 sincronizado y con lint/types/security
  verdes, build/E2E pendiente.
- Bloque B: habilitado; salud productiva consultada en modo lectura y confirma
  `publicDataBackend=r2` y `publicD1Reads=false`.
- Bloque C: habilitado; la reconciliación real de 38 bis ya está cerrada y se
  extenderá por fuente.
- Bloque D: inventario inicial cerrado; falta sólo clasificar candidatos, sin
  borrar.
- Bloque E: reservado para el reinicio; no bloquea A-D.

La regla de trabajo queda fijada: avanzar por fuente y por evidencia mientras
D1 espera, sin tocar el camino público ni mezclar snapshots locales con la
referencia productiva.

## Foto operativa de workflows — 12 de septiembre, 18:00 UTC-3

Consulta de sólo lectura a GitHub Actions; no se disparó ningún workflow.

| Fuente o proceso | Último run | Estado | Decisión inmediata |
|---|---:|---|---|
| Cámara | `34691031897` | `success` | Auditar alcance y checksum; no republicar |
| Movimientos | `34690963760` | `success` | Auditar frescura y mantener snapshot anterior ante fallo |
| Votaciones Cámara | `34691437098` | `success` | Separar período y componente de Cámara |
| Votaciones Senado | `34691714118` | `success` | Confirmar corte de 2026-09 |
| InfoLobby | `34719886264` | `success` | Mantener universo R2 de 71.467 filas |
| DIPRES | `32851856261` | `success` | Mantener como agregado; revisar frescura |
| ChileCompra | `34130670889` | `failure` | Conservar snapshot de 74.142; no publicar vacío |
| CPLT | `34342239360` | `failure` | No regenerar hasta resolver guard de tamaño |
| Personal Cámara | `34127058669` | `failure` | Conservar snapshot por bloqueo de fuente |
| Personal Senado | — | sin ejecución reciente | Auditar workflow antes de forzar cualquier corrida |
| Remuneraciones 38 bis | `34630955321` | `failure` histórica | Corrección aislada en PR #499; no tocar producción |

La presencia de un workflow verde no autoriza por sí sola una publicación: aún
debe coincidir el período, el número de filas, el checksum y el estado de
completitud del release. Del mismo modo, un fallo aislado no autoriza a borrar
el snapshot productivo. Esta matriz es la base para probar cada ETL por
separado sin arriesgar el resto del sitio.

## Smoke de fuentes R2 — lectura acotada, 12 de septiembre

Se consultó una sola fila por fuente (`limit=1`) contra producción. No se
consultó D1 ni se descargó ningún universo completo:

| Fuente | HTTP | Backend | Estado | Total declarado | Publicado | Página siguiente |
|---|---:|---|---|---:|---:|---|
| Cámara | 200 | `r2-lake` | parcial | 58.751 | 49 | sí |
| Senado | 200 | `r2-lake` | parcial | 1.428 | 50 | sí |
| Movimientos | 200 | `r2` | parcial | 82 | 82 | sí |
| ChileCompra | 200 | `r2-lake` | completo | 74.142 | 74.142 | sí |
| InfoLobby | 200 | `r2-lake` | completo | 71.467 | 71.467 | sí |
| DIPRES | 200 | `r2-lake` | parcial | 247.287 | 15.689 | sí |

El resultado permite continuar con la auditoría de alcance sin esperar D1. La
prioridad inmediata es explicar los estados parciales de Cámara, Senado y
DIPRES; no aumentar el catálogo ni convertir el total declarado en cobertura
consultable.

## Reconciliación local/producción ejecutada ahora

Se ejecutó `audit-source-reconciliation.mjs` con el catálogo local explícito
(`transparencia-app/data/lake/catalog/v1/manifest.json`) y su estado ETL, sin
escribir salida ni consultar D1. Resultado: 15 filas lógicas, 3 coincidencias
directas, 12 diferencias de alcance y 0 diferencias sin explicación técnica
inmediata.

Hallazgos que guían el trabajo siguiente:

- Cámara y Senado locales mezclan categorías y componentes adicionales
  (gastos, votaciones, asesorías) con la fuente base. No se debe comparar su
  total local contra la remuneración base de producción.
- ChileCompra local conserva el histórico de 888.693, mientras producción
  expone el corte vigente de 74.142. La diferencia es de alcance, no una
  pérdida de registros.
- InfoLobby local conserva 60.523 frente a 71.467 productivos; debe
  verificarse el release productivo y su índice antes de ampliar el snapshot
  local.
- Ley 19.862 local registra 59.361 frente a 62.172 en producción; la fecha
  productiva es 2026-09-08 y la local 2026-08-21. Es una diferencia de
  frescura que debe reconciliarse por release, no mediante D1.
- Transparencia Activa local registra 1.218.136 frente a 1.226.913 en
  producción; el productivo es 2026-09-02 y el local 2026-08-21. Queda como
  diferencia de frescura/alcance pendiente de separar por período.
- INE Censo 2024, SERVEL y SINIM coinciden directamente; son referencias
  útiles para validar que el procedimiento no confunda una diferencia real
  con una fecha de corte distinta.

Conclusión: no existe evidencia para reemplazar local por producción ni para
recargar datos ahora. La próxima tarea segura es generar una matriz por
componente y período para Cámara, Senado, CPLT, InfoLobby, ChileCompra y Ley
19.862; sólo después se decidirá qué snapshot histórico conviene conservar.

## Validación CI de la corrección 38 bis

El PR #499 quedó verificado sobre el commit `ead788d4` con los tres checks
obligatorios en verde:

- Lint, tipos y pruebas unitarias.
- Security Scan.
- Build de Pages, Worker y verificación E2E.

La corrección sigue aislada: no se hizo merge, no se publicó un release y no se
ejecutó D1. Queda lista para revisión dentro del ciclo de publicación por
fuente.

## Inventario preciso del proyecto maestro — sin eliminar

Se midieron las rutas reales bajo `cambiometro-public/transparencia-app`.
La clasificación es informativa; no se borró ni movió ningún archivo.

| Ruta | Tamaño | Clasificación | Tratamiento |
|---|---:|---|---|
| `.next` | 1,34 GiB | Build regenerable | Candidato de limpieza reversible |
| `out` | 2,13 GiB | Export estático regenerable | Conservar hasta cerrar el último preview |
| `public/data` | 1,55 GiB | Artefactos publicados/locales | No borrar: contiene datos servidos por Pages |
| `data/lake-cplt` | 3,99 GiB | Histórico/proyección CPLT | Conservar hasta verificar rollback y R2 |
| `data/cplt-artifacts` | 1,28 GiB | Artefactos intermedios por categoría | Candidato sólo después de comprobar R2 y manifest |
| `data/raw` | 0,12 GiB | Fuentes crudas de auditoría | Conservar hasta cerrar trazabilidad |
| `data/static-site-release` | 0,06 GiB | Release local | Conservar como rollback inmediato |

Los candidatos potenciales de ahorro son `.next`, `out` y parte de
`data/cplt-artifacts`, pero no se autoriza una limpieza destructiva hasta
comprobar que el release correspondiente existe en R2 y que el repositorio
puede reconstruirlo. `public/data` no se clasifica como caché prescindible:
contiene el material que el sitio está sirviendo localmente y sirve como
respaldo de verificación.

## Movimientos: verificación productiva R2 — 12 de septiembre

Se consultó una página única de hasta 100 filas desde R2. El resultado fue:

| Métrica | Resultado |
|---|---:|
| Filas consultables | 82 |
| Evento más antiguo | 2026-02-15 |
| Evento más reciente | 2026-09-02 |
| Última detección observada | 2026-09-12 11:24:46 UTC |
| `verificado` | 74 |
| `en_confirmacion` | 8 |
| Registros sin fuente oficial en el arreglo de evidencia | 6 |

La publicación productiva está disponible desde R2 (`sourceStatus=partial`),
pero el último evento no coincide con la última detección: el proceso detectó
datos hasta el 12 de septiembre mientras el evento más reciente es del 2 de
septiembre. Esto es un desfase de actividad de la fuente, no una caída de R2.

Los casos relevantes quedan separados: Alonso Velásquez tiene evidencia
oficial y permanece `en_confirmacion`; Patricio Löhr permanece pendiente de
evidencia oficial. No se promoverá ningún registro provisional a verificado ni
se eliminará el snapshot anterior por falta de novedades.

## Transparencia Activa: disponibilidad del índice público

Se hicieron tres consultas acotadas en producción, sin descargar el universo:

- `source=transparencia-activa&limit=1`;
- `source=transparencia-activa&q=torrealba&limit=1`;
- el alias histórico `source=cplt&q=torrealba&limit=1`.

Las tres respondieron HTTP 200 con `sourceBackend=none`,
`sourceStatus=temporarily-unavailable` y cero filas. El catálogo, en cambio,
declara 1.226.913 registros publicados. Por tanto, el resultado no debe
presentarse al usuario como “sin coincidencias”: significa que el índice o
release público de CPLT no está disponible para consulta en este momento.

La acción correcta queda acotada y separada del incidente D1: revisar la
existencia y el nombre exacto del objeto R2 de CPLT, validar su manifest y
repetir una consulta paginada pequeña. Mientras eso no pase, la interfaz debe
conservar el estado de indisponibilidad y no reemplazarlo por cero ni por una
respuesta vacía normal.

### Comprobación directa del release R2 CPLT

La revisión directa del bucket confirmó que el objeto sí existe y es válido:

- `projections/funcionarios-v1/manifest.json` responde y declara versión
  `2026-09-02T03:28:30.598Z`.
- El manifest declara 1.226.913 filas y 1.514 assets.
- El índice nacional responde con 127.900 bytes.
- La primera página física responde con 10.000 filas y checksum registrado.
- `/api/v1/funcionarios?q=torrealba&limit=5` responde desde `r2-search` con
  558 coincidencias.

La conclusión cambia el diagnóstico: R2 no está caído. La ruta genérica
`/api/v1/records?source=cplt` no corresponde al contrato de la proyección
CPLT y cae en `temporarily-unavailable`, mientras la ruta canónica
`/api/v1/funcionarios` sí funciona. Esto debe corregirse en la auditoría de
contratos antes de declarar que Transparencia Activa está ausente o sin datos.
