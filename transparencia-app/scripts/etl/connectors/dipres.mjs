import { createHash } from "node:crypto";

const INDEX_URL = "https://www.dipres.gob.cl/597/w3-multipropertyvalues-25910-37782.html";
const MONTHS = new Map([
  ["enero", 1], ["febrero", 2], ["primer trimestre", 3], ["abril", 4], ["mayo", 5],
  ["segundo trimestre", 6], ["junio", 6], ["julio", 7], ["agosto", 8], ["tercer trimestre", 9], ["septiembre", 9],
  ["octubre", 10], ["noviembre", 11], ["cuarto trimestre", 12], ["diciembre", 12],
]);

function cleanText(value) {
  return value.replace(/<[^>]+>/g, " ").replace(/&oacute;/gi, "ó").replace(/&iacute;/gi, "í").replace(/&aacute;/gi, "á").replace(/\s+/g, " ").trim();
}

function monthFromTitle(title) {
  const normalized = title.toLocaleLowerCase("es-CL");
  for (const [label, month] of MONTHS) if (normalized.includes(label)) return month;
  return null;
}

export function extractDipresBudgetYears(html) {
  const years = new Map();
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(html)) !== null) {
    const attributes = match[1];
    const title = attributes.match(/\btitle=["']Ir a (20\d{2})["']/i)?.[1];
    const href = attributes.match(/\bhref=["']([^"']+)["']/i)?.[1];
    const id = attributes.match(/\bpvid-(\d+)\b/i)?.[1];
    if (!title || !href || !id) continue;
    years.set(Number(title), { year: Number(title), id, budgetUrl: new URL(href, INDEX_URL).href });
  }
  return [...years.values()].sort((a, b) => a.year - b.year);
}

function extractDipresExecutionPageUrl(html, baseUrl) {
  const candidates = [];
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(html)) !== null) {
    const href = match[1].match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const label = cleanText(`${match[1]} ${match[2]}`).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-CL");
    const priority = label.includes("ejecucion total") ? 2 : label.includes("ejecucion presupuestaria") ? 1 : 0;
    if (priority) candidates.push({ priority, url: new URL(href, baseUrl).href });
  }
  return candidates.sort((a, b) => b.priority - a.priority)[0]?.url ?? null;
}

export function extractDipresExecutionAssets(html, year) {
  const titlePattern = /<p\b[^>]*class=["'][^"']*titulo[^"']*aid-(\d+)[^"']*["'][^>]*>([\s\S]*?)<\/p>/gi;
  const titles = [];
  let match;
  while ((match = titlePattern.exec(html)) !== null) {
    const id = match[1];
    const title = cleanText(match[2]);
    const nextTitle = html.slice(titlePattern.lastIndex).search(/<p\b[^>]*class=["'][^"']*titulo/gi);
    const blockEnd = nextTitle < 0 ? html.length : titlePattern.lastIndex + nextTitle;
    const block = html.slice(titlePattern.lastIndex, blockEnd);
    const csv = block.match(new RegExp(`href=["']([^"']*articles-${id}_doc_csv\\.csv[^"']*)["']`, "i"));
    const xml = block.match(new RegExp(`href=["']([^"']*articles-${id}_doc_xml\\.xml[^"']*)["']`, "i"));
    const month = monthFromTitle(title);
    if (!csv || !month || !/\[Pesos\]/i.test(title)) continue;
    titles.push({
      id,
      year,
      month,
      period: `${year}-${String(month).padStart(2, "0")}`,
      title,
      csvUrl: new URL(csv[1], INDEX_URL).href,
      xmlUrl: xml ? new URL(xml[1], INDEX_URL).href : null,
    });
  }
  return titles.sort((a, b) => a.month - b.month || a.id.localeCompare(b.id));
}

export function parseDelimited(text, delimiter = ";") {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === delimiter) { row.push(field); field = ""; }
    else if (character === "\n") { row.push(field.replace(/\r$/, "")); if (row.some(Boolean)) rows.push(row); row = []; field = ""; }
    else field += character;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const [header, ...values] = rows;
  if (!header) throw new Error("INVALID_DELIMITED_SCHEMA");
  return values.map((items) => {
    const row = Object.fromEntries(header.map((key, index) => [key.replace(/^\uFEFF/, "").trim(), items[index]?.trim() ?? ""]));
    if (items.length > header.length) row.__extra_fields = items.slice(header.length).map((item) => item.trim());
    return row;
  });
}

export function decodeDipresCsv(buffer) {
  const bytes = Buffer.from(buffer);
  const encoding = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? "utf-8" : "windows-1252";
  return new TextDecoder(encoding).decode(bytes);
}

function fieldEntry(row, candidates) {
  const entries = Object.entries(row);
  for (const candidate of candidates) {
    const found = entries.find(([key]) => key.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase() === candidate);
    if (found) return found;
  }
  return null;
}

function field(row, candidates) {
  const entry = fieldEntry(row, candidates);
  if (entry) return entry[1];
  return "";
}

export function parseThousandsClp(value) {
  if (value === "" || value === null || value === undefined) return null;
  const compact = String(value).trim().replaceAll(" ", "");
  const normalized = /^-?\d{1,3}(?:\.\d{3})+$/.test(compact) ? compact.replaceAll(".", "") : compact;
  const match = normalized.match(/^(-?)(\d+)(?:,(\d+))?(?:[eE]([+-]?\d+))?$/);
  if (!match) throw new Error(`INVALID_DIPRES_AMOUNT: ${value}`);
  const fraction = match[3] ?? "";
  const exponent = Number(match[4] ?? 0);
  let exact = BigInt(`${match[1]}${match[2]}${fraction}`);
  const scale = exponent - fraction.length + 3;
  if (scale >= 0) exact *= 10n ** BigInt(scale);
  else {
    const divisor = 10n ** BigInt(-scale);
    if (exact % divisor !== 0n) throw new Error(`NON_INTEGER_DIPRES_CLP: ${value}`);
    exact /= divisor;
  }
  const clp = Number(exact);
  if (!Number.isSafeInteger(clp)) throw new Error(`UNSAFE_DIPRES_AMOUNT: ${value}`);
  return clp;
}

export function normalizeDipresRows(rows, asset) {
  const repairedRows = rows.map((sourceRow) => {
    const denomination = fieldEntry(sourceRow, ["denominacion"]);
    const initial = fieldEntry(sourceRow, ["presupuesto inicial"]);
    const current = fieldEntry(sourceRow, ["presupuesto vigente"]);
    const executed = Object.entries(sourceRow).find(([key]) => key.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().startsWith("ejecucion acumulada"));
    const overflow = sourceRow.__extra_fields?.[0] ?? sourceRow[""];
    const validAmount = (value) => /^-?\d+(?:[.,]\d+)?(?:[eE][+-]?\d+)?$/.test(String(value ?? "").trim());
    if (denomination && initial && current && executed && overflow && !validAmount(initial[1]) && validAmount(current[1]) && validAmount(executed[1]) && validAmount(overflow)) {
      return {
        ...sourceRow,
        [denomination[0]]: `${denomination[1].trim()}; ${initial[1].trim()}`,
        [initial[0]]: current[1], [current[0]]: executed[1], [executed[0]]: overflow, "": "", __extra_fields: [],
        __source_schema_repair: "unquoted_semicolon_in_denomination",
      };
    }
    return sourceRow;
  });
  let currentProgram = null;
  const prepared = repairedRows.map((row) => {
    const sourcePartida = field(row, ["partida"]);
    const sourceChapter = field(row, ["capitulo"]);
    const sourceProgram = field(row, ["programa"]);
    const denomination = field(row, ["denominacion"]);
    if (sourcePartida && sourceChapter && sourceProgram) currentProgram = { partida: sourcePartida, chapter: sourceChapter, program: sourceProgram };
    const isProgramResult = !sourcePartida && !sourceChapter && !sourceProgram && denomination.toLocaleUpperCase("es-CL") === "RESULTADO";
    if (isProgramResult && !currentProgram) throw new Error("DIPRES_UNATTRIBUTED_PROGRAM_RESULT");
    if ((!sourcePartida || !sourceChapter || !sourceProgram) && !isProgramResult) throw new Error("DIPRES_UNATTRIBUTED_ROW");
    return {
      row, denomination, isProgramResult,
      partida: isProgramResult ? currentProgram.partida : sourcePartida,
      chapter: isProgramResult ? currentProgram.chapter : sourceChapter,
      program: isProgramResult ? currentProgram.program : sourceProgram,
    };
  });
  const hierarchy = prepared.filter((entry) => !entry.isProgramResult).map((entry) => ({
    ...entry,
    subtitle: field(entry.row, ["subtitulo"]), item: field(entry.row, ["item"]), assignment: field(entry.row, ["asignacion"]),
  }));
  const aggregateKeys = new Set();
  for (const entry of hierarchy) {
    const parts = [entry.partida, entry.chapter, entry.program, entry.subtitle, entry.item, entry.assignment].filter(Boolean);
    for (let depth = 3; depth < parts.length; depth += 1) aggregateKeys.add(parts.slice(0, depth).join("|"));
  }
  const records = prepared.map(({ row, denomination, isProgramResult, partida, chapter, program }) => {
    const subtitle = field(row, ["subtitulo"]);
    const item = field(row, ["item"]);
    const assignment = field(row, ["asignacion"]);
    const originalInitial = field(row, ["presupuesto inicial"]);
    const originalCurrent = field(row, ["presupuesto vigente"]);
    const executionEntry = Object.entries(row).find(([key]) => key.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().startsWith("ejecucion acumulada"));
    const originalExecuted = executionEntry?.[1] ?? "";
    const codeParts = [partida, chapter, program, subtitle, item, assignment];
    const code = isProgramResult ? `${partida}-${chapter}-${program}-result` : codeParts.map((value) => value || "0").join("-");
    const classificationLevel = isProgramResult ? "program_result" : assignment ? "assignment" : item ? "item" : subtitle ? "subtitle" : "program";
    const budgetSide = isProgramResult ? "balance" : subtitle && Number(subtitle) <= 15 ? "revenue" : subtitle && Number(subtitle) >= 21 ? "expenditure" : null;
    const isAggregate = !isProgramResult && aggregateKeys.has(codeParts.filter(Boolean).join("|"));
    const currency = field(row, ["moneda"]) || "P";
    const programEntityId = `public-body-dipres-program-${asset.year}-${partida}-${chapter}-${program}`;
    return {
      id: `dipres-${asset.period}-${code}-${currency.toLocaleLowerCase("es-CL")}`,
      fecha: `${asset.period}-01`,
      period: asset.period,
      kind: "budget_execution",
      partida, capitulo: chapter, programa: program, subtitulo: subtitle, item, asignacion: assignment,
      denominacion: denomination,
      classification_level: classificationLevel, budget_side: budgetSide, is_aggregate: isAggregate,
      summable: !isProgramResult && !isAggregate && (budgetSide === "revenue" || budgetSide === "expenditure"),
      moneda: currency,
      presupuesto_inicial_clp: parseThousandsClp(originalInitial),
      presupuesto_vigente_clp: parseThousandsClp(originalCurrent),
      ejecucion_acumulada_clp: parseThousandsClp(originalExecuted),
      monto_original: { inicial: originalInitial, vigente: originalCurrent, ejecutado: originalExecuted, unidad: "miles de pesos", moneda: "CLP" },
      ...(row.__source_schema_repair ? { source_schema_repair: row.__source_schema_repair } : {}),
      url: asset.csvUrl,
      fuente: "DIPRES · Ejecución presupuestaria CSV",
      entities: [{
        id: programEntityId, kind: "public_body", name: `Partida ${partida} · Capítulo ${chapter} · Programa ${program}`,
        identifiers: [{ scheme: "DIPRES-PROGRAM", value: `${asset.year}:${partida}:${chapter}:${program}`, isPublic: true, sourceUrl: asset.csvUrl }],
        attributes: { classification: "budget_program", year: asset.year, partida, capitulo: chapter, programa: program, country: "CL" },
      }],
      subject_entity_ids: [programEntityId], object_entity_ids: [],
    };
  });
  const grouped = new Map();
  for (const record of records) {
    const group = grouped.get(record.id) ?? [];
    group.push(record);
    grouped.set(record.id, group);
  }
  const reconciled = [];
  for (const [baseId, group] of grouped) {
    if (group.length === 1) { reconciled.push(group[0]); continue; }
    const bySignature = new Map();
    for (const record of group) {
      const signature = JSON.stringify([record.denominacion, record.presupuesto_inicial_clp, record.presupuesto_vigente_clp, record.ejecucion_acumulada_clp]);
      const duplicate = bySignature.get(signature);
      if (duplicate) duplicate.source_duplicate_count = (duplicate.source_duplicate_count ?? 1) + 1;
      else bySignature.set(signature, record);
    }
    const variants = [...bySignature.entries()].sort(([left], [right]) => left.localeCompare(right, "es-CL"));
    const representative = variants[0][1];
    representative.source_duplicate_group_size = group.length;
    reconciled.push(representative);
    for (const [signature, variant] of variants.slice(1)) {
      variant.id = `${baseId}-variant-${createHash("sha256").update(signature).digest("hex").slice(0, 12)}`;
      variant.source_duplicate = true;
      variant.source_duplicate_group_size = group.length;
      variant.duplicate_of_record_id = representative.id;
      variant.summable = false;
      reconciled.push(variant);
    }
  }
  if (new Set(reconciled.map((record) => record.id)).size !== reconciled.length) throw new Error(`DIPRES_DUPLICATE_RECORD: ${asset.period}`);
  return reconciled;
}

export function auditDipresHierarchy(records) {
  const moneyFields = ["presupuesto_inicial_clp", "presupuesto_vigente_clp", "ejecucion_acumulada_clp"];
  const parentKey = (record, depth) => [record.period, record.partida, record.capitulo, record.programa, record.subtitulo, ...(depth === 5 ? [record.item] : [])].join("|");
  const childrenByParent = new Map();
  for (const record of records) {
    const depth = record.classification_level === "item" ? 4 : record.classification_level === "assignment" ? 5 : null;
    if (!depth) continue;
    const key = parentKey(record, depth);
    if (record.source_duplicate) continue;
    const children = childrenByParent.get(key) ?? [];
    children.push(record);
    childrenByParent.set(key, children);
  }
  let comparedAggregates = 0;
  const discrepancies = [];
  for (const record of records.filter((candidate) => candidate.is_aggregate && ["subtitle", "item"].includes(candidate.classification_level))) {
    const depth = record.classification_level === "subtitle" ? 4 : 5;
    const children = childrenByParent.get(parentKey(record, depth)) ?? [];
    if (children.length === 0) continue;
    comparedAggregates += 1;
    for (const fieldName of moneyFields) {
      const childTotal = children.reduce((total, child) => total + (child[fieldName] ?? 0), 0);
      const parentTotal = record[fieldName] ?? 0;
      if (parentTotal !== childTotal) discrepancies.push({ recordId: record.id, field: fieldName, parentTotal, childTotal, difference: parentTotal - childTotal });
    }
  }
  return { comparedAggregates, mismatchCount: discrepancies.length, discrepancies };
}

async function fetchExecutionAsset(asset, fetchImpl, timeoutMs) {
  const response = await fetchImpl(asset.csvUrl, { headers: { "User-Agent": "TransparenciaChile-ETL/3.0" }, signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`DIPRES_CSV_HTTP_${response.status}`);
  const original = Buffer.from(await response.arrayBuffer());
  const text = decodeDipresCsv(original);
  const rows = parseDelimited(text);
  return {
    sourceId: "dipres", year: asset.year, month: asset.month, period: asset.period,
    records: normalizeDipresRows(rows, asset),
    original: { name: `dipres-${asset.period}-ejecucion-pesos.csv`, url: asset.csvUrl, data: original, checksumSha256: createHash("sha256").update(original).digest("hex"), license: "Datos públicos oficiales DIPRES", redistributable: true },
  };
}

export async function fetchDipresExecutions({ year, months, fetchImpl = fetch, timeoutMs = 60_000 }) {
  const indexResponse = await fetchImpl(INDEX_URL, { headers: { "User-Agent": "TransparenciaChile-ETL/3.0" }, signal: AbortSignal.timeout(timeoutMs) });
  if (!indexResponse.ok) throw new Error(`DIPRES_INDEX_HTTP_${indexResponse.status}`);
  const indexHtml = await indexResponse.text();
  const archive = extractDipresBudgetYears(indexHtml);
  const newestYear = archive.at(-1)?.year;
  let assets = extractDipresExecutionAssets(indexHtml, year);
  if (archive.length > 0 && (year !== newestYear || assets.length === 0)) {
    const archivedYear = archive.find((entry) => entry.year === year);
    if (!archivedYear) throw new Error(`DIPRES_YEAR_NOT_IN_ARCHIVE: ${year}`);
    const budgetResponse = await fetchImpl(archivedYear.budgetUrl, { headers: { "User-Agent": "TransparenciaChile-ETL/3.0" }, signal: AbortSignal.timeout(timeoutMs) });
    if (!budgetResponse.ok) throw new Error(`DIPRES_BUDGET_INDEX_HTTP_${budgetResponse.status}`);
    const executionUrl = extractDipresExecutionPageUrl(await budgetResponse.text(), archivedYear.budgetUrl);
    if (!executionUrl) throw new Error(`DIPRES_EXECUTION_PAGE_NOT_PUBLISHED: ${year}`);
    const executionResponse = await fetchImpl(executionUrl, { headers: { "User-Agent": "TransparenciaChile-ETL/3.0" }, signal: AbortSignal.timeout(timeoutMs) });
    if (!executionResponse.ok) throw new Error(`DIPRES_EXECUTION_INDEX_HTTP_${executionResponse.status}`);
    assets = extractDipresExecutionAssets(await executionResponse.text(), year);
  }
  const selected = months?.length ? assets.filter((asset) => months.includes(asset.month)) : assets;
  if (selected.length === 0 || (months?.length && selected.length !== new Set(months).size)) throw new Error(`DIPRES_PERIOD_NOT_PUBLISHED: ${year}`);
  return Promise.all(selected.map((asset) => fetchExecutionAsset(asset, fetchImpl, timeoutMs)));
}

export async function fetchDipresExecution({ year, month, fetchImpl = fetch, timeoutMs = 60_000 }) {
  if (month) return (await fetchDipresExecutions({ year, months: [month], fetchImpl, timeoutMs }))[0];
  return (await fetchDipresExecutions({ year, fetchImpl, timeoutMs })).at(-1);
}
