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
