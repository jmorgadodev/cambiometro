/** Una opinión o hipótesis no anuncia una salida. Compartido por ETL e interfaz. */
export function movementCommentaryExclusionReason(signal) {
  const title = String(signal.title ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(?:aconseja|aconsejan|recomienda|recomiendan)\b.{0,120}\b(?:evaluar|presentar|renunciar|renuncia|salida)\b/u.test(title)) return "advice_not_departure";
  if (/\bsi (?:yo |el |ella )?fuera\b.{0,120}\b(?:renuncia|renunciado|salida)\b/u.test(title)
    || /\bhabria(?:n)? (?:presentado (?:mi |su |la )?renuncia|renunciado)\b/u.test(title)) return "hypothetical_departure";
  if (/\b(?:pdg|oposicion|diputad[oa]s?|senador(?:a|es|as)?|parlamentari[oa]s?)\b.{0,80}\b(?:cuestiona|critica|rechaza|condena)(?:n)?\b.{0,80}\b(?:designacion|nombramiento)\b/u.test(title)) return "appointment_commentary_not_movement";
  if (!signal.person_name && /\b(?:expectativas?|interrogantes?)\b.{0,100}\bnombramiento\b|\bnombramiento\b.{0,100}\b(?:aun no|no esta|pendiente|esperado)\b/u.test(title)) return "expectation_not_appointment";
  return null;
}

/** Un nombramiento entrante no es otra salida de la persona reemplazada. */
export function isDepartureMovementType(type) {
  return ["renuncia", "cese", "remocion", "cambio", "cambio-puesto", "fallido", "nombramiento-fallido"].includes(type);
}

/** Backing for the reported fact; only verificado_oficial denotes a reviewed legal act. */
export function isBackedMovementSignal(signal) {
  return ["verificado_oficial", "verificado", "corroborado"].includes(signal.status);
}
export function movementSignalStatusLabel(signal) {
  return signal.status === "verificado_oficial" ? "VERIFICADO OFICIAL"
    : signal.status === "verificado" ? "RESPALDO INSTITUCIONAL"
    : signal.status === "corroborado" ? "CORROBORADO PÚBLICAMENTE" : "EN CONFIRMACIÓN";
}
export function strongestMovementSignalState(previous, next) {
  const rank = { en_confirmacion: 0, corroborado: 1, verificado: 2, verificado_oficial: 3 };
  return (rank[next] ?? -1) > (rank[previous] ?? -1) ? next : previous ?? next;
}

/** Comparable scope: reported departures/failed appointments of the four documented authority groups. */
export function isComparableAuthorityDeparture({type,role}) {
  const normalized=String(role??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  return isDepartureMovementType(type) && /^(?:ministr[oa](?:\s|$)|subsecretari[oa](?:\s|$)|seremi(?:\s|$)|secretari[oa]\s+regional\s+ministerial|delegad[oa]\s+presidencial)/u.test(normalized);
}
