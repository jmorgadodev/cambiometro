# asistencia: contrato de siguiente entrega

Actas y justificaciones con denominador por cámara/fecha; voto emitido no es asistencia formal y ausente no es cero.

Base local: explorador descrito en ../modulos-2026-evidence.md. Fuentes y fechas reales desde 2026; recuperar datos publicados y validar candidato antes de cambiar consumidor.

- [x] Acceso y navegación de módulo, con datos disponibles o avance/limitaciones visibles.
- [ ] Registrar fuentes, contrato de origen, corte, claves e identidades para el incremento de datos.
- [ ] Validar períodos, duplicados, ausencia de información y referencias documentales.
- [ ] Implementar extractor/normalizador específico y sus pruebas, antes del consumidor.
- [ ] Integrar consumidor y validar desktop/móvil con el mismo release.
- [ ] Publicar sólo en entrega agrupada autorizada.

Responsabilidad propia: nuevos archivos de datos/normalizador bajo scripts/etl/asistencia-*.mjs, lib/asistencia-*.ts y componente específico components/votaciones/asistencia/. Archivo compartido VotingWorkspace.tsx, modelo común y navegación requieren integración coordinada; ningún agente modifica el contenedor o activa cron de forma incidental. Estado local no equivale a cierre operativo.
