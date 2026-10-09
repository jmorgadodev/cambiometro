# C03 · Personal de apoyo Senado · septiembre de 2026

Continuación del pendiente de concordancia por autoridad/período; no una nueva
auditoría nacional ni certificación de contratos o pagos bancarios.
Worktree canónico `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`;
rama retomada `codex/confianza-evidencia-20261007`, alineada con main `7ca4ca9e`.

## Resultado cerrado

El 08-10-2026 a las 11:25 UTC, una consulta válida al
[endpoint oficial del Senado](https://web-back.senado.cl/api/transparency/senator-assignments/support-staff?filters%5Bano%5D%5B%24eq%5D=2026&filters%5Bmes%5D%5B%24eq%5D=9&pagination%5BpageSize%5D=500&pagination%5Bpage%5D=1)
devolvió 420 filas de septiembre y 51 oficinas en una sola página, 273.891 bytes.
Se reutilizó el parser y la guarda de IDs oficiales existentes; no se siguió
ninguna página adicional. Una primera consulta diagnóstica tenía la envoltura
interpretada incorrectamente: se corrigió el comprobador, no los datos.

420/420 filas coinciden con el snapshot productivo por oficina, año/mes, nombres
originales, cargo, monto y calidad jurídica, conservando tipos y multiplicidad.
Cero montos ausentes; tres montos cero explícitos, preservados. Cero duplicados
exactos por esos campos. Esto no prueba 420 personas únicas ni mensualidades
completas. El total de 51 oficinas no implica 51 senadores vigentes.

Snapshot SHA `e59e787a7bf4d1149061fbc47591a0ab5254962425b6055aa48daa8fe2b4072d`;
respuesta oficial SHA
`d49d00bec22ac77cbf417b31595a5852dbc41a7612915deb78cbeed8592b2e92`.
Evidencia local y receta `.ci-confianza-audit/senado-septiembre-source-check-20261008.{mjs,json}`.
La receta lee el artefacto conservado de Actions `37767503461`; no accede a D1
ni escribe R2. Dos GET oficiales contando el diagnóstico previo. Una repetición
futura puede detectar correcciones del origen: no debe ajustar el resultado
para forzar coincidencia.

El corte completo actualizado suma 3.827 filas Senado enero–septiembre y 1.084
Cámara preservadas. Sólo septiembre se contrastó exhaustivamente por campos
con el endpoint en esta comprobación; no extrapolar 420/420 a todos los meses.
En Pedro Araya septiembre: nueve filas, suma de `monto` $13.730.597, no sueldo
del senador. Cuatro pruebas de navegación en producción aprobaron último mes
y regreso a agosto, móvil/escritorio, sin solicitudes API/D1.

## Próximos pendientes, sin reabrir este cierre

1. C03: comprobantes originales y conciliación de dieta/gastos por autoridad y
   período; este cotejo de apoyo no respalda otros componentes del costo.
2. Cámara: bloqueo externo conserva el último release; no prometer septiembre.
3. C02: actas nominales y pertenencia temporal de partidos.
4. Validar de nuevo la combinación del PR #719 antes de cualquier promoción.
5. C05: respuesta de elegibilidad/adopción institucional requieren intervención
   humana; documentos preparados no son políticas adoptadas.

Concordancia del corte: cerrada. C03 permanece 75%, avance ponderado global 83%
(83,75% de entregables), no porcentaje de exactitud. No se publican investigaciones
ni se reactivan ChileCompra o votaciones Senado remotas.
