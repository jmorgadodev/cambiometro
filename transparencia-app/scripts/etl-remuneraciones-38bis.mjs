import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { externalText } from "./etl/safe-text.mjs";

const ROOT = process.cwd();
const SOURCE_URL = "https://comision38bis.gob.cl/registro-publico";
const outputPath = argument("--output", "data/remuneraciones-38bis-publico.json");
const auditPath = argument("--audit-output", "data/remuneraciones-38bis-publico-audit.json");
const historyPath = argument("--history-output", "data/remuneraciones-38bis-publico-historico.json");
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

function sourceUrl(periodo) {
  return periodo
    ? `${SOURCE_URL}?reportes_publicos%5Bcalidad%5D=&reportes_publicos%5Bperiodo%5D=${encodeURIComponent(periodo)}&reportes_publicos%5Binstitucion%5D=`
    : SOURCE_URL;
}

function availablePeriods(html) {
  return [...html.matchAll(/<option\s+value="(\d{4}-\d{2})"/g)].map((match) => match[1]);
}

function parseRows(html) {
  const rows = [];
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  while ((match = rowPattern.exec(html)) !== null) {
    const cells = [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => externalText(cell[1]));
    if (cells.length < 4 || cells.length > 5) continue;
    const [partida, organismo, cargo] = cells;
    const nombre = cells.length === 5 ? cells[3] : "No reportado";
    const rawSalary = cells.length === 5 ? cells[4] : cells[3];
    const salaryMatch = /\$\s*([\d.]+)/.exec(rawSalary);
    rows.push({
      partida,
      organismo,
      cargo,
      nombre,
      bruto_mensual: salaryMatch ? Number.parseInt(salaryMatch[1].replace(/\./g, ""), 10) : null,
    });
  }
  return rows;
}

async function fetchSource(periodo, html = null) {
  if (html) return html;
  const res = await fetch(sourceUrl(periodo), {
    headers: { "user-agent": "cambiometro-public (ETL remuneraciones art. 38 bis)" },
  });
  const body = await res.text();
  // The historical selector responds with HTTP 422 while still returning
  // the complete rendered table. Keep the body only when the expected form
  // is present; hard failures must still stop the ETL.
  if (!res.ok && !body.includes('id="reportes_publicos_periodo"')) {
    throw new Error(`REMUNERACIONES_38BIS_HTTP_${res.status}:${periodo}`);
  }
  return body;
}

function checksumRows(rows) {
  return sha256(JSON.stringify(rows));
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

const html = await fetchSource(null);
const periods = availablePeriods(html);
const mes = periods[0] ?? new Date().toISOString().slice(0, 7);
const rows = parseRows(html);

if (rows.length < 500) throw new Error(`REMUNERACIONES_38BIS_TOO_FEW_ROWS:${rows.length}`);

const snapshots = [{ mes, rows }];
for (const periodo of periods.slice(1)) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  const periodRows = parseRows(await fetchSource(periodo));
  if (periodRows.length === 0) throw new Error(`REMUNERACIONES_38BIS_EMPTY_PERIOD:${periodo}`);
  snapshots.push({ mes: periodo, rows: periodRows });
}

const previous = readJson(previousPath);
const previousRows = rowsFromRelease(previous);
if (previous && !allowLargeDrop && previousRows.length > 0 && rows.length < previousRows.length * 0.7) {
  throw new Error(`REMUNERACIONES_38BIS_LARGE_DROP:${previousRows.length}->${rows.length}`);
}

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
const previousSnapshot = snapshots[1];
const delta = previousSnapshot
  ? compare({ mes: previousSnapshot.mes, registros: previousSnapshot.rows }, rows)
  : compare(previous, rows);
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
    "Los montos no incluyen jornada, fecha de contratación, descuentos ni motivo de diferencias; se conserva el valor informado sin imputarlo.",
  ],
};

const historical = {
  schema_version: 1,
  source_id: "remuneraciones-38bis",
  source_url: SOURCE_URL,
  extraido_en: extractedAt,
  periodos: snapshots.slice(1).map((snapshot) => ({
    mes: snapshot.mes,
    filas: snapshot.rows.length,
    checksum_sha256: checksumRows(snapshot.rows),
    registros: snapshot.rows,
  })),
};

fs.mkdirSync(path.dirname(resolveFromRoot(outputPath)), { recursive: true });
fs.mkdirSync(path.dirname(resolveFromRoot(auditPath)), { recursive: true });
fs.mkdirSync(path.dirname(resolveFromRoot(historyPath)), { recursive: true });
fs.writeFileSync(resolveFromRoot(outputPath), `${JSON.stringify(release, null, 2)}\n`, "utf8");
fs.writeFileSync(resolveFromRoot(auditPath), `${JSON.stringify(audit, null, 2)}\n`, "utf8");
fs.writeFileSync(resolveFromRoot(historyPath), `${JSON.stringify(historical, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  status: "ok",
  source: SOURCE_URL,
  mes,
  filas: rows.length,
  congreso: congreso.length,
  fueraDeCongreso: rows.length - congreso.length,
  checksumSha256,
  delta,
  periodos: snapshots.map((snapshot) => ({ mes: snapshot.mes, filas: snapshot.rows.length })),
  d1RowsRead: 0,
  d1RowsWritten: 0,
}, null, 2));
