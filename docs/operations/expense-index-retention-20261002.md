# Conservación del índice histórico de gastos — 2026-10-02

Rama: `codex/expense-period-index-retention-20261002`; worktree canónico `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`.

## Incidente y causa

El replay incremental 37044606324 conservó los archivos históricos en el manifiesto estático, pero regeneró el índice mensual sólo desde el snapshot refrescado: cuatro meses Cámara y dos meses Senado. El manifiesto seguía referenciando 174 archivos mensuales Senado. La API sigue el índice y por ello meses históricos devolvían cero aunque sus archivos existieran. No se perdieron los objetos históricos.

El publicador ahora combina los períodos del candidato con los archivos mensuales del manifiesto R2 validado. El candidato actualiza su mes; los meses fuera de la ventana mantienen sus referencias y conteos. El ETL conserva también las filas históricas de la línea base R2 ya hidratada al reconciliar, para que el subset completo usado por las fichas incluya futuras revisiones y meses nuevos. No reconstruye ese histórico desde un snapshot Git parcial.

La reparación inmediata sólo sube un índice completo nuevo, con clave derivada de su SHA-256, y conserva el puntero mediante CAS; no descarga ni copia las filas históricas. El ciclo mensual reutiliza el subset canónico que ya descargaba su workflow.

## Reparación acotada

`node scripts/repair-expense-period-index.mjs` lee y verifica el manifiesto y su índice, reconstruye referencias y calcula el presupuesto sin escribir. Añadir `--publish` activa el índice reparado con el ETag vigente después del preflight. Un conflicto detiene la activación y requiere repetir desde la base actual. El índice anterior queda disponible para rollback.

Preflight comprobado: Senado 2 → 174 períodos, Cámara permanece en 4; 19.660 bytes de índice nuevo. Cuenta 8.446.722.782 → 8.446.742.444 bytes, bajo 9.500.000.000. No se consulta D1 ni se genera un respaldo.

Veinticinco pruebas dirigidas, TypeScript, ESLint y scanner de activos privados aprobados. La regresión reproduce un candidato de un mes junto a un mes histórico publicado y comprueba conservación, actualización y separación de fuentes.

Falta publicar tras CI/fusión y repetir consultas espaciadas a períodos antiguos/recientes. La primera comprobación de 178 períodos detectó este incidente y también respuestas HTML transitorias al final; no se presenta como validación aprobada. Evidencia local: `C:\Users\jorge\Proyectos\cambiometro-audit\evidence\expense-month-smoke-20261002.json`.
