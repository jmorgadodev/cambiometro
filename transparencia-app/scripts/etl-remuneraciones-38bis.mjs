import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { externalText } from "./etl/safe-text.mjs";

const ROOT = process.cwd();
const SOURCE_URL = "https://comision38bis.gob.cl/registro-publico";
const outputPath = argument("--output", "data/remuneraciones-38bis-publico.json");
const auditPath = argument("--audit-output", "data/remuneraciones-38bis-publico-audit.json");
const previousPath = argument("--previous", "");
const allowLargeDrop = process.argv.includes("--allow-large-drop");

function argument(name, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function resolveFromRoot(file) {
  return path.resolve(ROOT, file);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readJson(file) {
  if (!file || !fs.existsSync(resolveFromRoot(file))) return null;
  return JSON.parse(fs.readFileSync(resolveFromRoot(file), "utf8"));
}

function rowsFromRelease(release) {
  if (Array.isArray(release?.registros)) return release.registros;
  return Array.isArray(release?.congreso) ? release.congreso : [];
}

function normalizeKey(value) {
  return externalText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function assignmentKey(row) {
  return [row.nombre, row.organismo, row.cargo].map(normalizeKey).join("|");
}

function compare(previous, currentRows) {
  // The legacy parliamentary snapshot is intentionally not a comparable
  // baseline for the complete public register. Start a clean baseline rather
  // than reporting the 859 non-Congress rows as artificial monthly entries.
  const previousRows = Array.isArray(previous?.registros) ? previous.registros : [];
  if (!previous || previousRows.length < 500) {
    return { estado: "linea_base", periodoAnterior: previous?.mes ?? null, entradas: 0, salidasObservadas: 0, cambios: 0 };
  }

  const previousByKey = new Map(previousRows.map((row) => [assignmentKey(row), row]));
  const currentByKey = new Map(currentRows.map((row) => [assignmentKey(row), row]));
  let entradas = 0;
  let cambios = 0;
  for (const row of currentRows) {
    const old = previousByKey.get(assignmentKey(row));
    if (!old) entradas += 1;
    else if (old.bruto_mensual !== row.bruto_mensual) cambios += 1;
  }
  let salidasObservadas = 0;
  for (const row of previousRows) if (!currentByKey.has(assignmentKey(row))) salidasObservadas += 1;
  return { estado: "comparado", periodoAnterior: previous.mes ?? null, entradas, salidasObservadas, cambios };
}

const res = await fetch(SOURCE_URL, {
  headers: { "user-agent": "cambiometro-public (ETL remuneraciones art. 38 bis)" },
});
if (!res.ok) throw new Error(`REMUNERACIONES_38BIS_HTTP_${res.status}`);
const html = await res.text();

const rows = [];
const re = /<tr>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td[^>]*>\s*<span class="lead">\s*\$&nbsp;([\d.]+)\s*<\/span>\s*<\/td>\s*<\/tr>/g;
let match;
while ((match = re.exec(html)) !== null) {
  rows.push({
    partida: externalText(match[1]),
    organismo: externalText(match[2]),
    cargo: externalText(match[3]),
    nombre: externalText(match[4]),
    bruto_mensual: Number.parseInt(match[5].replace(/\./g, ""), 10),
  });
}

if (rows.length < 500) throw new Error(`REMUNERACIONES_38BIS_TOO_FEW_ROWS:${rows.length}`);

const previous = readJson(previousPath);
const previousRows = rowsFromRelease(previous);
if (previous && !allowLargeDrop && previousRows.length > 0 && rows.length < previousRows.length * 0.7) {
  throw new Error(`REMUNERACIONES_38BIS_LARGE_DROP:${previousRows.length}->${rows.length}`);
}

const mes = /<select[^>]*id="reportes_publicos_periodo"[\s\S]*?<option\s+value="(\d{4}-\d{2})"/.exec(html)?.[1]
  ?? new Date().toISOString().slice(0, 7);
const extractedAt = new Date().toISOString();
const canonicalRows = JSON.stringify(rows);
const checksumSha256 = sha256(canonicalRows);
const congreso = rows.filter((row) => row.partida === "Congreso Nacional");
const release = {
  schema_version: 2,
  fuente: "Comisión para la Fijación de Remuneraciones (art. 38 bis) · registro público",
  url: SOURCE_URL,
  mes,
  extraido_en: extractedAt,
  filas: rows.length,
  checksum_sha256: checksumSha256,
  registros: rows,
  // Compatibilidad con las fichas parlamentarias existentes.
  congreso,
};
const delta = compare(previous, rows);
const audit = {
  schema_version: 1,
  source_id: "remuneraciones-38bis",
  mes,
  extraido_en: extractedAt,
  checksum_sha256: checksumSha256,
  filas: rows.length,
  filas_congreso: congreso.length,
  filas_fuera_congreso: rows.length - congreso.length,
  delta,
  d1_rows_read: 0,
  d1_rows_written: 0,
  storage: "r2",
  notas: [
    "Entrada y salida describen presencia o ausencia entre snapshots; no prueban por sí solas un nombramiento o término jurídico.",
    "La fuente publica el período de remuneración y la institución es responsable de la información reportada.",
  ],
};

fs.mkdirSync(path.dirname(resolveFromRoot(outputPath)), { recursive: true });
fs.mkdirSync(path.dirname(resolveFromRoot(auditPath)), { recursive: true });
fs.writeFileSync(resolveFromRoot(outputPath), `${JSON.stringify(release, null, 2)}\n`, "utf8");
fs.writeFileSync(resolveFromRoot(auditPath), `${JSON.stringify(audit, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  status: "ok",
  source: SOURCE_URL,
  mes,
  filas: rows.length,
  congreso: congreso.length,
  fueraDeCongreso: rows.length - congreso.length,
  checksumSha256,
  delta,
  d1RowsRead: 0,
  d1RowsWritten: 0,
}, null, 2));
