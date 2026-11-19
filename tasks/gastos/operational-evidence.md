# Gastos: estado operativo y entrega pendiente

> Actualización 19-11-2026: los estados de publicación pendiente de este informe son históricos. La entrega #848 ya fue publicada y verificada; consultar [estado conciliado y recibo](../consolidacion/estado-fases-20261119.md). Conservar esta evidencia sin repetir extracciones o comprobaciones ya aprobadas. Los seguimientos operativos se registran en el tablero vigente.

Actualizado el 18-11-2026, America/Santiago. **El cierre web queda pendiente por cambio a trabajo local y publicación agrupada.** No abrir otro ciclo de publicación sin una solicitud de Jorge.

## Verificado

- Código integrado: 915fe31ecba9a8ceb23a146352ef8bc723f56c7b; PRs #845, #846 y #847. Raíz canónica cambiometro-public. La ficha y Reportajes siguen como prototipos locales en el worktree documentado en operational-state.json.
- CI del PR #846: 1.965 pruebas y 309 archivos; tipos, lint, seguridad, build y navegador aprobados. PR #847: CI aprobado y regresión de baseline por registros.
- Cámara: extracción completa de 155/155 autoridades y 6.510 filas. Septiembre devolvió 3.255 ceros y se retuvo. Segunda consulta oficial de Bello confirmó TRASLACIÓN agosto 626.161 → 573.641 CLP; se aprobó por hash y publicó en R2 mediante [run 44428887498](https://github.com/jmorgadodev/cambiometro/actions/runs/44428887498).
- Senado: tarea instalada extrajo 10.372 filas de enero-agosto de 2026; 419 totales por autoridad/mes conservados y cuatro revisiones de ítems contrastadas. Se publicó mediante [run 44430970755](https://github.com/jmorgadodev/cambiometro/actions/runs/44430970755). La siguiente ejecución manual de la tarea instalada devolvió código 0 y unchanged; acción restaurada.
- Auditoría R2: 19.530 filas Cámara y 155.451 Senado; otros dominios sin cambios; 2.960 montos históricos no informados conservados. [Recibo completo](operational-data-receipt.json).
- Release-set R2: 5cd0a3da19dddbbcccc9ef8a12215bc35e9f0cde00c239892b48ab25225cd9bf. Manifiesto: dbb128e7b70594934cdb5a8735e15e1704aa89322f0a9f9a9c931b7ab0c84ab3.

## Detenido al cambiar el flujo

Se detuvo la repetición manual de Cámara y se restauró su acción original; su resultado 267014 corresponde a detención, no a extracción verificada. Se cancelaron la compilación/publicación web final, su vigilancia y una verificación duplicada de main. No se creó preview ni se completó la validación web del release nuevo. Las programaciones ETL permanecen activas.

Producción observada al documentar: deployment ba68078f-c180-4e37-85fc-edb8cbbc6d83, SHA 8d5a1cd3d3c38dfe0368294ad64a1fe781f8c51a, estado success, [artefacto](https://ba68078f.cambiometro.pages.dev). Los datos nuevos de R2 aún requieren su entrega web.

## Reanudar de forma económica

1. Continuar las mejoras locales, preservando el diseño productivo y las rutas. Seguir [flujo local](../../docs/operations/local-first-deliveries.md).
2. Reutilizar los recibos y candidatos; no repetir la extracción completa de Cámara ni otro backfill Senado para una revisión de interfaz. Si R2 avanzó, comprobar su release vigente y los meses afectados.
3. Cuando Jorge solicite subir: una validación integrada del diff, un PR de la entrega y una construcción con datos vigentes de R2. No encadenar validaciones duplicadas por ajuste.
4. En preview/prod, proteger seis meses de Bianchi y Kaiser. Agosto: Bianchi 6.834.219 CLP, Kaiser 5.451.139 CLP. Marzo Kaiser: 6.532.914 CLP; ítem de 20.000 CLP ahora TRASLACION VEHICULO. Bello agosto: total 5.832.073 CLP tras la corrección oficial. Ausente no equivale a cero.
5. Registrar SHA real, release-set, mismo artefacto de preview/producción, estado de las fichas y rollback. Sólo entonces marcar el cierre web.

## Ejecución y recuperación

Tareas canónicas: scripts/etl-expenses-local.ps1 (Cámara, diario 06:30) y scripts/etl-senate-expenses-local.ps1 (Senado, diario 05:30), ambas extraen los días 2, 12 y 22. Próximo día elegible: 22-11-2026. Horas America/Santiago; los disparos de otros días sólo verifican fecha. Se probó el ejecutor real, no un futuro disparo del calendario.

Logs y XML quedan en transparencia-app/artifacts/gastos/task-*/ y C:/ProgramData/Cambiometro/. Los recibos CI y manifiestos anteriores están en transparencia-app/artifacts/gastos/camara-promotion-ci/ y senate-promotion-ci/, además de los artefactos GitHub expense-promotion-<run> (30 días). Los objetos R2 son inmutables; no borrarlos. Para rollback web usar el deployment previamente verificado; para datos conservar los manifiestos before y hacer una restauración revisada por CAS, nunca sobrescritura directa.
