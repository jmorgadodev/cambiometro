import { externalText } from "./safe-text.mjs";
import { linkCamaraExternalAdvisories } from "./camara-external-advisories.mjs";
import { mergePersonalApoyoDeputies } from "./personal-apoyo-publication.mjs";

export const CAMARA_GENERAL_SUPPORT_URL = "https://www.camara.cl/transparencia/personalapoyogral.aspx";

const normalize = (value) => externalText(String(value ?? ""))
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLocaleUpperCase("es-CL");

const headerKey = (value) => normalize(value).replace(/[^A-Z0-9]/g, "");
const amount = (value) => Number.parseInt(String(value ?? "").replace(/\D/g, "") || "0", 10);

export function parseCamaraGeneralSupportTable(html) {
  const tables = [...String(html ?? "").matchAll(/<table\b([^>]*)>([\s\S]*?)<\/table>/gi)];
  const table = (tables.find((match) => /\bid=["']tabla["']/i.test(match[1])) ?? tables[0])?.[2];
  if (!table) throw new Error("CAMARA_GENERAL_SUPPORT_TABLE_MISSING");

  const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => match[1]);
  const cellsFor = (row) => [...row.matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map((match) => externalText(match[1]));
  const headerIndex = rows.findIndex((row) => {
    const headers = cellsFor(row).map(headerKey);
    return headers.includes("DIPUTADO") && headers.includes("NOMBRE") && headers.includes("INICIO");
  });
  if (headerIndex < 0) throw new Error("CAMARA_GENERAL_SUPPORT_HEADERS_MISSING");
  const headers = cellsFor(rows[headerIndex]).map(headerKey);
  const indexes = Object.fromEntries([
    ["diputado", ["DIPUTADO"]], ["distrito", ["DISTRITO"]], ["nombre", ["NOMBRE"]], ["cargo", ["CARGO"]],
    ["sueldo", ["SUELDO"]], ["cargo_servel", ["CARGOELECCIONSERVEL"]], ["inicio", ["INICIO"]],
    ["cese", ["CESEDEFUNCIONES"]], ["tipo", ["TIPO"]], ["trabaja_ademas_para", ["TRABAJADEMASPARA"]],
  ].map(([field, candidates]) => [field, headers.findIndex((header) => candidates.includes(header))]));
  if (["diputado", "distrito", "nombre", "cargo", "sueldo", "inicio", "tipo"].some((field) => indexes[field] < 0)) {
    throw new Error("CAMARA_GENERAL_SUPPORT_REQUIRED_COLUMN_MISSING");
  }

  const result = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const cells = cellsFor(row);
    if (!cells.length || !cells[indexes.nombre]) continue;
    if (!/\d/.test(cells[indexes.sueldo] ?? "")) throw new Error("CAMARA_GENERAL_SUPPORT_AMOUNT_MISSING");
    result.push({
      diputado: cells[indexes.diputado] ?? "",
      distrito: cells[indexes.distrito] ?? "",
      nombre: cells[indexes.nombre] ?? "",
      cargo: cells[indexes.cargo] ?? "",
      sueldo: amount(cells[indexes.sueldo]),
      cargo_servel: indexes.cargo_servel < 0 ? "" : cells[indexes.cargo_servel] ?? "",
      inicio: cells[indexes.inicio] ?? "",
      cese: indexes.cese < 0 ? "" : cells[indexes.cese] ?? "",
      tipo: cells[indexes.tipo] ?? "",
      trabaja_ademas_para: indexes.trabaja_ademas_para < 0 ? "" : cells[indexes.trabaja_ademas_para] ?? "",
    });
  }
  if (!result.length) throw new Error("CAMARA_GENERAL_SUPPORT_ROWS_MISSING");
  return result;
}

/**
 * La tabla nacional conserva cada corte; una ausencia no se transforma en cero.
 * @param {{ period?: string, retrievedAt?: string, checksum?: string | null, aliases?: Record<string, { id: string, officialName: string, sourceUrl: string }> }} [options]
 */
export function mergeCamaraGeneralSupportMonth(dataset, officialRows, roster, options = {}) {
  const { period, retrievedAt = new Date().toISOString(), checksum = null, aliases = {} } = options;
  if (!/^2026-(0[1-9]|1[0-2])$/.test(String(period ?? ""))) throw new Error("CAMARA_SUPPORT_PERIOD_INVALID");
  if (!Array.isArray(officialRows) || !officialRows.length) throw new Error("CAMARA_SUPPORT_EMPTY_MONTH");
  const byName = new Map();
  for (const row of officialRows) {
    const rows = byName.get(row.diputado) ?? [];
    rows.push(row);
    byName.set(row.diputado, rows);
  }
  const linked = { byDeputy: {}, matched: 0, unmatched: 0, ambiguous: 0 };
  const unresolved = [];
  for (const [name, rows] of byName) {
    const match = linkCamaraExternalAdvisories([{ values: { Diputado: name } }], roster);
    let id = Object.keys(match.byDeputy)[0];
    const alias = aliases[name];
    if (!id && !match.ambiguous && alias && roster[alias.id] && alias.officialName && normalize(roster[alias.id]) === normalize(alias.officialName) && alias.sourceUrl?.endsWith(`prmId=${alias.id}`)) id = alias.id;
    if (!id || match.ambiguous) {
      linked[match.ambiguous ? "ambiguous" : "unmatched"] += rows.length;
      unresolved.push(name);
      continue;
    }
    (linked.byDeputy[id] ??= []).push(...rows);
    linked.matched += rows.length;
  }
  if (linked.unmatched || linked.ambiguous) throw new Error(`CAMARA_SUPPORT_LINK_INCOMPLETE:${JSON.stringify({ unmatched: linked.unmatched, ambiguous: linked.ambiguous, names: unresolved })}`);
  const [year, month] = period.split("-").map(Number);
  const label = `${new Intl.DateTimeFormat("es-CL", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)))} ${year}`;
  const refreshed = {};
  for (const [id, linkedRows] of Object.entries(linked.byDeputy)) {
    const prior = { ...(dataset?.diputados?.[id] ?? {}) };
    delete prior.transparencia_camara;
    const rows = linkedRows.map((sourceRow) => {
      const row = { ...sourceRow, diputado_original: sourceRow.diputado };
      delete row.values;
      delete row.diputado;
      return row;
    });
    refreshed[id] = {
      ...prior,
      ficha: prior.ficha ?? { comunas_distrito: null, numero_distrito: null, region: null, periodo: null, partido: null, bancada: null, foto: null, redes: {} },
      meses: prior.meses ?? [],
      mes_personal: label,
      personal_apoyo: rows,
      personal_apoyo_por_periodo: {
        [period]: { periodo: label, status: "available", rows, retrieved_at: retrievedAt, source_url: CAMARA_GENERAL_SUPPORT_URL, checksum_sha256: checksum },
      },
    };
  }
  return { dataset: { ...dataset, diputados: mergePersonalApoyoDeputies(dataset?.diputados ?? {}, refreshed) }, matched: linked.matched, deputies: Object.keys(linked.byDeputy).length };
}

function recordKey(id, row) {
  return JSON.stringify([
    String(id), normalize(row.nombre), normalize(row.cargo), amount(row.sueldo),
    normalize(row.cargo_servel), normalize(row.cese), normalize(row.tipo),
  ]);
}

export function attachCamaraStartDates(diputados, officialRows, deputyOptions) {
  const idsByName = new Map();
  for (const deputy of deputyOptions ?? []) {
    const name = normalize(deputy.apellido);
    if (!name) continue;
    const ids = idsByName.get(name) ?? [];
    ids.push(String(deputy.id));
    idsByName.set(name, ids);
  }

  const officialByKey = new Map();
  for (const row of officialRows ?? []) {
    const ids = idsByName.get(normalize(row.diputado)) ?? [];
    if (ids.length !== 1) continue;
    const id = ids[0];
    const key = recordKey(id, row);
    const matches = officialByKey.get(key) ?? [];
    matches.push(row);
    officialByKey.set(key, matches);
  }

  let matched = 0;
  let unmatched = 0;
  let ambiguous = 0;
  for (const [id, deputy] of Object.entries(diputados ?? {})) {
    const localByKey = new Map();
    for (const row of deputy?.personal_apoyo ?? []) {
      const key = recordKey(id, row);
      const matches = localByKey.get(key) ?? [];
      matches.push(row);
      localByKey.set(key, matches);
    }
    for (const [key, localRows] of localByKey) {
      const official = officialByKey.get(key) ?? [];
      if (official.length > 1 || localRows.length > 1) {
        ambiguous += localRows.length;
        continue;
      }
      if (official.length !== 1) {
        unmatched += localRows.length;
        continue;
      }
      const start = String(official[0].inicio ?? "").trim();
      if (start && !String(localRows[0].inicio ?? "").trim()) localRows[0].inicio = start;
      matched += localRows.length;
    }
  }
  return { matched, unmatched, ambiguous };
}
