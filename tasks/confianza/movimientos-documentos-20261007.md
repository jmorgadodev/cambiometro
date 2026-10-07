# Movimientos: revisión documental de seis fechas · 07-10-2026

## Alcance y decisión

Se revisaron y clasificaron **6/6 casos**, no se confirmaron legalmente seis
salidas. Los anuncios se conservan y cuentan; no se alteran identificadores,
estados ni originales. Las fechas cuestionadas se sustituyen en la presentación
por «Fecha en revisión» y una explicación junto al caso. Una autoridad posterior
informada no prueba un reemplazo efectivo el día de la salida.

Referencia inmutable: `.ci-confianza-audit/data/movimientos.json`, 108.691 bytes,
SHA-256 `e3e6753b280f2535e080aa444c761ed5ea01b4103803284e6a0a55d8e3a372af`.
Este corte contiene 46 filas más 5 señales: 51 eventos, 6 pendientes. No se
escribió en R2 ni se consultó D1 remota. No se ejecutó el ETL.

## Evidencia por caso

| ID (prefijo común `mov-kast-2026-`) | Fecha registrada | Documento consultado | Qué permite afirmar y qué no |
|---|---|---|---|
| `2026-08-11-evelyn-bintrup` | 11 agosto | [MINSAL, 7 septiembre](https://www.minsal.cl/ministerio-de-salud-designa-nueva-seremi-de-la-region-de-los-lagos/) | Sitúa la asunción de Fernanda Robles el 7 de septiembre, no el 11 de agosto. No es el acto de cese de Evelyn Bintrup. |
| `2026-06-25-jorge-heiden` | 25 junio | [Directorio MINAGRI](https://minagri.gob.cl/region-de-arica-y-parinacota/) | Identifica a Christopher Pizarro como autoridad regional. No acredita fechas de asunción o cese; la consulta del directorio no fecha el nombramiento. |
| `2026-05-06-camila-alonso` | 6 mayo | [BCN, decreto 44](https://www.bcn.cl/leychile/navegar?idNorma=1227314) | Decreto del 5 de junio publicado el 20 de agosto. Cita renuncia efectiva el 4 de mayo y dispone asunción de Patricio Martínez el 5 de junio. El 6 de mayo no corresponde a ninguna de esas fechas efectivas. |
| `2026-04-01-patricia-dinamarca` | 1 abril | [Organigrama MINEDUC](https://www.mineduc.cl/organigrama/mineduc/) | Identifica a Dalmiro Yáñez. No acredita asunción ni acto sobre la designación anterior. |
| `2026-03-28-jorge-salazar` | 28 marzo | [Noticia MOP, 10 julio](https://losrios.mop.gob.cl/ingeniero-valdiviano-ulises-rivera-asumio-como-nuevo-seremi-de-obras-publicas-en-los-rios/) | Informa a Ulises Rivera como nuevo seremi. La publicación no prueba asunción el 28 de marzo ni fecha legal de cese de Jorge Salazar. |
| `2026-03-26-alexander-nanjari` | 26 marzo | [Actividad DPR Biobío, 29 julio](https://www.dprbiobio.dpr.gob.cl/2026/07/29/a-estudiantes-de-alto-biobio-delegado-presidencial-julio-anativia-y-seremi-de-educacion-teresa-carrasco-entregan-85-computadores-del-programa-becas-tic/) | Muestra a Teresa Carrasco ejerciendo el cargo. No acredita su fecha de asunción ni el acto sobre Alexander Nanjarí. |

MINAGRI y DPR se contrastaron mediante sus resultados oficiales indexados;
no se interpretó una respuesta inaccesible como ausencia de documento. El
organigrama y la noticia MOP tampoco sustituyen decretos individualizados.

## Causa observada y corrección

En los seis registros, la fecha de la autoridad entrante repite la del evento y
la verificación registrada precede una referencia posterior. Esto no demuestra
qué proceso originó el error; sí invalida presentar esas fechas como una misma
asunción/cese acreditados. No se inventan fechas ni se promueven estados.

La corrección usa una guarda de ID y fecha exactos en
`transparencia-app/lib/movimientos-documentary-review.ts`. Afecta tabla y
cronología de `/movimientos`, conserva fuentes y no modifica el release.
Si cambia el registro, esta nota no se aplica automáticamente a otra fecha:
la nueva evidencia requiere revisión. Otros canales que reutilicen originales
no quedan certificados por esta corrección de presentación.

## Verificación y siguiente cierre

- Pruebas dirigidas: 47/47; incluyen inmutabilidad, combinación ID/fecha,
  separación de tres fechas del decreto y ambas vistas.
- Typecheck, lint de los archivos modificados, enlaces seguros y diff: salida 0.
- Render local: 24/24 comprobaciones (6 casos × tabla/cronología × 390/1440 px),
  sin errores JavaScript ni desborde del documento; enlaces de evidencia visibles.
  Evidencia: `.ci-confianza-audit/movimientos-review/browser.json` y capturas.
- Suite completa: tipos y guardas pasaron; Vitest agotó memoria con concurrencia
  predeterminada y también con un único worker. Segundo proceso detenido tras
  el fallo de memoria; no se cambiaron ni omitieron pruebas. El CI existente
  debe completar esta puerta antes de una promoción.
- CI completo del código `abf3fcf418c4cdeb3911d43596ce4367ec203cc1`:
  [Quality](https://github.com/jmorgadodev/cambiometro/actions/runs/37663585679),
  **277 archivos / 1.614 pruebas**, tipos, lint y guardas aprobados. El fallo
  local de memoria no se confunde con un resultado verde local.
- [Integración](https://github.com/jmorgadodev/cambiometro/actions/runs/37663585593):
  build, API/rutas/búsqueda de fixture, temas y seguridad aprobados; D1 sólo
  local efímera autorizada, no certifica cobertura productiva.
- [Preview canónico](https://github.com/jmorgadodev/cambiometro/actions/runs/37663604313):
  **96/96 controles**, cero fallos. Publicado en
  https://af973bc0.cambiometro.pages.dev; producción no modificada.
- Preview publicado: 24/24 controles específicos de los seis casos en ambas
  vistas a 390/1440 px; capturas inspeccionadas. Archivo público ReleaseSet
  95.598 bytes, SHA-256 `4a683ecb2d24a9777acc0707c014b3d8c6dc8aa12e351df942f13c2ec716c0c7`,
  coincide con el pin. Evidencia local en
  `.ci-confianza-audit/movimientos-review-live-abf3fcf4/` y
  `.ci-confianza-audit/preview-abf3fcf4/`.
- Pendiente: actos de cese/designación donde falten y conciliación de metadatos
  en un candidato de datos separado. No se autoriza aquí su publicación.

Este cierre documental no modifica el avance global (83%) ni certifica todo
Movimientos. Los actos y la afiliación histórica del núcleo siguen pendientes.

Revisión de código: guarda específica sin nuevas dependencias, consultas ni
mutaciones; textos codificados por React y enlaces HTTPS seguros. Regresión,
render, build, suite global y seguridad del código nuevo aprobados. Punto de
presentación/documentación cerrado; PR #719 conserva su estado de borrador.
No autoriza confirmar otros datos ni convierte esta muestra en auditoría nacional.
