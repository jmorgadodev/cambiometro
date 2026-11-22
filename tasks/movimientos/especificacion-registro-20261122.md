# EL CAMBIÓMETRO — REDISEÑO INTEGRAL DE MOVIMIENTOS

## 1. Contexto y objetivo

Sitio: https://cambiometro.impulsacv.cl/

Apartado: https://cambiometro.impulsacv.cl/movimientos/

Referencia de experiencia: https://renunciaskast.cl/

Quiero rediseñar el apartado Movimientos de El Cambiómetro para transformarlo en una herramienta de consulta pública mucho más sencilla, comprensible, funcional y visualmente limpia.

El diseño actual está demasiado cargado. Predominan numerosas tarjetas oscuras, etiquetas, explicaciones y bloques repetitivos que dificultan encontrar rápidamente un movimiento concreto.

**No quiero desarrollar otro dashboard ni reconstruir la plataforma. Quiero simplificar la interfaz existente.**

La referencia Renuncias Kast es útil por su forma directa de presentar registros, filtros y tablas. No quiero copiar su diseño, identidad política, contenidos ni métricas editoriales.

El resultado debe mantener la identidad propia de Cambiómetro y su enfoque independiente, neutral y basado en evidencia.

### Momento de ejecución

Comenzar este trabajo únicamente después de finalizar y validar el rediseño del apartado Votaciones que está actualmente en desarrollo.

No mezclar ambas implementaciones ni sobrescribir cambios pendientes.

---

## 2. Conservar toda la infraestructura funcional

Las conexiones, ETL, almacenamiento y actualizaciones automáticas de Movimientos ya están implementadas y funcionan.

Por lo tanto:

- No reconstruir las conexiones existentes.
- No reemplazar las fuentes actuales.
- No modificar los ETL funcionales.
- No rehacer los procesos automáticos.
- No cambiar el almacenamiento sin justificación.
- No crear nuevas API para funciones que pueden resolverse con los datos actuales.
- No duplicar extracciones ni procesamientos.
- No realizar una auditoría técnica general innecesaria.

Revisar únicamente los componentes, campos y relaciones imprescindibles para adaptar la presentación.

**La prioridad es frontend, navegación y organización de los datos ya recopilados.**

Si un dato ya está almacenado y no se muestra correctamente, adaptar su proyección o componente de presentación.

No inventar campos, estados o fechas que la fuente no entregue.

---

## 3. Principios generales de experiencia

El usuario debe poder entrar y responder rápidamente:

1. ¿Qué autoridades o funcionarios registran movimientos?
2. ¿Qué ocurrió?
3. ¿En qué institución?
4. ¿Cuándo ocurrió?
5. ¿Cuál es el estado documentado?
6. ¿Dónde puedo consultar la fuente?

No debe necesitar leer párrafos explicativos ni recorrer decenas de tarjetas para encontrar una persona.

Priorizar:

- Una búsqueda principal.
- Filtros sencillos.
- Registros legibles.
- Orden cronológico.
- Información contextual bajo demanda.
- Fuentes verificables.
- Navegación rápida.

No implementar cuentas, favoritos, alertas, notificaciones, suscripciones ni funciones sociales.

---

# 4. Identidad visual

Quiero abandonar el aspecto excesivamente oscuro y recargado de la página actual.

Utilizar como referencia visual el nuevo dashboard parlamentario de Cambiómetro, manteniendo coherencia con el resto del sitio.

### Estilo

- Fondo claro y neutro.
- Tipografía legible.
- Jerarquía editorial.
- Verde institucional de Cambiómetro para acciones.
- Azul petróleo para elementos estructurales.
- Grises suaves.
- Bordes discretos.
- Espaciado consistente.
- Uso moderado de tarjetas.
- Sin sombras exageradas.
- Sin gradientes decorativos innecesarios.
- Sin iconos o insignias repetidos en cada línea.

El diseño debe verse como una plataforma profesional de consulta documental, no como un tablero generado automáticamente ni como una página de alertas.

### Modo oscuro

Respetar el sistema de tema claro/oscuro existente en Cambiómetro.

La versión clara debe ser la referencia principal de diseño, pero el modo oscuro debe seguir funcionando correctamente.

Evitar fondos negros excesivamente contrastados y colores saturados en las etiquetas.

---

# 5. Nueva estructura de la página

La navegación principal de Movimientos debe ser mucho más sencilla.

Organizar el contenido en este orden:

1. Encabezado.
2. Resumen breve.
3. Buscador.
4. Filtros.
5. Registro de movimientos.
6. Vista cronológica alternativa.
7. Fuentes y metodología accesibles.

No mostrar todos estos elementos como tarjetas independientes.

La mayor parte de la página debe estar dedicada a consultar registros.

---

## 6. Encabezado

Título principal:

**Movimientos de autoridades**

Subtítulo sugerido:

«Consulta renuncias, nombramientos, ceses y cambios de cargo documentados en fuentes públicas».

Adaptar la descripción a los tipos de movimiento que efectivamente cubren las fuentes existentes.

No anunciar categorías que el sistema todavía no registra.

Evitar introducciones largas sobre metodología, cobertura, procesos automáticos o interpretación de datos.

Si hace falta explicar el alcance de la plataforma, utilizar un enlace discreto «Fuentes y alcance».

---

## 7. Indicadores principales

Mostrar como máximo dos o tres indicadores útiles.

Priorizar:

- Movimientos registrados dentro de la selección.
- Registros con confirmación oficial, cuando la clasificación esté acreditada.
- Fecha de última actualización de los datos.

No incorporar indicadores adicionales únicamente para llenar espacio.

No utilizar:

- Contadores de días desde una renuncia.
- Promedios de renuncias por semana.
- Rankings de instituciones por salidas.
- Contadores políticos.
- Métricas de productividad.
- Comparaciones entre gobiernos sin contexto ni cobertura equivalente.

Los indicadores deben responder a los filtros activos.

**No sumar registros preliminares y hechos oficiales como si todos fueran movimientos confirmados.**

Si el modelo actual mezcla señales y confirmaciones, etiquetar correctamente la medida.

No generar una cifra total que pueda interpretarse equivocadamente.

---

# 8. Buscador principal

Incorporar una búsqueda amplia y visible.

Texto sugerido:

«Buscar por nombre, institución, cargo o región».

La búsqueda debe consultar los campos realmente disponibles.

Si la fuente contiene una materia, boletín, resolución u otro identificador relevante, permitir también esa búsqueda cuando corresponda.

### Comportamiento

- Actualizar resultados sin recargar toda la página.
- Ignorar diferencias de mayúsculas y tildes.
- Permitir búsquedas parciales.
- Ofrecer un estado vacío claro.
- Mostrar cuántos resultados coinciden.
- Conservar búsqueda y filtros al abrir detalles.
- Mantener enlaces compartibles cuando sea viable con la arquitectura existente.

No incorporar un buscador externo de pago.

---

# 9. Filtros

Mostrar únicamente los filtros más útiles.

### Principales

- Tipo de movimiento.
- Institución u organismo.
- Región, si está disponible.
- Fecha o período.
- Estado de verificación.

Los filtros deben reflejar las categorías reales del modelo existente.

No crear categorías artificiales que mezclen movimientos jurídicamente distintos.

### Comportamiento

Los filtros deben combinarse entre sí.

Permitir seleccionar más de una opción cuando sea útil.

Mostrar las selecciones activas mediante elementos compactos.

Incluir una acción sencilla para restablecer filtros.

No ocupar media pantalla con opciones que se utilizan ocasionalmente.

Las opciones menos frecuentes pueden quedar en un panel avanzado.

### Fechas

Permitir:

- Consultar un mes.
- Consultar un período.
- Ver todos los registros disponibles.

Distinguir cuando corresponda:

- Fecha del hecho.
- Fecha de publicación.
- Fecha de confirmación.
- Fecha de incorporación al sistema.

No inventar una fecha efectiva de renuncia o nombramiento a partir de la fecha de una noticia.

---

# 10. Registro completo como elemento principal

**Este es el cambio visual más importante.**

Reemplazar la sucesión de grandes tarjetas individuales por un registro compacto y ordenado.

En escritorio utilizar preferentemente una tabla o lista estructurada.

Columnas sugeridas:

| Fecha | Persona | Movimiento | Cargo / institución | Estado | Detalle |
|---|---|---|---|---|---|

Las columnas exactas deben adaptarse a los campos reales disponibles.

### Cada fila

Mostrar inmediatamente:

- Nombre de la persona.
- Tipo de movimiento.
- Cargo o función.
- Institución.
- Fecha acreditada.
- Estado documentado.

Incluir una acción para abrir el detalle.

No mostrar párrafos enteros de noticias dentro del listado.

No repetir la fuente, explicación metodológica o historial completo en cada fila.

### Orden

Por defecto, mostrar los registros más recientes primero.

Permitir modificar el orden por fecha o nombre cuando aporte valor.

No utilizar como criterio principal la importancia política estimada por el sistema.

### Paginación

Utilizar paginación o carga progresiva según la implementación actual.

No renderizar simultáneamente todas las tarjetas del histórico.

No perder resultados ni limitar arbitrariamente la cantidad disponible.

---

# 11. Adaptación móvil

En móvil, utilizar filas compactas en lugar de una tabla horizontal demasiado ancha.

Cada registro puede mostrar:

**Nombre de la persona**

Cargo e institución

Fecha · Tipo de movimiento · Estado

Acceso al detalle.

No utilizar tarjetas de gran altura para cada registro.

Evitar desplazamientos horizontales de toda la página.

La búsqueda y los filtros deben mantenerse accesibles.

---

# 12. Distinguir el hecho del estado de verificación

El Cambiómetro debe conservar una distinción esencial:

**Una noticia sobre una eventual renuncia no equivale a una renuncia oficialmente acreditada.**

La interfaz debe dejar clara esa diferencia sin llenar la pantalla de advertencias.

### Estados posibles

Utilizar las clasificaciones que realmente permita el modelo actual.

Ejemplos conceptuales:

- Confirmado oficialmente.
- Reportado por una fuente.
- Pendiente de corroboración.
- Descartado o rectificado, cuando exista evidencia.

No asignar estados por intuición.

No tratar estas etiquetas como juicios sobre la persona.

### Colores

Utilizar colores moderados acompañados de texto.

Por ejemplo:

- Verde salvia para confirmación documental.
- Ocre discreto para información pendiente.
- Gris para estados no determinados.
- Otros colores solamente cuando exista una distinción significativa.

No utilizar rojo como sinónimo de una renuncia o un cese.

No sugerir que una salida de cargo es automáticamente negativa.

---

# 13. Panel lateral de detalle

Reutilizar, cuando sea posible, el patrón del panel lateral derecho que ya se desarrolló para el dashboard y Votaciones.

Al seleccionar un movimiento, abrir un panel contextual sin abandonar la lista.

### Encabezado

- Nombre.
- Cargo.
- Institución.
- Tipo de movimiento.
- Estado acreditado.

### Detalle

- Qué ocurrió, en una explicación breve basada en la fuente.
- Fechas relevantes disponibles.
- Antecedentes relacionados.
- Documento oficial o fuente periodística.
- Historial de actualización del registro cuando exista.

### Fuentes

Mostrar enlaces claros a los respaldos reales.

Distinguir entre:

- Documento oficial.
- Comunicado institucional.
- Noticia periodística.
- Otra fuente utilizada.

No presentar una noticia como si fuera un decreto o resolución.

No inventar documentos individuales.

### Navegación

- Cerrar con Escape.
- Cerrar al pulsar fuera.
- Botón de cierre visible.
- Conservar el desplazamiento.
- Conservar filtros.
- Mantener foco accesible.
- Adaptar a móvil con panel apropiado.

Evitar un panel interminable con todos los metadatos disponibles.

Si existe mucho contexto documental, ofrecer un enlace a una vista completa.

---

# 14. Evitar duplicaciones de movimientos

Cuando exista una noticia inicial y posteriormente se publique una confirmación oficial del mismo hecho, no crear automáticamente un segundo movimiento independiente.

Si el sistema ya tiene una relación estable entre ambos registros, mostrar la actualización como parte del historial del mismo caso.

No agrupar noticias o movimientos diferentes por coincidencias vagas de nombres.

Una persona puede registrar varios movimientos distintos en fechas diferentes.

No fusionar eventos que tengan naturaleza o efectos jurídicos diferentes.

Conservar el historial original y las fuentes.

Si el modelo no dispone de una relación verificable, no inventarla.

---

# 15. Vista cronológica alternativa

Conservar una forma de revisar los movimientos según su fecha.

No quiero una cronología interminable con grandes tarjetas.

Crear una vista secundaria llamada, por ejemplo:

**Cronología**

Mostrar grupos por mes o fecha, con filas compactas.

Permitir utilizar los mismos filtros de la vista principal.

La cronología debe facilitar entender el orden de los hechos, no ofrecer otra página con el mismo contenido repetido visualmente.

### Navegación sugerida

- Registro completo.
- Cronología.

No crear cinco pestañas adicionales.

---

# 16. Información contextual y metodología

Aplicar la misma regla utilizada en el dashboard:

**Los datos deben ser protagonistas; las explicaciones aparecen cuando el usuario las necesita.**

### Información visible

- Persona.
- Movimiento.
- Cargo.
- Institución.
- Fecha.
- Estado.

### Información contextual

- Antecedentes.
- Diferencias entre tipos de movimientos.
- Fechas adicionales.
- Fuente.
- Historial documentado.

### Metodología

- Cobertura de fuentes.
- Criterios de registro.
- Reglas de actualización.
- Limitaciones.
- Definiciones.
- Trazabilidad.
- Criterios para distinguir noticia y acto oficial.

No repetir la metodología debajo de cada registro.

No mantener avisos técnicos extensos en la parte superior de la página.

No eliminar las precisiones indispensables para evitar confundir hechos confirmados con información preliminar.

---

# 17. Neutralidad y rigor documental

El Cambiómetro es una plataforma de consulta pública, independiente y neutral.

No presentar los movimientos como triunfos, derrotas ni indicadores de éxito o fracaso de un gobierno.

No implementar:

- Rankings de renuncias por gobierno.
- Puntuaciones políticas.
- Etiquetas como «escándalo» sin respaldo.
- Clasificación automática de culpabilidad.
- Interpretaciones sobre las motivaciones personales.
- Juicios editoriales generados automáticamente.
- Contadores diseñados para producir impacto político.

El lenguaje debe describir hechos documentados.

Cuando el motivo de una salida esté publicado en una fuente, atribuirlo correctamente a esa fuente.

No afirmar como hecho una hipótesis periodística.

---

# 18. Reutilización de recursos existentes

Antes de crear nuevos componentes, revisar los elementos visuales reutilizables del dashboard y de Votaciones.

Especialmente:

- Buscador.
- Filtros.
- Tablas.
- Paneles contextuales.
- Etiquetas de estado.
- Paginación.
- Manejo de URL.
- Diseño adaptable.
- Componentes de accesibilidad.

No incorporar componentes pesados de análisis financiero si no corresponden a Movimientos.

No utilizar gráficos solamente porque existen librerías disponibles.

No agregar un nuevo sistema de diseño paralelo.

---

# 19. Rendimiento y arquitectura

Conservar el sistema existente de actualización automática.

Priorizar procesamiento y filtrado local cuando el volumen y la arquitectura lo permitan.

No generar una consulta a D1 o una ejecución de Worker por cada interacción si los datos pueden servirse como recursos estáticos.

No agregar servicios de pago.

Optimizar:

- Carga inicial.
- Búsqueda.
- Ordenamiento.
- Filtros combinados.
- Apertura de detalles.
- Navegación móvil.
- Acceso a fuentes.

Evitar descargar documentos completos o información secundaria cuando el visitante solamente está revisando la lista.

Conservar la infraestructura de publicación ya utilizada por Cambiómetro.

---

# 20. Compatibilidad con el sitio actual

No modificar otros módulos durante este encargo.

Conservar la navegación principal.

Mantener rutas y enlaces compartidos existentes.

Si es necesario reorganizar URL internas, preservar compatibilidad mediante el mecanismo adecuado para el export estático.

No eliminar registros históricos.

No cambiar los estados de verificación existentes sin respaldo documental.

No modificar el contenido original de las fuentes.

No cambiar el sentido editorial de la plataforma.

---

# 21. Pruebas funcionales

Probar en navegador:

1. Apertura de Movimientos.
2. Búsqueda por nombre.
3. Búsqueda por institución.
4. Filtro por tipo de movimiento.
5. Filtro por región cuando exista.
6. Filtro por fecha.
7. Filtro por estado.
8. Combinación de filtros.
9. Restablecimiento.
10. Orden cronológico.
11. Paginación o carga progresiva.
12. Apertura de detalle.
13. Conservación de filtros al cerrar.
14. Enlaces a fuentes.
15. Distinción entre información reportada y confirmada.
16. Cronología alternativa.
17. Navegación entre registros.
18. Enlaces anteriores.
19. Funcionamiento móvil.
20. Accesibilidad y teclado.
21. Modo claro y oscuro.
22. Ausencia de errores de consola.
23. Ausencia de nuevas solicitudes dinámicas innecesarias.
24. Continuidad de las actualizaciones existentes.

Comprobar con casos reales de distintas clases y estados.

No validar únicamente con registros de ejemplo.

---

# 22. Revisión visual obligatoria

Abrir la implementación en un navegador.

Revisar como mínimo:

- Escritorio de 1366 px.
- Pantalla de 1920 px.
- Tableta de 768 px.
- Móvil de 390 px.
- Móvil de 360 px.

Verificar especialmente:

- Que no existan tarjetas enormes repetidas.
- Que el listado sea legible.
- Que los filtros sean cómodos.
- Que los estados no dominen visualmente.
- Que los títulos no se corten incorrectamente.
- Que la apertura de detalle no desplace la página.
- Que las fuentes sean fáciles de encontrar.
- Que no existan espacios excesivos o secciones innecesarias.
- Que la página sea notablemente más sencilla que la versión anterior.

Corregir cualquier problema detectado.

---

# 23. Orden de implementación

## Etapa 1 — Adaptación de la interfaz existente

Identificar los componentes y datos que actualmente se muestran.

No realizar una auditoría general de ETL.

Determinar qué elementos visuales deben simplificarse o eliminarse.

## Etapa 2 — Rediseño del registro

Implementar encabezado, buscador, filtros y listado compacto.

Esta es la prioridad principal.

## Etapa 3 — Panel contextual

Conectar los registros con sus detalles y fuentes existentes.

## Etapa 4 — Cronología

Implementar una vista alternativa sencilla reutilizando los mismos datos.

## Etapa 5 — Optimización y revisión

Corregir experiencia móvil, accesibilidad, enlaces, rendimiento y consistencia visual.

Completar el trabajo funcional. No detenerse en propuestas, maquetas o informes preliminares.

---

# 24. Entrega final

Entregar:

- Resumen del rediseño.
- Funcionalidades implementadas.
- Componentes reutilizados.
- Capturas reales de escritorio y móvil.
- Comparación visual entre versión anterior y nueva.
- Pruebas funcionales.
- Verificación de estados y fechas.
- Comprobación de enlaces oficiales.
- Resultado de rendimiento.
- Confirmación de que las actualizaciones automáticas siguen funcionando.
- Archivos modificados.
- Rama y commits.
- Limitaciones reales que permanezcan.

No publicar en producción sin autorización.

No modificar los sistemas de otras secciones.

---

# RESULTADO ESPERADO

Quiero que Movimientos sea una herramienta sencilla para conocer qué está ocurriendo con los cargos y autoridades documentados por Cambiómetro.

El visitante debe poder:

**Buscar una persona.**

**Identificar qué movimiento se registró.**

**Saber cuándo ocurrió.**

**Conocer su estado documental.**

**Abrir la fuente oficial o periodística correspondiente.**

Todo sin navegar por decenas de tarjetas, explicaciones o elementos visuales repetitivos.

El diseño debe ser limpio, moderno, sobrio y coherente con el nuevo dashboard.

La referencia de Renuncias Kast debe servir como inspiración para la claridad y facilidad de consulta, no para copiar su diseño o enfoque.

**Conservar toda la ingeniería que ya funciona y concentrar el trabajo en mejorar la experiencia del usuario.**

Implementar, verificar visualmente y entregar listo para revisión antes de producción.