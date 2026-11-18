# Datos y Metodología

## Contrato y responsabilidad

Publicar corte y cobertura por fuente. No sumar personas, registros, contratos y votaciones como si fueran la misma unidad. El histórico de una fuente pausada sigue consultable con su fecha.

## Origen, ejecución y artefactos

Ejecutores: source-calendar-monitor.yml y validadores de publicación; no extraer fuentes pausadas.

Artefactos: source-health, data-quality-summary y release-set publicados.

El calendario remoto canónico es .github/etl-calendar.json. Las rutas locales son relativas a cambiometro-public/transparencia-app; no instalar tareas desde worktrees. Verificar el corte del manifiesto publicado antes de usar copias locales.

## Verificación y recuperación

Desde transparencia-app: npm run check:etl-calendar; npm run check:data-quality-summary; npm run check:production-gates.

Si el origen falla o se reduce la cobertura sin justificación, detener la publicación y conservar el último release válido. Registrar fallo, período, checksum y próxima acción en tasks/datos/evidence.md. No reactivar módulos secundarios como dependencia incidental. La recuperación de interfaz usa el artefacto previo; la de datos usa el release previamente validado.

## Archivos compartidos

Cualquier cambio de esquema, generador de slices, navegación global o release-set debe coordinarse con el integrador y sus consumidores. Consultar AGENTS.md antes de editar.
