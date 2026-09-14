import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_BUCKET = "transparencia-public-data";
const DEFAULT_CATALOG_KEY = "catalog/v1/manifest.json";
const DEFAULT_INVENTORY_KEY = "catalog/v1/storage.json";
const DEFAULT_LIMIT = 200;

function hasObject(objects, key) {
  if (objects instanceof Map || objects instanceof Set) return objects.has(key);
  return Object.prototype.hasOwnProperty.call(objects ?? {}, key);
}

function getObject(objects, key) {
  if (objects instanceof Map) return objects.get(key);
  return objects?.[key];
}

/** @param {Record<string, unknown>} catalog @param {string | null} [sourceId] */
export function catalogPartitionKeys(catalog, sourceId = null) {
  return [...new Set((Array.isArray(catalog?.partitions) ? catalog.partitions : [])
    .filter((partition) => !sourceId || String(partition?.sourceId ?? "") === sourceId)
    .map((partition) => String(partition?.manifestKey ?? "").trim())
    .filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

/**
 * Derives the single-part projection key used by the lake when a partition
 * manifest is missing but the catalog still carries its projection checksum.
 * This is only a probe hint: it must never be treated as proof of a release.
 */
export function catalogProjectionArtifactKey(partition) {
  const manifestKey = String(partition?.manifestKey ?? "").trim();
  const checksum = String(partition?.checksumSha256 ?? "").trim();
  if (!manifestKey.endsWith("/manifest.json") || !/^[a-f0-9]{64}$/i.test(checksum)) return null;
  return `${manifestKey.slice(0, -"manifest.json".length)}records-${checksum}.jsonl.gz`;
}

/** @param {Record<string, unknown>} catalog @param {Map<string, unknown> | Set<string> | Record<string, unknown>} objects @param {string | null} [sourceId] */
export function auditCatalogClosure(catalog, objects, sourceId = null) {
  const missingManifests = [];
  const missingArtifacts = new Set();
  const manifestKeys = catalogPartitionKeys(catalog, sourceId);

  for (const manifestKey of manifestKeys) {
    if (!hasObject(objects, manifestKey)) {
      missingManifests.push(manifestKey);
      continue;
    }
    const manifest = getObject(objects, manifestKey);
    for (const artifact of Array.isArray(manifest?.artifacts) ? manifest.artifacts : []) {
      const artifactKey = String(artifact?.key ?? "").trim();
      if (artifactKey && !hasObject(objects, artifactKey)) missingArtifacts.add(artifactKey);
    }
  }

  return {
    complete: missingManifests.length === 0 && missingArtifacts.size === 0,
    checkedManifests: manifestKeys.length,
    missingManifests,
    missingArtifacts: [...missingArtifacts].sort((left, right) => left.localeCompare(right)),
  };
}

/**
 * Converts the raw closure evidence into a publication decision. A source can
 * have a responding connector and still lack a verifiable R2 release; those
 * states must not be collapsed into a generic "unavailable" or zero count.
 */
export function classifyR2Closure(result) {
  const missingManifests = Array.isArray(result?.missingManifests) ? result.missingManifests : [];
  const missingArtifacts = Array.isArray(result?.missingArtifacts) ? result.missingArtifacts : [];
  const missingManifestArtifacts = Array.isArray(result?.missingManifestArtifacts) ? result.missingManifestArtifacts : [];
  const presentWithoutManifest = Array.isArray(result?.presentWithoutManifest) ? result.presentWithoutManifest : [];
  const missingArtifactInventory = Array.isArray(result?.missingArtifactInventory) ? result.missingArtifactInventory : [];

  if (missingManifests.length > 0 || missingManifestArtifacts.length > 0) {
    return {
      status: "catalogued_without_manifest",
      promotionAllowed: false,
      reason: "El catálogo referencia particiones cuyo manifiesto no está disponible en R2.",
    };
  }
  if (missingArtifacts.length > 0 || missingArtifactInventory.length > 0) {
    return {
      status: "manifest_without_artifact",
      promotionAllowed: false,
      reason: "Hay manifiestos que apuntan a artefactos no verificables en R2.",
    };
  }
  if (presentWithoutManifest.length > 0) {
    return {
      status: "artifact_without_manifest",
      promotionAllowed: false,
      reason: "Hay artefactos presentes sin un manifiesto que acredite período, conteo y checksum.",
    };
  }
  if (result?.artifactCheck === "not_available") {
    return {
      status: "manifests_present_artifacts_unverified",
      promotionAllowed: false,
      reason: "Los manifiestos están presentes, pero no se pudo comprobar la existencia de sus artefactos.",
    };
  }
  return {
    status: result?.complete === true ? "verifiable" : "incomplete",
    promotionAllowed: result?.complete === true,
    reason: result?.complete === true
      ? "Manifiestos y artefactos comprobados en R2."
      : "El cierre de R2 está incompleto.",
  };
}

function gapSource(value) {
  const key = typeof value === "string" ? value : value?.manifestKey ?? value?.artifactKey ?? "";
  const parts = String(key).split("/");
  return parts[0] === "partitions" && parts[1] ? parts[1] : "unknown";
}

function groupGaps(values) {
  const groups = new Map();
  for (const value of values ?? []) {
    const source = gapSource(value);
    const current = groups.get(source) ?? { sourceId: source, count: 0, samples: [] };
    current.count += 1;
    if (current.samples.length < 3) current.samples.push(typeof value === "string" ? value : value?.manifestKey ?? value?.artifactKey ?? null);
    groups.set(source, current);
  }
  return [...groups.values()].sort((left, right) => right.count - left.count || left.sourceId.localeCompare(right.sourceId));
}

/**
 * Produces a compact, source-oriented view of closure gaps. The full arrays
 * remain available for forensic review, while this summary is suitable for
 * CI output and operator decisions.
 */
export function summarizeR2ClosureGaps(result) {
  return {
    missingManifests: groupGaps(result?.missingManifests),
    missingArtifacts: groupGaps(result?.missingArtifacts),
    missingManifestArtifacts: groupGaps(result?.missingManifestArtifacts),
    missingArtifactInventory: groupGaps(result?.missingArtifactInventory),
    presentWithoutManifest: groupGaps(result?.presentWithoutManifest),
  };
}

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function numericOption(name, fallback) {
  const value = Number(option(name, fallback));
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function wranglerGet(bucket, key, file) {
  const wrangler = resolve("node_modules/wrangler/bin/wrangler.js");
  const result = spawnSync(process.execPath, [wrangler, "r2", "object", "get", `${bucket}/${key}`, "--file", file, "--remote"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return { ok: result.status === 0, stderr: result.stderr?.trim() ?? result.error?.message ?? "" };
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function downloadJson(bucket, key, directory, name) {
  const file = join(directory, name);
  const result = wranglerGet(bucket, key, file);
  if (!result.ok) return { ok: false, error: result.stderr };
  try {
    return { ok: true, value: JSON.parse(readFileSync(file, "utf8")) };
  } catch {
    return { ok: false, error: "R2_INVALID_JSON" };
  }
}

function inventoryKeys(inventory) {
  return new Set((Array.isArray(inventory?.objects) ? inventory.objects : [])
    .map((object) => String(object?.key ?? "").trim())
    .filter(Boolean));
}

function catalogArtifactKeys(catalog, manifests, sourceId = null) {
  const keys = new Set();
  for (const manifestKey of catalogPartitionKeys(catalog, sourceId)) {
    const manifest = getObject(manifests, manifestKey);
    for (const artifact of Array.isArray(manifest?.artifacts) ? manifest.artifacts : []) {
      const key = String(artifact?.key ?? "").trim();
      if (key) keys.add(key);
    }
  }
  return [...keys].sort((left, right) => left.localeCompare(right));
}

function run() {
  const bucket = option("--bucket", DEFAULT_BUCKET);
  const sourceId = option("--source", null);
  const catalogPath = option("--catalog", null);
  const limit = numericOption("--limit", DEFAULT_LIMIT);
  const verifyArtifacts = hasFlag("--verify-artifacts");
  const temp = mkdtempSync(join(tmpdir(), "cambiometro-r2-closure-"));

  try {
    const catalogResult = catalogPath
      ? { ok: true, value: readJson(catalogPath) }
      : downloadJson(bucket, DEFAULT_CATALOG_KEY, temp, "catalog.json");
    if (!catalogResult.ok) throw new Error(`R2_CATALOG_READ_FAILED:${catalogResult.error}`);

    const allKeys = catalogPartitionKeys(catalogResult.value, sourceId);
    if (allKeys.length > limit) throw new Error(`R2_CLOSURE_LIMIT_EXCEEDED:${allKeys.length}>${limit}`);

    const objects = new Map();
    const missingManifests = [];
    for (const key of allKeys) {
      const fileName = `manifest-${objects.size}.json`;
      const result = downloadJson(bucket, key, temp, fileName);
      if (!result.ok) missingManifests.push(key);
      else objects.set(key, result.value);
    }

    const artifactKeys = catalogArtifactKeys(catalogResult.value, objects, sourceId);
    if (artifactKeys.length > limit) throw new Error(`R2_ARTIFACT_LIMIT_EXCEEDED:${artifactKeys.length}>${limit}`);
    const inventoryResult = verifyArtifacts ? { ok: false } : downloadJson(bucket, DEFAULT_INVENTORY_KEY, temp, "storage.json");
    const inventoryAvailable = inventoryResult.ok;
    const missingArtifactInventory = inventoryAvailable
      ? artifactKeys.filter((key) => !inventoryKeys(inventoryResult.value).has(key))
      : [];
    const missingArtifacts = [];
    if (verifyArtifacts) {
      for (const [index, key] of artifactKeys.entries()) {
        const result = wranglerGet(bucket, key, join(temp, `artifact-${index}.bin`));
        if (!result.ok) missingArtifacts.push(key);
      }
    }
    const missingManifestArtifacts = [];
    const presentWithoutManifest = [];
    if (verifyArtifacts) {
      const partitions = Array.isArray(catalogResult.value?.partitions) ? catalogResult.value.partitions : [];
      for (const [index, partition] of partitions.entries()) {
        if (sourceId && String(partition?.sourceId ?? "") !== sourceId) continue;
        const manifestKey = String(partition?.manifestKey ?? "").trim();
        if (!manifestKey || objects.has(manifestKey)) continue;
        const artifactKey = catalogProjectionArtifactKey(partition);
        if (!artifactKey) continue;
        const result = wranglerGet(bucket, artifactKey, join(temp, `missing-manifest-artifact-${index}.bin`));
        if (result.ok) presentWithoutManifest.push({ manifestKey, artifactKey });
        else missingManifestArtifacts.push({ manifestKey, artifactKey });
      }
    }
    const closure = auditCatalogClosure(catalogResult.value, objects, sourceId);
    const result = {
      schemaVersion: 1,
      bucket,
      sourceId: sourceId ?? "all",
      catalogKey: DEFAULT_CATALOG_KEY,
      checkedPartitions: allKeys.length,
      inventoryAvailable,
      artifactCheck: verifyArtifacts ? "physical_get" : inventoryAvailable ? "storage_inventory" : "not_available",
      checkedManifests: closure.checkedManifests,
      missingArtifacts: verifyArtifacts ? missingArtifacts : [],
      missingManifestArtifacts,
      presentWithoutManifest,
      missingArtifactInventory,
      // A failed manifest download is authoritative even when a stale inventory
      // happens to contain its key.
      missingManifests: [...new Set([...missingManifests, ...closure.missingManifests])].sort(),
    };
    result.complete = result.missingManifests.length === 0 && (!verifyArtifacts || result.missingArtifacts.length === 0);
    Object.assign(result, classifyR2Closure(result));
    result.gapSummary = summarizeR2ClosureGaps(result);
    console.log(JSON.stringify(result, null, 2));
    if (!result.complete) process.exitCode = 1;
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
