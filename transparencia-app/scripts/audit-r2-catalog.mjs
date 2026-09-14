import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function readJson(path) {
  return JSON.parse(readFileSync(resolve(path), "utf8"));
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function summarize(manifest) {
  const byId = new Map();
  for (const source of Array.isArray(manifest?.sources) ? manifest.sources : []) {
    if (!source?.id) continue;
    byId.set(String(source.id), {
      id: String(source.id),
      recordCount: numeric(source.recordCount),
      status: source.status ?? null,
      periods: new Set(Array.isArray(source.foundPeriods) ? source.foundPeriods.map(String) : []),
      variants: new Map(),
    });
  }

  for (const partition of Array.isArray(manifest?.partitions) ? manifest.partitions : []) {
    if (!partition?.sourceId) continue;
    const id = String(partition.sourceId);
    const row = byId.get(id) ?? {
      id,
      recordCount: 0,
      status: null,
      periods: new Set(),
      variants: new Map(),
    };
    const variant = String(partition.variant ?? "base");
    const current = row.variants.get(variant) ?? { recordCount: 0, periods: new Set(), partitions: 0 };
    current.recordCount += numeric(partition.recordCount);
    current.partitions += 1;
    if (partition.period != null) current.periods.add(String(partition.period));
    row.variants.set(variant, current);
    if (partition.period != null) row.periods.add(String(partition.period));
    byId.set(id, row);
  }

  return byId;
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function serializeSource(row) {
  return row ? {
    id: row.id,
    recordCount: row.recordCount,
    status: row.status,
    periods: sorted(row.periods),
    variants: Object.fromEntries(sorted(row.variants.keys()).map((variant) => {
      const value = row.variants.get(variant);
      return [variant, {
        recordCount: value.recordCount,
        periods: sorted(value.periods),
        partitions: value.partitions,
      }];
    })),
  } : null;
}

function classify(remote, local) {
  if (!remote) return "solo_local";
  if (!local) return "faltante_local";
  const remoteVariants = sorted(remote.variants.keys());
  const localVariants = sorted(local.variants.keys());
  const variantsDiffer = remoteVariants.join("|") !== localVariants.join("|");
  const periodsDiffer = sorted(remote.periods).join("|") !== sorted(local.periods).join("|");
  if (variantsDiffer) return "alcance";
  if (remote.recordCount !== local.recordCount || periodsDiffer) return "frescura_o_conteo";
  return "coincide";
}

export function compareR2Catalogs(remoteManifest, localManifest) {
  const remote = summarize(remoteManifest);
  const local = summarize(localManifest);
  const ids = sorted(new Set([...remote.keys(), ...local.keys()]));
  const rows = ids.map((id) => {
    const remoteSource = remote.get(id);
    const localSource = local.get(id);
    return {
      id,
      classification: classify(remoteSource, localSource),
      remote: serializeSource(remoteSource),
      local: serializeSource(localSource),
      deltaRecords: remoteSource && localSource ? remoteSource.recordCount - localSource.recordCount : null,
    };
  });
  return {
    schemaVersion: 1,
    remoteGeneratedAt: remoteManifest?.generatedAt ?? null,
    localGeneratedAt: localManifest?.generatedAt ?? null,
    sourceCount: rows.length,
    summary: Object.fromEntries(["coincide", "frescura_o_conteo", "alcance", "faltante_local", "solo_local"].map((status) => [status, rows.filter((row) => row.classification === status).length])),
    rows,
  };
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const remotePath = option("--remote");
  const localPath = option("--local") ?? "data/lake/catalog/v1/manifest.json";
  if (!remotePath) {
    console.error("Uso: node scripts/audit-r2-catalog.mjs --remote <manifest-r2.json> [--local <manifest-local.json>]");
    process.exitCode = 2;
  } else {
    console.log(JSON.stringify(compareR2Catalogs(readJson(remotePath), readJson(localPath)), null, 2));
  }
}
