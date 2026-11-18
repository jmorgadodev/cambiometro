# Dashboard parlamentario

## Contrato y responsabilidad

Filtros por cámara, parlamentario, período, categoría e ítem; evolución temporal y detalle. Separar sueldo del parlamentario y recursos de función; indicar cobertura. No habilitar una vista consolidada si mezcla meses o unidades incompatibles.

## Origen, ejecución y artefactos

Ejecutores: Consume Gastos, Personal y Dietas; no extrae datos nuevos.

Artefactos: Nueva ruta /dashboard con acceso desde Cámara tras validar datos.

El calendario remoto canónico es .github/etl-calendar.json. Las rutas locales son relativas a cambiometro-public/transparencia-app; no instalar tareas desde worktrees. Verificar el corte del manifiesto publicado antes de usar copias locales.

## Verificación y recuperación

Desde transparencia-app: Probar filtros combinados, meses vacíos, totales por categoría, comparación de cámaras y navegación móvil.

Si el origen falla o se reduce la cobertura sin justificación, detener la publicación y conservar el último release válido. Registrar fallo, período, checksum y próxima acción en tasks/dashboard/evidence.md. No reactivar módulos secundarios como dependencia incidental. La recuperación de interfaz usa el artefacto previo; la de datos usa el release previamente validado.

## Archivos compartidos

Cualquier cambio de esquema, generador de slices, navegación global o release-set debe coordinarse con el integrador y sus consumidores. Consultar AGENTS.md antes de editar.
