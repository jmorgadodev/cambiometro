# Personal y asesorías

## Contrato y responsabilidad

Las tareas Cámara estaban deshabilitadas y apuntaban a worktrees antiguos. Separar personal de asesorías, preservar filas oficiales y contratos. La página auxiliar de política Senado puede bloquearse; conservar la política previamente verificada con fecha y estado.

## Origen, ejecución y artefactos

Ejecutores: etl-personal-apoyo-senado.yml; tareas Windows etl-personal-apoyo-camara-runtime.mjs y --external-advisories.

Artefactos: data/personal-apoyo.json; projections/personal-apoyo-v1/manifest.json en R2.

El calendario remoto canónico es .github/etl-calendar.json. Las rutas locales son relativas a cambiometro-public/transparencia-app; no instalar tareas desde worktrees. Verificar el corte del manifiesto publicado antes de usar copias locales.

## Verificación y recuperación

Desde transparencia-app: node scripts/etl-personal-apoyo-camara-runtime.mjs --prepare-only; node scripts/verify-personal-apoyo-release.mjs --help (consultar argumentos antes de ejecutar).

Si el origen falla o se reduce la cobertura sin justificación, detener la publicación y conservar el último release válido. Registrar fallo, período, checksum y próxima acción en tasks/personal/evidence.md. No reactivar módulos secundarios como dependencia incidental. La recuperación de interfaz usa el artefacto previo; la de datos usa el release previamente validado.

## Archivos compartidos

Cualquier cambio de esquema, generador de slices, navegación global o release-set debe coordinarse con el integrador y sus consumidores. Consultar AGENTS.md antes de editar.
