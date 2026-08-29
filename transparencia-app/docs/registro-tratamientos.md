# Registro de Tratamientos de Datos Personales

Registro de los tratamientos de datos personales efectuados por El Cambiómetro, conforme a la Ley 21.715 (Protección de Datos Personales). El responsable es ImpulsaCV.

## Tratamientos activos

| # | Tratamiento | Datos | Finalidad | Base de legitimación | Conservación | Operativo |
|---|-------------|-------|----------|----------------------|--------------|-----------|
| T1 | Navegación y estadísticas (GA4) | Páginas visitadas, duración, origen, anónimos | Mejorar la plataforma | Consentimiento (art. 5 letra a) | Mientras dure el consentimiento | Solo post-consentimiento (banner de cookies) |
| T2 | Canal de solicitudes Ley 21.715 | Nombre (opcional), email, tipo, descripción | Tramitar derechos ARCO y consultas | Obligación legal (art. 8 y ss.) | 3 años en `data_requests` | Sí — formulario en /privacidad |
| T3 | Registro de seguridad | IP con hash irreversible, ruta, evento | Detectar y bloquear abusos/fraude | Interés legítimo (art. 5 letra c) | 12 meses `security_events`; 7 días `request_rate_events` | Sí — middleware y rate limit |

## Tratamientos declarados pero no operativos

### T4 — Newsletter

- **Estado:** No operativa en v1.0.0. El motor de diff, el formulario de suscripción y el envío de resúmenes se construirán en **FASE 4**.
- No se recopilan ni almacenan correos de newsletter en esta versión.
- La tasa de 3 solicitudes por hora (`3/h`) queda **reservada para el canal de newsletter** en FASE 4; el canal Ley 21.715 usa su propia ventana (10 solicitudes / 6 h).

## Decisiones de tratamiento

### Medición GA4/GTM solo post-consentimiento

- El banner de cookies tiene como valor por defecto **rechazado**: sin consentimiento no se carga ningún script de medición.
- La integración directa `gtag.js` se inyecta en el cliente únicamente si existe `NEXT_PUBLIC_GA4_ID` configurado Y el usuario aceptó. Opcionalmente, `NEXT_PUBLIC_GTM_ID` habilita un contenedor GTM que debe contener la etiqueta GA4; si ambos existen, GTM tiene precedencia para evitar duplicaciones.
- La aplicación es la única integración canónica: cualquier inyección duplicada desde Cloudflare Web Analytics, Zaraz o Google Tag Gateway debe permanecer desactivada. Los `page_view` incluyen `page_path`, `page_location` y `page_title`, también al navegar entre rutas sin recargar.
- Consent Mode v2 mantiene `analytics_storage`, `ad_storage`, `ad_user_data` y `ad_personalization` en `denied` hasta la aceptación. La configuración GA4 conserva `anonymize_ip: true` y desactiva el page view automático para evitar duplicados.
- La inyección se realiza con `document.createElement` (nunca `innerHTML`), cumpliendo el guard `check-no-innerhtml`.

### Anonimización

- Las direcciones IP del canal y del registro de seguridad se guardan como hash irreversible (`sha256` sobre `req:<ip>`), nunca en claro.
- El RUT de personas naturales no se recopila, publica ni expone en API o búsqueda (ver `matriz-rut.md` y `lib/rut-exposure.test.ts`).

## Plazos de respuesta

- Las solicitudes del canal se responden dentro de **10 días hábiles**, prorrogables por otros **10 días hábiles** cuando el tratamiento lo justifique, conforme a la Ley 21.715.
- Canal de contacto: datos@cambiometro.impulsacv.cl

## Tablas y retención (D1)

| Tabla | Contenido | Retención |
|-------|-----------|-----------|
| `data_requests` | Solicitudes del canal Ley 21.715 | 3 años |
| `security_events` | Eventos de seguridad y bloqueos | 12 meses |
| `request_rate_events` | Contadores de rate limit | 7 días |
