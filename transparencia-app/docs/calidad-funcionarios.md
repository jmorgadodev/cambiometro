# Calidad y normalización de funcionarios

El Cambiómetro conserva el registro recibido desde Transparencia Activa y
aplica una normalización limitada sólo a la presentación pública. El objetivo
es hacer legible una nómina con errores de formato sin convertir una inferencia
en un dato oficial.

## Correcciones inequívocas

- se recortan espacios repetidos al inicio y al final;
- se retiran signos aislados al comienzo del nombre, por ejemplo `. Ezzio`;
- se retiran números aislados al comienzo del nombre, por ejemplo `0 Albornoz`;
- un sueldo líquido `0` o vacío, cuando existe un bruto positivo, se muestra
  como **No informado por la fuente** en vez de presentarlo como un pago real.

Cada fila afectada incluye `calidad_datos` con las incidencias detectadas.
Cuando el nombre o el líquido fueron modificados para lectura, se conserva
`nombre_completo_original` o `remuneracion_liquida_mensual_original`.

## Lo que no se corrige automáticamente

No se inventan nombres, apellidos, cargos ni montos. Por ejemplo, un apellido
repetido como `Sanhueza Sahueza` no se reemplaza sin evidencia adicional. La
fuente, el período, el identificador y el enlace de procedencia permanecen
disponibles para revisar el registro original.

La página informa cuando la muestra visible contiene registros normalizados y
explica que la depuración es de formato. La API publica el resumen
`meta.calidadDatos` para que consumidores externos puedan distinguir el
alcance de la revisión.

La nómina ofrece el filtro **Calidad de la fuente** con tres opciones:

- **Todos los registros**: no aplica una clasificación;
- **Correcciones de formato**: nombres con prefijos o problemas de formato
  inequívocos que fueron corregidos sólo para lectura;
- **Datos observados por auditoría**: inconsistencias de montos o campos que
  requieren revisión, sin reemplazar el valor oficial.

“Datos observados” es deliberado: describe una revisión de calidad y no acusa
que la fuente sea falsa o que el organismo haya cometido una infracción.

## Alcance

Las mismas reglas se ejecutan en el Worker, en el fallback estático del
navegador y durante la ingesta municipal. Los archivos originales no se
reescriben: la normalización se genera como una capa reproducible de lectura.
