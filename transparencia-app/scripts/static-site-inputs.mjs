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
    "data/movimientos.json",
  ],
  gastos: [
    "data/lake-subsets/gastos-camara.subset.json",
    "data/lake-subsets/gastos-senado.subset.json",
  ],
  municipalidades: [
    "data/municipalidades-data.json",
    "data/municipalidades-list.json",
  ],
});

export const STATIC_SITE_FILE_PATHS = Object.freeze(
  [...new Set(Object.values(STATIC_SITE_FILE_GROUPS).flat())],
);

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

export function parseRequestedStaticFiles({ files, groups } = {}) {
  const requested = new Set();
  for (const group of groups ?? []) {
    const paths = STATIC_SITE_FILE_GROUPS[group];
    if (!paths) throw new Error(`STATIC_INPUT_GROUP_UNKNOWN: ${group}`);
    for (const file of paths) requested.add(file);
  }
  for (const file of files ?? []) {
    if (!STATIC_SITE_FILE_PATHS.includes(file)) {
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
    entries.push({
      path: relativePath,
      key: `projections/static-site-v1/releases/${releaseId}/${relativePath}`,
      size: data.byteLength,
      checksumSha256: sha256Buffer(data),
    });
  }
  return entries;
}

export function buildStaticInputManifest({ entries, generatedAt = new Date().toISOString() }) {
  const files = [...entries]
    .map(({ path, key, size, checksumSha256 }) => ({ path, key, size, checksumSha256 }))
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
    if (!STATIC_SITE_FILE_PATHS.includes(file.path)) throw new Error(`STATIC_INPUT_MANIFEST_PATH_NOT_ALLOWED: ${file.path}`);
    if (paths.has(file.path)) throw new Error(`STATIC_INPUT_MANIFEST_DUPLICATE: ${file.path}`);
    paths.add(file.path);
    if (!/^projections\/static-site-v1\/releases\/[a-f0-9]{64}\/data\//.test(file.key)) {
      throw new Error(`STATIC_INPUT_MANIFEST_KEY_INVALID: ${file.key}`);
    }
    if (!Number.isSafeInteger(file.size) || file.size < 1 || !/^[a-f0-9]{64}$/.test(file.checksumSha256)) {
      throw new Error(`STATIC_INPUT_MANIFEST_CHECKSUM_INVALID: ${file.path}`);
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
