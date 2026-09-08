import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const inputPath = path.join(root, "data", "remuneraciones-38bis-publico.json");
const historyPath = path.join(root, "data", "remuneraciones-38bis-publico-historico.json");
const outputDir = path.join(root, "public", "data", "remuneraciones-38bis");
const historyOutputDir = path.join(outputDir, "history");
const pageSize = 40;
const release = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const rows = Array.isArray(release.registros) ? release.registros : (release.congreso ?? []);
const historical = fs.existsSync(historyPath) ? JSON.parse(fs.readFileSync(historyPath, "utf8")) : { periodos: [] };

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(historyOutputDir, { recursive: true });

function writePages(rowsToWrite, directoryName) {
  const directory = path.join(outputDir, directoryName);
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });
  const entries = [];
  for (let offset = 0; offset < rowsToWrite.length; offset += pageSize) {
    const page = Math.floor(offset / pageSize) + 1;
    const file = `page-${String(page).padStart(4, "0")}.json`;
    const pageRows = rowsToWrite.slice(offset, offset + pageSize);
    fs.writeFileSync(path.join(directory, file), `${JSON.stringify(pageRows)}\n`, "utf8");
    entries.push({ page, key: file, count: pageRows.length });
  }
  return entries;
}

function compareSalary(left, right, direction) {
  const leftValue = left.bruto_mensual ?? -1;
  const rightValue = right.bruto_mensual ?? -1;
  return direction === "desc" ? rightValue - leftValue : leftValue - rightValue;
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function rowKey(row) {
  return [row.nombre, row.organismo, row.cargo].map(normalize).join("|");
}

function nameSortKey(value) {
  const normalized = normalize(value).replace(/\s+a contar del\s+\d{2}\s+\d{2}\s+\d{4}$/, "");
  if (!normalized || /^(no reportado|no existe|sin nombre|0+|0+ 0+)$/.test(normalized)) return "zzzzzzzzzz";
  const parts = normalized.split(" ").filter(Boolean);
  const firstSurname = parts.length > 1 ? parts.at(-2) : parts[0];
  const secondSurname = parts.at(-1) ?? "";
  return `${firstSurname} ${secondSurname} ${normalized}`;
}

function compareNames(left, right) {
  return nameSortKey(left.nombre).localeCompare(nameSortKey(right.nombre), "es");
}

function buildIndexes(rowsToIndex) {
  const tokenPages = new Map();
  const organismoPages = {};
  const cargoPages = {};
  rowsToIndex.forEach((row, index) => {
    const page = Math.floor(index / pageSize) + 1;
    const text = `${row.nombre} ${row.organismo} ${row.cargo} ${row.partida}`;
    for (const token of new Set(normalize(text).split(" ").filter((value) => value.length >= 3))) {
      const pageSet = tokenPages.get(token) ?? new Set();
      pageSet.add(page);
      tokenPages.set(token, pageSet);
    }
    organismoPages[row.organismo] ??= [];
    if (!organismoPages[row.organismo].includes(page)) organismoPages[row.organismo].push(page);
    cargoPages[row.cargo] ??= [];
    if (!cargoPages[row.cargo].includes(page)) cargoPages[row.cargo].push(page);
  });
  return {
    searchIndex: Object.fromEntries([...tokenPages.entries()].map(([token, pageSet]) => [token, [...pageSet].sort((left, right) => left - right)])),
    organismos: Object.keys(organismoPages).sort((left, right) => left.localeCompare(right, "es")),
    organismoPages,
    cargos: Object.keys(cargoPages).sort((left, right) => left.localeCompare(right, "es")),
    cargoPages,
  };
}

function compareDetails(previousRows, currentRows, previousPeriod = null) {
  if (!previousRows) return { estado: "linea_base", periodo_anterior: null, entradas: [], salidas_observadas: [], cambios: [] };
  const previousByKey = new Map(previousRows.map((row) => [rowKey(row), row]));
  const currentByKey = new Map(currentRows.map((row) => [rowKey(row), row]));
  const entradas = [];
  const cambios = [];
  for (const row of currentRows) {
    const previous = previousByKey.get(rowKey(row));
    if (!previous) {
      entradas.push({ tipo: "entrada", ...row, bruto_anterior: null, bruto_actual: row.bruto_mensual, diferencia: null });
    } else if (previous.bruto_mensual !== row.bruto_mensual) {
      cambios.push({ tipo: "cambio", ...row, bruto_anterior: previous.bruto_mensual, bruto_actual: row.bruto_mensual, diferencia: (row.bruto_mensual ?? 0) - (previous.bruto_mensual ?? 0) });
    }
  }
  const salidasObservadas = [];
  for (const row of previousRows) {
    if (!currentByKey.has(rowKey(row))) salidasObservadas.push({ tipo: "salida_observada", ...row, bruto_anterior: row.bruto_mensual, bruto_actual: null, diferencia: null });
  }
  return {
    estado: "comparado",
    periodo_anterior: previousPeriod,
    entradas: entradas.sort(compareNames),
    salidas_observadas: salidasObservadas.sort(compareNames),
    cambios: cambios.sort(compareNames),
  };
}

function comparisonSummary(details) {
  return {
    estado: details.estado,
    periodo_anterior: details.periodo_anterior,
    entradas: details.entradas.length,
    salidas_observadas: details.salidas_observadas.length,
    cambios: details.cambios.length,
  };
}

function totalBruto(rowsToSum) {
  return rowsToSum.reduce((total, row) => total + (Number.isFinite(row.bruto_mensual) ? row.bruto_mensual : 0), 0);
}

function publicPeriod(rowsForPeriod, mes, previousRows = null, previousPeriod = null) {
  const basePath = `months/${mes}`;
  const orderedRows = [...rowsForPeriod].sort(compareNames);
  const pages = writePages(orderedRows, basePath);
  const sortedDesc = writePages([...rowsForPeriod].sort((left, right) => compareSalary(left, right, "desc")), `${basePath}/sueldo-desc`);
  const sortedAsc = writePages([...rowsForPeriod].sort((left, right) => compareSalary(left, right, "asc")), `${basePath}/sueldo-asc`);
  const indexes = buildIndexes(orderedRows);
  const searchIndexKey = `${basePath}/search-index.json`;
  fs.writeFileSync(path.join(outputDir, searchIndexKey), `${JSON.stringify(indexes.searchIndex)}\n`, "utf8");
  const comparisonDetails = compareDetails(previousRows, rowsForPeriod, previousPeriod);
  const comparisonKey = "comparison.json";
  fs.writeFileSync(path.join(outputDir, basePath, comparisonKey), `${JSON.stringify(comparisonDetails)}\n`, "utf8");
  return {
    mes,
    base_path: `${basePath}/`,
    total: rowsForPeriod.length,
    registros_con_monto: rowsForPeriod.filter((row) => row.bruto_mensual !== null).length,
    total_bruto: totalBruto(rowsForPeriod),
    page_size: pageSize,
    page_count: pages.length,
    pages,
    sort_pages: { sueldo_desc: sortedDesc, sueldo_asc: sortedAsc },
    search_index: searchIndexKey,
    organismos: indexes.organismos,
    organismo_pages: indexes.organismoPages,
    cargos: indexes.cargos,
    cargo_pages: indexes.cargoPages,
    comparison: comparisonSummary(comparisonDetails),
    comparison_key: comparisonKey,
  };
}

const orderedRows = [...rows].sort(compareNames);
const currentPages = writePages(orderedRows, "");
const currentIndexes = buildIndexes(orderedRows);
const currentSortPages = {
  sueldo_desc: writePages([...rows].sort((left, right) => compareSalary(left, right, "desc")), "sueldo-desc"),
  sueldo_asc: writePages([...rows].sort((left, right) => compareSalary(left, right, "asc")), "sueldo-asc"),
};
fs.mkdirSync(historyOutputDir, { recursive: true });
const auditPath = path.join(root, "data", "remuneraciones-38bis-publico-audit.json");
const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
const historyPeriods = Array.isArray(historical.periodos) ? historical.periodos : [];
const periodRows = [{ mes: release.mes, rows }, ...historyPeriods.map((period) => ({ mes: period.mes, rows: period.registros }))];
const historyByHash = new Map();
for (const period of periodRows) {
  for (const row of period.rows) {
    const key = rowKey(row);
    const hash = stableHash(key);
    const knownKey = historyByHash.get(hash)?.key;
    if (knownKey && knownKey !== key) throw new Error(`Colisión al generar historial de remuneraciones: ${hash}`);
    const entry = historyByHash.get(hash) ?? { key, rows: [] };
    if (!entry.rows.some((item) => item.mes === period.mes)) {
      entry.rows.push({ mes: period.mes, ...row });
    }
    historyByHash.set(hash, entry);
  }
}
for (const [hash, entry] of historyByHash.entries()) {
  entry.rows.sort((left, right) => left.mes.localeCompare(right.mes));
  fs.writeFileSync(path.join(historyOutputDir, `${hash}.json`), `${JSON.stringify(entry.rows)}\n`, "utf8");
}
const periodManifests = periodRows.map((period, index) => publicPeriod(
  period.rows,
  period.mes,
  index === periodRows.length - 1 ? null : periodRows[index + 1].rows,
  index === periodRows.length - 1 ? null : periodRows[index + 1].mes,
));
const currentPeriod = periodManifests[0];
const periodSummaries = periodManifests.map((period) => {
  const manifestKey = `${period.base_path}manifest.json`;
  fs.writeFileSync(path.join(outputDir, manifestKey), `${JSON.stringify(period, null, 2)}\n`, "utf8");
  return {
    mes: period.mes,
    total: period.total,
    registros_con_monto: period.registros_con_monto,
    total_bruto: period.total_bruto,
    comparison: period.comparison,
    manifest_key: manifestKey,
    comparison_key: `${period.base_path}${period.comparison_key}`,
  };
});
const manifest = {
  schema_version: 2,
  source_id: "remuneraciones-38bis",
  source_url: release.url,
  mes: release.mes,
  extraido_en: release.extraido_en,
  total: rows.length,
  registros_con_monto: currentPeriod.registros_con_monto,
  total_bruto: currentPeriod.total_bruto,
  page_size: pageSize,
  page_count: currentPages.length,
  pages: currentPages,
  sort_pages: currentSortPages,
  search_index: "search-index.json",
  organismos: currentIndexes.organismos,
  organismo_pages: currentIndexes.organismoPages,
  cargos: currentIndexes.cargos,
  cargo_pages: currentIndexes.cargoPages,
  history_base_path: "history/",
  comparison_key: `${currentPeriod.base_path}${currentPeriod.comparison_key}`,
  initial_rows: orderedRows.slice(0, pageSize),
  periodos: periodSummaries,
  comparison: {
    estado: audit.delta.estado,
    periodo_anterior: audit.delta.periodoAnterior,
    entradas: audit.delta.entradas,
    salidas_observadas: audit.delta.salidasObservadas,
    cambios: audit.delta.cambios,
  },
};

fs.writeFileSync(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outputDir, "search-index.json"), `${JSON.stringify(currentIndexes.searchIndex)}\n`, "utf8");
fs.writeFileSync(path.join(root, "data", "remuneraciones-38bis-publico-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ status: "ok", outputDir, total: rows.length, pages: currentPages.length, periodos: periodManifests.length, searchTokens: Object.keys(currentIndexes.searchIndex).length }, null, 2));
