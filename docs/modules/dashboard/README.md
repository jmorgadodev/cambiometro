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

## Implementación local — 19-11-2026

Ruta `/dashboard`; acceso secundario desde Cámara. Modelo y contrato en `lib/parliamentary-dashboard.ts`, adaptador servidor en `lib/parliamentary-dashboard-data.ts`, interfaz y CSS propios en `components/dashboard/ParliamentaryDashboard*`. [Plan y aceptación](../../../tasks/dashboard/plan.md), [evidencia y comandos](../../../tasks/dashboard/evidence.md).

El rango se inicia en enero de 2026. Los filtros se conservan en URL e historial. Los acumulados se calculan por componente; no se ofrece un costo conjunto que duplique asignaciones. Las categorías operacionales son agrupaciones de lectura (traslados, oficinas/servicios, actividad/comunicación y otros); el ítem oficial permanece visible. Las dietas son las últimas referencias oficiales por persona y mes, no una serie completa de pagos o reajustes históricos. Asesorías externas sólo se muestran cuando están incorporadas como tales; no se inventa un desglose equivalente de Senado.

La vista publicada consume el pin `.ci-data-version/release-set.json` y verifica archivos de gastos y personal. Para desarrollo, `scripts/prepare-dashboard-local.mjs` reutiliza candidatos guardados que coincidan byte a byte con el release, sin extracción. `CAMBIOMETRO_DASHBOARD_LOCAL_DATA` activa ese bundle local explícito; la publicación con `CAMBIOMETRO_PUBLISHED_RELEASE_ONLY=1` lo rechaza. Sin entradas verificadas se muestra preparación pendiente. No copiar los JSON de Git para completar ausencias.
