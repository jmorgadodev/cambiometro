/** Una opinión o hipótesis no anuncia una salida. Compartido por ETL e interfaz. */
export function movementCommentaryExclusionReason(signal) {
  const title = String(signal.title ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(?:aconseja|aconsejan|recomienda|recomiendan)\b.{0,120}\b(?:evaluar|presentar|renunciar|renuncia|salida)\b/u.test(title)) return "advice_not_departure";
  if (/\bsi (?:yo |el |ella )?fuera\b.{0,120}\b(?:renuncia|renunciado|salida)\b/u.test(title)
    || /\bhabria(?:n)? (?:presentado (?:mi |su |la )?renuncia|renunciado)\b/u.test(title)) return "hypothetical_departure";
  if (/\b(?:pdg|oposicion|diputad[oa]s?|senador(?:a|es|as)?|parlamentari[oa]s?)\b.{0,80}\b(?:cuestiona|critica|rechaza|condena)(?:n)?\b.{0,80}\b(?:designacion|nombramiento)\b/u.test(title)) return "appointment_commentary_not_movement";
  return null;
}

/** Un nombramiento entrante no es otra salida de la persona reemplazada. */
export function isDepartureMovementType(type) {
  return ["renuncia", "cese", "remocion", "cambio", "cambio-puesto", "fallido", "nombramiento-fallido"].includes(type);
}
