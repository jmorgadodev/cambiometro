import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
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

async function loadExistingProjection(root) {
  const ids = new Set();
  const fingerprints = new Set();
  const shapes = new Map();
  let rows = 0;
  let invalidPeriodRows = 0;
  const byContract = new Map();

  for (const fileName of (await readdir(root)).filter((name) => name.endsWith(".json")).sort()) {
    const parsed = JSON.parse(await readFile(join(root, fileName), "utf8"));
    if (!Array.isArray(parsed)) continue;
    for (const record of parsed) {
      rows += 1;
      if (record.id) ids.add(String(record.id));
      const period = text(record.fuente_periodo ?? record.periodo).slice(0, 7);
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) invalidPeriodRows += 1;
      const fingerprint = paidRemunerationFingerprint(record);
      fingerprints.add(fingerprint);
      const shape = paidRemunerationShape(record);
      const bucket = shapes.get(shape) ?? [];
      bucket.push(fingerprint);
      shapes.set(shape, bucket);
      const contract = text(record.tipo_contrato) || "Sin informar";
      byContract.set(contract, (byContract.get(contract) ?? 0) + 1);
    }
  }

  return { rows, ids, fingerprints, shapes, invalidPeriodRows, byContract };
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
  const sourceFingerprints = new Set();
  const sourceDuplicateFingerprints = new Set();
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
    if (sourceFingerprints.has(fingerprint)) sourceDuplicateFingerprints.add(fingerprint);
    sourceFingerprints.add(fingerprint);
    increment(byPeriod, record.fuente_periodo);
    increment(byOrganism, record.organo_nombre);

    if (existing.ids.has(record.id) || existing.fingerprints.has(fingerprint)) {
      alreadyPublished += 1;
      increment(byClassification, "ya_publicado");
      continue;
    }

    const shape = paidRemunerationShape(record);
    if (existing.shapes.has(shape)) {
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
      duplicateExactRows: sourceDuplicateFingerprints.size,
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
    sourceChecksum: createHash("sha256").update(JSON.stringify({ sourceUrl, sourceValidator, maxPeriod, paidRows })).digest("hex"),
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
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
