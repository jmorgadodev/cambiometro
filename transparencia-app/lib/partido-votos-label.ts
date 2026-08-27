export interface ConteoVotosLabel {
  emitidos: number;
  apariciones: number;
}

/**
 * Presentation-only copy. Kept free of roster/data imports so client bundles
 * never pull server-side filesystem modules into the browser.
 */
export function etiquetaVotosPorCamara(
  camara: "Cámara" | "Senado",
  miembros: number,
  conteo: ConteoVotosLabel,
): string {
  const plural = camara === "Senado" ? "senadores" : "diputados";
  if (miembros === 0) return `Sin ${plural} en el padrón vigente`;
  if (conteo.apariciones === 0) return `Sin registros de votación publicados para sus ${plural}`;
  return `${conteo.emitidos.toLocaleString("es-CL")} votos emitidos por sus ${plural} en sala`;
}
