# Gastos operacionales

## Contrato y responsabilidad

El día de consulta no equivale al último mes publicado. Verificar ítems, filas y sumas para Bianchi y Kaiser; Cámara/Senado conservan sus categorías. No introducir ceros en meses sin registro.

## Origen, ejecución y artefactos

Ejecutores: etl-expenses.yml (Senado); tarea Windows etl-expenses-local.ps1 (Cámara).

Artefactos: data/lake-subsets/expense-periods, gastos-camara.subset.json y gastos-senado.subset.json.

El calendario remoto canónico es .github/etl-calendar.json. Las rutas locales son relativas a cambiometro-public/transparencia-app; no instalar tareas desde worktrees. Verificar el corte del manifiesto publicado antes de usar copias locales.

## Verificación y recuperación

Desde transparencia-app: node scripts/verify-expense-release.mjs --required; después del build: --verify-slices.

Si el origen falla o se reduce la cobertura sin justificación, detener la publicación y conservar el último release válido. Registrar fallo, período, checksum y próxima acción en tasks/gastos/evidence.md. No reactivar módulos secundarios como dependencia incidental. La recuperación de interfaz usa el artefacto previo; la de datos usa el release previamente validado.

## Archivos compartidos

Cualquier cambio de esquema, generador de slices, navegación global o release-set debe coordinarse con el integrador y sus consumidores. Consultar AGENTS.md antes de editar.
