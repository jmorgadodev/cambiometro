# Protocolo de incidentes — 2026-08-20

> **Objetivo**: Detectar, atender y cerrar incidentes en un plazo máximo de 72 horas.
> Este documento cubre incidentes del servicio `https://cambiometro.impulsacv.cl`.

## 1. Fases del incidente

### 1.1 Detección
- **Fuentes**: Alertas UptimeRobot, reports de errores desde Sentry/Logs, reports de usuarios,
  monitoreo de rate limiter (429/503), revisión de logs del worker.
- **Primeros pasos**:
  1. Confirmar el síntoma (qué ruta falla, qué error se muestra).
  2. Verificar si es un issue conocido (revisar `docs/CONTEXT.md` o incidentes previos).
  3. Evaluar el alcance: ¿afecta a una ruta, a todo el sitio, o solo a algunos usuarios?

### 1.2 Atención (Triage)
- **Dueño del incidente**: Designar un responsable (puede ser el autor del PR o un on-call).
- **Comunicación**: Abrir un issue en GitHub o un ticket en el sistema de tracking, etiquetar
  como `incidente` y asignar al dueño.
- **Evaluación de impacto**:
  - *P0*: Servicio completamente fuera de línea.
  - *P1*: Ruta crítica fuera de línea (ej. `/privacidad`).
  - *P2*: Funcionalidad degradada pero servicio en línea.
  - *P3*: Problema menor, workaround disponible.

### 1.3 Postmortem (máximo 72 horas)
Una vez resuelto el incidente, completar un reporte estructurado:

**Incidente: <título corto>**
- **Fecha/Hora de inicio**: <ISO 8601>
- **Fecha/Hora de resolución**: <ISO 8601>
- **Duración total**: <hh:mm>
- **Ruta(s) afectada(s)**: <ej. /privacidad, /fuentes>
- **Síntoma**: <descripción del error o comportamiento anómalo>
- **Causa raíz**: <por qué sucedió, no solo cómo se arregló>
- **Solución aplicada**: <código, config change, rollback, etc.>
- **Prevención**: <qué se hará para que no se repita>
- **Checklist de cierre**:
  - [ ] El fix ha sido probado en entorno staging.
  - [ ] Los workflows de CI pasan (Quality, Build/E2E, Security).
  - [ ] Se ha actualizado `docs/CONTEXT.md` con la lección aprendida.
  - [ ] El issue/GitHub Ticket está cerrado con la etiqueta `incidente-resuelto`.

## 2. Ejemplo de postmortem (plantilla)

```
Incidente: Rate limiter edge bloqueó verificaciones en producción

Fecha/Hora inicio: 2026-08-19T14:30:00Z
Fecha/Hora resolución: 2026-08-20T10:15:00Z
Duración: 19h 45m

Ruta afectada: /privacidad, /fuentes (solo verificaciones de integración)

Síntoma: Las llamadas API contra el worker de producción respondían 503
(código de rate limiter edge ns 47011, límite 30 req/60s). Las verificaciones
automáticas (verify-integration.mjs, verify-m2-prod.mjs) fallaban al obtener
200.

Causa raíz:
- El rate limiter edge de producción (namespace 47011) estaba configurado con
  límite de 30 solicitudes por 60 segundos, el cual se activó durante pruebas
  de integración intensivas. El rate limiter no tenía "burst allowance", por lo
  que cualquier ráfaga de tráfico superaba el límite y bloqueaba por 60s.
- Adicionalmente, el script de verificación enviaba requests sin backoff
  exponencial, acumulando bloqueos sucesivos.

Solución aplicada:
1. Se documentó en `docs/CONTEXT.md` la regla "NO tocar rate limiter edge de prod
   (ns 47011, 30 req/60s) — feature de seguridad de M1; debilitarlo abre ventana
   de abuso".
2. Se añadió `throttleProd()` con backoff exponencial en `verify-integration.mjs`
   (límite 25 req/min, base 5s, cap 60s).
3. Se estableció que las verificaciones completas contra prod se gateen en CI/staging,
   no contra el rate limiter de producción en vivo.
4. Se creó `docs/monitoreo.md` con pasos para resúmenes semanales.

Prevención:
- Los scripts de verificación usarán staging/production-gate con backoff, nunca
  contra el edge limiter de prod sin causa justificada.
- Se añadirá un circuito de protección en el worker mismo (rate limit con
  exención para rutas internas).
- Documentar en `docs/incidentes.md` cualquier incidente futuro.
```

## 3. Lista de verificación de cierre

- [ ] El incidente tiene dueño asignado y está registrado en GitHub Issues.
- [ ] Se completó el postmortem con todas las secciones llenas.
- [ ] El postmortem fue revisado por al menos otro ingeniero.
- [ ] Se actualizó `docs/CONTEXT.md` con la lección aprendida.
- [ ] Se actualizó `docs/incidentes.md` si fue necesario añadir nuevos patrones.
- [ ] Se comunicó el cierre al equipo (Slack/email).
- [ ] El issue se etiqueta como `incidente-resuelto` y se cierra.

## 3. Contactos de emergencia

- Ingeniero on-call: <nombre>
- Líder de ingeniería: <nombre>
- Soporte Cloudflare (si involucra configuración de edge): <canal>