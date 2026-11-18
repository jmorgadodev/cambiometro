import { buildReleaseSet } from "../release-set.mjs";
import { sha256Buffer } from "../static-site-inputs.mjs";
import { buildExpenseSubset } from "../expense-release.mjs";

/** The monthly objects, not the deliberately retained raw subset, are canonical. */
export async function loadCanonicalExpenseBaseline(manifest, sourceId, readObject) {
  buildReleaseSet(manifest);
  if (!["gastos_camara", "gastos_senado"].includes(sourceId)) throw new Error("EXPENSE_BASELINE_SOURCE_INVALID");
  const files = manifest.files.filter(file => file.sourceId === sourceId && file.path === `data/lake-subsets/expense-periods/${sourceId}/${file.period}.json`).sort((a, b) => a.period.localeCompare(b.period));
  if (!files.length) throw new Error(`EXPENSE_CANONICAL_BASELINE_MISSING:${sourceId}`);
  const records = [];
  for (let offset = 0; offset < files.length; offset += 4) {
    const batches = await Promise.all(files.slice(offset, offset + 4).map(async file => {
      const bytes = await readObject(file);
      if (bytes.byteLength !== file.size || sha256Buffer(bytes) !== file.checksumSha256) throw new Error(`EXPENSE_BASELINE_CHECKSUM_MISMATCH:${file.path}`);
      const shard = JSON.parse(bytes.toString("utf8"));
      if (shard.sourceId !== sourceId || shard.period !== file.period || shard.recordCount !== file.recordCount || shard.records?.length !== file.recordCount
        || shard.records.some(row => row.periodo !== file.period)) throw new Error(`EXPENSE_BASELINE_SHARD_INVALID:${file.path}`);
      return shard.records;
    }));
    records.push(...batches.flat());
  }
  return buildExpenseSubset({ sourceId, records, generatedAt: manifest.generatedAt });
}
