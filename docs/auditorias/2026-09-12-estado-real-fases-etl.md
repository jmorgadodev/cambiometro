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
