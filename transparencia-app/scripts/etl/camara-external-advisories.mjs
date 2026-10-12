import { externalText } from "./safe-text.mjs";

export const CAMARA_EXTERNAL_ADVISORIES_URL = "https://www.camara.cl/transparencia/asesoriasexternasgral.aspx";

const normalize = (value) => externalText(String(value ?? ""))
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleUpperCase("es-CL")
  .replace(/[^A-Z0-9-]+/g, " ")
  .trim();

const columnKey = (value) => normalize(value).replace(/\s+/g, "");
const monthNumber = (period) => {
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const normalized = normalize(period).toLowerCase();
  const month = months.findIndex((name) => normalized.includes(name));
  const year = normalized.match(/\b(20\d{2})\b/)?.[1] ?? "0000";
  return `${year}-${String(month + 1).padStart(2, "0")}`;
};

export function parseCamaraExternalAdvisories(html) {
  const tables = [...String(html ?? "").matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
  for (const table of tables) {
    const rows = [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => match[1]);
    const cells = (row) => [...row.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)]
      .map((match) => externalText(match[1]));
    const headerIndex = rows.findIndex((row) => {
      const headers = cells(row).map(columnKey);
      return ["FOLIO", "ASESOR", "MONTO", "DIPUTADO"].every((required) => headers.includes(required));
    });
    if (headerIndex < 0) continue;
    const headers = cells(rows[headerIndex]);
    const indexes = Object.fromEntries(["Folio", "Asesor", "Monto", "Diputado"].map((field) => [
      field,
      headers.findIndex((header) => columnKey(header) === columnKey(field)),
    ]));
    const result = [];
    for (const row of rows.slice(headerIndex + 1)) {
      const values = cells(row);
      const record = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
      if (!record[headers[indexes.Diputado]] || !record[headers[indexes.Asesor]]) continue;
      result.push({ values: record, sourceLinks: [] });
    }
    return result;
  }
  throw new Error("CAMARA_EXTERNAL_ADVISORIES_HEADERS_MISSING");
}

function displayedNameMatches(displayedName, officialName) {
  const [surnamePart, givenPart] = String(displayedName ?? "").split(",", 2);
  if (!surnamePart || !givenPart) return false;
  const surname = normalize(surnamePart).split(" ").filter(Boolean);
  const given = normalize(givenPart).split(" ").filter(Boolean);
  const official = normalize(officialName).split(" ").filter(Boolean);
  if (!surname.length || !given.length || surname.length > official.length - 1) return false;
  for (let start = 1; start <= official.length - surname.length; start += 1) {
    // La Cámara puede publicar el segundo nombre (Ericka) en vez del primero
    // (Coca Ericka). La asignación sigue exigiendo un único ID con estos apellidos.
    if (!official.slice(0, start).includes(given[0])) continue;
    const candidate = official.slice(start, start + surname.length);
    if (surname.every((part, index) => part.length === 1
      ? candidate[index]?.startsWith(part)
      : candidate[index] === part)) return true;
  }
  return false;
}

export function linkCamaraExternalAdvisories(rows, deputies) {
  const ids = Object.keys(deputies ?? {});
  const byDeputy = {};
  let ambiguous = 0;
  let unmatched = 0;
  for (const row of rows ?? []) {
    const name = row?.values?.Diputado;
    const matches = ids.filter((id) => displayedNameMatches(name, deputies[id]));
    if (matches.length !== 1) {
      if (matches.length > 1) ambiguous += 1;
      else unmatched += 1;
      continue;
    }
    const id = matches[0];
    (byDeputy[id] ??= []).push(row);
  }
  return { byDeputy, matched: Object.values(byDeputy).reduce((total, deputyRows) => total + deputyRows.length, 0), ambiguous, unmatched };
}

export function mergeCamaraExternalAdvisories(dataset, rows, deputies, { period, retrievedAt = new Date().toISOString() } = {}) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(period ?? ""))) throw new Error("CAMARA_EXTERNAL_ADVISORIES_PERIOD_INVALID");
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("CAMARA_EXTERNAL_ADVISORIES_EMPTY_MONTH");
  const linked = linkCamaraExternalAdvisories(rows, deputies);
  const [year, month] = period.split("-").map(Number);
  const periodLabel = new Intl.DateTimeFormat("es-CL", { month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
  const periodName = `${periodLabel} ${year}`;
  const nextDeputies = Object.fromEntries(Object.entries(dataset?.diputados ?? {}).map(([id, prior]) => {
    const categories = { ...(prior?.transparencia_camara ?? {}) };
    const previous = categories.asesorias_externas;
    if (!previous) return [id, prior];
    const existingPeriods = previous.periods ?? (previous.period ? [{
      period: previous.period,
      status: previous.status,
      rows: previous.rows ?? [],
      retrieved_at: previous.retrieved_at,
    }] : []);
    const periods = existingPeriods.filter((entry) => entry.period !== periodName);
    if (periods.length === existingPeriods.length) return [id, prior];
    if (periods.length === 0) {
      delete categories.asesorias_externas;
    } else {
      const latest = [...periods].sort((left, right) => monthNumber(left.period).localeCompare(monthNumber(right.period))).at(-1);
      categories.asesorias_externas = {
        ...previous,
        status: latest.status,
        period: latest.period,
        retrieved_at: latest.retrieved_at,
        rows: latest.rows,
        periods: [...periods].sort((left, right) => monthNumber(left.period).localeCompare(monthNumber(right.period))),
      };
    }
    const nextDeputy = { ...prior };
    if (Object.keys(categories).length) nextDeputy.transparencia_camara = categories;
    else delete nextDeputy.transparencia_camara;
    return [id, nextDeputy];
  }));
  const next = { ...dataset, diputados: nextDeputies };
  for (const [id, periodRows] of Object.entries(linked.byDeputy)) {
    const prior = next.diputados[id] ?? {};
    const categories = { ...(prior.transparencia_camara ?? {}) };
    const previous = categories.asesorias_externas ?? {};
    const periods = new Map((previous.periods ?? (previous.period ? [{
      period: previous.period,
      status: previous.status,
      rows: previous.rows ?? [],
      retrieved_at: previous.retrieved_at,
    }] : [])).map((entry) => [entry.period, entry]));
    periods.set(periodName, { period: periodName, status: "available", rows: periodRows, retrieved_at: retrievedAt });
    const sortedPeriods = [...periods.values()].sort((left, right) => monthNumber(left.period).localeCompare(monthNumber(right.period)));
    const latest = sortedPeriods.at(-1);
    categories.asesorias_externas = {
      status: latest?.status ?? "available",
      period: latest?.period ?? periodName,
      retrieved_at: latest?.retrieved_at ?? retrievedAt,
      source_url: CAMARA_EXTERNAL_ADVISORIES_URL,
      rows: latest?.rows ?? periodRows,
      periods: sortedPeriods,
    };
    next.diputados[id] = { ...prior, transparencia_camara: categories };
  }
  return { dataset: next, ...linked, period: periodName };
}
