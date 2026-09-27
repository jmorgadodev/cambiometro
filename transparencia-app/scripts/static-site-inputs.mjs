import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Files that are allowed to cross the ETL -> Pages boundary.
 *
 * The list is deliberately explicit: build output, raw downloads and the
 * complete lake never become part of the static-site release by accident.
 */
export const STATIC_SITE_FILE_GROUPS = Object.freeze({
  chilecompra: [
    "data/lake/projections/v1/chilecompra.json",
    "data/lake-subsets/chilecompra.subset.json",
  ],
  contraloria: [
    "data/lake/projections/v1/contraloria.json",
    "data/lake-subsets/contraloria.subset.json",
  ],
  dipres: [
    "data/lake/projections/v1/presupuesto.json",
    "data/lake-subsets/presupuesto.subset.json",
  ],
  infolobby: [
    "data/lake/projections/v1/infolobby.json",
    "data/lake-subsets/infolobby.subset.json",
  ],
  infoprobidad: [
    "data/lake/projections/v1/infoprobidad.json",
    "data/lake-subsets/infoprobidad.subset.json",
  ],
  ley19862: [
    "data/lake/projections/v1/ley19862-summary.json",
    "data/lake-subsets/ley19862.subset.json",
  ],
  servel: [
    "data/lake/projections/v1/servel.json",
  ],
  sinim: [
    "data/lake/projections/v1/sinim.json",
    "data/lake-subsets/sinim.subset.json",
  ],
  parlamento: [
    "data/politicos-votaciones.json",
    "data/lake-subsets/politicos-votaciones.subset.json",
    "data/personal-apoyo.json",
    "data/lake-subsets/personal-apoyo.subset.json",
  ],
  movimientos: [
    "data/movimientos.json",
  ],
  gastos: [
    "data/lake-subsets/gastos-camara.subset.json",
    "data/lake-subsets/gastos-senado.subset.json",
    "data/lake-subsets/expense-periods/manifest.json",
  ],
  municipalidades: [
    "data/municipalidades-data.json",
    "data/municipalidades-list.json",
  ],
});

export const STATIC_SITE_FILE_PATHS = Object.freeze(
  [...new Set(Object.values(STATIC_SITE_FILE_GROUPS).flat())],
);

const EXPENSE_PERIOD_PATH = /^data\/lake-subsets\/expense-periods\/(gastos_camara|gastos_senado)\/(\d{4}-(?:0[1-9]|1[0-2]))\.json$/;
const EXPENSE_PERIOD_INDEX_PATH = "data/lake-subsets/expense-periods/manifest.json";
const RETAINABLE_EXPENSE_SUBSET_PATHS = new Set([
  "data/lake-subsets/gastos-camara.subset.json",
  "data/lake-subsets/gastos-senado.subset.json",
]);

function allowedStaticPath(relativePath) {
  return STATIC_SITE_FILE_PATHS.includes(relativePath) || EXPENSE_PERIOD_PATH.test(relativePath);
}

function expensePeriodFiles(root) {
  if (!root) throw new Error("STATIC_EXPENSE_PERIOD_INDEX_ROOT_REQUIRED");
  const indexPath = resolveSafeStaticPath(root, EXPENSE_PERIOD_INDEX_PATH);
  if (!existsSync(indexPath)) throw new Error("STATIC_EXPENSE_PERIOD_INDEX_MISSING");
  let index;
  try { index = JSON.parse(readFileSync(indexPath, "utf8")); } catch { throw new Error("STATIC_EXPENSE_PERIOD_INDEX_INVALID"); }
  if (index?.schemaVersion !== 1 || index?.dataset !== "gastos-operacionales-por-periodo" || !Array.isArray(index.sources)) {
    throw new Error("STATIC_EXPENSE_PERIOD_INDEX_INVALID");
  }
  const seen = new Set();
  const paths = [];
  for (const source of index.sources) {
    if (!["gastos_camara", "gastos_senado"].includes(source?.sourceId) || !Array.isArray(source.periods)) {
      throw new Error("STATIC_EXPENSE_PERIOD_INDEX_SOURCE_INVALID");
    }
    for (const item of source.periods) {
      const expected = `data/lake-subsets/expense-periods/${source.sourceId}/${item.period}.json`;
      if (item.path !== expected || !EXPENSE_PERIOD_PATH.test(item.path) || !Number.isSafeInteger(item.recordCount) || item.recordCount < 1 || seen.has(item.path)) {
        throw new Error("STATIC_EXPENSE_PERIOD_INDEX_ENTRY_INVALID");
      }
      seen.add(item.path);
      paths.push(item.path);
    }
  }
  return paths;
}

/**
 * Minimum semantic checks for inputs that feed static pages. A valid JSON
 * checksum alone is not enough: an ETL can publish a syntactically valid
 * sample and silently erase the navigable source catalog.
 */
export function assertStaticInputContentQuality(relativePath, content) {
  let value;
  try {
    value = JSON.parse(Buffer.from(content).toString("utf8"));
  } catch {
    throw new Error(`STATIC_INPUT_JSON_INVALID: ${relativePath}`);
  }

  if (relativePath === "data/lake/projections/v1/chilecompra.json" && (!Array.isArray(value?.buyers) || value.buyers.length < 500)) {
    throw new Error(`STATIC_INPUT_PARTIAL_CHILECOMPRA: ${relativePath} buyers=${value?.buyers?.length ?? 0}`);
  }
  if (relativePath === "data/lake-subsets/chilecompra.subset.json" && (!Array.isArray(value?.buyers) || value.buyers.length < 1)) {
    throw new Error(`STATIC_INPUT_PARTIAL_CHILECOMPRA_SUBSET: ${relativePath} buyers=${value?.buyers?.length ?? 0}`);
  }
  if (relativePath === "data/lake-subsets/infolobby.subset.json" && (!Array.isArray(value?.records) || value.records.length < 30)) {
    throw new Error(`STATIC_INPUT_PARTIAL_INFOLOBBY: ${relativePath} records=${value?.records?.length ?? 0}`);
  }
  const expensePeriod = EXPENSE_PERIOD_PATH.exec(relativePath);
  if (expensePeriod && (value?.sourceId !== expensePeriod[1]
    || value?.period !== expensePeriod[2]
    || !Array.isArray(value?.records)
    || value.recordCount !== value.records.length
    || value.records.some((record) => record.periodo !== value.period))) {
    throw new Error(`STATIC_INPUT_EXPENSE_PERIOD_INVALID: ${relativePath}`);
  }
  if (relativePath === EXPENSE_PERIOD_INDEX_PATH && (value?.schemaVersion !== 1
    || value?.dataset !== "gastos-operacionales-por-periodo"
    || !Array.isArray(value?.sources))) {
    throw new Error(`STATIC_INPUT_EXPENSE_PERIOD_INDEX_INVALID: ${relativePath}`);
  }
  if (relativePath === "data/politicos-votaciones.json") {
    const sessions = Object.keys(value?.sessions ?? {});
    if (sessions.length < 1 || Number(value?.totalSessions) !== sessions.length) {
      throw new Error(`STATIC_INPUT_PARTIAL_VOTACIONES: ${relativePath} sessions=${sessions.length}`);
    }
  }
  return value;
}

export function sha256Buffer(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256Json(value) {
  return sha256Buffer(Buffer.from(JSON.stringify(value), "utf8"));
}

export function resolveSafeStaticPath(root, relativePath) {
  const target = resolve(root, relativePath);
  const rootPath = resolve(root);
  if (!(target === rootPath || target.startsWith(`${rootPath}\\`) || target.startsWith(`${rootPath}/`))) {
    throw new Error(`STATIC_INPUT_PATH_OUTSIDE_ROOT: ${relativePath}`);
  }
  return target;
}

export function parseRequestedStaticFiles({ files, groups, root } = {}) {
  const requested = new Set();
  for (const group of groups ?? []) {
    const paths = STATIC_SITE_FILE_GROUPS[group];
    if (!paths) throw new Error(`STATIC_INPUT_GROUP_UNKNOWN: ${group}`);
    for (const file of paths) requested.add(file);
    if (group === "gastos") for (const file of expensePeriodFiles(root)) requested.add(file);
  }
  for (const file of files ?? []) {
    if (!allowedStaticPath(file)) {
      throw new Error(`STATIC_INPUT_FILE_NOT_ALLOWED: ${file}`);
    }
    requested.add(file);
  }
  if (requested.size === 0) throw new Error("STATIC_INPUT_FILES_EMPTY");
  return [...requested].sort();
}

export function buildStaticInputEntries({ root, files, releaseId }) {
  const entries = [];
  for (const relativePath of files) {
    const filePath = resolveSafeStaticPath(root, relativePath);
    if (!existsSync(filePath)) throw new Error(`STATIC_INPUT_MISSING: ${relativePath}`);
    const data = readFileSync(filePath);
    if (data.byteLength === 0) throw new Error(`STATIC_INPUT_EMPTY: ${relativePath}`);
    const checksumSha256 = sha256Buffer(data);
    // Keep unchanged monthly expense shards at a content-addressed R2 key.
    // A new release then replaces only changed months instead of storing all
    // historical month objects again on every publication.
    const artifactReleaseId = EXPENSE_PERIOD_PATH.test(relativePath) ? checksumSha256 : releaseId;
    entries.push({
      path: relativePath,
      key: `projections/static-site-v1/releases/${artifactReleaseId}/${relativePath}`,
      size: data.byteLength,
      checksumSha256,
      ...(EXPENSE_PERIOD_PATH.test(relativePath) ? (() => {
        const monthly = JSON.parse(data.toString("utf8"));
        return { sourceId: monthly.sourceId, period: monthly.period, recordCount: monthly.recordCount };
      })() : {}),
    });
  }
  return entries;
}

export function omitRetainedExpenseSubsets(entries, previousManifest) {
  const previousPaths = new Set((previousManifest?.files ?? []).map((file) => file.path));
  return entries.filter((entry) => !RETAINABLE_EXPENSE_SUBSET_PATHS.has(entry.path) || !previousPaths.has(entry.path));
}

export function buildStaticInputManifest({ entries, generatedAt = new Date().toISOString() }) {
  const files = [...entries]
    .map(({ path, key, size, checksumSha256, sourceId, period, recordCount }) => ({
      path, key, size, checksumSha256,
      ...(sourceId ? { sourceId } : {}),
      ...(period ? { period } : {}),
      ...(Number.isSafeInteger(recordCount) ? { recordCount } : {}),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const manifest = {
    schemaVersion: 1,
    dataset: "cambiometro-static-site-inputs",
    generatedAt,
    files,
  };
  return {
    ...manifest,
    checksumSha256: sha256Json(manifest),
  };
}

export function assertStaticInputManifest(manifest) {
  if (!manifest || manifest.schemaVersion !== 1 || manifest.dataset !== "cambiometro-static-site-inputs") {
    throw new Error("STATIC_INPUT_MANIFEST_INVALID");
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error("STATIC_INPUT_MANIFEST_EMPTY");
  }
  const paths = new Set();
  for (const file of manifest.files) {
    if (!allowedStaticPath(file.path)) throw new Error(`STATIC_INPUT_MANIFEST_PATH_NOT_ALLOWED: ${file.path}`);
    if (paths.has(file.path)) throw new Error(`STATIC_INPUT_MANIFEST_DUPLICATE: ${file.path}`);
    paths.add(file.path);
    if (!/^projections\/static-site-v1\/releases\/[a-f0-9]{64}\/data\//.test(file.key)) {
      throw new Error(`STATIC_INPUT_MANIFEST_KEY_INVALID: ${file.key}`);
    }
    if (!Number.isSafeInteger(file.size) || file.size < 1 || !/^[a-f0-9]{64}$/.test(file.checksumSha256)) {
      throw new Error(`STATIC_INPUT_MANIFEST_CHECKSUM_INVALID: ${file.path}`);
    }
    const monthly = EXPENSE_PERIOD_PATH.exec(file.path);
    if (monthly && (file.sourceId !== monthly[1] || file.period !== monthly[2] || !Number.isSafeInteger(file.recordCount) || file.recordCount < 1)) {
      throw new Error(`STATIC_INPUT_MANIFEST_EXPENSE_PERIOD_INVALID: ${file.path}`);
    }
  }
  return manifest;
}

export function assertStaticInputManifestComplete(manifest) {
  assertStaticInputManifest(manifest);
  const available = new Set(manifest.files.map((file) => file.path));
  const missing = STATIC_SITE_FILE_PATHS.filter((file) => !available.has(file));
  if (missing.length > 0) throw new Error(`STATIC_INPUT_MANIFEST_INCOMPLETE: ${missing.join(",")}`);
  return manifest;
}
