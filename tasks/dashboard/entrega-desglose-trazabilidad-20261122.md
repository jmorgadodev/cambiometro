# Entrega local: desglose completo y trazabilidad — 22-11-2026

## Resultado

Se mantienen el diseño del dashboard, las cinco vistas y las cuatro agrupaciones de los gráficos. El panel derecho añade un navegador del conjunto completo de registros: diez por página, búsqueda, filtros, orden por monto descendente, acceso directo a cualquier página y CSV del conjunto filtrado completo. El total seleccionado permanece separado del subtotal de resultados. Los componentes se concilian por separado: no se suman partidas que puedan solaparse.

Una categoría/ítem/institución/mes muestra sólo el componente de su subtotal. La ficha contextual general de un parlamentario conserva sus componentes separados y permite investigar sus registros. En móvil las acciones de selección quedan en el flujo del panel y no tapan el contenido. La navegación, filtros globales y enlaces compartibles existentes se conservan; los filtros de la lista contextual son locales al panel.

## Datos que se recuperan

La proyección descartaba `values.Asesor` de las asesorías y mostraba sólo «Contratos externos». Ahora conserva prestador, folio, tabla original y documentos disponibles; parlamentario informante y prestador son campos distintos. La tabla global de Registros también muestra, busca y exporta al prestador. El resumen financiero mantiene sus clasificaciones y montos.

El archivo publicado verificado contiene 378 filas de asesorías; 366 corresponden al catálogo parlamentario actual y sus prestadores se conservan íntegramente. Las 12 restantes pertenecen a cinco IDs de diputados fuera del catálogo actual. Se documentan con informante/mes/folio en el recibo; no se asignan por similitud ni se borran del archivo original. Esta entrega no amplía el catálogo histórico ni modifica la cobertura financiera anterior.

La tabla incorporada contiene Folio, Asesor, Monto, Diputado, Reserva de Confidencialidad, Doc, Formulario y Declaración Asesor Concurrente. **No contiene descripción del servicio ni enlaces individuales en `sourceLinks`.** La interfaz no transforma «Ver» en un documento inventado ni utiliza el nombre del diputado como prestador. Expone la fuente institucional y señala dentro del respaldo la ausencia de descripción incorporada. Si una fuente futura aporta servicio/descripción/documento explícitos, el contrato permite conservarlos; no se interpretan por IA.

Gastos operacionales: se presentan los ítems originales de cada observación publicada, parlamentario, cámara, mes, importe y fuente. Las fuentes incorporadas están a nivel ítem/parlamentario/mes, no factura: no se inventa una descripción más detallada o un comprobante individual. Se conserva la regla existente que evita sumar una fila TOTAL junto a su desglose; los originales permanecen disponibles en su fuente. Las cuatro categorías visuales son filtros opcionales, no sustituyen el conjunto.

## Contrato e implementación

Campos opcionales de `ExplorerRecord`: `providerName`, `serviceDescription`, `originalConcept`, `originalDescription`, `sourceFields`. Se reutilizan esquema y particiones existentes; los nuevos campos sólo enriquecen el detalle. Glosas iguales al ítem y nombres iguales al catálogo no se duplican innecesariamente. El CSV agrega las columnas sin alterar el orden de las anteriores y mantiene protección frente a fórmulas.

`lib/parliamentary-explorer-records.ts` centraliza adaptación explícita de la tabla, búsqueda, orden y subtotales por componente. `ExplorerRecordBrowser` presenta todos los resultados, `ExplorerRecordEvidence` comparte identificación/respaldo con Registros y con registros individuales. Las comprobaciones de conciliación nunca completan faltantes con cero o compensan importes entre componentes.

Código: `703984ad`, rama `codex/dashboard-explorador-20261121`, raíz canónica `C:/Users/jorge/Proyectos/cambiometro-public`. Release fuente `c0f178e56987fa51aee4554fea47c315c678df71a8b9ac14ca51d5cead709e14`. Sin cambios en extracción, conexiones, almacenamiento, workflows o fuentes remotas. Sin push, PR ni despliegue.

## Validación

Suite integrada: 338 archivos / 2.174 tests. Tipos, guardas estáticos y lint afectado aprobados. Se prueban preservación de prestador/folio, ausencia de información inventada, orden, todas las páginas, filtros, null/cero, separación de componentes, CSV y alcance del panel.

`verify-record-detail-data.ts` verifica checksums, compara los hechos financieros y las identidades con el bootstrap anterior fijado por SHA, contrasta las 366 asesorías con las tablas originales y valida 684 selecciones por institución/mes/parlamentario/categoría/ítem. Las exportaciones y las páginas conservan el conjunto y sus importes. Los registros sin asociación siguen fuera del agregado individual actual, con cobertura documentada. Las filas administrativas no se deduplican por persona, folio o monto.

El verificador de navegador comprueba primera/última página, monto descendente, CSV completo y filtrado, institución/categoría/ítem/informante, identificación de prestador, fuente, búsqueda/vacío, accesibilidad y móvil. Las regresiones existentes cubren las cinco vistas, filtros/enlaces, comparación y cierre del panel. **Export estático final aprobado:** 4.886 páginas, tipos/guardas, 18 comprobaciones específicas del detalle y 52 regresiones del explorador (**70 en total**). Sin excepciones de página, errores de consola/CSP, respuestas fallidas ni solicitudes API/D1 en los flujos generales. Axe sin problemas graves/críticos en las cinco vistas y los dos paneles probados; revisión visual real a 390 px y escritorio. No se presenta como auditoría WCAG completa ni ensayo en teléfono físico. Las 50 fichas senatoriales mantienen su conciliación, incluidos Paulina y Juan Luis Castro.

## Capturas y rendimiento

Capturas tomadas del export estático `703984ad`, con su CSP:

- [Gastos operacionales con registros originales](../../transparencia-app/artifacts/record-detail/screenshots/gastos-registros.png).
- [Asesorías: informante y prestador](../../transparencia-app/artifacts/record-detail/screenshots/asesorias-registros.png).
- [Asesorías en móvil](../../transparencia-app/artifacts/record-detail/screenshots/asesorias-movil.png).

En abril, la prueba del panel de gastos consulta y exporta las **4.455 observaciones por $1.335.026.523**, no sólo las primeras ocho; el panel de asesorías muestra **47 observaciones por $46.519.644**. La última página y los filtros de institución/categoría/ítem/informante se validan contra el conjunto completo.

Mismo servidor estático local, Brotli 4: captura inicial de mismo origen **606.906 bytes** frente a 604.897 (+2.009 / 0,33 %); hidratación comprimida 146.194 frente a 146.148 bytes. Bootstrap 1.032.079 frente a 1.032.077 bytes; cero particiones de detalle al inicio. El detalle completo crece de 24.131.465 a 24.637.852 bytes (+2,10 %) por los campos recuperados y se mantiene dividido en 41 particiones con carga diferida y caché. No hay dependencias ni infraestructura nuevas. Estas mediciones locales no son RUM/CDN ni una factura de Cloudflare.

[Recibo resumido versionado](desglose-trazabilidad-validacion-20261122.json). Evidencia extensa ignorada en `artifacts/record-detail/`: data-receipt, browser-receipt, full-tests, lint, build, capturas y restauración. Los respaldos y las tablas raw no se incorporan al historial de esta entrega.

## Reproducción y recuperación

Desde `transparencia-app`, reutilizar las fuentes/recibos verificados de la entrega anterior; no ejecutar ETL para construir la interfaz. Para reconstruir el export completo se hidratan reversiblemente las cuatro entradas financieras y se regeneran sólo los shards locales mediante `writeExpensePeriodArtifacts`, con backups y checksums previos. Ver procedimiento en [entrega anterior](entrega-identidad-normativa-20261122.md). El bootstrap previo se guarda en `artifacts/record-detail/previous-bootstrap.json` y su hash se exige en el verificador; no se compara el resultado nuevo consigo mismo.

```powershell
$env:CAMBIOMETRO_DASHBOARD_LOCAL_DATA='artifacts/dashboard/local-data.json'
$env:CAMBIOMETRO_DASHBOARD_SOURCE_RECEIPT='artifacts/dashboard-explorer/input/source-receipt.json'
npm run pages:build
node scripts/preview-parliamentary-explorer.mjs
```

En otra terminal, con el servidor local activo:

```powershell
npx tsx scripts/verify-record-detail-data.ts
$env:EXPLORER_QA_BASE='http://127.0.0.1:3201'
node scripts/verify-record-detail-browser.mjs
node scripts/verify-explorer-refinement.mjs
```

El export es de laboratorio, no un artefacto autorizado para promoción. La publicación futura requiere aprobación e hidratación integral del release vigente mediante el flujo existente. La recuperación de código es revertir el commit de esta entrega; los campos opcionales son compatibles con los consumidores previos. No borrar ni sobrescribir datos remotos para revertir una interfaz.

## Estado de cierre

Cuatro entradas temporales y 179 archivos mensuales originales restaurados byte a byte por checksum; el export verificado se conserva en `out/`, servido en http://127.0.0.1:3201/dashboard/. Headers/redirects/manifiesto generados no quedan como cambios de fuente. No hubo push, PR, despliegue, activación de cron o cambios remotos. La publicación sigue pendiente de autorización.
