# Gastos · evidencia del incremento local

Fecha: 2026-11-18. Worktree: `C:\Users\jorge\.codex\worktrees\cambiometro-estabilizacion\cambiometro-public`. Rama `codex/gastos-estabilizacion-local-20261118`; base local `a713073c`, origin/main obtenido y comprobado `8d5a1cd3d3c38dfe0368294ad64a1fe781f8c51a`. Se preservan los prototipos locales de ficha y Reportajes; esta entrega no cambia su interfaz ni la landing.

## Correcciones y verificación

- Reproducidos y corregidos: mes 13 aceptado, vacío/booleano convertido en cero, fila inválida descartada en silencio, signo negativo eliminado por el parser de Cámara y texto de categorías alterado al eliminar entidades HTML.
- Contrato compartido para montos, períodos y filas resumen; cero explícito separado de ausencia y ajustes negativos de Senado conservados.
- Preparación aislada con informe por autoridad y mes: IDs perdidos aunque crezca el volumen, importes revisados, mes completo ausente, autoridad sin filas, detalle/total discrepantes y montos desconocidos. Los años históricos fuera del refresco se conservan.
- Recorrido desde archivos probado con fixtures sintéticos: entradas intactas, artifacts nuevos, checksum de entradas registrado, rechazo de sobrescritura y ausencia de publicación automática. No constituye verificación de datos oficiales.
- Después se contrastaron las fuentes reales: 155 diputados, agosto/septiembre, y los ocho meses oficiales de Senado de 2026. El recibo versionado con checksums, revisiones y doce meses protegidos de Bianchi/Kaiser está en `source-audit-20261118.json`.
- La decisión normal de Cámara se evalúa antes de escribir/publicar. Con los datos observados da `unchanged`: agosto coincide y septiembre se aparta por matriz de ceros. Un período publicado que se vuelva no verificable, una pérdida de IDs o una revisión de importes detiene la promoción y conserva el release.

Comandos desde `transparencia-app`:

```powershell
node node_modules/vitest/vitest.mjs run scripts/expense-release.test.mjs scripts/etl/connectors/camara-gastos.test.mjs scripts/etl-expenses-local.test.mjs lib/gastos-operacionales.test.ts lib/senado-expense-reconciliation.test.ts --configLoader native --no-cache
node node_modules/typescript/bin/tsc --noEmit --incremental false
node node_modules/eslint/bin/eslint.js lib/expense-record-contract.mjs lib/gastos-operacionales.ts scripts/expense-release.mjs scripts/expense-release.test.mjs scripts/etl/expense-candidate.mjs scripts/prepare-expense-candidate.mjs scripts/etl-expenses-local.mjs scripts/etl-expenses-local.test.mjs scripts/etl/connectors/camara-gastos.mjs scripts/etl/connectors/camara-gastos.test.mjs
```

La suite final completa aprobó **308 archivos y 1.953 pruebas**, con fixtures versionados y cuatro workers. Después se añadió y aprobó una regresión adicional que protege el token de datos de Actions en `--hydrate-only`; la comprobación dirigida de ese incremento y SEO aprobó 27 pruebas. Tipos, lint de archivos modificados y `git diff --check` aprobados. Los informes están en `transparencia-app/artifacts/gastos/vitest-code-final.json` y el recibo de fuente versionado.

```powershell
node node_modules/vitest/vitest.mjs run --configLoader native --no-cache --maxWorkers=4 --testTimeout=30000 --reporter=json --outputFile=artifacts/gastos/vitest-code-final.json
```

Comando de comprobación ampliada:

```powershell
node node_modules/vitest/vitest.mjs run scripts/expense-release.test.mjs scripts/etl-expenses-local.test.mjs scripts/etl/connectors/camara-gastos.test.mjs scripts/etl/connectors/senado-expense-normalization.test.mjs scripts/etl/expense-window.test.mjs scripts/etl/senado-expense-periods.test.mjs lib/gastos-operacionales.test.ts lib/senado-expense-reconciliation.test.ts lib/camara-expenses-runtime.test.ts lib/db-expense-aggregate.test.ts lib/gastos-public-api.test.ts lib/gastos-periods-integrity.test.ts --configLoader native --no-cache
```

Incidencias resueltas: la primera ejecución restringida falló en siete pruebas de junctions/localhost; al recuperar la revisión automática, su ejecución fuera del sandbox pasó. Una ejecución durante la hidratación mostró 33 fallos por límites de tiempo y expectativas de fixtures antiguos frente a meses/importes publicados más nuevos. No se cambiaron esas aserciones para hacerlas coincidir con datos reales: se respaldaron y verificaron los 17 archivos hidratados/generados por esta tarea, se ejecutó la suite con los fixtures versionados y luego se recuperaron los insumos R2. Los JSON hidratados se comprobaron nuevamente contra los 206 checksums del release. Para próximas entregas: ejecutar primero las pruebas con fixtures y después hidratar/construir.

Build local: Next compiló, comprobó tipos y generó 4.678 HTML. El primer intento expuso dependencias publicadas ausentes: se hidrató el release canónico de transferencias (62.172 filas, 1.244 páginas, SHA-256 `9615b9e0453a3dcbb849114295d3803a3aaeec84c336669efb0e2afe6f800825`) sin extraer fuentes secundarias. Se siguió el comando de `pages-ui-refresh.yml` con `CAMBIOMETRO_PUBLISHED_RELEASE_ONLY=1` y `TRANSFER_STATIC_CANONICAL_MANIFEST_FILE`.

La comprobación SEO detectó que los placeholders noindex de `/prototipos` entraban en el catálogo público. Se corrigieron el sitemap, robots y guard SEO para separar únicamente esas rutas locales, conservando su bloqueo de producción y sin debilitar las validaciones de páginas públicas. Se ejecutó nuevamente el tramo de metadatos y verificación: SEO aprobado con 239 canónicas; referencias de chunks, export de 18.141 archivos, transferencias y gastos aprobados. El artefacto es exclusivamente de validación local; no es una publicación ni una promoción autorizada. No hay cambios visuales en landing, menú o ficha activa.

## Accesos y resultados reales

La revisión automática volvió a funcionar al retomar el trabajo. Cloudflare reconoce la cuenta correcta. El token genérico de entorno da 401 en R2; la sesión OAuth existente sí leyó el manifiesto y objetos. Se corrigió el ejecutor para preferir credencial de datos o esa sesión, sin crear tokens, ampliar permisos ni cambiar variables persistentes. Actions conserva su token inyectado de datos para hidratación.

- Baseline R2: 206 archivos, manifiesto `ee8dbacbe67e60bf6908739de35635bf38265ceb84741a587f5814a93a455c19`, release-set `e01d96ebc529d491432e87dab9cf659fd8321e975ee28bfdd557712774670855`. El recibo distingue este release del de la captura de producción; se comprobaron todos sus períodos/importes de referencia.
- Cámara: año 2026 y nómina oficial de 155 IDs coincidentes. Extracción completada 155/155, 6.510 filas; agosto idéntico al publicado. Septiembre contiene 3.255 ceros y se considera no verificado; el informe muestra total observado desconocido, no gasto cero confirmado. No hay datos nuevos elegibles que publicar.
- Senado: enero–agosto de 2026, 10.372 filas. Las 69 filas adicionales de marzo son `VALOR TOTAL`; excluirlas conserva el gasto mensual. Se detectaron 2.905 IDs ausentes de la respuesta nueva, tres cambios de categoría y una corrección de detalle para Celis. Los 419 totales de autoridad/mes permanecen iguales. El candidato se conserva para revisión de integración y no reemplaza el publicado.
- Regresión: Bianchi y Kaiser conservan los doce meses marzo–agosto, totales e ítems positivos de la captura de producción. Gasto de agosto: Bianchi $6.834.219, Kaiser $5.451.139. Verificación del universo de gastos: 174.912 filas, conservadas en slices e histórico.
- Tarea Windows: apunta a la raíz canónica y está Ready; próximo disparo observado 19-nov 06:30. El resultado 0 del día 18 no acredita extracción: el código normal sólo extrae el día 2. Ni ese resultado ni el próximo disparo fuera de ventana se consideran cierre del ETL. Calendario y tareas permanecen intactos.

La entrega local está terminada. Para cierre operativo faltan integración, revisión/promoción del candidato Senado y la siguiente ejecución real con artefacto remoto verificado. No se hicieron push, despliegue, cambios de tareas Windows/workflows ni escrituras R2. El código/documentación se guardan en commits locales; insumos hidratados, candidatos y `out/` permanecen fuera de esos commits.

## Recuperación e integración

La producción conserva su artefacto actual. Cada candidato es independiente y se conserva para revisión; un error no autoriza copiarlo a `data/` ni publicarlo. Para descartar una preparación, retirar exclusivamente su carpeta revisada dentro de `artifacts/expense-candidates/`, sin tocar entradas ni datos remotos. Antes de integrar: obtener origin/main de nuevo, revisar el diff del contrato compartido y consumidores, ejecutar las pruebas y el build con datos publicados, y verificar el artefacto acordado.
