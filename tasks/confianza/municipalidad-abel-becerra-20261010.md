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
- La consulta oficial acotada por rangos leyó 1.180.224 bytes en 23 solicitudes,
  validó el ETag durante la consulta y encontró la fila original de enero de
  2025: `MU326`, página CPLT `61143682`, bruto `468212,0`, líquido `410021,0`,
  cargo `ALCALDE`, fecha de ingreso `2021/06/28`, término `Indefinido` y
  publicación `2026/09/07`. El parser devuelve los mismos montos que API/R2.
  No se descargó el CSV de 8,71 GB.
- La misma fuente publica para Abel $3.464.016 brutos en diciembre de 2024 y
  $7.426.023 en noviembre de 2024. Esto confirma que la cifra baja de enero ya
  estaba en el origen; no explica su causa.
- La guía operativa oficial del CPLT aclara que las planillas de marzo de 2025
  hacia atrás muestran la remuneración bruta mensualizada, pese al nombre de la
  columna. Esto aplica al período `2025-01` del registro y contradice el aviso
  previo que decía que no acreditaba un mes completo. La guía explica la unidad
  de publicación, pero no verifica por sí sola que la fila de Abel esté bien
  capturada ni explica el nivel del monto.

## Decisión de presentación

La tarjeta productiva indica “Monto bruto reportado” y el período. La aclaración
CPLT sobre la mensualización de períodos hasta marzo de 2025 y el enlace a la
guía oficial quedaron en producción mediante PR #735, deployment
`f462fa5f-a152-45f2-baea-edaa39ec7528`. El valor no se recalculó ni se le
atribuyó una causa. La autoridad comunal vigente y el pago histórico permanecen
separados. No se ejecutó ETL ni se modificaron releases R2 o D1.

## Pendiente para cerrar este hallazgo por completo

Para explicar por qué el organismo publicó `$468.212` en enero de 2025, se
requiere una aclaración o respaldo adicional de Tortel/CPLT. Hasta entonces no
atribuirlo a pago parcial, liquidación final, error municipal ni pago posterior
al término del cargo. La conciliación ETL–API–fuente sí está cerrada. Tampoco
estimar cuántos casos similares hay en otros municipios: no se hizo un barrido
nacional.

Fuentes oficiales:

- [Portal CPLT — planilla de personal de planta](https://consejotransparencia.cl/transparencia_activa/datoabierto/archivos/TA_PersonalPlanta.csv)
- [CPLT — guía operativa, montos anteriores a abril de 2025](https://www.consejotransparencia.cl/portal-de-transparencia/guia-pte-publicacion-remuneraciones/)
- [Municipalidad de Tortel — alcaldesa](https://www.tortel.cl/alcaldesa/)
- [Municipalidad de Tortel — Cuenta Pública abril 2026](https://www.tortel.cl/wp-content/uploads/2026/05/CUENTA-PUBLICA-ABRIL-2026.docx.pdf)

Sin escrituras R2, D1 ni descarga del universo fuente.
