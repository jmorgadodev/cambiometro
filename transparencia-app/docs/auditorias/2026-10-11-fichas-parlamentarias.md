# Auditoría acotada de fichas parlamentarias — 11-10-2026

## Pregunta y alcance

Tras el falso cero de personal de apoyo de Paz Charpentier, se comprobó **release R2 → página productiva** para los 205 parlamentarios del catálogo vigente: personal de Cámara y Senado, y dieta bruta. Se revisó además si otros lectores podían confundir un subset con el universo. No se reextrajeron las 155 fichas oficiales ni se escribió en R2 o D1.

Esta auditoría **no certifica todas las fuentes ni cada documento original**. Un checksum acredita integridad de bytes, no veracidad de una fila frente al organismo emisor.

## Evidencia y resultado

| Control | Universo comprobado | Resultado | Límite |
| --- | ---: | --- | --- |
| Personal de apoyo Cámara | 155 diputados vigentes, 1.094 filas de septiembre 2026 | 155 páginas HTTP 200; 1.094/1.094 nombres y montos visibles coinciden con R2; período presente; cero mensajes falsos de «Sin contrataciones». | No equivale a cotejo individual de las 1.094 filas con el portal oficial en esta fecha. |
| Personal de apoyo Senado | 50 senadores vigentes, 419 filas del último mes, septiembre 2026 | 50 páginas HTTP 200; 419/419 nombres y montos visibles coinciden con R2. Las 50 oficinas se identificaron sin empate en el release. | No certifica las 2.883 filas de otros meses asociadas a esas oficinas ni las demás oficinas antiguas del release. |
| Dieta bruta parlamentaria | 205 fichas del catálogo, junio 2026 | 205 páginas HTTP 200; 205/205 montos y rótulos de junio coinciden con el insumo de la ficha. Sus 205 filas coinciden exactamente con el histórico R2 de junio para «Congreso Nacional». | Es un corte **junio**, no la remuneración vigente demostrada para octubre. El release público 38 bis tiene julio (1.591 filas totales, 158 del Congreso) y no se trasladó automáticamente a estas fichas. |
| Partidos: lista de votaciones | 21 categorías del subset | 18 tienen 10 votaciones en el subset, mientras el archivo local amplio contiene más de 10. El componente de detalle contiene controles 10/25/50, pero `PARTY_AGGREGATES_REVIEWED = false` impide que ese componente se muestre en producción. La ficha UDI productiva respondió HTTP 200 con «Comparaciones de bancada: En revisión» y sin el control de 50. | El archivo amplio no está individualizado en el `ReleaseSet`: no se acredita que sus 100 entradas por partido sean un release canónico vigente. La restricción pública actual es correcta, pero la funcionalidad completa permanece pendiente. |

**Causa adicional en Partidos:** `scripts/build-lake-subsets.mjs` recorta explícitamente `votaciones` a 10; ni ese subset ni `partidos-stats.json` están en `STATIC_SITE_FILE_GROUPS`, por lo que el `ReleaseSet` no fija sus bytes. Los workflows de Cámara y Senado publican `politicos-votaciones.json`, pero no regeneran ni publican la estadística partidaria. El archivo amplio local muestra como primera votación de UDI, RN y REP el 12-08-2026, mientras su entrada local de sesiones llega al 19-08-2026; por tanto, ni siquiera el fixture amplio acredita frescura. Además, el generador asigna el partido actual de cada parlamentario a sesiones históricas y usa «No Vota» cuando falta voto nominal: no debe ejecutarse y promocionarse sin resolver pertenencia temporal y ausencia de datos. Esta discrepancia es independiente del personal de apoyo corregido.

El manifiesto R2 de personal de apoyo fue consultado nuevamente y conservaba el SHA-256 `adb13dc030e1fae3e8d7ea106db5417440e973ed8f139464e31529f55c5925ef` (generado el 11-10-2026 14:17:55 UTC). El objeto de 1.420.180 bytes contiene 160 IDs de diputados, de los cuales los 155 del catálogo vigente están presentes; el subconjunto histórico no se sumó al universo vigente. El mismo objeto contiene 70 oficinas senatoriales y 3.827 filas de distintos períodos; no se sumaron esos registros históricos como personas o pagos del mes.

Procedimiento reproducible: leer sólo el manifiesto y `personal-apoyo.json` de `projections/personal-apoyo-v1/`, comprobar SHA-256, asociar diputados mediante `data/diputados-ids.json` y slugs canónicos de `lib/politico-slugs.ts`, y asociar senadores mediante el match único de oficina de `lib/personal-apoyo.ts`. Consultar las 205 rutas productivas con concurrencia máxima de cinco y comprobar en el HTML visible (sin scripts) el período, cada nombre y el monto CLP próximo a ese nombre. Para dietas, contrastar las 205 filas `Congreso Nacional` de junio de `projections/remuneraciones-38bis-v1/current-history.json` con `data/remuneraciones-38bis.json` y la etiqueta/valor de cada ficha. No usar D1 ni descargar nuevamente los documentos de origen.

## Por qué pasó el incidente

La validación previa certificaba el archivo R2 y ejemplos de diputados dentro de los primeros 20 IDs. El lector de la ficha consultaba esa muestra —o el caché D1— y convertía «ID ausente de la muestra» en «0 personas». La [corrección y su prueba](../incidente-personal-apoyo-paz-2026-10-11.md) hacen que la ficha lea primero el release completo. La auditoría de esta página amplía la verificación productiva de un caso a todos los parlamentarios vigentes para ese componente.

## Pendientes de credibilidad, en orden

1. **Partidos:** mantener el agregado en revisión y sin controles 25/50 visibles hasta publicar/hidratar un índice completo con release y checksum, y resolver la pertenencia temporal. No promover el archivo amplio sólo porque existe en Git.
2. **Dieta de fichas:** explicitar que junio es el corte de la dieta individual mostrado; reconciliar julio por persona antes de actualizarlo. La igualdad de 205 filas con junio R2 no prueba vigencia posterior.
3. **Paridad con la fuente:** para acreditar que las 1.513 filas de personal visibles (1.094 Cámara + 419 Senado) son iguales a los documentos originales, se requiere conciliación oficial por período e ID. La prueba R2 → página no sustituye esa etapa.
4. **Guarda de publicación:** incorporar una comparación automática de todos los IDs activos y sus filas al build de Pages, no sólo pruebas de muestra, para impedir que reaparezca un falso cero. Mantener la prueba de regresión de ID Cámara 1198.

No se asigna un porcentaje de exactitud global al sitio a partir de estos resultados. Los controles que pasaron respaldan **consistencia de publicación dentro del corte indicado**; Partidos y frescura de dietas tienen decisiones pendientes.
