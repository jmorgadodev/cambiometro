export function normalizeRemunerationText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Algunas fuentes publican nombres chilenos con los apellidos en posiciones
// distintas (por ejemplo, "RÍO SEBASTIÁN TORREALBA DEL" frente a
// "SEBASTIÁN TORREALBA DEL RÍO"). La llave de identidad sólo se usa para
// agrupar y buscar; el nombre original permanece intacto en cada fila.
export function normalizeRemunerationNameKey(value) {
  const normalized = normalizeRemunerationText(value);
  return normalized ? normalized.split(" ").sort().join(" ") : "";
}

export function personKeyForRemuneration(name, recordId = "unknown") {
  return normalizeRemunerationNameKey(name) || `unknown-${recordId}`;
}

export function relationStatus(sourceIds) {
  const ids = [...new Set(sourceIds)].filter(Boolean);
  return ids.length > 1 ? "possible" : "single_source";
}

export function remunerationAmountState(value) {
  if (value === null || value === undefined || value === "") return "monto_no_publicado";
  return Number.isFinite(Number(value)) ? "publicado" : "monto_no_publicado";
}
