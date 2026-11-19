# Preview de estabilización — 19-11-2026

Publicación autorizada por Jorge para revisar en web mientras continúa el trabajo local. Repositorio canónico: C:/Users/jorge/Proyectos/cambiometro-public. PR #848, rama codex/partidos-apoyo-entrega-20261119.

## Artefacto observado

- Preview estable: https://revision-estabilizacion.cambiometro.pages.dev/
- Despliegue inmutable: https://bc6175ea.cambiometro.pages.dev/
- Código publicado: 40c43f70fe139c15ddff9799535478ffa0ca4a70.
- Build: https://github.com/jmorgadodev/cambiometro/actions/runs/44470854092 (success).
- ReleaseSet: 5cd0a3da19dddbbcccc9ef8a12215bc35e9f0cde00c239892b48ab25225cd9bf.
- Manifiesto estático: dbb128e7b70594934cdb5a8735e15e1704aa89322f0a9f9a9c931b7ab0c84ab3.
- SHA256 del archivo público release-set.json: fd011de0e59e681e114e4e61c971c61d7352b0281acd6fe4dfd961f36ea7c484, idéntico al pin auditado.
- Producción conserva su despliegue anterior; publish_pages=false. No se ejecutó extracción ETL ni publicación de datos R2/D1.

## Alcance

Apoyo mensual en tabla y ficha de partido, importe/mes/cobertura por autoridad; septiembre 2026: 204/205 autoridades y 2.095.680.977 CLP. Se excluyen importes ausentes o identidades ambiguas. Los registros son contratos, no personas únicas, y la agrupación usa el catálogo actual.

Incluye las fases locales de dietas, personal, votaciones/partidos, movimientos, ficha por paneles y seis rutas de Votaciones desde 2026. Los trece apartados aplazados conservan contenido, URL y aviso. Comisiones y Asistencia tienen avance/cobertura visible; no catálogo ni porcentajes de asistencia inventados. Dashboard y Reportajes no se dan por terminados con esta entrega.

## Verificación

Todas las puertas del PR en verde (lint, tipos, pruebas, seguridad y build/E2E). Auditoría de artefacto: 128 comprobaciones, 0 fallos, escritorio/móvil y temas paper/dark. Auditoría pública adicional: 22 comprobaciones, cero errores JS, filtro mensual real, ambas fichas, seis rutas de Votaciones y contenido secundario. La landing conserva título, familia tipográfica y ocho imágenes de producción.

Evidencia local: transparencia-app/artifacts/partidos-apoyo/published-evidence y public-preview; registro de publicación publish-success.log. La comprobación pública bloquea API; no certifica búsquedas productivas o la API. El E2E de PR sí valida su fixture local aislada.

Durante la integración se actualizaron controles que aún exigían placeholders y todos los paneles visibles. Axe detectó y corrigió la estructura dl/dt/dd del Resumen; la puerta de accesibilidad permanece activa. Los intentos previos fallidos no se publicaron.

## Trabajo local siguiente

La preview permanece fijada al SHA indicado mientras se revisa. Los cambios locales posteriores se agrupan; no lanzar otro build por retoques de texto. Se corrige localmente la nota metodológica antigua que todavía decía apoyo agregado en revisión y se distingue del ranking individual pendiente. No confundir esos retoques posteriores con el contenido del artefacto publicado.

## Repetición y recuperación

Con una nueva entrega autorizada: comprobar rama/SHA y estado limpio, ejecutar pruebas afectadas, agrupar un PR y usar pages-ui-refresh.yml con ref de rama real, deployment_mode=ui-only, publish_pages=false, preview_branch=revision-estabilizacion y audit_without_d1=true. El workflow hidrata R2, pinnea release-set y sólo publica después de todas las puertas. No extraer fuentes ni subir fixtures. Comparar release público con el checksum del recibo y validar las pantallas cambiadas.

Para una revisión histórica usar el enlace inmutable. Para reemplazar la preview, publicar otro artefacto validado por ese flujo. Para promover a producción, reutilizar el artefacto validado mediante pages-promote-artifact y registrar rollback; esta entrega no lo promovió. Nunca desplegar un árbol local modificado como main.
