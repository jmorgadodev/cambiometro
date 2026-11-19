# Fase 6 local: ficha parlamentaria

Raíz C:/Users/jorge/Proyectos/cambiometro-public, rama codex/fichas-navegacion-local-20261118, base local 68f27628ab26d080777bf8761eabbf012e06a1dd, origin/main 915fe31ecba9a8ceb23a146352ef8bc723f56c7b obtenido antes de editar. Hereda fases anteriores y comparación de Movimientos.

Responsabilidad: cabecera compacta, resumen de los últimos componentes con mes y fuente propios, navegación izquierda, selector móvil y un panel visible. Reutilizar componentes y datos existentes. Preservar enlaces ancla anteriores, historial y estados de selectores, fuentes y períodos. Antecedentes y fuentes secundarias fuera del resumen.

Archivos propios: app/politico/[id]/page.tsx, PoliticoScoreHeader, AuthoritySectionNav y nuevos componentes/CSS module/funciones de navegación y resumen. No tocar globals.css, navegación global, ETL, snapshots, slices, package.json ni contratos R2. Coordinación de integración en este mismo incremento mediante pruebas de consumidores.

Aceptar con teclado, historial del navegador, enlaces directos, móvil/escritorio y todos los períodos preservados en las dos fichas de referencia (Bianchi y Kaiser). Ausente no equivale a cero y dieta conserva su referencia oficial con su mes. Pruebas del módulo, lint, tipos y navegador aislado; build y validación con release R2 común en la entrega agrupada. Sin push ni publicación.
