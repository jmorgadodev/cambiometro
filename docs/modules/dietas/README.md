# Dietas parlamentarias

## Contrato y responsabilidad

El registro 38 bis contiene cargos fuera del Congreso. Mantener ese conector como dependencia de dietas; filtrar el consumo parlamentario. No aplicar la última dieta conocida al total de un mes distinto.

## Origen, ejecución y artefactos

Ejecutores: etl-remuneraciones-38bis.yml.

Artefactos: data/remuneraciones-38bis-publico-manifest.json y sus artefactos estáticos.

El calendario remoto canónico es .github/etl-calendar.json. Las rutas locales son relativas a cambiometro-public/transparencia-app; no instalar tareas desde worktrees. Verificar el corte del manifiesto publicado antes de usar copias locales.

## Verificación y recuperación

Desde transparencia-app: npm run data:build:remuneraciones-38bis; npm run check:remuneraciones-unified.

Si el origen falla o se reduce la cobertura sin justificación, detener la publicación y conservar el último release válido. Registrar fallo, período, checksum y próxima acción en tasks/dietas/evidence.md. No reactivar módulos secundarios como dependencia incidental. La recuperación de interfaz usa el artefacto previo; la de datos usa el release previamente validado.

## Archivos compartidos

Cualquier cambio de esquema, generador de slices, navegación global o release-set debe coordinarse con el integrador y sus consumidores. Consultar AGENTS.md antes de editar.
