import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { buildLakePlan } from "./lake.mjs";

// Fetch only the months touched by this source and its entity references.
// A missing or inconsistent baseline aborts instead of replacing history.
export function hydrateSourceHistory(snapshot, options) {
  const { appRoot, outputRoot, existingCatalog } = options;
  if (!Array.isArray(existingCatalog?.partitions)) throw new Error("SOURCE_BASELINE_CATALOG_REQUIRED");
  const draft = buildLakePlan(snapshot, options);
  const updatedIds = new Set(draft.assets
    .filter(asset => asset.key.startsWith("partitions/") && asset.key.endsWith("/manifest.json"))
    .map(asset => JSON.parse(asset.data.toString("utf8")).id));
  const selectedSources = new Set(draft.catalog.partitions.filter(partition => updatedIds.has(partition.id)).map(partition => partition.sourceId));
  function hydrate(key) {
    const target = resolve(outputRoot, key);
    if (!target.startsWith(outputRoot + sep)) throw new Error(`INVALID_ASSET_KEY:${key}`);
    mkdirSync(dirname(target), { recursive: true });
    const result = spawnSync(process.execPath, [resolve(appRoot, "node_modules/wrangler/bin/wrangler.js"), "r2", "object", "get", `transparencia-public-data/${key}`, "--file", target, "--remote"], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(`SOURCE_HISTORY_UNAVAILABLE:${key}`);
    return readFileSync(target);
  }
  const existingPartitionRecords = {};
  for (const previous of existingCatalog.partitions.filter(partition => updatedIds.has(partition.id))) {
    const manifest = JSON.parse(hydrate(previous.manifestKey).toString("utf8"));
    if (manifest.id !== previous.id || manifest.recordCount !== previous.recordCount) throw new Error(`SOURCE_HISTORY_MANIFEST_MISMATCH:${previous.id}`);
    const chunks = manifest.artifacts.filter(asset => /records.*\.jsonl\.gz(?:\.part-\d+)?$/.test(asset.key)).sort((a,b) => a.key.localeCompare(b.key)).map(asset => {
      const data = hydrate(asset.key);
      if (createHash("sha256").update(data).digest("hex") !== asset.checksumSha256) throw new Error(`SOURCE_HISTORY_CHECKSUM_MISMATCH:${asset.key}`);
      return data;
    });
    const compressed = Buffer.concat(chunks);
    if (createHash("sha256").update(compressed).digest("hex") !== previous.checksumSha256) throw new Error(`SOURCE_HISTORY_PARTITION_MISMATCH:${previous.id}`);
    const text = gunzipSync(compressed).toString("utf8").trim();
    const rows = text ? text.split("\n").map(line => JSON.parse(line)) : [];
    if (rows.length !== previous.recordCount || rows.some(row => row.sourceId !== previous.sourceId)) throw new Error(`SOURCE_HISTORY_COUNT_MISMATCH:${previous.id}`);
    existingPartitionRecords[previous.id] = rows;
  }
  const existingEntityBundles = {};
  for (const source of (existingCatalog.sources ?? []).filter(source => selectedSources.has(source.id))) {
    const bundle = {};
    for (const [field, key] of [["entities", source.entityKey], ["indexes", source.entityIndexKey]]) {
      if (!key) continue;
      const text = gunzipSync(hydrate(key)).toString("utf8").trim();
      bundle[field] = text ? text.split("\n").map(line => JSON.parse(line)) : [];
    }
    existingEntityBundles[source.id] = bundle;
  }
  return { existingPartitionRecords, existingEntityBundles };
}
