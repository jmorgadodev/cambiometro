# Dashboard parlamentario local — 19-11-2026

Base 39cc06d05e110ecd795e56d4d3726ff16f01a13a, origin/main obtenido y coincidente. Rama codex/dashboard-parlamentario-local-20261119. Sólo desarrollo local; sin push, workflows, despliegue, ETL o cambios remotos.

## Alcance y archivos

Ruta /dashboard; acceso secundario desde Cámara, manteniendo las cinco áreas activas. Contrato puro y adaptador de fuentes en lib/parliamentary-dashboard*.ts, componentes/CSS propios en components/dashboard, documentación tasks/dashboard y actualización del tablero de entregas. Sin globals.css, package.json, cron, contratos API públicos o manifests remotos.

## Datos antes de interfaz

Reutilizar los gastos normalizados de las fichas, el catálogo de identidades, personal mensual y dietas oficiales. Copias verificadas contra el ReleaseSet publicado 5cd0a3da...: gastos Cámara y Senado contenidos en reviewed-envelope.candidate, y personal en baseline-verificada-20261118/candidate.json. No usar JSON Git antiguos como sustituto silencioso. Documentar el corte local y verificar la referencia salarial contra el artefacto publicado. El adaptador de producción usa los mismos loaders que fichas cuando se hidrate R2 en una futura entrega.

## Entrega verificable

- Filtros combinados: cámara, autoridad, rango mensual, componente, categoría e ítem; estado compartible por URL y reinicio.
- Evolución temporal, desglose por categoría/ítem, tabla ordenable y exportación CSV del conjunto filtrado.
- Gastos sin duplicar filas TOTAL. Conservar valores nulos, ceros reales y cobertura; ningún mes ausente se rellena con cero.
- Dieta identificada como referencia con su mes oficial; no se proyecta a meses distintos ni se suma a gastos/contratos como costo mensual común.
- Datos desde 2026; identidades no ambiguas, sin atribuir afiliación histórica actual. Cobertura por cámara y componente visible.
- Escritorio/móvil, teclado, estado vacío, filtros que no produzcan combinaciones inválidas, pruebas de agregación y límites.

## Revisión previa

Implementación local autorizada por Jorge después de revisar las fases publicadas. El [estado conciliado](../consolidacion/estado-fases-20261119.md) confirma Gastos completado y fases publicadas en #848; no reabrirlas para construir este consumidor. La fase 7 se trabaja localmente; la siguiente publicación requiere una nueva solicitud.

## Orden

1. Registrar la entrega ya publicada y actualizar pendientes obsoletos sin cerrar ETL operativos por tener UI.
2. Verificar/reutilizar entradas locales y definir filas normalizadas; pruebas de duplicados, períodos, ausencia/cero y referencias salariales.
3. Implementar el explorador y su acceso desde Cámara sin cambiar hero ni menú principal.
4. Probar localmente, documentar datos/limitaciones/evidencia y guardar commits locales. Reportajes es el siguiente módulo después de este incremento.

## Integración coordinada

El adaptador lee los mismos archivos publicados que alimentan las fichas y verifica Gastos/Personal contra el pin del release antes de consumirlos. La revisión local usa un bundle explícito con checksum; sin pin ni bundle no muestra fixtures como datos publicados. El modo de publicación rechaza ese override local.

Archivos compartidos delimitados: app/politico/page.tsx añade un enlace; lib/party-support.ts acepta un período mínimo opcional para enero de 2026 en Dashboard, manteniendo marzo como valor por defecto de Partidos. Se añadió una regresión que protege ambos consumidores. Sin cambios de calendario, workflows, manifiestos remotos, estilos globales o dependencias.
