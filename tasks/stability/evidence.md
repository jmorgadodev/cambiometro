# Evidencia de avance y cierre

Este registro es interno; no se copia a textos públicos. Una puerta se marca
en `todo.md` sólo con una entrada aquí. Registrar `pendiente` cuando un campo
no aplique; nunca inventar un checksum o un porcentaje de cobertura.

## Plantilla para cada puerta nueva

```text
Fecha (America/Santiago):
Tarea y puerta:
Resultado / clasificación:
Base Git, rama y commit / PR:
Release R2, manifest, checksum, período y conteo (si aplica):
Pruebas / CI / preview:
URL y comprobación productiva (si aplica):
Rollback identificado:
R2 PUT/DELETE y D1 remoto ejecutados:
Riesgo o siguiente puerta:
```

## O01 — puertas 1–4 · 2026-10-01 · cerrado

- Base: repositorio `cambiometro-public`, `origin/main` en `da4c5304`;
  checkout principal divergente preservado. Rama documental
  `codex/stabilizacion-registro-20261001` en
  `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.
- Se revisaron `tasks/plan.md`, `tasks/todo.md`,
  `docs/ESTABILIZACION-OPERATIVA-2026-10-01.md` y el calendario de ETL.
  Los documentos antiguos no se borran; este directorio es el tablero nuevo.
- Fusión: [PR #667](https://github.com/jmorgadodev/cambiometro/pull/667),
  commit `35c2f3d6c430794b4a2fc936ce7c5351b49e60d9`. Lint, tipos,
  pruebas, seguridad y build/smoke CI `36814344681` verdes. Los enlaces
  relativos del tablero se comprobaron localmente tras la fusión.
- Porcentaje: 4 de 4 puertas = 100 %. Próxima tarea abierta: O05.
- Datos: ninguna escritura R2/D1; sin porcentajes de cobertura nuevos.

## O02 — puertas 1–4 · 2026-10-01 · cerrado

- Incidente: `pages-ui-refresh.yml` ponía un JSON versionado encima del
  movimiento hidratado de R2; `etl-movimientos.yml` permitía fallback a Git.
- Cambio: [PR #666](https://github.com/jmorgadodev/cambiometro/pull/666),
  commit fusionado `da4c5304b7fab1a1a007e745c2e9b21fb6637e63`.
- Pruebas: 24 unitarias locales; typecheck, arquitectura y YAML; CI de lint,
  unitarias, seguridad y build verificada. Run de build `36812188152` verde.
- Producción: promoción `36813102481` verde, deployment Pages
  `0712bb24-539b-4237-bcd3-d19ca9053631`. Consulta del archivo público:
  46 filas de movimientos, 5 señales en confirmación, 51 eventos publicados,
  `last_event_date=2026-09-30`, tres señales del 30-09 presentes. El
  manifiesto Pages declara 46 filas de movimientos y la misma fecha.
- Rollback: el deployment anterior de Pages debe identificarse desde la lista
  de Cloudflare antes de ejecutar una reversión; el ID del deployment nuevo
  quedó registrado. No se modificó R2/D1 en esta promoción.
- Límite: esto evita el retroceso conocido; no acredita aún un `ReleaseSet`
  completo ni siete días de estabilidad.
