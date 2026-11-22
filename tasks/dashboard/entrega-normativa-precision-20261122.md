# Entrega local — precisión normativa — 22-11-2026

Se revisaron diez conceptos y veinte definiciones históricas (83 condiciones con ámbito y referencia particular). Se conserva el diseño compacto, los documentos originales, las vigencias y el mecanismo de detección. La revisión corresponde a disposiciones seleccionadas de las resoluciones 11 y 12; no certifica la totalidad de reglamentos internos, oficios anuales ni expedientes individuales.

## Cambios comprobables

| Concepto | Precisión incorporada |
|---|---|
| Asignaciones parlamentarias | Reasignaciones de asignaciones individuales, disponibilidad y respaldo documental; incompatibilidades y excepciones comunes centralizadas. Res11 y Res12 conservan sus diferencias. |
| Personal de apoyo | 25 % agregado sólo para contratos de expertos, sobre asignación con reasignaciones autorizadas; no tope salarial individual ni clasificación inferida del cargo. Contrato laboral/honorarios, costos, prácticas, contratación conjunta y modificaciones se distinguen. |
| Asesorías externas | Requisitos del prestador/registro, contrato y formulario; informe cuando el contrato lo exige, reserva legal y publicidad del formulario; excepción de asistentes en comisiones y acreditación propia; contratación conjunta. |
| Actividades territoriales | Actividad comunitaria frente a atención de autoridades, topes y respaldo propios; candidatos y no candidatos en período electoral. |
| Oficinas | Compartir entre parlamentarios frente a otros usos; oficina propia, habilitación/autorización y urgencia, equipamiento específico y oficina móvil; restricciones electorales por modalidad. |
| Telefonía | Beneficiarios y vínculo laboral del personal; roaming excepcional del parlamentario; propiedad y reposición de equipos. |
| Vehículos | Registro propio/arrendado y vehículos adicionales del personal; mantenimiento según versión, límite por vehículo propio/año sólo en Res12 y excepciones de neumáticos/parabrisas; combustibles, arriendos y período electoral. |
| Desplazamientos | Beneficiario y ámbito territorial; aviso previo frente a autorización; 60 % agregado sólo de taxis/aplicaciones en Res12, sin trasladarlo a todos los transportes ni a Res11. |
| Alojamiento y alimentación | Rendición diaria por persona frente a viático del parlamentario; incompatibilidad para la misma persona/día y alternativa documentada; alimentación del personal en otra comuna sólo bajo condiciones de Res12. |
| Comunicación | Condición local sólo para medios indicados; servicios digitales, reconocimientos expresamente permitidos, candidatos y no candidatos; identificación partidaria no equivale por sí sola a propaganda. |

La [matriz por versión, condición, sección y página PDF](normativa-precision-referencias-20261122.md) contiene el respaldo exacto de cada corrección. Se separaron los enlaces de disposiciones ubicadas en distintas páginas; las continuaciones tienen su propia referencia. Los títulos de condición explicitan su ámbito y se abren progresivamente. Las reglas comunes y referencias completas permanecen en **Metodología → Normativa y fuentes**. La misma presentación compartida sirve a fichas, dashboard, comparación y registros.

## Caso Ossandón — abril de 2026

Se conservaron exactamente los cuatro registros de nómina, sus denominaciones, importes y contratos INDEFINIDO:

| Nombre original | Cargo original | Monto informado |
|---|---|---:|
| KING SUAU MARIA PAZ | APOYO ADMINISTRATIVO | $6.045.364 |
| PEREZ CERDA NATALIA MAGALY | ASESOR (A) LEGISLATIVO | $3.574.412 |
| MATURANA LABARCA OMAR MAURICIO | CONDUCTOR | $1.931.307 |
| COLLAO RAMOS SUSANA ANYELINA | SECRETARIA (O) DE PARLAMENTARIO | $1.806.479 |
| Total | Cuatro registros | $13.357.562 |

Los nombres, cargos y montos se cotejan contra el snapshot publicado fijado por el release de datos. La prueba de componente incluye un estado técnico interno ALTA para demostrar que ya no se transforma en una alerta pública. La interfaz no convierte «Apoyo administrativo» o «Asesor legislativo» en clasificación de experto, ni aplica 25 % a una persona. El ejemplo individual no aparece en el panel normativo compartido.

Se retiró de PersonalApoyoMensual el bloque público que calificaba una diferencia contra la base como «Exceso»/«Hallazgo de integridad». Se utiliza «Monto total informado». Los cálculos, evaluaciones técnicas internas, contratos de datos y ETL permanecen intactos; esos estados no constituyen una conclusión jurídica pública. Una evaluación individual requiere contrato, modificaciones, desglose remuneracional y presupuesto con reasignaciones acreditadas.

Como antecedente separado, los índices oficiales de comisiones identifican a King como jefa de gabinete en [14 de abril](https://www.senado.cl/actividad-legislativa/comisiones/221/22431) y [21 de abril](https://www.senado.cl/actividad-legislativa/comisiones/221/22461). La consulta directa devolvió 403: se dispone de la identificación indexada, no de una descarga íntegra adicional de esas páginas. Ese antecedente no cambia el cargo de nómina ni acredita categoría contractual o incumplimiento.

## Fuentes, continuidad y recuperación

Los originales de ambas resoluciones se contrastaron con los PDF oficiales actuales: bytes y SHA-256 coinciden con los originales conservados. Se revisaron texto, diferencias entre versiones y páginas clave renderizadas. Ver matriz de referencias y `artifacts/normative-precision/official-pdf-verification.json`.

No se cambiaron montos, identidades, particiones financieras, sumas, ETL, almacenamiento, conexiones, vigencias legales, monitor ni workflow. No hay consultas dinámicas adicionales para abrir los paneles. Para el build se reutilizan exclusivamente los cuatro insumos publicados ya verificados, desde caché local, sin ejecutar extracción. Se reconstruyen particiones mensuales offline y se restauran los insumos originales por checksum al terminar; el artefacto local conserva los datos publicados.

La recuperación consiste en revertir los commits de esta entrega sobre la rama local; no modifica archivos remotos ni requiere repetir ETL. No se efectuó push, PR, activación de workflows ni despliegue. Producción requiere una autorización posterior.

## Ajuste incidental verificado

La prueba del artefacto estático detectó un prefetch automático de Next desde el enlace a Fuentes de Metodología hacia metadatos `_tree` que el export estático elimina intencionalmente. Se desactivó el prefetch únicamente en ese enlace, siguiendo la documentación instalada de Next y la configuración existente de navegación estática. El enlace y su destino se conservan. La prueba registra respuestas fallidas y sigue exigiendo consola limpia; no se silenció el 404.

## Evidencia de cierre

Artefacto de código `3c65cba2`, construido y validado localmente; commit principal `bacfc453` y precisión de páginas `e294f58a`. [Recibo completo con checksums](normativa-precision-validacion-20261122.json).

- Suite integrada: **340 archivos / 2.183 pruebas**, tipos de aplicación/API y guardas de arquitectura, colores, enlaces e innerHTML aprobadas. Tras afinar las páginas de referencia, **24 pruebas del módulo** volvieron a pasar; el último ajuste de prefetch pasó tipos/build/lint y navegador.
- Lint global aprobado; lint adicional del enlace y su prueba aprobado.
- Build completo aprobado: **4.886 páginas**, verificación de export estático y conciliación de particiones de gastos: 174.981 registros/slices coincidentes. No se ejecutó ETL.
- Navegador sobre el artefacto estático con CSP real: **16 comprobaciones de precisión + 28 de presentación compacta + 52 del explorador = 96 aprobadas**. Sin errores de consola, excepciones, respuestas fallidas registradas o solicitudes API/D1. Incluye accesibilidad, Escape/foco, móvil, versiones históricas, filtros, enlaces compartibles y CSV.
- Bootstrap financiero idéntico byte a byte al artefacto previo: SHA-256 `f11c1a2e4c5d187e169eedb8edd83b86c47519bfe50ba6fe93571b0aebc31956`; **205 parlamentarios, 41 particiones**, 24.637.852 bytes de detalle, todos verificados contra sus hashes. Release `c0f178e56987fa51aee4554fea47c315c678df71a8b9ac14ca51d5cead709e14`; proyección `97d3b43af2c5c08d98a1c4745c7f0dfa52427a049819fe31d06cb69ab5d3fd7a`.
- Los cuatro insumos temporales y los 179 archivos mensuales originales fueron restaurados y comprobados por SHA-256. El servidor estático conserva el artefacto validado.
- Transferencia inicial local: 615.314 bytes frente a 606.578 del artefacto previo, unos 8,7 kB adicionales; **cero particiones de detalle cargadas inicialmente**. Misma compresión Brotli 4 y CSP. Es una medición local orientativa, no una medición de CDN, facturación o usuarios reales. No se agregaron consultas dinámicas, infraestructura ni programación recurrente.

Revisión local: [Dashboard](http://127.0.0.1:3201/dashboard/) · [Normativa y fuentes](http://127.0.0.1:3201/como-funciona/#normativa-y-fuentes) · [Caso Ossandón](http://127.0.0.1:3201/politico/manuel-jose-ossandon-irarrazabal/#seccion-asesores), seleccionar abril de 2026.

Capturas reales inspeccionadas: [Personal: expertos](../../transparencia-app/artifacts/normative-precision/screenshots/personal-expertos.png), [móvil](../../transparencia-app/artifacts/normative-precision/screenshots/personal-expertos-movil.png), [vehículos](../../transparencia-app/artifacts/normative-precision/screenshots/vehiculos-precision.png), [cuatro registros originales](../../transparencia-app/artifacts/normative-precision/screenshots/ossandon-abril-sin-alerta.png).

**Entrega local terminada. Sin publicación en producción.**
