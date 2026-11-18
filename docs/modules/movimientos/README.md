# Movimientos

## Contrato y responsabilidad

Separar fecha de publicación, fecha efectiva y estado de confirmación. Una declaración hipotética de renuncia no confirma un cambio de cargo.

## Origen, ejecución y artefactos

Ejecutores: etl-movimientos.yml.

Artefactos: data/movimientos.json fijado por el release-set.

El calendario remoto canónico es .github/etl-calendar.json. Las rutas locales son relativas a cambiometro-public/transparencia-app; no instalar tareas desde worktrees. Verificar el corte del manifiesto publicado antes de usar copias locales.

## Verificación y recuperación

Desde transparencia-app: npm run check:movimientos-integrity; npm run verify:prod:movimientos.

Si el origen falla o se reduce la cobertura sin justificación, detener la publicación y conservar el último release válido. Registrar fallo, período, checksum y próxima acción en tasks/movimientos/evidence.md. No reactivar módulos secundarios como dependencia incidental. La recuperación de interfaz usa el artefacto previo; la de datos usa el release previamente validado.

## Archivos compartidos

Cualquier cambio de esquema, generador de slices, navegación global o release-set debe coordinarse con el integrador y sus consumidores. Consultar AGENTS.md antes de editar.
