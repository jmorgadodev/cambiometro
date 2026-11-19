# Navegación móvil de fichas — evidencia local

19-11-2026. Base c3fad28a; rama codex/dashboard-parlamentario-local-20261119. Incremento local, sin publicación ni cambios de datos/ETL.

## Comportamiento

El selector permanece sticky bajo el encabezado mientras se lee un apartado. Añade anterior/siguiente (44 px), sección actual/total y selector de 16 px para evitar ampliaciones involuntarias en móviles. Al cambiar mediante un destino principal se muestra el comienzo del apartado con el título libre de la barra; los enlaces profundos anteriores conservan su destino interior. El espacio se calcula midiendo encabezado/barra con ResizeObserver y fallback de resize, sin una altura global fija.

Los paneles siguen montados: volver a Gastos conserva el mes elegido. Se mantienen hash, historial, foco en el título y navegación sin JavaScript. En escritorio continúa el menú lateral; la barra móvil se oculta. No ocupa el pie permanentemente: deja de adherirse al terminar el contenido de la ficha.

## Verificación

- Cinco pruebas existentes de authority-profile, tipos y lint de los archivos modificados aprobados.
- Compilación/hidratación real de las dos rutas con Next dev. Sin repetir el build completo de 4.886 páginas ni extraer datos para esta corrección de navegación.
- 17 comprobaciones en navegador: Bianchi y Vanessa Kaiser, scroll, flechas, título/foco, conservación del mes, historial, recarga con hash, anchos 320/390/844 y orientación horizontal, cambio de altura del encabezado, extremos deshabilitados, Enter/Espacio, enlace profundo anterior y respaldo sin JS.
- Barra sin infracciones Axe en paper/dark/night; sin errores JS ni desbordamiento de página. Escritorio conserva la barra lateral.
- Guards de colores y arquitectura aprobados; git diff --check sin errores. Sin modificaciones en datos, slices, manifests, workflows, dependencias o estilos globales.

Regresión reproducible desde transparencia-app con servidor local activo:

```powershell
node scripts/verify-profile-mobile-navigation.mjs
```

Por defecto usa http://127.0.0.1:3017; CAMBIOMETRO_PROFILE_BASE_URL permite otro puerto local. Recibo y capturas ignorados por Git: transparencia-app/artifacts/fichas-mobile/browser-receipt.json y *-390.png.

Revisión: http://127.0.0.1:3017/politico/vanessa-kaiser-barents-von-hohenhagen/#seccion-gastos y la ficha equivalente de Carlos Bianchi. Recargar las pestañas que conservaban la exportación estática anterior: el puerto 3017 ahora sirve Next dev con estos cambios y el Dashboard local verificado.

Recuperación: revertir este incremento de AuthorityProfile y su CSS. No requiere cambiar datos ni ETL. Publicación pendiente para la próxima entrega agrupada autorizada.
