import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mergeCamaraExternalAdvisories, parseCamaraExternalAdvisories, validateCamaraAdvisoryRows } from "./etl/camara-external-advisories.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const value = (name) => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const manifestPath = value("--manifest") ? path.resolve(value("--manifest")) : null;
const inputPath = value("--file") ? path.resolve(value("--file")) : null;
const period = value("--period");
const outputPath = path.resolve(value("--output") ?? path.join(root, "data/personal-apoyo.json"));
const write = args.includes("--write");
const datasetPath = path.resolve(value("--input") ?? path.join(root, "data/personal-apoyo.json"));

if ((!manifestPath && (!inputPath || !period)) || (manifestPath && (inputPath || period))) {
  throw new Error("USAGE: node scripts/import-camara-external-advisories.mjs (--file=<official-export.xls> --period=YYYY-MM | --manifest=<imports.json>) [--write] [--output=<path>]");
}

const inputs = manifestPath
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8")).map((entry) => ({
    file: path.resolve(path.dirname(manifestPath), entry.file), period: entry.period, rows: entry.rows,
  }))
  : [{ file: inputPath, period }];
if (!inputs.length || new Set(inputs.map((entry) => entry.period)).size !== inputs.length) {
  throw new Error("CAMARA_EXTERNAL_ADVISORIES_MANIFEST_INVALID");
}
let dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
const activeRoster = JSON.parse(fs.readFileSync(path.join(root, "data/diputados-ids.json"), "utf8"));
const historicalRoster = JSON.parse(fs.readFileSync(path.join(root, "data/camara-diputados-historicos-ids.json"), "utf8"));
const roster = { ...activeRoster, ...Object.fromEntries(historicalRoster.diputados.map(({ id, nombre }) => [id, nombre])) };
const retrievedAt = new Date().toISOString();
const summaries = [];
for (const entry of inputs) {
  if (!/^2026-(0[1-9]|1[0-2])$/.test(String(entry.period))) {
    throw new Error(`CAMARA_EXTERNAL_ADVISORIES_PERIOD_OUT_OF_SCOPE: ${entry.period}`);
  }
  const filePeriod = path.basename(entry.file).match(/(20\d{2}-(?:0[1-9]|1[0-2]))/)?.[1];
  if (filePeriod && filePeriod !== entry.period) {
    throw new Error(`CAMARA_EXTERNAL_ADVISORIES_FILE_PERIOD_MISMATCH: file=${filePeriod} manifest=${entry.period}`);
  }
  const rows = parseCamaraExternalAdvisories(fs.readFileSync(entry.file, "utf8"));
  if (!rows.length) {
    summaries.push({ period: entry.period, rows: 0, deputies: 0, status: "empty_not_overwriting" });
    continue;
  }
  const validation = validateCamaraAdvisoryRows(rows, entry.rows ?? rows.length);
  const result = mergeCamaraExternalAdvisories(dataset, rows, roster, { period: entry.period, retrievedAt });
  if (result.ambiguous || result.unmatched || result.matched !== rows.length) {
    throw new Error(`CAMARA_EXTERNAL_ADVISORIES_LINK_INCOMPLETE: period=${entry.period} rows=${rows.length} matched=${result.matched} ambiguous=${result.ambiguous} unmatched=${result.unmatched}`);
  }
  dataset = result.dataset;
  summaries.push({ period: result.period, ...validation, deputies: Object.keys(result.byDeputy).length, status: "available" });
}

dataset.generado_en = retrievedAt;
if (write) fs.writeFileSync(outputPath, `${JSON.stringify(dataset, null, 1)}\n`, "utf8");
process.stdout.write(JSON.stringify({
  imports: summaries,
  totalRows: summaries.reduce((total, entry) => total + entry.rows, 0),
  output: write ? outputPath : null,
  mode: write ? "written" : "dry-run",
}, null, 2) + "\n");
