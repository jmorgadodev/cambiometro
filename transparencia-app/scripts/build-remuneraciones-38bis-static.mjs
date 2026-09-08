import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const inputPath = path.join(root, "data", "remuneraciones-38bis-publico.json");
const outputDir = path.join(root, "public", "data", "remuneraciones-38bis");
const pageSize = 40;
const release = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const rows = Array.isArray(release.registros) ? release.registros : (release.congreso ?? []);

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const pages = [];
const sortPages = {};

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

for (let offset = 0; offset < rows.length; offset += pageSize) {
  const page = Math.floor(offset / pageSize) + 1;
  const file = `page-${String(page).padStart(4, "0")}.json`;
  const pageRows = rows.slice(offset, offset + pageSize);
  fs.writeFileSync(path.join(outputDir, file), `${JSON.stringify(pageRows)}\n`, "utf8");
  pages.push({ page, key: file, count: pageRows.length });
}

const compareSalary = (left, right, direction) => {
  const leftValue = left.bruto_mensual ?? -1;
  const rightValue = right.bruto_mensual ?? -1;
  return direction === "desc" ? rightValue - leftValue : leftValue - rightValue;
};
sortPages.sueldo_desc = writePages([...rows].sort((left, right) => compareSalary(left, right, "desc")), "sueldo-desc");
sortPages.sueldo_asc = writePages([...rows].sort((left, right) => compareSalary(left, right, "asc")), "sueldo-asc");

const normalize = (value) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();
const tokenPages = new Map();
rows.forEach((row, index) => {
  const page = Math.floor(index / pageSize) + 1;
  const text = `${row.nombre} ${row.organismo} ${row.cargo} ${row.partida}`;
  for (const token of new Set(normalize(text).split(" ").filter((value) => value.length >= 3))) {
    const pageSet = tokenPages.get(token) ?? new Set();
    pageSet.add(page);
    tokenPages.set(token, pageSet);
  }
});

const searchIndex = Object.fromEntries([...tokenPages.entries()].map(([token, pageSet]) => [token, [...pageSet].sort((a, b) => a - b)]));
const cargoPages = {};
const ambitoPages = { todos: pages.map((entry) => entry.page), gobierno: [], congreso: [] };
rows.forEach((row, index) => {
  const page = Math.floor(index / pageSize) + 1;
  cargoPages[row.cargo] ??= [];
  if (!cargoPages[row.cargo].includes(page)) cargoPages[row.cargo].push(page);
  const ambito = row.partida === "Congreso Nacional" ? "congreso" : "gobierno";
  if (!ambitoPages[ambito].includes(page)) ambitoPages[ambito].push(page);
});
const auditPath = path.join(root, "data", "remuneraciones-38bis-publico-audit.json");
const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
const manifest = {
  schema_version: 1,
  source_id: "remuneraciones-38bis",
  source_url: release.url,
  mes: release.mes,
  extraido_en: release.extraido_en,
  total: rows.length,
  page_size: pageSize,
  page_count: pages.length,
  pages,
  sort_pages: sortPages,
  cargos: Object.keys(cargoPages).sort((left, right) => left.localeCompare(right, "es")),
  cargo_pages: cargoPages,
  ambito_pages: ambitoPages,
  initial_rows: rows.slice(0, pageSize),
  comparison: {
    estado: audit.delta.estado,
    periodo_anterior: audit.delta.periodoAnterior,
    entradas: audit.delta.entradas,
    salidas_observadas: audit.delta.salidasObservadas,
    cambios: audit.delta.cambios,
  },
};

fs.writeFileSync(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outputDir, "search-index.json"), `${JSON.stringify(searchIndex)}\n`, "utf8");
fs.writeFileSync(path.join(root, "data", "remuneraciones-38bis-publico-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ status: "ok", outputDir, total: rows.length, pages: pages.length, searchTokens: Object.keys(searchIndex).length }, null, 2));
