# Lista de trabajo inmediata

## Ruta vigente después de cerrar la prioridad 1

- [x] N0: compartir la normalización de nombres, remuneraciones líquidas e
      incidencias entre los ingestores central y municipal.
- [x] N0: agregar pruebas del contrato común sin descargar datos masivos.
- [x] N1: agregar auditor reproducible de conteos, alcance y frescura por
      fuente usando metadatos, sin D1.
- [x] N1: ejecutar la matriz contra manifiestos productivos R2 y muestras
      acotadas antes de modificar cualquier proyección. Evidencia:
      `docs/auditoria-normalizacion-productiva-2026-09-14.md`.
- [x] N1: medir en muestras acotadas campos ausentes, formatos, anomalías y
      duplicados aparentes por fuente; los valores originales no se guardan.
      Evidencia: `scripts/audit-normalization-production.mjs` y la actualización
      de calidad del informe productivo.
- [~] N2: contrato normalizado por dominio Cámara/Senado/Movimientos y guardia
      de releases implementados; el resumen queda registrado en los reportes
      del ETL sin duplicar el release crudo. La compuerta también quedó
      conectada a las cuatro categorías del stream CPLT antes de reemplazar
      proyecciones; queda pendiente la promoción tras reconciliar particiones.
- [~] N3: historial acotado de remuneraciones construido desde índices R2,
      protegido contra consultas amplias y conectado a la ficha de persona
      bajo demanda; falta validarlo con organismos y smoke productivo.
- [~] N4: guardia de crecimiento R2 y conservación de la versión de rollback
      activos; queda pendiente registrar tamaño comprimido proyectado por cada
      nuevo release.
- [~] N5: compuerta de promoción por fuente y rollback lógico implementados
      para ETL general, Movimientos y stream CPLT; queda ejecutar los smoke
      productivos por bloque antes de publicar.

### Decisión de almacenamiento

- [x] Mantener R2 como almacenamiento público principal.
- [x] Mantener D1 fuera de búsquedas y lecturas masivas.
- [x] No migrar remuneraciones a Firebase/Firestore ni Supabase Free: sus
      cuotas gratuitas no son adecuadas para este universo.
- [ ] Medir tamaño comprimido y margen R2 antes de cada nuevo release.

## Ahora, sin D1

- [x] A. Congelar línea base y rollback por fuente.
- [x] B. Corregir el contrato R2 de Movimientos en la rama local.
- [x] C. Reconciliar Cámara y Senado por componente y período; diferencia local/R2 documentada.
- [x] **Checkpoint 1 local:** 957 tests, typecheck, lint, build Pages y browser smoke verdes.
- [x] **Checkpoint 1 remoto:** preview del Worker y API de Movimientos validados desde R2, sin lecturas públicas D1.
- [x] Promoción controlada del Worker candidato y smoke productivo completados.
- [x] D1. Auditar ChileCompra, InfoLobby, DIPRES y Transparencia Activa en el candidato, sólo por R2.
- [x] Reconciliar las 92 filas de InfoLobby mediante índice R2 acumulado versionado, sin D1.
- [x] Separar corte vigente/histórico de ChileCompra; mantener el snapshot válido mientras el origen responda HTTP 403.
- [x] E. Ejecutar auditoría de consistencia y calidad en producción/R2/candidato.
- [x] **Checkpoint 2:** checksums, paginación y ausencia de lecturas públicas D1 validados.
- [x] F. Promoción controlada del Worker y verificación productiva completadas.
- [x] Integrar PR #493 sobre `main`; candidato Worker validado con R2-first y sin D1 público.
- [x] Promover explícitamente el candidato `8fffd277-d5b5-4330-bdd8-7abc04c18f3a` para corregir el 1102 productivo de ChileCompra.
- [x] Reconciliar catálogo R2 contra filas consultables por fuente sin usar D1.
- [x] Separar en la UI catálogo declarado, publicados y consultables; comenzar por ChileCompra; corregir metadata R2 de InfoLobby.
- [x] Preflight de fuentes sin escritura: Cámara, Senado y los cinco orígenes de Movimientos respondieron correctamente el 2026-09-12.
- [x] Reparar/publicar sólo la variante R2 `votaciones_camara`; PR #495 fusionado y Worker `d2f82268-b1af-4481-a67b-d1f8953f0fc6` promovido. Alias validado en producción desde R2, sin D1.
- [x] Reconstruir las 7 particiones históricas faltantes de Cámara en R2; manifiestos y registros verificados por checksum, alias y fuente canónica completos en producción.
- [x] Verificar las 2 particiones históricas de Senado en R2 (2025-08: 121; 2026-02: 7) contra sus manifiestos y registros publicados, sin reconstruir ni duplicar artefactos.

## Cuando Analytics confirme el siguiente reset de D1

- [ ] Medir cuota D1 post-reset (la sonda del 2026-09-12 ya reportó 13.758.232 lecturas; sigue crítica).
- [ ] Identificar el consumidor de `transparencia-db` fuera del Worker público; la métrica actual sólo separa por base, no por proyecto.
- [ ] Confirmar que no existen lecturas masivas nuevas.
- [ ] Verificar compuertas de materialización programada.
- [ ] Ejecutar sólo un preflight acotado si la cuota está limpia.

## Trabajo habilitado antes del reinicio D1

- [x] Validar conectividad y fechas máximas de Cámara/Senado sin ejecutar ETL.
- [x] Validar conectividad de las fuentes de Movimientos sin reemplazar el snapshot.
- [x] Revisar manifiesto R2 y preview de `votaciones_camara` sin usar D1.
- [x] Auditar paginación R2 con tamaños pequeños y registrar respuestas 1102
  intermitentes sin desplegar un parche.
- [x] Preparar y validar en preview el hardening de paginación R2 (PR #497),
  con pruebas `limit=1/10/25/50` y cursor en InfoLobby, ChileCompra y DIPRES;
- [x] Promover PR #497 al 100% y verificar health, páginas 1–2 y límites 1/10/25/50
  en producción; queda pendiente sólo el verificador productivo largo iniciado.
- [x] Ejecutar el verificador de calendario ETL (`34717871931`) sin tocar D1.
- [x] Inventariar las carpetas maestras locales; sólo existen `public`, `audit`
  y `editorial` (20,46 GiB combinados), sin eliminar contenido.
- [x] Reconciliar el alcance de Senado 2025-08 y 2026-02 contra los
  manifiestos y registros publicados en R2, sin rehidratar D1.
- [x] Revisar el corte vigente/histórico de ChileCompra y la publicación de
  InfoLobby sólo desde producción/R2; no rehidratar D1.

### Evidencia de cierre — 2026-09-13

- Senado 2025-08: 121 registros; manifiesto y archivo de registros verificados
  por checksum, sin cambios adicionales.
- Senado 2026-02: 7 registros; manifiesto y archivo de registros verificados
  por checksum, sin cambios adicionales.
- ChileCompra: 74.142 registros corresponden al corte público actual; 888.693
  es la referencia histórica declarada y permanece separada como cobertura no
  disponible completa para recorrido. La guardia del proceso aborta antes de
  escribir si el origen devuelve HTTP 403, vacío o un resultado inválido.
- Interfaz: los detalles técnicos de infraestructura no se muestran en la
  experiencia pública; quedan sólo en pruebas, auditoría y configuración.

## Fuera de alcance

- [ ] No tocar `cambiometro-editorial`.
- [ ] No cambiar nombres ni estructura del menú.
- [ ] No limpiar ni resetear cambios sucios existentes.
- [ ] No publicar código sin preview y checkpoint.
