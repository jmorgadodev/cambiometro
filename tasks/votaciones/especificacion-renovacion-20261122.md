# EL CAMBIÓMETRO — REDISEÑO E IMPLEMENTACIÓN DEL APARTADO VOTACIONES

## 1. OBJETIVO

Quiero rediseñar integralmente la experiencia visual y funcional del apartado Votaciones de El Cambiómetro.

**IMPORTANTE: El sistema actual ya funciona. Las conexiones con las fuentes oficiales, el almacenamiento, los procesos de actualización automática y la obtención de votaciones están implementados.**

No quiero reconstruir esos procesos ni invertir tiempo en una nueva auditoría general.

El objetivo es aprovechar la infraestructura y los datos existentes para crear una experiencia mucho más clara, atractiva, sencilla e intuitiva.

La sección debe permitir que cualquier ciudadano comprenda rápidamente:

- Qué se votó.
- De qué trata el proyecto.
- Cuál fue el resultado.
- Cómo votó cada parlamentario.
- En qué estado se encuentra el proyecto.
- Qué ocurrió durante su tramitación.
- Qué participación tuvieron las comisiones.

La complejidad técnica debe permanecer detrás de la interfaz.

**Esta tarea debe comenzar una vez finalizado el rediseño del dashboard parlamentario. No desplegar a producción sin aprobación.**

---

## 2. CONSERVAR TODO LO QUE YA FUNCIONA

Esta es una condición fundamental.

No modificar innecesariamente:

- Conexiones actuales con Cámara y Senado.
- API que ya entregan correctamente los datos.
- Procesos de extracción.
- Almacenamiento existente.
- Actualizaciones automáticas.
- Procesos de normalización que funcionan.
- Publicación de datos.
- Históricos recopilados.
- Identificadores originales.
- Enlaces públicos existentes.
- Funciones que ya están operativas.

**No realizar otra auditoría general ni rediseñar la arquitectura de datos.**

Revisar únicamente los componentes y campos concretos que sean necesarios para integrar la nueva interfaz.

Si un dato ya existe, reutilizarlo.

Si un dato existe en el almacenamiento, pero actualmente no llega a la interfaz, adaptar su presentación o proyección.

Si existe una limitación real, solucionarla de forma localizada.

No volver a extraer información que ya está disponible.

No agregar nuevas conexiones salvo que exista una necesidad comprobada, especialmente en Comisiones.

El objetivo es avanzar directamente con la implementación.

---

## 3. PRINCIPIO DE DISEÑO

El Cambiómetro es una plataforma pública para consultar información.

No quiero que Votaciones se sienta como una base de datos administrativa ni como otro dashboard estadístico.

La experiencia debe parecerse más a un buscador visual y comprensible de decisiones legislativas.

Prioridades:

1. Encontrar rápidamente.
2. Comprender de inmediato.
3. Identificar personas y partidos.
4. Conocer el estado del proyecto.
5. Profundizar cuando se necesite.
6. Verificar los datos originales.

No implementar cuentas, favoritos, notificaciones, alertas, suscripciones ni funcionalidades sociales.

---

## 4. IDENTIDAD VISUAL

Quiero que Votaciones tenga una identidad propia, ligeramente inspirada en la estética institucional del Senado chileno.

Mantener coherencia con El Cambiómetro.

Utilizar:

- Azul petróleo.
- Tonos marfil y superficies claras.
- Turquesa de Cambiómetro.
- Detalles discretos en bronce u ocre.
- Tipografía clara.
- Buena jerarquía visual.
- Espacios equilibrados.
- Transiciones discretas.

### Colores para estados y resultados

Utilizar una paleta tipo semáforo, pero suave:

- Verde salvia: resultados favorables o hitos completados, según el contexto.
- Rojo arcilla: rechazo de una decisión específica.
- Ocre: abstenciones y determinados estados de tramitación.
- Azul grisáceo: información y otras actuaciones.
- Gris neutro: estados no determinados.

No utilizar colores excesivamente saturados.

Los colores describen estados administrativos o resultados, no valoraciones políticas.

### No abusar de las tarjetas

Utilizar distintos patrones visuales según el contenido:

- Listas compactas para proyectos.
- Tarjetas cuando exista información destacada.
- Filas con fotografías para parlamentarios.
- Barras discretas para resultados.
- Líneas de tiempo para tramitaciones.
- Paneles laterales para información extensa.
- Tablas únicamente cuando aporten utilidad.

No envolver cada título, registro, párrafo o cifra en una tarjeta independiente.

---

## 5. ESTRUCTURA PRINCIPAL

Simplificar la navegación del apartado.

Organizarlo en:

### A. Inicio de Votaciones

Buscador principal, actividad reciente y accesos sencillos.

### B. Proyectos y votaciones

Listado de asuntos legislativos, sus decisiones y resultados.

### C. Parlamentarios

Búsqueda de diputados y senadores e historial de votos registrados.

### D. Comisiones

Comisiones legislativas y su participación documentada en los proyectos.

### E. Aprende

Explicación visual y breve del procedimiento legislativo.

Las sesiones deben seguir disponibles como contexto cronológico, sin ocupar necesariamente una sección principal.

No eliminar información existente.

---

## 6. PORTADA

La portada debe responder a una pregunta:

**¿Qué se votó en el Congreso?**

Incorporar un buscador amplio que permita buscar por:

- Nombre del proyecto.
- Materia.
- Boletín.
- Palabras clave.
- Parlamentario.
- Fecha.

Mostrar tres accesos principales:

- Explorar proyectos y votaciones.
- Buscar cómo votó un parlamentario.
- Consultar comisiones.

Debajo, mostrar la actividad legislativa reciente.

Utilizar listados compactos.

Evitar mostrar múltiples registros del mismo proyecto como si fueran asuntos distintos.

Agrupar correctamente las decisiones relacionadas.

No destacar asuntos mediante valoraciones políticas.

---

## 7. MEJORAR LOS NOMBRES DE PROYECTOS Y VOTACIONES

Este es uno de los cambios más importantes.

Actualmente algunos registros aparecen con identificadores técnicos, números de boletín o nombres de trámites que no resultan comprensibles.

Necesito mejorar la presentación.

### Orden de prioridad

1. Título oficial del proyecto.
2. Materia específica sometida a votación.
3. Descripción corta basada en información acreditada.
4. Número de boletín como referencia secundaria.

Ejemplo:

**Ley de Presupuestos para 2027**

Se votó la admisibilidad de una indicación.

Boletín 18702-05.

No mostrar solamente «Boletín 18702-05» si ya tenemos el nombre del proyecto.

### Implementación

Primero reutilizar los títulos, materias y relaciones disponibles en los datos existentes.

Si un campo se pierde entre el almacenamiento y la interfaz, recuperarlo mediante una adaptación puntual.

No rediseñar la extracción completa.

No inventar títulos ni explicaciones.

No relacionar registros por coincidencias vagas de texto.

Si la información realmente no existe, conservar una identificación neutral.

---

## 8. AGRUPAR PROYECTOS Y DECISIONES

Un proyecto puede tener muchas votaciones correspondientes a:

- Indicaciones.
- Artículos.
- Trámites.
- Admisibilidad.
- Discusión general.
- Discusión particular.
- Otras decisiones.

No quiero que se conviertan automáticamente en decenas de tarjetas independientes.

El usuario debe encontrar primero el proyecto y después consultar sus decisiones.

Estructura:

**Proyecto → Decisiones → Resultados → Votos nominales.**

Conservar los registros originales y sus enlaces.

No agrupar decisiones sin una relación acreditada.

---

## 9. FICHA DE PROYECTO

Mostrar de forma clara:

- Título oficial.
- Boletín.
- Estado de tramitación.
- Fecha del último movimiento conocido.
- Cámara o institución correspondiente.
- Decisiones relacionadas.
- Trabajo en comisiones.
- Historial disponible.

Priorizar los datos por sobre textos explicativos.

La información secundaria debe estar disponible mediante paneles contextuales.

---

## 10. ESTADO Y TRAMITACIÓN DEL PROYECTO

Agregar una representación comprensible del estado de cada proyecto.

Utilizar los datos de tramitación ya disponibles.

Mostrar:

- Estado actual acreditado.
- Etapa.
- Último movimiento registrado.
- Fecha.
- Publicación como ley, cuando corresponda.

### Funcionalidad «¿Qué pasó y qué sigue?»

Abrir desde un panel lateral derecho.

Mostrar:

- Qué ocurrió.
- Dónde se encuentra actualmente.
- Qué significa esa etapa.
- Qué actuaciones podrían corresponder después.
- Fuente oficial.

No inventar predicciones.

No utilizar una barra porcentual artificial.

Utilizar una cronología de hechos confirmados.

Distinguir entre resultado de una votación y estado del proyecto.

Por ejemplo, rechazar una indicación no significa necesariamente que todo el proyecto fue rechazado.

---

## 11. FICHA DE VOTACIÓN

Cada votación debe mostrar rápidamente:

- Materia sometida a votación.
- Proyecto asociado, cuando exista.
- Fecha.
- Institución.
- Resultado oficial.
- Votos favorables.
- Votos contrarios.
- Abstenciones.
- Otros estados documentados.

Utilizar barras proporcionales con colores discretos.

Mostrar una frase breve que identifique qué se decidió.

No convertir una votación procedimental en aprobación o rechazo definitivo de un proyecto.

---

## 12. FOTOGRAFÍAS Y LOGOTIPOS

Ya tenemos fotografías de senadores y diputados y logotipos de partidos políticos.

**Reutilizar directamente esos recursos existentes.**

Incorporarlos especialmente en:

- Búsqueda de parlamentarios.
- Resultados de votos nominales.
- Historiales individuales.
- Paneles de detalle.
- Listados por partido.

Cada parlamentario debe reconocerse visualmente.

No utilizar imágenes equivocadas ni generar rostros artificiales.

Si no existe una fotografía válida, usar un reemplazo neutro.

Los logotipos de partidos deben ser discretos y coherentes.

Comprobar que la afiliación mostrada corresponda al período cuando ese dato histórico esté disponible; de lo contrario, identificar correctamente la referencia temporal.

---

## 13. BÚSQUEDA DE VOTOS INDIVIDUALES

Quiero una experiencia muy sencilla.

El usuario:

1. Busca un parlamentario.
2. Lo identifica por su fotografía.
3. Accede a sus votaciones registradas.
4. Consulta el asunto y el voto.
5. Puede abrir el proyecto completo.

También debe poder buscar a un parlamentario dentro de una votación específica.

No obligarlo a recorrer 155 nombres.

Mostrar el voto registrado:

- A favor.
- En contra.
- Abstención.
- Pareo.
- Otros estados oficiales disponibles.
- Sin registro nominal, cuando corresponda.

No interpretar automáticamente una ausencia de registro como inasistencia.

---

## 14. PANEL LATERAL DERECHO

Incorporar un panel contextual reutilizable.

Debe abrirse desde la derecha cuando el usuario solicite mayor detalle.

Utilizarlo para:

- Historial de tramitación.
- Detalles de la votación.
- Nóminas extensas.
- Comisiones.
- Sesiones.
- Informes.
- Documentos.
- Explicaciones legislativas.
- Fuentes oficiales.

### Comportamiento

- Abrir y cerrar sin abandonar la pantalla.
- Cerrar al pulsar fuera.
- Cerrar con Escape.
- Botón de cierre visible.
- Mantener la posición de navegación.
- Mantener los filtros.
- Manejar el foco correctamente.
- Adaptarse a móviles mediante panel inferior cuando sea apropiado.

No transformar el panel en otra página saturada.

Cuando un documento sea muy extenso, enlazar a su vista completa.

---

## 15. COMISIONES

Quiero integrar Comisiones porque complementa la explicación del recorrido legislativo.

### Importante

Antes de incorporar una conexión nueva, comprobar si la información ya está almacenada o si existe una integración parcial.

No reconstruir conexiones existentes.

Solamente desarrollar una nueva extracción cuando exista una necesidad real y datos oficialmente disponibles.

### Fuentes oficiales candidatas

Cámara:

https://opendata.camara.cl/camaradiputados/WServices/WSComision.asmx

https://www.camara.cl/legislacion/comisiones/comisiones_permanentes.aspx

Senado:

https://www.senado.cl/actividad-legislativa/comisiones

Consultar también los recursos oficiales de citaciones, sesiones celebradas, materias y acuerdos.

### Información de valor

- Nombre de comisión.
- Institución.
- Integrantes.
- Proyectos relacionados.
- Sesiones documentadas.
- Materias tratadas.
- Acuerdos.
- Informes y documentos disponibles.

### Presentación

Crear un directorio compacto de comisiones.

Permitir buscar una comisión, consultar sus integrantes y abrir proyectos relacionados.

Dentro de cada proyecto, incluir las comisiones que hayan intervenido de manera acreditada.

Las materias, acuerdos y documentos extensos pueden aparecer en el panel derecho.

### Reglas

No confundir citaciones con sesiones celebradas.

No asumir que una sesión produjo una votación.

No considerar un acuerdo de comisión como aprobación definitiva.

No crear estadísticas de asistencia o productividad sin cobertura suficiente.

Si una fuente no permite extraer un dato fiable, mantener esa función limitada y continuar con el resto de la implementación.

No detener todo el desarrollo por un endpoint de comisiones.

---

## 16. SESIONES

Conservar el apartado existente.

Simplificar su presentación y utilizarlo como contexto de las votaciones.

Mostrar:

- Fecha.
- Institución.
- Sesión, cuando esté acreditada.
- Proyectos asociados.
- Decisiones registradas.

Relacionar con las fichas de proyectos y votaciones.

No reconstruir la base existente.

No convertir una jornada de votaciones en una sesión oficial si los datos no lo permiten.

---

## 17. APARTADO EDUCATIVO

Incorporar una explicación visual sencilla titulada:

**«Entiende cómo vota el Congreso»**

Mostrar conceptos básicos:

- Proyecto de ley.
- Boletín.
- Comisión.
- Indicación.
- Admisibilidad.
- Trámite constitucional.
- Votación.
- Resultado.
- Promulgación.
- Publicación.

Utilizar ejemplos claros y una visualización progresiva.

No crear una página excesivamente extensa.

Debe ayudar al usuario a comprender los estados y procedimientos utilizados en Cambiómetro.

---

## 18. ELIMINAR EL EXCESO DE EXPLICACIONES VISIBLES

Esta condición es especialmente importante.

La experiencia actual contiene demasiados textos de cobertura, fuente, metodología y explicaciones técnicas.

No quiero repetir ese patrón.

### Mostrar inmediatamente

- Qué es.
- Cuándo ocurrió.
- Quién participó.
- Qué resultado tuvo.
- En qué estado se encuentra.

### Mostrar al solicitar detalle

- Desglose.
- Historial.
- Definiciones.
- Documentos.
- Registros.
- Fuentes.

### Centralizar

- Metodología.
- Cobertura.
- Procesamiento de datos.
- Definiciones completas.
- Limitaciones técnicas.

No añadir párrafos bajo cada resultado.

No llenar los listados con advertencias repetidas.

Mantener únicamente las etiquetas y precisiones imprescindibles para evitar interpretaciones equivocadas.

---

## 19. COSTO CERO Y RENDIMIENTO

Conservar la arquitectura existente que ya permite obtener y actualizar los datos.

No añadir:

- Nuevas consultas D1 por interacción.
- Workers para cada filtro.
- Servicios de pago.
- Procesamientos redundantes.
- Descargas completas innecesarias.
- Nuevos sistemas de almacenamiento sin justificación.

Optimizar la presentación y la carga de recursos, especialmente fotografías, listados y paneles.

Aprovechar los componentes reutilizables que hayan quedado terminados en el dashboard parlamentario.

No modificar el flujo de publicación automático salvo una corrección estrictamente necesaria y comprobada.

Para Comisiones, cualquier nuevo proceso debe integrarse de manera controlada y compatible con el costo cero.

---

## 20. SEO Y NAVEGACIÓN

Mantener y mejorar los enlaces existentes.

Las fichas públicas deben tener:

- Títulos descriptivos.
- Metadescripciones.
- URL estables.
- Enlaces internos.
- HTML indexable.
- Fechas correctas.
- Referencias oficiales.

Conectar:

Proyecto ↔ Votaciones ↔ Parlamentarios ↔ Comisiones.

No generar contenido duplicado masivo.

No alterar rutas existentes sin mantener compatibilidad.

---

## 21. IMPLEMENTACIÓN

No quiero que este encargo termine en una nueva auditoría o un documento de recomendaciones.

**El objetivo es implementar.**

Orden recomendado:

### Etapa 1 — Adaptación de información existente

Recuperar y presentar correctamente los títulos, materias, relaciones y estados ya disponibles.

### Etapa 2 — Rediseño visual

Implementar portada, búsqueda, navegación, listas, fichas, fotografías, logotipos y resultados.

### Etapa 3 — Profundización contextual

Implementar panel derecho, historial, votos nominales, fuentes y detalles.

### Etapa 4 — Comisiones

Reutilizar los datos existentes e integrar fuentes oficiales adicionales únicamente cuando sea necesario.

### Etapa 5 — Experiencia educativa

Crear el apartado interactivo que explica cómo funciona una votación y la tramitación.

### Etapa 6 — Validación

Probar datos, navegación, escritorio, móvil, rendimiento, SEO y accesibilidad.

Continuar con la implementación hasta completar las funcionalidades que los datos permitan.

No detenerse en un plan o wireframe.

---

## 22. VALIDACIONES

Comprobar, al menos:

1. Búsqueda por nombre de proyecto.
2. Búsqueda por número de boletín.
3. Búsqueda por parlamentario.
4. Identificación correcta de fotografías.
5. Identificación correcta de logotipos.
6. Agrupación de votaciones por proyecto.
7. Resultados oficiales.
8. Estados de tramitación.
9. Apertura y cierre del panel derecho.
10. Navegación entre proyectos, votaciones y personas.
11. Integración de comisiones.
12. Documentos y fuentes.
13. Compatibilidad con enlaces anteriores.
14. Correcto funcionamiento de las actualizaciones existentes.
15. Ausencia de nuevas consultas innecesarias.
16. Experiencia móvil.
17. Accesibilidad.
18. Compilación y pruebas automatizadas.

Realizar una revisión visual real mediante navegador.

No considerar terminado el trabajo únicamente porque compile.

---

## 23. ENTREGA FINAL

Entregar:

- Resumen de funcionalidades implementadas.
- Capturas reales de escritorio y móvil.
- Archivos principales modificados.
- Nuevos componentes reutilizables.
- Datos existentes aprovechados.
- Nuevas integraciones de Comisiones, si fueron necesarias.
- Pruebas realizadas.
- Limitaciones concretas de las fuentes.
- Comparación de rendimiento.
- Confirmación de que continúan funcionando las actualizaciones automáticas.
- Rama y commits.
- Instrucciones de revisión y despliegue.

No desplegar a producción sin aprobación.

---

# RESULTADO FINAL ESPERADO

Quiero que Votaciones sea una sección muy sencilla de utilizar, visualmente atractiva y conectada con los datos oficiales que Cambiómetro ya recopila.

Que cualquier ciudadano pueda encontrar un proyecto, comprender qué se votó, conocer su estado y revisar cómo votaron los parlamentarios.

El usuario no debe enfrentarse a una base de datos, códigos técnicos ni textos explicativos interminables.

Debe encontrar una experiencia clara y rápida.

Las fotografías, los logotipos, los colores discretos y los paneles contextuales deben ayudar a comprender los datos.

Los procesos de extracción, almacenamiento y actualización que ya funcionan deben permanecer intactos.

**Prioridad absoluta: aprovechar los datos existentes y mejorar la experiencia del usuario, no reconstruir la infraestructura.**

Implementa la solución completa sobre lo que ya existe, valida su funcionamiento y entrégala lista para revisión antes de producción.
