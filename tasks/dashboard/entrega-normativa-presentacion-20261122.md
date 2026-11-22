# Entrega local: contexto normativo compacto — 22-11-2026

## Qué cambia

Presentación compartida de fichas, dashboard, comparaciones y registros: un concepto y una versión por vez, descripción breve y pestañas Qué contempla / Qué no permite / Condiciones sólo cuando tienen contenido. El período consultado se mantiene visible. Se retiran del panel las citas, páginas, IDs y fechas de comprobación, los detalles de metodología y la copia de las reglas generales. Quedan enlaces discretos al documento oficial y a las reglas comunes.

Una selección con varios conceptos usa un selector compacto. Las prohibiciones específicas y las excepciones del concepto se conservan; por ejemplo, las condiciones electorales particulares de Comunicación y la excepción de roaming de Telefonía. No se convierte una disposición específica en regla general ni se elimina por mencionar elecciones. Los regalos/donaciones y las prohibiciones transversales ya no se copian dentro de cada concepto.

## Normativa y fuentes

Metodología incorpora acceso directo a **Normativa y fuentes**. Concentra reglas comunes, prohibiciones transversales, documentos originales, referencias de sección/página, historial y metadatos. Un selector presenta las disposiciones de una sola versión a la vez; las dos resoluciones originales siguen accesibles. Los conceptos detallados se abren bajo demanda.

Se mantienen `#catalogo-normativo`, las URLs actuales y el comportamiento de los paneles. Nuevas anclas: `#normativa-y-fuentes` y `#reglas-generales`. Los enlaces desde el panel conservan la versión aplicable mediante `?norma=<id>`; el selector actualiza ese parámetro para compartir la misma selección. No se crean rutas de API ni consultas dinámicas.

## Vigencias y fidelidad

El motor legal original no cambia: conserva todas las versiones aplicables. El adaptador visual elige una para mostrarla. Ante un período mixto como marzo 2026, el panel avisa brevemente que hay un cambio y muestra explícitamente el tramo desde 11-03-2026, con acceso a otras vigencias; no atribuye todo marzo a Res12. Una fecha anterior a la cobertura no recibe una regla nueva. Sin fecha se usa la versión más reciente del catálogo existente.

Las listas originales del catálogo permanecen íntegras en el apartado documental. La presentación sólo sustituye las referencias internas de artículos de dos condiciones por «la norma», conservando modalidades, incompatibilidades y excepciones expresas. No se amplía ninguna autorización o prohibición. Los PDF, sus hashes, el catálogo, sus fuentes, versiones, mapeo de glosas, monitor, workflow y datos financieros permanecen intactos.

## Implementación y verificación

Código `ab0dac4f`, rama `codex/dashboard-explorador-20261121`, raíz canónica cambiometro-public. Archivos: `NormativeInfo`, componente documental `NormativeCatalogue`, CSS local, adaptador de presentación y acceso desde Metodología. No se modifica navegación global ni diseño general, extracción, almacenamiento o programación.

Suite integrada: **339 archivos / 2.179 pruebas**; tipos, guardas y lint afectados aprobados. Casos nuevos: un solo snapshot, fecha histórica, transición sin superposición, exclusión de reglas comunes, ausencia de fechas sin cobertura y conservación de excepciones. Las pruebas anteriores siguen verificando los originales PDF y el monitor sin publicación.

El navegador comprueba contenido compacto, condiciones y excepciones, referencia oficial única, selector de conceptos, foco/Escape, transición, vínculos históricos, selector documental compartible, cuatro consumidores y móvil. **Export estático final aprobado:** 4.886 páginas, tipos y guardas. Se aprobaron 28 comprobaciones específicas y 52 regresiones del explorador (**80 en total**), sin excepciones, errores de consola/CSP o solicitudes API/D1 en los recorridos comprobados. Se revisaron capturas reales de escritorio y móvil. Axe no encontró problemas graves/críticos en el panel y las cinco vistas; no sustituye una auditoría manual completa ni una prueba en teléfono físico. El catálogo y la proyección financiera se comparan por SHA con los recibos anteriores; monitor y PDF se verifican contra sus hashes de entrada.

## Revisión y recuperación

Se reutiliza el release financiero ya verificado. Las entradas locales temporales para construir el export completo se hidratan/restauran con los respaldos y checksums existentes; no se extraen datos ni se consulta una fuente para rehacer un ETL. El artefacto es de laboratorio, servido en http://127.0.0.1:3201/dashboard/. Normativa documental en http://127.0.0.1:3201/como-funciona/#normativa-y-fuentes.

Para repetir: `npm run pages:build` con las variables locales/entradas verificadas documentadas en la entrega anterior, `node scripts/preview-parliamentary-explorer.mjs`, y `EXPLORER_QA_BASE=http://127.0.0.1:3201 node scripts/verify-normative-context.mjs` (establecer variable con `$env:` en PowerShell). Regresión general: `verify-explorer-refinement.mjs`. No invocar el monitor online para validar una corrección visual.

Recuperación de presentación: revertir su commit sin modificar catálogo, originales o datos. No hay push, PR, despliegue ni activación de programación remota; producción requiere autorización y el flujo existente de artefacto validado.

## Capturas y cierre

- [Panel compacto](../../transparencia-app/artifacts/normative-presentation/screenshots/dashboard-compacto.png).
- [Cambio normativo de marzo](../../transparencia-app/artifacts/normative-presentation/screenshots/transicion-compacta.png).
- [Normativa y fuentes](../../transparencia-app/artifacts/normative-presentation/screenshots/normativa-y-fuentes.png).
- [Detalle documental](../../transparencia-app/artifacts/normative-presentation/screenshots/normativa-detalle.png).
- [Ficha en móvil](../../transparencia-app/artifacts/normative-presentation/screenshots/ficha-movil-compacta.png).

Catálogo, PDF, monitor, workflow y proyección financiera conservan sus SHA de entrada. Captura inicial de mismo origen, servidor local/Brotli 4: 606.578 bytes frente a 606.906 anteriores; cero particiones de detalle al inicio. No se introduce infraestructura, dependencia o consulta dinámica. No se extrapola esta medición local a costos/CDN/RUM de producción.

Se restauraron por checksum las cuatro entradas y los 179 archivos mensuales locales utilizados temporalmente; el export verificado permanece disponible en 3201. Los archivos generados de headers/redirects/manifiesto no quedan como cambios de fuente. [Recibo versionado](normativa-presentacion-validacion-20261122.json); evidencia extensa en `artifacts/normative-presentation/`. Cambios guardados en commits locales, sin publicación.
