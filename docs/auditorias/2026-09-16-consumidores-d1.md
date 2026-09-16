# Auditoría de consumidores D1 — 2026-09-16

## Resultado

La búsqueda pública de funcionarios y remuneraciones usa los índices y páginas de R2. El Worker conserva el binding `DB` para rutas operativas y compatibilidad, pero los caminos R2 se prueban explícitamente cuando D1 está agotada o no debe consultarse.

La base `transparencia-db` aparece fuera del Worker en estos contextos:

- workflows ETL de Cámara, ChileCompra, Contraloría, DIPRES, Servel, SINIM, InfoProbidad, InfoLobby y gastos del Senado;
- el registro acotado de estado CPLT;
- el backup semanal, sólo como export opcional;
- fixtures D1 locales de integración y restauración.

## Guardia efectiva

Los workflows ETL llaman a `d1-materialize-optional.mjs`. Ese wrapper sólo ejecuta materialización si se cumplen simultáneamente:

```text
D1_ALLOW_REMOTE_MATERIALIZATION=true
D1_MATERIALIZATION_CONFIRMATION=CAMBIOMETRO_D1_RETAINED
```

Si falta cualquiera de las dos variables, la ejecución termina correctamente sin materializar y conserva R2/Pages como publicación canónica. Los workflows además exigen ejecución manual y un preflight bajo el umbral configurado.

El backup semanal opera con `BACKUP_D1=0` salvo que se entregue la confirmación exacta `CAMBIOMETRO_D1_BACKUP`. Por tanto, el backup R2 normal no hace un export completo de D1.

El workflow de transferencia utiliza la base dedicada `cambiometro-transferencias`, no `transparencia-db`; los fixtures de build usan D1 local aislada.

## Conclusión operativa

- No se encontró un camino programado que materialice automáticamente `transparencia-db` sin confirmación.
- Las lecturas masivas públicas no dependen de D1; el fallback de D1 queda para rutas acotadas o contingencias explícitas.
- La protección actual evita que un fallo de D1 borre o sustituya el release R2.
- Si se desea materializar D1, debe ser una operación manual separada, con cuota verificada y registro del resultado.

## Evidencia revisada

- `.github/workflows/etl-daily.yml`
- `.github/workflows/etl-cplt.yml`
- `.github/workflows/etl-*.yml`
- `.github/workflows/backup-weekly.yml`
- `transparencia-app/scripts/d1-materialize-optional.mjs`
- `transparencia-app/scripts/d1-materialization-policy.mjs`
- `transparencia-app/scripts/backup-weekly.mjs`
- `transparencia-app/workers/public-api/index.ts`
