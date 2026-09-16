# Auditoría integral de producción — 2026-09-16

## Resultado

La verificación integral de `https://cambiometro.impulsacv.cl` terminó con **132 verificaciones pasadas y 0 fallidas**. La ejecución fue de lectura y no descargó universos masivos ni escribió en D1.

## Evidencia verificada

| Área | Resultado |
|---|---|
| Movimientos | 46/46 del release reconciliado `kast-2026-succession-reconciled-2026-09-14` |
| Movimientos checksum | `9a884d9bef8627718afed406d530591acec6a95c50dd27956c744b56766f1995` |
| Movimientos estados | 11 oficiales, 35 corroborados, 0 en confirmación |
| Remuneraciones unificadas | 33.776 filas, 169 páginas estáticas |
| Búsquedas de remuneraciones | Lucy Depablos, Sofía Pumpin, María Victoria Raimann Pumpin e Independencia con respuesta |
| Transferencias | 62.172 filas desde R2; 0 filas públicas desde D1 |
| InfoLobby | 71.467 audiencias en release productivo |
| Cámara/Senado | Invariantes de votaciones y personal de apoyo verdes |
| Home, fichas, fuentes, calidad y rutas | Sin regresiones detectadas |

## Controles corregidos

- `scripts/coverage-sweep.mjs` ya no compara un release reconciliado de 46 contra el benchmark histórico de 79. Usa el `targetCount` de `movimientos-scope-policy.json` cuando el release está marcado como `published_reconciled`.
- Se creó `scripts/verify-prod-remuneraciones.mjs`, que valida el contrato público de Remuneraciones con búsquedas pequeñas y reintentos ante fallos transitorios.

## Interpretación de D1

El health productivo puede mostrar `d1Consistent=false` mientras `transferSource=r2`. Esto es intencional: `HEALTH_CHECK_D1` está desactivado para no consumir lecturas de D1, y R2 es el origen público canónico. No se debe habilitar el chequeo físico en cada visita ni volver a usar `COUNT(*)` sobre tablas masivas.

## Pendientes reales

1. El barrido ejecutado directamente con fixtures locales sigue marcando Transferencias e InfoLobby como parciales porque esos fixtures locales son muestras; la auditoría productiva, que recibe el manifiesto R2 vigente, queda verde.
2. La normalización y ampliación de otras fuentes debe continuar por bloques independientes, sin reemplazar releases productivos con snapshots locales antiguos.
3. Los cambios posteriores sólo se promueven después de repetir este control integral y conservar rollback.

## Restricciones preservadas

- No se modificó el menú ni las rutas públicas.
- No se tocó `cambiometro-editorial/social/Publicaciones/`.
- No hubo escrituras en Google Sheets.
- No se ejecutó ETL durante esta auditoría.
- D1 permanece fuera de búsquedas públicas masivas.

## Matriz de paridad producción/R2 frente al checkout local

La herramienta `npm run audit:sources` se ejecutó el 16-09-2026 en modo
**health-only**: este checkout no contiene el manifiesto lake completo, por lo
que se usó únicamente `data/etl/source-health.json` como snapshot local. Eso
permite detectar frescura, pero no prueba que el snapshot local sea equivalente
al release R2.

| Fuente | Producción/R2 | Snapshot local | Clasificación segura |
|---|---:|---:|---|
| Cámara | 58.751 | 19.025 | Frescura; además el total productivo separa asistencia, votaciones y gastos |
| Senado | 1.428 | 8.138 | Alcance por reconciliar; el release nuevo tiene menos filas |
| ChileCompra | 74.142 | 888.693 | Alcance/histórico por reconciliar |
| Contraloría | 310 | 291 | Frescura |
| Transparencia Activa | 1.243.761 | 1.218.136 | Frescura |
| DIPRES | 247.287 | 476 | Alcance/resumen incompatible; no calcular cobertura individual |
| InfoLobby | 71.467 | 71.467 | Conteo igual; snapshot local más antiguo |
| InfoProbidad | 16.077 | 15.331 | Frescura |
| Ley 19.862 | 62.172 | 59.361 | Frescura |
| SERVEL | 23.894 | 23.894 | Conteo igual; fecha distinta |
| SINIM | 3.105 | 3.105 | Conteo igual; fecha distinta |
| INE Censo | 346 | 346 | Conteo igual |

La mejora del auditor evita clasificar como “frescura” una versión productiva
más nueva que contiene menos filas. Por eso Senado queda en **alcance por
reconciliar**, no como una actualización normal. La matriz no modifica datos,
no descarga universos y no escribe en R2 o D1.

## Revisión específica de Cámara y Senado

Se consultaron los manifiestos productivos de R2 y endpoints públicos paginados
con límites pequeños. Los conteos siguientes no deben sumarse entre sí: una
fuente base puede tener componentes separados de asistencia, votaciones y
gastos.

| Componente | Declarado en catálogo R2 | Resultado de consulta | Estado |
|---|---:|---:|---|
| Cámara, fuente base | 58.751 | 58.751 | Parcial; la consulta histórica exige período y no permite escaneo global |
| Cámara, votaciones | Incluidas dentro de 58.751 | Consulta sin período bloqueada por `QUERY_SCOPE_REQUIRED` | Protección esperada; validar por período |
| Cámara, gastos | 16.275 | 16.275 | Parcial por período; conteo reconciliado |
| Senado, fuente base | 1.428 | La fuente base no entrega filas directamente | Conteo de catálogo/entidades, no una nómina única consultable |
| Senado, votaciones | 194 | 166 publicados en la consulta resumida | Parcial; diferencia de 28 pendiente de reconciliar por período |
| Senado, gastos | 6.517 | La consulta pública limita la respuesta a 2.500 | No equivale a pérdida; falta validar paginación y alcance por período |
| Personal de apoyo | No consolidado en este release | `temporarily-unavailable` | Mantener último release válido; nunca interpretar como cero |

El manifiesto R2 sí contiene las particiones de Senado: 194 votaciones en
marzo-septiembre de 2026 y 6.517 gastos en enero-mayo de 2026. Por tanto, la
diferencia observada en una respuesta resumida no autoriza a borrar ni
republicar datos. El siguiente control debe recorrer sólo los manifiestos y
consultas paginadas por período, comparar IDs y checksums, y dejar separado el
conteo de catálogo del conteo efectivamente consultable.

## Plan de continuidad posterior a Movimientos

1. **Cierre de Movimientos (completado):** conservar el release de 46 salidas,
   comprobar el checksum productivo y congelar el ETL anterior. No agregar
   nombres por prensa o inferencia.
2. **Reconciliación de Cámara/Senado:** validar por período los componentes de
   votaciones y gastos, sin usar D1 ni descargar el universo al equipo. La
   publicación permanecerá parcial hasta que conteos, IDs y checksums coincidan.
3. **Auditoría de remuneraciones:** comparar el manifiesto vigente con los
   casos críticos conocidos y registrar faltantes sin convertir ausencias en
   cero. No incorporar convocatorias ni fuentes periodísticas como pago.
4. **Movimientos siguientes:** revisar únicamente novedades posteriores al
   corte cerrado, con evidencia oficial y rollback antes de cualquier cambio.
5. **Validación integral:** repetir el verificador productivo, smoke móvil y
   escritorio, y revisar R2/D1 antes de promover otro bloque.

La regla operativa es una fuente por bloque: si falla una fuente se conserva su
último release válido y no se altera el resto del sitio. El progreso se medirá
por bloque verificado, no por cantidad de archivos generados.

## Incidencia adicional detectada: filtro de período en gastos

La consulta productiva de prueba
`source=gastos_senado&kind=expense&period=2026-01&limit=3` respondió HTTP 200,
pero entregó `total=2.500` y filas de `2026-05`. Esto demuestra que el parámetro
de período era aceptado por la API, pero no se aplicaba al origen R2 de gastos.

La corrección quedó implementada y probada localmente en el commit
`c7b9b3a`:

- el lake filtra particiones por período antes de leerlas;
- la proyección compacta filtra sus filas por período;
- se validan períodos `AAAA` y `AAAA-MM`;
- el alias de votaciones de Cámara queda restringido a su variante;
- las pruebas de reproducción pasan en R2 y en el Worker.

El despliegue quedó pendiente de autorización técnica porque el token disponible
no tiene permiso de edición de Workers. Producción conserva el comportamiento
anterior hasta que se publique este commit; no se considera cerrado antes de
repetir la consulta productiva y comprobar que `2026-01` sólo devuelve filas de
`2026-01`.

## Senado: particiones de votaciones ausentes en R2

La revisión directa de manifiestos confirmó que los objetos
`partitions/votaciones_senado/2026/08/manifest.json` y
`partitions/votaciones_senado/2026/09/manifest.json` no existen en el bucket,
aunque el catálogo los declara con 23 y 5 filas respectivamente. Las
particiones de marzo a julio sí existen y suman 166, que coincide exactamente
con lo que entrega actualmente el endpoint.

El conector oficial se probó en lectura para el período 2026-08 a 2026-09-15 y
respondió con 52 votaciones: 23 de agosto y 29 de septiembre. Por ello:

- las 23 de agosto están disponibles en el snapshot local de votaciones;
- septiembre requiere una actualización oficial, no una inferencia;
- el catálogo productivo de 194 está desfasado y no representa todo lo que hoy
  responde la fuente;
- no se deben cambiar los conteos manualmente ni presentar las 166 como
  cobertura completa.

La recuperación correcta será construir un release separado por períodos,
validar IDs y checksums, publicar las particiones y sólo después actualizar el
catálogo. Si una sesión falla, se conserva la partición anterior y no se
publica un período incompleto.

## Cierre de Movimientos y ruta de auditoría

La verificación productiva `npm run verify:prod:movimientos` quedó en verde:

- `releaseId`: `kast-2026-succession-reconciled-2026-09-14`.
- Total publicado: **46 salidas**.
- Corte público: **14-09-2026**.
- Checksum SHA-256: `9a884d9bef8627718afed406d530591acec6a95c50dd27956c744b56766f1995`.
- No aparecen Carolina Arredondo, Eduardo Vergara, Ignacia Fernández, Daniela Dresdner, José Andrés Herrera ni Patricio Kuhn.
- Rafael Araos conserva el cargo de subsecretario.

Movimientos queda **cerrado y vigente en producción**. No se reejecutará el ETL
histórico ni se añadirán autoridades por inferencia o por prensa. Las novedades
posteriores al corte se auditarán como un release nuevo, con evidencia oficial,
checksum y rollback.

### Plan operativo siguiente

1. **Senado:** desplegar y verificar el filtro de período del Worker; después
   reconstruir agosto/septiembre desde el conector oficial porque faltan sus
   particiones físicas en R2.
2. **Cámara y Senado:** reconciliar por separado votaciones, gastos, asesorías y
   personal de apoyo usando manifiestos, IDs, períodos y checksums.
3. **Remuneraciones:** auditar cobertura, faltantes, duplicados y períodos de
   los pagos publicados; nunca convertir ausencia en cero ni incorporar
   convocatorias o prensa como remuneración.
4. **Calidad y R2:** verificar tamaño, release, checksum y rollback antes de
   cada publicación. D1 seguirá fuera de las búsquedas masivas.
5. **Validación final:** ejecutar API, rutas, móvil, escritorio, conteos y
   limpieza de textos internos antes de promover cada bloque.

Un bloque sólo se cierra cuando producción, manifiesto y API coinciden. Si una
fuente falla, se conserva el último release válido y no se publica cero ni se
modifica el resto del sitio.

### Preparación local del release de Senado

Se ejecutó el preparador aislado
`scripts/etl/prepare-senado-votaciones-release.mjs` contra el conector oficial,
sin escribir en R2, D1, Pages ni en el snapshot ETL principal. El paquete quedó
en `artifacts/senado-votaciones-2026-09-16/` con estado
`staged_not_published`:

- 2026-08: 23 registros, checksum de partición
  `15e1846a1b008fffdcf86a820ecbe62fd23561e8bd8caa6b20d0b0cae63d2c4e`.
- 2026-09: 29 registros, checksum de partición
  `9cf02126e49cb21c1de520636f46e7593d8d192565b67d147b9d8ccace7ad7f5`.
- Total preparado: 52 registros.
- El paquete contiene 9 artefactos y conserva manifiesto, `sha256.txt`, entidades
  e índice local.

Este catálogo de staging contiene sólo el bloque de Senado y **no puede
publicarse como catálogo completo**. Para promoverlo se debe fusionar con el
catálogo productivo vigente, validar que no se alteren otras fuentes y publicar
particiones/manifiestos en una sola operación con rollback.

### Corrección de compatibilidad Cámara — 2026-09-16

Se corrigió localmente el alias histórico `votaciones_camara`: las particiones
antiguas que aún no tienen `variant` pueden leerse como votaciones sólo cuando
el filtro de tipo es `vote`. Las filas de asistencia quedan fuera de los datos,
del conteo publicado y del conteo esperado de ese alias. No se mezclan
categorías ni se consulta D1.

- Commit: `568ddee`.
- Tests dirigidos de R2/API: **2/2**.
- Typecheck de aplicación y Worker: **verde**.
- Tamaño del Worker: **178,28 KiB** sin comprimir, bajo el límite de 1 MiB.

La corrección está en la rama local y aún requiere promoción controlada para
que tenga efecto en producción.

### Resultado de la suite completa — 2026-09-16

La suite quedó en **189 archivos aprobados y 5 fallos**. Los cinco fallos son
de fixtures locales de Transferencias Ley 19.862: el snapshot local contiene
1.000 filas y los tests esperan el baseline productivo de 59.361; además faltan
los topes derivados. No se reemplazará el snapshot local por una descarga masiva
ni se usará este desfase para afirmar que producción está dañada. Queda como
auditoría de consistencia local/producción, separada del cambio de Cámara.

### Revisión productiva posterior — 2026-09-16

La verificación integral productiva registró **132 comprobaciones aprobadas y 2
fallidas**. Las dos fallas son la misma incidencia de filtro de período:

- `gastos_senado&period=2026-01` todavía devuelve filas de `2026-05`.
- `votaciones_senado&period=2026-03` todavía devuelve filas de `2026-07`.

El código local que corrige ambos filtros está probado, pero no puede ser
promovido mientras el token carezca de `Workers Scripts → Edit`. Movimientos,
transferencias, cobertura, fuentes, fichas y salud R2 siguen pasando en vivo.

Se hizo una única comprobación de promoción posterior y Cloudflare volvió a
responder `Authentication error [code: 10000]` sobre
`workers/services/cambiometro-public-api`. No se repetirán intentos hasta que
el token sea actualizado.

El catálogo descargado directamente de R2 declara 23 votaciones de agosto y 5
de septiembre, pero sus objetos de manifiesto no están disponibles físicamente.
Por eso se preparó un preflight que reemplaza sólo esos dos períodos con el
release oficial de 52 filas, sin tocar las 13 fuentes restantes:

- Artefacto: `artifacts/senado-votaciones-merge-preflight-2026-09-16.json`.
- Conteo Senado anterior declarado: 194.
- Conteo resultante del merge: 218.
- Estado: `preflight_only`; no escribe R2, D1 ni Pages.
- Commit: `a9e1a3e`.

Se verificaron físicamente en R2 las cinco particiones existentes de marzo a
julio (166 filas). Se descomprimieron sólo esas particiones y se compararon sus
IDs con las 52 filas staged: **166 existentes, 52 staged y 0 IDs repetidos**.
Los manifiestos de agosto y septiembre fueron comprobados como ausentes, por lo
que el reemplazo no sobrescribe archivos válidos.

### Reconciliación de fuentes local/producción — 2026-09-16

Se generó `artifacts/source-reconciliation-2026-09-16.json` consultando sólo
manifiestos, estados y el endpoint público de fuentes; no descargó universos ni
leyó masivamente D1. Resultado: **4 coincidencias, 5 diferencias de frescura y
3 diferencias de alcance; 0 diferencias inexplicadas**.

Hallazgos que deben entrar al siguiente ciclo:

- Cámara: producción 58.751 vs local 19.025; es frescura, no pérdida automática.
- Transparencia Activa: 1.243.761 vs 1.218.136; es frescura.
- Ley 19.862: 62.172 vs 59.361; es frescura y ya está validado en producción.
- Senado: 1.428 vs 8.138; diferencia de alcance por categorías y períodos.
- ChileCompra: 74.142 vs 888.693; producción es el corte vigente y local conserva histórico.
- DIPRES: 247.287 vs 476; producción cuenta filas presupuestarias y local entidades/series resumidas.

No se calcularán porcentajes de cobertura con estas cifras hasta resolver las
dos diferencias de alcance y las dos no explicadas.

### Inventario local de espacio — 2026-09-16

La revisión de disco no eliminó ni movió archivos. Detectó dos copias grandes
del proyecto:

- proyecto maestro `cambiometro-cplt-central-scope/transparencia-app`: **7,37
  GB**, de los cuales `data/raw` ocupa aproximadamente **4,17 GB**;
- copia anidada dentro de `cambiometro-audit/transparencia-app`: **7,65 GB**, sin
  `.git`, con `data` de **5,36 GB**.

La segunda parece una copia de trabajo/artefacto, pero no se eliminará hasta
confirmar que no sea usada por otro proceso. También existen dos worktrees
registrados (`cambiometro-cplt-central-scope` y `cambiometro-promote-ui`), que
no deben confundirse con esa copia anidada. Candidato de recuperación: hasta
7,65 GB, sujeto a confirmación y a una operación reversible. El worktree de
promoción adicional ocupa aproximadamente **0,91 GB** y también debe conservarse
hasta decidir si se archiva.

La batería conjunta posterior quedó verde: **81 tests dirigidos**, typecheck de
aplicación, typecheck del Worker y Worker de 178,28 KiB. Sólo permanece un
warning existente sobre `send_email` no heredado en `env.preview`; no bloquea el
release y queda anotado para infraestructura.

Se corrigió además la herencia del binding `send_email` en `env.staging` y
`env.preview`. `npm run api:size` quedó sin warnings, con 178,28 KiB y el
binding de correo visible sólo en los entornos declarados. Commit: `ade4508`.

### Incidencia de rendimiento detectada en la búsqueda nacional de remuneraciones

La verificación de Remuneraciones encontró un `HTTP 1102` intermitente en
`/api/funcionarios?scope=all&query=Lucy%20Depablos&include_zero=true`. La causa
no es pérdida de filas: el índice nacional estaba incluyendo palabras vacías
como `de`. En producción, el shard `de-001` municipal contiene 1.243.761
posiciones y el índice central también tiene un shard equivalente. Una búsqueda
conjunta podía intentar leer ambos shards gigantes en una sola ejecución del
Worker.

La corrección local quedó implementada y probada:

- el generador de índices omite sólo palabras vacías comunes;
- el Worker aplica la misma regla al buscar;
- la consulta sigue consultando las nóminas municipal y central;
- se añadió una prueba que confirma que ambas fuentes se combinan sin leer el
  shard de `de`;
- no se elimina ninguna fila ni se cambia el universo publicado.

Estado: **CORRECCIÓN LOCAL PENDIENTE DE PUBLICACIÓN**. Requiere reconstruir los
índices de las dos proyecciones y desplegar el Worker. El token actual no tiene
permiso de Workers Editor, por lo que producción aún debe considerarse expuesta
a este límite hasta repetir la prueba en vivo.

### Verificación posterior y corrección de selección de release

La batería completa ejecutada después de la reconciliación quedó verde:
**193 archivos y 1.021 pruebas aprobadas**, además de typecheck, arquitectura,
enlaces, tokens y reglas de seguridad estática.

Se detectó y corrigió una inconsistencia local en Transferencias: el código
prefería `data/generated/transferencias/summary.json`, que contiene una muestra
compacta de 1.000 filas, aunque también estaba disponible el resumen completo
de `data/lake/projections/v1/ley19862-summary.json` con 59.361 transferencias.
Ahora se selecciona el candidato con mayor universo declarado y, en empate, el
que contiene más rankings derivados. Se agregó prueba específica y el cambio
quedó en el commit `08a1aab`.

Esto corrige la fuente local de la discrepancia de Transferencias, pero no
publica por sí solo un cambio: la promoción a producción sigue bloqueada por
el token de Cloudflare sin permiso `Workers Scripts -> Edit`. El verificador
productivo mantiene sólo dos fallos conocidos de aislamiento de período en
Senado (gastos y votaciones); no se debe declarar el release completo hasta
publicar el Worker corregido y repetir la verificación.

### Confirmación final de Movimientos y bloqueo de build

La verificación productiva específica de Movimientos volvió a quedar verde:
HTTP 200, hidratación sin spinner ni errores de navegador, release
`kast-2026-succession-reconciled-2026-09-14`, 46 salidas, corte público
14-09-2026 y checksum
`9a884d9bef8627718afed406d530591acec6a95c50dd27956c744b56766f1995`.

La batería confirmó nuevamente que no aparecen Carolina Arredondo, Eduardo
Vergara, Ignacia Fernández, Daniela Dresdner, José Andrés Herrera ni Patricio
Kuhn en el corte reconciliado, y que Rafael Araos conserva el cargo de
subsecretario.

El build de Pages se detuvo antes de generar una publicación porque el checkout
maestro no contiene `data/lake/partitions/ley-19862`, el origen completo
necesario para reconstruir las páginas de Transferencias. El resumen completo
local sí existe (59.361 filas declaradas), pero no se usará para fabricar
páginas sin las particiones verificables. Esto queda como precondición de la
próxima publicación, no como motivo para alterar producción.

La hidratación desde R2 confirmó además que el catálogo declara la partición
`partitions/ley-19862/2026/01/manifest.json`, pero esa clave física no existe en
el bucket. Por eso no se puede tratar el catálogo como evidencia suficiente ni
reconstruir el release desde él. Se corrigió el hidratador de Windows para usar
el ejecutable local de Wrangler y lectura secuencial; commit `8fa83bb`. El
problema restante es de consistencia del release R2, no de D1.

La verificación integral en vivo posterior registró **131 comprobaciones
aprobadas y 3 fallidas**. Dos fallos son persistentes y reproducibles: el
Worker productivo aún ignora `period` para `gastos_senado` y
`votaciones_senado`. El tercero (`gastos_camara`) fue un falso negativo
transitorio del verificador: tres consultas directas consecutivas respondieron
HTTP 200 con `meta.total=16.275` y una fila, por lo que no se clasifica como
ausencia de datos.

Transferencias en producción sí expone el release completo: 62.172 filas,
1.244 páginas y checksum
`9615b9e0453a3dcbb849114295d3803a3aaeec84c336669efb0e2afe6f800825`.

### Build reproducible con release completo

Se hidrató desde R2 el release canónico de Transferencias y el build completo
terminó correctamente: 4.674 rutas estáticas, 62.172 transferencias, 1.244
páginas, 3.881 entidades y checksum coincidente. Pasaron `pages:verify`,
`check:generated`, `check:seo`, `api:size` y la suite completa de 193 archivos
y 1.021 pruebas.

Se corrigió el build para no considerar una carpeta vacía o incompleta como un
lake válido; ahora exige particiones reales o una manifest paginada canónica.
Commit: `f42a30b`. El manifiesto local de 38 bis quedó actualizado a 1.634
registros y 1.066 con monto.

### Corrección de publicación de Movimientos en la Home

Durante la reconstrucción se detectó que el resumen de Home aceptaba sólo el
estado `validated`, mientras el release vigente usa `validated_reconciled`.
Eso podía producir una Home con **0 movimientos** aunque `/movimientos/`
conservara correctamente las 46 salidas. Se corrigió la regla para aceptar los
tres estados públicos validados (`validated`, `validated_reference` y
`validated_reconciled`), se agregaron 8 pruebas y el resumen local volvió a
mostrar 46. Commit: `d5e0980`.

Se reconstruyó nuevamente Pages después de esa corrección. El artefacto final
`out/data/landing-summary.json` declara 46 movimientos, 12 fuentes y 62.172
transferencias; `pages:verify` volvió a pasar con 4.674 HTML, 346
municipalidades y 205 fichas parlamentarias.

La comprobación de coherencia entre el manifest privado de R2 y el artefacto
local de Transferencias también pasó: 62.172 filas, 1.244 páginas y checksum
`9615b9e0453a3dcbb849114295d3803a3aaeec84c336669efb0e2afe6f800825`.
Después de la prueba de Home, la suite quedó en **194 archivos y 1.029
pruebas**.

### Búsqueda productiva de remuneraciones

La incidencia 1102 ya no se reproduce en producción. Consultas directas para
Lucy Depablos, Maria Victoria Raimann Pumpin, Latorre Rincón, Rubio Flores,
Sofía Pumpin, `asesor` y `Torrealba` respondieron HTTP 200 con resultados. Esto
se registra como verificación positiva de disponibilidad, sin atribuir el
cambio a un despliegue de esta rama.

El filtro de período del Worker sigue fallando de forma comprobable: una
consulta de gastos del Senado para `2026-01` devuelve filas de `2026-05`, y una
consulta de votaciones para `2026-03` devuelve filas de `2026-07`. El fix local
está probado, pero aún requiere promoción.

La verificación consolidada posterior quedó en **132 comprobaciones aprobadas y
2 fallidas**. Las dos fallas corresponden exclusivamente a estos filtros de
período de Senado; no se detectaron regresiones en Home, movimientos,
remuneraciones, municipalidades, transferencias, ChileCompra, InfoLobby,
fichas parlamentarias ni rutas de fuentes.

### Reconciliación actualizada de fuentes — 16-09-2026

La matriz regenerada contra `/api/v1/sources` productivo quedó en **8 match, 1
freshness, 6 scope y 0 unexplained**. El campo `healthMismatch` marca 7 casos,
pero todos tienen explicación de alcance o frescura: Cámara separa categorías,
ChileCompra conserva histórico local, DIPRES compara entidades con filas
presupuestarias, Senado separa componentes, y Transparencia Activa,
Contraloría, InfoProbidad y Ley 19.862 tienen snapshots locales anteriores.
No se deben sumar esos 7 avisos como pérdida de registros.

El artefacto vigente es
`artifacts/source-reconciliation-2026-09-16.json`, generado a las
02:49 UTC-3. Los números anteriores de 4/5/3 quedan reemplazados por esta
matriz más reciente.

### Auditoría específica de remuneraciones

`verify:prod:remuneraciones` pasó completamente: producción conserva el
buscador, Transparencia Activa, Registro 38 bis, paginación, índice unificado y
no expone textos internos. Las consultas de Lucy Depablos (7), Sofía Pumpin
(1), María Victoria Raimann Pumpin (1) e Independencia (9.494 totales)
devuelven datos.

El contrato local unificado también pasó con 33.776 filas; 29.703 provienen de
38 bis y Sofía Pumpin conserva los períodos 2026-03 a 2026-06. La auditoría de
inputs estática y el resumen de calidad también quedaron verdes.

### Hallazgo DIPRES — 16-09-2026

La consulta productiva `GET /api/v1/records?source=dipres&limit=10` responde
HTTP 200 con cero filas, mientras `/api/v1/sources` declara 247.287 registros y
18 particiones. La lectura directa del release confirma que esas particiones
están declaradas en el catálogo, pero sus objetos físicos no están disponibles
en R2. El número 247.287 no debe presentarse como universo consultable.

DIPRES no corresponde a una nómina individual: su alcance es presupuesto y
ejecución agregada por partida, capítulo y programa. Se dejó preparado un
ajuste local para marcarla como `aggregate-only`, `queryable=false` y rechazar
la ruta de registros individuales con un estado explícito, sin inventar filas
ni convertir la ausencia en cero. La publicación de ese ajuste queda pendiente
de un token con permiso de edición del Worker.

La consulta central aislada (`scope=central`) también reproduce 1102 para
Lucy y Torrealba. El índice productivo central contiene 2.111.689 filas; sus
páginas físicas de búsqueda son de 10.000 filas y la primera página descargada
supera 6 MB. El arreglo de combinación evita ocultar la nómina municipal, pero
no sustituye la solución de capacidad del índice central. La siguiente
publicación debe particionar ese índice en páginas menores, comprobar el tamaño
proyectado de R2 y conservar el release anterior hasta validar el nuevo.

### Regresión productiva detectada — búsqueda combinada de funcionarios

La verificación de remuneraciones reprodujo HTTP 503 / Cloudflare 1102 en
`/api/funcionarios?scope=all&query=Independencia`, aunque la consulta municipal
aislada respondió 200 con 8.161 filas y las consultas municipales de Torrealba
y Lucy también respondieron 200. La nómina central aislada continúa provocando
1102; el problema aparece al combinar ambos alcances en una misma ejecución.

Se preparó el commit local `816a7f4`: la combinación consulta las nóminas en
secuencia y conserva la fuente disponible si la otra falla. Incluye una prueba
de degradación y mantiene `ALLOW_PUBLIC_D1_READS=0`. Requiere promoción del
Worker y verificación productiva posterior.

### Ajuste local de capacidad del índice central — 16-09-2026

La investigación de las posiciones de `Lucy` y `Torrealba` confirmó que el
problema no es la ausencia de registros: sus shards contienen posiciones
válidas, pero esas posiciones están repartidas en muchas páginas físicas de
10.000 filas. Una sola página central mide 6.243.629 bytes en R2; varias
páginas pueden descomprimirse en una misma invocación y agotar el CPU del
Worker (1102).

El commit local `f6e4a0e` fija 1.000 filas por página para nuevos releases de
`funcionarios-central-v1`, conserva 10.000 para municipalidades y permite un
ajuste explícito entre 500 y 10.000 antes de publicar. No duplica las filas ni
usa D1. La prueba completa queda en **195 archivos y 1.035 pruebas verdes**;
la promoción requiere primero el permiso `Workers Scripts -> Edit` y luego
una validación del tamaño proyectado de R2 y de las búsquedas centrales.

El control fue endurecido después: el índice central sólo admite overrides de
500 a 2.500 filas por página; el límite de 10.000 queda reservado para
municipalidades. Así no es posible reactivar accidentalmente el particionado
que provocó el 1102.

### Comprobación puntual posterior

En la última ronda controlada, `scope=central&query=Lucy` respondió HTTP 200
con 625 coincidencias, mientras `scope=all&query=Lucy` respondió HTTP 503. Esto
confirma que la nómina central existe y que la regresión queda en la ruta
combinada del Worker productivo, todavía anterior al commit local `816a7f4`.
Los filtros productivos de Senado siguen sin respetar el período solicitado:
`gastos_senado&period=2026-01` entregó filas de 2026-05 y
`votaciones_senado&period=2026-03` entregó filas de 2026-07. La API de edición
del Worker continúa respondiendo HTTP 403 con el token actual; no se ejecutó
ningún despliegue.

### Fallback de búsqueda preparado — 16-09-2026

El commit local `98e590a` agrega un fallback para la interfaz de
Remuneraciones: la ruta combinada se mantiene como camino normal; si falla,
se consultan municipalidades y organismos centrales por separado, se deduplican
los IDs y se marca la respuesta como parcial sólo si una de las dos fuentes no
responde. También se envían los filtros de organismo y cargo al endpoint.

La suite quedó en **196 archivos y 1.038 pruebas verdes**. El build local de
Pages compiló correctamente y verificó 4.674 HTML, 346 municipalidades, 205
fichas parlamentarias, 62.172 transferencias, 4.669 rutas SEO y un Worker de
178,68 KiB. El build usa el manifiesto canónico de Transferencias hidratado
desde R2; no es una escritura remota.

El commit posterior `11d53b7` endureció el límite: la nómina central sólo
acepta 500–2.500 filas por página. La suite quedó en **196 archivos y 1.039
pruebas verdes**.

### Promoción controlada de Pages y candidato Worker — 16-09-2026

La publicación de Pages se ejecutó mediante el flujo autorizado de GitHub
Actions, en modo `ui-only`, usando los manifiestos vigentes de R2 y sin ETL ni
escrituras en D1. El flujo terminó verde, incluyendo build, coherencia del
release, export estático, navegador, temas y CSP. Deployment productivo:
`ee781e8a-1b2b-4ec5-b9b8-5f21a90d0a15`; rollback exacto:
`npm run pages:rollback -- ee781e8a-1b2b-4ec5-b9b8-5f21a90d0a15`.

El Worker fue validado y subido como candidato, sin promover tráfico. Version
candidate: `3b84fbf4-70b9-46fa-9445-65216f2f94ce`. Typecheck y guard de tamaño
quedaron verdes (178,68 KiB / 34,82 KiB gzip). La prueba del candidato reveló
que `scope=central` responde `503 DATASET_UNAVAILABLE`, mientras municipal
responde 200; por seguridad no se promovió el Worker. Senado por período y
DIPRES aggregate-only sí respondieron según el contrato esperado en el
candidato. Este bloqueo requiere resolver la disponibilidad del manifiesto
central en el entorno de versionado antes de promover.

### Ruta siguiente, sin parches — orden de trabajo

1. Resolver y reproducir el manifiesto `funcionarios-central-v1` en el
   candidato Worker; no promover mientras `scope=central` no responda 200.
2. Repetir en el candidato las pruebas de municipal, central, combinada,
   Senado por período, DIPRES aggregate-only, salud, tamaño y ausencia de
   lecturas públicas de D1.
3. Promover el Worker sólo cuando las pruebas anteriores coincidan con el
   contrato; verificar producción y conservar rollback.
4. Auditar por fuente los conteos, períodos, checksums y categorías de Cámara,
   Senado, Movimientos y remuneraciones. Un fallo de una fuente conserva el
   release anterior y nunca publica cero.
5. Recién después abordar historiales, altas/bajas/cambios y nuevas cargas de
   pagos. No incorporar datos adicionales mientras la reconciliación central
   no esté cerrada.

### Cierre de la corrección central y promoción del Worker — 16-09-2026

La proyección central se reconstruyó desde los archivos locales verificados,
sin ETL remoto ni escrituras en D1. El release activado en R2 es
`2026-09-14T03-51-42-634Z`, con **2.110.434 registros**, 33 períodos y páginas
de búsqueda de 1.000 filas. La activación del manifiesto se dejó para el final,
por lo que el release anterior permaneció activo mientras se subían todos los
objetos.

El preflight de R2 proyectó 9.179.838.007 bytes sobre un límite de
10.000.000.000 (**91,80%**), con 4.056 objetos nuevos y 12 particiones frías
retiradas según la política de almacenamiento. El bloqueo configurado al 95%
no se activó; no se escribió D1.

El candidato `3b84fbf4-70b9-46fa-9445-65216f2f94ce` respondió 200 para búsquedas
centrales, combinadas y de remuneraciones. También respetó el filtro de Senado
por período y rechazó DIPRES individual como fuente agregada. Se promovió al
100% mediante el run de GitHub Actions `35059030541`.

Rollback exacto del Worker:
`npx wrangler rollback 3b84fbf4-70b9-46fa-9445-65216f2f94ce --name cambiometro-public-api`.

Verificación posterior en producción:

- `/api/v1/health`: 200, backend público R2 y `publicD1Reads=false`.
- `scope=central&query=Torrealba`: 200, 976 coincidencias.
- `scope=central&query=Lucy`: 200, 626 coincidencias.
- `scope=all&query=Lucy`: 200, 1.033 coincidencias.
- Senado marzo 2026: 200, 21 registros del período solicitado.
- Gastos Senado enero 2026: 200, cero registros del período; no devuelve filas de otro mes.
- DIPRES individual: 422, bloqueado por ser fuente agregada.
- Movimientos: 46 salidas oficiales, checksum `9a884d9bef8627718afed406d530591acec6a95c50dd27956c744b56766f1995`.
- Remuneraciones: 33.776 filas consultables; búsquedas de Lucy Depablos, Sofía Pumpin,
  María Victoria Raimann Pumpin e Independencia verdes.

La integridad de Movimientos y la disponibilidad de remuneraciones centrales
quedan cerradas para esta promoción. Las fases siguientes continúan separadas:
auditoría por fuente, calidad y categorías; historiales desde R2; y sólo luego
nuevas cargas de pagos. No se deben sumar fuentes ni ejecutar ETL durante una
publicación de interfaz.

### Verificación final y limpieza local — 16-09-2026

La verificación integral en vivo terminó con **134 comprobaciones pasadas y 0
fallidas**. El filtro de gastos del Senado para enero de 2026 quedó validado
como respuesta vacía correcta; la prueba se ajustó para no confundir ausencia
válida de filas con datos de otro período. La suite local queda en **196
archivos y 1.039 pruebas verdes**; el ajuste está en el commit `30d9136`.

Se eliminó únicamente el artefacto generado y reproducible
`transparencia-app/data/lake-cplt-central/` del equipo local: 7.012 archivos,
aproximadamente 4,15 GB. No se eliminaron archivos fuente, históricos, releases
activos ni rollback de R2. El repositorio quedó limpio y el índice publicado
continúa disponible en R2.

### Auditoría por fuente posterior a la promoción — 16-09-2026

La matriz se regeneró a las 05:26 UTC-3 con producción como referencia: **15
filas auditadas; 8 coincidencias, 1 diferencia de frescura, 6 diferencias de
alcance y 0 diferencias inexplicadas**. Los 7 avisos de `healthMismatch` siguen
siendo discrepancias entre snapshots de salud y catálogos; no son evidencia de
pérdida automática.

Los pendientes reales de interpretación son Cámara y Senado (remuneraciones,
asesorías, gastos y votaciones deben mantenerse separados), ChileCompra
(corte vigente frente a histórico), InfoLobby (universo productivo frente a
muestras locales), DIPRES (agregado, no individual), Transparencia Activa
(producción más fresca que local) y Ley 19.862 (producción 62.172 frente a
snapshot local 62.443). No se deben sumar esos conteos ni calcular cobertura
global hasta cerrar cada alcance.

Los controles de calidad estáticos pasaron: resumen global 1.753.013 registros
con checksum `63d1ef34ca4aac8006a01bb8b974beb6e1e202bb7018675460507cfa1a1e7a2b`
y cuatro archivos de entrada verificados. El siguiente bloque queda definido
como auditoría de categorías y períodos de Cámara/Senado, sin ETL ni publicación
de nuevos datos.

Desglose inicial para ese bloque:

| Componente | Filas locales | Períodos locales | Tratamiento |
|---|---:|---|---|
| Cámara, conjunto declarado | 58.751 | 2024-01 a 2026-09, con meses faltantes | separar por categoría antes de calcular cobertura |
| Cámara, gastos | 16.275 | 2026-03 a 2026-07 | componente propio, no sumarlo a remuneraciones |
| Senado, conjunto declarado | 1.428 | 2015, 2018, 2024-2026 | separar dietas, asesorías, gastos y votaciones |
| Senado, gastos | 6.517 | 2026-01 a 2026-05 | filtro productivo validado; enero puede devolver cero |
| Senado, votaciones | 194 | 2026-03 a 2026-09 | componente propio, no sumarlo a remuneraciones |

Este desglose explica por qué los conteos de producción no deben sumarse como si
fueran una sola nómina: Cámara y Senado contienen categorías superpuestas en sus
resúmenes, mientras gastos y votaciones tienen universos propios.

### Cierre prioritario de Movimientos y hallazgo de integridad R2 — 16-09-2026

La ruta pública `/movimientos/` queda cerrada para el release reconciliado de
sucesiones del gobierno de 2026:

- 46 salidas oficiales publicadas.
- Corte público: 14-09-2026.
- Release: `kast-2026-succession-reconciled-2026-09-14`.
- SHA-256: `9a884d9bef8627718afed406d530591acec6a95c50dd27956c744b56766f1995`.
- HTTP 200, sin spinner ni errores de navegador.
- Se excluyen Carolina Arredondo, Eduardo Vergara, Ignacia Fernández, Daniela
  Dresdner, José Andrés Herrera y Patricio Kuhn del corte de 2026.
- Rafael Araos conserva el cargo de subsecretario.

La verificación productiva `npm run verify:prod:movimientos` terminó con todas
las comprobaciones verdes. Este bloque no requiere otra modificación antes de
continuar.

La auditoría detectó, sin embargo, un problema independiente en el lector
público de registros de R2 que debe corregirse antes de declarar cerradas todas
las fuentes parlamentarias. El catálogo declara más filas que las físicamente
consultables en algunos componentes:

| Consulta productiva | Declarado | Consultable en la respuesta | Estado | Observación |
|---|---:|---:|---|---|
| Cámara, sin filtro | 58.751 | 102 | Parcial | La paginación general corta en la primera partición disponible; no representa el universo declarado. |
| Cámara, período 2026-08 | 2.117 | 2.117 | Completo | Asistencia y votaciones del período responden correctamente. |
| Cámara, período 2026-09 | 979 | 0 | Parcial | Faltan tres particiones físicas del corte. |
| Votaciones Senado, total | 194 | 42 | Parcial | Agosto y septiembre están declarados, pero no están consultables. |
| Votaciones Senado, 2026-08 | 23 | 0 | Parcial | Falta la partición física. |
| Senado, conjunto declarado | 1.428 | 0 | Parcial | El resumen existe, pero sus cuatro particiones no están disponibles en el camino lake. |
| Gastos Senado, histórico local | 6.517 | 2.500 | Parcial | La experiencia pública actual usa una proyección estática menor; no se debe presentar como histórico completo. |

Este hallazgo no modifica Movimientos ni implica que las remuneraciones
centrales estén ausentes. Impide afirmar todavía que Cámara y Senado estén
completos. El siguiente bloque debe reparar o reconstruir esas particiones por
fuente, con staging local, checksum, conteo por período y rollback; no se debe
ejecutar un backfill general ni escribir D1 para resolverlo.

### Ruta de trabajo posterior al cierre de Movimientos

1. **Reparación de la capa R2 parlamentaria:** identificar para cada partición
   si la ausencia es de manifiesto, artefacto o fuente oficial; recuperar primero
   un período faltante de Senado y uno de Cámara en staging local.
2. **Prueba de integridad por fuente:** comparar filas, IDs, períodos, categoría
   y checksum contra el release oficial; no mezclar remuneraciones, asesorías,
   gastos, asistencia ni votaciones.
3. **Publicación individual:** publicar sólo la fuente validada, actualizar el
   manifiesto al final y verificar producción; conservar el release anterior.
4. **Auditoría de remuneraciones:** después de cerrar la capa parlamentaria,
   revisar cobertura y faltantes de Transparencia Activa, municipales y 38 bis.
5. **Historiales y mejoras de interfaz:** sólo cuando los conteos consultables
   coincidan con los manifiestos productivos.

Regla de avance: un componente que falle conserva su último release válido y no
se reemplaza por cero filas. La diferencia local/producción se documenta como
frescura, alcance o ausencia física; no se corrige copiando snapshots locales
antiguos sobre producción.

### Staging oficial de Senado — 16-09-2026

La fuente oficial `web-back.senado.cl` respondió correctamente en lectura para
el rango 2026-08-01 a 2026-09-15. El release aislado quedó generado en
`cambiometro-audit/staging/senado-votaciones-2026-09-16` y no escribió R2, D1 ni
Pages:

- 52 votaciones con ID oficial y padrón de votos.
- Agosto: 23 filas, coincidente con el conteo declarado.
- Septiembre: 29 filas; el catálogo productivo sólo declaraba 5.
- Reemplazo previsto: períodos 2026-08 y 2026-09.
- Conteo Senado posterior al merge: 194 → 218 filas.
- Estado en el momento del staging: `preflight_only`; posteriormente publicado
  de forma aislada en el run `35061077608`.

El staging tuvo manifiestos, checksums, entidades e índices propios. La
publicación posterior fusionó el catálogo productivo conservando las demás
fuentes, subió primero los artefactos, activó el catálogo al final y conservó
el catálogo anterior como rollback.

### Resultado de reparación aislada de Senado — 16-09-2026

La reparación se ejecutó mediante GitHub Actions run `35061077608`, usando el
flujo aislado de Senado. El job normal de ingestión quedó omitido: no se ejecutó
ETL general, no se escribió D1 y no se tocaron otras fuentes.

- Agosto 2026: 23 votaciones oficiales consultables.
- Septiembre 2026: 29 votaciones oficiales consultables.
- Senado votaciones: catálogo ampliado de 194 a 218 filas.
- `source=votaciones_senado&kind=vote&period=2026-08`: 23/23.
- `source=votaciones_senado&kind=vote&period=2026-09`: 29/29.
- Backend productivo verificado: `r2-lake`.
- El catálogo anterior quedó respaldado antes de activar el fusionado.

El resultado corrige el faltante de agosto y completa septiembre sin afirmar que
todo el dominio parlamentario esté cerrado. La respuesta general conserva el
estado de catálogo parcial porque quedan otros componentes de Senado por
auditar; esto es distinto de los dos períodos de votaciones recién validados.

### Estado posterior y siguiente bloque seguro — 16-09-2026

Movimientos y votaciones del Senado quedan validados en producción. Sigue
abierto el problema de disponibilidad de Cámara 2026-09 y de los componentes de
Senado distintos de votaciones. El siguiente paso será sólo staging y auditoría
de una partición oficial de Cámara, con conteo, período, categoría, checksum y
rollback. No se ejecutará el ETL general mientras R2 esté sobre 90%, porque su
política de poda podría retirar más particiones históricas antes de completar
la reconciliación.

### Cierre definitivo de Movimientos en API y R2 — 16-09-2026

La primera promoción del Worker dejó visible una proyección R2 antigua de 83
filas en el endpoint genérico, aunque la página ya mostraba el release correcto
de 46. La causa fue doble: el lector genérico precedía al archivo autoritativo
y R2 aún conservaba la proyección anterior.

Se corrigió el lector para que `source=movimientos` use exclusivamente
`data/movimientos.json`, se promovió el Worker `a817e391-78ee-4894-b9c5-726c64166195`
y luego se publicó el release reconciliado en R2 mediante el flujo aislado
`etl-movimientos.yml`, run `35062371082`. El ETL diario fue omitido y no hubo
escrituras en D1.

Verificación final con consulta sin caché: API `total=46`, `publishedRows=46`,
backend `r2`; la página y el snapshot mantienen 46 filas, release
`kast-2026-succession-reconciled-2026-09-14` y checksum
`9a884d9bef8627718afed406d530591acec6a95c50dd27956c744b56766f1995`.

Movimientos queda cerrado también en la capa API/R2. El siguiente trabajo no
debe modificarlo salvo que exista un nuevo documento oficial posterior al
corte.

### Reparación aislada de asistencia Cámara — 16-09-2026

Se publicó sólo la partición `camara/asistencia_camara/2026/09` mediante
GitHub Actions run `35062860091`. El job normal de Cámara quedó omitido; no se
ejecutó el ETL general ni se escribió D1.

- Registros oficiales: 775.
- SHA-256 de la proyección: `6c2b6b93de53b303734052eed9724d53f28d717f3d0aa89a4284e0392c346d9b`.
- API productiva: 775 filas, backend `r2-lake`.
- El catálogo general continúa `partial` porque autoridades y votaciones de
  septiembre todavía no están publicadas.
- Rollback: catálogo anterior respaldado en
  `catalog/v1/rollback/camara-attendance-35062860091-before.json`.

La regresión integral posterior quedó en **134 verificaciones pasadas y 0
fallidas**, incluyendo Movimientos, Senado, remuneraciones, transferencias y
las fichas parlamentarias.

Siguiente bloque: staging separado de las 155 autoridades de Cámara de
septiembre; después se aislarán las 49 votaciones del mismo corte.

### Prueba de fuente Cámara para el siguiente staging — 16-09-2026

La consulta de solo lectura a los servicios oficiales de Cámara respondió sin
errores para 2026. El ETL se ejecutó con `--dry-run` para 2026-09-01 a
2026-09-15: obtuvo 155 autoridades y 630 votaciones, sin escribir archivos.
La consulta específica de asistencia devolvió 13.481 registros 2026, de los
cuales 775 corresponden a 2026-09. El catálogo productivo declara para ese mes
979 filas: 775 de asistencia, 155 de autoridades y 49 de votaciones.

Esto confirma que la fuente oficial responde y que el siguiente staging puede
reconstruir sólo las tres variantes de 2026-09. El conteo de 630 obtenido por
la ventana de votaciones es un resultado de la ventana del conector, no debe
publicarse como conteo mensual sin separar los 49 IDs del corte. No se publicó
ningún dato de Cámara durante esta prueba.

### Cierre de Cámara 2026-09 por variantes — 16-09-2026

La reparación se completó en tres publicaciones aisladas, sin ejecutar el ETL
general ni escribir D1:

- Asistencia: run `35062860091`, 775 filas, checksum de proyección
  `6c2b6b93de53b303734052eed9724d53f28d717f3d0aa89a4284e0392c346d9b`.
- Autoridades: run `35063232082`, 155 filas, checksum de proyección
  `c368ca3eade34d113660352c52adb1c279e80067c25cf8cc9ff9609d4a46f99f`.
- Votaciones: run final `35063668532`, 49 filas, checksum de proyección
  `069affe4a098196829f2e768b498d86e68c8b2f4906fee66ad876dd7a781e025`.

Producción responde ahora, mediante `r2-lake`, con 775 asistencias, 155
autoridades y 49 votaciones para Cámara 2026-09. El catálogo de esa fuente
queda completo para el corte: `775 + 155 + 49 = 979` filas. La primera ejecución
de votos (`35063422253`) publicó los artefactos pero fue detenida por un error
del verificador que consultaba `attendance`; se corrigió el verificador para
consultar `vote` y la segunda ejecución cerró correctamente. No se ocultó ni
se reemplazó el release anterior durante la corrección.

La regresión integral posterior pasó **134 verificaciones y 0 fallos**. Este
cierre sólo cubre las tres variantes de Cámara del corte 2026-09; no demuestra
que estén completos gastos, asesorías históricas o todos los períodos.

### Estado real y ruta siguiente

Bloques cerrados en producción: Movimientos (46), Senado votaciones agosto y
septiembre (23 y 29), y Cámara 2026-09 (775/155/49). Continúan abiertos:

1. Senado: gastos, personal de apoyo y períodos distintos de votaciones; el
   catálogo aún declara componentes parciales.
2. Cámara: gastos, asesorías y períodos históricos; no deben inferirse desde
   el corte 2026-09.
3. Remuneraciones: auditoría de cobertura efectiva, especialmente
   Transparencia Activa central/municipal, 38 bis y faltantes como Sofia Pumpin.
4. Movimientos: sólo monitoreo de nuevos documentos oficiales; no reabrir el
   release reconciliado por señales periodísticas sin decreto o fuente oficial.

No se ejecutará un ETL masivo mientras R2 permanezca sobre 90%. Cada bloque
restante debe seguir el ciclo: lectura oficial, staging, conteo y checksum,
preflight de tamaño, publicación individual, verificación productiva y
rollback. La producción sigue siendo la referencia vigente frente a snapshots
locales antiguos.

### Hallazgo de metadatos posterior a las reparaciones — 16-09-2026

La API de fuentes todavía conserva algunos conteos declarativos anteriores al
merge aislado. Esto no contradice las filas consultables recién verificadas,
pero sí impide afirmar que la tarjeta de cobertura esté reconciliada:

- Cámara declara 58.751 en su resumen y continúa como `partial`, mientras sus
  consultas por variante ya entregan 775 asistencias, 155 autoridades y 49
  votaciones para 2026-09.
- Senado declara 194 votaciones en su resumen, mientras los períodos
  publicados y verificados ya entregan 23 en agosto y 29 en septiembre.
- Salud confirma `publicD1Reads=false` y `transferSource=r2`; el indicador
  `d1Consistent=false` se debe a que la proyección D1 está vacía por diseño
  R2-first, no a una lectura masiva activa.

Antes de incorporar otro universo se debe regenerar o reconciliar únicamente
la capa de manifiestos y tarjetas de cobertura para que sus conteos coincidan
con las particiones productivas. No se debe volver a ejecutar el ETL de datos
para resolver una diferencia de metadatos.

### Verificación del Worker de gastos parlamentarios — 16-09-2026

El Worker candidato `fffcfd00-2b67-43f7-80e0-45fc6b57f5db` fue promovido en el
run `35065371180`. El faltante de publicación detectado en la primera prueba
fue corregido después mediante un merge aislado de los cinco cortes oficiales;
la API ya no conserva el subconjunto estático anterior. El estado vigente y
los conteos finales están registrados en “Reparación aislada de gastos del
Senado” más abajo.

### Estado operativo después del cierre de Movimientos — 16-09-2026

Movimientos queda cerrado en producción con 46 salidas oficiales, release
`kast-2026-succession-reconciled-2026-09`, corte 14-09-2026 y checksum
`9a884d9bef8627718afed406d530591acec6a95c50dd27956c744b56766f1995`.

El siguiente orden de trabajo queda fijado así: (1) auditar remuneraciones
centrales y municipales por cobertura real, períodos y casos conocidos como
Sofía Pumpin; (2) reconciliar los metadatos y períodos restantes de Cámara y
Senado; (3) auditar los ETL de ChileCompra, InfoLobby y DIPRES sin ampliar R2
antes del preflight de tamaño; (4) sólo después evaluar cargas adicionales.
R2 permanece sobre 90%, por lo que no se autoriza un ETL masivo ni una carga
que no tenga tamaño, checksum, rollback y prueba productiva definida.

### Reparación aislada de gastos del Senado — 16-09-2026

Se recuperaron desde la fuente oficial los cinco cortes operativos y se
publicaron en R2 mediante un merge aislado, sin ETL general ni escrituras D1.
Los conteos verificables son: enero 1.200, febrero 1.200, marzo 1.620,
abril 1.250 y mayo 1.250; total 6.520 registros únicos. La API productiva
responde `sourceBackend=r2-lake`, declara 6.520 filas y reporta cero
particiones o artefactos faltantes. Cámara no fue modificada.

El rollback quedó preservado en
`catalog/v1/rollback/senado-gastos-20260916-before.json`. La proyección de
R2 quedó en aproximadamente 91,7996%, debajo del bloqueo preventivo del 95%.
El verificador integral posterior pasó 134/134.

### Corrección del buscador de la Home — 16-09-2026

Se corrigió la búsqueda unificada para consultar los índices R2 central y
municipal, en lugar de consultar sólo el índice municipal. El cambio está en
`dea532d`, con prueba de regresión incluida; las pruebas dirigidas pasaron
70/70 y el Worker candidato se promovió en el run `35066626268`, versión
`190001d1-7d19-44c4-842e-075e12e066e7`. No se cambiaron rutas, menú ni
estructura pública, y la salud continúa declarando R2 como backend público y
`publicD1Reads=false`.

La verificación integral posterior quedó en 134/134, versión productiva
`v1.0-a3be0655`.

### Auditoría preliminar de remuneraciones en producción — 16-09-2026

Se hicieron consultas paginadas y acotadas contra los índices R2, sin
descargar el universo ni consultar D1. El buscador combinado responde casos
que antes eran críticos: Lucy Depablos aparece en agosto de 2026 en la
Dirección Nacional del Servicio Civil por $2.261.097; Sofía Pumpin aparece en
julio de 2026 en la Subsecretaría del Interior por $2.350.000; Valentina
Latorre aparece en julio de 2026 por $5.676.763; y María Victoria Raimann
Pumpin aparece en la Municipalidad de Independencia en abril de 2024 por
$1.876.569.

Esto confirma que esos registros sí están publicados y son localizables, pero
no permite afirmar todavía que cada persona tenga todos sus cortes históricos
ni que el último período de cada organismo esté incorporado. La auditoría
detecta además una diferencia de alcance que debe reconciliarse antes de
mostrar un total global: el índice municipal declara 1.243.761 filas, el
central 2.110.434 y el total canónico de Home es 1.753.013. Son métricas de
releases/alcances distintos hasta que se documente su intersección; no deben
sumarse ni presentarse como cobertura total.

### Plan operativo posterior al incidente de Movimientos — 16-09-2026

1. **Cierre y vigilancia de Movimientos.** Mantener el release de 46 salidas
   como referencia productiva. Sólo reabrirlo frente a un documento oficial
   posterior al corte. Auditar cantidad, cargos, fechas y enlaces; un fallo de
   una fuente no puede publicar cero ni reemplazar el release válido.
2. **Pages UI sin ETL.** El flujo `pages-ui-refresh` queda separado de las
   particiones históricas de Ley 19.862: usa el manifiesto estático validado y
   no reconstruye datos durante una publicación de interfaz. La ausencia de
   particiones raw antiguas no bloqueará una promoción UI, pero sí bloqueará un
   refresh de datos que declare un release incompleto.
3. **Prioridad remuneraciones.** Reconciliar primero el universo municipal,
   central, 38 bis y apoyo parlamentario: publicado, consultable, histórico,
   último período, checksum y relación entre releases. No sumar conteos de
   alcances distintos ni afirmar cobertura total antes de documentar la
   intersección.
4. **Auditoría de calidad.** Por fuente y por lote revisar período, persona,
   organismo, cargo, bruto, líquido, contrato, duplicados y estados de monto.
   La normalización agrega campos; nunca reemplaza el valor original. Los
   casos faltantes se registran como faltantes, no como cero.
5. **Fuentes restantes por bloques.** Después de remuneraciones: Cámara/Senado
   (separando votaciones, asistencia, gastos, asesorías y personal), luego
   ChileCompra, InfoLobby y DIPRES. Cada bloque tendrá manifiesto, checksum,
   prueba de conteos, preview, smoke productivo y rollback independiente.
6. **Gates de seguridad.** R2: advertencia al 80%, revisión al 90%, bloqueo al
   95%. D1 queda fuera de búsquedas e historiales masivos. Ninguna carga se
   publica si no tiene tamaño proyectado, release anterior recuperable y
   evidencia de que el navegador no descarga el universo completo.

**Criterio de avance:** no se considera cerrada una fuente por tener una API
que responde; debe coincidir su manifiesto con sus particiones reales y con lo
que la interfaz muestra. El orden es auditar -> reconciliar -> probar en
preview -> promover una fuente -> verificar producción.

### Cierre de publicación UI y verificación final — 16-09-2026

El flujo Pages UI se corrigió en `936722f`. El fallo no provenía de permisos ni
de D1: el catálogo R2 declaraba particiones raw históricas de Ley 19.862 que
no estaban en el bucket. La tubería UI dejó de reconstruir esas particiones y
usa el manifiesto estático publicado y validado, manteniendo el ETL de datos
fuera del despliegue de interfaz.

La publicación productiva quedó en Pages deployment
`1dc65861-fa39-4d04-aad2-383cbf48b86e`. Pasaron build, coherencia R2, calidad
semántica, navegador, temas, CSP y publicación. El verificador en vivo final
pasó 134/134 y dejó la versión productiva `v1.0-a3be4048`.

Las comprobaciones específicas confirmaron `/movimientos/` HTTP 200, 46
salidas, ausencia del conteo anterior de 83 y ausencia de las autoridades
descartadas. La búsqueda productiva `Torrealba` mantiene la coincidencia de
remuneración de Río Sebastián Torrealba del. Salud declara R2 como backend
público y `publicD1Reads=false`.

### Corrección de metadatos combinados de remuneraciones — 16-09-2026

La auditoría detectó que `scope=all` entregaba correctamente filas
municipales y centrales, pero heredaba sólo las métricas de calidad de la
primera fuente. Eso hacía que la interfaz/API subestimara las incidencias del
universo combinado, especialmente cuando la solicitud usaba `limit=1`.

Se agregó una prueba de regresión y se corrigió el Worker en el commit
`f9bafec`. La corrección suma `registrosConIncidencias` y cada incidencia de
ambas nóminas, y calcula las estadísticas sobre las filas combinadas de la
página. No fusiona personas, no cambia los registros originales, no ejecuta
ETL y no consulta D1 para esta ruta.

Validación del candidato y producción:

- Candidato `7813d959-7a65-4969-b1eb-87d393308574`, alias
  `candidate-35070863363-cambiometro-public-api`.
- Promoción ejecutada en el run `35071018491`.
- Producción: HTTP 200, `sourceStatus=r2-search-combined` y fuentes
  `municipal,central`.
- Total combinado: 3.354.195 filas.
- Incidencias combinadas: 722.926; 722.848 corresponden a líquido no
  informado, 40 a prefijo numérico, 72 a prefijo inválido y 22 a nombre
  incompleto.
- `npm test`: 1.046/1.046; verificación de remuneraciones aprobada; verificador
  integral productivo: 134/134, versión `v1.0-a3be517f`.

El hallazgo no demuestra que falten filas de remuneraciones: demuestra que la
respuesta combinada estaba reportando mal su auditoría. La cobertura de cada
release sigue siendo una tarea separada y no se deben sumar los universos para
presentarlos como personas únicas.

### Línea base de calidad por nómina — 16-09-2026

La lectura productiva acotada a `limit=1` confirmó los manifiestos y permitió
medir calidad sin descargar filas masivas:

| Nómina | Filas consultables | Registros con incidencias | Proporción | Líquido no informado |
|---|---:|---:|---:|---:|
| Municipal | 1.243.761 | 159.705 | 12,84% | 159.679 |
| Central | 2.110.434 | 563.221 | 26,69% | 563.169 |
| Combinada | 3.354.195 | 722.926 | 21,55% | 722.848 |

Las proporciones no representan personas únicas ni cobertura histórica: son
incidencias registradas sobre cada release consultable. Las incidencias por
nombre son acotadas (municipal: 24 prefijos numéricos, 7 prefijos inválidos y
5 nombres incompletos; central: 16, 65 y 17 respectivamente). La principal
observación es que el líquido no está informado en la fuente para la mayoría de
los registros observados; no se debe convertir en cero ni imputar un valor.

El siguiente bloque de trabajo queda definido como auditoría por período y
organismo de esas incidencias, empezando por una muestra reproducible y sin
reescribir el release. Sólo después se evaluará si conviene una vista derivada
de historial; el valor bruto y la URL de origen permanecerán intactos.

### Procedencia municipal y central en la búsqueda unificada — 16-09-2026

La búsqueda `scope=all` ahora conserva en cada fila el origen lógico de la
nómina mediante `sourceScope`: `municipal` u `central`. La interfaz deja de
presentar todas las filas remotas como si fueran únicamente municipalidades y
etiqueta los resultados centrales como “Transparencia Activa · Organismos
centrales”. El cambio quedó en `517f20a` y no fusiona personas por nombre ni
modifica los valores originales.

Validación: el candidato del Worker
`ca06c7b8-8cd4-45fe-9df7-29923347ef0c` encontró a Río Sebastián Torrealba del
como registro central de Presidencia y a Lucy Depablos en sus registros
municipales y centrales. El Worker se promovió mediante el run `35072282152`.
La publicación Pages UI pasó preview completo en el run `35072437560` y se
promovió ese mismo build en el run `35073669119`. Deployment productivo:
`8c9cfa59-598e-4ac6-b36e-f1d1c00d7ad4`, con rollback
`npm run pages:rollback -- 8c9cfa59-598e-4ac6-b36e-f1d1c00d7ad4`.

La verificación posterior pasó `verify:prod:remuneraciones` y el verificador
integral `134/134`, versión productiva `v1.0-a3be8d25`. Se comprobaron además
las búsquedas de Lucy Depablos (7 filas: 3 municipales y 4 centrales), Sofía
Pumpin, María Victoria Raimann Pumpin e Independencia (9.493 filas). Esto
confirma que la ruta pública consulta ambos alcances; no equivale a afirmar
que los releases sean cobertura histórica total.

### Reconciliación de componentes productivos — 16-09-2026

Se corrigió el auditor de producción/local para conservar y comparar los
componentes declarados por la API pública, no sólo el conteo del registro
padre. Esto evita marcar como “coincidencia” fuentes cuyo número de filas
coincide, pero cuyo alcance semántico es distinto.

Resultado de la lectura acotada más reciente:

- Resumen: 6 coincidencias semánticas, 1 diferencia de frescura, 8 diferencias
  de alcance, 0 inexplicadas y 7 desajustes con `source-health`.
- ChileCompra y DIPRES quedan como `scope` aunque el conteo numérico coincida:
  el primero separa corte vigente de histórico y el segundo filas
  presupuestarias de entidades/series resumidas.
- Senado productivo declara 6.520 gastos y 218 votaciones; el catálogo local
  conserva 6.517 y 194 respectivamente. Las diferencias quedan explícitas:
  +3 gastos y +24 votaciones productivas. No se cambia ningún release ni se
  publica una corrección automática.

La prueba específica y `api-v1` pasaron 76/76; `typecheck` también pasó. Esta
reconciliación es sólo de metadatos y no lee masivamente D1 ni descarga los
universos de R2.

### Cierre de integridad de Movimientos y hoja de ruta — 16-09-2026

El módulo `/movimientos/` queda corregido y validado en producción. El release
público vigente es `kast-2026-succession-reconciled-2026-09-14`, con corte al
14-09-2026, 46 salidas y checksum
`9a884d9bef8627718afed406d530591acec6a95c50dd27956c744b56766f1995`. La
verificación productiva confirmó que no se mezclan Carolina Arredondo, Eduardo
Vergara, Ignacia Fernández, Daniela Dresdner, José Andrés Herrera ni Patricio
Kuhn; Rafael Araos conserva el cargo de subsecretario. No se debe volver a
promover un snapshot de movimientos sin repetir esta verificación.

La corrección de Movimientos no permite concluir que todas las fuentes tengan
problemas. Fue una falla de alcance específica del pipeline de autoridades,
por lo que el resto se auditará por separado y no se corregirá por analogía.

#### Orden aprobado para continuar

1. **Remuneraciones — integridad y cobertura real.** Comparar por fuente,
   período y organismo los manifiestos productivos contra los índices locales;
   distinguir filas publicadas, filas consultables, histórico, duplicados y
   faltantes. Se empezará con muestras pequeñas de Transparencia Activa,
   38 bis, Cámara y Senado. No se modificará ningún release hasta explicar una
   diferencia.
2. **Cámara y Senado — componentes separados.** Reconciliar por separado
   remuneraciones, personal de apoyo, asesorías, gastos y votaciones. El estado
   actual deja documentados los desfases de Senado: +3 gastos y +24 votaciones
   en producción frente al catálogo local. Primero se verificará el origen y
   período; después se decidirá si corresponde actualizar el artefacto local.
3. **Transparencia Activa — calidad útil.** Auditar meses, organismos,
   nombres, cargos, monto bruto, líquido no informado, monto cero y duplicados.
   Se generará una muestra reproducible de altas, bajas y cambios de monto sin
   descargar el universo ni reescribir valores originales.
4. **Historiales desde R2.** Probar con una persona y un organismo; sólo si
   los conteos y checksums coinciden se ampliará por lotes. D1 no participará en
   búsquedas ni historiales masivos.
5. **Fuentes restantes.** Revisar ChileCompra, InfoLobby y DIPRES por alcance:
   corte vigente, histórico, agregados y filas consultables. No se tratarán
   conteos agregados como personas ni se mostrarán muestras como universos.
6. **Validación final.** Por cada bloque: pruebas, preview, navegación móvil y
   escritorio, conteos, checksum, consumo D1, tamaño proyectado R2 y rollback.

#### Regla de promoción

Un bloque sólo pasa a producción cuando su release productivo tiene checksum,
conteo, período y alcance documentados; el release anterior queda disponible
para rollback; y una falla externa conserva el último release válido. Quedan
prohibidos los reemplazos automáticos por cero filas, las fusiones por nombre
solamente y las correcciones que oculten el valor original.

### Auditoría acotada de Remuneraciones — 16-09-2026

Se agregó `npm run audit:remuneraciones`, una auditoría de sólo lectura que
consulta el manifiesto unificado, la metadata de fuentes productivas y cinco
búsquedas limitadas. No escribe releases, no descarga los universos completos
y no consulta D1 masivamente.

Resultado productivo de esta ejecución:

| Alcance | Filas consultables | Incidencias de calidad | Última actualización |
|---|---:|---:|---|
| Municipal | 1.243.761 | 159.705 | 15-09-2026 08:08 UTC |
| Central | 2.110.434 | 563.221 | 14-09-2026 03:51 UTC |
| Release unificado estático acotado | 33.776 | — | 16-09-2026 08:29 UTC |

Las búsquedas de Lucy Depablos (7), Sofía Pumpin (1), María Victoria Raimann
Pumpin (1), Río Sebastián Torrealba del Río (1) e Independencia municipal
(8.161) devolvieron resultados. El snapshot estático de Transparencia Activa
declara 1.203.287 filas frente a 1.243.761 en producción: diferencia de
40.474 filas clasificada como revisión de release/alcance, no como pérdida.
No se modificó ningún dato.

La auditoría queda como requisito previo para completar la cobertura por mes y
organismo. Mientras esa diferencia no se reconcilie, no se presentará un
porcentaje de cobertura ni se actualizará el snapshot local con un conteo que
no tenga artefactos correspondientes.

El control de crecimiento quedó unificado en 95% tanto para el planificador
R2 como para el núcleo ETL; entre 80% y menos de 95% se mantiene la política de
archivo de particiones frías y sobre 95% se bloquea el crecimiento. Esto evita
que una de las dos capas detenga o permita cargas con un criterio diferente.

La reconciliación de componentes también detectó y corrigió un error del
auditor: en Cámara, `asistencia`, `votaciones` y `autoridades` compartían
`sourceId=camara` y podían quedar colapsados como si fueran un solo componente.
La identificación ahora conserva el componente específico cuando el
`sourceId` coincide con el padre. La lectura vigente queda así:

- Cámara: asistencia 54.538, votaciones 4.058, autoridades 155 y gastos
  16.275; el catálogo local sólo tiene el componente de gastos, por lo que la
  diferencia se clasifica como alcance/artefactos locales faltantes.
- Senado: gastos 6.520 frente a 6.517 locales (+3) y votaciones 218 frente a
  194 locales (+24).

No se corrigieron conteos a mano ni se promovió ningún artefacto; primero debe
reconstruirse o localizarse el release local verificable de cada componente.

### Inventario remoto R2 reproducible — 16-09-2026

Se ejecutó la auditoría remota `npm run audit:r2:storage` contra el manifiesto
`catalog/v1/storage.json`, sin descargar el universo de datos ni escribir en
R2, D1 o Pages. El resultado exacto fue:

| Métrica | Resultado |
|---|---:|
| Bytes usados | 9.179.838.007 |
| Límite operativo auditado | 10.000.000.000 |
| Uso | 91,798% |
| Objetos | 10.300 |
| Estado de política | `review` (90%–<95%) |
| Grupos de checksum duplicado | 3 grupos pequeños |

Los prefijos de mayor tamaño son `projections/funcionarios-central-v1`
(4.459.740.764 bytes) y `projections/funcionarios-v1` (4.446.589.646 bytes).
El segundo conserva dos versiones municipales para historial/rollback; la
auditoría no encontró un duplicado grande cuya eliminación pudiera autorizarse
sin comparar release, checksum y posibilidad de recuperación. Los duplicados
detectados son índices pequeños y no explican por sí solos el consumo.

Conclusión operativa: no se debe borrar ni cargar un universo nuevo todavía.
Cada release posterior debe pasar por cálculo de crecimiento proyectado,
compresión y verificación de rollback; al alcanzar 95% la publicación debe
bloquearse automáticamente. La diferencia local/producción continúa siendo un
hallazgo de artefactos y frescura, no una autorización para reemplazar el
release productivo con snapshots locales.

### Estado de implementación — 16-09-2026

Cambios versionados en la rama de trabajo del proyecto:

- `d7e764f`: auditoría de alcance de Remuneraciones de sólo lectura.
- `ef07c25`: preservación de componentes separados de Cámara.
- `c83b8ac`: bloqueo de crecimiento unificado al 95%.
- `f5c98ec`: tipado y pruebas del auditor de Remuneraciones.
- auditor R2 remoto reproducible: inventario de uso, versiones y duplicados.

Validación final local: `npm test` aprobó 199 archivos y 1.053 pruebas. La
verificación productiva de Movimientos continúa aprobada con 46/46. Estos
cambios todavía no se promueven a Pages ni modifican releases de datos, porque
la auditoría debe explicar primero los artefactos locales faltantes y los
desfases de Senado.

La comprobación posterior también pasó `check:etl-calendar` (19 workflows,
zona `America/Santiago`), `check:etl-freshness` (Transferencias por R2, 62.172
filas y 0 filas materializadas en D1), `check:data-quality-summary` y
`check:production-gates`. La verificación productiva de Remuneraciones pasó
con 33.776 filas estáticas, 169 páginas y las búsquedas críticas de Lucy
Depablos, Sofía Pumpin, María Victoria Raimann Pumpin e Independencia.

El guard de zona de Cloudflare no pudo enumerar `impulsacv.cl` con el token de
auditoría actual: la API respondió correctamente, pero sin zonas visibles.
Esto es coherente con un token limitado a cuenta/R2/D1/Analytics y no afecta
las consultas públicas ni permite concluir que la zona esté caída. Para
auditar WAF/RUM en el futuro se necesitará un token separado, de sólo lectura,
con acceso explícito a la zona y permisos de lectura de las reglas requeridas;
no se reutilizará el token de datos ni se ampliarán permisos automáticamente.

### Integración controlada con `main` — 16-09-2026

Se abrió la PR #539 para integrar en `main` el release de Movimientos ya
validado, la preservación de alcances de Remuneraciones, los guards de D1/R2 y
las auditorías reproducibles. La PR quedó inicialmente bloqueada mientras
corren Build/E2E, Quality, Security y calendario. Esto corrige un desfase real:
`main` todavía exigía 79 movimientos y por eso su refresco automático falló
con el release reconciliado de 46. La PR quedó integrada después de que los
checks obligatorios terminaran verdes; la evidencia del cierre productivo se
detalla en la sección siguiente.

### Cierre productivo de Movimientos — 16-09-2026

La PR #539 quedó integrada en `main` mediante el merge commit
`65ab477e5144cda5227af60ccfb60c9ea4c7fcde`. La validación directa contra
producción confirmó que `/movimientos/` responde 200 y mantiene el release
`kast-2026-succession-reconciled-2026-09-14`, con 46 salidas, corte público
14-09-2026 y checksum
`9a884d9bef8627718afed406d530591acec6a95c50dd27956c744b56766f1995`.

También quedaron comprobadas las exclusiones de Carolina Arredondo, Eduardo
Vergara, Ignacia Fernández, Daniela Dresdner, José Andrés Herrera y Patricio
Kuhn, además del cargo correcto de Rafael Araos como subsecretario. Esto
resuelve el incidente presentado en Movimientos; no se mezclará ese release
con cambios de administraciones anteriores.

Los refrescos automáticos de Pages posteriores al merge (`35080810187` y
`35080810184`) terminaron con éxito en sus verificaciones. Sus pasos de
publicación productiva quedaron omitidos por los guards de promoción, por lo
que se conservó deliberadamente el deployment válido anterior; no hubo
reemplazo ni regresión del release público.

### Ruta de auditoría posterior al incidente — 16-09-2026

El incidente se tratará como una señal para auditar por dominio, no como
evidencia de que todos los datos estén incorrectos. El orden operativo queda:

1. **Movimientos bloqueados:** conservar el release de 46, comparar cada fila
   con su decreto o evidencia oficial y no permitir que un fallo externo lo
   reemplace por cero filas.
2. **Remuneraciones:** reconciliar por fuente, período y organismo; verificar
   primero que el universo municipal y central no se reduzca al publicar un
   snapshot. Separar filas publicadas, consultables, históricas, faltantes y
   duplicadas aparentes.
3. **Cámara y Senado:** auditar por componente —remuneraciones, apoyo,
   asesorías, gastos y votaciones— y explicar las diferencias local/producción
   por fecha o alcance antes de cambiar cualquier manifiesto.
4. **Calidad y consistencia:** muestrear nombres, cargos, períodos, montos,
   identificadores y procedencia; preservar siempre el valor original y marcar
   la normalización como derivada.
5. **Historiales desde R2:** probar una persona y un organismo, luego ampliar
   por lotes sólo si conteo, checksum y alcance coinciden. D1 queda fuera de
   búsquedas e historiales masivos.
6. **R2 y espacio:** medir cada release antes de publicarlo, mantener rollback
   y bloquear el crecimiento al 95%; no eliminar históricos sin identificar
   exactamente el release y su recuperación.
7. **Promoción:** cada bloque pasa por pruebas, preview, smoke móvil/escritorio,
   verificación productiva y registro de rollback independiente.

No se modifican rutas, menú, municipalidades ni el contenido editorial como
parte de esta auditoría. El siguiente informe deberá indicar por dominio qué
está confirmado, qué está pendiente y qué no está publicado; nunca presentar
la aprobación de Movimientos como cobertura total del sitio.

### Corrección final de estado productivo de Movimientos — 16-09-2026

La auditoría detectó que el endpoint devolvía las 46 filas correctas, pero
marcaba el release reconciliado como `partial` por una regla genérica de la
proyección estática. Se agregó una prueba de regresión y se cambió la regla
para declarar `complete` sólo cuando el release de Movimientos conserva
`release_id`, checksum, conteo declarado y número real de filas coincidentes.
Los releases sin esa evidencia continúan como `partial`.

La corrección quedó en la PR #543, merge commit
`5d929a53c98e8a8867bff39b12b12f4d3447bd0b`, con candidato Worker
`f88266e6-fe7e-480c-891c-0c60a701e92c` promovido al 100% mediante el flujo
confirmado. La verificación productiva posterior confirmó respuesta 200,
`sourceStatus=complete`, `total=46` y `publishedRows=46` en la URL canónica.
El checksum del contenido permanece
`9a884d9bef8627718afed406d530591acec6a95c50dd27956c744b56766f1995`.

La validación local pasó 201 archivos y 1.060 pruebas, junto con typecheck del
sitio y del Worker. No se modificaron filas, rutas, menú, municipalidades,
Remuneraciones ni D1. La intermitencia observada en la búsqueda combinada de
funcionarios (503/1102 sólo para algunas consultas `scope=all`) queda como el
primer pendiente técnico separado; no se mezclará con el cierre de
Movimientos.

### Auditoría integral posterior — 16-09-2026

La revisión por manifiestos R2 y muestras productivas no encontró una
diferencia inexplicada en las fuentes restantes. El resultado se clasifica
como auditoría de alcance y frescura, no como aprobación semántica fila por
fila de todo el universo:

- Fuentes auditadas: 15; 6 coinciden con el manifiesto local, 1 presenta sólo
  diferencia de frescura y 8 presentan diferencia de alcance documentada; 0
  quedaron sin explicación.
- Cámara: producción separa 54.538 asistencias, 4.058 votaciones, 155
  autoridades y 16.275 gastos; el conteo padre de 58.751 no debe sumarse con
  gastos ni interpretarse como remuneraciones.
- Senado: producción publica 218 votaciones, 6.520 gastos y 1.428 en el
  registro padre; las diferencias locales son 24 votaciones y 3 gastos, a
  revisar por corte o alcance, no a corregir automáticamente.
- Transparencia Activa: producción tiene 1.243.761 filas frente a 1.203.287
  del subconjunto estático de Remuneraciones; la diferencia corresponde a
  alcance/corte y no demuestra pérdida de datos.
- ChileCompra y DIPRES mantienen separados corte vigente e histórico; DIPRES
  continúa siendo agregado, no nómina individual.
- R2 tiene 9.179.838.007 bytes de 10.000.000.000 (91,798%), en revisión y sin
  eliminaciones automáticas. No apareció un grupo de duplicados grande que
  pueda borrarse con seguridad.
- D1 permanece con `publicD1Reads=false`; las consultas públicas probadas
  respondieron desde R2. El `d1Consistent=false` del health público es
  esperado mientras el chequeo físico D1 está desactivado y no equivale a una
  falla de los datos públicos.

La única incidencia reproducible cerrada como integridad de datos es
Movimientos. La búsqueda combinada de funcionarios respondió correctamente en
las pruebas posteriores, pero conserva una alerta técnica separada por
intermitencia 503/1102: no se declarará resuelta de forma permanente hasta
reducir sus lecturas duplicadas y repetir el smoke bajo carga controlada.

### Mitigación de lecturas duplicadas en búsqueda nacional — 16-09-2026

La revisión del código confirmó que `scope=all` consultaba cada proyección
R2 una primera vez para obtener el total y una segunda vez para volver a
traer la primera página. Esto aumentaba innecesariamente descompresión,
latencia y probabilidad de 1102, sin alterar el conteo. La mitigación reutiliza
la primera respuesta cuando se solicita la página 1 y mantiene el mecanismo de
encabezado para páginas posteriores.

La corrección está en la PR #544, rama
`codex/reduce-r2-all-search-20260916`, con prueba que verifica una lectura por
manifiesto, índice, shard y página física. Validación local: 201 archivos y
1.061 pruebas aprobadas; el despliegue queda pendiente de los checks remotos.

La auditoría de fuentes repetida a las 11:49 UTC-3 conserva el diagnóstico:
15 fuentes, 6 coincidencias, 1 diferencia de frescura, 8 diferencias de
alcance y 0 diferencias sin explicación. El inventario R2 conserva
9.179.838.007 bytes de 10.000.000.000 (91,798%); no se realizaron borrados ni
se incorporaron releases.

La PR #544 fue integrada en `main` mediante el merge commit
`a596d4764539ef9cf790fc9283339807ae2def31`. El candidato Worker
`6dbfb869-37c4-4ea9-8d1f-1fe25fb09910` fue promovido al 100% después de pasar
validación, typecheck, tamaño y health check productivo. El smoke posterior
confirmó Movimientos 46/46, Lucy 7, Torrealba 1.547 e Independencia 8.161,
con paginación y origen R2.

La revisión local de espacio identificó seis carpetas `cambiometro*`. La
estructura vigente queda en `cambiometro-cplt-central-scope` (maestro),
`cambiometro-audit` y `cambiometro-editorial`. Las ramas auxiliares
`cambiometro-remuneraciones-api-20260913` (3,51 GB) y
`cambiometro-promote-ui` (0,91 GB) conservan código, pero sus artefactos
regenerables (`.next`, `out`, `node_modules`) fueron identificados para una
limpieza separada; `cambiometro-public` (2,17 GB) no se toca porque contiene
datos/release que todavía requieren comparación. No se borraron repositorios
ni datos fuente durante esta revisión.

### Cierre de Movimientos y publicación de interfaz — 16-09-2026

La comprobación productiva posterior confirmó que `/api/v1/records?source=movimientos&limit=100`
responde HTTP 200 desde R2 con `sourceStatus=complete`, `total=46`,
`publishedRows=46` y sin alterar el release reconciliado
`kast-2026-succession-reconciled-2026-09-14`. El health público declara
`publicDataBackend=r2`, `publicD1Reads=false` y `d1TransferRows=0`; D1 no es el
camino de consulta pública.

El guard para evitar refrescos por pushes sin ingestión quedó integrado en
`main` mediante PR #545. La limpieza de Remuneraciones quedó integrada mediante
PR #546: se retiraron del explorador la evolución mensual y la tabla de 12
cortes que mostraban comparaciones vacías. Se conservaron el buscador, las
fichas expandibles, la paginación de 15 resultados, las fuentes y el detalle
mensual propio del Registro 38 bis.

La validación remota de PR #546 pasó build, typecheck, rutas, APIs, UI
responsive, CSP y E2E. El flujo `ui-only` de Pages `35096231860` terminó en
éxito sobre el commit `e7cf7f479647d93fd139b2647509c2c9b3446810`; no ejecutó
ETL ni publicó cambios de datos. Las rutas `/`, `/remuneraciones-publicas/`,
`/movimientos/`, `/municipalidades/` y `/personas/` respondieron HTTP 200.

La auditoría integral sigue sin demostrar que todas las fuentes estén
correctas fila por fila: sí descarta diferencias inexplicadas en los
manifiestos, pero quedan revisiones de alcance/frescura y la calidad de
remuneraciones debe seguir auditándose antes de ampliar cargas. R2 permanece
en revisión preventiva al 91,798%; no se borraron objetos.

La verificación integral `verify-prod-full` completó dos pasadas verdes, con
134 verificaciones aprobadas y 0 fallas en cada pasada. Confirmó además las
fichas políticas, Cámara, Senado, votaciones, gastos, cruces, transferencias,
Movimientos y las rutas públicas principales. La versión de producción
observada fue `v1.0-a3bfcc66`.

### Auditoría física R2 y referencias del catálogo — 16-09-2026 10:23 UTC-3

Se repitió la revisión directamente contra el listado físico del bucket
`transparencia-public-data`, sin descargar los objetos. R2 contiene 23.152
objetos y 11.078.005.075 bytes: 110,780% del umbral operativo de 10 GB. El
inventario `catalog/v1/storage.json` estaba incompleto: declaraba 10.309
objetos y omitía 12.843 objetos físicos. Por ello, los porcentajes anteriores
basados sólo en ese inventario no eran una medición completa.

El catálogo vigente declara 147 particiones. Sólo 65 tienen su manifiesto
físico presente y 82 referencias están huérfanas, con 471.536 filas declaradas
sin manifiesto disponible. La distribución no implica que todas esas filas
sean datos perdidos: parte corresponde a históricos archivados, pero sí
significa que no deben presentarse como consultables hasta restaurar o
reclasificar cada partición. Los grupos afectados son Cámara, ChileCompra,
Contraloría, DIPRES, gastos de Cámara, InfoLobby, InfoProbidad, Ley 19.862,
Senado, Servel y SINIM. Gastos de Senado y votaciones de Senado sí tienen sus
manifiestos físicos.

Senado queda confirmado como caso de integridad pendiente: sus cuatro
particiones base declaradas (2025-08, 2026-02, 2026-05 y 2026-07; 1.428 filas)
no existen en R2. La API oficial sí responde y el conector validó 50 dietas de
2026-07, pero el histórico anterior mezcla categorías distintas bajo el mismo
`sourceId` (`tickets`, `misiones`, `gastos` y `dietas`). No se publica una
reparación parcial que pueda volver a confundir remuneraciones con gastos.

Se agregó la auditoría `npm run audit:r2:catalog`, que compara catálogo y
objetos físicos, y el publisher ahora valida que el catálogo no active
particiones sin manifiesto. También se cambió la auditoría de almacenamiento
para usar el listado físico de R2; no se realizaron borrados ni publicaciones
de datos en esta revisión. La publicación queda bloqueada hasta liberar
espacio con una credencial de escritura y definir qué histórico se conserva,
porque el token local vigente sólo tiene permisos de lectura.

El bucket separado `cambiometro-backups` conserva una copia del snapshot del
2026-08-20. Esa copia contiene 14 de las particiones actualmente huérfanas,
entre ellas ChileCompra 2026-06 (74.142 filas), DIPRES 2026-06 (15.689),
InfoLobby 2026-07 (10.649), Servel 2025-11 (23.894), SINIM 2025-12 (3.105),
votaciones Senado 2026-08 (23) y las particiones base de Senado 2026-05 y
2026-07. Es una vía de recuperación verificable, pero no se copiaron objetos:
primero se debe liberar espacio y separar las categorías de Senado.

La auditoría ampliada suma ambos buckets: `transparencia-public-data` ocupa
11.078.005.075 bytes y `cambiometro-backups` ocupa 6.359.832.609 bytes. El
total observado es 17.437.837.684 bytes, equivalente a 174,378% de 10 GB.
El respaldo del 2026-09-13 representa 4,31 GB y el del 2026-08-20 otros 1,91
GB. Antes de incorporar más datos, se debe conservar una sola política de
rollback y trasladar o retirar snapshots redundantes con permisos de escritura.
### Seguimiento posterior al PR #548 — 16-09-2026 14:10 UTC-3

El PR #548 quedó integrado en `main` mediante el merge `2dbc194`; sus checks
remotos quedaron verdes. Separó las categorías del Senado y agregó auditorías
de referencias y almacenamiento R2. No ejecutó ETL ni escribió datos.

La comprobación productiva conserva Movimientos en 46 registros desde R2.
Cámara responde con 2.117 filas para 2026-08. Senado `2026-07` todavía
responde 0 filas porque su partición productiva sigue ausente; no se publicará
una reparación parcial.

La auditoría física actual confirma 11.078.005.075 bytes en el bucket público,
6.359.832.609 bytes en backups y 17.437.837.684 bytes en la cuenta. El catálogo
mantiene 82 particiones sin manifiesto físico. No se borró ni copió ningún
objeto R2.

En el equipo se eliminaron sólo los directorios regenerables `.next` y `out` del
proyecto maestro. No se eliminaron repositorios, datos fuente, históricos ni
`cambiometro-editorial`.
La verificación local posterior al merge terminó con 202 archivos de prueba y
1.066 tests aprobados. Los guards de arquitectura, tokens, enlaces e
`innerHTML` también quedaron verdes. El smoke productivo mantuvo HTTP 200 en
las rutas principales, Movimientos 46/46 y el origen público R2.
### Protección de retención de backups — 16-09-2026 14:30 UTC-3

El PR #549 quedó fusionado en `main` como `1a7571d` después de seis checks
verdes y un check omitido por no ingestión. Se corrigió la causa concreta del
crecimiento de `cambiometro-backups`: la retención recorría `sourceObjects`, por
lo que nunca encontraba claves `backup/YYYY-MM-DD/` para retirar.

Ahora el backup lista ambos buckets, identifica snapshots expirados antes de
copiar y calcula el tamaño combinado proyectado. Si la cuenta queda en 95% o
más, el proceso se detiene antes de cualquier borrado, exportación D1 o copia.
La prueba de regresión confirma que los objetos `d1/` no se confunden con
snapshots. La suite posterior terminó con 203 archivos y 1.068 tests aprobados.
No se ejecutó el backup real ni se modificó R2.
La doble verificación productiva posterior terminó con 134 controles aprobados
y 0 fallas en cada una de las dos pasadas. La versión observada fue
`v1.0-a3c08e35`; Movimientos permaneció en 46/46, el health respondió HTTP 200
con `publicDataBackend=r2` y `publicD1Reads=false`, y las rutas principales
continuaron disponibles.

### Cierre prioritario de Movimientos y ruta posterior — 16-09-2026

La prioridad crítica de Movimientos queda validada en producción. La consulta
`/api/v1/records?source=movimientos&limit=100` respondió HTTP 200 desde R2 con
`sourceStatus=complete`, `total=46` y `publishedRows=46`. El release publicado
es `kast-2026-succession-reconciled-2026-09-14`, con checksum
`9a884d9bef8627718afed406d530591acec6a95c50dd27956c744b56766f1995`.

El control de integridad del release mantiene 46/46 salidas del benchmark:
3 ministras, 6 subsecretarios, 36 seremis y 1 delegado regional. No se
detectan en el release productivo las autoridades históricas señaladas como
falsos positivos ni los cargos incorrectos de Rafael Araos y Martín Arrau.
El pipeline permanece congelado para inyección automática (`etlFrozen=true`,
`productionMutation=false`). Los estados de verificación y sus evidencias se
conservan; una fila corroborada por prensa no se presenta como decreto oficial
hasta contar con el documento primario.

#### Plan de trabajo posterior, sin parches ni cargas ciegas

1. **Regresión protegida (cerrada):** conservar una prueba de producción para
   46 registros, categorías, cargos corregidos, ausencia de autoridades
   históricas y origen R2. Cualquier cambio que altere el total o reintroduzca
   esos nombres queda bloqueado.
2. **Salud de fuentes y releases:** auditar cada fuente contra el manifiesto
   físico de R2, comparando producción, release activo y snapshot local sólo
   por fecha, alcance, categoría y checksum. Una falla conservará el último
   release válido y nunca publicará cero filas.
3. **Cámara y Senado:** separar remuneraciones, asesorías, gastos y
   votaciones; restaurar sólo particiones con manifiesto y checksum verificable.
   Senado se procesará por categoría, porque el histórico anterior mezclaba
   tickets, misiones, gastos y dietas bajo un mismo identificador.
4. **Remuneraciones y Transparencia Activa:** auditar cobertura por organismo,
   período y tipo de pago; conservar valores originales, separar faltante de
   cero y cargar sólo pagos oficiales faltantes después de una muestra
   reconciliada.
5. **Movimientos incremental:** incorporar novedades sólo con identificador
   estable, fecha del evento, evidencia y estado explícito. No se ampliará el
   universo por noticias o nombramientos sin respaldo documental sin marcarlo
   como pendiente.
6. **R2 antes de cualquier publicación:** no copiar, recuperar ni generar un
   nuevo release mientras el almacenamiento físico combinado siga sobre el
   umbral. La medición actual es 11.078.005.075 bytes en el bucket público y
   6.359.832.609 bytes en backups (17.437.837.684 bytes combinados). El guard
   de 95% ya bloquea el backup antes de borrar o copiar. Se requiere definir
   retención y usar una credencial de escritura antes de liberar espacio.
7. **Promoción por bloque:** cada fuente tendrá auditoría R2, normalización
   local, checksum/conteo, preview, smoke de API y navegación, revisión móvil,
   promoción individual y rollback registrado. No se ejecutará ETL durante un
   despliegue de interfaz.

#### Orden recomendado

Primero mantener Movimientos congelado y monitorizar su regresión; segundo
resolver espacio y referencias huérfanas de R2; tercero reparar Senado por
categorías; cuarto auditar remuneraciones/Transparencia Activa; y recién
después ampliar históricos de ChileCompra, InfoLobby o DIPRES. Hasta cerrar el
segundo punto no se agregan datos masivos ni se afirma cobertura total.

#### Estado de seguridad

La estructura de rutas, navegación, municipalidades, remuneraciones y
`cambiometro-editorial` queda fuera de este cierre. No se hicieron escrituras
en D1 ni cargas nuevas en R2. La cuenta no debe recibir otro release hasta que
el preflight de tamaño sea inferior al umbral operativo y exista rollback
verificado.

### Verificación específica y conciliación de fuentes — 16-09-2026 14:45 UTC-3

La prueba `verify:prod:movimientos` terminó completamente verde. Confirmó
HTTP 200 para la página y el snapshot, release de 46 salidas con corte
2026-09-14, presencia de filas con evidencia oficial y corroboración pública,
reemplazos cuando existe respaldo, ausencia del agregador externo y exclusión
de Carolina Arredondo, Eduardo Vergara, Ignacia Fernández, Daniela Dresdner,
José Andrés Herrera y Patricio Kuhn. También confirmó que Rafael Araos figura
como subsecretario. `check:movimientos-integrity` informó 46 filas dentro de
alcance, cero fuera de alcance, cero IDs duplicados y cero incidencias.

La auditoría de remuneraciones no modifica releases y dejó estas pruebas
válidas: Lucy Depablos (7 filas), Sofía Pumpin (1), María Victoria Raimann
Pumpin (1), Río Sebastián Torrealba del Río (1) e Independencia municipal
(8.161 filas totales, consulta paginada de 20). Esto demuestra que esas rutas
de búsqueda responden, pero no demuestra por sí solo que el universo completo
esté reconciliado.

La diferencia de remuneraciones debe mantenerse separada por artefacto:

- Release estático de la página: 1.203.287 filas.
- Conteo productivo de la fuente `cplt`: 1.243.761 filas.
- Diferencia entre ambos: 40.474 filas.
- Snapshot local del catálogo comparativo: 1.218.136 filas.
- Diferencia entre producción y ese snapshot local: 25.625 filas.

Los tres números no se suman ni se usan para afirmar cobertura hasta comparar
período, organismo, releaseId y checksum. La diferencia local/producción es
compatible con frescura distinta; la diferencia entre el release estático y
la fuente productiva requiere reconciliación específica antes de la próxima
publicación de interfaz. El informe actual clasifica 6 fuentes como
coincidentes, 1 como más fresca en producción y 8 con diferencia de alcance
o categoría; no hay diferencias clasificadas como inexplicadas.

El inventario físico confirma que no es seguro recuperar particiones todavía:
el bucket público ocupa 11.078.005.075 bytes y el de backups 6.359.832.609
bytes, para 17.437.837.684 bytes combinados frente al límite de 10 GB. Por
eso se mantiene la regla: cero nuevas cargas o copias R2 hasta liberar espacio
con una política explícita de rollback y una credencial de escritura.

### Protección account-wide de publicaciones R2 — PR #551

Se detectó y corrigió un hueco de seguridad: los publicadores directos de
personal de apoyo, estáticos y transferencias no ejecutaban el preflight de
almacenamiento antes de escribir. Ahora los cuatro caminos de publicación
(lake, estáticos, personal de apoyo y transferencias) consultan ambos buckets
de la cuenta y calculan tamaño actual, pico conservador y resultado final.

La prueba remota con el grupo mínimo de Movimientos se detuvo antes del primer
`PUT` con `R2_WRITE_BLOCKED_AT_95_PERCENT`: pico de 17.437.939.965 bytes y
límite de 10.000.000.000 bytes. No se escribió R2 ni D1.

El PR #551 está en una rama separada de `main`. Sus pruebas locales quedaron en
204 archivos y 1.072 tests aprobados; los checks remotos de lint/tipos/tests,
seguridad y análisis estático ya pasaron, mientras la verificación de Pages/API
termina. Este cambio no publica interfaz ni datos.

La cuenta queda operativamente bloqueada para nuevas cargas hasta que se defina
la retención del rollback, se libere espacio de forma explícita y un nuevo
preflight quede bajo 95%. No se debe saltar el guard mediante variables de
entorno en producción.

### Auditoría del respaldo R2 — 16-09-2026

La revisión se hizo mediante el inventario de objetos del API de R2, sin
descargar los archivos ni escribir en ningún bucket.

El puntero `backup-inventory.json` no es confiable como inventario vigente:
declara una generación del 06-09-2026, referencia sólo un dump de D1 y
reporta cero objetos del lago de datos. En cambio, el bucket contiene dos
snapshots posteriores, por lo que el inventario publicado quedó atrasado o
incompleto. El simulador de restauración no debe considerarse válido hasta
que ese puntero enumere un snapshot verificable.

El snapshot `backup/2026-09-13/` contiene 2.587 objetos y
4.310.789.809 bytes. No es una copia completa del bucket público actual:
926 objetos coinciden por clave, mientras 1.661 objetos por
2.181.852.714 bytes sólo existen en ese snapshot. La mayor parte corresponde
a una versión histórica de `funcionarios-v1` (1.514 objetos y
2.124.662.818 bytes); también conserva particiones que hoy faltan en el
catálogo público, entre ellas ChileCompra, InfoLobby, DIPRES, Servel, SINIM,
Cámara, Senado e InfoProbidad. Por eso sí es necesario conservarlo como
rollback y recuperación hasta validar qué particiones se restauran y cuál
será la política definitiva de retención.

El snapshot `backup/2026-08-20/` sigue siendo necesario por ahora: contiene
613 objetos y 1.878.360.452 bytes, incluyendo copias de recuperación de
particiones ausentes. No se puede eliminar sólo por ser más antiguo, porque
el snapshot del 13-09 no reemplaza automáticamente todo su contenido.

La comparación entre snapshots muestra que 166 objetos son idénticos
(73.635.893 bytes), cinco manifiestos cambiaron y 442 objetos por
1.804.413.096 bytes sólo existen en el snapshot del 20-08. Esos objetos son
la versión anterior de `funcionarios-v1`; podrían ser redundantes únicamente
después de comprobar que la versión del 13-09 es restaurable y que existe
otro rollback íntegro para ese mismo release.

Conclusión operativa: no se eliminó ningún respaldo y no se subió ningún
dato. La prioridad es reparar el inventario, verificar una restauración
aislada de ambos snapshots y escoger explícitamente un rollback por cada
proyección. Sólo después se podrá liberar espacio eliminando objetos
redundantes identificados por clave y checksum. Mientras tanto R2 permanece
bloqueado por el umbral account-wide: el bucket público ocupa
11.078.005.075 bytes, backups 6.359.832.609 bytes y el total combinado
17.437.837.684 bytes frente al límite operativo de 10 GB.
