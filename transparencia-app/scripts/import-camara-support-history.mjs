import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { parseCamaraOpenDataDeputies } from "./etl/camara-request-headers.mjs";
import { CAMARA_GENERAL_SUPPORT_URL, mergeCamaraGeneralSupportMonth, parseCamaraGeneralSupportTable } from "./etl/camara-personal-apoyo-general.mjs";
import { validatePersonalApoyoDataset } from "./etl/personal-apoyo-publication.mjs";
import { verifyPersonalApoyoRelease } from "./etl/personal-apoyo-release.mjs";
import { mergeCamaraSupportImportMetadata } from "./etl/camara-support-monthly.mjs";

const args = process.argv.slice(2);
function argument(name) {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) throw new Error(`CAMARA_SUPPORT_ARGUMENT_REQUIRED:${name}`);
  return args[index + 1];
}
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const manifestPath = path.resolve(argument("--manifest"));
const captureDir = args.includes("--capture-dir") ? path.resolve(argument("--capture-dir")) : path.dirname(manifestPath);
const outputPath = path.resolve(argument("--output"));
const inputPath = path.resolve(argument("--input"));
if (inputPath === outputPath) throw new Error("CAMARA_SUPPORT_CANDIDATE_MUST_BE_ISOLATED");
const expected = argument("--expected-periods").split(",").sort();
const entries = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
if (!Array.isArray(entries) || new Set(entries.map((entry) => entry.period)).size !== entries.length || JSON.stringify(entries.map((entry) => entry.period).sort()) !== JSON.stringify(expected)) {
  throw new Error("CAMARA_SUPPORT_CAPTURE_PERIODS_INCOMPLETE");
}
const original = verifyPersonalApoyoRelease(fs.readFileSync(inputPath), JSON.parse(fs.readFileSync(path.resolve(argument("--current-manifest")), "utf8"))).dataset;

// Una consulta oficial recupera también los IDs históricos, evitando asignar
// contratos de enero/febrero a otra persona de la composición actual.
const rosterUrl = "https://opendata.camara.cl/camaradiputados/WServices/WSDiputado.asmx/retornarDiputados";
const rosterPath = path.join(captureDir, "diputados-open-data.xml");
let rosterXml;
if (fs.existsSync(rosterPath)) {
  rosterXml = fs.readFileSync(rosterPath, "utf8");
} else {
  const response = await fetch(rosterUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`CAMARA_SUPPORT_ROSTER_HTTP_${response.status}`);
  rosterXml = await response.text();
  if (Object.keys(parseCamaraOpenDataDeputies(rosterXml)).length < 155) throw new Error("CAMARA_SUPPORT_ROSTER_INCOMPLETE");
  fs.writeFileSync(rosterPath, rosterXml, { flag: "wx" });
  fs.writeFileSync(path.join(captureDir, "diputados-open-data.evidence.json"), JSON.stringify({ source: rosterUrl, retrievedAt: new Date().toISOString(), checksumSha256: hash(rosterXml) }, null, 2), { flag: "wx" });
}
const parsedRoster = parseCamaraOpenDataDeputies(rosterXml);
const roster = Object.fromEntries(Object.entries(parsedRoster).map(([id, deputy]) => [id, deputy.nombre]));
if (Object.keys(roster).length < 155) throw new Error("CAMARA_SUPPORT_ROSTER_INCOMPLETE");
const aliases = JSON.parse(fs.readFileSync(new URL("../data/camara-personal-apoyo-nombres-verificados.json", import.meta.url), "utf8")).aliases;

let dataset = original;
const imports = [];
for (const entry of [...entries].sort((left, right) => left.period.localeCompare(right.period))) {
  if (entry.source !== CAMARA_GENERAL_SUPPORT_URL || entry.captureFormat !== "rendered-table-rows" || !/^2026-(0[1-9]|1[0-2])$/.test(entry.period)) throw new Error("CAMARA_SUPPORT_CAPTURE_METADATA_INVALID");
  const filename = path.resolve(captureDir, entry.file);
  if (path.dirname(filename) !== captureDir) throw new Error("CAMARA_SUPPORT_CAPTURE_PATH_INVALID");
  const raw = fs.readFileSync(filename, "utf8");
  if (hash(raw) !== entry.checksumSha256 || raw.includes("[Truncated]") || !raw.endsWith("</table>")) throw new Error(`CAMARA_SUPPORT_CAPTURE_INVALID:${entry.period}`);
  const rows = parseCamaraGeneralSupportTable(raw);
  if (rows.length !== entry.rows || rows.length < 500) throw new Error(`CAMARA_SUPPORT_CAPTURE_COUNT_MISMATCH:${entry.period}:${rows.length}/${entry.rows}`);
  if (new Set(rows.map((row) => JSON.stringify(row))).size !== rows.length) throw new Error(`CAMARA_SUPPORT_CAPTURE_DUPLICATE:${entry.period}`);
  const result = mergeCamaraGeneralSupportMonth(dataset, rows, roster, { period: entry.period, retrievedAt: entry.retrievedAt, checksum: entry.checksumSha256, aliases });
  dataset = result.dataset;
  const monthlyRows = Object.values(dataset.diputados).flatMap((deputy) => deputy.personal_apoyo_por_periodo?.[entry.period]?.rows ?? []);
  const sourceTotal = rows.reduce((sum, row) => sum + row.sueldo, 0);
  if (monthlyRows.length !== rows.length || monthlyRows.reduce((sum, row) => sum + row.sueldo, 0) !== sourceTotal) throw new Error(`CAMARA_SUPPORT_MONTH_RECONCILIATION_FAILED:${entry.period}`);
  imports.push({ period: entry.period, rows: rows.length, deputies: result.deputies, totalClp: sourceTotal, checksumSha256: entry.checksumSha256 });
}
if (JSON.stringify(dataset.senadores) !== JSON.stringify(original.senadores) || JSON.stringify(dataset.asignacion_senado_2026) !== JSON.stringify(original.asignacion_senado_2026)) throw new Error("CAMARA_SUPPORT_SENATE_CHANGED");
for (const [id, deputy] of Object.entries(original.diputados)) {
  if (JSON.stringify(dataset.diputados[id]?.transparencia_camara) !== JSON.stringify(deputy.transparencia_camara)) throw new Error(`CAMARA_SUPPORT_OTHER_CATEGORY_CHANGED:${id}`);
}
dataset.generado_en = new Date().toISOString();
dataset.fuentes = { ...dataset.fuentes, camara_personal_apoyo_historico: { url: CAMARA_GENERAL_SUPPORT_URL, nota: "Nóminas oficiales por mes y diputado, vinculadas a IDs de Open Data Cámara. Filas y montos corresponden al corte publicado; no equivalen a personas únicas ni a mensualidades completas.", periods: mergeCamaraSupportImportMetadata(original.fuentes?.camara_personal_apoyo_historico?.periods, imports) } };
const counts = validatePersonalApoyoDataset(dataset);
fs.writeFileSync(outputPath, `${JSON.stringify(dataset, null, 1)}\n`);
console.log(JSON.stringify({ action: "candidate-verified", output: outputPath, baselineChecksumSha256: hash(fs.readFileSync(inputPath)), candidateChecksumSha256: hash(fs.readFileSync(outputPath)), officialRoster: Object.keys(roster).length, imports, historicalCamaraRows: imports.reduce((sum, entry) => sum + entry.rows, 0), ...counts }, null, 2));
