export function normalizeRemunerationText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function personKeyForRemuneration(name, recordId = "unknown") {
  return normalizeRemunerationText(name) || `unknown-${recordId}`;
}

export function relationStatus(sourceIds) {
  const ids = [...new Set(sourceIds)].filter(Boolean);
  return ids.length > 1 ? "possible" : "single_source";
}

export function remunerationAmountState(value) {
  if (value === null || value === undefined || value === "") return "monto_no_publicado";
  return Number.isFinite(Number(value)) ? "publicado" : "monto_no_publicado";
}
