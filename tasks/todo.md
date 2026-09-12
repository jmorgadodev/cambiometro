# Lista de trabajo inmediata

## Ahora, sin D1

- [x] A. Congelar línea base y rollback por fuente.
- [x] B. Corregir el contrato R2 de Movimientos en la rama local.
- [x] C. Reconciliar Cámara y Senado por componente y período; diferencia local/R2 documentada.
- [x] **Checkpoint 1 local:** 957 tests, typecheck, lint, build Pages y browser smoke verdes.
- [x] **Checkpoint 1 remoto:** preview del Worker y API de Movimientos validados desde R2, sin lecturas públicas D1.
- [x] Promoción controlada del Worker candidato y smoke productivo completados.
- [x] D1. Auditar ChileCompra, InfoLobby, DIPRES y Transparencia Activa en el candidato, sólo por R2.
- [x] Reconciliar las 92 filas de InfoLobby mediante índice R2 acumulado versionado, sin D1.
- [ ] Separar corte vigente/histórico de ChileCompra; mantener el snapshot válido mientras el origen responda HTTP 403.
- [x] E. Ejecutar auditoría de consistencia y calidad en producción/R2/candidato.
- [x] **Checkpoint 2:** checksums, paginación y ausencia de lecturas públicas D1 validados.
- [x] F. Promoción controlada del Worker y verificación productiva completadas.
- [x] Integrar PR #493 sobre `main`; candidato Worker validado con R2-first y sin D1 público.
- [x] Promover explícitamente el candidato `8fffd277-d5b5-4330-bdd8-7abc04c18f3a` para corregir el 1102 productivo de ChileCompra.
- [x] Reconciliar catálogo R2 contra filas consultables por fuente sin usar D1.
- [x] Separar en la UI catálogo declarado, publicados y consultables; comenzar por ChileCompra; corregir metadata R2 de InfoLobby.
- [x] Preflight de fuentes sin escritura: Cámara, Senado y los cinco orígenes de Movimientos respondieron correctamente el 2026-09-12.
- [x] Reparar/publicar sólo la variante R2 `votaciones_camara`; PR #495 fusionado y Worker `d2f82268-b1af-4481-a67b-d1f8953f0fc6` promovido. Alias validado en producción desde R2, sin D1.
- [ ] Reconstruir las 7 particiones históricas faltantes de Cámara en R2; el corte 2026-09-09 está completo, pero la consulta amplia 2026 sigue parcial y no debe presentarse como cobertura total.

## Mañana, después del reinicio

- [ ] Medir cuota D1 post-reset.
- [ ] Confirmar que no existen lecturas masivas nuevas.
- [ ] Verificar compuertas de materialización programada.
- [ ] Ejecutar sólo un preflight acotado si la cuota está limpia.

## Trabajo habilitado antes del reinicio D1

- [x] Validar conectividad y fechas máximas de Cámara/Senado sin ejecutar ETL.
- [x] Validar conectividad de las fuentes de Movimientos sin reemplazar el snapshot.
- [x] Revisar manifiesto R2 y preview de `votaciones_camara` sin usar D1.

## Fuera de alcance

- [ ] No tocar `cambiometro-editorial`.
- [ ] No cambiar nombres ni estructura del menú.
- [ ] No limpiar ni resetear cambios sucios existentes.
- [ ] No publicar código sin preview y checkpoint.
