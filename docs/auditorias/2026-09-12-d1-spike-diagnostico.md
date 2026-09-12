# Diagnóstico del consumo D1 compartido

**Fecha del diagnóstico:** 2026-09-12
**Estado:** consumo crítico identificado; atribución externa pendiente

## Evidencia de Analytics

El workflow `Watch GitHub Actions Usage & Billing` terminó correctamente en el
run `34676396813` a las **05:45 UTC**. Su artefacto reportó:

| Base | Filas leídas | Consultas | Filas escritas | Escrituras |
|---|---:|---:|---:|---:|
| `transparencia-db` | 14.030.061 | 648 | 0 | 0 |
| `impulsacv-db` | 577 | 11 | 18 | 5 |
| **Cuenta** | **14.030.638** | — | **18** | — |

El límite gratuito diario de lectura es 5.000.000. El nivel informado fue
`critical` (**280,61%**). El artefacto previo del run `34661075414` no contenía
filas por base y no se considera evidencia de consumo cero.

El workflow `D1 post-reset probe`, run `34673322107` a las **04:33 UTC**,
ya registraba 13.758.232 filas leídas y 645 consultas sobre
`transparencia-db`. Su compuerta detuvo la petición de Cámara porque la cuota
seguía crítica.

## Descartes dentro de Cambiómetro

Durante la ventana del aumento:

- el ETL de gastos del Senado ejecutó el preflight con
  `D1_ANALYTICS_UNAUTHORIZED`, `proceed=false` y materialización pospuesta;
- el workflow semanal de InfoLobby sólo ejecutó su validación y no materializó;
- la API productiva declara `publicDataBackend: r2` y
  `publicD1Reads: false`;
- la consulta acotada de Cámara respondió HTTP 200 con `sourceBackend: r2-lake`.

Por lo tanto, la evidencia disponible no atribuye esas 648 consultas al
camino público actual de Cambiómetro. Analytics de D1 entrega agregación por
base, no el Worker, ruta, proyecto ni texto de la consulta que originó cada
lectura.

## Protección aplicada

El commit `7976064` exige `github.event_name == 'workflow_dispatch'` en toda
materialización D1 de los ETL. Los procesos programados siguen publicando R2
y no pueden activar D1 aunque el preflight cambiara de estado.

La protección está en la rama local candidata y aún no está desplegada.

## Bloqueo de atribución

El token local de auditoría no tiene permiso de lectura de Workers: la consulta
al inventario de scripts de Cloudflare respondió `403`. Para determinar si el
consumo proviene de otro proyecto o de un Worker antiguo que aún conserva el
binding a `transparencia-db`, se necesita revisar los bindings de Workers con
un token que incluya **Workers Scripts → Read**. No se ejecutó SQL ni se
modificó ninguna base.

## Verificación del candidato R2-only

La rama `codex/release-candidate-r2-only-d1-safe`, commit
`67de3c558837d4a1d337547f7ae83c064c097a3e`, quedó publicada como candidato
remoto para revisión. Sus verificaciones terminaron correctamente el
2026-09-12:

| Verificación | Run | Resultado |
|---|---:|---|
| Quality (lint, tipos y tests) | `34683786274` | success |
| Security - CodeQL | `34683786209` | success |
| Verify ETL calendar | `34683786269` | success |
| ETL Semanal - InfoLobby (validación) | `34683786341` | success |

Esto valida el candidato en CI, pero no constituye un despliegue. Producción
permanece sin cambios y la atribución del consumo histórico de
`transparencia-db` sigue pendiente de permiso **Workers Scripts → Read**.

## Reconciliación de release y validación del candidato

El PR #490 (`codex/release-candidate-r2-only-d1-safe`) quedó actualizado al
commit `71336105b721f7ac3602ed8444d8d3f53afc10f6`. Se corrigió la métrica
`queryable` de Ley 19.862 para que use el mismo release explícito que fija el
denominador canónico; el snapshot de salud anterior ya no puede producir una
fracción mayor al 100%.

La validación local, hidratando los artefactos desde R2 y sin consultar D1,
pasó:

- `npm test`: 980 tests aprobados;
- `npm run pages:build`: 4.674 rutas estáticas, con municipalidades,
  remuneraciones y transferencias incluidas;
- `npm run pages:verify`: 346 municipalidades, 205 perfiles políticos,
  59.912 transferencias y 18.775 gastos verificados;
- `npm run api:size`: Worker de 173,61 KiB, con `ALLOW_PUBLIC_D1_READS=0`.

El build local se hizo con los snapshots vigentes de R2 y los cambios
generados sólo para la prueba no se incorporaron al commit. El build/E2E de
GitHub terminó correctamente en el run `34685576445`; también terminaron en
verde calidad, seguridad, CodeQL y las verificaciones ETL. El PR queda listo
para revisión y promoción explícita, pero este bloque no realizó despliegue a
producción.

## Revalidación del refresco de `main` — 09:20 UTC

El refresco automático de Pages sobre `main`, run `34685584773`, falló antes de
publicar cualquier artefacto. El error fue:

`DATA_QUALITY_SUMMARY_INVALID: transparencia-activa: histórico menor que canónico`

La causa es que `main` todavía genera el resumen con los conteos estáticos
antiguos de `data/data-quality-sources.json`, mientras el catálogo/R2 vigente
ya tiene un alcance distinto. El workflow recuperó y validó R2, pero no pasó el
verificador de calidad; los pasos de Pages y el registro de deployment quedaron
omitidos. No se produjo un despliegue parcial.

La rama candidata del PR #490 ya contiene `reconcileSourceCounts`, que separa
conteo canónico, histórico, consultable y estado de reconciliación; su build y
E2E (`34685576445`) terminaron correctamente. Esto confirma que no debe
promoverse `main` directamente ni corregirse el conteo a mano en producción:
primero debe pasar la rama candidata completa.

El guard asociado, run `34685584786`, terminó posteriormente con fallo tras
agotar 30 minutos de espera:

`STATIC_RELEASE_NOT_REFRESHED_AFTER_ETL:ETL Semanal - InfoLobby`

Este segundo fallo es consecuencia del primero: como el build de Pages en
`main` se detuvo por el resumen CPLT inválido, nunca existió un release estático
nuevo que el guard pudiera confirmar. La espera prolongada no representa una
lectura masiva de D1 ni un nuevo ETL; es una verificación de frescura sin
publicación exitosa.

## Hallazgo adicional: exportación semanal completa de D1

La revisión del repositorio público encontró una causa operativa directa y
recurrente del consumo de lecturas: `.github/workflows/backup-weekly.yml` se
ejecutaba cada domingo y llamaba a `transparencia-app/scripts/backup-weekly.mjs`.
Ese script ejecutaba `wrangler d1 export transparencia-db` de forma
incondicional antes de copiar el data lake a R2. Un export completo de la base
es incompatible con el objetivo de mantener D1 dentro de la cuota compartida
y es consistente con el pico histórico observado de 14.030.061 filas leídas.

Se preparó una corrección local, sin despliegue ni escritura externa:

- el backup programado queda en modo R2-only;
- el export D1 sólo puede activarse manualmente con `BACKUP_D1=1` y la
  confirmación exacta `CAMBIOMETRO_D1_BACKUP`;
- el inventario marca explícitamente `d1: null` y `d1Skipped: true` cuando no
  existe dump;
- el restore drill valida un objeto del backup R2 mediante `HEAD` y termina en
  modo `R2_ONLY`, sin descargar ni restaurar D1;
- se agregó una prueba estática de la política para impedir que el flujo
  programado vuelva a exportar D1 accidentalmente.

La corrección está pendiente de revisión y publicación controlada. No modifica
los datos públicos, no ejecuta ETL y no toca `cambiometro-editorial` ni otros
repositorios.

## Revisión de atribución posterior — 12 de septiembre, 12:00 UTC

Se amplió la revisión desde el panel autenticado de Cloudflare y desde el
código que corresponde a la versión productiva del API.

### Inventario operativo de Workers

El panel muestra 22 aplicaciones de Workers/Pages en la cuenta. Dentro del
espacio Cambiómetro se revisaron explícitamente:

| Servicio | Binding a `transparencia-db` | Actividad reciente | Estado operativo |
|---|---|---:|---|
| `cambiometro-public-api` | Sí | 451 invocaciones / 7 errores en 24 h | Productivo, ruta `/api/*` |
| `cambiometro-public-api-preview` | Sí | 0 invocaciones | Sólo preview |
| `cambiometro-public-api-staging` | Sí | 0 invocaciones | Sin rutas personalizadas |
| `cambiometro` | Sí | 0 invocaciones | Sin rutas; `workers.dev` deshabilitado |
| `transparencia-impulsacv` | No existe | — | Retirado |
| `transparencia-etl-legacy` | No existe | — | Retirado |

El Worker independiente `cambiometro` conserva un binding histórico, pero no
tiene una ruta ni invocaciones en la ventana observada. No se eliminó ni se
desvinculó porque es un recurso distinto del repositorio histórico y esa sería
una operación destructiva separada que requiere autorización expresa sobre ese
servicio concreto.

### Comparación con la versión productiva

La promoción productiva activa `64fa71d2-d0a1-4660-a478-aaa759f686a1` usa el
commit `31f84cd61b65baae38932203d661178e008c554e`. Se verificó que ese código:

- no contiene la consulta `subject_entity_ids_json LIKE` que encabeza el
  consumo de D1 observado;
- no contiene el `GROUP BY source_id` que aparece entre las consultas costosas;
- no consulta `kv_cache`;
- declara `ALLOW_PUBLIC_D1_READS=0` y `PREFER_TRANSFER_D1=0`;
- intenta primero los índices y releases publicados en R2;
- devuelve `publicDataBackend: r2` y `publicD1Reads: false` en producción.

Se probó además, sin alterar datos, `/api/v1/health`, `/api/v1/sources`, una
consulta paginada de Cámara, una consulta de funcionarios y una relación
acotada. Todas respondieron HTTP 200 y conservaron el camino R2. Esto descarta
que esas cinco comprobaciones estén ejecutando los scans de D1 que explican el
pico.

### Interpretación actual

Las 2 mil consultas y 14–15 millones de filas leídas todavía visibles en la
ventana de 24 horas mezclan actividad anterior a la promoción actual. El texto
de las consultas de mayor impacto no existe en el Worker productivo vigente,
ni en los Workers históricos `transparencia-*` porque éstos no existen. Con la
evidencia disponible, el origen más probable es una versión anterior del API o
un proceso externo/legado que operó antes de la promoción; Cloudflare no expone
en esta vista el nombre del Worker que emitió cada consulta.

La conclusión operativa no es declarar el incidente cerrado todavía: hay que
observar la siguiente ventana completa posterior a la promoción. Si el mismo
patrón vuelve a crecer después de que expire la ventana de 24 horas, habrá que
revisar el Worker independiente `cambiometro` y los consumidores externos con
un inventario de bindings autorizado. Si el contador cae y no reaparecen las
consultas `LIKE`/`GROUP BY`, la causa habrá quedado confirmada como actividad
previa a la protección R2-only.

### Estado de cierre de esta fase

- **Histórico `transparencia-impulsacv`:** retirado y descartado como consumidor
  actual.
- **API público:** protegido contra lecturas públicas D1 en la versión vigente.
- **ETL programados:** publican R2; la materialización D1 requiere ejecución
  manual, preflight y autorización explícita. En `origin/main`, la acción
  `d1-preflight` mantiene `allow-remote-materialization=false` por defecto y
  ningún workflow actual lo habilita; por tanto, los pasos de materialización
  quedan actualmente bloqueados incluso cuando un workflow se dispara de forma
  manual.
- **D1:** no se borra ni se toca su contenido; queda en observación hasta contar
  con una ventana posterior completa sin scans masivos.

### Comprobación inmediata posterior

Después de consultar los endpoints R2 del API y actualizar nuevamente el panel
de D1, los indicadores permanecieron en aproximadamente 2 mil consultas y
15,43 millones de filas leídas, con cero escrituras. No aumentaron durante las
comprobaciones acotadas. Es una señal favorable, pero no reemplaza la ventana
completa de 24 horas porque el panel conserva el agregado móvil.

También se revisaron las ejecuciones programadas recientes de Cámara
(`34691437098`), Senado (`34691714118`) e InfoLobby (`34691854513`). Terminaron
correctamente y sus logs no muestran materialización remota ni exportación D1.
El código de `origin/main` conserva los pasos D1 detrás de la acción de
preflight y de una autorización explícita que ningún workflow actual activa.
