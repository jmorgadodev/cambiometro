# Medición de navegación y Search Console

## Decisión operativa

Para el lanzamiento se recomienda activar primero la integración directa de GA4. Permite medir visitas, páginas vistas, rutas de navegación y tiempo de interacción con una sola variable pública de build, sin añadir la complejidad de un contenedor GTM. El soporte GTM queda disponible para una segunda fase.

La aplicación no envía medición antes del consentimiento. Después de aceptar, registra un `page_view` por la carga inicial y por cada cambio de ruta del navegador, con `page_path`, `page_location` y `page_title`.

## Variables de GitHub Actions

En el repositorio `jmorgadodev/cambiometro`, abrir `Settings → Secrets and variables → Actions → Variables` y crear:

| Variable | Valor | Uso |
|---|---|---|
| `NEXT_PUBLIC_GA4_ID` | `G-XXXXXXXXXX` | Medición directa recomendada |
| `NEXT_PUBLIC_GTM_ID` | `GTM-XXXXXXX` | Opcional; usar sólo si GA4 está configurado dentro de GTM |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | token de Search Console, opcional | Verificación HTML alternativa |

No se debe inventar ni compartir el valor del ID. El ID `G-...` se obtiene en GA4: `Administrar → Flujos de datos → Web → [sitio] → ID de medición`.

Para evitar doble medición, dejar `NEXT_PUBLIC_GTM_ID` vacío durante la primera activación. Si más adelante se usa GTM, crear dentro del contenedor una etiqueta Google/GA4 con el ID `G-...`, disparador de todas las páginas y configuración de consentimiento; después configurar sólo `NEXT_PUBLIC_GTM_ID`.

## Comprobación de visitas

1. En GA4, abrir `Administrar → Flujos de datos → Web` y confirmar que el dominio sea `cambiometro.impulsacv.cl`.
2. Aceptar las cookies en una ventana incógnito del sitio.
3. En GA4 abrir `Informes → Tiempo real`; debe aparecer el usuario y la ruta visitada en pocos minutos.
4. Navegar a `/politico`, `/municipalidades` y `/movimientos`; el parámetro `page_path` debe cambiar en cada navegación.
5. Rechazar cookies en otra ventana incógnito y comprobar en DevTools → Network que no se solicite `googletagmanager.com`, `google-analytics.com` ni `analytics.google.com`.

## Search Console y sitemap

1. Abrir [Google Search Console](https://search.google.com/search-console) y seleccionar una propiedad de dominio para `cambiometro.impulsacv.cl`.
2. Si la propiedad no existe, crearla como **Dominio** y añadir el registro TXT que entrega Google en el DNS de `impulsacv.cl`. Esta es la verificación recomendada y no depende del build.
3. Entrar en `Indexación → Sitemaps`.
4. Escribir sólo `sitemap.xml` y pulsar `Enviar`. La URL completa será `https://cambiometro.impulsacv.cl/sitemap.xml`.
5. Revisar el estado del envío y, después de publicar cambios importantes, usar `Inspección de URLs` para solicitar indexación de la portada y páginas estratégicas. Google no garantiza indexación inmediata.

El build ya genera `robots.txt`, `sitemap.xml`, canonical, Open Graph y JSON-LD. GA4 sirve para medir el uso; no mejora directamente el posicionamiento.
