# Matriz inicial por página e indicador

Fecha: 2026-10-07. Referencia en [README](README.md). Cada fila requiere evidencia,
fórmula/código, pruebas y destino para cerrarse. Mantener no significa cobertura total.

| Área | Unidad y evidencia | Comprobación / límite | Decisión inicial |
| --- | --- | --- | --- |
| Home | Catálogo; filas, no personas | Sumas compatibles sin doble conteo; sin promesas nacionales | Sólo contadores reconciliados |
| Movimientos | Eventos + señales; release `2e3c65a3…` | 46+5=51; seis pendientes, no 46 decretos | Mantener total y niveles separados |
| Movimientos: fechas | Fuentes identificadas por caso | Seis verificaciones anteriores a una fuente citada | Fecha/reemplazo no probado en revisión |
| Votaciones | Nominales por cámara; parlamento `5c4a4477…` | Denominadores por opción; Senado reciente incompleto | Mantener corte sin prometer últimas sesiones completas |
| Análisis: asistencia | Actas de sesiones | Presencia formal no equivale a voto emitido | Etiqueta/fórmula propia para cada componente |
| Partidos: cohesión | Votos + pertenencia temporal | Partido actual no acredita afiliación histórica | Limitar período o retirar agregado sin respaldo |
| Partidos: gastos/apoyo | Rendiciones y contratos | Mismo mes; filas no son dotación actual | Rankings no comparables en revisión |
| Fichas: costo | Dieta, gastos, apoyo por período | Sin constantes por defecto ni nulos como cero | Componentes acreditados; total parcial si corresponde |
| Gastos | Rendiciones mensuales; `e0695ed8…` | Consultabilidad no valida cada comprobante histórico | Mantener alcance por cámara/mes |
| Personas/remuneraciones/funcionarios | CPLT, 38 bis, Congreso separados | Registro no garantiza sueldo completo ni identidad por nombre | Fuente, organismo, período y valor original |
| Municipalidades | Titular, nómina, SINIM/INE; `59c30199…` | Autoridad vigente separada del pago histórico; muestra no universal | Mantener fichas y advertencias específicas |
| Servicios | DIPRES y organismo; `6afda00e…` | Presupuesto vs ejecución, año y moneda | No convertir agregado en pago personal |
| Transferencias | Ley 19.862; `4c77ffea…` | Corte integrado no equivale a universo nacional | Mantener alcance medido |
| Cruces/entidades | Identificadores + documentos | Coincidencia de nombre/fecha no prueba relación causal | Relación no respaldada en revisión |
| Rankings/comparar/calculadora | SERVEL y fuentes del indicador | Elección/corte/denominador; escenario no es gasto real | Sólo comparación reproducible |
| Lobby/DIP/Contraloría | Categorías y documentos separados | Registro no prueba influencia, conflicto o culpabilidad | Alcance contextual y vínculo documentado |
| ChileCompra | Corte existente; `87f9b0b7…` | Contadores/universo pendientes | Aviso; sin nueva carga ni ranking anual |
| Datos/Fuentes/Metodología | Resumen del release construido | Denominador defendible o no medido | No etiquetar fixtures como corte vigente |

Los IDs abreviados se resuelven con el ReleaseSet cuyo SHA completo está en README.
Cada cierre agregará período, fórmula, referencia exacta, resultado y limitación.
Una referencia genérica al portal no acredita cifra, causa ni conclusión normativa.

## Decisiones implementadas y prueba reproducible

| Indicador | Cambio local | Evidencia de cierre local | Pendiente |
| --- | --- | --- | --- |
| Dieta sin registro en catálogo parlamentario | Retirada constante; En revisión | `lib/defensible-indicators.test.ts`, SSR | Preview y conciliación completa por período |
| Apoyo mensual por bancada | Retirado sumatorio histórico y enlace por nombre parcial | Mismo test; datos individuales originales conservados | Reconstruir sólo tras identidad y meses comparables acreditados |
| Votos/gastos agregados de bancada | En revisión, sin serializar dashboards/rankings cuestionados | `lib/defensible-pages.test.ts`; receta de agregado no individualizada en pin | Acreditar entradas y pertenencia temporal; no reactivar por aviso |
| Confirmación legal de movimiento | Referencia exacta y fecha coherente o confirmación documental en revisión | Test de enlace genérico y documento individualizado | Leer cada documento; enlace válido no certifica contenido |
| Ranking electoral vacío | En revisión, sin cifra ni sincronización ficticias | `lib/prelaunch-fixes-15.test.ts` | Conjunto respaldado de esa elección |
| Avisos por ruta | 21 layouts SSR y Home, estado/corte con significado específico | `lib/publication-scope.test.ts`, `lib/defensible-pages.test.ts` | Render real; no significa que todos los indicadores pasaron |

Las filas restantes mantienen decisión de cobertura limitada, **sin cierre de
comprobación completa**. El reporte CI de aritmética de votaciones no demuestra
por sí solo que cada voto nominal coincida con el acta original.
