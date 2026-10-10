const CAMARA_VOTACIONES_LEGIBLES = "https://www.camara.cl/legislacion/sala_sesiones/votaciones.aspx";
const CAMARA_VOTACION_DETALLE = "https://www.camara.cl/legislacion/sala_sesiones/votacion_detalle.aspx?prmIdVotacion=";

/** Never expose the Cámara's machine-readable XML endpoint as a public link. */
export function getVotacionReadableUrl(entry: {
  camara: "Cámara" | "Senado";
  fuente_url: string;
  id?: string | null;
  votacion_id?: string | null;
  tramite_url?: string | null;
  tramiteUrl?: string | null;
}): string {
  if (entry.camara === "Cámara") {
    const sourceId = entry.id ?? entry.votacion_id ?? "";
    const numericId = sourceId.match(/(?:camara-vot-)?(\d+)$/i)?.[1];
    if (numericId) return `${CAMARA_VOTACION_DETALLE}${numericId}`;
  }

  const humanUrl = (entry.tramite_url ?? entry.tramiteUrl)?.trim();
  if (humanUrl && !/(?:\.asmx|\.xml|\/api\/)/i.test(humanUrl)) return humanUrl;
  if (entry.camara === "Cámara") return CAMARA_VOTACIONES_LEGIBLES;
  return entry.fuente_url;
}
