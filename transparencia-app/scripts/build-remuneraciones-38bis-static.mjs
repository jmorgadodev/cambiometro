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
for (let offset = 0; offset < rows.length; offset += pageSize) {
  const page = Math.floor(offset / pageSize) + 1;
  const file = `page-${String(page).padStart(4, "0")}.json`;
  const pageRows = rows.slice(offset, offset + pageSize);
  fs.writeFileSync(path.join(outputDir, file), `${JSON.stringify(pageRows)}\n`, "utf8");
  pages.push({ page, key: file, count: pageRows.length });
}

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
  checksum_sha256: release.checksum_sha256,
  pages,
  initial_rows: rows.slice(0, pageSize),
  audit: {
    estado: audit.delta.estado,
    periodo_anterior: audit.delta.periodoAnterior,
    entradas: audit.delta.entradas,
    salidas_observadas: audit.delta.salidasObservadas,
    cambios: audit.delta.cambios,
    d1_rows_read: audit.d1_rows_read,
    d1_rows_written: audit.d1_rows_written,
  },
};

fs.writeFileSync(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(outputDir, "search-index.json"), `${JSON.stringify(searchIndex)}\n`, "utf8");
fs.writeFileSync(path.join(outputDir, "audit.json"), `${JSON.stringify(audit, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(root, "data", "remuneraciones-38bis-publico-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ status: "ok", outputDir, total: rows.length, pages: pages.length, searchTokens: Object.keys(searchIndex).length }, null, 2));
