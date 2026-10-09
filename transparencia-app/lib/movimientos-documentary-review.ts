interface DocumentaryReview {
  dateInReview: true;
  note: string;
  sourceUrl: string;
}

// Revisión de los documentos del 07-10-2026, no un reemplazo del release original.
// Cada nota sólo corresponde a la combinación ID/fecha observada en ese corte.
const reviews: Record<string, { date: string; note: string; sourceUrl: string }> = {
  "mov-kast-2026-2026-08-11-evelyn-bintrup": {
    date: "2026-08-11",
    note: "El comunicado de MINSAL sitúa la asunción de Fernanda Robles el 7 de septiembre de 2026. No acredita una asunción el 11 de agosto ni es el acto de cese de Evelyn Bintrup. Las fechas del registro están en revisión.",
    sourceUrl: "https://www.minsal.cl/ministerio-de-salud-designa-nueva-seremi-de-la-region-de-los-lagos/",
  },
  "mov-kast-2026-2026-06-25-jorge-heiden": {
    date: "2026-06-25",
    note: "El directorio de Agricultura identifica a Christopher Pizarro como autoridad regional, pero no acredita la fecha de su asunción ni la fecha de cese de Jorge Heiden. No se interpreta como un reemplazo ocurrido el mismo día.",
    sourceUrl: "https://minagri.gob.cl/region-de-arica-y-parinacota/",
  },
  "mov-kast-2026-2026-05-06-camila-alonso": {
    date: "2026-05-06",
    note: "El decreto 44 distingue la salida de Camila Alonso el 4 de mayo y la asunción de Patricio Martínez el 5 de junio de 2026; su publicación es del 20 de agosto. La fecha 6 de mayo del registro no acredita ninguna de esas fechas efectivas y queda en revisión.",
    sourceUrl: "https://www.bcn.cl/leychile/navegar?idNorma=1227314",
  },
  "mov-kast-2026-2026-04-01-patricia-dinamarca": {
    date: "2026-04-01",
    note: "El organigrama de Educación identifica a Dalmiro Yáñez, pero no acredita su fecha de asunción ni el acto que dejó sin efecto la designación anterior. Las fechas del registro están en revisión.",
    sourceUrl: "https://www.mineduc.cl/organigrama/mineduc/",
  },
  "mov-kast-2026-2026-03-28-jorge-salazar": {
    date: "2026-03-28",
    note: "La noticia de Obras Públicas informa la asunción de Ulises Rivera. Su publicación no acredita por sí sola una asunción el 28 de marzo ni el acto sobre Jorge Salazar. Las fechas del registro están en revisión.",
    sourceUrl: "https://losrios.mop.gob.cl/ingeniero-valdiviano-ulises-rivera-asumio-como-nuevo-seremi-de-obras-publicas-en-los-rios/",
  },
  "mov-kast-2026-2026-03-26-alexander-nanjari": {
    date: "2026-03-26",
    note: "La publicación de la Delegación Presidencial muestra a Teresa Carrasco ejerciendo el cargo, pero no acredita su fecha de asunción ni el acto sobre Alexander Nanjarí. Las fechas del registro están en revisión.",
    sourceUrl: "https://www.dprbiobio.dpr.gob.cl/2026/07/29/a-estudiantes-de-alto-biobio-delegado-presidencial-julio-anativia-y-seremi-de-educacion-teresa-carrasco-entregan-85-computadores-del-programa-becas-tic/",
  },
};

export function movementDocumentaryReview(movement: { id: string; fecha: string }): DocumentaryReview | null {
  const review = reviews[movement.id];
  if (!review || review.date !== movement.fecha) return null;
  return { dateInReview: true, note: review.note, sourceUrl: review.sourceUrl };
}
