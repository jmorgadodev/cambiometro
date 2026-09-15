import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function matchesSource(partition, sourceId = null) {
  if (!sourceId) return true;
  const declaredSource = String(partition?.sourceId ?? "");
  const manifestParts = String(partition?.manifestKey ?? "").split("/");
  return declaredSource === sourceId || manifestParts.includes(sourceId);
}

function normalizedPartitions(catalog, sourceId = null) {
  return (Array.isArray(catalog?.partitions) ? catalog.partitions : [])
    .filter((partition) => matchesSource(partition, sourceId))
    .filter((partition) => String(partition?.manifestKey ?? "").trim())
    .sort((left, right) => String(left.manifestKey).localeCompare(String(right.manifestKey)));
}

/**
 * Builds a local-only, non-mutating repair plan for catalogued R2 objects.
 * It verifies local manifests and their declared artifacts before any future
 * operator is allowed to upload them. This function never calls Wrangler.
 *
 * @param {{ catalog: Record<string, unknown>, lakeRoot: string, sourceId?: string | null }} input
 */
export function buildLocalR2RepairPlan({ catalog, lakeRoot, sourceId = null }) {
  const operations = [];
  const missing = [];
  const mismatches = [];
  const partitions = normalizedPartitions(catalog, sourceId);

  for (const partition of partitions) {
    const manifestKey = String(partition.manifestKey).trim();
    const manifestPath = join(lakeRoot, manifestKey);
    if (!existsSync(manifestPath)) {
      missing.push({ key: manifestKey, kind: "manifest", partitionId: partition.id ?? null });
      continue;
    }

    operations.push({
      key: manifestKey,
      kind: "manifest",
      path: manifestPath,
      bytes: statSync(manifestPath).size,
      sha256: sha256(manifestPath),
    });

    let manifest;
    try {
      manifest = readJson(manifestPath);
    } catch (error) {
      mismatches.push({ key: manifestKey, kind: "manifest", reason: "invalid_json", detail: String(error?.message ?? error) });
      continue;
    }

    for (const artifact of Array.isArray(manifest.artifacts) ? manifest.artifacts : []) {
      const artifactKey = String(artifact?.key ?? "").trim();
      if (!artifactKey) continue;
      const artifactPath = join(lakeRoot, artifactKey);
      if (!existsSync(artifactPath)) {
        missing.push({ key: artifactKey, kind: "artifact", partitionId: partition.id ?? null });
        continue;
      }
      const actualSha256 = sha256(artifactPath);
      const expectedSha256 = String(artifact?.checksumSha256 ?? "").trim().toLowerCase();
      if (expectedSha256 && actualSha256 !== expectedSha256) {
        mismatches.push({ key: artifactKey, kind: "artifact", reason: "checksum", expectedSha256, actualSha256 });
        continue;
      }
      operations.push({
        key: artifactKey,
        kind: "artifact",
        path: artifactPath,
        bytes: statSync(artifactPath).size,
        sha256: actualSha256,
      });
    }
  }

  const uniqueOperations = [...new Map(operations.map((operation) => [operation.key, operation])).values()]
    .sort((left, right) => left.key.localeCompare(right.key));
  return {
    schemaVersion: 1,
    sourceId: sourceId ?? "all",
    checkedPartitions: partitions.length,
    ready: partitions.length > 0 && missing.length === 0 && mismatches.length === 0,
    writesPerformed: false,
    missing,
    mismatches,
    operations: uniqueOperations,
    totalBytes: uniqueOperations.reduce((sum, operation) => sum + operation.bytes, 0),
  };
}

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

if (process.argv[1]?.endsWith("r2-repair-plan.mjs")) {
  const root = resolve(import.meta.dirname, "..");
  const lakeRoot = resolve(option("--lake-root", join(root, "data", "lake")));
  const catalogPath = resolve(option("--catalog", join(lakeRoot, "catalog", "v1", "manifest.json")));
  const sourceId = option("--source", null);
  const result = buildLocalR2RepairPlan({ catalog: readJson(catalogPath), lakeRoot, sourceId });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ready) process.exitCode = 1;
}
