# Gastos operacionales

## Ejecución operativa

- Web/ETL: `C:/Users/jorge/Proyectos/cambiometro-public`, rama integrada `main`. Los prototipos de ficha y Reportajes continúan separados.
- Cámara: tarea Windows con `transparencia-app/scripts/etl-expenses-local.ps1`, diaria a las 06:30 America/Santiago. Extrae los días **2, 12 y 22**; los demás disparos sólo verifican la fecha.
- Senado: tarea Windows `scripts/etl-senate-expenses-local.ps1`, diaria 05:30 America/Santiago; extrae los días **2, 12 y 22**. GitHub recibió HTTP 403 del origen el 18-11-2026; el workflow queda para promoción y ejecución manual, sin cron remoto. Los módulos pausados siguen manuales.
- Una consulta no equivale al último mes publicado. Ausente no equivale a cero y TOTAL no se suma junto con sus ítems.

## Baseline, contratos y protección

El baseline se reconstruye de los **shards mensuales canónicos** referenciados por el manifiesto R2 y comprobados por SHA-256, tamaño, fuente, período, filas e IDs. Los subsets históricos pueden estar retenidos en un corte anterior: nunca deben reemplazar los meses publicados al actualizar la otra cámara. El loader común está en `scripts/etl/canonical-expense-baseline.mjs`.

`lib/expense-record-contract.mjs` exige mes YYYY-MM válido e importes enteros seguros CLP; conserva null y el cero explícito. Cámara rechaza negativos; Senado conserva ajustes negativos. Una fila inválida aborta. Matrices amplias de ceros, meses futuros, pérdidas de cobertura y revisiones publicadas quedan retenidos para revisión, con el último release intacto.

Cámara consulta el último mes elegible (desfase oficial de dos meses) y su solapamiento, comprobando la autoridad y el año seleccionados. Con datos verificados idénticos devuelve `unchanged`: no republica ni renueva artificialmente fechas. Septiembre de 2026 se retiene por matriz de 3.255 ceros; agosto conserva sus 155 autoridades.

## Autenticación y publicación

El ejecutor local usa `CLOUDFLARE_DATA_API_TOKEN` si existe; en otro caso captura en memoria la sesión OAuth de Wrangler, sin modificar variables persistentes ni permisos. En Actions, `--hydrate-only` conserva el token de datos inyectado por el workflow.

OAuth permite leer R2 y preparar el staging, pero no debe usarse para derivar el cliente S3 condicional. Por eso el ejecutor de Cámara **no promueve manifiestos desde el checkout**: guarda un sobre inmutable por hash, verifica su lectura y despacha `etl-expenses.yml`. Ese job usa las credenciales de datos ya existentes en Actions, valida procedencia main, edad, checksum, cobertura y conservación exacta de filas previas. Publica objetos inmutables y cambia el manifiesto por CAS; comprueba el resultado y conserva el manifiesto anterior en su artefacto de recuperación. Los otros dominios, incluidos los meses del Senado, permanecen intactos.

Los datos nuevos de Senado siguen el mismo workflow de gastos, con baseline canónico, paginación validada, preservación histórica y verificaciones del release. El workflow de Pages recibe el evento exitoso, construye con el release fijado y permite promover el mismo artefacto verificado. Un `unchanged` no acredita datos nuevos ni implica que se haya desplegado Pages.

## Comandos

Desde `transparencia-app`, sólo en main canónico limpio para código/roster:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/etl-expenses-local.ps1 -Force
gh workflow run etl-expenses.yml --ref main -f full_history=true
```

Preparación sin publicar, desde una rama de módulo:

```powershell
node scripts/etl-expenses-local.mjs --prepare-only --periods 2026-08,2026-09 --candidate-dir artifacts/expense-candidates/camara-revision-001
node scripts/prepare-senate-expenses-local.mjs --manifest-file artifacts/gastos/baseline/manifest.json --candidate-dir artifacts/expense-candidates/senado-revision-001 --full-history
```

El preparador desde archivos `scripts/prepare-expense-candidate.mjs` permite revisión sin red; exige baseline con checksum y alcance explícito. Los candidatos se escriben en directorios nuevos bajo `artifacts/expense-candidates`; nunca sobrescriben entradas. Salida 2 significa revisión requerida, no autorización para publicar. Senado se agrupa por nombre publicado para la comparación; no se presume reconciliación de homónimos.

## Verificación y recuperación

Ejecutar pruebas con fixtures versionados **antes de hidratar**; después comprobar datos publicados, `verify-expense-release.mjs --required` y `--verify-slices`. Proteger meses, totales e ítems de Bianchi/Kaiser. Una revisión de categoría puede conservar el total mensual; el informe debe mostrar ambas dimensiones.

Si falla el origen, el checksum, el presupuesto R2 o CAS, se conserva el manifiesto anterior. Los objetos inmutables y el artefacto CI `gastos-camara-promotion-<run>` permiten recuperación; no borrar datos como reparación. Guardar manifiestos, run IDs, SHA de código, release-set, preview/producción y rollback en `tasks/gastos/operational-evidence.md`. Un cierre operativo requiere recibos de ejecución real y artefacto publicado, no sólo tests o un comando exitoso.

## Correcciones de períodos publicados

El ejecutor devuelve código 2 y conserva el release si encuentra una revisión. No equivale a un fallo de extracción. La revisión requiere contrastar nuevamente el origen y aprobar el candidato por SHA-256 en `expense_review_sha256`; el recibo contiene baseline, candidato, SHA de código, cambios recalculados y fecha. `promote-reviewed-expenses.mjs` valida los mismos bytes, conserva todos los meses/autoridades y los registros fuera del alcance, rechaza importes desconocidos o matrices de ceros y promueve por CAS sólo desde CI. Las aprobaciones vencen en 24 horas; no hay un interruptor global para ignorar validaciones.

Senado conserva su baseline mensual histórico y prepara candidatos incrementales con paginación oficial validada. Su staging y promoción usan las mismas credenciales y cola de publicación existentes. Instalar la tarea desde main canónico con `scripts/install-etl-senate-expenses-task.ps1`; `-Force -FullHistory` en el wrapper realiza el contraste inicial de 2026.
