import fs from "node:fs";
import path from "node:path";
import { buildHistory, checksumRows, compareRows, extractPeriod, parseRows, SOURCE_URL } from "./etl/remuneraciones-38bis-parser.mjs";

const root = process.cwd();
const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (!argument.startsWith("--")) continue;
  args.set(argument, process.argv[index + 1]?.startsWith("--") ? true : process.argv[++index] ?? true);
}

const outputPath = String(args.get("--output") || path.join("data", "remuneraciones-38bis-publico.json"));
const auditPath = String(args.get("--audit-output") || path.join("data", "remuneraciones-38bis-publico-audit.json"));
const historyPath = String(args.get("--history-output") || path.join("data", "remuneraciones-38bis-publico-historico.json"));
const previousPath = args.get("--previous");
const previousHistoryPath = args.get("--previous-history");

async function fetchWithRetry(url, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "user-agent": "transparencia-impulsacv (ETL sueldos 38 bis)" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 1_500 * attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`No fue posible consultar ${url} tras ${attempts} intentos: ${lastError?.message ?? lastError}`);
}

function readJson(filePath, fallback = null) {
  if (!filePath || !fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const response = await fetchWithRetry(SOURCE_URL);
const html = new TextDecoder("utf-8").decode(new Uint8Array(await response.arrayBuffer()));
const registros = parseRows(html);
if (registros.length < 500) throw new Error(`Se parsearon ${registros.length} filas; se requieren al menos 500 para publicar.`);

const extraidoEn = new Date().toISOString();
const mes = extractPeriod(html) ?? new Date(extraidoEn).toISOString().slice(0, 7);
const previous = readJson(previousPath);
const previousHistory = readJson(previousHistoryPath, readJson(historyPath, { periodos: [] }));
const checksum = checksumRows(registros);
const current = {
  schema_version: 2,
  fuente: "Comisión para la Fijación de Remuneraciones (art. 38 bis) · registro público",
  url: SOURCE_URL,
  mes,
  extraido_en: extraidoEn,
  filas: registros.length,
  checksum_sha256: checksum,
  registros,
};
const delta = compareRows(previous?.registros, registros, previous?.mes ?? null);
const history = buildHistory(previous, previousHistory, current);
const audit = {
  schema_version: 1,
  source_id: "remuneraciones-38bis",
  mes,
  extraido_en: extraidoEn,
  checksum_sha256: checksum,
  filas: registros.length,
  filas_congreso: registros.filter((row) => row.partida === "Congreso Nacional").length,
  filas_fuera_congreso: registros.filter((row) => row.partida !== "Congreso Nacional").length,
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

for (const [filePath, value] of [[outputPath, current], [auditPath, audit], [historyPath, history]]) {
  fs.mkdirSync(path.dirname(path.resolve(root, filePath)), { recursive: true });
  fs.writeFileSync(path.resolve(root, filePath), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

// Mantiene la salida histórica del conector para consumidores antiguos que aún la importan.
if (!args.has("--output")) {
  fs.writeFileSync(path.join(root, "data", "remuneraciones-38bis.json"), `${JSON.stringify({ fuente: current.fuente, url: current.url, mes: current.mes, extraido_en: current.extraido_en, filas: current.filas, congreso: registros.filter((row) => row.partida === "Congreso Nacional") }, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify({ status: "ok", rows: current.filas, month: current.mes, checksum, delta, d1: { rowsRead: 0, rowsWritten: 0 } }, null, 2));
