# Nómina municipal — Abel Becerra Vidal, Tortel

Revisión focalizada realizada el 10-10-2026. No representa una auditoría de
otras personas ni de las 346 municipalidades.

## Lo que demuestra la evidencia disponible

- La consulta paginada de producción
  `GET /api/funcionarios?scope=municipal&query=Abel%20Becerra%20Vidal&limit=25`
  devolvió una coincidencia desde `sourceStatus=r2-search`: Abel Becerra Vidal,
  Municipalidad de Tortel, cargo informado “Alcalde”, período `2025-01`, monto
  bruto `$468.212`, líquido `$410.021`, grado 5 y fecha de ingreso `2021-06-28`.
  El registro enlaza a la planilla CPLT `TA_PersonalPlanta.csv`.
- La misma respuesta indica `countUnit=records` y
  `completeMonthlyPayroll=false`. Es una fila publicada para un período, no una
  nómina completa ni prueba de que la persona ocupe hoy el cargo.
- La ficha productiva de Tortel (`/municipalidades/tortel/`) muestra a Marisela
  Jiménez Cruces como autoridad documentada, revisada el 05-10-2026. El sitio
  oficial municipal también la identifica como alcaldesa y la Cuenta Pública
  2026 la señala como autoridad máxima actual.
- El portal oficial del CPLT responde `HEAD 200` para la planilla vinculada,
  con `Content-Length: 8.711.747.533` bytes y `Last-Modified: 2026-10-04`.
  No se descargó el CSV de 8,71 GB. Por eso este control confirma la fila que
  publica la proyección R2 y el vínculo declarado, pero **no** coteja el registro
  contra la línea original del CSV.
- La guía operativa oficial del CPLT aclara que las planillas de marzo de 2025
  hacia atrás muestran la remuneración bruta mensualizada, pese al nombre de la
  columna. Esto aplica al período `2025-01` del registro y contradice el aviso
  previo que decía que no acreditaba un mes completo. La guía explica la unidad
  de publicación, pero no verifica por sí sola que la fila de Abel esté bien
  capturada ni explica el nivel del monto.

## Decisión de presentación

La tarjeta productiva ya no rotula la cifra como “Sueldo Bruto Mensual”. Indica
“Monto bruto reportado” y el período. El cambio adicional en preparación
reemplaza la advertencia incorrecta de “mes completo” por la aclaración CPLT de
remuneración mensualizada para períodos hasta marzo de 2025, con enlace a la
guía oficial; no cambia ni recalcula el monto ni atribuye una causa al valor.
La ficha comunal y el pago histórico permanecen separados. El primer cambio
quedó en producción el 10-10-2026 mediante PR #733, deployment
`9fed560c-f599-47a2-8c65-002ef6c7034b`; la aclaración CPLT aún no está
promovida. No se ejecutó ETL ni se modificaron releases R2.

## Pendiente para cerrar este hallazgo por completo

Solicitar o conseguir una extracción oficial acotada del período 2025-01 para
Tortel, o un endpoint que permita consultar la fila sin recorrer el archivo de
8,71 GB. Hasta entonces no afirmar que `$468.212` sea el sueldo íntegro del mes,
una liquidación final, un error de origen o un pago post término. Tampoco estimar
cuántos casos similares hay en otros municipios: no se hizo un barrido nacional.

Fuentes oficiales:

- [Portal CPLT — planilla de personal de planta](https://consejotransparencia.cl/transparencia_activa/datoabierto/archivos/TA_PersonalPlanta.csv)
- [CPLT — guía operativa, montos anteriores a abril de 2025](https://www.consejotransparencia.cl/portal-de-transparencia/guia-pte-publicacion-remuneraciones/)
- [Municipalidad de Tortel — alcaldesa](https://www.tortel.cl/alcaldesa/)
- [Municipalidad de Tortel — Cuenta Pública abril 2026](https://www.tortel.cl/wp-content/uploads/2026/05/CUENTA-PUBLICA-ABRIL-2026.docx.pdf)

Sin escrituras R2, D1 ni descarga del universo fuente.
