# Movimientos — entrega local del 22-11-2026

## Resultado y base

Registro documental compacto sobre las conexiones, estados y fuentes existentes. Rama `codex/movimientos-registro-20261122`, base `8fcb53b1` (Votaciones cerrado y validado), origin/main obtenido `0cae8e73`. Código del artefacto: `ba7bf255`. No se hizo push, PR, despliegue ni ejecución manual del ETL.

- Encabezado breve, tres indicadores de la selección, búsqueda y filtros locales.
- Registro completo predeterminado: fecha con su significado, persona, tipo, cargo/institución, estado y detalle. Veinte filas por página, sin excluir el resto.
- Búsqueda sin diferencias de tildes/mayúsculas, parcial y por palabras en cualquier orden. Consulta nombres publicados, cargo, institución, región, descripción y referencias documentales.
- Tipo, institución, región, estado y motivo publicado admiten varias opciones. OR entre opciones de una categoría, AND entre categorías. Fechas juntas: mes, rango y todos los períodos; criterio de registro, publicación o efectiva informada.
- Orden cronológico descendente y ascendente; por nombre en el registro. La cronología mantiene siempre la secuencia temporal, incluso al llegar desde una selección ordenada por nombre. Las personas sin identificación normalizada van al final al ordenar por nombre.
- Chips de selección y restablecimiento. Los enlaces anteriores con q, tipo, ministerio, región, motivo, estado=verificado, verificado=true, vista=tabla y vista=timeline conservan su alcance.
- Cronología alternativa por mes; utiliza los mismos filtros, registros y paginación. No hay gráficos, rankings políticos, promedios de salidas ni contadores de días.
- Panel derecho con fuentes clasificadas, fechas, antecedentes e historial disponible. Escape, botón, cierre exterior, foco y desplazamiento conservados. Navegación anterior/siguiente dentro de la selección y URL individual mediante movimiento=ID-original.
- En móvil, filas compactas y panel inferior. Los filtros se contraen en un botón para dejar sitio al registro. Modo claro y oscuro mediante los tokens y el control de tema existentes.
- Metodología y actualización en «Fuentes y alcance», sin avisos técnicos extensos encima del listado ni explicaciones repetidas en cada fila.

## Reutilización y límites de alcance

Se reutiliza **VotingPanel** sin modificarlo: diálogo nativo, foco, Escape, bloqueo de scroll, cierre exterior y adaptación móvil ya validados. Los controles usan HTML nativo, el manejo de URL integrado de Next y los tokens tipográficos/cromáticos existentes. No se incorporan librerías, componentes financieros, API nuevas o servicios de pago.

Se retira PublicationScopeNotice únicamente del layout de Movimientos: sus precisiones se concentran en el panel documental y una frase breve en el HTML inicial y al pie del registro. No cambia el componente compartido, la navegación principal, globals.css ni otros módulos.

La referencia [Renuncias Kast](https://renunciaskast.cl/) se utilizó por la consulta mediante filtros y registros estructurados. No se trasladaron sus datos, identidad, clasificación editorial o contadores.

## Datos, estados y fechas

La revisión usa el JSON público recuperado mediante GET el 22-11: `https://cambiometro.impulsacv.cl/data/movimientos.json`, SHA-256 `6f939ec094e229da99e86779267030ee6b602d24032cda601566b2df6ed05c7d`. Corte de ejecución: **22-11-2026 14:58:19 UTC**. Última publicación incorporada: **21-11-2026**; son fechas distintas.

La base reconciliada de movimientos conserva el corte del **14-09-2026**; las novedades posteriores se incorporan como anuncios mientras no se acrediten en el catálogo. No es una certificación de todas las salidas posteriores a ese corte. Hay **46 movimientos y 19 anuncios: 65 registros**, identificados individualmente en el navegador. De los movimientos, 35 están corroborados, 10 verificados en el catálogo y 1 en confirmación. Los 19 anuncios están en confirmación: 20 pendientes en total. No se presentan los 65 como salidas ni como hechos oficialmente confirmados.

El indicador de acto oficial individualizado reutiliza el resolvedor existente, que exige estado, referencia individualizada y revisión fechada. En este corte **ningún registro cumple conjuntamente esos campos**. Por eso el indicador muestra 0; no afirma que no existan decretos fuera de la documentación acreditada del corte. La verificación del catálogo y el respaldo institucional siguen visibles por separado. Los valores originales de estado no se modifican y se pueden consultar en el detalle.

Las seis revisiones documentales preexistentes se conservan. No se presenta su fecha cuestionada como fecha efectiva ni se inventa la fecha de asunción de un reemplazo. El listado utiliza la publicación del respaldo e indica «hecho en revisión». El detalle mantiene la fecha original identificada como revisada y la nota documental. En anuncios como Kattia Durán se distinguen 30-09 (publicación) y 01-10 (efectiva reportada), sin promover su estado.

Los registros sin una fecha para el criterio elegido permanecen consultables en todos los períodos; quedan fuera de un rango que exige esa fecha. La búsqueda incluye las referencias originales disponibles. No se fusionan movimientos por coincidencia de nombres: sólo se reúnen en el detalle las fuentes que ya pertenecen al mismo ID. No hay un registro completo de transiciones de estado en el modelo: se muestran únicamente detección, revisión, última observación y respaldos disponibles.

Seis anuncios carecen de persona normalizada y algunos tampoco contienen cargo o institución. Se conservan con su texto y respaldo; no se deduce una identidad del titular. La cobertura es la del catálogo integrado, no todos los movimientos de cargos del país.

## Automatización y enlaces

Última ejecución observada del [ETL existente](https://github.com/jmorgadodev/cambiometro/actions/runs/45035615271): **22-11-2026, completed/success**. La programación sigue en 07:00 UTC; no se relanzó, modificó ni reactivó ningún proceso. El recibo conserva los checksums de workflow, calendario, extractor, publicación, políticas y contrato original. Una ejecución observada correctamente no es una garantía sobre ejecuciones futuras.

Los enlaces se conservan desde sus campos originales, con esquema HTTP(S), sin credenciales y con noopener/noreferrer. Las URLs de respaldo aparecen en el panel solicitado, no como destinos que sustituyan el registro.

Se comprobaron **14 URLs institucionales mediante HEAD**, sin descargar documentos: 11 respondieron 200. Educación/organigrama respondió 403; Agricultura/Arica y la publicación de la Delegación del Biobío no pudieron verificarse por error de conexión desde este entorno. No se reemplazan ni se inventan URLs para ocultar esas limitaciones. El detalle conserva las fuentes y la revisión correspondiente. Comprobación completa en el recibo.

## Comparación visual

| Antes | Entrega |
|---|---|
| Cronología de tarjetas grandes como entrada | Tabla compacta por defecto y cronología secundaria |
| Indicadores de rotación y actualización repetida | Tres medidas de la selección y actualización documental bajo demanda |
| Detalles expandidos dentro de la lista | Panel contextual sin perder selección o posición |
| Filtros permanentes y una página larga en móvil | Filtros contraíbles, filas compactas y páginas de 20 |
| Información legal y metodológica dispersa | Un contexto «Fuentes y alcance» y respaldo por caso |

| Producción anterior | Registro local |
|---|---|
| [Captura de escritorio](../../transparencia-app/artifacts/movimientos-renovacion/screenshots/antes-escritorio.png) | [Captura de escritorio](../../transparencia-app/artifacts/movimientos-renovacion/screenshots/registro-escritorio.png) |
| [Captura móvil](../../transparencia-app/artifacts/movimientos-renovacion/screenshots/antes-movil.png) | [Captura móvil](../../transparencia-app/artifacts/movimientos-renovacion/screenshots/registro-movil.png) |

[Filas móviles](../../transparencia-app/artifacts/movimientos-renovacion/screenshots/registro-movil-filas.png) · [Detalle móvil](../../transparencia-app/artifacts/movimientos-renovacion/screenshots/detalle-movil.png) · [Modo oscuro](../../transparencia-app/artifacts/movimientos-renovacion/screenshots/registro-oscuro.png).

Las capturas «antes» proceden de producción y muestran el mismo universo de 65 registros. Las capturas finales proceden del artefacto local; incluyen 1366, 1920, 768, 390 y 360 px, registro y detalle, cronología, filtros y modo oscuro. Directorio: `transparencia-app/artifacts/movimientos-renovacion/screenshots/`. El recibo enumera los archivos y sus checksums. Las capturas de desarrollo con el indicador de Next no forman parte de la entrega final.

## Validación y rendimiento

**2.222 pruebas aprobadas en 343 archivos**; 149 comprobaciones del módulo y las 44 regresiones dirigidas del último ajuste. Tipos, lint del alcance (cero errores; dos advertencias heredadas en la prueba compartida), build Pages de **5.104 páginas** y guards estáticos aprobados. El artefacto final `ba7bf255` pasó **69 comprobaciones reales de navegador**, incluidos los cinco anchos pedidos, modo claro/oscuro, teclado, fuentes, fechas y todos los IDs publicados.

Transferencia inicial observada: **517.194 bytes locales** y **0 solicitudes API**. No se atribuye una mejora porcentual frente al CDN de producción porque son entornos de servicio diferentes. El bootstrap financiero y sus 41 particiones conservan los checksums de la entrega anterior; los originales de Movimientos, Votaciones, los cuatro insumos financieros y 179 archivos mensuales quedaron restaurados.

[Recibo final con resultados, fuentes y capturas](validacion-registro-20261122.json).

No se ejecuta ninguna consulta API al abrir la página o interactuar con búsqueda, filtros, paginación, cronología o paneles. El volumen se procesa localmente. Los documentos enlazados no se descargan al abrir el listado. La medida de transferencia se realiza sobre el servidor estático local, Brotli 4 y CSP de Pages, con navegador nuevo: no representa CDN, usuarios reales ni facturación.

## Archivos, integración y recuperación

- `app/movimientos/`: encabezado y composición; metadata y ruta conservadas.
- `components/movimientos/`: registro, filtros, detalle, fuentes, primitivas y CSS del módulo.
- `lib/movement-register*.ts`: proyección y consultas; pruebas de conservación, fechas, fuentes, estados, búsqueda, orden y paginación.
- Pruebas anteriores de Movimientos: sustitución de aserciones sobre la plantilla antigua por comprobaciones semánticas y recorridos reales de navegador. Los tests de datos y publicación se conservan.
- `scripts/verify-movement-experience.mjs`: recorrido reproducible de revisión; `capture-movement-baseline.mjs`: captura de referencia.
- Verificadores existentes de producción: actualización exclusiva del encabezado esperado de Movimientos.
- Documentación: esta entrega, especificación, tarea y recibo en `tasks/movimientos/`, más el módulo operativo.

Commits locales: `237cb44f` proyección/consulta y contrato de tarea; `6e57fa9c` registro, panel, cronología, móvil y pruebas; `ba7bf255` alcance en HTML inicial y orden temporal de la cronología. Los commits documentales posteriores no cambian el código del artefacto.

Los insumos financieros y de Votaciones usados en la validación anterior se reutilizan por checksum para conservar el artefacto del resto del sitio, sin nueva extracción. El snapshot de Movimientos se hidrata temporalmente desde el JSON público recuperado. Todos los originales y archivos mensuales se restauran por checksum al terminar; los datos financieros publicados permanecen idénticos. No se incorpora ningún snapshot al commit.

Recuperación: revertir únicamente los commits de Movimientos sobre `8fcb53b1`, conservando el resto de las entregas y todos los releases. Para una publicación futura, usar el flujo UI-only con R2 vigente, preview identificada por SHA y release-set y promover el mismo artefacto validado con rollback. Este cierre es local y no autoriza producción.

## Solicitud posterior de conciliación y producción

Después de esta validación, Jorge solicitó conciliar los números con Renuncias Kast, revisar cada caso pendiente y publicar todos los avances tras esa revisión. Esa solicitud autoriza la entrega agrupada a producción; el cierre de interfaz anterior no sustituye la revisión documental ni valida por anticipado nuevos estados. Los cambios de datos y su publicación se documentarán como un incremento posterior, conservando este recibo del artefacto de interfaz.
