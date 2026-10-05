# Correcciones municipales — progreso verificable

## Lugar de trabajo

Worktree: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.
Rama: `codex/municipal-payroll-semantics-20261004`.
No desplegar desde el checkout divergente de Proyectos.

## Validado localmente

- La API conserva bruto nulo y cero explícito en filas compactas y no descarta esas filas después de paginar el índice.
- `sueldoCompletoCount` queda nulo: el importe no acredita un salario mensual completo.
- Las estadísticas calculadas sobre páginas de índices declaran `scope: page`; las consultas estáticas declaran `filtered_records` y se calculan antes de paginar.
- Los contadores de importes distinguen positivos, cero, negativos y faltantes.
- La ficha selecciona el período más reciente disponible sin usar volumen como certificación de completitud.
- El desfase se calcula con la fecha actual en America/Santiago, no agosto de 2026 fijo.
- Suite focalizada: 72 pruebas aprobadas en siete archivos.
- Typecheck de aplicación y Worker: ambos sin errores después de corregir los tipos nuevos.

## Pendiente antes de cerrar y publicar

- Completar conciliación de las rutas alternativas/fallback y estadísticas combinadas.
- Revisar etiquetas restantes y períodos/unidades de finanzas SINIM.
- Ejecutar gates completos, build, preview y comprobar Tortel, O’Higgins y Cobquecura.
- Promover por el flujo que conserva los releases productivos; verificar API y ficha desplegadas.

## Segundo bloque validado

- Las rutas fallback y combinada conservan la misma distinción entre monto informado y faltante; la combinada declara estadísticas de página.
- La normalización repetida conserva la trazabilidad del nombre original y sus incidencias. Se agregó una prueba que primero reprodujo su pérdida.
- SINIM: presupuesto por año explícito, sin mezclar años ni convertir ingresos totales a propios; se conserva cero y faltantes. Dos pruebas nuevas cubren estas reglas.
- Se retiraron las causas automáticas para importes bajos, la equivalencia del complemento FCM con ingresos propios y la extrapolación anual de una nómina incompleta.
- Suite completa: 268 archivos y 1.569 pruebas aprobadas, además de los gates de tipos, arquitectura, tokens, enlaces e inyecciones. Esta ejecución precede a los últimos cambios textuales sobre extrapolación y períodos; repetir antes de promover.
- Build local detenido por `STATIC_EXPENSE_RELEASE_EMPTY`: faltan subsets no versionados de gastos. No se omitió la guarda ni se publicó el checkout incompleto. El siguiente paso es hidratación del release vigente mediante el flujo existente, build/preview y promoción.

## Preparación de preview

- Se recuperaron únicamente los dos subsets de gastos publicados; sus checksums se validaron. Manifest estático observado: `32350318947c288d2ab3570206fc877a07be01889c0dcac4244faa72a60f6b96`, release de objetos `9c241aab49fdba2ffaf6a0ecdce0596ec94eac60ab1c8a8414eaefbb55903b6b`.
- La segunda tentativa de build local se detuvo en `STATIC_DATA_FULL_TRANSFER_SOURCE_MISSING`; no se deshabilitó esa guarda. Se usará `pages-ui-refresh.yml` para construir con el release canónico completo y su caché verificada.
- Se corrigió también el período seleccionado por el constructor y al cambiar de año; un menor volumen no se presenta como publicación preliminar ni prueba de completitud.
- Reejecución posterior: `npm run test` terminó con código 0, 268 archivos y 1.569 pruebas aprobadas.
- Producción permanece sin cambios hasta completar preview y promoción verificadas.

## Verificación remota de la API candidata

- PR: https://github.com/jmorgadodev/cambiometro/pull/714, candidato `cd26c28a94ed2713fe00d911448433a7d94792af`.
- Pages preview: ejecución `37265967562`; en curso durante esta comprobación, regenerando agregados desde CPLT. No se reinició.
- API: ejecución `37266160465`; validación y preview R2-only aprobados. Worker aislado: `https://cambiometro-public-api-r2-audit-preview.koooke.workers.dev`, versión `aab2e065-8c4c-4d24-be95-8e2a56aaf479`.
- Consulta acotada de Abel: una fila, bruto 468212, líquido 410021, período 2025-01, URL oficial CPLT. `sueldoCompletoCount: null`, `completeMonthlyPayroll: false`, `stats.scope: page`, `stats.rows: 1`.
- `totalHeadcount` conserva el universo de la fuente por compatibilidad; el total de la búsqueda es `meta.total: 1`. No interpretar el primero como personas únicas o coincidencias municipales.
- Sigue pendiente render de Pages, promoción del candidato y verificación productiva. El preview no sustituye esa verificación.

## Candidato y comprobaciones adicionales

- Todos los checks del PR #714 terminaron aprobados, incluido build estático, APIs y verificación responsive (7m20s).
- Versión candidata de la API productiva, aún sin tráfico: `8d2015f7-c10f-4d12-a5f9-2e0c771c8b24`, artefacto `worker-version-cd26c28a94ed2713fe00d911448433a7d94792af` de la ejecución `37266160465`.
- Preview R2-only, agosto 2026: Tortel devuelve una fila de Marisela (8120877 bruto); O’Higgins devuelve Fica (7210087) y Torres (1824508), sin fusionarlas; Cobquecura devuelve cero coincidencias de alcaldía para ese período. Cero coincidencias del subconjunto no acredita ausencia de publicación oficial.
- El build Pages específico que regenera los agregados (`37265967562`) continúa vivo; no se sustituyó por otro build ni se promovió su artefacto antes de terminar.
- El token local no permite listar deployments del Worker (`No access to the specified resource`). Usar el workflow existente con sus permisos de CI para promover/verificar, no cambiar permisos locales ni inferir el deployment activo del listado de versiones.

## Corrección acotada de reconstrucción

- El helper de historial exigía coincidencia nominal incluso con ID explícito. Una prueba con un mismo ID y nombres presentados de manera distinta reprodujo la pérdida de un período; luego pasó al seleccionar primero por ID.
- Sin ID se conserva la regla de no unir nombres con múltiples claves. No se crean identidades ni se modifican montos.
- Medición sintética local, 20.000 filas y 20 llamadas: 301 ms antes, 12 ms después. No es una medición del build completo ni de producción.
- Se mantiene viva la ejecución inicial; el nuevo código requiere su propio artefacto verificado, no se promoverá el anterior como si incluyera este cambio.

No se subieron ni borraron objetos R2 ni se consultó D1 en este bloque. Los importes originales se mantienen. No se certifica cobertura mensual completa ni la causa económica del importe de Abel.
