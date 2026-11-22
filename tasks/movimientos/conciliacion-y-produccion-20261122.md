# Conciliación de Movimientos y publicación autorizada — 22-11-2026

Solicitud posterior de Jorge: comparar todos los casos con renunciaskast.cl, revisar uno por uno los pendientes y publicar todos los avances cuando la revisión y sus validaciones estén completas. Autoriza push, PR, ejecución del flujo de publicación y promoción de la misma entrega validada; conservar rollback y R2 vigente. No habilita inventar confirmaciones para igualar un número.

## Base comprobada

- Interfaz terminada: `ba7bf255`, documentada en `5a12e113`. 2.222 pruebas y 69 comprobaciones reales aprobadas; 5.104 páginas. Local http://127.0.0.1:3201/movimientos/.
- Referencia descargada desde su HTML público, array D leído con AST de literales, sin ejecutar JavaScript externo: 61 casos.
- JSON público capturado: 46 movimientos y 19 anuncios, 65 registros. Copia y SHA en artifacts/movimientos-conciliacion-20261122/published-before.json y comparison.json.
- Última ejecución 45035615271: success. El informe comprueba 27 evidencias revisadas, cero diferidas. No es un ETL detenido. La promoción legal sólo reconoce actos de Ley Chile/Diario Oficial, por eso un comunicado que informa una salida no cambia por sí solo el estado legal.

## Hallazgos y pendientes de revisión

- Cuatro noticias de Carolina Rossi no tienen person_name y permanecen como cuatro anuncios. El enriquecimiento con una identidad y contexto acreditados debe reunir sus respaldos en un solo caso, con trazabilidad de los IDs originales.
- Una noticia de expectativas por un futuro delegado en Biobío se interpreta como nombramiento. No acredita que se haya anunciado una designación y debe quedar como observación, sin contarse como movimiento.
- Josefina Soto es un nombramiento entrante; se conserva, pero no es otra salida. El catálogo de referencia cuenta determinadas categorías de salidas y nombramientos fallidos, no todos los registros de Movimientos.
- La nota del Biobío contiene dos personas (Isabel Rojas y Antaris Varela); hay que identificar cada hecho sin fusionarlos por compartir un enlace. El directorio regional de Senama está fuera del alcance del conteo de la referencia, pero no se eliminará una evidencia para ajustar una cifra.
- Cristián Bravo: el enlace de SoyChile informa la asunción del sucesor y no menciona a Bravo en el contenido recuperado. Buscar evidencia explícita de su nombramiento fallido; no deducir cese y fecha desde un sucesor. Cambio21 lo incluye en un listado periodístico; comprobar dependencia del agregador y atribuir correctamente el nivel de evidencia si se incorpora como reporte pendiente.
- Ya se comprobaron comunicados explícitos de MINVU (Jorge Olivares y Sebastián Norambuena), Economía (Juan Carlos Meléndez y Rodrigo Aguilera) y Hacienda (Ronald Ruf). Distinguir confirmación institucional del hecho y verificación del acto administrativo. Ronald: Hacienda fecha la presentación el 16-10; prensa reporta efecto el 30-10. No confundir presentación, publicación y efecto.
- MINSAL sobre José Bravo sólo informa una solicitud de renuncia; no acredita por sí sola fecha efectiva. Una resolución sanitaria localizada menciona su nombramiento, no su cese.

## Trabajo siguiente

1. Terminar matriz de los 20 pendientes originales y los tres casos de referencia sin asociación nominal; fuente, fecha, hallazgo, decisión y motivo de no promoción cuando corresponda.
2. Preparar candidato mediante procesos existentes y cambios localizados de proyección/curación. Preservar los 46 IDs históricos, fuentes y aliases. Diferenciar hechos corroborados, confirmación institucional y actos legales sin afirmar que sean equivalentes.
3. Validar conciliación por casos, categorías, fechas y estados. Mostrar el conteo comparable de salidas separado de nombramientos y otros cargos. No imponer una cifra sin respaldo.
4. Integrar todo el código local de Votaciones y Movimientos con origin/main actual; revisar la entrega agrupada. Usar workflows y releases vigentes, un preview y el mismo artefacto para producción. No desplegar un árbol local modificado ni fixtures de septiembre.
5. Verificar en producción SHA, release-set, landing, fichas, dashboard, Votaciones, Movimientos, datos y rollback. Cerrar con recibo publicado, no sólo con el comando de despliegue.

La revisión documental y los cambios de datos todavía están en curso. No se ha publicado ni escrito en R2 durante esta conciliación.

## Cierre local de la conciliación

- 61 correspondencias únicas por persona dentro del alcance comparable (ministros, subsecretarios, seremis y delegados presidenciales). 63 registros completos: también se conservan el nombramiento entrante de Josefina Soto y el reporte pendiente de dirección regional de Senama de Antaris Varela. No se suman como salidas comparables.
- Se distinguen dos cargos de Antaris Varela: su caso de junio sí pertenece al alcance comparable; el reporte de Senama de noviembre no es un duplicado.
- Matriz individual de los 20 pendientes originales: revision-casos-20261122.json. Correspondencias completas y procedencia de la referencia: conciliacion-casos-20261122.json.
- Cuatro noticias de Carolina Rossi se reúnen con aliases; una expectativa sin designación queda como observación. La noticia compartida de Isabel Rojas y Antaris genera dos personas distintas. Cristián Bravo se incorpora sólo como reporte pendiente y sin fecha efectiva inventada.
- Cinco pendientes conservados: José Bravo Burgos, David Plaza, Isabel Rojas, Antaris Varela (Senama) y Cristián Bravo. Los restantes hechos tienen respaldo periodístico o institucional; sólo Duco y Meléndez presentan actos legales individualizados revisados en esta entrega.
- Otero: su renuncia es corroborada, independiente del anuncio de reemplazo; no se acredita la fecha de incorporación de Sofía Rengifo. Duco: decreto 130, efecto 14-08, publicación 21-09. Meléndez: decreto 95, efecto 01-10, publicación 30-10; la comunicación del 30-09 se conserva separada.
- Se corrigieron progresión de estados, enriquecimiento por fuentes explícitas y asociación de personas en el proceso existente. Los casos corroborados siguen sujetos a seguimiento legal; no se reconstruyeron conectores ni se cambiaron horarios o almacenamiento.
- Validación: 344 archivos / 2.232 pruebas; tipos, guards y lint sin errores (185 advertencias existentes); 24 comprobaciones reales del navegador en escritorio/móvil, accesibilidad, todos los IDs, aliases y fechas. Capturas y recibo en transparencia-app/artifacts/movimientos-conciliacion-20261122/browser/.
- El candidato local se obtuvo de los bytes publicados, sin extracción y sin fingir una ejecución ETL. Las entradas Git temporales se restauraron por SHA antes del commit.

## Publicación agrupada

Usar PR con toda la ascendencia pendiente (explorador, precisión normativa, Votaciones y Movimientos), CI verde, ETL de Movimientos una sola vez desde R2 y un preview construido con los releases vigentes. Promover ese artefacto mediante pages-promote-artifact. Evitar compilaciones automáticas duplicadas cancelando exclusivamente los runs de Pages de esta integración; no deshabilitar workflows ni crons. Registrar SHA, ReleaseSet, checksums publicados y deployment de recuperación en el recibo final.
