import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { currentCpltPeriod } from "./cplt-personal.mjs";
import { parseCentralHonorarioRow } from "./central-honorarios.mjs";
import { CENTRAL_HONORARIOS_URLS } from "./central-honorarios-stream.mjs";
import { readRangedTextLines } from "./ranged-csv-source.mjs";

const DEFAULT_PROJECTION_ROOT = resolve("data/raw/transparencia_activa_central/projections/funcionarios-v1");
const DEFAULT_OUTPUT = resolve("data/auditorias/remuneraciones-pagadas-reconciliation.json");

function text(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function normalizePaidRemuneration(value) {
  return text(value).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function paidRemunerationFingerprint(record) {
  return [
    normalizePaidRemuneration(record.organo_nombre),
    text(record.fuente_periodo ?? record.periodo).slice(0, 7),
    normalizePaidRemuneration(record.nombre_completo),
    normalizePaidRemuneration(record.cargo ?? record.funcion),
    Number(record.remuneracion_bruta_mensual ?? 0),
    Number(record.remuneracion_liquida_mensual_original ?? record.remuneracion_liquida_mensual ?? 0),
  ].join("|");
}

export function paidRemunerationShape(record) {
  return [
    normalizePaidRemuneration(record.organo_nombre),
    text(record.fuente_periodo ?? record.periodo).slice(0, 7),
    normalizePaidRemuneration(record.nombre_completo),
    normalizePaidRemuneration(record.cargo ?? record.funcion),
  ].join("|");
}

function fingerprintDigest(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function loadExistingProjection(root) {
  const filePath = join(tmpdir(), `cambiometro-paid-reconcile-${process.pid}.sqlite`);
  for (const suffix of ["", "-journal", "-wal", "-shm"]) rmSync(`${filePath}${suffix}`, { force: true });
  const database = new DatabaseSync(filePath);
  database.exec(`
    PRAGMA journal_mode = DELETE;
    PRAGMA synchronous = OFF;
    PRAGMA temp_store = FILE;
    PRAGMA cache_size = -65536;
    CREATE TABLE existing_ids (record_id TEXT PRIMARY KEY);
    CREATE TABLE existing_fingerprints (fingerprint TEXT PRIMARY KEY, shape TEXT NOT NULL);
    CREATE INDEX existing_shape ON existing_fingerprints(shape);
    CREATE TABLE source_fingerprints (fingerprint TEXT PRIMARY KEY);
  `);
  const insertId = database.prepare("INSERT OR IGNORE INTO existing_ids (record_id) VALUES (?)");
  const insertFingerprint = database.prepare("INSERT OR IGNORE INTO existing_fingerprints (fingerprint, shape) VALUES (?, ?)");
  let rows = 0;
  let invalidPeriodRows = 0;
  const byContract = new Map();

  try {
    database.exec("BEGIN");
    for (const fileName of (await readdir(root)).filter((name) => name.endsWith(".json")).sort()) {
      const parsed = JSON.parse(await readFile(join(root, fileName), "utf8"));
      if (!Array.isArray(parsed)) continue;
      for (const record of parsed) {
        rows += 1;
        if (record.id) insertId.run(String(record.id));
        const period = text(record.fuente_periodo ?? record.periodo).slice(0, 7);
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) invalidPeriodRows += 1;
        insertFingerprint.run(
          fingerprintDigest(paidRemunerationFingerprint(record)),
          fingerprintDigest(paidRemunerationShape(record)),
        );
        const contract = text(record.tipo_contrato) || "Sin informar";
        byContract.set(contract, (byContract.get(contract) ?? 0) + 1);
      }
    }
    database.exec("COMMIT");
  } catch (error) {
    database.close();
    for (const suffix of ["", "-journal", "-wal", "-shm"]) rmSync(`${filePath}${suffix}`, { force: true });
    throw error;
  }

  return {
    database,
    filePath,
    rows,
    invalidPeriodRows,
    byContract,
    existingId: database.prepare("SELECT 1 AS found FROM existing_ids WHERE record_id = ? LIMIT 1"),
    existingFingerprint: database.prepare("SELECT 1 AS found FROM existing_fingerprints WHERE fingerprint = ? LIMIT 1"),
    existingShape: database.prepare("SELECT 1 AS found FROM existing_fingerprints WHERE shape = ? LIMIT 1"),
    sourceFingerprint: database.prepare("SELECT 1 AS found FROM source_fingerprints WHERE fingerprint = ? LIMIT 1"),
    insertSourceFingerprint: database.prepare("INSERT OR IGNORE INTO source_fingerprints (fingerprint) VALUES (?)"),
  };
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function sortedCounts(map, limit = 25) {
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key, "es-CL"))
    .slice(0, limit);
}

export async function reconcilePaidRemunerations({
  urls = CENTRAL_HONORARIOS_URLS,
  projectionRoot = DEFAULT_PROJECTION_ROOT,
  output = DEFAULT_OUTPUT,
  maxPeriod = currentCpltPeriod(),
} = {}) {
  const existing = await loadExistingProjection(projectionRoot);
  const byPeriod = new Map();
  const byOrganism = new Map();
  const byClassification = new Map();
  let sourceLines = 0;
  let sourceRows = 0;
  let paidRows = 0;
  let excludedRows = 0;
  let outsidePeriodRows = 0;
  let alreadyPublished = 0;
  let missing = 0;
  let conflicts = 0;
  let sourceDuplicateRows = 0;
  const sampleMissing = [];
  const sampleConflicts = [];
  let sourceUrl = urls[0];
  let sourceValidator = null;

  const lines = readRangedTextLines({
    urls,
    onSource: (source) => {
      sourceUrl = source.sourceUrl;
      sourceValidator = source.validator ?? null;
    },
  });

  let headerLine = null;
  for await (const line of lines) {
    sourceLines += 1;
    if (sourceLines === 1) {
      headerLine = line;
      continue;
    }
    sourceRows += 1;
    const record = parseCentralHonorarioRow({ line, headerLine, sourceUrl });
    if (!record) {
      excludedRows += 1;
      continue;
    }
    if (record.fuente_periodo > maxPeriod) {
      outsidePeriodRows += 1;
      continue;
    }

    paidRows += 1;
    const fingerprint = paidRemunerationFingerprint(record);
    const fingerprintKey = fingerprintDigest(fingerprint);
    if (existing.sourceFingerprint.get(fingerprintKey)) sourceDuplicateRows += 1;
    existing.insertSourceFingerprint.run(fingerprintKey);
    increment(byPeriod, record.fuente_periodo);
    increment(byOrganism, record.organo_nombre);

    if (existing.existingId.get(record.id) || existing.existingFingerprint.get(fingerprintKey)) {
      alreadyPublished += 1;
      increment(byClassification, "ya_publicado");
      continue;
    }

    const shape = paidRemunerationShape(record);
    if (existing.existingShape.get(fingerprintDigest(shape))) {
      conflicts += 1;
      increment(byClassification, "conflicto_o_revision");
      if (sampleConflicts.length < 25) sampleConflicts.push({ id: record.id, periodo: record.fuente_periodo });
      continue;
    }

    missing += 1;
    increment(byClassification, "faltante");
    if (sampleMissing.length < 25) sampleMissing.push({ id: record.id, periodo: record.fuente_periodo });
  }

  if (!headerLine) throw new Error("CENTRAL_HONORARIOS_HEADER_MISSING");
  const report = {
    schemaVersion: 1,
    sourceId: "cplt-central-honorarios",
    sourceUrl,
    sourceValidator,
    generatedAt: new Date().toISOString(),
    maxPeriod,
    existingProjection: {
      path: projectionRoot,
      rows: existing.rows,
      invalidPeriodRows: existing.invalidPeriodRows,
      byContract: Object.fromEntries(existing.byContract),
    },
    source: {
      linesProcessed: sourceLines,
      dataRows: sourceRows,
      paidRowsWithinPeriod: paidRows,
      excludedRows: excludedRows,
      outsidePeriodRows,
      periods: sortedCounts(byPeriod, 1000),
      topOrganisms: sortedCounts(byOrganism),
      duplicateExactRows: sourceDuplicateRows,
    },
    reconciliation: {
      alreadyPublished,
      missing,
      conflicts,
      classification: Object.fromEntries(byClassification),
      sampleMissing,
      sampleConflicts,
    },
    policy: {
      convocatorias: "excluded",
      zeroOrUnpaid: "excluded",
      futurePeriods: "excluded",
      crossSourceNameOnlyDeduplication: "forbidden",
      rawCsvPublication: "forbidden",
    },
    index: {
      algorithm: "sha256",
      purpose: "huellas compactas para conciliación; no reemplazan los valores originales",
    },
    sourceChecksum: createHash("sha256").update(JSON.stringify({ sourceUrl, sourceValidator, maxPeriod, paidRows })).digest("hex"),
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  existing.database.close();
  for (const suffix of ["", "-journal", "-wal", "-shm"]) rmSync(`${existing.filePath}${suffix}`, { force: true });
  return report;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  reconcilePaidRemunerations()
    .then((report) => console.log(JSON.stringify({
      sourceRows: report.source.dataRows,
      paidRowsWithinPeriod: report.source.paidRowsWithinPeriod,
      alreadyPublished: report.reconciliation.alreadyPublished,
      missing: report.reconciliation.missing,
      conflicts: report.reconciliation.conflicts,
      outsidePeriodRows: report.source.outsidePeriodRows,
    }, null, 2)))
    .catch((error) => {
      console.error(`[paid-remunerations-reconcile] ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    });
}
