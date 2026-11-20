# Evidencia local · Dietas parlamentarias

> Actualización 19-11-2026: los estados de publicación pendiente de este informe son históricos. La entrega #848 ya fue publicada y verificada; consultar [estado conciliado y recibo](../consolidacion/estado-fases-20261119.md). Conservar esta evidencia sin repetir extracciones o comprobaciones ya aprobadas. Los seguimientos operativos se registran en el tablero vigente.

18-11-2026, America/Santiago. [Plan](plan.md), [recibo y huellas](local-evidence.json). Incremento local; sin ETL, red de origen, R2, CI ni despliegue.

## Cambios

- La proyección anterior saltaba del mes actual al último corte completo de 205 filas e ignoraba los meses parciales intermedios. Ahora cada parlamentario conserva su última observación oficial positiva y su mes real. Un dato nuevo ausente, null o cero no borra esa referencia.
- Una corrección del mismo mes que pierda una dieta positiva se retiene con 38BIS_CONGRESS_REFERENCE_LOSS antes de publicar; se conserva el release anterior para revisión. No se fuerza el candidato ni se rebaja el importe.
- Sólo se admiten cargos parlamentarios y de sus mesas, por cámara. No se usa un cargo administrativo del Congreso como dieta. No se presume que todos los cargos tengan el mismo importe ni se aplica un reajuste a otras personas sin respaldo.
- Meses inválidos/repetidos, identidades ambiguas, cambio de cámara e importes no enteros/seguros quedan retenidos.
- El parser ya no interpreta «No reportado 2026» como 2.026 CLP ni transforma signos o separadores inválidos en otro monto. Conserva el texto y su estado de fuente.
- La salida compatible del ETL utiliza la misma proyección que la hidratación de R2; calcula antes de escribir sus artefactos. El costo mensual mantiene los componentes en su mes, separando la referencia de dieta de un pago confirmado para otro período.

## Verificación

39 pruebas en cinco archivos, lint sin errores y tipos aprobados. Dos advertencias previas de variables _periodo sin uso; no ampliadas por este cambio. Se cubren el criterio de Jorge, importes y fechas, fuentes faltantes, cortes intermedios y costo mensual sin mezclar meses.

Las fixtures locales se identifican como tales en el recibo; no sustituyen el release vigente de producción. No se reconstruyó el sitio ni se descargaron snapshots para repetir controles.

## Entrega pendiente

Reutilizar estas pruebas y huellas al integrar con Personal y las siguientes mejoras. Cuando Jorge solicite publicar, comprobar el bundle 38 bis vigente de R2, validar las fichas de Bianchi/Kaiser y la referencia visible de dieta, y promover el artefacto agrupado. Un reajuste oficial se revisa con su fuente y período; ausencia de observación no equivale a modificación ni a cero. El cierre operativo publicado sigue pendiente.
