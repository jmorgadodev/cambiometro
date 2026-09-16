/**
 * Construye un catálogo de preflight para reemplazar sólo los períodos de
 * votaciones_senado cubiertos por un release oficial staged.
 *
 * Es deliberadamente local: no escribe R2, D1, Pages ni el catálogo productivo.
 * Su función es demostrar qué cambiaría y qué permanecería intacto antes de
 * una publicación atómica.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function required(name) {
  const value = arg(name);
  if (!value) throw new Error(`Falta ${name}`);
  return resolve(value);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const catalogPath = required("--catalog");
const stagedPath = required("--staged");
const outputPath = required("--output");
const catalogOutputPath = arg("--catalog-output", null);
const sourceId = arg("--source", "votaciones_senado");

const catalog = readJson(catalogPath);
const staged = readJson(stagedPath);
if (staged.sourceId !== sourceId) throw new Error(`STAGED_SOURCE_MISMATCH: ${staged.sourceId}`);
if (!Array.isArray(catalog.partitions) || !Array.isArray(catalog.sources)) throw new Error("INVALID_CATALOG");
if (!Array.isArray(staged.partitions) || staged.partitions.length === 0) throw new Error("STAGED_WITHOUT_PARTITIONS");

const stagedIds = staged.periods?.flatMap((period) => period.ids ?? []) ?? [];
if (new Set(stagedIds).size !== stagedIds.length) throw new Error("STAGED_DUPLICATE_VOTATION_ID");

const stagedById = new Map(staged.partitions.map((partition) => [partition.id, partition]));
if (stagedById.size !== staged.partitions.length) throw new Error("STAGED_DUPLICATE_PARTITION_ID");
const stagedPeriods = new Set(staged.partitions.map((partition) => partition.period));

const oldTargetPartitions = catalog.partitions.filter((partition) => partition.sourceId === sourceId && stagedPeriods.has(partition.period));
const mergedPartitions = [];
const inserted = new Set();
for (const partition of catalog.partitions) {
  if (partition.sourceId === sourceId && stagedPeriods.has(partition.period)) {
    const replacement = stagedById.get(partition.id);
    if (replacement) {
      mergedPartitions.push(replacement);
      inserted.add(replacement.id);
    }
    continue;
  }
  mergedPartitions.push(partition);
}
for (const partition of staged.partitions) {
  if (!inserted.has(partition.id)) mergedPartitions.push(partition);
}

const source = catalog.sources.find((entry) => entry.id === sourceId);
if (!source) throw new Error(`SOURCE_NOT_IN_CATALOG: ${sourceId}`);
const mergedSource = {
  ...source,
  recordCount: mergedPartitions
    .filter((partition) => partition.sourceId === sourceId)
    .reduce((total, partition) => total + Number(partition.recordCount ?? 0), 0),
  foundPeriods: [...new Set(mergedPartitions
    .filter((partition) => partition.sourceId === sourceId)
    .map((partition) => partition.period)
    .filter(Boolean))].sort(),
};

const mergedCatalog = {
  ...catalog,
  generatedAt: new Date().toISOString(),
  sources: catalog.sources.map((entry) => entry.id === sourceId ? mergedSource : entry),
  partitions: mergedPartitions,
};
const unchangedSourceIds = catalog.sources
  .filter((entry) => entry.id !== sourceId)
  .map((entry) => entry.id)
  .filter((id) => !staged.partitions.some((partition) => partition.sourceId === id))
  .sort();
const summary = {
  schemaVersion: "senado-votaciones-merge-preflight-v1",
  status: "preflight_only",
  sourceId,
  replacedPeriods: [...stagedPeriods].sort(),
  oldPartitionCount: oldTargetPartitions.length,
  newPartitionCount: staged.partitions.length,
  oldSourceRecordCount: Number(source.recordCount ?? 0),
  newSourceRecordCount: mergedSource.recordCount,
  stagedRecordCount: Number(staged.recordCount ?? 0),
  stagedAssetKeys: staged.assets?.map((asset) => asset.key) ?? [],
  unchangedSourceIds,
  requiresBeforePublication: [
    "subir todos los assets staged con checksum",
    "publicar el catálogo fusionado como operación atómica",
    "conservar el catálogo productivo anterior como rollback",
    "verificar /api/v1/records por período después de publicar",
  ],
  catalog: mergedCatalog,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
if (catalogOutputPath) {
  mkdirSync(dirname(resolve(catalogOutputPath)), { recursive: true });
  writeFileSync(resolve(catalogOutputPath), `${JSON.stringify(mergedCatalog)}\n`, "utf8");
}
console.log(JSON.stringify({
  ok: true,
  status: summary.status,
  sourceId,
  replacedPeriods: summary.replacedPeriods,
  oldSourceRecordCount: summary.oldSourceRecordCount,
  newSourceRecordCount: summary.newSourceRecordCount,
  unchangedSourceCount: unchangedSourceIds.length,
  output: outputPath,
  catalogOutput: catalogOutputPath ? resolve(catalogOutputPath) : null,
}, null, 2));
