# Refinamiento del explorador — 21-11-2026

Base: rama `codex/dashboard-explorador-20261121`, commit `3912ce46`; origin/main obtenido `0cae8e73`. Sólo local, sin push/PR/publicación.

Alcance: controles básicos visibles, comparación aditiva y filtros progresivos, detalle contextual pertinente y descendente, evolución por componente, personal por parlamentario y mes. Conservar modelo, fotografías, proyección, particiones, caché, integridad, CSV/SVG y cinco vistas.

Archivos: componentes/dashboard/explorer/*, helper de interacción y pruebas `lib/parliamentary-explorer-ux*`, scripts QA y documentación dashboard; texto de alcance compartido sólo para reducir ruido del dashboard. Sin cambios de contrato financiero, ETL/API/almacenamiento/workflows ni estilos globales.

Aceptación: 20 flujos del requerimiento, valores y release idénticos; cero API; comparación y filtros no se borran entre acciones; nulos/ceros conservados; montos ordenados numéricamente; conteo nominal sólo por equipo/mes sin nombres faltantes o repetidos, nunca suma de contratos. Registrar evidencia del caso 205/204, sin completar equipos por aproximación de nombre.

Fases: (1) regresiones/controles/acciones; (2) paneles/personal/evolución; (3) pruebas integradas y revisión estática escritorio/móvil, documentación y commits locales.

Cierre: implementación, tipos, lint, build y 52 flujos de navegador estático aprobados. Datos/ETL preservados; cuatro entradas locales restauradas por checksum. [Entrega](entrega-refinamiento-20261121.md), [recibo](refinamiento-validacion-20261121.json). Código 19e4af32 y cce21fb5. Sin publicación.
