# Explorador editorial, fichas y navegación — evidencia local

19-11-2026. Rama codex/votaciones-explorador-fichas-20261119; base e568bacb y origin/main 915fe31e comprobado. Implementación en la única raíz web C:/Users/jorge/Proyectos/cambiometro-public. La herramienta editorial se leyó en social/Publicaciones/Votaciones, sin modificarla ni copiar su servidor o sus operaciones de generación de RRSS.

## Resultado

- Votaciones adapta la estructura editorial: filtros de tema/cámara/fechas, proyectos y materias expandibles, totales conocidos separados de ausencia, detalle modal dentro del sitio y nómina conciliada cuando existe.
- Consulta inicial 2026-01-01 a 2026-12-31. Carga por cursores; distingue registros cargados, total disponible y grupos formados con lo cargado. No descarga todo el archivo en una respuesta ni presume que los grupos ya cubren el universo.
- Legisladores abre 205 expedientes de votos propios bajo /votaciones/legisladores/[slug], con canonical individual y opciones en revisión separadas; no redirige a la ficha general.
- Sesiones muestra sus decisiones aquí. Sin identificador acreditado se presenta jornada, no sesión inventada. Asistencia se retira de la navegación y de los resultados.
- Identidad debajo del nombre y partido, campos declarados/biográficos distinguidos, contacto y redes sólo disponibles. Antecedentes: timeline, militancias y declaración. Sin cambios de montos o períodos financieros.
- Enlaces de portales oficiales canalizados mediante SourceLink a /fuentes/?referencia=URL; allí se conserva el acceso verificable y se valida dominio/esquema. Redes, contacto y autoría siguen directos. Se preservan URL de evidencia en los datos. El guard S4 reconoce SourceLink y sigue exigiendo noopener/noreferrer para pestañas nuevas.
- Datos mantiene contenido bajo En construcción, con noindex. Metodología usa cifras del corte y explica las limitaciones; conserva anclas. Footer: Creado por Jorge Morgado, https://jmorgado.pages.dev/; retirado Impulsado por ImpulsaCV.

## Corrección de la mezcla de asistencia

La consulta de la app editorial source=camara&component=votaciones devolvía 19.697 registros de 2026. El Worker no usa component como filtro en esa rama; un registro examinado era kind=attendance (camara-camara-attendance-4747-990, 2026-01-26). Ese total no equivale a votos. Se usa el alias source=votaciones_camara con kind=vote: 1.721 registros disponibles, frente a 504 del Senado, con las fechas de 2026 completas. La primera interpretación de la diferencia de cantidades se descartó tras revisar las clases de registros.

El contrato puro rechaza attendance y otros tipos, fechas inválidas y valores ausentes/espacios/arreglos que no deben convertirse en cero. Totales sin nómina no habilitan nombres. Los contratos de API generales y el repositorio editorial no fueron modificados; se corrige el consumidor web. No se extrajeron fuentes ni se publicaron datos.

## Verificación

Suite integrada: 2.044 casos; 2.042 correctos y dos timeouts bajo compilación Next concurrente. Ambos casos (defensible-pages y ranged-csv-source) se reprodujeron aislados y sus siete pruebas pasaron. Se añadieron después tres pruebas para las 205 rutas/canonical y la prioridad declarada en la cabecera, todas correctas. Pruebas finales de contratos/fichas: 16 correctas. Lint de archivos afectados sin errores; quedan advertencias preexistentes en otros componentes. Tipos, arquitectura, tokens, enlaces seguros e inyección correctos.

Navegador Next real: 14 recorridos en 1440/390 px, cero errores JS. Prueba de detalle modal/Escape, paginación 200→400, sesiones internas, expediente de legislador, identidad visible, antecedentes sin Lobby, Datos con contenido, footer y referencia oficial conservada. Axe valida el modal y Metodología en ambos tamaños. Tabla móvil con foco para desplazamiento. Capturas finales de cabecera y consola: sin errores ni avisos después de normalizar las claves de los bloques de servidor.

Las respuestas API se capturaron una vez por página validada y se reutilizaron en browser, dos páginas por cámara, con checksums. Evidencia local ignorada: transparencia-app/artifacts/renovacion-local (api-receipt.json, browser-receipt.json, capturas, lint.json, types.log, console.json). Las fichas/Metodología del servidor local usan las entradas locales existentes; estas pruebas no afirman paridad de montos contra producción. Los tests financieros existentes pasaron. No se ejecutó un build completo de Pages con datos Git como sustituto de R2.

## Revisión y entrega

Servidor local http://localhost:3107/votaciones/; reutilizarlo antes de iniciar otro (Next dev, puerto 3107). Código en rama local, sin push/CI/despliegue para estos ajustes. La preview publicada bc6175ea/40c43f70 sigue fija y no contiene esta renovación.

Al autorizar una nueva entrega agrupada: lint/tipos y pruebas afectadas; build UI-only hidratando R2 vigente; comprobar export de las 205 rutas nuevas, los catorce apartados en construcción y sus headers; ejecutar smoke sobre ese artefacto y API; registrar SHA/release-set/rollback. No dar por estabilizados los ETL por este cambio de navegación. Campos oficiales aún no incorporados (incluidas redes senatoriales ausentes) no se rellenan por conjetura.

## Comprobación final sin interceptación

Se reutiliza publicApiUrl, el helper compartido del sitio: localhost y Pages previews consultan la API pública por CORS; producción mantiene same-origin. No se añadieron rutas API dinámicas incompatibles con output export. La prueba nativa del navegador, sin respuestas simuladas, cargó 200 votos y aplicó Cámara/2026-01-01/2026-02-28: la API informó 244 disponibles, primera página 100, fechas observadas 2026-01-28 a 2026-01-20. Sólo GET publicados; cero errores de consola. Recibo live-api-browser.json y captura votaciones-live-1440.png en artifacts/renovacion-local.

Tras esa conexión pasaron las 16 pruebas afectadas de contrato/origen API/rutas/identidad, tipos, lint afectado, enlaces y diff. La revisión automática de un comando previo se interrumpió por límite de uso; el comando no se ejecutó entonces y se retomó cuando Jorge pidió continuar. No fue un rechazo por inseguridad.

Seguimiento independiente para editorial: su consulta amplia de Cámara puede mezclar attendance con vote; la corrección del consumidor web no modifica el servidor o índice de RRSS. Ese repositorio conserva su trabajo local.
