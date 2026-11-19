# Ficha parlamentaria: incremento local preparado

19-11-2026, America/Santiago. Rama codex/fichas-navegacion-local-20261118; base 68f27628ab26d080777bf8761eabbf012e06a1dd. Raíz y remoto canónicos comprobados, origin/main obtenido antes de editar.

## Resultado

Cabecera compacta y Resumen por defecto; menú izquierdo en escritorio y selector en móvil. Un panel visible, manteniendo montados los detalles para conservar selección mensual al cambiar de apartado. Enlaces ancla anteriores, navegación por teclado e historial atrás/adelante conservados. CSS module propio, sin cambios en globals.css ni menú global. Los enlaces funcionan también sin JavaScript mediante :target/:has.

Apartados: Resumen, Gastos, Personal, Asesorías externas cuando existen, Dieta y períodos, Votaciones, Elección cuando hay resultados, Antecedentes y Fuentes. Datos complementarios, declaraciones y lobby quedan fuera del resumen. Los seis fragmentos originales de detalle se conservaron idénticos (Gastos, Personal, Votaciones, Trayectoria, Elección y Lobby). La cabecera mantiene el modo completo para otros consumidores; la ficha usa modo compacto y reutiliza sus antecedentes e indicadores en los paneles. Se evita duplicar costo-mensual.

El resumen muestra cada importe con mes y fuente propios. No suma períodos diferentes ni sustituye ausencia por cero. La dieta muestra su última referencia oficial con su período; el costo por mes conserva la distinción entre referencia y pago observado. No se modifican ETL, snapshots, slices o contratos R2.

## Datos y regresión

Las fixtures locales antiguas producen cifras diferentes a producción y no se aceptaron como evidencia del corte vigente. Se capturaron las dos páginas públicas y sus payloads JSON serializados (sin ejecutar scripts externos); se verificaron los períodos/importes contra los props de producción. Los inputs se virtualizaron sólo en el proceso de prueba, sin sobrescribir data/ del repositorio. Personal reutiliza la captura R2 con SHA verificado; gastos usa slices guardados y se contrasta mes a mes con los valores publicados.

Bianchi: dieta de julio 2026; gastos hasta agosto, personal hasta septiembre. Kaiser: dieta de junio; gastos hasta agosto, personal hasta septiembre. Se conservan seis meses de gastos marzo–agosto para ambos, incluyendo agosto Bianchi 6.834.219 CLP y Kaiser 5.451.139 CLP. Se comprueban todos los meses publicados de dieta, gastos y personal en ambas cabeceras, incluidos meses sin componente. La cabecera y sus datos mensuales antes/después son iguales. No se afirma aquí una extracción nueva ni revisión de cada categoría; las correcciones de datos previas se hidratarán desde R2 en la entrega agrupada.

## Verificación

29 pruebas en cinco archivos: authority-profile, politico-page-content, politico-costo-mensual, parliamentary-cost-periods y camara-official-profile-details. Lint y tsc --noEmit correctos. Las pruebas de la antigua grilla se actualizaron para verificar contenido de servidor y enlaces de paneles; el nuevo CSS corrige la vuelta a Resumen por hash.

Navegador: página real construida con los componentes existentes, servidor de prueba aislado y sustituciones de Next Link/Image/dynamic y KV. Dos perfiles, 1280/390 px; un panel visible, selector móvil, Enter en menú, volver atrás, conservación de mes, enlace legado costo-mensual y fallback sin JavaScript. Sin errores de ejecución ni desbordamiento horizontal. No es un build Next completo. Las fotos remotas se bloquean en esta comprobación; no se cambiaron fotos ni estilos globales. Se excluye del control de IDs el botón Compartir duplicado preexistente de cabecera móvil/escritorio; los destinos de paneles son únicos.

Recibo y capturas: transparencia-app/artifacts/fichas/browser/. Los scripts y entradas guardadas están en artifacts/fichas; no dependen de reextraer datos ni de ejecutar CI. Servidor y navegador cerrados al terminar.

## Pendiente de entrega agrupada

Validación integrada sobre el release R2 vigente y mismo artefacto de preview/producción, incluida comprobación de imágenes y rutas Next reales. Sin push, PR ni publicación por decisión de Jorge. Recuperación: revertir este incremento local; los contratos y datos publicados permanecen intactos. La fase queda preparada en local, sin cierre operativo productivo.

Por instrucción posterior de Jorge, el siguiente bloque es recuperar el contenido de los apartados en desarrollo con aviso visible y mejorar Votaciones 2026+ mediante módulos; el Dashboard financiero sigue después de ese bloque.

Integración de entrega 19-11: el E2E general aún buscaba Gastos visible al abrir la ficha. Se actualiza para comprobar Resumen inicial, abrir Gastos desde el menú y verificar un panel visible; Personal también se abre antes de revisar su contenido. No cambia la interfaz ni el artefacto de preview ya fijado en 6ff99cee.
