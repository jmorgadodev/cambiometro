# Pendientes operativos — 25-09-2026

Los porcentajes son estimaciones de cierre de cada alcance documentado, no
porcentajes de filas presentes ni un promedio global. Se basan en la evidencia
productiva disponible en esta fecha; los datos que no se pudieron medir se
marcan como tales, no se presumen completos.

## Estado y orden de continuación

| Prioridad | Alcance | Avance | Evidencia y trabajo restante |
|---|---|---:|---|
| P0 | Quitar del footer el estado del catálogo y la tarjeta de donación | 100% | PR #627 integrado; build, E2E, seguridad y prueba de regresión pasaron. Promoción `36094441207`, deployment `bfff1571-61e6-446a-9723-cfb20f6c04c8`. HTML y navegador productivo confirman que los bloques desaparecieron, la misión permanece y “Donar y apoyar” sigue enlazado a `/donar`. |
| P1 | SEO de la Home | 100% | Título, descripción y H1 verificados directamente en producción el 25-09-2026; HTTP 200. PR #625 y guardia de promoción #626 integrados. |
| P1 | Metadatos SEO municipales | 100% | Producción verificada en `/municipalidades/niquen/`: título y descripción describen la ficha y canonical coincide con la URL con barra final. |
| P1 | Metadatos SEO de fichas parlamentarias | 100% | PR #628 desplegado; Javiera Morales devuelve título neutral y descripción propia sobre registros, períodos y fuentes. HTTP 200 y canonical autorreferencial con barra final, comprobados en producción. |
| P1 | Resolver los hallazgos técnicos/CTR de Search Console | 25% | Home y muestras de Niquén/Javiera verificadas. Aún faltan las URLs concretas de 404/redirecciones/canónicas para actuar sin redirigir a ciegas, revisar los casos de RUT y enlaces internos, y medir impresiones/CTR después de la indexación. No afirmar que Search Console está completamente saneado. |
| P1 | Movimientos publicados | 90% | A 25-09: 46 filas oficiales en R2 y Páez/Bravo presentados aparte en confirmación. Falta evidencia primaria para reclasificarlos y seguir incorporando sólo cambios posteriores verificados. |
| P1 | Gastos operacionales del Senado | 85% | La reconciliación registrada encuentra 174 manifiestos/artefactos locales con checksum válido y 154.132 filas esperadas; se probaron consultas productivas paginadas y meses de muestra. Falta completar un recorrido de interfaz/API de todos los períodos y confirmar que el release servido coincide íntegramente. No se debe reconstruir ni subir el universo sin preflight. |
| P1 | R2: tamaño, respaldo y restauración | 45% | Existe inventario y guard account-wide de publicación; la última evidencia histórica disponible suma 17,44 GB entre el bucket público y backup, por encima del margen gratuito conocido. El tamaño actual no está medido. El inventario de backup no permite aún certificar restauración; no borrar snapshots hasta completar un drill aislado y comparar checksum/rollback. |
| P1 | ChileCompra | 45% | El guard impidió reemplazar el corte válido cuando el origen mensual respondió 403 el 21-09. Falta probar una vía oficial alternativa con límites, conteos y estimación de bytes; mantener el release previo mientras el origen no responda. |
| P2 | Votaciones del Senado | 90% | El ETL remoto quedó retirado y la fuente es local-only. La partición consultada para 20–24 de septiembre coincide con 12 IDs entre API oficial y R2; esto no certifica todo el histórico ni todas las fichas. |
| P2 | Reconciliación integral de fuentes | 55% | Hay matrices y verificaciones por cortes, pero conteos de varios dominios tienen alcances distintos y no existe certificación comparable de cobertura completa. Continuar fuente por fuente: fuente → manifiesto/índice R2 → API paginada → página. |
| P2 | PR de compactación reversible de originales R2 (#593) | 60% | Sigue abierto y mergeable; la propuesta preserva SHA/bytes y exige restauración/índices antes de retirar duplicados. Los checks publicados son antiguos: revalidar contra `origin/main` y revisar el impacto real de almacenamiento antes de integrarlo. |
| P3 | Dependencias de seguridad (#586) | 70% | PR abierto y mergeable con actualizaciones de producción. Revalidar sus checks sobre el estado actual y revisar compatibilidad de Next/React antes de integrarlo. |

## Comprobación de SEO del 25-09-2026

- Home productiva: HTTP 200; título `Datos públicos de Chile para fiscalizar |
  El Cambiómetro`; H1 correspondiente; descripción orientada a datos oficiales.
- Municipalidad de Ñiquén: HTTP 200; título descriptivo con atributos de la
  ficha y descripción específica.
- Javiera Morales después del despliegue de PR #628: HTTP 200; título
  `Javiera Morales Alvarado: ficha pública | El Cambiómetro`, descripción propia
  sobre asistencia, votaciones, rendiciones, períodos y fuentes, y canonical
  autorreferencial con barra final.
- Los conteos de Search Console (404, redirecciones, canónicas, impresiones y
  CTR) requieren consultar sus URLs/filas exactas; los totales del informe no
  bastan para crear redirecciones ni para declarar resuelta la indexación.

## Secuencia de trabajo

1. Resolver Search Console cuando se cuente con sus URLs exactas, empezando por
   404, redirecciones y canónicas; después comprobar CTR por un período medible.
2. Revalidar la compactación de R2 sin escribir ni borrar; resolver primero la
   restaurabilidad del backup.
3. Auditar ChileCompra de forma acotada y después recorrer Gastos Senado por
   períodos en interfaz/API.
4. Continuar la reconciliación por fuente y registrar cada corte comprobado.

Ningún pendiente de datos autoriza por sí solo una publicación masiva en R2 ni
una consulta masiva en D1. Un ETL verde no equivale a datos publicados; un
despliegue visual tampoco valida las correcciones de otro componente.
