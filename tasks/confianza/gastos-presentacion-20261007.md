# Gastos parlamentarios: cortes y agregado público · 07-10-2026

## Alcance

Continuación de C03, no una nueva auditoría nacional. Misma rama
`codex/confianza-evidencia-20261007`, worktree `codex-stabilizacion-20261001`.
Se revisa la interpretación en `/gastos-operacionales` y fichas parlamentarias.
No se ejecuta ETL, consulta D1 remota ni escribe/borra en R2. Originales intactos.

## Causa, decisión y prueba

| Hallazgo reproducido | Corrección precisa | Comprobación |
|---|---|---|
| `periodos`/`ultimoPeriodo` incluían cortes que el propio cálculo descartaba por falta de montos | Selector y último período se derivan de los meses efectivamente calculados | Mayo informado y junio nulo → sólo mayo; el registro de junio no se modifica |
| Regex aceptaba meses como `2026-13` | Reutilizar `isPublishedMonthPeriod` | Mes inexistente descartado; cero explícito de julio conservado |
| Variación contra el anterior disponible, aunque hubiera un mes ausente | Calcular variación sólo entre meses consecutivos | Abril–junio sin porcentaje; diciembre–enero sí compara |
| Resumen global sumaba `monto_clp` de todas las filas sin conciliación por autoridad, período e ítem | Retirar el total monetario de pantalla y props; «En revisión» con explicación | Registros, montos individuales, fuentes y filtros conservados |
| SEO prometía «universo completo» | Describir sólo gastos integrados y períodos disponibles | Regresión de metadata sin promesa nacional |
| Ficha podía mostrar acumulado $0 cuando ningún corte tenía monto calculable | «Monto no informado»; suma existente etiquetada como montos informados, no gasto exhaustivo | Caso sintético íntegramente nulo conserva ausencia frente a cero |
| Selector de período desbordaba a 320 px | Permitir ajuste del label/select sin cambiar diseño ni opciones | Desborde inicial 364/320 px; después dentro del viewport |

La suma bruta aparece en `scripts/build-static-site-data.mjs` como reducción
directa de `expenseRecords`; la UI la interpretaba como total monetario.
No se conoce todavía el exceso exacto ni se afirma que cada fuente tenga la
misma duplicación. No se corrige la cifra inventando un factor de descuento.
El resumen privado generado se conserva como original, pero el agregado no se
serializa a la página. Los contratos existentes conservan su campo opcional.

## Evidencia

- RED: cuatro regresiones fallaron antes de corregir; una comprobación de
  diciembre/enero ya pasaba. Sexta regresión nulos/ficha falló antes de corregir.
- GREEN: 30 pruebas dirigidas en cinco archivos, tipos y lint de archivos
  modificados aprobados. Sin pruebas desactivadas.
- Navegador aislado: 8/8 comprobaciones de gastos y ficha de Pedro Araya, a
  320/768/1024/1440 px; sin errores JavaScript ni desborde. Último mes inicial
  y cambio al año más antiguo comprobados mediante los controles visibles.
- API interceptada (16 peticiones): cero consultas D1 remotas y cero escrituras
  de datos. Las capturas muestran el estado de fallo intencional de API; no
  son prueba de conectividad o datos originales.
- Evidencia local: `.ci-confianza-audit/gastos-local/` y `gastos-browser.mjs`.
- Suite global local: 278 archivos y 1.620 pruebas aprobadas (código 0),
  incluyendo tipos de frontend/Worker, arquitectura, tokens, enlaces e innerHTML.
  Preview del código nuevo: pendiente. D1 remoto y publicaciones de datos no ejecutados.

## Qué no se certifica y próximo cierre

Pendientes: conciliar totales de fuente/desglose por autoridad y período;
contabilizar faltantes por componente; contrastar muestras con comprobantes
originales y verificar los meses declarados en el release productivo. No
convertir una suma parcial en total completo ni una fila en persona única.

Personal de apoyo y dieta permanecen separados del gasto rendido y se vinculan
por período en el contrato existente; esta corrección no certifica todos sus
contratos, identidades o pagos. No se anualizan meses ni se inventan sueldos.
El plan global permanece al 83%: cerrar estas regresiones no cierra todas las
fuentes ni la puerta documental restante de C03.
