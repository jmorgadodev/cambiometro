# Promoción Pages coherente — cierre estático O09

Worktree: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`; rama documental `codex/stability-expense-pages-closure-20261002`, basada en `origin/main`. Nunca desplegar desde `cambiometro-audit` ni desde el checkout divergente.

## Flujo vigente

- `pages-ui-refresh.yml`: UI-only; hidrata el manifiesto productivo R2 y fija su ReleaseSet, sin sustituirlo por snapshots Git.
- `pages-static-refresh.yml`: data-refresh tras ETL válido; compara R2 y Pages antes de compilar. Release idéntico omite build y despliegue; una lectura o checksum inválidos no autoriza publicar.
- La promoción publica sólo el artefacto construido y verificado en ese flujo; exige pin todavía vigente, smoke y registro de deployment/rollback. Un data-refresh manual necesita las confirmaciones existentes, no salta las guardas.
- Cola global `cambiometro-static-publication`, sin cancelar el activo. El último paso R2 del publicador usa `If-Match` (PR #691). No describe como protegido por este pin un manifiesto externo: ese alcance sigue pendiente en O08.

## Evidencia real

PR #692 integrado en `ead314ed729ff4f5c10b09bcdd006f19469d904c`: ocho pruebas de decisión/contrato, tipos/lint/scanner y CI verde. Run 37050531642 comparó R2 con Pages y registró «Pages ya contiene el release R2; sin compilación ni despliegue»: decisión exitosa, build omitido.

Run 37048540901 rechazó `RELEASE_SET_PIN_MISMATCH` porque el índice R2 avanzó mientras se construía el artefacto anterior. No publicó ese artefacto. La nueva ejecución 37050448199 terminó success y publicó `https://a4a5369c.cambiometro.pages.dev` con pin `92d5a447548effb98c334836c2392b419ff29961432ab7209d995b654090897e` y manifiesto `55e5cd98b0270f398ecf59f344fe567c0692c9b38637413c0709b54b159a666a`.

La comparación posterior en producción devuelve `refresh=false`. Once páginas HTTP 200; API de búsquedas Kaiser/Torrealba responde `r2-catalog`; 178 períodos de gastos coinciden por conteo con R2. Tipos, build, pruebas y E2E del artefacto pasaron en el workflow. El deployment previo `https://06d20226.cambiometro.pages.dev` queda como referencia de rollback de UI; su pin anterior no debe promoverse como datos vigentes sin restauración explícita validada.

O09 se cierra para el conjunto estático comprobado. No cierra O08 externo, costes automáticos, conectores bloqueados ni la observación real de siete días.
