# Refinamiento final del explorador — entrega local 21-11-2026

## Cambios y alcance

Se conservan las cinco vistas, el diseño del sitio, fotografías, modelo financiero, fuentes publicadas, proyección estática, carga diferida, caché, integridad y exportaciones. La ruta sigue siendo `/dashboard/`. No se añadieron dependencias ni se cambiaron ETL, API, R2, D1, Workers, calendarios o sistemas editoriales.

La institución se cambia directamente entre Ambas cámaras, Diputados y Senado. El período ofrece Un mes con meses publicados por institución o Rango con Desde/Hasta juntos; el rango sigue visible en encabezado y chips. Los filtros de regiones, distritos, partidos, parlamentarios, componentes, categorías, ítems y cargos permanecen en el panel avanzado. Las fechas efectivas se conservan en la URL; un cambio de modo no inventa datos.

Comparar agrega de forma progresiva, no navega ni aplica filtros globales. Usa el estado actual de URL para evitar pérdidas por cierres de render; marca En comparación, evita duplicados y actualiza el contador accesible. Se pueden quitar participantes individualmente. Los filtros contextuales múltiples agregan a la selección existente; restablecer filtros vacía explícitamente sus arrays y conserva la comparación. Se incluye acceso a Agregar parlamentarios cuando esa selección está activa.

Comparaciones rápidas con selección fotográfica compacta, gráfico común y tabla completa. Categorías y evolución de cada participante se abren bajo demanda. Los resultados monetarios se ordenan numéricamente; los paneles usan mayor a menor y los registros mantienen su orden configurable.

## Personal de apoyo

Se eliminó Composición de los equipos y su explicación permanente. Se conservan los tres indicadores superiores: parlamentarios incluidos, monto informado y registros. Los gráficos muestran Montos informados por cargo y Personal de apoyo por parlamentario, ambos descendentes por monto.

El detalle de cargo contiene monto, período, registros, equipos relacionados y respaldo. El detalle de equipo/mes muestra cargos, montos, registros y, sólo cuando procede, Integrantes identificados en la nómina. La cifra es nominal y acotada al equipo/mes consultado: exige nombres completos, una observación por nombre y ninguna repetición normalizada. No deduplica personas ni contratos por semejanza. Se omite si hay nombres ausentes, repetidos, varias observaciones sin resolver, varios equipos o meses, o una selección parcial por cargo/ítem/categoría. No se suman nóminas de varios meses como personas únicas. La explicación completa está en Fuentes y alcance y en la documentación del módulo.

## Caso 205 frente a 204

El registro omitido es `sen-030`, **Paulina Vodanovic Rojas**. En el release verificado, la oficina fuente se llama `VODANOVIC PAULINA`; el catálogo incluye también ROJAS. La asociación actual de Senado exige todos los tokens del nombre y una coincidencia exclusiva, por lo que no acepta esa oficina incompleta.

La fuente sí contiene 73 observaciones bajo esa etiqueta, 63 en marzo–septiembre: marzo 9, abril 9, mayo 8, junio 8, julio 9, agosto 10 y septiembre 10. Es una limitación de asociación, no prueba de que no exista equipo. No se reasignaron observaciones por similitud ni se modificó la extracción para igualar los totales. Confirmar la equivalencia mediante un identificador/documento oficial y actualizar coordinadamente los consumidores financieros queda como corrección de datos separada. Esta entrega conserva los importes ya conciliados.

Evidencia: `artifacts/dashboard-refinement/support-association-evidence.json`. Entrada publicada: `data/personal-apoyo.json`, SHA-256 `adbccbd537e3c2126a8d649d6680395fda36d9a6a213cce58a4a2db9f1a016f4`, snapshot 2026-10-12. La evidencia sólo identifica la etiqueta de oficina; no se publica un supuesto identificador personal.

## Detalle y evolución

Los paneles de categoría, ítem, cargo y equipo responden a su selección y evitan componentes ajenos o listas generales de parlamentarios. Los desgloses y registros se presentan descendentes por monto; los nulos quedan al final. El registro individual prioriza nombre, equipo, cargo, mes, monto y fuente. ID, fechas de captura/snapshot, release y metadatos del respaldo quedan cerrados en Datos del respaldo.

La evolución muestra una serie por defecto y botones para Gastos, Personal, Asesorías o Dieta de referencia. Cada componente usa su escala monetaria, línea suave sin sobrepasar los valores de los puntos, tooltip y detalle mensual; el mes se aplica sólo mediante la acción explícita. La dieta sigue etiquetada como referencia fija estimada. No hay promedios ni variaciones porcentuales. Los gráficos se adaptan al ancho real, incluido móvil, y conservan SVG.

## Verificación

Pruebas integradas: 334 archivos y 2.138 tests aprobados, incluidos tipos de aplicación/API, controles estáticos, compatibilidad de filtros, integridad/caché y nuevas pruebas de selección progresiva y conteo nominal. Lint del módulo y scripts afectados: código 0, sin errores. La prueba de alcance mantiene la etiqueta referencia fija estimada.

Reproducción independiente RED sobre la versión anterior: faltaba el control principal de institución. Durante la prueba de progresión también se reprodujo y corrigió la conservación indebida de filtros al restablecer. Se añadió una reproducción que falla al usar Atrás con la serie anterior: se corrigió eliminando el estado local como prioridad cuando la serie está controlada por la URL. La prueba final de navegador en desarrollo pasa 52/52 controles, cinco vistas sin violaciones axe y sin excepciones.

Build final `npm run pages:build`: código 0, 4.886 páginas y todos los controles de exportación aprobados. Navegador estático final: 52/52 controles, cinco vistas sin violaciones axe; cero excepciones, errores de consola, solicitudes fallidas, infracciones CSP o llamadas API/D1. La corrección de historial posterior a la suite integrada se comprobó además mediante build/tipos, lint y la regresión real Atrás/Adelante.

[Recibo resumido y huellas del artefacto](refinamiento-validacion-20261121.json). Evidencias locales: `artifacts/dashboard-refinement/`, incluidos logs, recibos, CSV/SVG y capturas. No se reemplaza una auditoría WCAG completa ni una prueba en hardware móvil físico.

## Capturas reales

`artifacts/dashboard-refinement/screenshots/` contiene las cinco vistas de escritorio y móvil: `desktop-{panorama,explorar,comparar,personal,registros}.png` y equivalentes `mobile-*`. Paneles: `desktop-filtros.png`, `desktop-categoria.png`, `desktop-cargo.png`, `desktop-equipo-mes.png`, `desktop-mes.png`, `mobile-filtros.png`, `mobile-detalle.png`. Se revisa 1366×1000 y 390×844, con controles adicionales a 360/768/1920. Las capturas de desarrollo se reemplazan por las del export estático final; no son maquetas.

## Datos y rendimiento

Release conservado: `c0f178e56987fa51aee4554fea47c315c678df71a8b9ac14ca51d5cead709e14`. Proyección conservada: `1595fcac3fb0f20e1e10819c9d5b14ba5958be5c5b308893ebeaabd0de5aa854`. Las 3.474 combinaciones parlamentario/mes/componente vuelven a conciliar exactamente con el modelo anterior. Bootstrap idéntico de 1.030.117 bytes; 41 particiones con el mismo detalle de 23.943.485 bytes. No cambian los hechos ni sus importes.

El ajuste no añade consultas dinámicas. Se verifica ausencia de API/D1 en los flujos y se conserva caché/SHA/release. La lista de meses se memoiza por dataset/cámara y usa un índice de instituciones; evita buscar el parlamentario para cada hecho en cada render. El payload principal del export anterior era de 1.063.253 bytes decodificados / 146.187 Brotli local; el refinado mide 1.063.179 / 145.716. El HTML final mide 36.762 bytes. No hay descarga inicial de particiones de detalle en la captura. Son diferencias de interfaz, conservando el bootstrap y las particiones; no se añade un motor gráfico o dependencia nueva. El recibo registra el subtotal same-origin completado y sus límites; no lo presenta como peso total definitivo de la página. Ambos servidores de laboratorio usan Brotli calidad 4; no es una medición RUM ni promesa de tiempos o facturación de producción.

## Rama, commits y revisión local

Raíz canónica: `C:\Users\jorge\Proyectos\cambiometro-public`. Rama `codex/dashboard-explorador-20261121`. Base del refinamiento `3912ce46`; código de este refinamiento `19e4af32` y corrección de historial `cce21fb5`. El commit de cierre añade sólo evidencia/documentación. Sin push, PR ni despliegue.

Abrir http://127.0.0.1:3201/dashboard/ con el servidor `node scripts/preview-parliamentary-explorer.mjs`. Para repetir la aceptación: `EXPLORER_QA_BASE=http://127.0.0.1:3201` y `node scripts/verify-explorer-refinement.mjs`. La comprobación de límites conserva `verify-parliamentary-explorer-boundaries.mjs`.

Este export es de revisión local. Las cuatro entradas financieras se hidrataron reversiblemente desde caché con checksums publicados y se restauraron con sus backups SHA-256 verificados; no se comiten los datos. Otras fuentes ajenas no se hidratan integralmente para esta tarea. La publicación futura requiere aprobación y el flujo vigente pages-ui-refresh con todo el release fijado, build publicado sin overrides locales, preview y promoción del mismo artefacto. Se conserva el destino anterior para rollback; no desplegar el árbol modificado ni este export de laboratorio.

Revisión visual final del export: las cinco vistas, filtros y detalles de categoría, cargo, equipo/mes y período; composición compacta en Comparar, etiquetas y barras legibles, datos técnicos cerrados y ausencia de desbordes. El servidor local quedó disponible en 3201.
