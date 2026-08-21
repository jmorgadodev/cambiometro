# Monitoreo — 2026-08-20

> **Objetivo**: Visibilidad operativa del servicio `https://cambiometro.impulsacv.cl`
> y resúmenes periódicos para el equipo.

## 1. UptimeRobot (monitor 5 min)

1. **Crear monitor**:
   - Tipo: HTTP(s) → `https://cambiometro.impulsacv.cl`
   - Nombre: `cambiometro‑main`
   - Subecheck: cada 5 minutos
   - Asserts: status code 200, contiene "transparencia" en el body (opcional).
   - Notifications: activadas para email del equipo y/o Slack.

2. **Monitoreo adicional** (opcional):
   - Monitorear `https://transparencia.impulsacv.cl` (worker antiguo, **prohibido** — no monitorear).
   - Monitorear puntos finales críticos: `/privacidad`, `/fuentes`, `/health`.

3. **Alertas**:
   - Si falla el check consecutivo 2 veces → email al equipo de operaciones.
   - Si el response time > 2s → warning en Slack (opcional).

## 2. Resumen semanal Cloudflare (a correo)

Ejecutar manualmente cada lunes (o via cron personal):

1. **Obtener métricas clave** desde el dashboard Cloudflare (o API con `CLOUDFLARE_DATA_API_TOKEN`):
   - `requests_total` (requests totales en la semana).
   - `bandwidth_total` (transferencia de datos).
   - `threats_blocked` (amenazas bloqueadas por WAF/Turnstile).
   - `error_5xx` (errores del servidor).
   - `top_countries` (países con más tráfico).

2. **Formato de resumen** (ejemplo de texto para email):

```
Asunto: Resumen semanal — cambiometro (2026-08-13 a 2026-08-20)

- Traffic: 12.473 peticiones totales (+12% vs semana anterior)
- Banda: 8.2 GB transferidos
- Errores 5xx: 3 (0.024% — dentro del umbral)
- Amenazas bloqueadas (Turnstile/WAF): 17
- Top países: México (42%), Colombia (31%), Argentina (15%), España (8%)
- Monitor UptimeRobot: 100% de checks verdes (7/7 días)

Notables:
- Pico de tráfico el jueves 18/08 por publicación de nueva fuente de datos.
- Sin incidentes de seguridad reportados.
```

3. **Guardar el resumen**: archivar el texto en `docs/monitoreo-semanal/` o pegarlo en un canal de Slack/Teams designado.

## 3. Métricas adicionales de interés

| Métrica | Umbral de alerta | Fuente |
|---------|-----------------|--------|
| `error_5xx` | > 5% del tráfico total | Dashboard Cloudflare |
| `bandwidth_total` | > 15 GB/semana | Dashboard Cloudflare |
| `throttle_429` (rate limiter) | > 100 req/60s en ráfaga | Dashboard Cloudflare (ns 47011) |
| `turnstile_failed` | > 5% de los forms | Logs del worker |

## 4. Próximo paso

Programar el primer resumen semanal para el lunes posterior a esta fecha y
incluirlo en la rotación de informes del equipo.