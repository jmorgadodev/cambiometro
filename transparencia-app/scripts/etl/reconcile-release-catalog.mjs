import { createHash } from "node:crypto";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function reconcileReleaseCatalog(catalog, manifestsById) {
  if (!Array.isArray(catalog?.partitions) || !Array.isArray(catalog?.sources)) {
    throw new Error("RECOVERY_INVALID_CATALOG");
  }

  const changes = [];
  const partitions = catalog.partitions.map((partition) => {
    const manifest = manifestsById.get(partition.id);
    if (!manifest) throw new Error(`RECOVERY_MISSING_MANIFEST: ${partition.id}`);
    if (manifest.id !== partition.id || manifest.sourceId !== partition.sourceId) {
      throw new Error(`RECOVERY_MANIFEST_ID_MISMATCH: ${partition.id}`);
    }
    const checksumSha256 = manifest.projectionChecksumSha256
      ?? manifest.artifacts?.find((artifact) => artifact.key?.endsWith(".jsonl.gz"))?.checksumSha256;
    if (!checksumSha256 || !Number.isInteger(manifest.recordCount) || manifest.recordCount < 0) {
      throw new Error(`RECOVERY_INVALID_MANIFEST: ${partition.id}`);
    }
    if (partition.recordCount !== manifest.recordCount || partition.checksumSha256 !== checksumSha256) {
      changes.push({
        id: partition.id,
        previousRecordCount: partition.recordCount,
        recordCount: manifest.recordCount,
        previousChecksumSha256: partition.checksumSha256,
        checksumSha256,
      });
    }
    return {
      ...partition,
      recordCount: manifest.recordCount,
      checksumSha256,
      status: manifest.status ?? partition.status,
      sourcePeriod: manifest.sourcePeriod ?? partition.sourcePeriod ?? null,
    };
  });

  const sources = catalog.sources.map((source) => {
    const sourcePartitions = partitions.filter((partition) => partition.sourceId === source.id);
    const recordCount = sourcePartitions.reduce((total, partition) => total + partition.recordCount, 0);
    const foundPeriods = [...new Set(sourcePartitions.map((partition) => partition.period))].sort();
    const indexChecksumSha256 = sha256(JSON.stringify(sourcePartitions.map((partition) => ({
      id: partition.id,
      checksumSha256: partition.checksumSha256,
      recordCount: partition.recordCount,
    }))));
    return {
      ...source,
      recordCount,
      foundPeriods,
      indexChecksumSha256,
      error: null,
      status: sourcePartitions.length > 0 ? "partial" : source.status,
    };
  });

  const generatedAt = [...manifestsById.values()]
    .map((manifest) => manifest.generatedAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? catalog.generatedAt;

  return {
    catalog: { ...catalog, generatedAt, partitions, sources },
    report: {
      generatedAt: new Date().toISOString(),
      catalogGeneratedAt: generatedAt,
      changedPartitions: changes,
      totalRecords: sources.reduce((total, source) => total + source.recordCount, 0),
    },
  };
}
