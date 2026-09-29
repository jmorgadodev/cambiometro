export function normalizeRemunerationText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CL")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const SPANISH_MONTHS = Object.freeze({
  enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
  julio: "07", agosto: "08", septiembre: "09", octubre: "10", noviembre: "11", diciembre: "12",
});

export function normalizeRemunerationPeriod(value) {
  const raw = String(value ?? "").trim();
  if (/^\d{4}-(?:0[1-9]|1[0-2])$/.test(raw)) return raw;
  const normalized = normalizeRemunerationText(raw);
  const match = /^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(\d{4})$/.exec(normalized);
  return match ? `${match[2]}-${SPANISH_MONTHS[match[1]]}` : null;
}

export function remunerationPeriodRange(values) {
  const periods = [...new Set(values.map(normalizeRemunerationPeriod).filter(Boolean))].sort();
  if (!periods.length) return null;
  return periods.length === 1 ? periods[0] : `${periods[0]} / ${periods.at(-1)}`;
}

// Algunas fuentes publican nombres chilenos con los apellidos en posiciones
// distintas (por ejemplo, "RÍO SEBASTIÁN TORREALBA DEL" frente a
// "SEBASTIÁN TORREALBA DEL RÍO"). La llave de identidad sólo se usa para
// agrupar y buscar; el nombre original permanece intacto en cada fila.
export function normalizeRemunerationNameKey(value) {
  const normalized = normalizeRemunerationText(value);
  return normalized ? normalized.split(" ").sort().join(" ") : "";
}

export function isPlaceholderRemunerationName(value) {
  return /^0(?: 0)+$/.test(normalizeRemunerationText(value));
}

export function personKeyForRemuneration(name, recordId = "unknown") {
  const normalizedName = normalizeRemunerationNameKey(name);
  return normalizedName && !isPlaceholderRemunerationName(name) ? normalizedName : `unknown-${recordId}`;
}

export function relationStatus(sourceIds) {
  const ids = [...new Set(sourceIds)].filter(Boolean);
  return ids.length > 1 ? "possible" : "single_source";
}

export function remunerationAmountState(value) {
  if (value === null || value === undefined || value === "") return "monto_no_publicado";
  return Number.isFinite(Number(value)) ? "publicado" : "monto_no_publicado";
}
