# Lista de trabajo inmediata

## Ahora, sin D1

- [x] A. Congelar línea base y rollback por fuente.
- [x] B. Corregir el contrato R2 de Movimientos en la rama local.
- [x] C. Reconciliar Cámara y Senado por componente y período; diferencia local/R2 documentada.
- [x] **Checkpoint 1 local:** 957 tests, typecheck, lint, build Pages y browser smoke verdes.
- [x] **Checkpoint 1 remoto:** preview del Worker y API de Movimientos validados desde R2, sin lecturas públicas D1.
- [ ] Promoción controlada del Worker candidato, pendiente de autorización explícita.
- [ ] D1. Revisar ChileCompra, InfoLobby, DIPRES y Transparencia Activa uno por uno.
- [ ] E. Ejecutar auditoría de consistencia y calidad.
- [ ] **Checkpoint 2:** validar checksums, paginación y ausencia de lecturas D1.
- [ ] F. Preparar promoción controlada.

## Mañana, después del reinicio

- [ ] Medir cuota D1 post-reset.
- [ ] Confirmar que no existen lecturas masivas nuevas.
- [ ] Verificar compuertas de materialización programada.
- [ ] Ejecutar sólo un preflight acotado si la cuota está limpia.

## Fuera de alcance

- [ ] No tocar `cambiometro-editorial`.
- [ ] No cambiar nombres ni estructura del menú.
- [ ] No limpiar ni resetear cambios sucios existentes.
- [ ] No publicar código sin preview y checkpoint.
