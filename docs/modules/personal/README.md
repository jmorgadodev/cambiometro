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

## Entrega local de estabilización — 18-11-2026

Consultar [plan y aceptación](../../../tasks/personal/plan.md) y [evidencia](../../../tasks/personal/evidence.md). El preparador offline no usa autenticación, Git, red, worktrees ni publicadores:

```powershell
node scripts/prepare-personal-apoyo-candidate.mjs --help
node scripts/prepare-personal-apoyo-candidate.mjs --manifest <manifest.json> --baseline <snapshot-verificado.json> --candidate <candidato.json> --source senado-support --output artifacts/personal-candidates/<revision-nueva>
```

Acepta manifiesto de personal-apoyo-v1 o manifiesto estático publicado y verifica los bytes del baseline. Fuentes: camara-support, camara-advisories y senado-support. Salida 0: preparado/unchanged; 2: revisión requerida; 1: entrada inválida. Nunca sobrescribe un directorio existente. Un candidato preparado no acredita extracción oficial ni autorización para publicar. No usar el runtime programado sólo para inspeccionar datos: puede autenticar, crear un checkout y encadenar publicación.

Los candidatos que pierden autoridad, mes o contrato —incluida multiplicidad de duplicados— se retienen antes del publicador. Las correcciones de importes publicados se revisan explícitamente; null no se transforma en cero. El informe local separa apoyo Cámara, asesorías Cámara y apoyo Senado y señala cambios ajenos al alcance. No cambiar estos guardas por un descenso de umbrales globales.

## Asociación financiera compartida — 22-11-2026

Senado utiliza `lib/senate-financial-identity.ts`: identificadores oficiales y equivalencias abreviadas acreditadas, nunca similitud por dos palabras. La variante `VODANOVIC PAULINA` corresponde a `sen-030`/1450 y conserva los registros originales en ficha, Partidos, dashboard y CSV. Las consultas históricas fuera del catálogo actual requieren nombre completo exacto. Una ambigüedad no se convierte en asociación ni en importe cero. [Conciliación y cobertura](../../../tasks/dashboard/entrega-identidad-normativa-20261122.md). `NormativeInfo` reutiliza el catálogo normativo central para personal y asesorías, con vigencia del período consultado.
