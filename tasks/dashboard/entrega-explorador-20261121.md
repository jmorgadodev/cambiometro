# Entrega local del explorador parlamentario — 21-11-2026

## A. Implementación

Cinco vistas funcionales: Panorama, Explorar, Comparar, Personal de apoyo y Registros. Filtros compartidos con URL e historial para cámara, período, regiones, distritos, partidos, parlamentarios, componentes, categorías, ítems y cargos disponibles. Selección múltiple con búsqueda y fotografías existentes; filtros a la izquierda y detalle a la derecha. Paneles con Escape, foco, fondo y posición de scroll preservados.

Exploración con ranking configurable por monto o registros, agrupaciones, evolución, barras, regiones y detalle contextual. Comparaciones de parlamentarios, partidos y regiones, hasta cinco tarjetas y tabla completa para más participantes. Personal con nombre público, cargo original, contratos/registros, equipo y montos disponibles. Registros con búsqueda, orden, columnas, agrupación, expansión y paginación. Exportación CSV de todos los resultados filtrados, SVG con título/período/fuente y enlace compartible. Búsqueda/columnas/orden de la tabla son estado local de presentación; los filtros de consulta sí se comparten.

Se reutilizan el modelo financiero anterior y sus filtros, referencias de dieta, catálogo de parlamentarios, fotografías validadas, ETL, manifiestos y entradas R2. No se rediseñó la landing ni se modificaron workflows, calendarios ETL, R2 o el repositorio editorial. Reportajes conserva su trabajo en la rama previa `codex/reportajes-evidencia-20261120`.

## B. Archivos principales

- `transparencia-app/lib/parliamentary-explorer*.ts`: contratos, cálculos, compactación, adaptadores, integridad y pruebas.
- `transparencia-app/components/dashboard/explorer/*`: cinco vistas, filtros, gráficos, paneles, registros y carga diferida.
- `transparencia-app/app/dashboard/page.tsx`: integración estática del explorador.
- `transparencia-app/scripts/build-parliamentary-explorer.ts`: proyección y conciliación durante build.
- `transparencia-app/scripts/prepare-parliamentary-explorer-local.mjs`: preparación local verificada, sin extracción.
- `transparencia-app/scripts/preview-parliamentary-explorer.mjs` y `verify-parliamentary-explorer.mjs`: servidor estático y revisión reproducible.
- `transparencia-app/lib/party-support.ts`, `lib/partido-estadisticas.ts`: separar registros de personas no acreditadas.
- `transparencia-app/lib/publication-scope.ts`: alcance actual del dashboard.
- `transparencia-app/package.json`, lockfile: generador en build y parche Next/eslint-config-next 16.4.6. Sin librerías adicionales en el bundle.
- Configuraciones de ESLint/Vitest: excluir artefactos generados e incluir pruebas de carga diferida.
- Documentación y tareas del módulo dashboard.

## C. Arquitectura y datos

Fuentes oficiales → ETL existentes → R2 y manifiestos → entradas verificadas durante build → proyección estática → Pages → cálculos en navegador. Sin nueva API, base de datos o servidor de imágenes. El resumen utiliza diccionarios y tuplas; los detalles se particionan por mes, cámara y componente y tienen validación SHA-256/bytes/release y caché compartida. CSV y SVG se generan en navegador.

Release de datos `c0f178e56987fa51aee4554fea47c315c678df71a8b9ac14ca51d5cead709e14`. Proyección `1595fcac3fb0f20e1e10819c9d5b14ba5958be5c5b308893ebeaabd0de5aa854`. 205 parlamentarios; 35.111 hechos de resumen; 40.758 registros administrativos; 41 particiones; 1.030.117 bytes de bootstrap y 23.943.485 bytes de detalles totales, que no se descargan al abrir. 3.474 combinaciones parlamentario/mes/componente conciliadas exactamente con el modelo previo de 30.397 filas. No son personas únicas ni cantidades fijadas en código.

## D. Estado y límites funcionales

Implementados: las cinco vistas, filtros, agrupaciones, ranking, comparación múltiple, paneles, tablas, CSV, SVG, compartir URL, integridad, caché y recuperación. Se conserva la distinción entre cero y ausencia. No existe total combinado entre componentes solapados ni promedio/per cápita como juicio de desempeño.

Limitados por la fuente: personas únicas, afiliación histórica homogénea, equivalencia de funciones entre cámaras y respaldo individual de todos los registros. El mapa se resuelve mediante lista accesible de las 16 regiones y gráficas/comparaciones; no se introduce GeoJSON sin licencia verificada ni mapas con cobro.

Sin dependencia pendiente de implementación. La publicación está expresamente fuera de esta entrega. La recuperación de ETL Personal Cámara es una tarea operativa separada, documentada en el plan de esta rama; no se relanzó ni se eliminó su lock.

## E. Validación

Pruebas integradas: 333 archivos, 2.131 tests aprobados, con tipos de aplicación y API, contratos y controles estáticos. Lint: cero errores y 189 advertencias existentes. Pruebas de integridad/carga diferida cubren checksum, bytes, release, concurrencia, caché y reintento. Pruebas financieras cubren filtros consistentes, nulos/ceros, referencia de dieta, CSV y normalización territorial, incluyendo Bío Bío.

Build completo `npm run pages:build`: código 0, 4.886 páginas generadas y controles de exportación, SEO, referencias codificadas, transferencias y gastos aprobados. Navegador estático: 35/35 comprobaciones; 5/5 adicionales de límites (fallo de partición visible, reintento, cero publicado y ausencia). Cinco vistas sin violaciones axe; cero excepciones JavaScript, errores de consola, infracciones CSP o solicitudes fallidas. Verificado scroll móvil al abrir/cerrar filtros, foco/Escape/backdrop, compatibilidad URL, CSV conciliado, SVG con procedencia, comparación por persona/partido/región y caché.

Se revisaron visualmente las cinco vistas de escritorio y móvil y ambos paneles. Barras con tamaño de texto físico legible, sin crecer con el contenedor; tablas con altura acotada, cabecera fija y paginación. Sin desbordes de página en 360/390/768/1366/1920 px. La revisión no es una auditoría WCAG completa ni medición en hardware móvil real.

Recibo resumido versionado: [explorer-validation-20261121.json](explorer-validation-20261121.json). Recibos completos, logs, SVG y capturas en `transparencia-app/artifacts/dashboard-explorer/`.

## F. Evidencia visual

Capturas reales en `transparencia-app/artifacts/dashboard-explorer/screenshots/`: `desktop-{panorama,explorar,comparar,personal,registros}.png`, equivalentes `mobile-*`, paneles `desktop-filtros.png`, `desktop-detalle.png`, `mobile-filtros.png`, `mobile-detalle.png` y comparaciones de partidos/regiones. Resoluciones: 1366×1000 y 390×844, con comprobación adicional de desborde a 360, 768 y 1920 píxeles. Accesibilidad automática de las cinco vistas; no sustituye auditoría WCAG manual completa ni prueba en un teléfono físico.

## G. Rendimiento

Auditoría previa de producción: 28 solicitudes iniciales, cero API, payload principal de hidratación de 5.284.798 bytes decodificados / 267.085 bytes Brotli. Cinco interacciones locales no generaron nuevas solicitudes. El subtotal Resource Timing de 0,89 MB excluía HTML y dos 404 de prefetch; no es peso completo de página.

El payload principal nuevo del export real mide 1.063.253 bytes decodificados y 146.187 bytes Brotli local (frente a 5.284.798 / 267.085 del anterior). La reducción decodificada es de 79,9%; la compresión no está pareada porque producción y laboratorio usan configuraciones distintas. La proyección compacta sola mide 1.030.117 bytes. HTML: 43.464 bytes. En la captura inicial hubo 28 solicitudes; el subtotal de recursos same-origin completados más HTML fue 597.217 bytes transferidos / 2.595.554 decodificados. Esto excluye imágenes externas o recursos que aún no terminaban, y no se presenta como peso total definitivo. DOMContentLoaded local: 164 ms; heap reportado por Chromium: 47.400.000 bytes, sólo indicador de laboratorio. Los 23,94 MB administrativos son detalles diferidos totales. La medición del artefacto estático local se registra en el recibo de navegador: servidor Brotli calidad 4, caché local y sin latencia CDN, por lo que tiempos y transferencia no son un benchmark pareado de producción. No hay medición RUM ni garantía sobre factura/cupos de cuenta; sí se verifica ausencia de llamadas API/D1/Workers por interacción en el flujo probado.

## H. Limitaciones de los datos

1. Un nombre repetido o contrato no acredita persona única. No se generan hashes personales, RUT ni identificadores derivados del nombre. Se muestran observaciones administrativas y equipos; `totalPersonas` queda nulo.
2. Partido corresponde al catálogo vigente; los intervalos existentes no acreditan serie histórica homogénea de militancia para ambos organismos.
3. Región/distrito indican representación, nunca lugar donde se gastó el dinero. No hay equivalencia directa entre circunscripción y distrito.
4. Ítems y cargos conservan su redacción oficial. Agrupaciones de lectura no homologan jurídicamente funciones ni reglas entre cámaras. Montos agregados dependen del tamaño de cada grupo.
5. Dieta es la última referencia oficial positiva aplicada como estimación fija a cada mes seleccionado, no prueba de pago mensual ni serie de reajustes. Se informa el período de referencia y no se inventan registros de pagos.
6. Enlaces genéricos institucionales se etiquetan como tales; sólo se afirma respaldo individual si realmente existe. La fecha de generación del snapshot se diferencia de fecha individual y del período del gasto.
7. Cero informado y ausencia son distintos; no completar meses con cifras inventadas. Asesoría externa no se convierte en nómina de empleados.
8. Fotografías reutilizan la asignación verificada existente y su procedencia; fallo de carga muestra iniciales neutras.

## I. Preparación de publicación y recuperación

Rama local `codex/dashboard-explorador-20261121`, base origin/main `0cae8e73d7b9fd89c634a72f33f0e437d04f2900`. Commits de código: `9265166d` (datos y contratos) y `5c9caa0d` (interfaz). Ningún push, PR ni despliegue realizado.

Este artefacto es de laboratorio local: las entradas financieras se hidrataron desde candidatos cuyo checksum coincide con el release publicado, con respaldos verificables de los archivos originales. Otras fuentes de módulos ajenos no se hidrataron integralmente; no promover este export a producción. Los datos no forman parte de los commits. Finalizada la compilación, se restauraron las cuatro entradas originales y se verificaron contra sus backups SHA-256; se conservaron `out/` y sus evidencias. El export corresponde al commit de código `5c9caa0d`; el commit posterior sólo añade QA/documentación. La huella del HTML y manifiestos consta en el recibo versionado.

Tras autorización: revisar/integrar cambios por PR; usar el flujo vigente `pages-ui-refresh` para hidratar todo el release desde R2, fijar SHA real y release-set, desactivar overrides locales y ejecutar build publicado. Validar períodos/importes, hashes y las cinco vistas en preview. Promover exactamente ese artefacto con `pages-promote-artifact`; conservar destino previo y evidencias para rollback. No ejecutar ETL ni `wrangler pages deploy --branch main` desde un árbol modificado. Si la integridad o conciliación falla, detener y mantener la última versión válida.

Revisión local: `node scripts/preview-parliamentary-explorer.mjs`, abrir http://127.0.0.1:3201/dashboard/. El servidor sólo escucha localhost. Reiniciar sirve el mismo `out/`, sin reconstrucción ni gasto de CI.
