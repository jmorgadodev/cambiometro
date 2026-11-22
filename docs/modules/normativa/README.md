# Catálogo normativo central

Datos públicos estructurados en `transparencia-app/data/normativa/catalogo.json`, resolución/versiones, vigencia por día, conceptos, supuestos incluidos, exclusiones expresas, condiciones, institución, referencias y fecha de verificación. Documentos originales inmutables en `documentos/`, con SHA-256 en catálogo. Res11: 01-09-2024 a 10-03-2026; Res12: desde 11-03-2026, según sus disposiciones de entrada en vigor. Los números de página de enlaces son del PDF; la sección identifica la disposición impresa.

Se sintetizan disposiciones seleccionadas verificadas en los originales, no toda instrucción o acuerdo complementario. Las definiciones históricas son snapshots propios. No se traslada retrospectivamente una regla de la versión posterior. Marzo 2026 cruza ambas vigencias: si sólo existe el mes, se presentan ambas versiones y no se asigna todo el mes a Res12. Fechas anteriores a las versiones verificadas carecen de definición aprobada.

`lib/parliamentary-normative.ts` concentra selección temporal y relación exacta glosa original→concepto. Una categoría visual no se trata como concepto jurídico. Glosas desconocidas, genéricas o anómalas no reciben restricciones de un ítem particular; puede consultarse únicamente el alcance general de asignaciones. Dieta queda fuera de este catálogo. No cambiar importe, categoría financiera ni fuente para añadir contexto.

El componente reutilizable `components/financial/NormativeInfo.tsx` abre un diálogo accesible desde fichas, categorías/ítems, comparación y registros. Metodología expone el mismo catálogo. Las reglas generales se distinguen de las específicas. No hay consulta API/D1/Workers al abrirlo, atribución de compras concretas ni evaluación automática de irregularidades.

## Detección y validación

`node scripts/normative-monitor.mjs` consulta el índice oficial y PDFs pertinentes, verifica origen/tamaño/tipo y calcula SHA-256. Guarda documentos nuevos o modificados y un informe `pending-validation` en `artifacts/normativa-monitor/`. Un documento no almacenado inicialmente también queda pendiente; no se presenta automáticamente como una nueva resolución. El alcance potencial se mantiene amplio cuando no puede determinarse por metadatos. El programa no interpreta el PDF ni modifica catálogo, vigencias o interfaz.

El workflow existente `source-calendar-monitor.yml` conserva su cron diario; el paso normativo se ejecuta los lunes a las 15:00 UTC o mediante workflow_dispatch. No añade cron ETL ni cambia fuentes pausadas. El candidato se conserva como artefacto 30 días. Un fallo de consulta no modifica la última versión pública; es visible en el paso de CI. Esta programación está preparada en la rama local: no se ha activado remotamente mediante push.

Para incorporar una modificación: conservar original+hash, verificar disposiciones y fecha de efecto, identificar conceptos afectados, crear nueva versión sin sobrescribir snapshots históricos, actualizar sólo definiciones respaldadas, ejecutar pruebas temporales/mapeo/UI y revisar el diff por PR. Interpretaciones sustantivas pendientes no se aprueban por IA ni por el detector. La publicación sigue el procedimiento de artefacto validado y autorización del propietario; nunca publicar automáticamente desde el monitor.

## Verificación y recuperación

Pruebas en `lib/parliamentary-normative.test.ts` y `scripts/normative-monitor.test.mjs`; navegador con `scripts/verify-normative-context.mjs`. Recuperación: revertir el commit de catálogo/componente al último estado verificado, conservando documentos y candidatos. No borrar R2, cambiar ETL ni fabricar fechas de vigencia. Los importes financieros se validan por separado en `verify-financial-identity.mjs`.
