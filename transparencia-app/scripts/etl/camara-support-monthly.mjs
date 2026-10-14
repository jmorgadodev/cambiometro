import { CAMARA_GENERAL_SUPPORT_URL } from "./camara-personal-apoyo-general.mjs";

export function planCamaraSupportMonths(dataset, throughPeriod) {
  if (!/^20\d{2}-(0[1-9]|1[0-2])$/.test(String(throughPeriod))) throw new Error("CAMARA_SUPPORT_PERIOD_INVALID");
  const published = Object.values(dataset?.diputados ?? {}).flatMap((deputy) =>
    Object.entries(deputy.personal_apoyo_por_periodo ?? {})
      .filter(([period, entry]) => /^2026-(0[1-9]|1[0-2])$/.test(period) && entry.status === "available" && entry.rows?.length)
      .map(([period]) => period)).sort();
  const latest = published.at(-1);
  if (!latest) throw new Error("CAMARA_SUPPORT_HISTORY_REQUIRED");
  if (throughPeriod < latest) return [];
  const through = throughPeriod > "2026-12" ? 12 : Number(throughPeriod.slice(5));
  return Array.from({ length: Math.max(0, through - Number(latest.slice(5))) }, (_, index) =>
    `2026-${String(Number(latest.slice(5)) + index + 1).padStart(2, "0")}`).slice(0, 2);
}

export function validateCamaraSupportObservation(observation, dataset, throughPeriod) {
  const planned = planCamaraSupportMonths(dataset, throughPeriod);
  const age = Date.now() - Date.parse(observation?.observedAt);
  if (observation?.sourceUrl !== CAMARA_GENERAL_SUPPORT_URL || !Number.isFinite(age) || age < -60_000 || age > 86_400_000
    || !Array.isArray(observation.observations) || !Array.isArray(observation.imports)) throw new Error("CAMARA_SUPPORT_OBSERVATION_INVALID");
  if (planned.length && !observation.observations.length) throw new Error("CAMARA_SUPPORT_OBSERVATION_INCOMPLETE");
  for (const [index, entry] of observation.observations.entries()) {
    if (!planned[index] || entry.period !== planned[index] || !Number.isSafeInteger(entry.rows) || entry.rows < 0
      || (index && observation.observations[index - 1].rows === 0)
      || !Array.isArray(entry.headers) || !["Distrito", "Diputado", "Nombre", "Cargo", "Sueldo", "Inicio", "Tipo"].every((header) => entry.headers.includes(header))) {
      throw new Error("CAMARA_SUPPORT_OBSERVATION_INVALID");
    }
  }
  const available = observation.observations.filter((entry) => entry.rows > 0);
  if (observation.imports.length !== available.length) throw new Error("CAMARA_SUPPORT_OBSERVATION_INCOMPLETE");
  for (const [index, entry] of observation.imports.entries()) {
    const capturedAge = Date.now() - Date.parse(entry.retrievedAt);
    if (entry.period !== available[index].period || entry.rows !== available[index].rows || entry.rows < 500
      || typeof entry.file !== "string" || !entry.file || !/^[a-f0-9]{64}$/.test(entry.checksumSha256 ?? "")
      || entry.source !== CAMARA_GENERAL_SUPPORT_URL || entry.captureFormat !== "rendered-table-rows"
      || !Number.isFinite(capturedAge) || capturedAge < -60_000 || capturedAge > 86_400_000) throw new Error("CAMARA_SUPPORT_CAPTURE_INVALID");
  }
  return observation.imports;
}

export function mergeCamaraSupportImportMetadata(previous = [], imports = []) {
  return [...new Map([...previous, ...imports].map((entry) => [entry.period, entry])).values()]
    .sort((left, right) => left.period.localeCompare(right.period));
}
