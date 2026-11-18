# Votaciones y Partidos

## Contrato y responsabilidad

La tarea Senado fallaba por configuración/ruta; comprobar ejecución real. No alterar la afiliación histórica de un voto según la nómina actual. Landing conserva diseño y muestra fechas reales de ambas cámaras.

## Origen, ejecución y artefactos

Ejecutores: etl-camara-votaciones.yml; tarea Windows etl-senado-votaciones-runtime.mjs; publish-senado-projection.yml manual.

Artefactos: data/politicos-votaciones.json y slices parlamentarios; cohesión de bancadas.

El calendario remoto canónico es .github/etl-calendar.json. Las rutas locales son relativas a cambiometro-public/transparencia-app; no instalar tareas desde worktrees. Verificar el corte del manifiesto publicado antes de usar copias locales.

## Verificación y recuperación

Desde transparencia-app: npm run check:votaciones-destacadas; node scripts/etl-senado-votaciones-runtime.mjs --prepare-only; --dry-run consulta origen sin publicar.

Si el origen falla o se reduce la cobertura sin justificación, detener la publicación y conservar el último release válido. Registrar fallo, período, checksum y próxima acción en tasks/votaciones/evidence.md. No reactivar módulos secundarios como dependencia incidental. La recuperación de interfaz usa el artefacto previo; la de datos usa el release previamente validado.

## Archivos compartidos

Cualquier cambio de esquema, generador de slices, navegación global o release-set debe coordinarse con el integrador y sus consumidores. Consultar AGENTS.md antes de editar.
