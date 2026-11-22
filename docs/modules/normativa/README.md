# Catálogo normativo central

Datos públicos estructurados en `transparencia-app/data/normativa/catalogo.json`, resolución/versiones, vigencia por día, conceptos, supuestos incluidos, exclusiones expresas, condiciones, institución, referencias y fecha de verificación. Documentos originales inmutables en `documentos/`, con SHA-256 en catálogo. Res11: 01-09-2024 a 10-03-2026; Res12: desde 11-03-2026, según sus disposiciones de entrada en vigor. Los números de página de enlaces son del PDF; la sección identifica la disposición impresa.

Se sintetizan disposiciones seleccionadas verificadas en los originales, no toda instrucción o acuerdo complementario. Las definiciones históricas son snapshots propios. No se traslada retrospectivamente una regla de la versión posterior. Marzo 2026 cruza ambas vigencias: el motor conserva las dos versiones; el panel muestra un tramo identificado y remite al selector histórico, sin atribuir todo el mes a Res12. Fechas anteriores a las versiones verificadas carecen de definición aprobada.

`lib/parliamentary-normative.ts` concentra selección temporal y relación exacta glosa original→concepto. Una categoría visual no se trata como concepto jurídico. Glosas desconocidas, genéricas o anómalas no reciben restricciones de un ítem particular; puede consultarse únicamente el alcance general de asignaciones. Dieta queda fuera de este catálogo. No cambiar importe, categoría financiera ni fuente para añadir contexto.

El componente reutilizable `components/financial/NormativeInfo.tsx` abre un diálogo accesible desde fichas, categorías/ítems, comparación y registros. Metodología expone el mismo catálogo. Las reglas generales se distinguen de las específicas. No hay consulta API/D1/Workers al abrirlo, atribución de compras concretas ni evaluación automática de irregularidades.

## Detección y validación

`node scripts/normative-monitor.mjs` consulta el índice oficial y PDFs pertinentes, verifica origen/tamaño/tipo y calcula SHA-256. Guarda documentos nuevos o modificados y un informe `pending-validation` en `artifacts/normativa-monitor/`. Un documento no almacenado inicialmente también queda pendiente; no se presenta automáticamente como una nueva resolución. El alcance potencial se mantiene amplio cuando no puede determinarse por metadatos. El programa no interpreta el PDF ni modifica catálogo, vigencias o interfaz.

El workflow existente `source-calendar-monitor.yml` conserva su cron diario; el paso normativo se ejecuta los lunes a las 15:00 UTC o mediante workflow_dispatch. No añade cron ETL ni cambia fuentes pausadas. El candidato se conserva como artefacto 30 días. Un fallo de consulta no modifica la última versión pública; es visible en el paso de CI. Esta programación está preparada en la rama local: no se ha activado remotamente mediante push.

Para incorporar una modificación: conservar original+hash, verificar disposiciones y fecha de efecto, identificar conceptos afectados, crear nueva versión sin sobrescribir snapshots históricos, actualizar sólo definiciones respaldadas, ejecutar pruebas temporales/mapeo/UI y revisar el diff por PR. Interpretaciones sustantivas pendientes no se aprueban por IA ni por el detector. La publicación sigue el procedimiento de artefacto validado y autorización del propietario; nunca publicar automáticamente desde el monitor.

## Verificación y recuperación

Pruebas en `lib/parliamentary-normative.test.ts` y `scripts/normative-monitor.test.mjs`; navegador con `scripts/verify-normative-context.mjs`. Recuperación: revertir el commit de catálogo/componente al último estado verificado, conservando documentos y candidatos. No borrar R2, cambiar ETL ni fabricar fechas de vigencia. Los importes financieros se validan por separado en `verify-financial-identity.mjs`.

## Presentación compacta — 22-11-2026

`parliamentary-normative-presentation.ts` es un adaptador de presentación: no modifica catálogo, vigencias, mapeo de glosas ni monitor. El panel compartido presenta un concepto y un tramo normativo por vez; sólo descripción y disposiciones particulares, con pestañas no vacías. Las excepciones de cada concepto se mantienen. Si el rango cruza una modificación, se identifica el tramo mostrado sin aplicarlo al período completo. Sin fecha se prioriza la versión más reciente del catálogo; antes de la cobertura no se aplica una norma posterior.

Metodología contiene **Normativa y fuentes**, con reglas generales, citas de secciones/páginas, originales, historial y metadatos de verificación. El selector documental conserva el vínculo `?norma=<id>`; las referencias a reglas generales desde un período histórico mantienen su versión. Se conserva el ancla anterior `#catalogo-normativo` y se añaden `#normativa-y-fuentes` y `#reglas-generales`. Los paneles no reproducen reglas comunes ni bibliografía; usan enlaces discretos.

La actualización continúa en el mecanismo existente, sin consultas dinámicas nuevas ni activación remota. Pruebas de presentación en `lib/parliamentary-normative-presentation.test.ts`; navegador `scripts/verify-normative-context.mjs`, evidencia en `artifacts/normative-presentation/`. [Entrega y evidencia](../../../tasks/dashboard/entrega-normativa-presentacion-20261122.md).

## Precisión de alcance — revisión posterior del 22-11-2026

Se revisaron los diez conceptos y sus veinte definiciones históricas contra las resoluciones originales 11 y 12. El catálogo `2026-11-22.1` añade condiciones con título, ámbito y referencias particulares; conserva vigencias, IDs, documentos, selección temporal y monitor. El adaptador compartido entrega estas definiciones y ya no sustituye frases mediante reglas literales. Los paneles mantienen su diseño: una condición desplegada inicialmente y las demás consultables por subtítulo. Las citas completas por condición y las exclusiones se consultan en Normativa y fuentes.

El 25 % corresponde al conjunto de contratos de expertos, sobre la asignación de personal con reasignaciones autorizadas; no es un tope salarial individual ni se infiere la categoría contractual a partir del cargo. Se conserva el rótulo y monto originales de cada registro. El bloque público que calificaba como exceso la diferencia numérica contra la base fue retirado de PersonalApoyoMensual; sus sumas, contratos de datos, cálculo interno y ETL no se modificaron. Una evaluación jurídica individual requiere antecedentes adicionales.

Se distinguen, entre otros, el límite de mantenimiento por vehículo propio/año, las excepciones de neumáticos y parabrisas, el límite agregado exclusivo de taxis/aplicaciones en Res12, viático del parlamentario frente a gastos de personal, contratación conjunta, autorizaciones y avisos previos, y restricciones electorales por modalidad. No se trasladan reglas posteriores a Res11. La cobertura sigue siendo de disposiciones seleccionadas, sin certificar todos los reglamentos corporativos u oficios complementarios.

[Plan y aceptación](../../../tasks/dashboard/normativa-precision-20261122.md) · [Matriz de referencias exactas](../../../tasks/dashboard/normativa-precision-referencias-20261122.md). Verificación adicional: `lib/normative-precision.test.ts` y `scripts/verify-normative-precision.mjs`.

[Entrega de precisión y validación final](../../../tasks/dashboard/entrega-normativa-precision-20261122.md): 2.183 pruebas, 96 comprobaciones de navegador, build estático y conservación financiera por checksum. Artefacto local de código `3c65cba2`; sin publicación remota.
