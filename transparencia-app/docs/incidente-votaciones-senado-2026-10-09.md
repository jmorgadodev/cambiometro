# Incidente de cobertura — votaciones recientes del Senado

Fecha de comprobación: 2026-10-10. Incidente cerrado para el corte del 6–7 de octubre; el Senado sigue marcado como parcial cuando falta el padrón de asistencia.

## Hallazgo

- Antes de la corrección, la API pública declaraba 313 registros y el registro más reciente tenía `occurredAt=2026-09-23`. `complete` describía la integridad del release publicado, no su frescura.
- La página de votaciones muestra globalmente el 2026-10-07 como última votación incorporada, pero esa fecha no corresponde al último registro del Senado. La sección reciente consulta la API de Senado y queda vacía porque el release de esa fuente termina el 23-09.
- El listado oficial del Senado contiene sesiones 10291 y 10292 del 06-10 y 10293 del 07-10. Sus endpoints oficiales de votaciones responden datos. Para la sesión 10292, la respuesta por defecto informa `total=13` pero entrega 10 elementos; `?limit=100` entrega los 13. El conector omitía ese límite y podía truncar sesiones sin advertirlo.
- El endpoint oficial de asistencia de esas tres sesiones devuelve `data: []`, que no incluye el padrón `data.DATA` requerido para reconstruir quién asistió pero no votó. Una sesión anterior (10278, 23-09) sí devuelve padrón. El conector ahora conserva los votos nominales explícitos aunque falte ese padrón y marca la sesión `reported_votes_only`; no inventa ausencias ni “No Vota”. Una respuesta incompleta del endpoint de votaciones sigue bloqueando esa sesión.

## Corrección local y prueba

Se agregó `limit=100` a la petición de votos y una guarda que rechaza una respuesta si `total` excede las filas devueltas. Si falta la asistencia, el ETL publica únicamente los votos nominales que la fuente sí entregó y etiqueta la limitación hasta recuperar el padrón. La ficha parlamentaria advierte que no se deben interpretar esos registros como ausencia o “No Vota”. Las pruebas cubren paginación, fallback sin padrón y el caso con padrón válido:

```powershell
node --test scripts/etl/connectors/senado-votaciones-pagination.test.mjs
```

El replay acotado del 24 de septiembre al 10 de octubre encontró 73 registros nuevos; el corte de octubre contiene 17 votos nominales (IDs oficiales 11414–11430). Como las respuestas oficiales no incluyen padrón para todas las sesiones, se conservaron únicamente votos explícitos y se marcó la cobertura como `reported_votes_only`; no se completaron ausencias por inferencia.

La publicación pasó las guardas de tamaño y se completó en R2 sin borrados. Uso de cuenta reportado antes de Pages: 8.600.965.922 bytes; proyección máxima del lote estático: 8.614.495.155 bytes, bajo el límite configurado de 10.000.000.000 bytes y el umbral de bloqueo del 95%. Release estático: `3c6b708e33f8a1598aa3f5eeff6b38304f5394e271b2f7d7fe08a8eba96d4b24`.

El refresco oficial de Pages terminó con éxito desde `main` (`046e1d1917c3e8f2219092352702bd6bd3e5fef1`), workflow [38014216722](https://github.com/jmorgadodev/cambiometro/actions/runs/38014216722). Pasaron la construcción estática, coherencia con el release API, verificaciones de export, fichas y gastos, publicación productiva y registro de rollback. Smoke posterior: API de Senado responde 200 con 389 registros y fecha global más reciente `2026-10-07`; `/votaciones-destacadas`, `/movimientos` y la ficha de Manuel José Ossandón responden 200. Consulta filtrada para su ID canónico `person-senado-1340`: 357 registros nominales y el más reciente asociado a él es `2026-09-30` (registro `sen-vot-11411`). La sesión del 7 de octubre no lo incluye entre los votos nominales explícitos, por lo que no debe mostrarse como voto suyo ni como ausencia.

## Siguiente paso y criterio de promoción

La actualización del release y de Pages está cerrada. Pendiente de datos —no bloquea el release de votos explícitos—: localizar un padrón oficial alternativo o reconsultar cuando las sesiones publiquen `data.DATA`; hasta entonces no afirmar asistencia ni “No Vota” para quienes no aparecen en la lista nominal. La publicación de la API no garantiza que cada parlamentario haya emitido un voto en cada sesión.

## Fuentes reproducibles

- [Listado oficial de sesiones](https://tramitacion.senado.cl/wspublico/sesiones.php?legislatura=374)
- [Sesión de Sala 65 Ordinaria — 6 de octubre](https://www.senado.cl/comunicaciones/galerias-multimedias/sesion-de-sala-65-ordinaria)
- [Sesión de Sala 66 Especial — 7 de octubre](https://www.senado.cl/comunicaciones/galerias-multimedias/sesion-de-sala-66-especial)
- [Votaciones oficiales, sesión 10292](https://web-back.senado.cl/api/votes?id_sesion=10292&limit=100)
- [Asistencia oficial, sesión 10292](https://web-back.senado.cl/api/sessions/attendance?id_sesion=10292)
- [API pública del release de votaciones](https://cambiometro.impulsacv.cl/api/v1/records?source=votaciones_senado&kind=vote&limit=50)
