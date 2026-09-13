# Línea base de cierre — 7 de septiembre de 2026

Este documento fija la base desde la que se implementa el cierre total. No es
un inventario de datos nuevos ni reemplaza los manifiestos publicados.

## Base de código y producción

- Rama de trabajo: `codex/closure-total-20260907`.
- Base: `origin/main`.
- Commit base: `b25100e37a26ba48fa403f09bd8d1c6ebd1dea43`.
- Último deployment Pages conocido bueno: `7ec82ee1-1025-468a-981d-9e8e7312b8fa`.
- Preview asociado: `https://7ec82ee1.cambiometro.pages.dev`.
- Dominio productivo: `https://cambiometro.impulsacv.cl/`.

La promoción de una versión nueva requiere preview verde, artefacto Pages
verificado y confirmación explícita del cutover. Este branch no cambia DNS ni
escribe D1 productiva por sí solo.

## Datos y costos

- R2/Pages es la fuente pública canónica para releases estáticos y consultas
  masivas paginadas.
- D1 queda como proyección opcional y acotada; el preflight debe permitir la
  materialización sólo bajo el umbral configurado.
- No se eliminan snapshots históricos ni se convierten ausencias en cero.
- No se agregan fuentes externas en esta fase.

## Cobertura municipal que debe mostrarse sin ambigüedad

- 346 comunas/territorios catalogados.
- 320 municipalidades con nómina CPLT publicada en el release vigente.
- 25 municipalidades sin nómina disponible en el corte.
- 1 territorio no aplicable porque no tiene municipalidad propia.

La cobertura territorial y la cobertura de nóminas son métricas distintas. El
sitio debe conservar esa diferencia en el resumen, las tarjetas y las fichas.

## Estado de los bloques

- Línea base y guardas de promoción: implementadas en el repositorio.
- Cobertura municipal explícita y eliminación de trazabilidad duplicada:
  implementada en este branch.
- Búsqueda de funcionarios desde el índice R2 paginado: implementada en este
  branch; no realiza un scan D1.
- Movimientos: snapshot versionado, checksum, estados `verificado` y
  `en_confirmacion`, metadatos de intento/publicación y refresco separado.
- Gastos: flujo mensual/local para Cámara y publicación desde R2; no debe
  ejecutarse diariamente contra la fuente bloqueable.
- Verificación final: pendiente hasta ejecutar build, navegador, preview y
  comprobación productiva de la versión resultante.

## Regla de cierre

Una versión sólo se considera cerrada cuando las guardas locales, el preview,
el crawl frío, el smoke, CSP, los checksums R2/manifest/Pages y la verificación
posterior a la promoción están verdes. El sitemap se reenvía manualmente sólo
después de ese punto.
