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

No se subieron ni borraron objetos R2 ni se consultó D1 en este bloque. Los importes originales se mantienen. No se certifica cobertura mensual completa ni la causa económica del importe de Abel.
